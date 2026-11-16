import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './index';

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
