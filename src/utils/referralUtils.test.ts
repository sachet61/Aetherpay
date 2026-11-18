import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReferralPayouts,
  checkReferralBudgetCaps,
  computeTopReferrers,
  evaluateReferralFraudSignals,
  isRealCashTopUpRow,
  isValidVanityReferralCode,
  normalizeReferralCodeInput,
  normalizeReferralConfig,
} from './referralUtils';

test('normalizeReferralConfig migrates legacy config cleanly with safe defaults', () => {
  const cfg = normalizeReferralConfig({
    enabled: true,
    rewardPerReferral: 35,
    qualificationDepositMin: 75,
  });

  assert.equal(cfg.enabled, true);
  assert.equal(cfg.rewardMode, 'flat');
  assert.equal(cfg.referrerRewardValue, 35);
  assert.equal(cfg.refereeRewardValue, 10);
  assert.equal(cfg.qualificationDepositMin, 75);
  assert.equal(cfg.payoutTarget, 'referral_bonus');
  assert.equal(cfg.blockSelfReferral, true);
  assert.equal(cfg.holdFlaggedForReview, true);
});

test('calculateReferralPayouts computes flat and percent two-sided bonuses accurately', () => {
  const flatPayout = calculateReferralPayouts(
    { rewardMode: 'flat', referrerRewardValue: 25, refereeRewardValue: 15 },
    200
  );
  assert.deepEqual(flatPayout, {
    referrerAmount: 25,
    refereeAmount: 15,
    totalAmount: 40,
  });

  const pctPayout = calculateReferralPayouts(
    { rewardMode: 'percent', referrerRewardValue: 12.5, refereeRewardValue: 5 },
    150
  );
  assert.deepEqual(pctPayout, {
    referrerAmount: 18.75,
    refereeAmount: 7.5,
    totalAmount: 26.25,
  });
});

test('isRealCashTopUpRow includes completed real deposits and excludes bonus/promo loads', () => {
  assert.equal(
    isRealCashTopUpRow({ status: 'completed', payment_method_id: 'cashapp', amount: 100 }),
    true
  );
  assert.equal(
    isRealCashTopUpRow({ status: 'approved', payment_method_id: 'crypto', amount: 50 }),
    true
  );
  assert.equal(
    isRealCashTopUpRow({ status: 'submitted', payment_method_id: 'cashapp', amount: 100 }),
    false
  );
  assert.equal(
    isRealCashTopUpRow({ status: 'completed', funding_source: 'referral_bonus', amount: 100 }),
    false
  );
  assert.equal(
    isRealCashTopUpRow({ status: 'completed', payment_method_id: 'referral_bonus', amount: 100 }),
    false
  );
});

test('evaluateReferralFraudSignals blocks self-referral & duplicate phone/email and holds shared IP/device', () => {
  const selfBlocked = evaluateReferralFraudSignals({
    referrer: { id: 'u1', email: 'a@example.com' },
    referee: { id: 'u1', email: 'a@example.com' },
  });
  assert.equal(selfBlocked.blocked, true);
  assert.equal(selfBlocked.blockCode, 'SELF_REFERRAL_BLOCKED');

  const phoneBlocked = evaluateReferralFraudSignals({
    referrer: { id: 'u1', email: 'a@example.com', phone: '+1 (555) 123-4567' },
    referee: { id: 'u2', email: 'b@example.com', phone: '5551234567' },
  });
  assert.equal(phoneBlocked.blocked, true);
  assert.equal(phoneBlocked.blockCode, 'DUPLICATE_CONTACT_BLOCKED');

  const held = evaluateReferralFraudSignals({
    referrer: {
      id: 'u1',
      email: 'a@example.com',
      signupIp: '203.0.113.10',
      deviceFingerprint: 'fp_abc',
    },
    referee: {
      id: 'u2',
      email: 'b@example.com',
      signupIp: '203.0.113.10',
      deviceFingerprint: 'fp_abc',
    },
  });
  assert.equal(held.blocked, false);
  assert.deepEqual(held.fraudFlags, ['shared_ip', 'shared_device']);
  assert.equal(held.shouldHold, true);
});

test('checkReferralBudgetCaps enforces max referrals per user and daily platform payout cap', () => {
  const capPerUser = checkReferralBudgetCaps({
    config: { maxReferralsPerUser: 3, dailyPayoutCap: 500 },
    referrerRewardedCount: 3,
    dailyTotalPaidToday: 100,
    payoutTotal: 35,
  });
  assert.equal(capPerUser.allowed, false);

  const capDaily = checkReferralBudgetCaps({
    config: { maxReferralsPerUser: 10, dailyPayoutCap: 100 },
    referrerRewardedCount: 1,
    dailyTotalPaidToday: 80,
    payoutTotal: 35,
  });
  assert.equal(capDaily.allowed, false);

  const ok = checkReferralBudgetCaps({
    config: { maxReferralsPerUser: 10, dailyPayoutCap: 500 },
    referrerRewardedCount: 2,
    dailyTotalPaidToday: 80,
    payoutTotal: 35,
  });
  assert.equal(ok.allowed, true);
});

test('vanity code normalization and validation enforce uppercase format', () => {
  assert.equal(normalizeReferralCodeInput('  vip_king 99 '), 'VIP_KING99');
  assert.equal(isValidVanityReferralCode('VIP_KING99'), true);
  assert.equal(isValidVanityReferralCode('AB'), false);
  assert.equal(isValidVanityReferralCode('BAD CODE!'), false);
});

test('computeTopReferrers ranks by qualified count then total referrer payout', () => {
  const leaderboard = computeTopReferrers([
    {
      id: 'ra1',
      referrerId: 'u1',
      referrerName: 'Alice',
      refereeId: 'r1',
      referralCodeUsed: 'ALICE',
      source: 'signup_link',
      rewardMode: 'flat',
      payoutTarget: 'referral_bonus',
      referrerRewardAmount: 25,
      refereeRewardAmount: 10,
      qualifyingDepositAmount: 100,
      status: 'rewarded',
      fraudFlags: [],
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'ra2',
      referrerId: 'u2',
      referrerName: 'Bob',
      refereeId: 'r2',
      referralCodeUsed: 'BOB',
      source: 'signup_link',
      rewardMode: 'flat',
      payoutTarget: 'referral_bonus',
      referrerRewardAmount: 40,
      refereeRewardAmount: 10,
      qualifyingDepositAmount: 120,
      status: 'rewarded',
      fraudFlags: [],
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ]);

  assert.equal(leaderboard.length, 2);
  assert.equal(leaderboard[0].referrerId, 'u2');
  assert.equal(leaderboard[0].totalReferrerPaid, 40);
});
