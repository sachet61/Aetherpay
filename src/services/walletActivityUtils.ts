import type {
  TopUpRequest,
  UserWallet,
  WalletTransaction,
  WithdrawalRequest,
} from '../types';

export type WalletActivityCategory = 'deposit' | 'withdrawal' | 'referral' | 'other';
export type WalletActivityFilter = 'all' | 'deposit' | 'withdrawal' | 'referral';
export type WalletActivityDirection = 'credit' | 'debit' | 'neutral';

export interface LatestTopUpSummary {
  requestId: string;
  baseAmount: number;
  bonusAmount: number;
  finalCreditedAmount: number;
  targetGameName?: string;
  completedAt?: string;
}

export interface UnifiedWalletActivityItem {
  id: string;
  sourceType: 'topup' | 'withdrawal' | 'transaction';
  category: WalletActivityCategory;
  direction: WalletActivityDirection;
  title: string;
  description: string;
  baseAmount: number;
  bonusAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  status: string;
  methodName?: string;
  targetGameName?: string;
  targetGameUsername?: string;
  reviewerName?: string;
  reviewNotes?: string;
  payoutReference?: string;
  referenceId?: string;
  proofUrl?: string;
  payoutDetails?: any;
  timeline?: Array<{
    status: string;
    note: string;
    timestamp: string;
    actorName: string;
  }>;
  balanceAfter?: number;
  createdAt: string;
  updatedAt: string;
  timestamp: string;
}

export interface ActivityStatusMeta {
  label: string;
  textClass: string;
  badgeClass: string;
}

function toFiniteNumber(value: unknown, fallback: number = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseTimeMs(value?: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function isCompletedTopUpStatus(status?: string): boolean {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'completed' || normalized === 'approved';
}

export function getTopUpFinalCreditedAmount(req: Partial<TopUpRequest>): number {
  const base = toFiniteNumber(req.amount, 0);
  const bonus = toFiniteNumber(req.bonusAmount, 0);
  const computed = Number((base + bonus).toFixed(2));
  const explicitFinal = toFiniteNumber(req.finalWalletCredit, 0);
  if (explicitFinal > 0 && explicitFinal >= base) {
    return Number(explicitFinal.toFixed(2));
  }
  return computed;
}

export function deriveLatestCompletedTopUp(
  topups: TopUpRequest[],
  customerId?: string
): LatestTopUpSummary | null {
  const completed = (topups || [])
    .filter((t) => {
      if (!t || !t.id) return false;
      if (customerId && t.customerId !== customerId) return false;
      return isCompletedTopUpStatus(t.status);
    })
    .sort((a, b) => {
      const aUpdated = parseTimeMs(a.updatedAt || a.createdAt);
      const bUpdated = parseTimeMs(b.updatedAt || b.createdAt);
      if (bUpdated !== aUpdated) return bUpdated - aUpdated;
      const aCreated = parseTimeMs(a.createdAt);
      const bCreated = parseTimeMs(b.createdAt);
      if (bCreated !== aCreated) return bCreated - aCreated;
      return String(b.id).localeCompare(String(a.id));
    });

  if (completed.length === 0) return null;

  const latest = completed[0];
  const baseAmount = toFiniteNumber(latest.amount, 0);
  const bonusAmount = toFiniteNumber(latest.bonusAmount, 0);
  const finalCreditedAmount = getTopUpFinalCreditedAmount(latest);

  return {
    requestId: latest.id,
    baseAmount: Number(baseAmount.toFixed(2)),
    bonusAmount: Number(bonusAmount.toFixed(2)),
    finalCreditedAmount,
    targetGameName: (latest.targetGameName || '').trim() || undefined,
    completedAt: latest.updatedAt || latest.createdAt || undefined,
  };
}

export function computeCumulativeCompletedDeposits(
  topups: TopUpRequest[],
  customerId: string
): number {
  const total = (topups || [])
    .filter((t) => t && t.customerId === customerId && isCompletedTopUpStatus(t.status))
    .reduce((sum, t) => sum + toFiniteNumber(t.amount, 0), 0);
  return Number(total.toFixed(2));
}

export function reconcileWalletWithTopups(
  wallet: UserWallet,
  topups: TopUpRequest[],
  options?: { authoritativeTopupsLoaded?: boolean }
): UserWallet {
  const latest = deriveLatestCompletedTopUp(topups, wallet.customerId);
  if (latest) {
    return {
      ...wallet,
      lastTopUpAmount: latest.finalCreditedAmount,
      lastTopUpGame: latest.targetGameName || wallet.lastTopUpGame || 'Game',
      lastTopUpAt: latest.completedAt || wallet.lastTopUpAt,
    };
  }

  if (options?.authoritativeTopupsLoaded) {
    return {
      ...wallet,
      lastTopUpAmount: 0,
      lastTopUpGame: undefined,
      lastTopUpAt: undefined,
    };
  }

  return wallet;
}

export function mapDbWalletRowToWallet(
  dbRow: any,
  existingWallet: UserWallet | undefined,
  customerTopups: TopUpRequest[],
  options?: { authoritativeTopupsLoaded?: boolean }
): UserWallet {
  const customerId = String(dbRow.customer_id);
  const baseWallet: UserWallet = {
    customerId,
    currency: dbRow.currency || existingWallet?.currency || 'USD',
    availableBalance: toFiniteNumber(dbRow.balance, 0),
    referralBonusBalance: toFiniteNumber(existingWallet?.referralBonusBalance, 0),
    reservedBalance: toFiniteNumber(dbRow.pending_withdrawal, 0),
    pendingDepositBalance: toFiniteNumber(dbRow.pending_deposit, 0),
    totalDeposited: toFiniteNumber(dbRow.total_deposited, existingWallet?.totalDeposited ?? 0),
    totalWithdrawn: toFiniteNumber(dbRow.total_withdrawn, existingWallet?.totalWithdrawn ?? 0),
    lastTopUpAmount: options?.authoritativeTopupsLoaded ? 0 : toFiniteNumber(existingWallet?.lastTopUpAmount, 0),
    lastTopUpGame: options?.authoritativeTopupsLoaded ? undefined : existingWallet?.lastTopUpGame,
    lastTopUpAt: options?.authoritativeTopupsLoaded ? undefined : existingWallet?.lastTopUpAt,
    lastUpdatedAt: dbRow.updated_at || new Date().toISOString(),
  };

  return reconcileWalletWithTopups(baseWallet, customerTopups, {
    authoritativeTopupsLoaded: options?.authoritativeTopupsLoaded,
  });
}

export function resolveDashboardTopUpDisplay(
  wallet: UserWallet | null | undefined,
  topups: TopUpRequest[],
  customerId?: string
): {
  amount: number;
  baseAmount: number;
  bonusAmount: number;
  gameName: string | null;
  completedAt: string | null;
  hasCompletedTopUp: boolean;
} {
  const latest = deriveLatestCompletedTopUp(topups, customerId || wallet?.customerId);
  if (latest) {
    return {
      amount: latest.finalCreditedAmount,
      baseAmount: latest.baseAmount,
      bonusAmount: latest.bonusAmount,
      gameName: latest.targetGameName || wallet?.lastTopUpGame || 'Game',
      completedAt: latest.completedAt || wallet?.lastTopUpAt || null,
      hasCompletedTopUp: true,
    };
  }

  const cachedAmount = toFiniteNumber(wallet?.lastTopUpAmount, 0);
  if (cachedAmount > 0 && wallet?.lastTopUpAt) {
    return {
      amount: Number(cachedAmount.toFixed(2)),
      baseAmount: Number(cachedAmount.toFixed(2)),
      bonusAmount: 0,
      gameName: (wallet?.lastTopUpGame || '').trim() || 'Game',
      completedAt: wallet.lastTopUpAt,
      hasCompletedTopUp: true,
    };
  }

  return {
    amount: 0,
    baseAmount: 0,
    bonusAmount: 0,
    gameName: null,
    completedAt: null,
    hasCompletedTopUp: false,
  };
}

export function mapDbTransactionRowToWalletTransaction(
  row: any,
  existing?: WalletTransaction
): WalletTransaction {
  const amount = toFiniteNumber(row.amount ?? existing?.amount, 0);
  const fee = toFiniteNumber(row.fee ?? existing?.fee, 0);
  const netAmount = toFiniteNumber(row.net_amount ?? existing?.netAmount, amount);
  const refId = row.reference_id ?? existing?.relatedRequestId ?? existing?.referenceId ?? undefined;
  const gameName = row.game_name ?? existing?.targetGameName ?? existing?.gameName ?? undefined;
  const createdAt = row.created_at || existing?.createdAt || new Date().toISOString();

  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? existing?.customerId ?? ''),
    type: row.type || existing?.type || 'adjustment',
    amount,
    fee,
    netAmount,
    currency: existing?.currency || 'USD',
    balanceAfter: toFiniteNumber(row.balance_after ?? existing?.balanceAfter, 0),
    relatedRequestId: refId,
    referenceId: refId,
    targetGameName: gameName,
    gameName,
    targetGameUsername: existing?.targetGameUsername,
    description: String(row.description ?? existing?.description ?? ''),
    idempotencyKey: existing?.idempotencyKey || String(row.id),
    status: row.status || existing?.status || 'completed',
    createdAt,
  };
}

export function mergeWalletTransactions(
  current: WalletTransaction[],
  rows: any[],
  replaceAll: boolean = false
): WalletTransaction[] {
  const existingById = new Map<string, WalletTransaction>();
  for (const tx of current || []) {
    if (tx && tx.id) existingById.set(tx.id, tx);
  }

  const txMap = new Map<string, WalletTransaction>();
  if (!replaceAll) {
    for (const tx of current || []) {
      if (tx && tx.id) txMap.set(tx.id, tx);
    }
  }

  for (const row of rows || []) {
    if (!row || !row.id) continue;
    if (row.deleted_at) {
      txMap.delete(row.id);
      continue;
    }
    const existing = txMap.get(row.id) || existingById.get(row.id);
    txMap.set(row.id, mapDbTransactionRowToWalletTransaction(row, existing));
  }

  return Array.from(txMap.values()).sort(
    (a, b) => parseTimeMs(b.createdAt) - parseTimeMs(a.createdAt)
  );
}

function extractLinkedRequestId(tx: WalletTransaction): string | undefined {
  const direct = (tx.relatedRequestId || tx.referenceId || '').trim();
  if (direct) return direct;

  const idemp = String(tx.idempotencyKey || '').trim();
  const idempMatch = idemp.match(/^idemp_(?:dep|bns|wdr|wdr_final|wdr_release)_(.+)$/);
  if (idempMatch && idempMatch[1]) {
    return idempMatch[1].trim();
  }

  const desc = String(tx.description || '');
  const hashMatch = desc.match(/#(req_(?:topup|wdr)_[A-Za-z0-9_-]+)/);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].trim();
  }

  return undefined;
}

export function buildUnifiedWalletActivity(params: {
  customerId: string;
  topups: TopUpRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: WalletTransaction[];
}): UnifiedWalletActivityItem[] {
  const { customerId, topups, withdrawals, transactions } = params;
  const items: UnifiedWalletActivityItem[] = [];

  const customerTopups = (topups || []).filter((t) => t && t.customerId === customerId);
  const customerWithdrawals = (withdrawals || []).filter((w) => w && w.customerId === customerId);
  const customerTxs = (transactions || []).filter((tx) => tx && tx.customerId === customerId);

  const topupIds = new Set<string>(customerTopups.map((t) => t.id));
  const withdrawalIds = new Set<string>(customerWithdrawals.map((w) => w.id));

  for (const req of customerTopups) {
    const baseAmount = toFiniteNumber(req.amount, 0);
    const bonusAmount = toFiniteNumber(req.bonusAmount, 0);
    const feeAmount = toFiniteNumber(req.feeAmount, 0);
    const netAmount = getTopUpFinalCreditedAmount(req);
    const status = String(req.status || 'submitted');
    const isFailedOrCancelled = status === 'rejected' || status === 'cancelled';
    const methodName = (req.methodName || req.paymentMethodName || req.method || 'Payment Method').trim();
    const targetGameName = (req.targetGameName || '').trim() || undefined;
    const createdAt = req.createdAt || req.updatedAt || new Date(0).toISOString();
    const updatedAt = req.updatedAt || createdAt;
    const referenceId = (req.providerRef || req.cryptoTxHash || req.id || '').trim() || req.id;

    items.push({
      id: req.id,
      sourceType: 'topup',
      category: 'deposit',
      direction: isFailedOrCancelled ? 'neutral' : 'credit',
      title: targetGameName ? `Deposit to ${targetGameName}` : 'Game Deposit',
      description: targetGameName
        ? `Top-up via ${methodName}${req.targetGameUsername ? ` (${req.targetGameUsername})` : ''}`
        : `Deposit via ${methodName}`,
      baseAmount: Number(baseAmount.toFixed(2)),
      bonusAmount: Number(bonusAmount.toFixed(2)),
      feeAmount: Number(feeAmount.toFixed(2)),
      netAmount,
      currency: req.currency || 'USD',
      status,
      methodName,
      targetGameName,
      targetGameUsername: req.targetGameUsername,
      reviewerName: req.reviewerName,
      reviewNotes: req.reviewNotes || req.customerNotes,
      referenceId,
      proofUrl: req.receiptUrl || req.proofUrl,
      createdAt,
      updatedAt,
      timestamp: createdAt,
    });
  }

  for (const req of customerWithdrawals) {
    const baseAmount = toFiniteNumber(req.amount, 0);
    const feeAmount = toFiniteNumber(req.feeAmount ?? req.fee, 0);
    const netAmount = toFiniteNumber(
      req.netPayout ?? req.netAmount,
      Math.max(0, Number((baseAmount - feeAmount).toFixed(2)))
    );
    const status = String(req.status || 'submitted');
    const isReleased = status === 'rejected' || status === 'cancelled';
    const methodName = (req.methodName || req.payoutMethodName || req.method || 'Payout Method').trim();
    const sourceGameName = (req.sourceGameName || req.payoutDetails?.sourceGameName || '').trim() || undefined;
    const sourceGameUsername = (req.sourceGameUsername || req.payoutDetails?.sourceGameUsername || '').trim() || undefined;
    const createdAt = req.createdAt || req.updatedAt || new Date(0).toISOString();
    const updatedAt = req.updatedAt || createdAt;
    const payoutReference = (req.payoutReference || req.transactionHash || '').trim() || undefined;

    items.push({
      id: req.id,
      sourceType: 'withdrawal',
      category: 'withdrawal',
      direction: isReleased ? 'neutral' : 'debit',
      title: sourceGameName ? `Cashout from ${sourceGameName}` : 'Cashout Request',
      description: `Payout via ${methodName}${sourceGameUsername ? ` (${sourceGameUsername})` : ''}`,
      baseAmount: Number(baseAmount.toFixed(2)),
      bonusAmount: 0,
      feeAmount: Number(feeAmount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      currency: req.currency || 'USD',
      status,
      methodName,
      targetGameName: sourceGameName,
      targetGameUsername: sourceGameUsername,
      reviewerName: req.reviewerName,
      reviewNotes: req.reviewNotes || req.playerNotes,
      payoutReference,
      referenceId: req.id,
      payoutDetails: req.payoutDetails,
      timeline: Array.isArray(req.timeline) ? req.timeline : undefined,
      createdAt,
      updatedAt,
      timestamp: createdAt,
    });
  }

  for (const tx of customerTxs) {
    const txType = String(tx.type || 'adjustment').toLowerCase();
    const linkedId = extractLinkedRequestId(tx);

    // Deduplicate ledger records already represented authoritatively by topups/withdrawals
    if ((txType === 'deposit' || txType === 'bonus') && linkedId && topupIds.has(linkedId)) {
      continue;
    }
    if (
      (txType === 'withdrawal' || txType === 'withdrawal_hold' || txType === 'withdrawal_release') &&
      linkedId &&
      withdrawalIds.has(linkedId)
    ) {
      continue;
    }

    const descLower = String(tx.description || '').toLowerCase();
    const isReferralBonusUsage = txType === 'bonus' && descLower.includes('referral');
    const isReferral = txType === 'referral_reward' || txType === 'referral' || isReferralBonusUsage;

    let category: WalletActivityCategory = 'other';
    if (isReferral) {
      category = 'referral';
    } else if (txType === 'deposit' || txType === 'bonus') {
      category = 'deposit';
    } else if (
      txType === 'withdrawal' ||
      txType === 'withdrawal_hold' ||
      txType === 'withdrawal_release'
    ) {
      category = 'withdrawal';
    }

    let direction: WalletActivityDirection = 'credit';
    if (txType === 'withdrawal' || txType === 'withdrawal_hold') {
      direction = 'debit';
    } else if (isReferralBonusUsage || (txType === 'adjustment' && descLower.includes('loaded to'))) {
      direction = 'neutral';
    }

    let title = 'Account Activity';
    if (txType === 'referral_reward' || txType === 'referral') {
      title = 'Referral Reward';
    } else if (isReferralBonusUsage) {
      title = 'Referral Bonus Game Load';
    } else if (txType === 'deposit') {
      title = tx.targetGameName ? `Deposit to ${tx.targetGameName}` : 'Deposit Record';
    } else if (txType === 'bonus') {
      title = 'Promotion Bonus';
    } else if (txType === 'withdrawal_release') {
      title = 'Cashout Funds Released';
    } else if (txType === 'withdrawal_hold') {
      title = 'Cashout Hold';
    } else if (txType === 'withdrawal') {
      title = 'Withdrawal Record';
    } else if (txType === 'adjustment') {
      title = tx.targetGameName ? `Wallet Load to ${tx.targetGameName}` : 'Wallet Adjustment';
    }

    const baseAmount = toFiniteNumber(tx.amount, 0);
    const feeAmount = toFiniteNumber(tx.fee, 0);
    const netAmount = toFiniteNumber(tx.netAmount, baseAmount);
    const createdAt = tx.createdAt || new Date(0).toISOString();

    items.push({
      id: tx.id,
      sourceType: 'transaction',
      category,
      direction,
      title,
      description: tx.description || title,
      baseAmount: Number(baseAmount.toFixed(2)),
      bonusAmount: 0,
      feeAmount: Number(feeAmount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      currency: tx.currency || 'USD',
      status: String(tx.status || 'completed'),
      methodName: isReferral ? 'Referral Program' : 'Wallet Ledger',
      targetGameName: tx.targetGameName || tx.gameName,
      targetGameUsername: tx.targetGameUsername,
      referenceId: linkedId || tx.id,
      balanceAfter: tx.balanceAfter !== undefined ? toFiniteNumber(tx.balanceAfter, 0) : undefined,
      createdAt,
      updatedAt: createdAt,
      timestamp: createdAt,
    });
  }

  return items.sort((a, b) => {
    const aCreated = parseTimeMs(a.createdAt);
    const bCreated = parseTimeMs(b.createdAt);
    if (bCreated !== aCreated) return bCreated - aCreated;
    const aUpdated = parseTimeMs(a.updatedAt);
    const bUpdated = parseTimeMs(b.updatedAt);
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    return String(b.id).localeCompare(String(a.id));
  });
}

export function filterUnifiedWalletActivity(
  items: UnifiedWalletActivityItem[],
  options: { category?: WalletActivityFilter; searchTerm?: string }
): UnifiedWalletActivityItem[] {
  const category = options.category || 'all';
  const query = (options.searchTerm || '').trim().toLowerCase();

  return (items || []).filter((item) => {
    if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (!query) return true;

    const haystacks = [
      item.id,
      item.referenceId,
      item.payoutReference,
      item.title,
      item.description,
      item.methodName,
      item.targetGameName,
      item.targetGameUsername,
      item.status,
      item.reviewNotes,
      item.reviewerName,
    ];
    return haystacks.some((val) => typeof val === 'string' && val.toLowerCase().includes(query));
  });
}

export function getActivityStatusMeta(status?: string): ActivityStatusMeta {
  const s = String(status || 'submitted').trim().toLowerCase();
  switch (s) {
    case 'completed':
      return {
        label: 'Completed',
        textClass: 'text-emerald-400',
        badgeClass: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-400',
      };
    case 'approved':
      return {
        label: 'Approved',
        textClass: 'text-emerald-400',
        badgeClass: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-400',
      };
    case 'processing':
      return {
        label: 'Processing',
        textClass: 'text-cyan-400',
        badgeClass: 'border-cyan-500/30 bg-cyan-950/50 text-cyan-400',
      };
    case 'verifying':
    case 'pending_verification':
      return {
        label: 'Verifying',
        textClass: 'text-amber-400',
        badgeClass: 'border-amber-500/30 bg-amber-950/50 text-amber-400',
      };
    case 'submitted':
    case 'pending':
      return {
        label: s === 'pending' ? 'Pending' : 'Submitted',
        textClass: 'text-amber-300',
        badgeClass: 'border-amber-500/30 bg-amber-950/50 text-amber-300',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        textClass: 'text-rose-400',
        badgeClass: 'border-rose-500/30 bg-rose-950/50 text-rose-400',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        textClass: 'text-slate-400',
        badgeClass: 'border-slate-700 bg-slate-900 text-slate-400',
      };
    case 'reversed':
    case 'failed':
      return {
        label: s === 'failed' ? 'Failed' : 'Reversed',
        textClass: 'text-rose-400',
        badgeClass: 'border-rose-500/30 bg-rose-950/50 text-rose-400',
      };
    default:
      return {
        label: s.replace(/_/g, ' '),
        textClass: 'text-slate-300',
        badgeClass: 'border-slate-700 bg-slate-900 text-slate-300',
      };
  }
}

export function getDefaultBonusPercentageForMethod(
  method: string,
  configuredMethods?: Array<{ type: string; bonusPercentage?: number }>
): number {
  const normalized = String(method || '').trim().toLowerCase();
  const match = (configuredMethods || []).find(
    (m) => String(m.type || '').trim().toLowerCase() === normalized
  );
  if (match && typeof match.bonusPercentage === 'number' && Number.isFinite(match.bonusPercentage)) {
    return Math.max(0, Number(match.bonusPercentage));
  }
  switch (normalized) {
    case 'cashapp':
      return 30;
    case 'crypto':
      return 30;
    case 'payment_link':
      return 20;
    case 'chime':
      return 15;
    case 'manual_receipt':
    case 'manual_support':
      return 0;
    default:
      return 0;
  }
}

export function computeCumulativeCompletedWithdrawals(
  withdrawals: WithdrawalRequest[],
  customerId: string
): number {
  const total = (withdrawals || [])
    .filter((w) => {
      if (!w || w.customerId !== customerId) return false;
      const s = String(w.status || '').trim().toLowerCase();
      return s === 'completed' || s === 'approved';
    })
    .reduce((sum, w) => sum + toFiniteNumber(w.amount, 0), 0);
  return Number(total.toFixed(2));
}

export interface StaffTopUpDraftParams {
  customerId: string;
  customerName: string;
  reviewerId: string;
  reviewerName: string;
  amount: number;
  bonusPercentage?: number;
  feePercentage?: number;
  method: string;
  methodName: string;
  targetGameCatalogId?: string;
  targetGameName?: string;
  targetGameUsername?: string;
  providerRef?: string;
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  status: 'completed' | 'submitted';
  currency?: string;
  nowIso?: string;
  requestId?: string;
}

export interface StaffTopUpDraftResult {
  valid: boolean;
  error?: string;
  request?: TopUpRequest;
  chatTransactionData?: Record<string, any>;
}

export function buildStaffTopUpDraft(params: StaffTopUpDraftParams): StaffTopUpDraftResult {
  const amount = Number(toFiniteNumber(params.amount, 0).toFixed(2));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Deposit amount must be greater than $0.00.' };
  }

  const bonusPercentage =
    params.bonusPercentage !== undefined
      ? Math.max(0, toFiniteNumber(params.bonusPercentage, 0))
      : getDefaultBonusPercentageForMethod(params.method);

  if (!Number.isFinite(bonusPercentage) || bonusPercentage < 0 || bonusPercentage > 500) {
    return { valid: false, error: 'Bonus percentage must be between 0% and 500%.' };
  }

  const feePct = Math.max(0, toFiniteNumber(params.feePercentage, 0));
  const bonusAmount = Number(((amount * bonusPercentage) / 100).toFixed(2));
  const feeAmount = Number(((amount * feePct) / 100).toFixed(2));
  const finalWalletCredit = Number((amount + bonusAmount).toFixed(2));

  const nowIso = params.nowIso || new Date().toISOString();
  const requestId = params.requestId || `req_topup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const isCompleted = params.status === 'completed';
  const cleanNotes =
    (params.notes || '').trim() ||
    (isCompleted
      ? 'Direct deposit logged & finalized by support specialist.'
      : 'Pending deposit request created by support specialist.');
  const cleanRef = (params.providerRef || '').trim() || undefined;
  const cleanGameName = (params.targetGameName || '').trim() || undefined;
  const cleanGameUsername = (params.targetGameUsername || '').trim() || undefined;

  const request: TopUpRequest = {
    id: requestId,
    customerId: params.customerId,
    customerName: params.customerName,
    amount,
    currency: params.currency || 'USD',
    method: params.method as any,
    methodName: params.methodName || 'Direct Support Desk',
    targetGameCatalogId: (params.targetGameCatalogId || '').trim() || undefined,
    targetGameName: cleanGameName,
    targetGameUsername: cleanGameUsername,
    fundingSource: 'payment_method',
    providerRef: cleanRef,
    receiptUrl: (params.receiptUrl || '').trim() || undefined,
    receiptName: (params.receiptName || '').trim() || undefined,
    bonusAmount,
    bonusPercentage,
    feeAmount,
    finalWalletCredit,
    status: params.status,
    reviewerId: isCompleted ? params.reviewerId : undefined,
    reviewerName: isCompleted ? params.reviewerName : undefined,
    reviewNotes: cleanNotes,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const chatTransactionData = {
    transactionType: 'topup',
    requestId,
    gameName: cleanGameName,
    gameUsername: cleanGameUsername,
    amount,
    bonusAmount,
    bonusPercentage,
    finalCredit: finalWalletCredit,
    methodName: request.methodName,
    status: isCompleted ? 'completed' : 'pending',
    proofUrl: request.receiptUrl,
    proofName: request.receiptName,
    details: cleanRef,
    notes: cleanNotes,
    approvedBy: isCompleted ? params.reviewerName : undefined,
    approvedAt: isCompleted ? nowIso : undefined,
  };

  return { valid: true, request, chatTransactionData };
}

export interface StaffWithdrawalDraftParams {
  customerId: string;
  customerName: string;
  reviewerId: string;
  reviewerName: string;
  amount: number;
  feeAmount?: number;
  method: string;
  methodName: string;
  payoutHandle?: string;
  payoutReference?: string;
  sourceGameCatalogId?: string;
  sourceGameName?: string;
  sourceGameUsername?: string;
  notes?: string;
  status: 'completed' | 'submitted';
  currency?: string;
  nowIso?: string;
  requestId?: string;
}

export interface StaffWithdrawalDraftResult {
  valid: boolean;
  error?: string;
  request?: WithdrawalRequest;
  chatTransactionData?: Record<string, any>;
}

export function buildStaffWithdrawalDraft(
  params: StaffWithdrawalDraftParams
): StaffWithdrawalDraftResult {
  const amount = Number(toFiniteNumber(params.amount, 0).toFixed(2));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Cashout amount must be greater than $0.00.' };
  }

  const feeAmount = Number(Math.max(0, toFiniteNumber(params.feeAmount, 0)).toFixed(2));
  if (feeAmount >= amount) {
    return { valid: false, error: 'Fee amount cannot equal or exceed the gross cashout amount.' };
  }

  const netPayout = Number((amount - feeAmount).toFixed(2));
  const nowIso = params.nowIso || new Date().toISOString();
  const requestId = params.requestId || `req_wdr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const isCompleted = params.status === 'completed';

  const cleanGameCatalogId = (params.sourceGameCatalogId || '').trim() || undefined;
  const cleanGameName = (params.sourceGameName || '').trim() || undefined;
  const cleanGameUsername = (params.sourceGameUsername || '').trim() || undefined;
  const cleanHandle = (params.payoutHandle || '').trim() || undefined;
  const cleanPayoutRef =
    (params.payoutReference || '').trim() ||
    (isCompleted ? `STAFF_PAY_${Date.now().toString(36).toUpperCase()}` : undefined);
  const cleanNotes =
    (params.notes || '').trim() ||
    (isCompleted
      ? 'Emergency cashout logged & completed by support specialist.'
      : 'Emergency cashout request created by support specialist.');

  const payoutDetails: Record<string, any> = {
    methodType: params.method,
    collectedBySupport: true,
    createdByStaff: true,
    bypassedDepositLock: true,
    reservedAmount: amount,
    ...(cleanHandle ? { payoutHandle: cleanHandle } : {}),
    ...(params.method === 'cashapp' && cleanHandle ? { cashtag: cleanHandle } : {}),
    ...(params.method === 'chime' && cleanHandle ? { chimeHandle: cleanHandle } : {}),
    ...(params.method === 'crypto' && cleanHandle ? { cryptoAddress: cleanHandle } : {}),
    ...(params.method === 'payment_link' && cleanHandle ? { linkAccountRef: cleanHandle } : {}),
    ...(cleanGameCatalogId ? { sourceGameCatalogId: cleanGameCatalogId } : {}),
    ...(cleanGameName ? { sourceGameName: cleanGameName } : {}),
    ...(cleanGameUsername ? { sourceGameUsername: cleanGameUsername } : {}),
    playerNotes: cleanNotes,
  };

  const timeline = [
    {
      status: 'submitted',
      note: `Created by ${params.reviewerName} via Admin Support Chat (${params.methodName}${cleanHandle ? ` • ${cleanHandle}` : ''}).`,
      timestamp: nowIso,
      actorName: params.reviewerName,
    },
    ...(isCompleted
      ? [
          {
            status: 'completed',
            note: cleanNotes,
            timestamp: nowIso,
            actorName: params.reviewerName,
          },
        ]
      : []),
  ];

  const request: WithdrawalRequest = {
    id: requestId,
    customerId: params.customerId,
    customerName: params.customerName,
    amount,
    currency: params.currency || 'USD',
    feeAmount,
    netPayout,
    reservedAmount: amount,
    method: params.method || 'manual_support',
    methodName: params.methodName || 'Customer Support Manual Payout',
    sourceGameCatalogId: cleanGameCatalogId,
    sourceGameName: cleanGameName,
    sourceGameUsername: cleanGameUsername,
    playerNotes: cleanNotes,
    payoutDetails,
    status: params.status,
    reviewerId: isCompleted ? params.reviewerId : undefined,
    reviewerName: isCompleted ? params.reviewerName : undefined,
    reviewNotes: cleanNotes,
    payoutReference: cleanPayoutRef,
    timeline,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const chatTransactionData = {
    transactionType: 'withdrawal',
    requestId,
    gameName: cleanGameName,
    gameUsername: cleanGameUsername,
    amount,
    methodName: request.methodName,
    status: isCompleted ? 'completed' : 'pending',
    details: [cleanHandle, cleanPayoutRef].filter(Boolean).join(' • ') || undefined,
    notes: cleanNotes,
    approvedBy: isCompleted ? params.reviewerName : undefined,
    approvedAt: isCompleted ? nowIso : undefined,
  };

  return { valid: true, request, chatTransactionData };
}

