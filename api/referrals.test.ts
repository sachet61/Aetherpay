import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetAdminReferralLedger,
  handleGetReferralSummary,
  handlePatchVanityReferralCode,
  handlePostAdminReferralConfig,
  handlePostManualAssignReferral,
  handlePostReferralAttribute,
  handlePostReferralEvaluate,
  handlePostReviewReferral,
  type ReferralCallerProfile,
  type ReferralHandlerDeps,
} from './referralHandlers';

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

function createReferralMockEnv(seed?: {
  users?: any[];
  wallets?: any[];
  topups?: any[];
  awards?: any[];
  appConfig?: any;
}) {
  const db: Record<string, any[]> = {
    users: [...(seed?.users || [])],
    wallets: [...(seed?.wallets || [])],
    topups: [...(seed?.topups || [])],
    referral_awards: [...(seed?.awards || [])],
    transactions: [],
    notifications: [],
    app_config: seed?.appConfig
      ? [{ id: 'main', data: seed.appConfig }]
      : [],
  };

  const audits: any[] = [];

  const applyFilters = (rows: any[], ops: Array<{ type: string; col: string; val: any }>) => {
    return rows.filter((row) => {
      for (const op of ops) {
        const cell = row?.[op.col];
        if (op.type === 'eq' && cell !== op.val) return false;
        if (op.type === 'neq' && cell === op.val) return false;
        if (op.type === 'in' && !(Array.isArray(op.val) && op.val.includes(cell))) return false;
        if (
          op.type === 'ilike' &&
          String(cell || '').toLowerCase() !== String(op.val || '').toLowerCase()
        ) {
          return false;
        }
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
          let result = applyFilters(db[table], ops);
          if (orderCol) {
            result = [...result].sort((a, b) => {
              const va = String(a?.[orderCol!] ?? '');
              const vb = String(b?.[orderCol!] ?? '');
              return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
            });
          }
          return result.slice(0, maxLimit);
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
          ilike(col: string, val: any) {
            ops.push({ type: 'ilike', col, val });
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
            const list = execute();
            return { data: list[0] || null, error: null };
          },
          async single() {
            const list = execute();
            return { data: list[0] || null, error: null };
          },
          then(resolve: any) {
            return resolve({ data: execute(), error: null });
          },
        };
        return q;
      };

      const wrapMutationChain = (rowsAffected: any[]) => ({
        select() {
          return {
            async maybeSingle() {
              return { data: rowsAffected[0] || null, error: null };
            },
            async single() {
              return { data: rowsAffected[0] || null, error: null };
            },
            then(resolve: any) {
              return resolve({ data: rowsAffected, error: null });
            },
          };
        },
        catch() {
          return Promise.resolve({ data: rowsAffected, error: null });
        },
        then(resolve: any) {
          return resolve({ data: rowsAffected, error: null });
        },
      });

      return {
        select() {
          return buildSelectQuery();
        },
        insert(payload: any) {
          const arr = Array.isArray(payload) ? payload : [payload];
          for (const item of arr) {
            db[table].push({ ...item });
          }
          return wrapMutationChain(arr);
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
          return wrapMutationChain(updated);
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
            ilike(col: string, val: any) {
              ops.push({ type: 'ilike', col, val });
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
            catch() {
              runUpdate();
              return Promise.resolve({ error: null });
            },
            then(resolve: any) {
              const rows = runUpdate();
              return resolve({ data: rows, error: null });
            },
          };
          return uq;
        },
      };
    },
  };

  const callerProfiles: Record<string, ReferralCallerProfile> = {
    admin: {
      id: 'usr_admin',
      email: 'admin@swiftsweeps.com',
      displayName: 'Master Admin',
      role: 'admin',
      verifiedByJwt: true,
    },
    agent: {
      id: 'usr_agent',
      email: 'agent@swiftsweeps.com',
      displayName: 'Support Agent',
      role: 'agent',
      verifiedByJwt: true,
    },
    referrer: {
      id: 'usr_ref',
      email: 'ref@example.com',
      displayName: 'Referrer Alice',
      role: 'customer',
      verifiedByJwt: true,
    },
    friend: {
      id: 'usr_friend',
      email: 'friend@example.com',
      displayName: 'Friend Bob',
      role: 'customer',
      verifiedByJwt: true,
    },
  };

  const deps: ReferralHandlerDeps = {
    adminClient,
    resolveCaller: async (_client, ctx) => {
      const tok = String(ctx?.headers?.['x-supabase-token'] || '');
      if (tok === 'expired') {
        return {
          id: '',
          displayName: 'Anonymous',
          role: 'anonymous',
          verifiedByJwt: false,
          jwtRejected: true,
        };
      }
      return (
        callerProfiles[tok] || {
          id: '',
          displayName: 'Anonymous',
          role: 'anonymous',
          verifiedByJwt: false,
        }
      );
    },
    writeAudit: async (_client, input) => {
      audits.push(input);
      return { ok: true };
    },
  };

  return { db, audits, deps };
}

test('manual-assign: agent links unlinked player (link_only and link_and_reward), but cannot overwrite existing referrer', async () => {
  const { db, audits, deps } = createReferralMockEnv({
    users: [
      { id: 'usr_ref', email: 'ref@example.com', display_name: 'Alice', referral_code: 'ALICE77', phone: '+15551110000' },
      { id: 'usr_ref2', email: 'ref2@example.com', display_name: 'Carol', referral_code: 'CAROL88', phone: '+15552220000' },
      { id: 'usr_friend', email: 'friend@example.com', display_name: 'Bob', email_verified: false, phone: '+15553330000' },
    ],
    wallets: [
      { customer_id: 'usr_ref', balance: 10, referral_bonus_balance: 0 },
      { customer_id: 'usr_friend', balance: 0, referral_bonus_balance: 0 },
    ],
  });

  // 1. Agent links unlinked Bob to Alice with link_only -> 200
  const m1 = createMockRes();
  await handlePostManualAssignReferral(
    deps,
    { refereeId: 'usr_friend', referrerQuery: 'ALICE77', mode: 'link_only' },
    m1.res,
    { headers: { 'x-supabase-token': 'agent' } }
  );
  assert.equal(m1.getStatus(), 200);
  assert.equal(m1.getBody().award.status, 'registered');
  assert.equal(db.wallets[0].referral_bonus_balance, 0);

  // 2. Agent attempts overwrite to Carol -> 403
  const m2 = createMockRes();
  await handlePostManualAssignReferral(
    deps,
    { refereeId: 'usr_friend', referrerQuery: 'CAROL88', mode: 'link_only', reason: 'Mistyped' },
    m2.res,
    { headers: { 'x-supabase-token': 'agent' } }
  );
  assert.equal(m2.getStatus(), 403);

  // 3. Admin overwrites without reason -> 400
  const m3 = createMockRes();
  await handlePostManualAssignReferral(
    deps,
    { refereeId: 'usr_friend', referrerQuery: 'CAROL88', mode: 'link_only' },
    m3.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(m3.getStatus(), 400);

  // 4. Admin overwrites with reason and link_and_reward -> 200 + audited + credits referral_bonus_balance
  const m4 = createMockRes();
  await handlePostManualAssignReferral(
    deps,
    { refereeId: 'usr_friend', referrerQuery: 'CAROL88', mode: 'link_and_reward', reason: 'Customer provided VIP promo email' },
    m4.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(m4.getStatus(), 200);
  assert.equal(m4.getBody().status, 'rewarded');
  const carolWallet = db.wallets.find((w) => w.customer_id === 'usr_ref2');
  const bobWallet = db.wallets.find((w) => w.customer_id === 'usr_friend');
  assert.equal(carolWallet.referral_bonus_balance, 25);
  assert.equal(bobWallet.referral_bonus_balance, 10);
  assert.ok(audits.some((a) => a.action === 'REFERRAL_REASSIGNED_AND_REWARDED'));
});

test('vanity-code: admin only, rejects duplicates with 409, updates referred_by links', async () => {
  const { db, deps } = createReferralMockEnv({
    users: [
      { id: 'usr_ref', email: 'ref@example.com', display_name: 'Alice', referral_code: 'OLD_ALICE' },
      { id: 'usr_vip', email: 'vip@example.com', display_name: 'VIP Dan', referral_code: 'VIPDAN' },
      { id: 'usr_friend', email: 'friend@example.com', display_name: 'Bob', referred_by: 'OLD_ALICE' },
    ],
  });

  // Agent blocked (403)
  const agentRes = createMockRes();
  await handlePatchVanityReferralCode(
    deps,
    { userId: 'usr_ref', vanityCode: 'ALICEVIP' },
    agentRes.res,
    { headers: { 'x-supabase-token': 'agent' } }
  );
  assert.equal(agentRes.getStatus(), 403);

  // Conflict check (409)
  const conflictRes = createMockRes();
  await handlePatchVanityReferralCode(
    deps,
    { userId: 'usr_ref', vanityCode: 'vipdan' },
    conflictRes.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(conflictRes.getStatus(), 409);

  // Valid admin vanity code assignment -> 200
  const okRes = createMockRes();
  await handlePatchVanityReferralCode(
    deps,
    { userId: 'usr_ref', vanityCode: 'queen_alice' },
    okRes.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(okRes.getStatus(), 200);
  assert.equal(okRes.getBody().referralCode, 'QUEEN_ALICE');
  assert.equal(db.users.find((u) => u.id === 'usr_friend')?.referred_by, 'QUEEN_ALICE');
});

test('evaluate: skips promotional/referral loads, requires email verification + real deposit, prevents double payout', async () => {
  const { db, deps } = createReferralMockEnv({
    users: [
      { id: 'usr_ref', email: 'ref@example.com', display_name: 'Alice', referral_code: 'ALICE1', phone: '+15551110000' },
      { id: 'usr_friend', email: 'friend@example.com', display_name: 'Bob', referred_by: 'ALICE1', email_verified: false, phone: '+15552220000' },
    ],
    topups: [
      // Promotional bonus topup MUST NOT count as real cash deposit
      { id: 'top_promo', customer_id: 'usr_friend', amount: 100, status: 'completed', payment_method_id: 'referral_bonus' },
    ],
  });

  // 1. Unverified email -> status registered, not qualified
  const r1 = createMockRes();
  await handlePostReferralEvaluate(
    deps,
    { refereeId: 'usr_friend' },
    r1.res,
    { headers: { 'x-supabase-token': 'friend' } }
  );
  assert.equal(r1.getStatus(), 200);
  assert.equal(r1.getBody().qualified, false);
  assert.equal(r1.getBody().status, 'registered');

  // 2. Verify email, still only promo topup -> pending_deposit ($0 real deposit)
  db.users[1].email_verified = true;
  const r2 = createMockRes();
  await handlePostReferralEvaluate(
    deps,
    { refereeId: 'usr_friend' },
    r2.res,
    { headers: { 'x-supabase-token': 'friend' } }
  );
  assert.equal(r2.getBody().qualified, false);
  assert.equal(r2.getBody().status, 'pending_deposit');
  assert.equal(r2.getBody().depositTotal, 0);

  // 3. Approve real CashApp deposit of $100 -> qualified & paid once!
  db.topups.push({ id: 'top_real', customer_id: 'usr_friend', amount: 100, status: 'completed', payment_method_id: 'cashapp' });
  const r3 = createMockRes();
  await handlePostReferralEvaluate(
    deps,
    { refereeId: 'usr_friend' },
    r3.res,
    { headers: { 'x-supabase-token': 'friend' } }
  );
  assert.equal(r3.getStatus(), 200);
  assert.equal(r3.getBody().qualified, true);
  assert.equal(r3.getBody().status, 'rewarded');
  assert.equal(db.wallets.find((w) => w.customer_id === 'usr_ref')?.referral_bonus_balance, 25);
  assert.equal(db.wallets.find((w) => w.customer_id === 'usr_friend')?.referral_bonus_balance, 10);

  // 4. Subsequent deposit / re-evaluation -> idempotent alreadyFinalized (no double payout)
  db.topups.push({ id: 'top_real2', customer_id: 'usr_friend', amount: 50, status: 'completed', payment_method_id: 'crypto' });
  const r4 = createMockRes();
  await handlePostReferralEvaluate(
    deps,
    { refereeId: 'usr_friend' },
    r4.res,
    { headers: { 'x-supabase-token': 'friend' } }
  );
  assert.equal(r4.getBody().alreadyFinalized, true);
  assert.equal(db.wallets.find((w) => w.customer_id === 'usr_ref')?.referral_bonus_balance, 25);
});

test('fraud guard & admin review: blocks self-referral/duplicate phone, holds shared device for admin approve/reject', async () => {
  const { db, deps } = createReferralMockEnv({
    users: [
      { id: 'usr_ref', email: 'ref@example.com', display_name: 'Alice', referral_code: 'ALICE1', phone: '+15551110000', device_fingerprint: 'fp_shared' },
      { id: 'usr_friend', email: 'friend@example.com', display_name: 'Bob', referred_by: 'ALICE1', email_verified: true, phone: '+15559998888', device_fingerprint: 'fp_shared' },
    ],
    topups: [
      { id: 'top_1', customer_id: 'usr_friend', amount: 100, status: 'completed', payment_method_id: 'chime' },
    ],
  });

  // Self-referral blocked on attribute
  const selfRes = createMockRes();
  await handlePostReferralAttribute(
    deps,
    { refereeId: 'usr_ref', referralCode: 'ALICE1' },
    selfRes.res,
    { headers: { 'x-supabase-token': 'referrer' } }
  );
  assert.equal(selfRes.getStatus(), 400);

  // Shared device triggers hold_for_review on evaluate
  const evalRes = createMockRes();
  await handlePostReferralEvaluate(
    deps,
    { refereeId: 'usr_friend' },
    evalRes.res,
    { headers: { 'x-supabase-token': 'friend' } }
  );
  assert.equal(evalRes.getStatus(), 200);
  assert.equal(evalRes.getBody().status, 'held_for_review');
  const awardId = evalRes.getBody().award.id;

  // Agent blocked from approving held award (403)
  const agentApprove = createMockRes();
  await handlePostReviewReferral(
    deps,
    { awardId, decision: 'approve' },
    agentApprove.res,
    { headers: { 'x-supabase-token': 'agent' } }
  );
  assert.equal(agentApprove.getStatus(), 403);

  // Admin approves held award -> 200 + wallet credited
  const adminApprove = createMockRes();
  await handlePostReviewReferral(
    deps,
    { awardId, decision: 'approve', reviewNotes: 'Verified distinct household members' },
    adminApprove.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(adminApprove.getStatus(), 200);
  assert.equal(adminApprove.getBody().status, 'rewarded');
  assert.equal(db.wallets.find((w) => w.customer_id === 'usr_ref')?.referral_bonus_balance, 25);
});

test('caps, admin-config, admin-ledger, and customer summary work end to end', async () => {
  const { db, deps } = createReferralMockEnv({
    users: [
      { id: 'usr_ref', email: 'ref@example.com', display_name: 'Alice', referral_code: 'ALICE1' },
      { id: 'usr_friend', email: 'friend@example.com', display_name: 'Bob', referred_by: 'ALICE1', email_verified: true },
    ],
    topups: [
      { id: 'top_1', customer_id: 'usr_friend', amount: 100, status: 'completed', payment_method_id: 'crypto' },
    ],
    awards: [
      // Already hit maxReferralsPerUser=1 if configured
      {
        id: 'refaw_prev',
        referrer_id: 'usr_ref',
        referee_id: 'usr_prev',
        referral_code_used: 'ALICE1',
        status: 'rewarded',
        referrer_reward_amount: 10,
        referee_reward_amount: 5,
        rewarded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
  });

  // Update config via Admin API to maxReferralsPerUser = 1
  const cfgRes = createMockRes();
  await handlePostAdminReferralConfig(
    deps,
    {
      referralProgram: {
        enabled: true,
        rewardMode: 'percent',
        referrerRewardValue: 20,
        refereeRewardValue: 10,
        qualificationDepositMin: 20,
        payoutTarget: 'available_balance',
        maxReferralsPerUser: 1,
        dailyPayoutCap: 500,
      },
    },
    cfgRes.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(cfgRes.getStatus(), 200);
  assert.equal(cfgRes.getBody().referralProgram.rewardMode, 'percent');

  // Evaluate Bob -> hits maxReferralsPerUser=1 -> capped!
  const evalRes = createMockRes();
  await handlePostReferralEvaluate(
    deps,
    { refereeId: 'usr_friend' },
    evalRes.res,
    { headers: { 'x-supabase-token': 'friend' } }
  );
  assert.equal(evalRes.getStatus(), 200);
  assert.equal(evalRes.getBody().status, 'capped');

  // Admin ledger returns awards + topReferrers leaderboard
  const ledgerRes = createMockRes();
  await handleGetAdminReferralLedger(
    deps,
    new URL('https://localhost/api/referrals/admin-ledger?status=all'),
    ledgerRes.res,
    { headers: { 'x-supabase-token': 'admin' } }
  );
  assert.equal(ledgerRes.getStatus(), 200);
  assert.equal(ledgerRes.getBody().topReferrers[0].referrerId, 'usr_ref');

  // Customer summary returns step-by-step friend rows
  const sumRes = createMockRes();
  await handleGetReferralSummary(
    deps,
    new URL('https://localhost/api/referrals/summary'),
    sumRes.res,
    { headers: { 'x-supabase-token': 'referrer' } }
  );
  assert.equal(sumRes.getStatus(), 200);
  assert.equal(sumRes.getBody().summary.rewardMode, 'percent');
  assert.equal(sumRes.getBody().summary.referredUsers.length, 2);
});
