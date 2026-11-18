import type {
  ReferralAwardStatus,
  ReferralLedgerEntry,
  ReferralPayoutTarget,
  ReferralProgramConfig,
  ReferralRewardMode,
  TopReferrerEntry,
} from '../types';

export const DEFAULT_REFERRAL_CONFIG: ReferralProgramConfig = {
  enabled: true,
  rewardMode: 'flat',
  referrerRewardValue: 25,
  refereeRewardValue: 10,
  rewardPerReferral: 25,
  qualificationDepositMin: 100,
  requireEmailVerified: true,
  payoutTarget: 'referral_bonus',
  maxReferralsPerUser: 50,
  dailyPayoutCap: 1000,
  blockSelfReferral: true,
  blockDuplicateContact: true,
  flagSharedNetworkOrDevice: true,
  holdFlaggedForReview: true,
};

function clampNonNegativeNumber(val: unknown, fallback: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Number(n.toFixed(2));
}

export function normalizeReferralConfig(raw?: any): ReferralProgramConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rewardMode: ReferralRewardMode = src.rewardMode === 'percent' ? 'percent' : 'flat';
  const payoutTarget: ReferralPayoutTarget =
    src.payoutTarget === 'available_balance' ? 'available_balance' : 'referral_bonus';

  const legacyPerRef = clampNonNegativeNumber(
    src.rewardPerReferral,
    DEFAULT_REFERRAL_CONFIG.referrerRewardValue
  );
  const referrerRewardValue = clampNonNegativeNumber(
    src.referrerRewardValue !== undefined ? src.referrerRewardValue : legacyPerRef,
    legacyPerRef
  );
  const refereeRewardValue = clampNonNegativeNumber(
    src.refereeRewardValue !== undefined ? src.refereeRewardValue : DEFAULT_REFERRAL_CONFIG.refereeRewardValue,
    DEFAULT_REFERRAL_CONFIG.refereeRewardValue
  );

  const boundedReferrerVal = rewardMode === 'percent' ? Math.min(100, referrerRewardValue) : referrerRewardValue;
  const boundedRefereeVal = rewardMode === 'percent' ? Math.min(100, refereeRewardValue) : refereeRewardValue;

  return {
    enabled: src.enabled !== false,
    rewardMode,
    referrerRewardValue: boundedReferrerVal,
    refereeRewardValue: boundedRefereeVal,
    rewardPerReferral: boundedReferrerVal,
    qualificationDepositMin: clampNonNegativeNumber(
      src.qualificationDepositMin,
      DEFAULT_REFERRAL_CONFIG.qualificationDepositMin
    ),
    requireEmailVerified: src.requireEmailVerified !== false,
    payoutTarget,
    maxReferralsPerUser: Math.max(
      0,
      Math.floor(
        Number.isFinite(Number(src.maxReferralsPerUser))
          ? Number(src.maxReferralsPerUser)
          : DEFAULT_REFERRAL_CONFIG.maxReferralsPerUser
      )
    ),
    dailyPayoutCap: clampNonNegativeNumber(
      src.dailyPayoutCap,
      DEFAULT_REFERRAL_CONFIG.dailyPayoutCap
    ),
    blockSelfReferral: src.blockSelfReferral !== false,
    blockDuplicateContact: src.blockDuplicateContact !== false,
    flagSharedNetworkOrDevice: src.flagSharedNetworkOrDevice !== false,
    holdFlaggedForReview: src.holdFlaggedForReview !== false,
  };
}

export function normalizeReferralCodeInput(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidVanityReferralCode(raw?: string | null): boolean {
  const code = normalizeReferralCodeInput(raw);
  return /^[A-Z0-9_-]{3,24}$/.test(code);
}

export function normalizePhoneForMatch(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

export function calculateReferralPayouts(
  configInput: Partial<ReferralProgramConfig> | undefined,
  qualifyingDepositAmount: number
): { referrerAmount: number; refereeAmount: number; totalAmount: number } {
  const cfg = normalizeReferralConfig(configInput);
  const deposit = Math.max(0, Number(qualifyingDepositAmount) || 0);

  let referrerAmount = 0;
  let refereeAmount = 0;

  if (cfg.rewardMode === 'percent') {
    referrerAmount = Number(((deposit * cfg.referrerRewardValue) / 100).toFixed(2));
    refereeAmount = Number(((deposit * cfg.refereeRewardValue) / 100).toFixed(2));
  } else {
    referrerAmount = Number(cfg.referrerRewardValue.toFixed(2));
    refereeAmount = Number(cfg.refereeRewardValue.toFixed(2));
  }

  return {
    referrerAmount,
    refereeAmount,
    totalAmount: Number((referrerAmount + refereeAmount).toFixed(2)),
  };
}

export function isRealCashTopUpRow(row: any): boolean {
  if (!row || typeof row !== 'object') return false;
  const status = String(row.status || '').toLowerCase();
  if (status !== 'completed' && status !== 'approved') return false;

  const fundingSource = String(row.funding_source || row.fundingSource || '').toLowerCase();
  if (fundingSource === 'referral_bonus' || fundingSource === 'bonus_credit') {
    return false;
  }

  const method = String(row.payment_method_id || row.method || '').toLowerCase();
  if (method === 'referral_bonus' || method === 'bonus' || method === 'promo_credit') {
    return false;
  }

  const amount = Number(row.amount || 0);
  return Number.isFinite(amount) && amount > 0;
}

export interface FraudCheckParticipant {
  id: string;
  email?: string;
  phone?: string;
  signupIp?: string | null;
  deviceFingerprint?: string | null;
}

export interface FraudEvaluationResult {
  blocked: boolean;
  blockCode?: 'SELF_REFERRAL_BLOCKED' | 'DUPLICATE_CONTACT_BLOCKED';
  blockReason?: string;
  fraudFlags: string[];
  shouldHold: boolean;
}

export function evaluateReferralFraudSignals(params: {
  referrer: FraudCheckParticipant;
  referee: FraudCheckParticipant;
  otherUsers?: FraudCheckParticipant[];
  config?: Partial<ReferralProgramConfig>;
  contextIp?: string | null;
  contextFingerprint?: string | null;
}): FraudEvaluationResult {
  const cfg = normalizeReferralConfig(params.config);
  const { referrer, referee } = params;

  const refEmail = String(referrer.email || '').trim().toLowerCase();
  const eeEmail = String(referee.email || '').trim().toLowerCase();
  const refPhone = normalizePhoneForMatch(referrer.phone);
  const eePhone = normalizePhoneForMatch(referee.phone);

  if (cfg.blockSelfReferral) {
    if (referrer.id && referee.id && referrer.id === referee.id) {
      return {
        blocked: true,
        blockCode: 'SELF_REFERRAL_BLOCKED',
        blockReason: 'Self-referral blocked: a player cannot refer their own account.',
        fraudFlags: ['self_referral'],
        shouldHold: false,
      };
    }
    if (refEmail && eeEmail && refEmail === eeEmail) {
      return {
        blocked: true,
        blockCode: 'SELF_REFERRAL_BLOCKED',
        blockReason: 'Self-referral blocked: referrer and player share the same email address.',
        fraudFlags: ['same_email'],
        shouldHold: false,
      };
    }
  }

  if (cfg.blockDuplicateContact) {
    if (refPhone && eePhone && refPhone.length >= 7 && refPhone === eePhone) {
      return {
        blocked: true,
        blockCode: 'DUPLICATE_CONTACT_BLOCKED',
        blockReason: 'Duplicate phone number blocked: referrer and referred player share the same phone number.',
        fraudFlags: ['duplicate_phone'],
        shouldHold: false,
      };
    }

    for (const other of params.otherUsers || []) {
      if (!other || other.id === referee.id) continue;
      const otherEmail = String(other.email || '').trim().toLowerCase();
      const otherPhone = normalizePhoneForMatch(other.phone);
      if (eeEmail && otherEmail && eeEmail === otherEmail) {
        return {
          blocked: true,
          blockCode: 'DUPLICATE_CONTACT_BLOCKED',
          blockReason: 'Duplicate email detected across another account.',
          fraudFlags: ['duplicate_email_account'],
          shouldHold: false,
        };
      }
      if (eePhone && otherPhone && eePhone.length >= 7 && eePhone === otherPhone) {
        return {
          blocked: true,
          blockCode: 'DUPLICATE_CONTACT_BLOCKED',
          blockReason: 'Duplicate phone number already registered on another player account.',
          fraudFlags: ['duplicate_phone_account'],
          shouldHold: false,
        };
      }
    }
  }

  const fraudFlags: string[] = [];
  if (cfg.flagSharedNetworkOrDevice) {
    const refIp = String(referrer.signupIp || '').trim();
    const eeIp = String(referee.signupIp || params.contextIp || '').trim();
    if (refIp && eeIp && refIp === eeIp) {
      fraudFlags.push('shared_ip');
    }

    const refDevice = String(referrer.deviceFingerprint || '').trim();
    const eeDevice = String(referee.deviceFingerprint || params.contextFingerprint || '').trim();
    if (refDevice && eeDevice && refDevice === eeDevice) {
      fraudFlags.push('shared_device');
    }
  }

  return {
    blocked: false,
    fraudFlags,
    shouldHold: fraudFlags.length > 0 && cfg.holdFlaggedForReview,
  };
}

export function checkReferralBudgetCaps(params: {
  config?: Partial<ReferralProgramConfig>;
  referrerRewardedCount: number;
  dailyTotalPaidToday: number;
  payoutTotal: number;
}): { allowed: boolean; capReason?: string } {
  const cfg = normalizeReferralConfig(params.config);

  if (cfg.maxReferralsPerUser > 0 && params.referrerRewardedCount >= cfg.maxReferralsPerUser) {
    return {
      allowed: false,
      capReason: `Referrer reached maximum rewarded referral limit (${cfg.maxReferralsPerUser}).`,
    };
  }

  if (
    cfg.dailyPayoutCap > 0 &&
    params.dailyTotalPaidToday + params.payoutTotal > cfg.dailyPayoutCap
  ) {
    return {
      allowed: false,
      capReason: `Platform daily referral payout cap ($${cfg.dailyPayoutCap.toFixed(2)}) reached.`,
    };
  }

  return { allowed: true };
}

export function computeTopReferrers(
  awards: ReferralLedgerEntry[],
  usersById: Record<string, { displayName?: string; email?: string; referralCode?: string }> = {}
): TopReferrerEntry[] {
  const map = new Map<string, TopReferrerEntry>();

  for (const row of awards) {
    if (!row.referrerId) continue;
    const profile = usersById[row.referrerId];
    let entry = map.get(row.referrerId);
    if (!entry) {
      entry = {
        referrerId: row.referrerId,
        displayName: row.referrerName || profile?.displayName || 'Player',
        email: row.referrerEmail || profile?.email,
        referralCode: row.referrerCode || profile?.referralCode || row.referralCodeUsed || '',
        totalReferred: 0,
        qualifiedCount: 0,
        heldCount: 0,
        totalReferrerPaid: 0,
        totalFriendPaid: 0,
      };
      map.set(row.referrerId, entry);
    }

    entry.totalReferred += 1;
    if (row.status === 'rewarded') {
      entry.qualifiedCount += 1;
      entry.totalReferrerPaid = Number((entry.totalReferrerPaid + (row.referrerRewardAmount || 0)).toFixed(2));
      entry.totalFriendPaid = Number((entry.totalFriendPaid + (row.refereeRewardAmount || 0)).toFixed(2));
    } else if (row.status === 'held_for_review') {
      entry.heldCount += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.qualifiedCount !== a.qualifiedCount) return b.qualifiedCount - a.qualifiedCount;
    if (b.totalReferrerPaid !== a.totalReferrerPaid) return b.totalReferrerPaid - a.totalReferrerPaid;
    return b.totalReferred - a.totalReferred;
  });
}

export function normalizeReferralLedgerRow(
  row: any,
  usersById: Record<string, { displayName?: string; email?: string; referralCode?: string }> = {}
): ReferralLedgerEntry | null {
  if (!row || typeof row !== 'object' || !row.id) return null;
  const referrerId = String(row.referrer_id || row.referrerId || '');
  const refereeId = String(row.referee_id || row.refereeId || '');
  const referrer = usersById[referrerId];
  const referee = usersById[refereeId];

  let parsedFlags: string[] = [];
  if (Array.isArray(row.fraud_flags)) {
    parsedFlags = row.fraud_flags.map((f: any) => String(f));
  } else if (Array.isArray(row.fraudFlags)) {
    parsedFlags = row.fraudFlags.map((f: any) => String(f));
  }

  return {
    id: String(row.id),
    referrerId,
    referrerName: row.referrerName || referrer?.displayName || 'Referrer',
    referrerEmail: row.referrerEmail || referrer?.email,
    referrerCode: row.referrerCode || referrer?.referralCode || String(row.referral_code_used || row.referralCodeUsed || ''),
    refereeId,
    refereeName: row.refereeName || referee?.displayName || 'Player',
    refereeEmail: row.refereeEmail || referee?.email,
    referralCodeUsed: String(row.referral_code_used || row.referralCodeUsed || ''),
    source: String(row.source || 'signup_link'),
    rewardMode: (row.reward_mode || row.rewardMode) === 'percent' ? 'percent' : 'flat',
    payoutTarget:
      (row.payout_target || row.payoutTarget) === 'available_balance'
        ? 'available_balance'
        : 'referral_bonus',
    referrerRewardAmount: Number(row.referrer_reward_amount ?? row.referrerRewardAmount ?? 0),
    refereeRewardAmount: Number(row.referee_reward_amount ?? row.refereeRewardAmount ?? 0),
    qualifyingDepositId: row.qualifying_deposit_id || row.qualifyingDepositId || undefined,
    qualifyingDepositAmount: Number(row.qualifying_deposit_amount ?? row.qualifyingDepositAmount ?? 0),
    status: (row.status || 'registered') as ReferralAwardStatus,
    fraudFlags: parsedFlags,
    staffReason: row.staff_reason || row.staffReason || undefined,
    assignedBy: row.assigned_by || row.assignedBy || undefined,
    assignedByName: row.assigned_by_name || row.assignedByName || undefined,
    reviewedBy: row.reviewed_by || row.reviewedBy || undefined,
    reviewedByName: row.reviewed_by_name || row.reviewedByName || undefined,
    reviewNotes: row.review_notes || row.reviewNotes || undefined,
    rewardedAt: row.rewarded_at || row.rewardedAt || undefined,
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.updatedAt || row.created_at || new Date().toISOString()),
  };
}

export function formatReferralRuleSummary(cfgInput?: Partial<ReferralProgramConfig>): {
  referrerLabel: string;
  friendLabel: string;
  walletRuleLabel: string;
} {
  const cfg = normalizeReferralConfig(cfgInput);
  const referrerLabel =
    cfg.rewardMode === 'percent'
      ? `${cfg.referrerRewardValue}% of first qualifying deposit`
      : `$${cfg.referrerRewardValue.toFixed(2)} bonus`;
  const friendLabel =
    cfg.refereeRewardValue > 0
      ? cfg.rewardMode === 'percent'
        ? `${cfg.refereeRewardValue}% welcome bonus`
        : `$${cfg.refereeRewardValue.toFixed(2)} welcome bonus`
      : 'No friend bonus configured';
  const walletRuleLabel =
    cfg.payoutTarget === 'available_balance'
      ? 'Credited directly to Available Wallet Balance'
      : 'Credited to Referral Bonus Balance (non-withdrawable, usable for game top-ups)';
  return { referrerLabel, friendLabel, walletRuleLabel };
}
