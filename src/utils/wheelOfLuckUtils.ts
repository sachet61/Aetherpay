import type {
  WheelEligibilityState,
  WheelOfLuckConfig,
  WheelSegment,
} from '../types';

export const ROLLING_SPIN_COOLDOWN_HOURS = 24;
export const ROLLING_SPIN_COOLDOWN_MS = ROLLING_SPIN_COOLDOWN_HOURS * 60 * 60 * 1000;

export const WHEEL_COLOR_PALETTE = [
  '#1E293B', // Slate dark
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#0284C7', // Sky
  '#7C3AED', // Violet
  '#B45309', // Deep Gold
  '#0F766E', // Teal
];

export const DEFAULT_WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 'seg_try_again',
    label: 'Try Again',
    rewardAmount: 0,
    probabilityWeight: 25,
    color: '#1E293B',
    enabled: true,
  },
  {
    id: 'seg_fp_2',
    label: '$2 Free Play',
    rewardAmount: 2,
    probabilityWeight: 25,
    color: '#4F46E5',
    enabled: true,
  },
  {
    id: 'seg_fp_5',
    label: '$5 Free Play',
    rewardAmount: 5,
    probabilityWeight: 20,
    color: '#059669',
    enabled: true,
  },
  {
    id: 'seg_fp_10',
    label: '$10 Free Play',
    rewardAmount: 10,
    probabilityWeight: 14,
    color: '#D97706',
    enabled: true,
  },
  {
    id: 'seg_fp_15',
    label: '$15 Free Play',
    rewardAmount: 15,
    probabilityWeight: 8,
    color: '#0284C7',
    enabled: true,
  },
  {
    id: 'seg_fp_20',
    label: '$20 Free Play',
    rewardAmount: 20,
    probabilityWeight: 5,
    color: '#7C3AED',
    enabled: true,
  },
  {
    id: 'seg_fp_25',
    label: '$25 Free Play',
    rewardAmount: 25,
    probabilityWeight: 2,
    color: '#0F766E',
    enabled: true,
  },
  {
    id: 'seg_fp_50',
    label: '$50 Grand Play',
    rewardAmount: 50,
    probabilityWeight: 1,
    color: '#B45309',
    enabled: true,
  },
];

export const DEFAULT_WHEEL_OF_LUCK_CONFIG: WheelOfLuckConfig = {
  enabled: true,
  title: 'Daily Wheel of Luck',
  subtitle: 'Try your luck for instant Freeplay',
  segments: DEFAULT_WHEEL_SEGMENTS.map((s) => ({ ...s })),
  simulatedWinDisplay: {
    enabled: true,
    amount: 250,
    label: 'Featured Showcase Prize (Simulated Demo)',
  },
};

function roundCurrency(val: unknown, fallback: number = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Number(Math.min(100000, n).toFixed(2));
}

function roundWeight(val: unknown, fallback: number = 0): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Number(Math.min(100000, n).toFixed(4));
}

export function normalizeWheelConfig(raw?: any): WheelOfLuckConfig {
  const src = raw && typeof raw === 'object' ? raw : {};

  const rawSegments = Array.isArray(src.segments) && src.segments.length > 0
    ? src.segments.slice(0, 16)
    : DEFAULT_WHEEL_SEGMENTS;

  const seenIds = new Set<string>();
  const segments: WheelSegment[] = rawSegments.map((item: any, idx: number) => {
    const baseId =
      typeof item?.id === 'string' && item.id.trim()
        ? item.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)
        : `seg_${idx + 1}`;
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${baseId}_${suffix++}`;
    }
    seenIds.add(id);

    const rewardAmount = roundCurrency(item?.rewardAmount, 0);
    const defaultLabel = rewardAmount > 0 ? `$${rewardAmount} Free Play` : 'Try Again';
    const label =
      typeof item?.label === 'string' && item.label.trim()
        ? item.label.trim().slice(0, 40)
        : defaultLabel;
    const color =
      typeof item?.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(item.color.trim())
        ? item.color.trim()
        : WHEEL_COLOR_PALETTE[idx % WHEEL_COLOR_PALETTE.length];

    return {
      id,
      label,
      rewardAmount,
      probabilityWeight: roundWeight(item?.probabilityWeight, 0),
      color,
      enabled: item?.enabled !== false,
    };
  });

  const simRaw = src.simulatedWinDisplay && typeof src.simulatedWinDisplay === 'object'
    ? src.simulatedWinDisplay
    : {};

  const simulatedWinDisplay = {
    enabled: simRaw.enabled !== false,
    amount: roundCurrency(
      simRaw.amount !== undefined ? simRaw.amount : DEFAULT_WHEEL_OF_LUCK_CONFIG.simulatedWinDisplay.amount,
      DEFAULT_WHEEL_OF_LUCK_CONFIG.simulatedWinDisplay.amount
    ),
    label:
      typeof simRaw.label === 'string' && simRaw.label.trim()
        ? simRaw.label.trim().slice(0, 80)
        : DEFAULT_WHEEL_OF_LUCK_CONFIG.simulatedWinDisplay.label,
  };

  return {
    enabled: src.enabled !== false,
    title:
      typeof src.title === 'string' && src.title.trim()
        ? src.title.trim().slice(0, 60)
        : DEFAULT_WHEEL_OF_LUCK_CONFIG.title,
    subtitle:
      typeof src.subtitle === 'string' && src.subtitle.trim()
        ? src.subtitle.trim().slice(0, 140)
        : DEFAULT_WHEEL_OF_LUCK_CONFIG.subtitle,
    segments,
    simulatedWinDisplay,
  };
}

export function validateWheelConfig(raw?: any): {
  valid: boolean;
  errors: string[];
  config: WheelOfLuckConfig;
} {
  const errors: string[] = [];
  const src = raw && typeof raw === 'object' ? raw : {};

  if (!Array.isArray(src.segments) || src.segments.length < 2) {
    errors.push('Wheel of Luck requires at least 2 segments.');
  } else if (src.segments.length > 16) {
    errors.push('Wheel of Luck supports at most 16 segments.');
  }

  if (Array.isArray(src.segments)) {
    src.segments.forEach((seg: any, index: number) => {
      const label = typeof seg?.label === 'string' ? seg.label.trim() : '';
      const reward = Number(seg?.rewardAmount);
      const weight = Number(seg?.probabilityWeight);
      if (!label) {
        errors.push(`Segment #${index + 1} must have a non-empty label.`);
      }
      if (!Number.isFinite(reward) || reward < 0 || reward > 10000) {
        errors.push(`Segment #${index + 1} reward amount must be between $0 and $10,000.`);
      }
      if (!Number.isFinite(weight) || weight < 0 || weight > 100000) {
        errors.push(`Segment #${index + 1} probability weight must be 0 or greater.`);
      }
    });
  }

  const simAmt = Number(src?.simulatedWinDisplay?.amount ?? 0);
  if (src?.simulatedWinDisplay?.amount !== undefined && (!Number.isFinite(simAmt) || simAmt < 0 || simAmt > 100000)) {
    errors.push('Simulated promotional win display amount must be between $0 and $100,000.');
  }

  const normalized = normalizeWheelConfig(src);
  const activeWeightSum = normalized.segments
    .filter((s) => s.enabled && s.probabilityWeight > 0)
    .reduce((acc, s) => acc + s.probabilityWeight, 0);

  if (normalized.enabled && activeWeightSum <= 0) {
    errors.push('At least one enabled segment must have a probability weight greater than 0 when the wheel is enabled.');
  }

  return {
    valid: errors.length === 0,
    errors,
    config: normalized,
  };
}

export function computeSegmentProbabilities(
  segments: WheelSegment[]
): Array<WheelSegment & { probabilityPercent: number }> {
  const totalWeight = (segments || [])
    .filter((s) => s.enabled && s.probabilityWeight > 0)
    .reduce((sum, s) => sum + s.probabilityWeight, 0);

  return (segments || []).map((seg) => ({
    ...seg,
    probabilityPercent:
      seg.enabled && seg.probabilityWeight > 0 && totalWeight > 0
        ? Number(((seg.probabilityWeight / totalWeight) * 100).toFixed(2))
        : 0,
  }));
}

export interface WeightedSpinSelection {
  segment: WheelSegment;
  segmentIndexInAll: number;
  normalizedProbabilityPct: number;
}

export function selectWeightedWheelSegment(
  segments: WheelSegment[],
  randomUnit: number
): WeightedSpinSelection | null {
  const list = Array.isArray(segments) ? segments : [];
  const activeEntries = list
    .map((segment, index) => ({ segment, index }))
    .filter((entry) => entry.segment.enabled && entry.segment.probabilityWeight > 0);

  if (activeEntries.length === 0) return null;

  const totalWeight = activeEntries.reduce((sum, entry) => sum + entry.segment.probabilityWeight, 0);
  if (totalWeight <= 0) return null;

  const clampedUnit = Number.isFinite(randomUnit)
    ? Math.min(0.999999999, Math.max(0, randomUnit))
    : 0;
  let threshold = clampedUnit * totalWeight;

  for (const entry of activeEntries) {
    threshold -= entry.segment.probabilityWeight;
    if (threshold < 0) {
      return {
        segment: entry.segment,
        segmentIndexInAll: entry.index,
        normalizedProbabilityPct: Number(
          ((entry.segment.probabilityWeight / totalWeight) * 100).toFixed(2)
        ),
      };
    }
  }

  const fallback = activeEntries[activeEntries.length - 1];
  return {
    segment: fallback.segment,
    segmentIndexInAll: fallback.index,
    normalizedProbabilityPct: Number(
      ((fallback.segment.probabilityWeight / totalWeight) * 100).toFixed(2)
    ),
  };
}

export function evaluateWheelEligibility(params: {
  config: WheelOfLuckConfig;
  lastSpinAt?: string | null;
  serverNowMs: number;
}): WheelEligibilityState {
  const serverNowIso = new Date(params.serverNowMs).toISOString();
  const lastSpinMs = params.lastSpinAt ? Date.parse(params.lastSpinAt) : NaN;
  const hasValidLastSpin = Number.isFinite(lastSpinMs) && lastSpinMs > 0;
  const nextEligibleMs = hasValidLastSpin ? lastSpinMs + ROLLING_SPIN_COOLDOWN_MS : null;
  const remainingMs = nextEligibleMs !== null ? Math.max(0, nextEligibleMs - params.serverNowMs) : 0;

  if (!params.config.enabled) {
    return {
      enabled: false,
      eligible: false,
      reason: 'Wheel of Luck is currently disabled by Admin.',
      serverNow: serverNowIso,
      lastSpinAt: hasValidLastSpin ? new Date(lastSpinMs).toISOString() : null,
      nextEligibleAt: nextEligibleMs !== null ? new Date(nextEligibleMs).toISOString() : null,
      remainingMs,
    };
  }

  const activeWeight = params.config.segments
    .filter((s) => s.enabled && s.probabilityWeight > 0)
    .reduce((sum, s) => sum + s.probabilityWeight, 0);

  if (activeWeight <= 0) {
    return {
      enabled: true,
      eligible: false,
      reason: 'No active reward segments are configured.',
      serverNow: serverNowIso,
      lastSpinAt: hasValidLastSpin ? new Date(lastSpinMs).toISOString() : null,
      nextEligibleAt: nextEligibleMs !== null ? new Date(nextEligibleMs).toISOString() : null,
      remainingMs,
    };
  }

  if (hasValidLastSpin && remainingMs > 0 && nextEligibleMs !== null) {
    return {
      enabled: true,
      eligible: false,
      reason: 'Daily spin already claimed. Next spin unlocks after the 24-hour cooldown.',
      serverNow: serverNowIso,
      lastSpinAt: new Date(lastSpinMs).toISOString(),
      nextEligibleAt: new Date(nextEligibleMs).toISOString(),
      remainingMs,
    };
  }

  return {
    enabled: true,
    eligible: true,
    serverNow: serverNowIso,
    lastSpinAt: hasValidLastSpin ? new Date(lastSpinMs).toISOString() : null,
    nextEligibleAt: null,
    remainingMs: 0,
  };
}

export function formatCountdownDuration(remainingMs: number): string {
  const safeMs = Math.max(0, Math.floor(remainingMs));
  const totalSeconds = Math.ceil(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export type WheelUiState =
  | 'loading'
  | 'error'
  | 'disabled'
  | 'spinning'
  | 'eligible'
  | 'cooldown'
  | 'unavailable';

export function computeServerAnchoredRemainingMs(params: {
  eligibility?: WheelEligibilityState | null;
  fetchedAtClientMs: number;
  nowMs: number;
}): number {
  const { eligibility, fetchedAtClientMs, nowMs } = params;
  if (!eligibility || eligibility.eligible) return 0;

  const anchorMs = Number.isFinite(fetchedAtClientMs) ? fetchedAtClientMs : nowMs;
  const elapsedMs = Math.max(0, nowMs - anchorMs);

  const serverRemaining = Number(eligibility.remainingMs);
  if (Number.isFinite(serverRemaining) && serverRemaining > 0) {
    return Math.max(0, serverRemaining - elapsedMs);
  }

  const nextMs = eligibility.nextEligibleAt ? Date.parse(eligibility.nextEligibleAt) : NaN;
  const serverNowMs = eligibility.serverNow ? Date.parse(eligibility.serverNow) : NaN;
  if (Number.isFinite(nextMs) && Number.isFinite(serverNowMs)) {
    const initialRemaining = Math.max(0, nextMs - serverNowMs);
    return Math.max(0, initialRemaining - elapsedMs);
  }

  return 0;
}

export function deriveWheelUiState(params: {
  enabled: boolean;
  isLoading: boolean;
  hasStatus: boolean;
  statusError: string | null;
  isSpinning: boolean;
  eligibility?: WheelEligibilityState | null;
  remainingMs: number;
}): {
  uiState: WheelUiState;
  canSpin: boolean;
  showCountdown: boolean;
} {
  if (params.isSpinning) {
    return { uiState: 'spinning', canSpin: false, showCountdown: false };
  }
  if (params.isLoading && !params.hasStatus) {
    return { uiState: 'loading', canSpin: false, showCountdown: false };
  }
  if (params.statusError) {
    return { uiState: 'error', canSpin: false, showCountdown: false };
  }
  if (!params.enabled) {
    return { uiState: 'disabled', canSpin: false, showCountdown: false };
  }
  if (params.eligibility?.eligible) {
    return { uiState: 'eligible', canSpin: true, showCountdown: false };
  }
  if (params.remainingMs > 0) {
    return { uiState: 'cooldown', canSpin: false, showCountdown: true };
  }
  return { uiState: 'unavailable', canSpin: false, showCountdown: false };
}

export function computeWheelTargetRotation(params: {
  currentRotationDeg: number;
  segmentIndex: number;
  segmentCount: number;
  extraSpins?: number;
}): number {
  const count = Math.max(1, Math.floor(params.segmentCount));
  const idx = ((Math.floor(params.segmentIndex) % count) + count) % count;
  const extraSpins = Math.max(3, Math.floor(params.extraSpins ?? 6));
  const sliceAngle = 360 / count;
  // Segment i center sits at (idx * sliceAngle + sliceAngle / 2) degrees clockwise from 12 o'clock.
  // Rotating the wheel clockwise by (360 - centerAngle) brings that segment center cleanly under the top pointer.
  const segmentCenterDeg = idx * sliceAngle + sliceAngle / 2;
  const desiredMod = (360 - (segmentCenterDeg % 360) + 360) % 360;
  const currentMod = ((params.currentRotationDeg % 360) + 360) % 360;
  const deltaToTarget = (desiredMod - currentMod + 360) % 360;
  return params.currentRotationDeg + extraSpins * 360 + deltaToTarget;
}

export interface WheelWinPresentation {
  actualCredit: {
    amount: number;
    creditedTo: 'free_play_balance';
    label: string;
    isRealCredit: true;
  };
  promotionalDisplay: {
    visible: boolean;
    amount: number;
    label: string;
    disclaimer: string;
    isSimulatedOnly: true;
    balanceImpact: 0;
  };
}

export function buildWheelWinPresentation(params: {
  actualRewardAmount: number;
  simulatedWinEnabled: boolean;
  simulatedWinAmount: number;
  simulatedWinLabel?: string;
}): WheelWinPresentation {
  const actualAmt = roundCurrency(params.actualRewardAmount, 0);
  const simAmt = roundCurrency(params.simulatedWinAmount, 0);
  const visible = Boolean(params.simulatedWinEnabled && simAmt > 0);

  return {
    actualCredit: {
      amount: actualAmt,
      creditedTo: 'free_play_balance',
      label:
        actualAmt > 0
          ? `Actual Free-Play Reward Credited: $${actualAmt.toFixed(2)}`
          : 'Actual Free-Play Reward Credited: $0.00 (Better luck tomorrow)',
      isRealCredit: true,
    },
    promotionalDisplay: {
      visible,
      amount: visible ? simAmt : 0,
      label: (params.simulatedWinLabel || '').trim() || DEFAULT_WHEEL_OF_LUCK_CONFIG.simulatedWinDisplay.label,
      disclaimer: 'Promotional Showcase (Simulated Display Only — Not added to real balance)',
      isSimulatedOnly: true,
      balanceImpact: 0,
    },
  };
}

export interface LatestSpinCardViewModel {
  outcomeHeadline: string;
  segmentLabel: string;
  actualRewardAmount: number;
  isWinningSpin: boolean;
  rewardTypeLabel: string;
  creditStatusLabel: string;
  simulatedDisplayAmount: number;
  showSimulatedDisplay: boolean;
  simulatedBadgeLabel: 'SIMULATED — NOT CREDITED';
  createdAt: string;
}

export function buildLatestSpinCardViewModel(params: {
  spin: {
    segmentLabel?: string | null;
    rewardAmount?: number | null;
    simulatedWinAmount?: number | null;
    createdAt?: string | null;
  };
  simulatedWinDisplay?: {
    enabled?: boolean;
    amount?: number | null;
    label?: string | null;
  } | null;
}): LatestSpinCardViewModel {
  const actualRewardAmount = roundCurrency(params.spin.rewardAmount, 0);
  const isWinningSpin = actualRewardAmount > 0;
  const rawLabel = typeof params.spin.segmentLabel === 'string' ? params.spin.segmentLabel.trim() : '';
  const segmentLabel = rawLabel || (isWinningSpin ? `$${actualRewardAmount.toFixed(2)} Free Play` : 'Try Again');

  const hasLiveShowcaseOverride = Boolean(params.simulatedWinDisplay);
  const simulatedDisplayAmount = hasLiveShowcaseOverride
    ? params.simulatedWinDisplay?.enabled
      ? roundCurrency(params.simulatedWinDisplay?.amount, 0)
      : 0
    : roundCurrency(params.spin.simulatedWinAmount, 0);

  return {
    outcomeHeadline: isWinningSpin ? `Won: ${segmentLabel}` : `Landed on ${segmentLabel}`,
    segmentLabel,
    actualRewardAmount,
    isWinningSpin,
    rewardTypeLabel: 'Free-Play Credits (Non-Cashable)',
    creditStatusLabel: isWinningSpin
      ? `Credited +$${actualRewardAmount.toFixed(2)} to Free-Play Balance`
      : 'No Free-Play credits added ($0.00)',
    simulatedDisplayAmount,
    showSimulatedDisplay: simulatedDisplayAmount > 0,
    simulatedBadgeLabel: 'SIMULATED — NOT CREDITED',
    createdAt: String(params.spin.createdAt || new Date().toISOString()),
  };
}

export function computeGameCreditUnloadSplit(params: {
  totalGameBalance: number;
  trackedFreePlayBalance: number;
  requestedAmount: number;
}): {
  valid: boolean;
  error?: string;
  freePlayReturn: number;
  cashReturn: number;
  nextGameBalance: number;
  nextGameFreePlayBalance: number;
} {
  const totalBal = roundCurrency(params.totalGameBalance, 0);
  const trackedFreePlay = Math.min(totalBal, roundCurrency(params.trackedFreePlayBalance, 0));
  const reqAmt = roundCurrency(params.requestedAmount, 0);

  if (reqAmt <= 0) {
    return {
      valid: false,
      error: 'Unload amount must be greater than zero.',
      freePlayReturn: 0,
      cashReturn: 0,
      nextGameBalance: totalBal,
      nextGameFreePlayBalance: trackedFreePlay,
    };
  }

  if (reqAmt > totalBal) {
    return {
      valid: false,
      error: `Insufficient game credits ($${totalBal.toFixed(2)} available to unload).`,
      freePlayReturn: 0,
      cashReturn: 0,
      nextGameBalance: totalBal,
      nextGameFreePlayBalance: trackedFreePlay,
    };
  }

  // Non-cashable free-play credits always return to free_play_balance first
  // so promotional credits cannot be converted into withdrawable wallet cash.
  const freePlayReturn = Number(Math.min(reqAmt, trackedFreePlay).toFixed(2));
  const cashReturn = Number(Math.max(0, reqAmt - freePlayReturn).toFixed(2));
  const nextGameBalance = Number(Math.max(0, totalBal - reqAmt).toFixed(2));
  const nextGameFreePlayBalance = Number(Math.max(0, trackedFreePlay - freePlayReturn).toFixed(2));

  return {
    valid: true,
    freePlayReturn,
    cashReturn,
    nextGameBalance,
    nextGameFreePlayBalance,
  };
}

export function formatWheelSliceLines(segment: Pick<WheelSegment, 'label' | 'rewardAmount'>): {
  primary: string;
  secondary: string;
} {
  const rawLabel = (segment.label || '').trim();
  const amount = Number(segment.rewardAmount ?? 0);

  if (amount > 0) {
    const formattedAmount = Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
    const match = rawLabel.match(/^\$?\s*\d+(?:\.\d+)?\s*(.*)$/);
    const remainder = match ? match[1].trim() : '';
    if (remainder) {
      return {
        primary: formattedAmount,
        secondary: remainder.slice(0, 14),
      };
    }
    return {
      primary: formattedAmount,
      secondary: 'Free Play',
    };
  }

  if (!rawLabel || /^try\s+again$/i.test(rawLabel)) {
    return {
      primary: 'Try Again',
      secondary: 'Next Spin',
    };
  }

  const words = rawLabel.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return {
      primary: words[0].slice(0, 12),
      secondary: words.slice(1).join(' ').slice(0, 14),
    };
  }

  return {
    primary: rawLabel.slice(0, 12),
    secondary: '$0.00',
  };
}

export function isHtmlFallbackResponse(params: {
  contentType?: string | null;
  rawText?: string | null;
}): boolean {
  const ct = String(params.contentType || '').toLowerCase();
  const trimmed = String(params.rawText || '').trimStart();
  if (ct.includes('text/html')) return true;
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML')
  );
}

export function formatWheelHttpError(params: {
  actionLabel: string;
  status?: number | null;
  json?: any;
  contentType?: string | null;
  rawText?: string | null;
}): string {
  const statusCode = Number(params.status || 0);
  const backendError =
    params.json && typeof params.json === 'object' && typeof params.json.error === 'string'
      ? params.json.error.trim()
      : '';

  if (backendError) {
    return backendError;
  }

  if (
    params.json &&
    typeof params.json === 'object' &&
    params.json.online === true &&
    !params.json.eligibility
  ) {
    return `${params.actionLabel} sub-route was misrouted to API health root (${statusCode || 200}).`;
  }

  if (isHtmlFallbackResponse({ contentType: params.contentType, rawText: params.rawText })) {
    return statusCode >= 400
      ? `${params.actionLabel} failed (HTTP ${statusCode} gateway response). Please retry.`
      : `${params.actionLabel} returned HTML instead of JSON (${statusCode || 200}). Please retry.`;
  }

  const rawText = String(params.rawText || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (rawText && !params.json) {
    const snippet = rawText.length > 90 ? `${rawText.slice(0, 87)}...` : rawText;
    return statusCode > 0
      ? `${params.actionLabel} failed (HTTP ${statusCode}): ${snippet}`
      : `${params.actionLabel} failed: ${snippet}`;
  }

  return statusCode > 0
    ? `${params.actionLabel} failed (HTTP ${statusCode}). Please retry.`
    : `${params.actionLabel} failed. Please retry.`;
}

export interface GameBonusLoadStaffMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer';
  source: 'free_play' | 'referral_bonus';
  sourceLabel: 'Free-Play' | 'Referral Bonus';
  amount: number;
  gameTitle: string;
  gameUsername: string;
  txId: string;
  content: string;
  telegramText: string;
  pushTitle: string;
  pushBody: string;
  createdAt: string;
}

export function buildGameBonusLoadStaffMessage(params: {
  direction: string;
  source: string;
  amount: number;
  customerId: string;
  customerName?: string | null;
  gameTitle?: string | null;
  gameUsername?: string | null;
  txId: string;
  createdAt?: string;
}): GameBonusLoadStaffMessagePayload | null {
  const dir = String(params.direction || '').trim().toLowerCase();
  const src = String(params.source || '').trim().toLowerCase();
  if (dir !== 'load') return null;
  if (src !== 'free_play' && src !== 'referral_bonus') return null;

  const amount = roundCurrency(params.amount, 0);
  const customerId = String(params.customerId || '').trim();
  const txId = String(params.txId || '').trim();
  if (amount <= 0 || !customerId || !txId) return null;

  const source: 'free_play' | 'referral_bonus' = src;
  const sourceLabel: 'Free-Play' | 'Referral Bonus' =
    source === 'referral_bonus' ? 'Referral Bonus' : 'Free-Play';
  const senderName = String(params.customerName || '').trim() || 'Player';
  const gameTitle = String(params.gameTitle || '').trim() || 'Selected Game';
  const gameUsername = String(params.gameUsername || '').trim() || senderName;
  const formattedAmount = amount.toFixed(2);
  const createdAt = String(params.createdAt || new Date().toISOString());

  const content = [
    `🎮 ${sourceLabel} Load — Manual Confirmation Needed`,
    `• Player: ${senderName}`,
    `• Game Selected: ${gameTitle} (Gaming ID: ${gameUsername})`,
    `• Amount Loaded: $${formattedAmount} (${sourceLabel})`,
    `• Transfer Ref: ${txId}`,
    '',
    `⏳ Please manually confirm & load $${formattedAmount} ${sourceLabel} onto ${gameTitle} (${gameUsername}).`,
  ].join('\n');

  const telegramText = [
    `🎮 ${sourceLabel} Game Load Confirmation Needed`,
    `Player: ${senderName}`,
    `Game: ${gameTitle} (${gameUsername})`,
    `Amount: $${formattedAmount} (${sourceLabel})`,
    `Ref: ${txId}`,
  ].join('\n');

  return {
    id: `msg_gload_${txId}`,
    conversationId: `conv_${customerId}`,
    senderId: customerId,
    senderName,
    senderRole: 'customer',
    source,
    sourceLabel,
    amount,
    gameTitle,
    gameUsername,
    txId,
    content,
    telegramText,
    pushTitle: `🎮 ${sourceLabel} Load Confirmation Needed`,
    pushBody: `${senderName} loaded $${formattedAmount} (${sourceLabel}) to ${gameTitle} (${gameUsername})`,
    createdAt,
  };
}

export interface StickyWheelButtonState {
  visible: boolean;
  state: 'ready' | 'cooldown' | 'loading' | 'error';
  tooltipLabel: 'Daily Wheel';
  ariaLabel: string;
  badgeText: string;
  cooldownText: string | null;
}

export function buildStickyWheelButtonState(params: {
  enabled: boolean;
  uiState: WheelUiState;
  remainingMs: number;
}): StickyWheelButtonState {
  if (!params.enabled) {
    return {
      visible: false,
      state: 'cooldown',
      tooltipLabel: 'Daily Wheel',
      ariaLabel: 'Daily Wheel',
      badgeText: '',
      cooldownText: null,
    };
  }

  if (params.uiState === 'eligible') {
    return {
      visible: true,
      state: 'ready',
      tooltipLabel: 'Daily Wheel',
      ariaLabel: 'Daily Wheel — Spin ready',
      badgeText: '1',
      cooldownText: null,
    };
  }

  if (params.uiState === 'cooldown' && params.remainingMs > 0) {
    const cooldownText = formatCountdownDuration(params.remainingMs);
    return {
      visible: true,
      state: 'cooldown',
      tooltipLabel: 'Daily Wheel',
      ariaLabel: `Daily Wheel — Cooldown ${cooldownText}`,
      badgeText: '',
      cooldownText,
    };
  }

  if (params.uiState === 'error') {
    return {
      visible: true,
      state: 'error',
      tooltipLabel: 'Daily Wheel',
      ariaLabel: 'Daily Wheel — Check status',
      badgeText: '!',
      cooldownText: null,
    };
  }

  if (params.uiState === 'loading') {
    return {
      visible: true,
      state: 'loading',
      tooltipLabel: 'Daily Wheel',
      ariaLabel: 'Daily Wheel — Checking availability',
      badgeText: '',
      cooldownText: null,
    };
  }

  return {
    visible: true,
    state: 'cooldown',
    tooltipLabel: 'Daily Wheel',
    ariaLabel: 'Daily Wheel — Open Daily Wheel',
    badgeText: '',
    cooldownText: null,
  };
}

export function isSpinAvailableForCustomer(params: {
  isCustomer: boolean;
  enabled: boolean;
  isLoading: boolean;
  hasStatus: boolean;
  statusError: string | null;
  uiState: WheelUiState;
}): boolean {
  if (!params.isCustomer || !params.enabled) return false;
  if (params.statusError) return false;
  if (params.isLoading && !params.hasStatus) return false;
  return params.uiState === 'eligible';
}

export function getLocalDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWheelPopupStorageKey(userId: string, dayKey: string): string {
  return `wheel_popup_${userId}_${dayKey}`;
}

function getSafeBrowserLocalStorage(
  explicitStorage?: Pick<Storage, 'getItem' | 'setItem'> | null
): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (explicitStorage !== undefined) return explicitStorage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasDismissedWheelPopupToday(
  userId: string,
  dayKey: string,
  sessionFallback?: Set<string>,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): boolean {
  if (!userId || !dayKey) return true;
  const key = getWheelPopupStorageKey(userId, dayKey);
  if (sessionFallback?.has(key)) return true;

  const targetStorage = getSafeBrowserLocalStorage(storage);
  if (!targetStorage) return false;

  try {
    return targetStorage.getItem(key) === '1';
  } catch {
    return sessionFallback?.has(key) ?? false;
  }
}

export function markWheelPopupDismissedToday(
  userId: string,
  dayKey: string,
  sessionFallback?: Set<string>,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): void {
  if (!userId || !dayKey) return;
  const key = getWheelPopupStorageKey(userId, dayKey);
  sessionFallback?.add(key);

  const targetStorage = getSafeBrowserLocalStorage(storage);
  if (!targetStorage) return;

  try {
    targetStorage.setItem(key, '1');
  } catch {
    // Ignore storage quota/privacy-mode errors; sessionFallback already preserves once-per-session dismissal.
  }
}

export function shouldShowWheelPopup(params: {
  isCustomer: boolean;
  activeTab: string;
  spinAvailable: boolean;
  wheelModalOpen: boolean;
  hasOtherOpenModal?: boolean;
  dismissedToday: boolean;
}): boolean {
  if (!params.isCustomer) return false;
  if (params.activeTab !== 'dashboard') return false;
  if (!params.spinAvailable) return false;
  if (params.wheelModalOpen) return false;
  if (params.hasOtherOpenModal) return false;
  if (params.dismissedToday) return false;
  return true;
}
