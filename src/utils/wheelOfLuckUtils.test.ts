import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WHEEL_OF_LUCK_CONFIG,
  ROLLING_SPIN_COOLDOWN_MS,
  buildGameBonusLoadStaffMessage,
  buildLatestSpinCardViewModel,
  buildStickyWheelButtonState,
  buildWheelWinPresentation,
  computeGameCreditUnloadSplit,
  computeSegmentProbabilities,
  computeServerAnchoredRemainingMs,
  computeWheelTargetRotation,
  deriveWheelUiState,
  evaluateWheelEligibility,
  formatCountdownDuration,
  formatWheelHttpError,
  formatWheelSliceLines,
  isHtmlFallbackResponse,
  normalizeWheelConfig,
  selectWeightedWheelSegment,
  validateWheelConfig,
} from './wheelOfLuckUtils.ts';

test('normalizeWheelConfig provides clean defaults and sanitizes malformed values', () => {
  const cfg = normalizeWheelConfig({
    enabled: true,
    segments: [
      { id: 's1', label: '  $5 Bonus ', rewardAmount: -10, probabilityWeight: 5, color: 'not-a-hex', enabled: true },
      { id: 's1', label: '', rewardAmount: 12.345, probabilityWeight: -2, color: '#10B981', enabled: true },
    ],
    simulatedWinDisplay: {
      enabled: true,
      amount: -50,
      label: '',
    },
  });

  assert.equal(cfg.segments.length, 2);
  assert.equal(cfg.segments[0].id, 's1');
  assert.equal(cfg.segments[1].id, 's1_2');
  assert.equal(cfg.segments[0].rewardAmount, 0);
  assert.equal(cfg.segments[1].rewardAmount, 12.35);
  assert.equal(cfg.segments[1].probabilityWeight, 0);
  assert.ok(cfg.segments[0].color.startsWith('#'));
  assert.equal(cfg.simulatedWinDisplay.amount, DEFAULT_WHEEL_OF_LUCK_CONFIG.simulatedWinDisplay.amount);
});

test('validateWheelConfig rejects zero total weight when enabled and invalid segment counts', () => {
  const invalidZeroWeight = validateWheelConfig({
    enabled: true,
    segments: [
      { id: 'a', label: 'A', rewardAmount: 5, probabilityWeight: 0, color: '#111111', enabled: true },
      { id: 'b', label: 'B', rewardAmount: 10, probabilityWeight: 10, color: '#222222', enabled: false },
    ],
  });
  assert.equal(invalidZeroWeight.valid, false);
  assert.ok(invalidZeroWeight.errors.some((e) => e.includes('greater than 0')));

  const validPaused = validateWheelConfig({
    enabled: false,
    segments: [
      { id: 'a', label: 'A', rewardAmount: 5, probabilityWeight: 0, color: '#111111', enabled: true },
      { id: 'b', label: 'B', rewardAmount: 10, probabilityWeight: 0, color: '#222222', enabled: true },
    ],
  });
  assert.equal(validPaused.valid, true);
});

test('selectWeightedWheelSegment skips disabled segments and respects normalized probability weights', () => {
  const segments = [
    { id: 'off', label: 'Off', rewardAmount: 99, probabilityWeight: 1000, color: '#000000', enabled: false },
    { id: 'low', label: '$2', rewardAmount: 2, probabilityWeight: 25, color: '#111111', enabled: true },
    { id: 'high', label: '$10', rewardAmount: 10, probabilityWeight: 75, color: '#222222', enabled: true },
  ];

  const probs = computeSegmentProbabilities(segments);
  assert.equal(probs[0].probabilityPercent, 0);
  assert.equal(probs[1].probabilityPercent, 25);
  assert.equal(probs[2].probabilityPercent, 75);

  const pickStart = selectWeightedWheelSegment(segments, 0.0);
  assert.equal(pickStart?.segment.id, 'low');
  assert.equal(pickStart?.segmentIndexInAll, 1);

  const pickBoundary = selectWeightedWheelSegment(segments, 0.25);
  assert.equal(pickBoundary?.segment.id, 'high');
  assert.equal(pickBoundary?.segmentIndexInAll, 2);

  const pickEnd = selectWeightedWheelSegment(segments, 0.999999);
  assert.equal(pickEnd?.segment.id, 'high');
});

test('evaluateWheelEligibility strictly enforces rolling 24-hour server cooldown', () => {
  const baseNow = Date.parse('2026-11-18T12:00:00.000Z');
  const twentyThreeHoursAgo = new Date(baseNow - 23 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(baseNow - ROLLING_SPIN_COOLDOWN_MS).toISOString();

  const locked = evaluateWheelEligibility({
    config: DEFAULT_WHEEL_OF_LUCK_CONFIG,
    lastSpinAt: twentyThreeHoursAgo,
    serverNowMs: baseNow,
  });
  assert.equal(locked.eligible, false);
  assert.equal(locked.remainingMs, 60 * 60 * 1000);
  assert.equal(formatCountdownDuration(locked.remainingMs), '01h 00m 00s');

  const unlocked = evaluateWheelEligibility({
    config: DEFAULT_WHEEL_OF_LUCK_CONFIG,
    lastSpinAt: twentyFourHoursAgo,
    serverNowMs: baseNow,
  });
  assert.equal(unlocked.eligible, true);
  assert.equal(unlocked.remainingMs, 0);

  const disabled = evaluateWheelEligibility({
    config: { ...DEFAULT_WHEEL_OF_LUCK_CONFIG, enabled: false },
    lastSpinAt: null,
    serverNowMs: baseNow,
  });
  assert.equal(disabled.eligible, false);
});

test('computeWheelTargetRotation lands dead-center under top pointer regardless of prior rotation', () => {
  const count = 8; // 45 deg per slice
  const rot0 = computeWheelTargetRotation({
    currentRotationDeg: 0,
    segmentIndex: 0, // center at 22.5 deg -> target mod 337.5 deg
    segmentCount: count,
    extraSpins: 5,
  });
  assert.equal(rot0 % 360, 337.5);
  assert.ok(rot0 >= 5 * 360);

  const rot1 = computeWheelTargetRotation({
    currentRotationDeg: rot0,
    segmentIndex: 2, // center at 112.5 deg -> target mod 247.5 deg
    segmentCount: count,
    extraSpins: 6,
  });
  assert.equal(rot1 % 360, 247.5);
  assert.ok(rot1 - rot0 >= 6 * 360);
});

test('buildWheelWinPresentation strictly isolates simulated showcase amount from real balance credit', () => {
  const presentation = buildWheelWinPresentation({
    actualRewardAmount: 5,
    simulatedWinEnabled: true,
    simulatedWinAmount: 500,
    simulatedWinLabel: 'Mega Showcase Promo',
  });

  assert.equal(presentation.actualCredit.amount, 5);
  assert.equal(presentation.actualCredit.isRealCredit, true);
  assert.equal(presentation.actualCredit.creditedTo, 'free_play_balance');
  assert.equal(presentation.promotionalDisplay.visible, true);
  assert.equal(presentation.promotionalDisplay.amount, 500);
  assert.equal(presentation.promotionalDisplay.isSimulatedOnly, true);
  assert.equal(presentation.promotionalDisplay.balanceImpact, 0);
});

test('computeGameCreditUnloadSplit returns free-play credits before cashable balance so free play never becomes cash', () => {
  const split = computeGameCreditUnloadSplit({
    totalGameBalance: 45,
    trackedFreePlayBalance: 15,
    requestedAmount: 25,
  });

  assert.equal(split.valid, true);
  assert.equal(split.freePlayReturn, 15);
  assert.equal(split.cashReturn, 10);
  assert.equal(split.nextGameBalance, 20);
  assert.equal(split.nextGameFreePlayBalance, 0);

  const partialFreePlay = computeGameCreditUnloadSplit({
    totalGameBalance: 45,
    trackedFreePlayBalance: 15,
    requestedAmount: 10,
  });
  assert.equal(partialFreePlay.valid, true);
  assert.equal(partialFreePlay.freePlayReturn, 10);
  assert.equal(partialFreePlay.cashReturn, 0);
  assert.equal(partialFreePlay.nextGameBalance, 35);
  assert.equal(partialFreePlay.nextGameFreePlayBalance, 5);
});

test('computeServerAnchoredRemainingMs ignores client clock skew and counts down purely from server remainingMs', () => {
  const fetchedAtClientMs = 1_000_000;
  const eligibility = {
    enabled: true,
    eligible: false,
    remainingMs: 30_000,
    lastSpinAt: '2026-11-17T12:00:00.000Z',
    nextEligibleAt: '2099-01-01T00:00:00.000Z', // deliberately far from client clock to simulate skew
    serverNow: '2026-11-18T12:00:00.000Z',
  };

  assert.equal(
    computeServerAnchoredRemainingMs({ eligibility, fetchedAtClientMs, nowMs: fetchedAtClientMs + 5_000 }),
    25_000
  );
  assert.equal(
    computeServerAnchoredRemainingMs({ eligibility, fetchedAtClientMs, nowMs: fetchedAtClientMs + 35_000 }),
    0
  );
  assert.equal(
    computeServerAnchoredRemainingMs({
      eligibility: { ...eligibility, eligible: true },
      fetchedAtClientMs,
      nowMs: fetchedAtClientMs + 1_000,
    }),
    0
  );
});

test('deriveWheelUiState prevents 00h 00m 00s cooldown display and enforces spin eligibility guards', () => {
  const baseServerNow = '2026-11-18T12:00:00.000Z';

  assert.deepEqual(
    deriveWheelUiState({
      enabled: true,
      isLoading: true,
      hasStatus: false,
      statusError: null,
      isSpinning: false,
      eligibility: null,
      remainingMs: 0,
    }),
    { uiState: 'loading', canSpin: false, showCountdown: false }
  );

  assert.deepEqual(
    deriveWheelUiState({
      enabled: true,
      isLoading: false,
      hasStatus: false,
      statusError: 'Failed to load Wheel of Luck status',
      isSpinning: false,
      eligibility: null,
      remainingMs: 0,
    }),
    { uiState: 'error', canSpin: false, showCountdown: false }
  );

  // Even if remainingMs is 0 while ineligible, showCountdown MUST remain false (never 00h 00m 00s)
  assert.deepEqual(
    deriveWheelUiState({
      enabled: true,
      isLoading: false,
      hasStatus: true,
      statusError: null,
      isSpinning: false,
      eligibility: {
        enabled: true,
        eligible: false,
        remainingMs: 0,
        lastSpinAt: '2026-11-17T12:00:00.000Z',
        nextEligibleAt: '2026-11-18T12:00:00.000Z',
        serverNow: baseServerNow,
      },
      remainingMs: 0,
    }),
    { uiState: 'unavailable', canSpin: false, showCountdown: false }
  );

  assert.deepEqual(
    deriveWheelUiState({
      enabled: true,
      isLoading: false,
      hasStatus: true,
      statusError: null,
      isSpinning: false,
      eligibility: {
        enabled: true,
        eligible: false,
        remainingMs: 120_000,
        lastSpinAt: '2026-11-17T12:02:00.000Z',
        nextEligibleAt: '2026-11-18T12:02:00.000Z',
        serverNow: baseServerNow,
      },
      remainingMs: 120_000,
    }),
    { uiState: 'cooldown', canSpin: false, showCountdown: true }
  );

  assert.deepEqual(
    deriveWheelUiState({
      enabled: true,
      isLoading: false,
      hasStatus: true,
      statusError: null,
      isSpinning: false,
      eligibility: {
        enabled: true,
        eligible: true,
        remainingMs: 0,
        lastSpinAt: null,
        nextEligibleAt: null,
        serverNow: baseServerNow,
      },
      remainingMs: 0,
    }),
    { uiState: 'eligible', canSpin: true, showCountdown: false }
  );
});

test('formatWheelSliceLines formats currency rewards and zero-reward labels cleanly', () => {
  assert.deepEqual(formatWheelSliceLines({ label: '$50 Grand Play', rewardAmount: 50 }), {
    primary: '$50',
    secondary: 'Grand Play',
  });
  assert.deepEqual(formatWheelSliceLines({ label: '$2.50 Free Play', rewardAmount: 2.5 }), {
    primary: '$2.50',
    secondary: 'Free Play',
  });
  assert.deepEqual(formatWheelSliceLines({ label: 'Try Again', rewardAmount: 0 }), {
    primary: 'Try Again',
    secondary: 'Next Spin',
  });
});

test('isHtmlFallbackResponse and formatWheelHttpError surface backend and non-JSON errors concisely', () => {
  assert.equal(
    isHtmlFallbackResponse({ contentType: 'text/html; charset=utf-8', rawText: '<!doctype html><html></html>' }),
    true
  );
  assert.equal(
    isHtmlFallbackResponse({ contentType: 'application/json', rawText: '{"eligibility":{"eligible":true}}' }),
    false
  );

  // Never masks real backend JSON errors
  assert.equal(
    formatWheelHttpError({
      actionLabel: 'Wheel of Luck status',
      status: 503,
      json: { error: 'Wheel of Luck database schema is pending migration.' },
    }),
    'Wheel of Luck database schema is pending migration.'
  );

  // Safely formats HTML gateway/SPA responses without dumping raw HTML
  assert.match(
    formatWheelHttpError({
      actionLabel: 'Wheel of Luck status',
      status: 200,
      json: null,
      contentType: 'text/html',
      rawText: '<!DOCTYPE html><html><body>SPA Shell</body></html>',
    }),
    /HTML instead of JSON \(200\)/
  );

  // Surfaces concise plain-text server errors cleanly
  assert.equal(
    formatWheelHttpError({
      actionLabel: 'Wheel of Luck status',
      status: 502,
      json: null,
      contentType: 'text/plain',
      rawText: 'Bad Gateway from upstream edge node',
    }),
    'Wheel of Luck status failed (HTTP 502): Bad Gateway from upstream edge node'
  );
});

test('buildLatestSpinCardViewModel structures actual reward, reward type, simulated label, and timestamp cleanly', () => {
  const zeroSpinVm = buildLatestSpinCardViewModel({
    spin: {
      segmentLabel: 'Try Again',
      rewardAmount: 0,
      simulatedWinAmount: 250,
      createdAt: '2026-11-19T13:48:18.000Z',
    },
  });

  assert.equal(zeroSpinVm.outcomeHeadline, 'Landed on Try Again');
  assert.equal(zeroSpinVm.actualRewardAmount, 0);
  assert.equal(zeroSpinVm.isWinningSpin, false);
  assert.equal(zeroSpinVm.rewardTypeLabel, 'Free-Play Credits (Non-Cashable)');
  assert.equal(zeroSpinVm.showSimulatedDisplay, true);
  assert.equal(zeroSpinVm.simulatedDisplayAmount, 250);
  assert.equal(zeroSpinVm.simulatedBadgeLabel, 'SIMULATED — NOT CREDITED');
  assert.equal(zeroSpinVm.createdAt, '2026-11-19T13:48:18.000Z');

  const winSpinVm = buildLatestSpinCardViewModel({
    spin: {
      segmentLabel: '$15 Free Play',
      rewardAmount: 15,
      simulatedWinAmount: 0,
      createdAt: '2026-11-19T14:00:00.000Z',
    },
    simulatedWinDisplay: {
      enabled: false,
      amount: 500,
    },
  });

  assert.equal(winSpinVm.outcomeHeadline, 'Won: $15 Free Play');
  assert.equal(winSpinVm.actualRewardAmount, 15);
  assert.equal(winSpinVm.isWinningSpin, true);
  assert.match(winSpinVm.creditStatusLabel, /\+\$15\.00/);
  assert.equal(winSpinVm.showSimulatedDisplay, false);
  assert.equal(winSpinVm.simulatedDisplayAmount, 0);
});

test('buildGameBonusLoadStaffMessage formats agent/admin confirmation messages only for free_play and referral_bonus loads', () => {
  const fpMsg = buildGameBonusLoadStaffMessage({
    direction: 'load',
    source: 'free_play',
    amount: 15,
    customerId: 'cust_1',
    customerName: 'Alice',
    gameTitle: 'Fire Kirin',
    gameUsername: 'alice_fk',
    txId: 'tx_100',
    createdAt: '2026-11-19T12:00:00.000Z',
  });
  assert.ok(fpMsg);
  assert.equal(fpMsg.id, 'msg_gload_tx_100');
  assert.equal(fpMsg.conversationId, 'conv_cust_1');
  assert.equal(fpMsg.sourceLabel, 'Free-Play');
  assert.match(fpMsg.content, /\$15\.00/);
  assert.match(fpMsg.content, /Fire Kirin/);
  assert.match(fpMsg.content, /alice_fk/);
  assert.match(fpMsg.telegramText, /Free-Play/);
  assert.match(fpMsg.telegramText, /Fire Kirin/);

  const refMsg = buildGameBonusLoadStaffMessage({
    direction: 'load',
    source: 'referral_bonus',
    amount: 25.5,
    customerId: 'cust_2',
    customerName: 'Bob',
    gameTitle: 'Orion Stars',
    gameUsername: 'bob_os',
    txId: 'tx_200',
  });
  assert.ok(refMsg);
  assert.equal(refMsg.id, 'msg_gload_tx_200');
  assert.equal(refMsg.sourceLabel, 'Referral Bonus');
  assert.match(refMsg.content, /\$25\.50/);
  assert.match(refMsg.content, /Orion Stars/);
  assert.match(refMsg.content, /Referral Bonus/);

  assert.equal(
    buildGameBonusLoadStaffMessage({
      direction: 'load',
      source: 'wallet_cash',
      amount: 50,
      customerId: 'cust_1',
      gameTitle: 'Fire Kirin',
      txId: 'tx_300',
    }),
    null
  );
  assert.equal(
    buildGameBonusLoadStaffMessage({
      direction: 'unload',
      source: 'free_play',
      amount: 15,
      customerId: 'cust_1',
      gameTitle: 'Fire Kirin',
      txId: 'tx_400',
    }),
    null
  );
});

test('buildStickyWheelButtonState keeps button visible in ready and cooldown states with accessible labels', () => {
  const ready = buildStickyWheelButtonState({
    enabled: true,
    uiState: 'eligible',
    remainingMs: 0,
  });
  assert.equal(ready.visible, true);
  assert.equal(ready.state, 'ready');
  assert.equal(ready.tooltipLabel, 'Daily Wheel');
  assert.equal(ready.badgeText, '1');
  assert.match(ready.ariaLabel, /Daily Wheel.*Spin ready/);

  const cooldown = buildStickyWheelButtonState({
    enabled: true,
    uiState: 'cooldown',
    remainingMs: 3661_000,
  });
  assert.equal(cooldown.visible, true);
  assert.equal(cooldown.state, 'cooldown');
  assert.equal(cooldown.badgeText, '');
  assert.equal(cooldown.cooldownText, '01h 01m 01s');
  assert.match(cooldown.ariaLabel, /Daily Wheel.*01h 01m 01s/);

  const errState = buildStickyWheelButtonState({
    enabled: true,
    uiState: 'error',
    remainingMs: 0,
  });
  assert.equal(errState.visible, true);
  assert.equal(errState.state, 'error');
  assert.equal(errState.badgeText, '!');

  const disabled = buildStickyWheelButtonState({
    enabled: false,
    uiState: 'disabled',
    remainingMs: 0,
  });
  assert.equal(disabled.visible, false);
});

