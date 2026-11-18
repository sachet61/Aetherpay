import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthTokenCoordinator,
  decodeJwtExpMs,
  isJwtExpiredOrExpiring,
  isPermanentAuthRefreshError,
  SESSION_EXPIRED_USER_MESSAGE,
} from './authTokenUtils';

function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

test('decodeJwtExpMs and isJwtExpiredOrExpiring detect expired and nearly-expired JWTs', () => {
  const nowMs = 1_700_000_000_000;
  const expiredJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs - 5_000) / 1000) });
  const nearExpiryJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs + 10_000) / 1000) });
  const freshJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs + 300_000) / 1000) });

  assert.equal(decodeJwtExpMs(expiredJwt), Math.floor((nowMs - 5_000) / 1000) * 1000);
  assert.equal(isJwtExpiredOrExpiring(expiredJwt, nowMs, 30_000), true);
  assert.equal(isJwtExpiredOrExpiring(nearExpiryJwt, nowMs, 30_000), true);
  assert.equal(isJwtExpiredOrExpiring(freshJwt, nowMs, 30_000), false);
  // Opaque non-JWT tokens are left for server verification
  assert.equal(isJwtExpiredOrExpiring('opaque-test-token', nowMs, 30_000), false);
  assert.equal(isJwtExpiredOrExpiring('', nowMs, 30_000), true);
});

test('isPermanentAuthRefreshError distinguishes revoked/missing sessions from network/5xx faults', () => {
  assert.equal(isPermanentAuthRefreshError({ message: 'Invalid Refresh Token: Refresh Token Not Found', status: 400 }), true);
  assert.equal(isPermanentAuthRefreshError({ code: 'session_not_found', message: 'Session from session_id claim in JWT does not exist' }), true);
  assert.equal(isPermanentAuthRefreshError({ message: 'Auth session missing!' }), true);
  assert.equal(isPermanentAuthRefreshError({ message: 'Failed to fetch' }), false);
  assert.equal(isPermanentAuthRefreshError({ status: 503, message: 'Service Unavailable' }), false);
  assert.equal(isPermanentAuthRefreshError({ message: 'Network timeout (504)' }), false);
});

test('AuthTokenCoordinator never falls back to a rejected token and flags requiresReauth when refresh fails permanently', async () => {
  const nowMs = 1_700_000_000_000;
  const revokedButUnexpiredJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs + 1_800_000) / 1000) });
  let reauthReasons: string[] = [];

  const coordinator = new AuthTokenCoordinator({
    nowMs: () => nowMs,
    getSession: async () => ({
      data: { session: { access_token: revokedButUnexpiredJwt } },
      error: null,
    }),
    refreshSession: async () => ({
      data: { session: null },
      error: { message: 'Invalid Refresh Token: Refresh Token Not Found', status: 400 },
    }),
    onRequiresReauth: (reason) => reauthReasons.push(reason),
  });

  // Initial call returns the stored token (not known to be revoked yet)
  const first = await coordinator.getAccessToken();
  assert.equal(first.token, revokedButUnexpiredJwt);
  assert.equal(first.requiresReauth, false);

  // Server returned 401; retry forces refresh with rejectedToken.
  // Even though getSession() STILL holds revokedButUnexpiredJwt, coordinator MUST NOT return it again!
  const retry = await coordinator.getAccessToken({
    forceRefresh: true,
    rejectedToken: revokedButUnexpiredJwt,
  });
  assert.equal(retry.token, null);
  assert.equal(retry.requiresReauth, true);
  assert.equal(retry.error, SESSION_EXPIRED_USER_MESSAGE);
  assert.equal(reauthReasons.length, 1);

  // Subsequent non-forced call must not return the dead token either
  const third = await coordinator.getAccessToken();
  assert.equal(third.token, null);
  assert.equal(third.requiresReauth, true);
});

test('AuthTokenCoordinator deduplicates concurrent refresh calls into one single-flight refresh', async () => {
  const nowMs = 1_700_000_000_000;
  const expiredJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs - 60_000) / 1000) });
  const freshJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs + 3_600_000) / 1000) });

  let currentToken = expiredJwt;
  let refreshCalls = 0;

  const coordinator = new AuthTokenCoordinator({
    nowMs: () => nowMs,
    getSession: async () => ({
      data: { session: { access_token: currentToken } },
      error: null,
    }),
    refreshSession: async () => {
      refreshCalls += 1;
      await new Promise((r) => setTimeout(r, 20));
      currentToken = freshJwt;
      return {
        data: { session: { access_token: freshJwt } },
        error: null,
      };
    },
  });

  const [r1, r2, r3] = await Promise.all([
    coordinator.getAccessToken(),
    coordinator.getAccessToken(),
    coordinator.getAccessToken({ forceRefresh: true, rejectedToken: expiredJwt }),
  ]);

  assert.equal(refreshCalls, 1);
  assert.equal(r1.token, freshJwt);
  assert.equal(r2.token, freshJwt);
  assert.equal(r3.token, freshJwt);
  assert.equal(r1.requiresReauth, false);
});

test('AuthTokenCoordinator preserves session and returns transient error when refresh fails due to network issue', async () => {
  const nowMs = 1_700_000_000_000;
  const expiringJwt = makeUnsignedJwt({ sub: 'u1', exp: Math.floor((nowMs + 5_000) / 1000) });
  let reauthTriggered = false;

  const coordinator = new AuthTokenCoordinator({
    nowMs: () => nowMs,
    getSession: async () => ({
      data: { session: { access_token: expiringJwt } },
      error: null,
    }),
    refreshSession: async () => ({
      data: { session: null },
      error: { message: 'Failed to fetch' },
    }),
    onRequiresReauth: () => {
      reauthTriggered = true;
    },
  });

  const res = await coordinator.getAccessToken({ forceRefresh: true });
  assert.equal(res.token, null);
  assert.equal(res.requiresReauth, false);
  assert.equal(res.isTransientError, true);
  assert.equal(reauthTriggered, false);
});
