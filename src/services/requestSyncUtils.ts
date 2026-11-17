import type { TopUpRequest, WithdrawalRequest } from '../types';

function readOptionalString(source: any, key: string): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const val = source[key];
  return typeof val === 'string' && val.trim() ? val : undefined;
}

export function mapDbWithdrawalRowToRequest(
  w: any,
  existing?: WithdrawalRequest
): WithdrawalRequest {
  const rawPayoutDetails =
    w.payout_details && typeof w.payout_details === 'object' ? w.payout_details : {};

  const existingTimeline = Array.isArray(existing?.timeline)
    ? [...existing.timeline]
    : [];

  const amount = Number(w.amount ?? existing?.amount ?? 0);
  const feeAmount = Number(w.fee ?? existing?.feeAmount ?? 0);
  const netPayout = Number(w.net_amount ?? existing?.netPayout ?? amount);

  return {
    id: String(w.id),
    customerId: String(w.customer_id ?? existing?.customerId ?? ''),
    customerName: String(w.customer_name ?? existing?.customerName ?? 'Customer'),
    amount,
    currency: existing?.currency || 'USD',
    feeAmount,
    netPayout,
    reservedAmount:
      typeof rawPayoutDetails.reservedAmount === 'number'
        ? rawPayoutDetails.reservedAmount
        : existing?.reservedAmount ?? amount,
    method: w.payout_method_id || existing?.method || 'bank_transfer',
    methodName: w.payout_method_name || existing?.methodName || 'Bank Transfer',
    sourceGameCatalogId:
      readOptionalString(rawPayoutDetails, 'sourceGameCatalogId') ??
      existing?.sourceGameCatalogId,
    sourceGameName:
      readOptionalString(rawPayoutDetails, 'sourceGameName') ?? existing?.sourceGameName,
    sourceGameUsername:
      readOptionalString(rawPayoutDetails, 'sourceGameUsername') ??
      existing?.sourceGameUsername,
    playerNotes:
      readOptionalString(rawPayoutDetails, 'playerNotes') ?? existing?.playerNotes,
    payoutDetails:
      Object.keys(rawPayoutDetails).length > 0
        ? rawPayoutDetails
        : existing?.payoutDetails || {},
    status: w.status || existing?.status || 'submitted',
    reviewerId: w.reviewer_id ?? existing?.reviewerId ?? undefined,
    reviewerName: w.reviewer_name ?? existing?.reviewerName ?? undefined,
    reviewNotes: w.review_notes ?? existing?.reviewNotes ?? undefined,
    payoutReference: w.transaction_hash ?? existing?.payoutReference ?? undefined,
    timeline: existingTimeline,
    createdAt: w.created_at || existing?.createdAt || new Date().toISOString(),
    updatedAt: w.updated_at || w.created_at || existing?.updatedAt || new Date().toISOString(),
  };
}

export function mergeWithdrawalRequests(
  current: WithdrawalRequest[],
  rows: any[],
  replaceAll: boolean = false
): WithdrawalRequest[] {
  const existingById = new Map<string, WithdrawalRequest>();
  for (const w of current || []) {
    if (w && w.id) existingById.set(w.id, w);
  }

  const withMap = new Map<string, WithdrawalRequest>();
  if (!replaceAll) {
    for (const w of current || []) {
      if (w && w.id) withMap.set(w.id, w);
    }
  }

  for (const row of rows || []) {
    if (!row || !row.id) continue;
    if (row.deleted_at) {
      withMap.delete(row.id);
      continue;
    }
    const existing = withMap.get(row.id) || existingById.get(row.id);
    withMap.set(row.id, mapDbWithdrawalRowToRequest(row, existing));
  }

  return Array.from(withMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function mapDbTopupRowToRequest(t: any, existing?: TopUpRequest): TopUpRequest {
  const amount = Number(t.amount ?? existing?.amount ?? 0);
  const bonusAmount = Number(t.bonus_amount ?? existing?.bonusAmount ?? 0);

  return {
    id: String(t.id),
    customerId: String(t.customer_id ?? existing?.customerId ?? ''),
    customerName: String(t.customer_name ?? existing?.customerName ?? 'Customer'),
    amount,
    currency: existing?.currency || 'USD',
    bonusAmount,
    bonusPercentage: existing?.bonusPercentage || 0,
    feeAmount: existing?.feeAmount || 0,
    finalWalletCredit: amount + bonusAmount,
    method: (t.payment_method_id as any) || existing?.method || 'payment_link',
    methodName: t.payment_method_name || existing?.methodName || 'Payment Link',
    status: t.status || existing?.status || 'submitted',
    receiptUrl: t.proof_url ?? existing?.receiptUrl ?? undefined,
    receiptName: existing?.receiptName,
    targetGameName: t.target_game_name ?? existing?.targetGameName ?? undefined,
    targetGameCatalogId: t.target_game_account_id ?? existing?.targetGameCatalogId ?? undefined,
    targetGameUsername: existing?.targetGameUsername,
    fundingSource: existing?.fundingSource,
    reviewerId: t.reviewer_id ?? existing?.reviewerId ?? undefined,
    reviewerName: t.reviewer_name ?? existing?.reviewerName ?? undefined,
    reviewNotes: t.review_notes ?? existing?.reviewNotes ?? undefined,
    createdAt: t.created_at || existing?.createdAt || new Date().toISOString(),
    updatedAt: t.updated_at || t.created_at || existing?.updatedAt || new Date().toISOString(),
  };
}

export function mergeTopupRequests(
  current: TopUpRequest[],
  rows: any[],
  replaceAll: boolean = false
): TopUpRequest[] {
  const existingById = new Map<string, TopUpRequest>();
  for (const t of current || []) {
    if (t && t.id) existingById.set(t.id, t);
  }

  const topupMap = new Map<string, TopUpRequest>();
  if (!replaceAll) {
    for (const t of current || []) {
      if (t && t.id) topupMap.set(t.id, t);
    }
  }

  for (const row of rows || []) {
    if (!row || !row.id) continue;
    if (row.deleted_at) {
      topupMap.delete(row.id);
      continue;
    }
    const existing = topupMap.get(row.id) || existingById.get(row.id);
    topupMap.set(row.id, mapDbTopupRowToRequest(row, existing));
  }

  return Array.from(topupMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function findRequestById<T extends { id: string }>(
  items: T[],
  requestId: string
): T | undefined {
  const normalized = (requestId || '').trim();
  if (!normalized) return undefined;
  return items.find((item) => item.id === normalized);
}
