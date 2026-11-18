import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  handleGetAuditLogs,
  handlePostAuditLog,
  writeServerAuditLog,
  resolveVerifiedCallerProfile,
  verifyJwtWithJwkSet,
} from './index.js';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: any = null;
  const res = {
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      body = payload;
      return res;
    },
    end() {
      return res;
    },
  };
  return {
    res,
    getStatus: () => statusCode,
    getBody: () => body,
    getHeaders: () => headers,
  };
}

function createMockAdminClient(options?: {
  authUsers?: Record<string, { id: string; email: string }>;
  dbUsers?: Record<string, { id: string; role: string; email: string; display_name: string }>;
  auditRows?: any[];
  legacySchemaOnly?: boolean;
  failInsert?: boolean;
}) {
  const inserted: any[] = [];
  const rows = [...(options?.auditRows || [])];

  const client = {
    auth: {
      async getUser(token: string) {
        const u = options?.authUsers?.[token];
        if (!u) return { data: { user: null }, error: { message: 'Invalid token' } };
        return { data: { user: { id: u.id, email: u.email, user_metadata: {} } }, error: null };
      },
    },
    from(table: string) {
      if (table === 'users') {
        let eqId = '';
        let ilikeEmail = '';
        const q: any = {
          select() {
            return q;
          },
          eq(_col: string, val: string) {
            eqId = val;
            return q;
          },
          ilike(_col: string, val: string) {
            ilikeEmail = String(val || '').toLowerCase();
            return q;
          },
          limit() {
            return q;
          },
          async maybeSingle() {
            if (eqId) {
              return { data: options?.dbUsers?.[eqId] || null, error: null };
            }
            if (ilikeEmail) {
              const found = Object.values(options?.dbUsers || {}).find(
                (u) => String(u.email || '').toLowerCase() === ilikeEmail
              );
              return { data: found || null, error: null };
            }
            return { data: null, error: null };
          },
        };
        return q;
      }

      if (table === 'audit_logs') {
        return {
          insert(payload: any) {
            inserted.push(payload);
            const hasCanonical = Object.prototype.hasOwnProperty.call(payload, 'actor_id');
            return {
              select() {
                return {
                  async maybeSingle() {
                    if (options?.failInsert) {
                      return { data: null, error: { message: 'permission denied' } };
                    }
                    if (options?.legacySchemaOnly && hasCanonical) {
                      return {
                        data: null,
                        error: { code: '42703', message: 'column "actor_id" of relation "audit_logs" does not exist' },
                      };
                    }
                    rows.unshift(payload);
                    return { data: payload, error: null };
                  },
                };
              },
            };
          },
          select(cols: string) {
            const filters: { entity?: string; ltTs?: string; gteTs?: string; lteTs?: string } = {};
            let maxLimit = 100;
            const q: any = {
              eq(col: string, val: string) {
                if (col === 'entity_type') filters.entity = val;
                return q;
              },
              lt(_col: string, val: string) {
                filters.ltTs = val;
                return q;
              },
              gte(_col: string, val: string) {
                filters.gteTs = val;
                return q;
              },
              lte(_col: string, val: string) {
                filters.lteTs = val;
                return q;
              },
              or() {
                return q;
              },
              order() {
                return q;
              },
              limit(n: number) {
                maxLimit = n;
                return q;
              },
              then(resolve: any) {
                if (options?.legacySchemaOnly && cols.includes('actor_id')) {
                  return resolve({
                    data: null,
                    error: { code: '42703', message: 'column audit_logs.actor_id does not exist' },
                  });
                }
                let out = rows.filter((r) => {
                  const ts = r.timestamp || r.created_at;
                  if (filters.entity && r.entity_type !== filters.entity) return false;
                  if (filters.ltTs && !(ts < filters.ltTs)) return false;
                  if (filters.gteTs && !(ts >= filters.gteTs)) return false;
                  if (filters.lteTs && !(ts <= filters.lteTs)) return false;
                  return true;
                });
                out = out.slice(0, maxLimit);
                return resolve({ data: out, error: null });
              },
            };
            return q;
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    _inserted: inserted,
  };

  return client;
}

test('resolveVerifiedCallerProfile rejects tampered Bearer token instead of falling back to x-user-id', async () => {
  const client = createMockAdminClient({
    dbUsers: {
      usr_admin: { id: 'usr_admin', role: 'admin', email: 'sachet61@gmail.com', display_name: 'Admin' },
    },
  });

  const caller = await resolveVerifiedCallerProfile(client, {
    headers: {
      authorization: 'Bearer forged-token',
      'x-user-id': 'usr_admin',
    },
  });
  assert.equal(caller.role, 'anonymous');
  assert.equal(caller.id, '');
});

test('handleGetAuditLogs rejects non-admin roles with 403 and serves bounded logs for verified admin', async () => {
  const client = createMockAdminClient({
    authUsers: {
      'tok-agent': { id: 'usr_agent', email: 'agent@swiftsweeps.com' },
      'tok-admin': { id: 'usr_admin', email: 'sachet61@gmail.com' },
    },
    dbUsers: {
      usr_agent: { id: 'usr_agent', role: 'agent', email: 'agent@swiftsweeps.com', display_name: 'Support Agent' },
      usr_admin: { id: 'usr_admin', role: 'admin', email: 'sachet61@gmail.com', display_name: 'Master Admin' },
    },
    auditRows: [
      {
        id: 'aud_2',
        actor_id: 'usr_cust',
        actor_name: 'Player One',
        actor_role: 'customer',
        action: 'USER_LOGGED_OUT',
        entity_type: 'auth',
        entity_id: 'usr_cust',
        details: 'Signed out',
        timestamp: '2026-11-18T05:00:00.000Z',
      },
      {
        id: 'aud_1',
        actor_id: 'usr_admin',
        actor_name: 'Master Admin',
        actor_role: 'admin',
        action: 'TOPUP_APPROVED',
        entity_type: 'topup',
        entity_id: 'top_1',
        details: 'Approved $25',
        timestamp: '2026-11-18T04:00:00.000Z',
      },
    ],
  });

  // Agent blocked (403)
  const agentMock = createMockRes();
  await handleGetAuditLogs(
    client,
    new URL('https://localhost/api/audit-logs?limit=10'),
    agentMock.res,
    { headers: { authorization: 'Bearer tok-agent' } }
  );
  assert.equal(agentMock.getStatus(), 403);

  // Admin allowed with limit=1 pagination
  const adminMock = createMockRes();
  await handleGetAuditLogs(
    client,
    new URL('https://localhost/api/audit-logs?limit=1'),
    adminMock.res,
    { headers: { authorization: 'Bearer tok-admin' } }
  );
  assert.equal(adminMock.getStatus(), 200);
  assert.equal(adminMock.getBody().logs.length, 1);
  assert.equal(adminMock.getBody().hasMore, true);
  assert.equal(adminMock.getBody().nextCursor, '2026-11-18T05:00:00.000Z');
});

test('handlePostAuditLog derives actor identity from verified caller and never trusts spoofed role', async () => {
  const client = createMockAdminClient({
    authUsers: { 'tok-cust': { id: 'usr_cust', email: 'player@example.com' } },
    dbUsers: {
      usr_cust: { id: 'usr_cust', role: 'customer', email: 'player@example.com', display_name: 'Player One' },
    },
  });

  const mock = createMockRes();
  await handlePostAuditLog(
    client,
    {
      actorId: 'usr_admin_fake',
      actorName: 'Fake Admin',
      actorRole: 'admin',
      action: 'TOPUP_SUBMITTED',
      entityType: 'topup',
      entityId: 'top_88',
      details: 'Submitted deposit',
    },
    mock.res,
    { headers: { authorization: 'Bearer tok-cust' } }
  );

  assert.equal(mock.getStatus(), 201);
  assert.equal(mock.getBody().log.actorId, 'usr_cust');
  assert.equal(mock.getBody().log.actorName, 'Player One');
  assert.equal(mock.getBody().log.actorRole, 'customer');
});

test('writeServerAuditLog falls back cleanly when live DB still has legacy columns and fails loudly on hard errors', async () => {
  const legacyClient = createMockAdminClient({ legacySchemaOnly: true });
  const okRes = await writeServerAuditLog(legacyClient, {
    actorId: 'usr_1',
    actorName: 'Alice',
    actorRole: 'customer',
    action: 'USER_LOGGED_IN',
    entityType: 'auth',
    entityId: 'usr_1',
    details: 'Signed in',
  });
  assert.equal(okRes.ok, true);
  assert.equal(legacyClient._inserted.length, 2);
  assert.equal(legacyClient._inserted[1].user_id, 'usr_1');

  const failingClient = createMockAdminClient({ failInsert: true });
  const errRes = await writeServerAuditLog(failingClient, {
    actorId: 'usr_1',
    actorName: 'Alice',
    actorRole: 'customer',
    action: 'USER_LOGGED_IN',
    entityType: 'auth',
    entityId: 'usr_1',
    details: 'Signed in',
  });
  assert.equal(errRes.ok, false);
  assert.match(errRes.error || '', /permission denied/);
});

test('handleGetAuditLogs authenticates via x-supabase-token without Authorization header and returns 401 on expired JWT', async () => {
  const client = createMockAdminClient({
    authUsers: {
      'tok-proxy-admin': { id: 'auth_uid_999', email: 'opsadmin@swiftsweeps.com' },
    },
    dbUsers: {
      // Legacy DB id differs from Supabase auth_uid_999; must match via email
      legacy_usr_admin: {
        id: 'legacy_usr_admin',
        role: 'admin',
        email: 'opsadmin@swiftsweeps.com',
        display_name: 'Ops Admin',
      },
    },
    auditRows: [
      {
        id: 'aud_10',
        actor_id: 'legacy_usr_admin',
        actor_name: 'Ops Admin',
        actor_role: 'admin',
        action: 'USER_LOGGED_IN',
        entity_type: 'auth',
        entity_id: 'legacy_usr_admin',
        details: 'Signed in',
        timestamp: '2026-11-18T06:00:00.000Z',
      },
    ],
  });

  // Valid x-supabase-token succeeds even when Authorization header is absent and IDs differ
  const okMock = createMockRes();
  await handleGetAuditLogs(
    client,
    new URL('https://localhost/api/audit-logs?limit=25'),
    okMock.res,
    { headers: { 'x-supabase-token': 'tok-proxy-admin' } }
  );
  assert.equal(okMock.getStatus(), 200);
  assert.equal(okMock.getBody().logs.length, 1);
  assert.equal(okMock.getBody().logs[0].id, 'aud_10');

  // Expired / rejected x-supabase-token returns 401 TOKEN_EXPIRED rather than 403
  const expiredMock = createMockRes();
  await handleGetAuditLogs(
    client,
    new URL('https://localhost/api/audit-logs?limit=25'),
    expiredMock.res,
    { headers: { 'x-supabase-token': 'expired-jwt', 'x-user-id': 'legacy_usr_admin' } }
  );
  assert.equal(expiredMock.getStatus(), 401);
  assert.equal(expiredMock.getBody().code, 'TOKEN_EXPIRED');
});

function signTestEs256Jwt(
  privateKey: crypto.KeyObject,
  kid: string,
  payload: Record<string, unknown>
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = Buffer.from(`${header}.${body}`, 'utf8');
  const sig = crypto.sign('sha256', signingInput, { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${header}.${body}.${sig.toString('base64url')}`;
}

test('resolveVerifiedCallerProfile falls back to JWKS ONLY on transient network/5xx errors, never on explicit revocation', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicJwk = { ...(publicKey.export({ format: 'jwk' }) as Record<string, any>), kid: 'test-es256-1', alg: 'ES256' };
  const issuer = 'https://fsykihwprqdptrqapxxg.supabase.co/auth/v1';
  const nowSec = Math.floor(Date.now() / 1000);

  const validJwt = signTestEs256Jwt(privateKey, 'test-es256-1', {
    sub: 'usr_admin',
    email: 'sachet61@gmail.com',
    iss: issuer,
    exp: nowSec + 600,
  });
  const expiredJwt = signTestEs256Jwt(privateKey, 'test-es256-1', {
    sub: 'usr_admin',
    email: 'sachet61@gmail.com',
    iss: issuer,
    exp: nowSec - 60,
  });

  // Verify direct JWKS helper accepts valid and rejects expired
  assert.equal(verifyJwtWithJwkSet(validJwt, [publicJwk], issuer)?.sub, 'usr_admin');
  assert.equal(verifyJwtWithJwkSet(expiredJwt, [publicJwk], issuer), null);

  const dbUsers = {
    usr_admin: { id: 'usr_admin', role: 'admin', email: 'sachet61@gmail.com', display_name: 'Admin' },
  };
  const baseClient = createMockAdminClient({ dbUsers });

  // 1. Transient GoTrue network outage + valid unexpired ES256 JWT -> verified via JWKS
  const transientOutageClient = {
    ...baseClient,
    auth: {
      async getUser() {
        return { data: { user: null }, error: { status: 503, message: 'Service Unavailable' } };
      },
    },
  };
  const recovered = await resolveVerifiedCallerProfile(transientOutageClient, {
    headers: { 'x-supabase-token': validJwt },
    jwksKeysOverride: [publicJwk],
    expectedIssuerOverride: issuer,
  });
  assert.equal(recovered.verifiedByJwt, true);
  assert.equal(recovered.role, 'admin');
  assert.equal(recovered.id, 'usr_admin');

  // 2. Transient outage + expired JWT -> still rejected (no x-user-id fallback)
  const expiredRejected = await resolveVerifiedCallerProfile(transientOutageClient, {
    headers: { 'x-supabase-token': expiredJwt, 'x-user-id': 'usr_admin' },
    jwksKeysOverride: [publicJwk],
    expectedIssuerOverride: issuer,
  });
  assert.equal(expiredRejected.jwtRejected, true);
  assert.equal(expiredRejected.role, 'anonymous');

  // 3. Explicit GoTrue revocation (session_not_found / 403) + valid unexpired JWT -> MUST reject!
  const revokedClient = {
    ...baseClient,
    auth: {
      async getUser() {
        return {
          data: { user: null },
          error: {
            status: 403,
            code: 'session_not_found',
            message: 'Session from session_id claim in JWT does not exist',
          },
        };
      },
    },
  };
  const revokedCaller = await resolveVerifiedCallerProfile(revokedClient, {
    headers: { 'x-supabase-token': validJwt, 'x-user-id': 'usr_admin' },
    jwksKeysOverride: [publicJwk],
    expectedIssuerOverride: issuer,
  });
  assert.equal(revokedCaller.jwtRejected, true);
  assert.equal(revokedCaller.role, 'anonymous');
});


