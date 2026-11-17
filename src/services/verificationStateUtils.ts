export const VERIFICATION_GRACE_DELAY_MS = 450;
export const VERIFICATION_MAX_CHECK_WAIT_MS = 2500;
export const VERIFIED_EMAIL_CACHE_KEY = 'aetherpay_verified_email_cache_v1';

export type VerificationPhase = 'verified' | 'checking' | 'unverified';

export interface VerificationUiState {
  phase: VerificationPhase;
  isVerified: boolean;
  shouldLoadBannerChunk: boolean;
  showBanner: boolean;
  showProfileUnverifiedAlert: boolean;
  showCashoutWarning: boolean;
  showCashoutButtonSpinner: boolean;
}

export interface StorageReader {
  getItem: (key: string) => string | null;
}

export interface StorageWriter extends StorageReader {
  setItem: (key: string, value: string) => void;
}

export function normalizeEmailKey(email?: string): string {
  return (email || '').trim().toLowerCase();
}

export function mergeVerifiedStatus(params: {
  authConfirmed?: boolean;
  dbVerified?: boolean;
  existingVerified?: boolean;
  cachedVerified?: boolean;
}): boolean {
  return Boolean(
    params.authConfirmed ||
      params.dbVerified ||
      params.existingVerified ||
      params.cachedVerified
  );
}

function getDefaultStorage(): StorageWriter | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseCacheMap(storage?: StorageReader | null): Record<string, true> {
  const targetStorage = storage === undefined ? getDefaultStorage() : storage;
  if (!targetStorage) return {};
  try {
    const raw = targetStorage.getItem(VERIFIED_EMAIL_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const clean: Record<string, true> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (val === true && typeof key === 'string' && key.trim().length > 0) {
        clean[key] = true;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function readVerifiedCache(
  userId?: string,
  email?: string,
  storage?: StorageReader | null
): boolean {
  const cache = parseCacheMap(storage);
  if (userId && cache[`id:${userId}`] === true) {
    return true;
  }
  const emailKey = normalizeEmailKey(email);
  if (emailKey && cache[`email:${emailKey}`] === true) {
    return true;
  }
  return false;
}

export function writeVerifiedCache(
  userId?: string,
  email?: string,
  verified: boolean = true,
  storage?: StorageWriter | null
): void {
  const targetStorage = storage === undefined ? getDefaultStorage() : storage;
  if (!targetStorage) return;

  const cache = parseCacheMap(targetStorage);
  const emailKey = normalizeEmailKey(email);

  if (verified) {
    if (userId) cache[`id:${userId}`] = true;
    if (emailKey) cache[`email:${emailKey}`] = true;
  } else {
    if (userId) delete cache[`id:${userId}`];
    if (emailKey) delete cache[`email:${emailKey}`];
  }

  try {
    targetStorage.setItem(VERIFIED_EMAIL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota / privacy mode write errors
  }
}

export function deriveVerificationUiState(params: {
  role?: string;
  emailVerified?: boolean;
  isCachedVerified: boolean;
  isChecking: boolean;
  graceElapsed: boolean;
}): VerificationUiState {
  // Non-customer staff accounts never trigger player verification prompts
  if (params.role && params.role !== 'customer') {
    return {
      phase: 'verified',
      isVerified: true,
      shouldLoadBannerChunk: false,
      showBanner: false,
      showProfileUnverifiedAlert: false,
      showCashoutWarning: false,
      showCashoutButtonSpinner: false,
    };
  }

  // Confirmed or cached verified customers resolve immediately with zero banner chunk loading
  if (params.emailVerified || params.isCachedVerified) {
    return {
      phase: 'verified',
      isVerified: true,
      shouldLoadBannerChunk: false,
      showBanner: false,
      showProfileUnverifiedAlert: false,
      showCashoutWarning: false,
      showCashoutButtonSpinner: false,
    };
  }

  // Within the brief grace delay or active verification check:
  // Suppress Banner (do not load chunk), suppress Profile alert/buttons, show spinner on Cashout button only
  if (params.isChecking || !params.graceElapsed) {
    return {
      phase: 'checking',
      isVerified: false,
      shouldLoadBannerChunk: false,
      showBanner: false,
      showProfileUnverifiedAlert: false,
      showCashoutWarning: false,
      showCashoutButtonSpinner: true,
    };
  }

  // Settled & still unverified: mount lazy banner and reveal unverified UI affordances
  return {
    phase: 'unverified',
    isVerified: false,
    shouldLoadBannerChunk: true,
    showBanner: true,
    showProfileUnverifiedAlert: true,
    showCashoutWarning: true,
    showCashoutButtonSpinner: false,
  };
}
