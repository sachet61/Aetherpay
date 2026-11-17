import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveVerificationUiState,
  mergeVerifiedStatus,
  readVerifiedCache,
  writeVerifiedCache,
} from './verificationStateUtils';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

test('mergeVerifiedStatus never downgrades Auth-confirmed or cached status when DB lags', () => {
  assert.equal(
    mergeVerifiedStatus({
      authConfirmed: true,
      dbVerified: false,
      existingVerified: false,
      cachedVerified: false,
    }),
    true
  );

  assert.equal(
    mergeVerifiedStatus({
      authConfirmed: false,
      dbVerified: false,
      existingVerified: true,
      cachedVerified: false,
    }),
    true
  );

  assert.equal(
    mergeVerifiedStatus({
      authConfirmed: false,
      dbVerified: false,
      existingVerified: false,
      cachedVerified: true,
    }),
    true
  );

  assert.equal(
    mergeVerifiedStatus({
      authConfirmed: false,
      dbVerified: false,
      existingVerified: false,
      cachedVerified: false,
    }),
    false
  );
});

test('verified status cache isolates users and clears cleanly when unverified', () => {
  const storage = createMemoryStorage();

  assert.equal(readVerifiedCache('usr_1', 'Alice@Example.com', storage), false);

  writeVerifiedCache('usr_1', 'Alice@Example.com', true, storage);
  assert.equal(readVerifiedCache('usr_1', 'alice@example.com', storage), true);
  assert.equal(readVerifiedCache(undefined, 'ALICE@example.com', storage), true);
  assert.equal(readVerifiedCache('usr_2', 'bob@example.com', storage), false);

  writeVerifiedCache('usr_1', 'alice@example.com', false, storage);
  assert.equal(readVerifiedCache('usr_1', 'alice@example.com', storage), false);
});

test('deriveVerificationUiState keeps banner chunk unloaded and avoids flash for cached/verified customers', () => {
  const verifiedState = deriveVerificationUiState({
    role: 'customer',
    emailVerified: true,
    isCachedVerified: false,
    isChecking: false,
    graceElapsed: false,
  });

  assert.equal(verifiedState.phase, 'verified');
  assert.equal(verifiedState.isVerified, true);
  assert.equal(verifiedState.shouldLoadBannerChunk, false);
  assert.equal(verifiedState.showBanner, false);
  assert.equal(verifiedState.showProfileUnverifiedAlert, false);
  assert.equal(verifiedState.showCashoutWarning, false);
  assert.equal(verifiedState.showCashoutButtonSpinner, false);

  const cachedState = deriveVerificationUiState({
    role: 'customer',
    emailVerified: false,
    isCachedVerified: true,
    isChecking: true,
    graceElapsed: false,
  });

  assert.equal(cachedState.phase, 'verified');
  assert.equal(cachedState.isVerified, true);
  assert.equal(cachedState.shouldLoadBannerChunk, false);
  assert.equal(cachedState.showCashoutButtonSpinner, false);
});

test('deriveVerificationUiState suppresses banner and profile alerts during checking grace window while showing cashout button spinner only', () => {
  const checkingWithinGrace = deriveVerificationUiState({
    role: 'customer',
    emailVerified: false,
    isCachedVerified: false,
    isChecking: true,
    graceElapsed: false,
  });

  assert.equal(checkingWithinGrace.phase, 'checking');
  assert.equal(checkingWithinGrace.isVerified, false);
  assert.equal(checkingWithinGrace.shouldLoadBannerChunk, false);
  assert.equal(checkingWithinGrace.showBanner, false);
  assert.equal(checkingWithinGrace.showProfileUnverifiedAlert, false);
  assert.equal(checkingWithinGrace.showCashoutWarning, false);
  assert.equal(checkingWithinGrace.showCashoutButtonSpinner, true);

  // Even if background check finishes early before grace delay expires, hold banner/alerts silently
  const fastCheckBeforeGrace = deriveVerificationUiState({
    role: 'customer',
    emailVerified: false,
    isCachedVerified: false,
    isChecking: false,
    graceElapsed: false,
  });

  assert.equal(fastCheckBeforeGrace.phase, 'checking');
  assert.equal(fastCheckBeforeGrace.shouldLoadBannerChunk, false);
  assert.equal(fastCheckBeforeGrace.showProfileUnverifiedAlert, false);
  assert.equal(fastCheckBeforeGrace.showCashoutButtonSpinner, true);
});

test('deriveVerificationUiState reveals lazy banner and unverified controls only after check and grace delay settle', () => {
  const settledUnverified = deriveVerificationUiState({
    role: 'customer',
    emailVerified: false,
    isCachedVerified: false,
    isChecking: false,
    graceElapsed: true,
  });

  assert.equal(settledUnverified.phase, 'unverified');
  assert.equal(settledUnverified.isVerified, false);
  assert.equal(settledUnverified.shouldLoadBannerChunk, true);
  assert.equal(settledUnverified.showBanner, true);
  assert.equal(settledUnverified.showProfileUnverifiedAlert, true);
  assert.equal(settledUnverified.showCashoutWarning, true);
  assert.equal(settledUnverified.showCashoutButtonSpinner, false);
});

test('deriveVerificationUiState bypasses verification alerts for staff accounts', () => {
  const adminState = deriveVerificationUiState({
    role: 'admin',
    emailVerified: false,
    isCachedVerified: false,
    isChecking: true,
    graceElapsed: false,
  });

  assert.equal(adminState.phase, 'verified');
  assert.equal(adminState.isVerified, true);
  assert.equal(adminState.shouldLoadBannerChunk, false);
  assert.equal(adminState.showCashoutButtonSpinner, false);
});
