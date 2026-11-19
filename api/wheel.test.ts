import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetWheelStatus,
  handlePostAdminWheelConfig,
  handlePostGameCreditTransfer,
  handlePostWheelSpin,
  type WheelCallerProfile,
  type WheelHandlerDeps,
} from './wheelHandlers.js';
import { DEFAULT_WHEEL_OF_LUCK_CONFIG } from '../src/utils/wheelOfLuckUtils.js';

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

function createWheelMockEnv(seed?: {
  users?: any[];
  wallets?: any[];
  game_accounts?: any[];
  wheel_spins?: any[];
  transactions?: any[];
  conversations?: any[];
  messages?: any[];
  appConfig?: any;
  missingWheelSchema?: boolean;
}) {
  const db: Record<string, any[]> = {
    users: [...(seed?.users || [])],
    wallets: [...(seed?.wallets || [])],
    game_accounts: [...(seed?.game_accounts || [])],
    wheel_spins: [...(seed?.wheel_spins || [])],
    transactions: [...(seed?.transactions || [])],
    conversations: [...(seed?.conversations || [])],
    messages: [...(seed?.messages || [])],
    notifications: [],
    app_config: seed?.appConfig ? [{ id: 'main', data: seed.appConfig }] : [],
  };

  const audits: any[] = [];

  const applyFilters = (rows: any[], ops: Array<{ type: string; col: string; val: any }>) => {
    return rows.filter((row) => {
      for (const op of ops) {
        const cell = row?.[op.col];
        if (op.type === 'eq' && cell !== op.val) return false;
        if (op.type === 'neq' && cell === op.val) return false;
        if (op.type === 'in' && !(Array.isArray(op.val) && op.val.includes(cell))) return false;
      }
      return true;
    });
  };

  const adminClient = {
    from(table: string) {
      if (!db[table]) db[table] = [];

      const buildSelectQuery = () => {
        const ops: Array<{ type: string; col: string; val: any }> = [];
        let maxLimit = 1000;
        let orderCol: string | null = null;
        let ascending = true;

        const execute = () => {
          if (seed?.missingWheelSchema && table === 'wheel_spins') {
            return { data: null, error: { code: '42P01', message: 'relation "wheel_spins" does not exist' } };
          }
          let result = applyFilters(db[table], ops);
          if (orderCol) {
            result = [...result].sort((a, b) => {
              const va = String(a?.[orderCol!] ?? '');
              const vb = String(b?.[orderCol!] ?? '');
              return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
            });
          }
          return { data: result.slice(0, maxLimit), error: null };
        };

        const q: any = {
          eq(col: string, val: any) {
            ops.push({ type: 'eq', col, val });
            return q;
          },
          neq(col: string, val: any) {
            ops.push({ type: 'neq', col, val });
            return q;
          },
          in(col: string, val: any[]) {
            ops.push({ type: 'in', col, val });
            return q;
          },
          order(col: string, opts?: { ascending?: boolean }) {
            orderCol = col;
            ascending = opts?.ascending !== false;
            return q;
          },
          limit(n: number) {
            maxLimit = n;
            return q;
          },
          async maybeSingle() {
            const res = execute();
            if (res.error) return res;
            return { data: res.data![0] || null, error: null };
          },
          async single() {
            const res = execute();
            if (res.error) return res;
            return { data: res.data![0] || null, error: null };
          },
          then(resolve: any) {
            return resolve(execute());
          },
        };
        return q;
      };

      const wrapMutation = (rowsAffected: any[], err: any = null) => ({
        select() {
          return {
            async maybeSingle() {
              return { data: err ? null : rowsAffected[0] || null, error: err };
            },
            async single() {
              return { data: err ? null : rowsAffected[0] || null, error: err };
            },
            then(resolve: any) {
              return resolve({ data: err ? null : rowsAffected, error: err });
            },
          };
        },
        catch() {
          return Promise.resolve({ data: err ? null : rowsAffected, error: err });
        },
        then(resolve: any) {
          return resolve({ data: err ? null : rowsAffected, error: err });
        },
      });

      return {
        select() {
          return buildSelectQuery();
        },
        insert(payload: any) {
          const arr = Array.isArray(payload) ? payload : [payload];
          if (table === 'wheel_spins') {
            for (const item of arr) {
              if (
                item?.idempotency_key &&
                db.wheel_spins.some(
                  (r) => r.customer_id === item.customer_id && r.idempotency_key === item.idempotency_key
                )
              ) {
                return wrapMutation([], {
                  code: '23505',
                  message: 'duplicate key value violates unique constraint "idx_wheel_spins_idempotency"',
                });
              }
            }
          }
          const inserted: any[] = [];
          for (const item of arr) {
            const copy = { ...item };
            db[table].push(copy);
            inserted.push(copy);
          }
          return wrapMutation(inserted);
        },
        upsert(payload: any) {
          const arr = Array.isArray(payload) ? payload : [payload];
          const updated: any[] = [];
          for (const item of arr) {
            const key = table === 'wallets' ? 'customer_id' : 'id';
            const idx = db[table].findIndex((r) => r[key] === item[key]);
            if (idx >= 0) {
              db[table][idx] = { ...db[table][idx], ...item };
              updated.push(db[table][idx]);
            } else {
              const row = { ...item };
              db[table].push(row);
              updated.push(row);
            }
          }
          return wrapMutation(updated);
        },
        update(patch: Record<string, any>) {
          const ops: Array<{ type: string; col: string; val: any }> = [];
          const runUpdate = () => {
            const targets = applyFilters(db[table], ops);
            for (const t of targets) {
              Object.assign(t, patch);
            }
            return targets;
          };
          const uq: any = {
            eq(col: string, val: any) {
              ops.push({ type: 'eq', col, val });
              return uq;
            },
            select() {
              const rows = runUpdate();
              return {
                async maybeSingle() {
                  return { data: rows[0] || null, error: null };
                },
                then(resolve: any) {
                  return resolve({ data: rows, error: null });
                },
              };
            },
            then(resolve: any) {
              runUpdate();
              return resolve({ error: null });
            },
          };
          return uq;
        },
        delete() {
          const ops: Array<{ type: string; col: string; val: any }> = [];
          const dq: any = {
            eq(col: string, val: any) {
              ops.push({ type: 'eq', col, val });
              return dq;
            },
            then(resolve: any) {
              const toKeep = db[table].filter((r) => applyFilters([r], ops).length === 0);
              db[table] = toKeep;
              return resolve({ error: null });
            },
          };
          return dq;
        },
      };
    },
  };

  return { db, audits, adminClient };
}

function makeDeps(
  env: ReturnType<typeof createWheelMockEnv>,
  caller: WheelCallerProfile,
  opts?: {
    nowMs?: number;
    randomUnit?: number;
    notifyTelegram?: (adminClient: any, text: string) => Promise<boolean>;
  }
): WheelHandlerDeps {
  return {
    adminClient: env.adminClient,
    resolveCaller: async () => caller,
    writeAudit: async (_client, input) => {
      env.audits.push(input);
    },
    nowFn: opts?.nowMs !== undefined ? () => opts.nowMs! : undefined,
    randomUnitFn: opts?.randomUnit !== undefined ? () => opts.randomUnit! : undefined,
    notifyTelegram: opts?.notifyTelegram,
  };
}

test('Wheel spin credits ONLY actual rewardAmount to free_play_balance (never simulatedWinDisplay) and enforces 24h rolling cooldown', async () => {
  const t0 = Date.parse('2026-11-18T12:00:00.000Z');
  const env = createWheelMockEnv({
    users: [{ id: 'player_1', display_name: 'Alice', role: 'customer', email_verified: true }],
    wallets: [
      {
        customer_id: 'player_1',
        balance: 100,
        referral_bonus_balance: 25,
        free_play_balance: 5,
        currency: 'USD',
      },
    ],
    appConfig: {
      wheelOfLuck: {
        ...DEFAULT_WHEEL_OF_LUCK_CONFIG,
        enabled: true,
        simulatedWinDisplay: { enabled: true, amount: 250, label: 'Featured Jackpot Showcase' },
      },
    },
  });

  const caller: WheelCallerProfile = {
    id: 'player_1',
    displayName: 'Alice',
    role: 'customer',
    verifiedByJwt: true,
  };

  // 1. First spin succeeds (randomUnit 0.0 -> first segment = $5.00 Free Play)
  const spin1Res = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, caller, { nowMs: t0, randomUnit: 0.55 }),
    { idempotencyKey: 'spin_key_1' },
    spin1Res.res,
    { headers: {} }
  );

  assert.equal(spin1Res.getStatus(), 200);
  const body1 = spin1Res.getBody();
  assert.equal(body1.success, true);
  assert.equal(body1.idempotentReplay, false);
  assert.equal(body1.actualRewardAmount, 5);
  assert.equal(body1.simulatedWinDisplay.amount, 250);
  assert.equal(body1.simulatedWinDisplay.isSimulatedOnly, true);

  // Wallet: ONLY free_play_balance increased (5 + 5 = 10); cash balance (100) and referral (25) untouched!
  assert.equal(body1.freePlayBalance, 10);
  assert.equal(body1.availableBalance, 100);
  assert.equal(env.db.wallets[0].free_play_balance, 10);
  assert.equal(env.db.wallets[0].balance, 100);

  // Transaction & Notification & Audit created
  assert.equal(env.db.transactions.length, 1);
  assert.equal(env.db.transactions[0].type, 'free_play_bonus');
  assert.equal(env.db.transactions[0].amount, 5);
  assert.equal(env.db.notifications.length, 1);
  assert.equal(env.audits[0].action, 'WHEEL_SPIN_CLAIMED');

  // 2. Idempotent replay with same key returns 200 without double crediting
  const replayRes = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, caller, { nowMs: t0 + 5000, randomUnit: 0.9 }),
    { idempotencyKey: 'spin_key_1' },
    replayRes.res,
    { headers: {} }
  );
  assert.equal(replayRes.getStatus(), 200);
  assert.equal(replayRes.getBody().idempotentReplay, true);
  assert.equal(env.db.wallets[0].free_play_balance, 10);
  assert.equal(env.db.transactions.length, 1);

  // 3. New spin request 4 hours later -> blocked by 24h rolling cooldown (429)
  const cooldownRes = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, caller, { nowMs: t0 + 4 * 3600 * 1000, randomUnit: 0.5 }),
    { idempotencyKey: 'spin_key_2' },
    cooldownRes.res,
    { headers: {} }
  );
  assert.equal(cooldownRes.getStatus(), 429);
  assert.equal(cooldownRes.getBody().code, 'COOLDOWN_ACTIVE');
  assert.equal(cooldownRes.getBody().eligibility.eligible, false);
  assert.equal(env.db.wallets[0].free_play_balance, 10);

  // 4. Spin status endpoint reflects remaining cooldown
  const statusRes = createMockRes();
  await handleGetWheelStatus(
    makeDeps(env, caller, { nowMs: t0 + 4 * 3600 * 1000 }),
    new URL('http://localhost/api/wheel/status'),
    statusRes.res,
    { headers: {} }
  );
  assert.equal(statusRes.getStatus(), 200);
  assert.equal(statusRes.getBody().eligibility.eligible, false);
  assert.equal(statusRes.getBody().freePlayBalance, 10);

  // 5. Exactly 24h later -> eligible again!
  const after24hRes = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, caller, { nowMs: t0 + 24 * 3600 * 1000, randomUnit: 0.55 }),
    { idempotencyKey: 'spin_key_3' },
    after24hRes.res,
    { headers: {} }
  );
  assert.equal(after24hRes.getStatus(), 200);
  assert.equal(env.db.wallets[0].free_play_balance, 15);
  assert.equal(env.db.transactions.length, 2);
});

test('Wheel spin rejects unauthenticated callers, expired JWTs, disabled wheels, and missing DB schema cleanly', async () => {
  const env = createWheelMockEnv({
    appConfig: {
      wheelOfLuck: { ...DEFAULT_WHEEL_OF_LUCK_CONFIG, enabled: false },
    },
  });

  // Unauthenticated
  const unauthRes = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, { id: '', displayName: 'Anon', role: 'anonymous', verifiedByJwt: false }),
    {},
    unauthRes.res,
    { headers: {} }
  );
  assert.equal(unauthRes.getStatus(), 401);

  // Expired JWT
  const jwtRes = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, { id: 'p1', displayName: 'P1', role: 'customer', verifiedByJwt: false, jwtRejected: true }),
    {},
    jwtRes.res,
    { headers: {} }
  );
  assert.equal(jwtRes.getStatus(), 401);
  assert.equal(jwtRes.getBody().code, 'TOKEN_EXPIRED');

  // Disabled wheel
  const disabledRes = createMockRes();
  await handlePostWheelSpin(
    makeDeps(env, { id: 'p1', displayName: 'P1', role: 'customer', verifiedByJwt: true }),
    {},
    disabledRes.res,
    { headers: {} }
  );
  assert.equal(disabledRes.getStatus(), 403);
  assert.equal(disabledRes.getBody().code, 'WHEEL_DISABLED');

  // Missing schema returns 503 explicitly
  const missingSchemaEnv = createWheelMockEnv({ missingWheelSchema: true });
  const schemaRes = createMockRes();
  await handleGetWheelStatus(
    makeDeps(missingSchemaEnv, { id: 'p1', displayName: 'P1', role: 'customer', verifiedByJwt: true }),
    new URL('http://localhost/api/wheel/status'),
    schemaRes.res,
    { headers: {} }
  );
  assert.equal(schemaRes.getStatus(), 503);
  assert.equal(schemaRes.getBody().code, 'WHEEL_SCHEMA_MISSING');
});

test('Admin wheel config endpoint enforces admin role, validates weights, and persists configuration', async () => {
  const env = createWheelMockEnv({
    appConfig: { currency: 'USD' },
  });

  // Non-admin rejected
  const nonAdminRes = createMockRes();
  await handlePostAdminWheelConfig(
    makeDeps(env, { id: 'p1', displayName: 'Player', role: 'customer', verifiedByJwt: true }),
    { wheelOfLuck: DEFAULT_WHEEL_OF_LUCK_CONFIG },
    nonAdminRes.res,
    { headers: {} }
  );
  assert.equal(nonAdminRes.getStatus(), 403);

  // Invalid weights rejected
  const badRes = createMockRes();
  await handlePostAdminWheelConfig(
    makeDeps(env, { id: 'adm_1', displayName: 'Admin', role: 'admin', verifiedByJwt: true }),
    {
      wheelOfLuck: {
        ...DEFAULT_WHEEL_OF_LUCK_CONFIG,
        segments: [
          { id: 'a', label: '$5', rewardAmount: 5, probabilityWeight: 0, color: '#000', enabled: true },
          { id: 'b', label: '$10', rewardAmount: 10, probabilityWeight: 0, color: '#111', enabled: true },
        ],
      },
    },
    badRes.res,
    { headers: {} }
  );
  assert.equal(badRes.getStatus(), 400);

  // Valid update persists and preserves unrelated app_config keys
  const okRes = createMockRes();
  const nextWheel = {
    ...DEFAULT_WHEEL_OF_LUCK_CONFIG,
    enabled: false,
    simulatedWinDisplay: { enabled: true, amount: 500, label: 'VIP Showcase' },
  };
  await handlePostAdminWheelConfig(
    makeDeps(env, { id: 'adm_1', displayName: 'Admin', role: 'admin', verifiedByJwt: true }),
    { wheelOfLuck: nextWheel },
    okRes.res,
    { headers: {} }
  );
  assert.equal(okRes.getStatus(), 200);
  assert.equal(env.db.app_config[0].data.currency, 'USD');
  assert.equal(env.db.app_config[0].data.wheelOfLuck.enabled, false);
  assert.equal(env.db.app_config[0].data.wheelOfLuck.simulatedWinDisplay.amount, 500);
  assert.equal(env.audits[0].action, 'WHEEL_CONFIG_UPDATED');
});

test('Game credit transfer loads free-play into game account and strictly returns free-play on unload before cash', async () => {
  const env = createWheelMockEnv({
    wallets: [
      {
        customer_id: 'player_1',
        balance: 50,
        referral_bonus_balance: 0,
        free_play_balance: 20,
        currency: 'USD',
      },
    ],
    game_accounts: [
      {
        id: 'ga_1',
        customer_id: 'player_1',
        game_id: 'game_fk',
        game_title: 'Fire Kirin',
        username: 'alice_fk',
        status: 'active',
        balance: 0,
        free_play_balance: 0,
      },
    ],
  });

  const playerCaller: WheelCallerProfile = {
    id: 'player_1',
    displayName: 'Alice',
    role: 'customer',
    verifiedByJwt: true,
  };

  // Unauthorized user cannot transfer someone else's account
  const forbiddenRes = createMockRes();
  await handlePostGameCreditTransfer(
    makeDeps(env, { id: 'attacker', displayName: 'Attacker', role: 'customer', verifiedByJwt: true }),
    { gameAccountId: 'ga_1', direction: 'load', source: 'free_play', amount: 10 },
    forbiddenRes.res,
    { headers: {} }
  );
  assert.equal(forbiddenRes.getStatus(), 403);

  // Load $15 free-play
  const loadFpRes = createMockRes();
  await handlePostGameCreditTransfer(
    makeDeps(env, playerCaller),
    { gameAccountId: 'ga_1', direction: 'load', source: 'free_play', amount: 15 },
    loadFpRes.res,
    { headers: {} }
  );
  assert.equal(loadFpRes.getStatus(), 200);
  assert.equal(loadFpRes.getBody().wallet.freePlayBalance, 5);
  assert.equal(loadFpRes.getBody().wallet.availableBalance, 50);
  assert.equal(loadFpRes.getBody().gameAccount.balance, 15);
  assert.equal(loadFpRes.getBody().gameAccount.freePlayBalance, 15);

  // Load $10 wallet cash on top -> total $25 ($15 free-play + $10 cash)
  const loadCashRes = createMockRes();
  await handlePostGameCreditTransfer(
    makeDeps(env, playerCaller),
    { gameAccountId: 'ga_1', direction: 'load', source: 'wallet_cash', amount: 10 },
    loadCashRes.res,
    { headers: {} }
  );
  assert.equal(loadCashRes.getStatus(), 200);
  assert.equal(loadCashRes.getBody().wallet.availableBalance, 40);
  assert.equal(loadCashRes.getBody().gameAccount.balance, 25);
  assert.equal(loadCashRes.getBody().gameAccount.freePlayBalance, 15);

  // Unload $20 -> MUST return $15 strictly to freePlayBalance and ONLY $5 to cash balance!
  const unloadRes = createMockRes();
  await handlePostGameCreditTransfer(
    makeDeps(env, playerCaller),
    { gameAccountId: 'ga_1', direction: 'unload', amount: 20 },
    unloadRes.res,
    { headers: {} }
  );
  assert.equal(unloadRes.getStatus(), 200);
  assert.equal(unloadRes.getBody().freePlayReturn, 15);
  assert.equal(unloadRes.getBody().cashReturn, 5);
  assert.equal(unloadRes.getBody().wallet.freePlayBalance, 20);
  assert.equal(unloadRes.getBody().wallet.availableBalance, 45);
  assert.equal(unloadRes.getBody().gameAccount.balance, 5);
  assert.equal(unloadRes.getBody().gameAccount.freePlayBalance, 0);
  assert.equal(env.db.transactions.length, 3);

  // Loading free_play created 1 staff confirmation message; wallet_cash and unload did NOT create messages
  assert.equal(env.db.messages.length, 1);
  assert.equal(loadFpRes.getBody().staffNotificationDelivered, true);
  assert.equal(loadCashRes.getBody().staffMessage, null);
  assert.equal(unloadRes.getBody().staffMessage, null);
});

test('Referral bonus and Free-Play loads send agent/admin chat & Telegram alerts with amount and game selected (fallback & RPC paths)', async () => {
  const telegramAlerts: string[] = [];
  const env = createWheelMockEnv({
    users: [{ id: 'player_9', display_name: 'Marcus', role: 'customer' }],
    wallets: [
      {
        customer_id: 'player_9',
        balance: 100,
        referral_bonus_balance: 40,
        free_play_balance: 30,
        currency: 'USD',
      },
    ],
    game_accounts: [
      {
        id: 'ga_orion',
        customer_id: 'player_9',
        game_id: 'game_orion',
        game_title: 'Orion Stars',
        username: 'marcus_os',
        status: 'active',
        balance: 0,
        free_play_balance: 0,
      },
      {
        id: 'ga_panda',
        customer_id: 'player_9',
        game_id: 'game_panda',
        game_title: 'Panda Master',
        username: 'marcus_pm',
        status: 'active',
        balance: 0,
        free_play_balance: 0,
      },
    ],
    conversations: [
      {
        id: 'conv_player_9',
        customer_id: 'player_9',
        customer_name: 'Marcus',
        status: 'resolved',
        last_message: 'Old resolved issue',
        last_message_at: '2026-11-18T00:00:00.000Z',
      },
    ],
  });

  const caller: WheelCallerProfile = {
    id: 'player_9',
    displayName: 'Marcus',
    role: 'customer',
    verifiedByJwt: true,
  };

  // 1. Referral Bonus load via fallback path
  const refRes = createMockRes();
  await handlePostGameCreditTransfer(
    makeDeps(env, caller, {
      nowMs: 1_763_500_000_000,
      notifyTelegram: async (_c, text) => {
        telegramAlerts.push(text);
        return true;
      },
    }),
    { gameAccountId: 'ga_orion', direction: 'load', source: 'referral_bonus', amount: 25 },
    refRes.res,
    { headers: {} }
  );

  assert.equal(refRes.getStatus(), 200);
  const refBody = refRes.getBody();
  assert.equal(refBody.staffNotificationDelivered, true);
  assert.equal(refBody.telegramNotified, true);
  assert.ok(refBody.staffMessage);
  assert.equal(refBody.staffMessage.conversation_id, 'conv_player_9');
  assert.equal(refBody.staffMessage.sender_role, 'customer');
  assert.match(refBody.staffMessage.content, /Referral Bonus/);
  assert.match(refBody.staffMessage.content, /\$25\.00/);
  assert.match(refBody.staffMessage.content, /Orion Stars/);
  assert.match(refBody.staffMessage.content, /marcus_os/);

  // Conversation reopened to 'open' and updated with latest message
  assert.equal(env.db.conversations[0].status, 'open');
  assert.match(env.db.conversations[0].last_message, /\$25\.00/);
  assert.equal(telegramAlerts.length, 1);
  assert.match(telegramAlerts[0], /Referral Bonus/);
  assert.match(telegramAlerts[0], /\$25\.00/);
  assert.match(telegramAlerts[0], /Orion Stars/);

  // 2. Free-Play load via atomic PostgreSQL RPC path
  const rpcAdminClient = {
    ...env.adminClient,
    from: env.adminClient.from.bind(env.adminClient),
    async rpc(_fnName: string, params: any) {
      return {
        data: {
          ok: true,
          txId: params.p_tx_id,
          freePlayReturn: 0,
          cashReturn: 0,
          wallet: { availableBalance: 100, referralBonusBalance: 15, freePlayBalance: 12 },
          gameAccount: { id: params.p_game_account_id, balance: 18, freePlayBalance: 18 },
        },
        error: null,
      };
    },
  };

  const fpRpcRes = createMockRes();
  await handlePostGameCreditTransfer(
    {
      adminClient: rpcAdminClient,
      resolveCaller: async () => caller,
      writeAudit: async (_c, input) => env.audits.push(input),
      nowFn: () => 1_763_500_010_000,
      notifyTelegram: async (_c, text) => {
        telegramAlerts.push(text);
        return true;
      },
    },
    { gameAccountId: 'ga_panda', direction: 'load', source: 'free_play', amount: 18 },
    fpRpcRes.res,
    { headers: {} }
  );

  assert.equal(fpRpcRes.getStatus(), 200);
  const fpBody = fpRpcRes.getBody();
  assert.equal(fpBody.staffNotificationDelivered, true);
  assert.equal(fpBody.telegramNotified, true);
  assert.equal(env.db.messages.length, 2);
  assert.match(fpBody.staffMessage.content, /Free-Play/);
  assert.match(fpBody.staffMessage.content, /\$18\.00/);
  assert.match(fpBody.staffMessage.content, /Panda Master/);
  assert.match(fpBody.staffMessage.content, /marcus_pm/);
  assert.equal(telegramAlerts.length, 2);
  assert.match(telegramAlerts[1], /Free-Play/);
  assert.match(telegramAlerts[1], /\$18\.00/);
  assert.match(telegramAlerts[1], /Panda Master/);
});
