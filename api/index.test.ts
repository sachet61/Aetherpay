import test from 'node:test';
import assert from 'node:assert/strict';
import handler, {
  handleGetChatMessages,
  handlePostChatSend,
  handleUpdateConversationStatus,
  handleStorageUpload,
  handleStorageFileProxy,
  handlePushSubscribe,
  handlePushUnsubscribe,
  handlePushStatus,
  handlePushNotify,
  sendVercelPushNotification,
  resolveApiRequestUrl,
} from './index.js';

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
  initialAppConfig?: any[];
  failConvUpsert?: boolean;
  simulateMissingAttachmentColumns?: boolean;
}) {
  const tables: Record<string, any[]> = {
    users: [...(options?.initialUsers || [])],
    conversations: [...(options?.initialConversations || [])],
    messages: [...(options?.initialMessages || [])],
    app_config: [...(options?.initialAppConfig || [])],
  };

  const opLog: string[] = [];

  const buildQuery = (table: string) => {
    const state: {
      op: 'select' | 'upsert' | 'insert' | 'update';
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
      if (state.op === 'update') {
        opLog.push(`update:${table}`);
        const list = tables[table];
        const updatedRows: any[] = [];
        for (let i = 0; i < list.length; i++) {
          if (state.filters.every((fn) => fn(list[i]))) {
            list[i] = { ...list[i], ...state.payload };
            updatedRows.push(list[i]);
          }
        }
        if (state.singleMode === 'maybeSingle') {
          return { data: updatedRows[0] || null, error: null };
        }
        if (state.singleMode === 'single') {
          return updatedRows[0] ? { data: updatedRows[0], error: null } : { data: null, error: { message: 'Row not found' } };
        }
        return { data: updatedRows, error: null };
      }

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
      update(payload: any) {
        state.op = 'update';
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

  const storageBuckets: Array<{ name: string; public: boolean }> = [
    { name: 'chat_attachments', public: false },
  ];
  const storageObjects = new Map<string, { data: Buffer; contentType: string }>();

  return {
    tables,
    opLog,
    storageBuckets,
    storageObjects,
    client: {
      auth: {
        admin: {
          async getUserById(uid: string) {
            return { data: { user: { id: uid, email: `${uid}@auth.test`, email_confirmed_at: '2026-11-01T00:00:00Z' } } };
          },
        },
      },
      storage: {
        async listBuckets() {
          return { data: storageBuckets, error: null };
        },
        async createBucket(name: string, opts: any) {
          storageBuckets.push({ name, public: Boolean(opts?.public) });
          return { data: { name }, error: null };
        },
        async updateBucket(name: string, opts: any) {
          const found = storageBuckets.find((b) => b.name === name);
          if (found) found.public = Boolean(opts?.public);
          return { data: { name }, error: null };
        },
        from(bucket: string) {
          return {
            async upload(path: string, buf: Buffer, opts: any) {
              storageObjects.set(`${bucket}/${path}`, {
                data: Buffer.isBuffer(buf) ? buf : Buffer.from(buf),
                contentType: opts?.contentType || 'image/webp',
              });
              return { data: { path }, error: null };
            },
            getPublicUrl(path: string) {
              return {
                data: {
                  publicUrl: `https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/${bucket}/${path}`,
                },
              };
            },
            async download(path: string) {
              const hit = storageObjects.get(`${bucket}/${path}`);
              if (!hit) return { data: null, error: { message: 'Object not found' } };
              return {
                data: {
                  type: hit.contentType,
                  async arrayBuffer() {
                    return hit.data.buffer.slice(hit.data.byteOffset, hit.data.byteOffset + hit.data.byteLength);
                  },
                },
                error: null,
              };
            },
          };
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

test('handleStorageUpload promotes private bucket to public, uploads file, and returns proxy-backed URL for chat_attachments', async () => {
  const fake = createFakeAdminClient();
  const { res, state } = createMockRes();
  const sampleBytes = Buffer.from('RIFF....WEBP', 'utf8');

  await handleStorageUpload(
    fake.client,
    {
      bucket: 'chat_attachments',
      path: 'conv_u1/receipt_test.webp',
      fileBase64: sampleBytes.toString('base64'),
      contentType: 'image/webp',
    },
    res
  );

  assert.equal(state.statusCode, 200);
  assert.equal(state.body.success, true);
  assert.equal(state.body.url, '/api/storage/file?bucket=chat_attachments&path=conv_u1%2Freceipt_test.webp');
  assert.equal(fake.storageBuckets.find((b) => b.name === 'chat_attachments')?.public, true);
  assert.ok(fake.storageObjects.has('chat_attachments/conv_u1/receipt_test.webp'));
});

test('handleStorageFileProxy downloads object when given signed/public Supabase URL with query tokens', async () => {
  const fake = createFakeAdminClient();
  const imageBuf = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  fake.storageObjects.set('chat_attachments/conv_u1/photo 1.png', {
    data: imageBuf,
    contentType: 'image/png',
  });

  const { res, state, headers } = createMockRes();
  const rawUrl =
    'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/sign/chat_attachments/conv_u1/photo%201.png?token=expiring_123';
  const parsedUrl = new URL(`https://localhost/api/storage/file?url=${encodeURIComponent(rawUrl)}`);

  await handleStorageFileProxy(fake.client, parsedUrl, res);

  assert.equal(state.statusCode, 200);
  assert.equal(headers['content-type'], 'image/png');
  assert.deepEqual(state.body, imageBuf);
});

test('handleGetChatMessages enriches stringified transaction_data and normalizes Supabase URLs to proxy URLs', async () => {
  const fake = createFakeAdminClient({
    initialConversations: [{ id: 'conv_u1', customer_id: 'u1' }],
    initialMessages: [
      {
        id: 'm_att',
        conversation_id: 'conv_u1',
        content: '',
        transaction_data: JSON.stringify({
          attachmentUrl:
            'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/conv_u1/ss.webp?t=555',
          attachmentName: 'ss.webp',
        }),
        created_at: '2026-11-16T10:00:00.000Z',
      },
    ],
  });

  const { res, state } = createMockRes();
  const parsedUrl = new URL('https://localhost/api/chat/messages?conversationId=conv_u1&customerId=u1&limit=10');

  await handleGetChatMessages(fake.client, parsedUrl, res);

  assert.equal(state.statusCode, 200);
  assert.equal(state.body.messages.length, 1);
  assert.equal(
    state.body.messages[0].attachment_url,
    '/api/storage/file?bucket=chat_attachments&path=conv_u1%2Fss.webp'
  );
  assert.equal(state.body.messages[0].attachment_name, 'ss.webp');
});

test('handleGetChatMessages excludes internal notes for customers/anonymous callers and includes them for verified staff', async () => {
  const fake = createFakeAdminClient({
    initialUsers: [
      { id: 'u1', email: 'player@test.com', role: 'customer', display_name: 'Player' },
      { id: 'a1', email: 'agent@test.com', role: 'agent', display_name: 'Agent' },
    ],
    initialConversations: [{ id: 'conv_u1', customer_id: 'u1', status: 'open' }],
    initialMessages: [
      {
        id: 'm_public',
        conversation_id: 'conv_u1',
        sender_id: 'u1',
        sender_role: 'customer',
        content: 'Hello support',
        is_internal_note: false,
        created_at: '2026-11-16T09:00:00.000Z',
      },
      {
        id: 'm_internal_col',
        conversation_id: 'conv_u1',
        sender_id: 'a1',
        sender_role: 'agent',
        content: 'VIP check internal note',
        is_internal_note: true,
        created_at: '2026-11-16T09:05:00.000Z',
      },
      {
        id: 'm_internal_tx',
        conversation_id: 'conv_u1',
        sender_id: 'a1',
        sender_role: 'agent',
        content: 'Team only follow-up',
        transaction_data: { isInternalNote: true },
        created_at: '2026-11-16T09:06:00.000Z',
      },
    ],
  });

  // 1. Anonymous request (fail closed)
  const anon = createMockRes();
  await handleGetChatMessages(
    fake.client,
    new URL('https://localhost/api/chat/messages?conversationId=conv_u1&customerId=u1&limit=20'),
    anon.res
  );
  assert.equal(anon.state.statusCode, 200);
  assert.deepEqual(
    anon.state.body.messages.map((m: any) => m.id),
    ['m_public']
  );

  // 2. Customer request (even if attempting to pass x-user-role: admin header, DB role is customer)
  const cust = createMockRes();
  await handleGetChatMessages(
    fake.client,
    new URL('https://localhost/api/chat/messages?conversationId=conv_u1&customerId=u1&limit=20'),
    cust.res,
    { headers: { 'x-user-id': 'u1', 'x-user-role': 'admin' } }
  );
  assert.equal(cust.state.statusCode, 200);
  assert.deepEqual(
    cust.state.body.messages.map((m: any) => m.id),
    ['m_public']
  );

  // 3. Verified agent request receives full thread including internal notes
  const staff = createMockRes();
  await handleGetChatMessages(
    fake.client,
    new URL('https://localhost/api/chat/messages?conversationId=conv_u1&customerId=u1&limit=20'),
    staff.res,
    { headers: { 'x-user-id': 'a1' } }
  );
  assert.equal(staff.state.statusCode, 200);
  assert.deepEqual(
    staff.state.body.messages.map((m: any) => m.id),
    ['m_public', 'm_internal_col', 'm_internal_tx']
  );
});

test('handlePostChatSend rejects customer internal-note creation and preserves customer-facing last_message for staff notes', async () => {
  const fake = createFakeAdminClient({
    initialUsers: [
      { id: 'u1', email: 'player@test.com', role: 'customer', display_name: 'Player' },
      { id: 'a1', email: 'agent@test.com', role: 'agent', display_name: 'Agent' },
    ],
    initialConversations: [
      {
        id: 'conv_u1',
        customer_id: 'u1',
        customer_name: 'Player',
        status: 'open',
        last_message: 'Customer latest question',
        last_message_at: '2026-11-16T09:00:00.000Z',
      },
    ],
  });

  // Customer trying to forge internal note -> 403
  const custAttempt = createMockRes();
  await handlePostChatSend(
    fake.client,
    {
      id: 'msg_forged_note',
      conversationId: 'conv_u1',
      senderId: 'u1',
      senderRole: 'agent',
      text: 'Forged note',
      isInternalNote: true,
    },
    custAttempt.res,
    { headers: { 'x-user-id': 'u1' } }
  );
  assert.equal(custAttempt.state.statusCode, 403);
  assert.equal(fake.tables.messages.length, 0);

  // Verified agent sending internal note -> 200 and preserves last_message & last_message_at
  const staffAttempt = createMockRes();
  await handlePostChatSend(
    fake.client,
    {
      id: 'msg_staff_note',
      conversationId: 'conv_u1',
      senderId: 'a1',
      senderName: 'Agent',
      senderRole: 'agent',
      recipientId: 'u1',
      text: 'Private team verification',
      isInternalNote: true,
      createdAt: '2026-11-16T12:00:00.000Z',
    },
    staffAttempt.res,
    { headers: { 'x-user-id': 'a1' } }
  );
  assert.equal(staffAttempt.state.statusCode, 200);
  assert.equal(fake.tables.conversations[0].last_message, 'Customer latest question');
  assert.equal(fake.tables.conversations[0].last_message_at, '2026-11-16T09:00:00.000Z');
});

test('handleUpdateConversationStatus enforces staff authorization and persists valid statuses', async () => {
  const fake = createFakeAdminClient({
    initialUsers: [
      { id: 'u1', email: 'player@test.com', role: 'customer', display_name: 'Player' },
      { id: 'a1', email: 'agent@test.com', role: 'agent', display_name: 'Agent' },
    ],
    initialConversations: [{ id: 'conv_u1', customer_id: 'u1', status: 'open' }],
  });

  const custRes = createMockRes();
  await handleUpdateConversationStatus(
    fake.client,
    { conversationId: 'conv_u1', status: 'resolved', actingUserId: 'u1' },
    custRes.res
  );
  assert.equal(custRes.state.statusCode, 403);

  const badRes = createMockRes();
  await handleUpdateConversationStatus(
    fake.client,
    { conversationId: 'conv_u1', status: 'invalid_state', actingUserId: 'a1' },
    badRes.res
  );
  assert.equal(badRes.state.statusCode, 400);

  const okRes = createMockRes();
  await handleUpdateConversationStatus(
    fake.client,
    { conversationId: 'conv_u1', status: 'pending', actingUserId: 'a1' },
    okRes.res
  );
  assert.equal(okRes.state.statusCode, 200);
  assert.equal(okRes.state.body.conversation.status, 'pending');
  assert.equal(fake.tables.conversations[0].status, 'pending');
});

test('Push targeting NEVER broadcasts customer notifications across other customer devices', async () => {
  const endpointCustA = 'https://fcm.googleapis.com/fcm/send/cust-a-device';
  const endpointCustB = 'https://fcm.googleapis.com/fcm/send/cust-b-device';
  const endpointStaff = 'https://fcm.googleapis.com/fcm/send/staff-device';

  const fake = createFakeAdminClient({
    initialUsers: [
      { id: 'u1', email: 'a@test.com', role: 'customer', display_name: 'Customer A' },
      { id: 'u2', email: 'b@test.com', role: 'customer', display_name: 'Customer B' },
      { id: 'a1', email: 'agent@test.com', role: 'agent', display_name: 'Support Agent' },
    ],
  });

  // Subscribe Customer A, Customer B, and Agent
  for (const [uid, ep, roleAttempt] of [
    ['u1', endpointCustA, 'admin'], // even if customer tries spoofing 'admin', DB role must win
    ['u2', endpointCustB, 'customer'],
    ['a1', endpointStaff, 'agent'],
  ] as const) {
    const subRes = createMockRes();
    await handlePushSubscribe(
      fake.client,
      {
        userId: uid,
        userRole: roleAttempt,
        subscription: { endpoint: ep, keys: { p256dh: 'key_p256', auth: 'key_auth' } },
      },
      subRes.res,
      { headers: { 'x-user-id': uid } }
    );
    assert.equal(subRes.state.statusCode, 200);
    assert.equal(subRes.state.body.success, true);
  }

  // Verify spoofed role for u1 was overwritten by authoritative DB role 'customer'
  const subsRow = fake.tables.app_config.find((r) => r.id === 'push_subscriptions');
  assert.equal(subsRow.data.find((s: any) => s.userId === 'u1')?.userRole, 'customer');

  const deliveredTo: Array<{ endpoint: string; body: any }> = [];
  const mockWebPush = {
    async sendNotification(sub: any, payloadStr: string) {
      deliveredTo.push({ endpoint: sub.endpoint, body: JSON.parse(payloadStr) });
    },
  };

  // Staff notifies Customer A (even with recipientRole: 'customer'): ONLY Customer A's endpoint is reached!
  const notifyCustA = createMockRes();
  await handlePushNotify(
    fake.client,
    {
      recipientId: 'u1',
      recipientRole: 'customer',
      senderId: 'a1',
      title: 'Private Support Reply',
      body: 'Hello Customer A only',
      conversationId: 'conv_u1',
    },
    notifyCustA.res,
    { headers: { 'x-user-id': 'a1' } },
    mockWebPush
  );
  assert.equal(notifyCustA.state.statusCode, 200);
  assert.equal(notifyCustA.state.body.sent, 1);
  assert.deepEqual(
    deliveredTo.map((d) => d.endpoint),
    [endpointCustA]
  );

  // Customer A cannot send a push notification targeting Customer B
  const maliciousPush = createMockRes();
  await handlePushNotify(
    fake.client,
    {
      recipientId: 'u2',
      recipientRole: 'customer',
      senderId: 'u1',
      title: 'Spoofed',
      body: 'Leak attempt',
    },
    maliciousPush.res,
    { headers: { 'x-user-id': 'u1' } },
    mockWebPush
  );
  assert.equal(maliciousPush.state.statusCode, 403);

  // Customer A notifies staff: ONLY active staff endpoint receives notification
  deliveredTo.length = 0;
  const notifyStaff = createMockRes();
  await handlePushNotify(
    fake.client,
    {
      recipientId: 'staff',
      recipientRole: 'agent',
      senderId: 'u1',
      title: 'New Player Message',
      body: 'Need help',
      conversationId: 'conv_u1',
    },
    notifyStaff.res,
    { headers: { 'x-user-id': 'u1' } },
    mockWebPush
  );
  assert.equal(notifyStaff.state.statusCode, 200);
  assert.deepEqual(
    deliveredTo.map((d) => d.endpoint),
    [endpointStaff]
  );
});

test('Push subscription rebinds 1:1 on account switch and stops immediately on logout/unsubscribe', async () => {
  const sharedDeviceEndpoint = 'https://fcm.googleapis.com/fcm/send/shared-phone';
  const agentPhoneEndpoint = 'https://fcm.googleapis.com/fcm/send/agent-phone';

  const fake = createFakeAdminClient({
    initialUsers: [
      { id: 'u1', email: 'a@test.com', role: 'customer', display_name: 'Customer A' },
      { id: 'a1', email: 'agent@test.com', role: 'agent', display_name: 'Agent 1' },
    ],
  });

  // 1. Agent logs in on Desktop (sharedDeviceEndpoint) and Phone (agentPhoneEndpoint)
  for (const ep of [sharedDeviceEndpoint, agentPhoneEndpoint]) {
    const res = createMockRes();
    await handlePushSubscribe(
      fake.client,
      { userId: 'a1', subscription: { endpoint: ep, keys: { p256dh: 'p', auth: 'a' } } },
      res.res,
      { headers: { 'x-user-id': 'a1' } }
    );
    assert.equal(res.state.statusCode, 200);
  }

  // 2. Customer u1 logs into that SAME desktop browser (sharedDeviceEndpoint) -> must evict a1 from sharedDeviceEndpoint
  const rebindRes = createMockRes();
  await handlePushSubscribe(
    fake.client,
    { userId: 'u1', subscription: { endpoint: sharedDeviceEndpoint, keys: { p256dh: 'p', auth: 'a' } } },
    rebindRes.res,
    { headers: { 'x-user-id': 'u1' } }
  );
  assert.equal(rebindRes.state.statusCode, 200);

  const delivered: string[] = [];
  const mockWp = {
    async sendNotification(sub: any) {
      delivered.push(sub.endpoint);
    },
  };

  // Staff alert MUST NOT hit sharedDeviceEndpoint anymore (only agentPhoneEndpoint!)
  await sendVercelPushNotification('staff', 'agent', { title: 'Hi', body: 'Msg', senderId: 'u1' }, fake.client, mockWp);
  assert.deepEqual(delivered, [agentPhoneEndpoint]);

  // 3. Customer logs out on sharedDeviceEndpoint -> endpoint removed immediately; customer alert hits 0 devices!
  const unsubRes = createMockRes();
  await handlePushUnsubscribe(
    fake.client,
    { endpoint: sharedDeviceEndpoint, userId: 'u1' },
    unsubRes.res,
    { headers: { 'x-user-id': 'u1' } }
  );
  assert.equal(unsubRes.state.statusCode, 200);
  assert.equal(unsubRes.state.body.removedCount, 1);

  delivered.length = 0;
  await sendVercelPushNotification('u1', 'customer', { title: 'Hi', body: 'After logout' }, fake.client, mockWp);
  assert.deepEqual(delivered, []);

  // Agent's separate phone endpoint remains intact after desktop logout, then also stops if revoked
  const agentStatus = createMockRes();
  await handlePushStatus(
    fake.client,
    new URL(`https://localhost/api/push/status?userId=a1&endpoint=${encodeURIComponent(agentPhoneEndpoint)}`),
    agentStatus.res,
    { headers: { 'x-user-id': 'a1' } }
  );
  assert.equal(agentStatus.state.body.boundToCurrentUser, true);
});

test('sendVercelPushNotification prunes 410 Gone endpoints automatically', async () => {
  const goneEndpoint = 'https://fcm.googleapis.com/fcm/send/expired-endpoint';
  const liveEndpoint = 'https://fcm.googleapis.com/fcm/send/live-endpoint';

  const fake = createFakeAdminClient({
    initialAppConfig: [
      {
        id: 'push_subscriptions',
        data: [
          {
            id: 'push_1',
            userId: 'u1',
            userRole: 'customer',
            active: true,
            subscription: { endpoint: goneEndpoint, keys: { p256dh: 'p', auth: 'a' } },
          },
          {
            id: 'push_2',
            userId: 'u1',
            userRole: 'customer',
            active: true,
            subscription: { endpoint: liveEndpoint, keys: { p256dh: 'p', auth: 'a' } },
          },
        ],
      },
    ],
  });

  const mockWp = {
    async sendNotification(sub: any) {
      if (sub.endpoint === goneEndpoint) {
        const err: any = new Error('Gone');
        err.statusCode = 410;
        throw err;
      }
    },
  };

  const result = await sendVercelPushNotification('u1', 'customer', { title: 'Hi', body: 'Test' }, fake.client, mockWp);
  assert.equal(result.sent, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.pruned, 1);

  const row = fake.tables.app_config.find((r) => r.id === 'push_subscriptions');
  assert.deepEqual(
    row.data.map((s: any) => s.subscription.endpoint),
    [liveEndpoint]
  );
});

test('resolveApiRequestUrl preserves Vercel rewrite __api_path, x-api-route header, and direct subpaths', () => {
  const viaQueryRewrite = resolveApiRequestUrl({
    url: '/api?__api_path=%2Fapi%2Fwheel%2Fstatus&userId=u1',
    query: { __api_path: '/api/wheel/status', userId: 'u1' },
    headers: {},
  });
  assert.equal(viaQueryRewrite.url, '/api/wheel/status');
  assert.equal(viaQueryRewrite.parsedUrl.searchParams.get('userId'), 'u1');
  assert.equal(viaQueryRewrite.parsedUrl.searchParams.get('__api_path'), null);

  const viaHeader = resolveApiRequestUrl({
    url: '/api?userId=u2',
    headers: { 'x-api-route': '/api/wheel/status' },
  });
  assert.equal(viaHeader.url, '/api/wheel/status');
  assert.equal(viaHeader.parsedUrl.searchParams.get('userId'), 'u2');

  const direct = resolveApiRequestUrl({
    url: '/api/wheel/spin?idempotencyKey=k1',
    headers: { 'x-api-route': '/api/should-not-override-direct' },
  });
  assert.equal(direct.url, '/api/wheel/spin');
  assert.equal(direct.parsedUrl.searchParams.get('idempotencyKey'), 'k1');

  const viaIndexRewrite = resolveApiRequestUrl({
    url: '/api/index?__api_path=%2Fapi%2Fwheel%2Fstatus&userId=u3',
    query: { __api_path: '/api/wheel/status', userId: 'u3' },
    headers: {},
  });
  assert.equal(viaIndexRewrite.url, '/api/wheel/status');
  assert.equal(viaIndexRewrite.parsedUrl.searchParams.get('userId'), 'u3');

  const bareRoot = resolveApiRequestUrl({
    url: '/api',
    headers: {},
  });
  assert.equal(bareRoot.url, '/api');
});


