import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { handleGetChatMessages, handlePostChatSend } from './index';

function createMockRes() {
  const headers: Record<string, string> = {};
  const state: { statusCode: number; body: any; ended: boolean } = {
    statusCode: 200,
    body: undefined,
    ended: false,
  };

  const res: any = {
    setHeader(name: string, val: string) {
      headers[name.toLowerCase()] = val;
    },
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.body = payload;
      state.ended = true;
      return res;
    },
    send(payload: any) {
      state.body = payload;
      state.ended = true;
      return res;
    },
    end() {
      state.ended = true;
      return res;
    },
  };

  return { res, state, headers };
}

function createFakeAdminClient(options?: {
  initialUsers?: any[];
  initialConversations?: any[];
  initialMessages?: any[];
  failConvUpsert?: boolean;
  simulateMissingAttachmentColumns?: boolean;
}) {
  const tables: Record<string, any[]> = {
    users: [...(options?.initialUsers || [])],
    conversations: [...(options?.initialConversations || [])],
    messages: [...(options?.initialMessages || [])],
  };

  const opLog: string[] = [];

  const buildQuery = (table: string) => {
    const state: {
      op: 'select' | 'upsert' | 'insert';
      payload?: any;
      filters: Array<(row: any) => boolean>;
      orderBy?: { col: string; asc: boolean };
      limitNum?: number;
      singleMode?: 'single' | 'maybeSingle';
    } = {
      op: 'select',
      filters: [],
    };

    const execute = async () => {
      if (state.op === 'upsert') {
        opLog.push(`upsert:${table}`);
        if (table === 'conversations' && options?.failConvUpsert) {
          return { data: null, error: { message: 'forced conversations error', code: '23503' } };
        }
        if (
          table === 'messages' &&
          options?.simulateMissingAttachmentColumns &&
          ('attachment_url' in state.payload || 'is_internal_note' in state.payload)
        ) {
          return { data: null, error: { message: 'column "attachment_url" does not exist', code: '42703' } };
        }
        if (table === 'conversations') {
          const userExists = tables.users.some((u) => u.id === state.payload.customer_id);
          if (!userExists) {
            return { data: null, error: { message: 'FK violation: customer_id missing from users', code: '23503' } };
          }
        }
        if (table === 'messages') {
          const convExists = tables.conversations.some((c) => c.id === state.payload.conversation_id);
          if (!convExists) {
            return { data: null, error: { message: 'FK violation: conversation_id missing from conversations', code: '23503' } };
          }
        }

        const list = tables[table];
        const idx = list.findIndex((r) => r.id === state.payload.id);
        const stored = { ...state.payload };
        if (idx >= 0) list[idx] = stored;
        else list.push(stored);

        return { data: state.singleMode ? stored : [stored], error: null };
      }

      // select
      let rows = tables[table].filter((r) => state.filters.every((fn) => fn(r)));
      if (state.orderBy) {
        const { col, asc } = state.orderBy;
        rows = [...rows].sort((a, b) => {
          const ta = Date.parse(a[col] || '') || 0;
          const tb = Date.parse(b[col] || '') || 0;
          return asc ? ta - tb : tb - ta;
        });
      }
      if (typeof state.limitNum === 'number') {
        rows = rows.slice(0, state.limitNum);
      }

      if (state.singleMode === 'maybeSingle') {
        return { data: rows[0] || null, error: null };
      }
      if (state.singleMode === 'single') {
        return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'Row not found' } };
      }
      return { data: rows, error: null };
    };

    const builder: any = {
      select() {
        return builder;
      },
      eq(col: string, val: any) {
        state.filters.push((r) => r[col] === val);
        return builder;
      },
      in(col: string, vals: any[]) {
        state.filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      or(expr: string) {
        // Basic support for customer_id.eq.X,id.eq.Y
        const parts = expr.split(',').map((p) => p.split('.'));
        state.filters.push((r) =>
          parts.some(([col, op, val]) => (op === 'eq' ? r[col] === val : true))
        );
        return builder;
      },
      gt(col: string, val: any) {
        const targetTs = Date.parse(val) || 0;
        state.filters.push((r) => (Date.parse(r[col] || '') || 0) > targetTs);
        return builder;
      },
      lt(col: string, val: any) {
        const targetTs = Date.parse(val) || 0;
        state.filters.push((r) => (Date.parse(r[col] || '') || 0) < targetTs);
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        state.orderBy = { col, asc: opts?.ascending !== false };
        return builder;
      },
      limit(n: number) {
        state.limitNum = n;
        return builder;
      },
      upsert(payload: any) {
        state.op = 'upsert';
        state.payload = payload;
        return builder;
      },
      maybeSingle() {
        state.singleMode = 'maybeSingle';
        return execute();
      },
      single() {
        state.singleMode = 'single';
        return execute();
      },
      then(resolve: any, reject: any) {
        return execute().then(resolve, reject);
      },
    };

    return builder;
  };

  return {
    tables,
    opLog,
    client: {
      auth: {
        admin: {
          async getUserById(uid: string) {
            return { data: { user: { id: uid, email: `${uid}@auth.test`, email_confirmed_at: '2026-11-01T00:00:00Z' } } };
          },
        },
      },
      from(table: string) {
        return buildQuery(table);
      },
    },
  };
}

test('CORS OPTIONS preflight returns 200 and ends cleanly', async () => {
  const { res, state, headers } = createMockRes();
  await handler({ method: 'OPTIONS', url: '/api/status', headers: {} }, res);
  assert.equal(state.statusCode, 200);
  assert.equal(state.ended, true);
  assert.equal(headers['access-control-allow-origin'], '*');
});

test('GET /api/status returns vercel-serverless health payload', async () => {
  const { res, state } = createMockRes();
  await handler({ method: 'GET', url: '/api/status', headers: {} }, res);
  assert.equal(state.statusCode, 200);
  assert.equal(state.body.online, true);
  assert.equal(state.body.runtime, 'vercel-serverless');
});

test('GET /api/push/vapid-public-key returns VAPID publicKey', async () => {
  const { res, state } = createMockRes();
  await handler({ method: 'GET', url: '/api/push/vapid-public-key', headers: {} }, res);
  assert.equal(state.statusCode, 200);
  assert.equal(typeof state.body.publicKey, 'string');
  assert.ok(state.body.publicKey.length > 20);
});

test('POST /api/auth/logout clears session cookie statelessly', async () => {
  const { res, state, headers } = createMockRes();
  await handler({ method: 'POST', url: '/api/auth/logout', headers: {} }, res);
  assert.equal(state.statusCode, 200);
  assert.equal(state.body.success, true);
  assert.match(headers['set-cookie'], /aetherpay_session=;/);
});

test('GET /api/unknown-route returns 404 JSON', async () => {
  const { res, state } = createMockRes();
  await handler({ method: 'GET', url: '/api/unknown-route', headers: {} }, res);
  assert.equal(state.statusCode, 404);
  assert.equal(state.body.error, 'Endpoint not found');
});

test('handlePostChatSend auto-provisions missing parent user & conversation before idempotent message upsert', async () => {
  const fake = createFakeAdminClient();
  const { res, state, headers } = createMockRes();

  await handlePostChatSend(
    fake.client,
    {
      id: 'msg_client_100',
      conversationId: 'conv_usr_new',
      senderId: 'usr_new',
      senderName: 'New Player',
      senderRole: 'customer',
      text: 'Hello support!',
      createdAt: '2026-11-16T12:00:00.000Z',
    },
    res
  );

  assert.equal(state.statusCode, 200);
  assert.equal(state.body.success, true);
  assert.equal(state.body.message.id, 'msg_client_100');
  assert.equal(state.body.canonicalId, 'conv_usr_new');
  assert.match(headers['cache-control'], /no-store/);
  assert.deepEqual(fake.opLog, ['upsert:users', 'upsert:conversations', 'upsert:messages']);
  assert.equal(fake.tables.users.length, 1);
  assert.equal(fake.tables.conversations.length, 1);
  assert.equal(fake.tables.messages.length, 1);
});

test('handlePostChatSend fails loudly with 500 when parent conversation persistence fails', async () => {
  const fake = createFakeAdminClient({
    initialUsers: [{ id: 'usr_1', email: 'u1@test.com', display_name: 'U1' }],
    failConvUpsert: true,
  });
  const { res, state } = createMockRes();

  await handlePostChatSend(
    fake.client,
    {
      id: 'msg_fail_conv',
      senderId: 'usr_1',
      senderRole: 'customer',
      text: 'Should fail loudly',
    },
    res
  );

  assert.equal(state.statusCode, 500);
  assert.match(state.body.error, /forced conversations error/);
  assert.equal(fake.tables.messages.length, 0);
});

test('handlePostChatSend retries gracefully if attachment_url/is_internal_note columns are absent while preserving transaction_data', async () => {
  const fake = createFakeAdminClient({
    initialUsers: [{ id: 'usr_1', email: 'u1@test.com', display_name: 'U1' }],
    simulateMissingAttachmentColumns: true,
  });
  const { res, state } = createMockRes();

  await handlePostChatSend(
    fake.client,
    {
      id: 'msg_attach_fallback',
      senderId: 'usr_1',
      senderRole: 'customer',
      text: 'Receipt',
      attachmentUrl: 'https://cdn.example.com/r.webp',
      attachmentName: 'r.webp',
    },
    res
  );

  assert.equal(state.statusCode, 200);
  assert.equal(state.body.message.id, 'msg_attach_fallback');
  assert.equal(state.body.message.transaction_data.attachmentUrl, 'https://cdn.example.com/r.webp');
});

test('handleGetChatMessages returns newest N messages in strict ascending order with no-store headers', async () => {
  const fake = createFakeAdminClient({
    initialConversations: [{ id: 'conv_u1', customer_id: 'u1' }],
    initialMessages: [
      { id: 'm1', conversation_id: 'conv_u1', content: 'oldest', created_at: '2026-11-16T08:00:00.000Z' },
      { id: 'm2', conversation_id: 'u1', content: 'middle legacy id', created_at: '2026-11-16T09:00:00.000Z' },
      { id: 'm3', conversation_id: 'conv_u1', content: 'newest', created_at: '2026-11-16T10:00:00.000Z' },
    ],
  });
  const { res, state, headers } = createMockRes();
  const parsedUrl = new URL('https://localhost/api/chat/messages?conversationId=conv_u1&customerId=u1&limit=2');

  await handleGetChatMessages(fake.client, parsedUrl, res);

  assert.equal(state.statusCode, 200);
  assert.match(headers['cache-control'], /no-store/);
  assert.equal(state.body.hasMore, true);
  // Must select the NEWEST 2 (m2 and m3, dropping m1) and return them ascending!
  assert.deepEqual(
    state.body.messages.map((m: any) => m.id),
    ['m2', 'm3']
  );
});
