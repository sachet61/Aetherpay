import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleCreateOfficialPartner,
  handleDeleteOfficialPartner,
  handleGetOfficialPartners,
  handleReorderOfficialPartners,
  handleUpdateOfficialPartner,
  handleUploadOfficialPartnerIcon,
  type OfficialPartnerHandlerDeps,
} from './officialPartnerHandlers.js';

function createMockRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

function createFakeAdminClient(initialRows: any[] = []) {
  const rows = initialRows.map((r) => ({ ...r }));
  const uploads: any[] = [];

  return {
    rows,
    uploads,
    storage: {
      async listBuckets() {
        return { data: [{ name: 'partner-icons', public: true }], error: null };
      },
      from(bucket: string) {
        return {
          async upload(path: string, buf: Buffer, opts: any) {
            uploads.push({ bucket, path, size: buf.length, opts });
            return { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}`,
              },
            };
          },
        };
      },
    },
    from(table: string) {
      assert.equal(table, 'official_partners');
      const state: {
        eqs: Array<[string, any]>;
        orders: Array<[string, boolean]>;
        maxLimit: number;
      } = { eqs: [], orders: [], maxLimit: 200 };

      const builder: any = {
        select() {
          return builder;
        },
        eq(col: string, val: any) {
          state.eqs.push([col, val]);
          return builder;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          state.orders.push([col, opts?.ascending !== false]);
          return builder;
        },
        limit(n: number) {
          state.maxLimit = n;
          return builder;
        },
        async maybeSingle() {
          const filtered = rows.filter((r) => state.eqs.every(([c, v]) => r[c] === v));
          return { data: filtered[0] || null, error: null };
        },
        async single() {
          const filtered = rows.filter((r) => state.eqs.every(([c, v]) => r[c] === v));
          return { data: filtered[0] || null, error: null };
        },
        insert(payload: any) {
          const created = {
            id: payload.id || '11111111-1111-4111-8111-111111111111',
            ...payload,
          };
          rows.push(created);
          return {
            select() {
              return {
                async single() {
                  return { data: created, error: null };
                },
              };
            },
          };
        },
        update(patch: any) {
          const updateFilters: Array<[string, any]> = [];
          const updateBuilder: any = {
            eq(col: string, val: any) {
              updateFilters.push([col, val]);
              return updateBuilder;
            },
            select() {
              return {
                async single() {
                  const target = rows.find((r) => updateFilters.every(([c, v]) => r[c] === v));
                  if (!target) return { data: null, error: { message: 'Not found' } };
                  Object.assign(target, patch);
                  return { data: target, error: null };
                },
              };
            },
            then(resolve: any) {
              const target = rows.find((r) => updateFilters.every(([c, v]) => r[c] === v));
              if (target) Object.assign(target, patch);
              return Promise.resolve({ data: target || null, error: null }).then(resolve);
            },
          };
          return updateBuilder;
        },
        delete() {
          const delFilters: Array<[string, any]> = [];
          const delBuilder: any = {
            eq(col: string, val: any) {
              delFilters.push([col, val]);
              return delBuilder;
            },
            then(resolve: any) {
              const idx = rows.findIndex((r) => delFilters.every(([c, v]) => r[c] === v));
              if (idx !== -1) rows.splice(idx, 1);
              return Promise.resolve({ error: null }).then(resolve);
            },
          };
          return delBuilder;
        },
        then(resolve: any) {
          let result = rows.filter((r) => state.eqs.every(([c, v]) => r[c] === v));
          for (const [col, asc] of [...state.orders].reverse()) {
            result = [...result].sort((a, b) => {
              if (a[col] === b[col]) return 0;
              return (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1);
            });
          }
          return Promise.resolve({ data: result.slice(0, state.maxLimit), error: null }).then(resolve);
        },
      };
      return builder;
    },
  };
}

test('GET /api/official-partners hides non-visible rows for customers and blocks ?includeHidden=1 for agents', async () => {
  const adminClient = createFakeAdminClient([
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Visible FB',
      platform: 'facebook',
      page_url: 'https://www.facebook.com/visible',
      is_visible: true,
      sort_order: 0,
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Hidden TG',
      platform: 'telegram',
      page_url: 'https://t.me/hidden_tg',
      is_visible: false,
      sort_order: 1,
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]);

  const customerDeps: OfficialPartnerHandlerDeps = {
    adminClient,
    resolveCaller: async () => ({
      id: 'cust-1',
      displayName: 'Player',
      role: 'customer',
      verifiedByJwt: true,
    }),
    writeAudit: async () => ({ ok: true }),
  };

  const resCust = createMockRes();
  await handleGetOfficialPartners(
    customerDeps,
    new URL('https://localhost/api/official-partners'),
    resCust,
    {}
  );
  assert.equal(resCust.statusCode, 200);
  assert.equal(resCust.body.partners.length, 1);
  assert.equal(resCust.body.partners[0].name, 'Visible FB');

  // Agent blocked from includeHidden=1
  const agentDeps: OfficialPartnerHandlerDeps = {
    adminClient,
    resolveCaller: async () => ({
      id: 'agent-1',
      displayName: 'Support Agent',
      role: 'agent',
      verifiedByJwt: true,
    }),
    writeAudit: async () => ({ ok: true }),
  };
  const resAgent = createMockRes();
  await handleGetOfficialPartners(
    agentDeps,
    new URL('https://localhost/api/official-partners?includeHidden=1'),
    resAgent,
    {}
  );
  assert.equal(resAgent.statusCode, 403);

  // Admin gets both
  const adminDeps: OfficialPartnerHandlerDeps = {
    adminClient,
    resolveCaller: async () => ({
      id: 'admin-1',
      displayName: 'Admin',
      role: 'admin',
      verifiedByJwt: true,
    }),
    writeAudit: async () => ({ ok: true }),
  };
  const resAdmin = createMockRes();
  await handleGetOfficialPartners(
    adminDeps,
    new URL('https://localhost/api/official-partners?includeHidden=1'),
    resAdmin,
    {}
  );
  assert.equal(resAdmin.statusCode, 200);
  assert.equal(resAdmin.body.partners.length, 2);
});

test('Agent and customer cannot create, update, reorder, delete, or upload partner icons (HTTP 403)', async () => {
  const adminClient = createFakeAdminClient([]);
  const agentDeps: OfficialPartnerHandlerDeps = {
    adminClient,
    resolveCaller: async () => ({
      id: 'agent-1',
      displayName: 'Agent',
      role: 'agent',
      verifiedByJwt: true,
    }),
    writeAudit: async () => ({ ok: true }),
  };

  const r1 = createMockRes();
  await handleCreateOfficialPartner(
    agentDeps,
    { name: 'Test', platform: 'telegram', pageUrl: 'https://t.me/test' },
    r1,
    {}
  );
  assert.equal(r1.statusCode, 403);

  const r2 = createMockRes();
  await handleUpdateOfficialPartner(
    agentDeps,
    '11111111-1111-4111-8111-111111111111',
    { isVisible: false },
    r2,
    {}
  );
  assert.equal(r2.statusCode, 403);

  const r3 = createMockRes();
  await handleReorderOfficialPartners(
    agentDeps,
    { orderedIds: ['11111111-1111-4111-8111-111111111111'] },
    r3,
    {}
  );
  assert.equal(r3.statusCode, 403);

  const r4 = createMockRes();
  await handleDeleteOfficialPartner(agentDeps, '11111111-1111-4111-8111-111111111111', {}, r4, {});
  assert.equal(r4.statusCode, 403);

  const r5 = createMockRes();
  await handleUploadOfficialPartnerIcon(
    agentDeps,
    { fileName: 'a.png', contentType: 'image/png', fileBase64: 'iVBORw0KGgoAAAANSUhEUg==' },
    r5,
    {}
  );
  assert.equal(r5.statusCode, 403);
});

test('Admin CRUD + Reorder emits PARTNER_CREATED, PARTNER_UPDATED, PARTNER_REORDERED, PARTNER_DELETED audit logs and validates URLs', async () => {
  const auditEvents: any[] = [];
  const p1Id = '11111111-1111-4111-8111-111111111111';
  const p2Id = '22222222-2222-4222-8222-222222222222';
  const adminClient = createFakeAdminClient([
    {
      id: p2Id,
      name: 'Existing IG',
      platform: 'instagram',
      page_url: 'https://www.instagram.com/existing',
      is_visible: true,
      sort_order: 0,
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]);

  const adminDeps: OfficialPartnerHandlerDeps = {
    adminClient,
    resolveCaller: async () => ({
      id: '33333333-3333-4333-8333-333333333333',
      displayName: 'Super Admin',
      role: 'admin',
      verifiedByJwt: true,
    }),
    writeAudit: async (_c, entry) => {
      auditEvents.push(entry);
      return { ok: true };
    },
  };

  // Invalid domain rejected
  const badRes = createMockRes();
  await handleCreateOfficialPartner(
    adminDeps,
    { name: 'Spoofed', platform: 'facebook', pageUrl: 'https://t.me/not_facebook' },
    badRes,
    {}
  );
  assert.equal(badRes.statusCode, 400);

  // Valid create
  const createRes = createMockRes();
  await handleCreateOfficialPartner(
    adminDeps,
    {
      name: 'VIP Facebook',
      platform: 'facebook',
      pageUrl: 'https://www.facebook.com/SwiftSweepsVIP',
      note: 'Fast message response',
      isVisible: true,
    },
    createRes,
    {}
  );
  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.body.partner.sortOrder, 1);

  // Valid update
  const updateRes = createMockRes();
  await handleUpdateOfficialPartner(adminDeps, p1Id, { isVisible: false }, updateRes, {});
  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.body.partner.isVisible, false);

  // Reorder
  const reorderRes = createMockRes();
  await handleReorderOfficialPartners(adminDeps, { orderedIds: [p1Id, p2Id] }, reorderRes, {});
  assert.equal(reorderRes.statusCode, 200);
  assert.deepEqual(
    reorderRes.body.partners.map((p: any) => p.id),
    [p1Id, p2Id]
  );

  // Delete
  const delRes = createMockRes();
  await handleDeleteOfficialPartner(adminDeps, p1Id, {}, delRes, {});
  assert.equal(delRes.statusCode, 200);

  assert.deepEqual(
    auditEvents.map((e) => e.action),
    ['PARTNER_CREATED', 'PARTNER_UPDATED', 'PARTNER_REORDERED', 'PARTNER_DELETED']
  );
});

test('Icon upload rejects SVG, oversize >512KB, and spoofed bytes, while accepting valid PNG', async () => {
  const adminClient = createFakeAdminClient([]);
  const adminDeps: OfficialPartnerHandlerDeps = {
    adminClient,
    resolveCaller: async () => ({
      id: '33333333-3333-4333-8333-333333333333',
      displayName: 'Admin',
      role: 'admin',
      verifiedByJwt: true,
    }),
    writeAudit: async () => ({ ok: true }),
  };

  // Reject SVG MIME
  const svgRes = createMockRes();
  await handleUploadOfficialPartnerIcon(
    adminDeps,
    {
      fileName: 'icon.svg',
      contentType: 'image/svg+xml',
      fileBase64: Buffer.from('<svg></svg>').toString('base64'),
    },
    svgRes,
    {}
  );
  assert.equal(svgRes.statusCode, 400);

  // Reject SVG disguised as PNG
  const spoofSvgRes = createMockRes();
  await handleUploadOfficialPartnerIcon(
    adminDeps,
    {
      fileName: 'icon.png',
      contentType: 'image/png',
      fileBase64: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64'),
    },
    spoofSvgRes,
    {}
  );
  assert.equal(spoofSvgRes.statusCode, 400);

  // Reject > 512 KB
  const tooBigBuf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(512 * 1024 + 10),
  ]);
  const bigRes = createMockRes();
  await handleUploadOfficialPartnerIcon(
    adminDeps,
    {
      fileName: 'big.png',
      contentType: 'image/png',
      fileBase64: tooBigBuf.toString('base64'),
    },
    bigRes,
    {}
  );
  assert.equal(bigRes.statusCode, 400);

  // Accept valid PNG <= 512KB
  const validPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const okRes = createMockRes();
  await handleUploadOfficialPartnerIcon(
    adminDeps,
    {
      fileName: 'partner.png',
      contentType: 'image/png',
      fileBase64: validPng.toString('base64'),
    },
    okRes,
    {}
  );
  assert.equal(okRes.statusCode, 200);
  assert.ok(okRes.body.url.includes('/partner-icons/'));
});
