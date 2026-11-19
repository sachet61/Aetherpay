import {
  calculateReferralPayouts,
  checkReferralBudgetCaps,
  computeTopReferrers,
  evaluateReferralFraudSignals,
  isRealCashTopUpRow,
  isValidVanityReferralCode,
  normalizeReferralCodeInput,
  normalizeReferralConfig,
  normalizeReferralLedgerRow,
} from '../src/utils/referralUtils.js';
import type {
  ReferralLedgerEntry,
  ReferralPayoutTarget,
  ReferralProgramConfig,
  ReferredUser,
} from '../src/types';

export interface ReferralCallerProfile {
  id: string;
  email?: string;
  displayName: string;
  role: 'admin' | 'agent' | 'customer' | 'anonymous';
  verifiedByJwt: boolean;
  jwtRejected?: boolean;
}

export interface ReferralAuditInput {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface ReferralHandlerDeps {
  adminClient: any;
  resolveCaller: (
    adminClient: any,
    context?: { headers?: Record<string, any>; viewerUserId?: string }
  ) => Promise<ReferralCallerProfile>;
  writeAudit: (adminClient: any, input: ReferralAuditInput) => Promise<any>;
}

function setNoStoreHeaders(res: any) {
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }
}

function extractClientIp(req: any): string {
  const fwd = String(req?.headers?.['x-forwarded-for'] || '').trim();
  if (fwd) {
    return fwd.split(',')[0].trim();
  }
  const realIp = String(req?.headers?.['x-real-ip'] || '').trim();
  if (realIp) return realIp;
  return String(req?.socket?.remoteAddress || '').trim();
}

function isSchemaMissingError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === '42P01' ||
    code === '42703' ||
    msg.includes('referral_awards') && (msg.includes('does not exist') || msg.includes('schema cache'))
  );
}

async function loadReferralProgramConfig(adminClient: any): Promise<ReferralProgramConfig> {
  try {
    const { data } = await adminClient
      .from('app_config')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();
    return normalizeReferralConfig(data?.data?.referralProgram);
  } catch {
    return normalizeReferralConfig(undefined);
  }
}

async function creditPlayerWallet(params: {
  adminClient: any;
  customerId: string;
  amount: number;
  target: ReferralPayoutTarget;
  txId: string;
  idempotencyKey: string;
  description: string;
  referenceId: string;
  notificationTitle: string;
  notificationMessage: string;
  linkTab?: string;
}): Promise<{
  ok: boolean;
  credited: boolean;
  alreadyCredited: boolean;
  error?: string;
  balanceAfter?: number;
}> {
  const { adminClient, customerId, amount, target } = params;
  const roundedAmount = Number((Number(amount) || 0).toFixed(2));
  if (!customerId || roundedAmount <= 0) {
    return { ok: true, credited: false, alreadyCredited: false };
  }

  // 1. Strict idempotency + atomic lock check BEFORE touching wallet balance
  const { data: existingById, error: txLookupErr } = await adminClient
    .from('transactions')
    .select('id, amount, status, created_at')
    .eq('id', params.txId)
    .maybeSingle();

  if (txLookupErr) {
    return {
      ok: false,
      credited: false,
      alreadyCredited: false,
      error: txLookupErr.message || 'Failed to verify existing referral transaction.',
    };
  }
  if (existingById && String(existingById.status || '').toLowerCase() === 'completed') {
    return { ok: true, credited: false, alreadyCredited: true };
  }

  const { data: existingByRefRows, error: refLookupErr } = await adminClient
    .from('transactions')
    .select('id, amount, status, reference_id, type')
    .eq('customer_id', customerId)
    .eq('reference_id', params.referenceId)
    .eq('type', 'referral_reward')
    .limit(5);

  if (refLookupErr) {
    return {
      ok: false,
      credited: false,
      alreadyCredited: false,
      error: refLookupErr.message || 'Failed to verify referral ledger reference.',
    };
  }
  const hasCompletedRefTx = (Array.isArray(existingByRefRows) ? existingByRefRows : []).some(
    (r: any) => String(r?.status || '').toLowerCase() === 'completed'
  );
  if (hasCompletedRefTx) {
    return { ok: true, credited: false, alreadyCredited: true };
  }

  const nowIso = new Date().toISOString();
  const staleLockCutoffMs = Date.now() - 30_000;
  let claimedLock = false;

  if (existingById) {
    const existingStatus = String(existingById.status || '').toLowerCase();
    const existingTs = Date.parse(String(existingById.created_at || '')) || 0;
    if (existingStatus === 'processing' && existingTs > staleLockCutoffMs) {
      await new Promise((r) => setTimeout(r, 80));
      const { data: afterWait } = await adminClient
        .from('transactions')
        .select('id, status')
        .eq('id', params.txId)
        .maybeSingle();
      if (afterWait && String(afterWait.status || '').toLowerCase() === 'completed') {
        return { ok: true, credited: false, alreadyCredited: true };
      }
      return {
        ok: false,
        credited: false,
        alreadyCredited: false,
        error: 'Concurrent referral credit in progress.',
      };
    }

    const { error: reclaimErr } = await adminClient
      .from('transactions')
      .update({
        customer_id: customerId,
        amount: roundedAmount,
        type: 'referral_reward',
        status: 'processing',
        description: params.description,
        reference_id: params.referenceId,
        game_name: 'Swift Sweeps Referral',
        created_at: nowIso,
      })
      .eq('id', params.txId);

    if (reclaimErr) {
      return {
        ok: false,
        credited: false,
        alreadyCredited: false,
        error: reclaimErr.message || 'Failed to reclaim stale referral transaction lock.',
      };
    }
    claimedLock = true;
  } else {
    const { error: lockErr } = await adminClient.from('transactions').insert({
      id: params.txId,
      customer_id: customerId,
      amount: roundedAmount,
      type: 'referral_reward',
      status: 'processing',
      description: params.description,
      reference_id: params.referenceId,
      game_name: 'Swift Sweeps Referral',
      created_at: nowIso,
    });

    if (lockErr) {
      const code = String(lockErr?.code || '');
      const msg = String(lockErr?.message || '').toLowerCase();
      if (code === '23505' || msg.includes('duplicate')) {
        await new Promise((r) => setTimeout(r, 80));
        const { data: racedTx } = await adminClient
          .from('transactions')
          .select('id, status')
          .eq('id', params.txId)
          .maybeSingle();
        if (racedTx && String(racedTx.status || '').toLowerCase() === 'completed') {
          return { ok: true, credited: false, alreadyCredited: true };
        }
        return {
          ok: false,
          credited: false,
          alreadyCredited: false,
          error: 'Concurrent referral credit in progress.',
        };
      }
      return {
        ok: false,
        credited: false,
        alreadyCredited: false,
        error: lockErr.message || 'Failed to acquire referral transaction lock.',
      };
    }
    claimedLock = true;
  }

  const releaseLockRow = async () => {
    if (!claimedLock) return;
    try {
      const txTable = adminClient.from('transactions');
      if (typeof txTable?.delete === 'function') {
        await txTable.delete().eq('id', params.txId).eq('status', 'processing');
      } else {
        await txTable.update({ status: 'failed' }).eq('id', params.txId).eq('status', 'processing');
      }
    } catch {}
  };

  // 2. Read current wallet state cleanly
  const { data: wallet, error: wReadErr } = await adminClient
    .from('wallets')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (wReadErr) {
    await releaseLockRow();
    return {
      ok: false,
      credited: false,
      alreadyCredited: false,
      error: wReadErr.message || 'Failed to read customer wallet.',
    };
  }

  const currentCash = Number(wallet?.balance ?? wallet?.available_balance ?? 0);
  const currentRefBonus = Number(wallet?.referral_bonus_balance ?? 0);

  let effectiveTarget: ReferralPayoutTarget = target;
  let nextCash =
    effectiveTarget === 'available_balance'
      ? Number((currentCash + roundedAmount).toFixed(2))
      : currentCash;
  let nextRefBonus =
    effectiveTarget === 'referral_bonus'
      ? Number((currentRefBonus + roundedAmount).toFixed(2))
      : currentRefBonus;

  if (wallet) {
    const updatePayload: Record<string, any> = {
      updated_at: nowIso,
    };
    if (effectiveTarget === 'available_balance') {
      updatePayload.balance = nextCash;
    } else {
      updatePayload.referral_bonus_balance = nextRefBonus;
    }
    let { error: wErr } = await adminClient
      .from('wallets')
      .update(updatePayload)
      .eq('customer_id', customerId);

    if (wErr && String(wErr.message || '').includes('referral_bonus_balance')) {
      effectiveTarget = 'available_balance';
      nextCash = Number((currentCash + roundedAmount).toFixed(2));
      nextRefBonus = currentRefBonus;
      const retryRes = await adminClient
        .from('wallets')
        .update({ balance: nextCash, updated_at: nowIso })
        .eq('customer_id', customerId);
      wErr = retryRes.error;
    }

    if (wErr) {
      await releaseLockRow();
      return {
        ok: false,
        credited: false,
        alreadyCredited: false,
        error: wErr.message || 'Failed to update customer wallet.',
      };
    }
  } else {
    const insertPayload: Record<string, any> = {
      customer_id: customerId,
      balance: nextCash,
      referral_bonus_balance: nextRefBonus,
      pending_withdrawal: 0,
      pending_deposit: 0,
      total_deposited: 0,
      total_withdrawn: 0,
      currency: 'USD',
      updated_at: nowIso,
    };
    let { error: iErr } = await adminClient.from('wallets').insert(insertPayload);
    if (iErr && String(iErr.message || '').includes('referral_bonus_balance')) {
      effectiveTarget = 'available_balance';
      nextCash = Number((currentCash + roundedAmount).toFixed(2));
      nextRefBonus = currentRefBonus;
      delete insertPayload.referral_bonus_balance;
      insertPayload.balance = nextCash;
      const retryInsert = await adminClient.from('wallets').insert(insertPayload);
      iErr = retryInsert.error;
    }
    if (iErr) {
      await releaseLockRow();
      return {
        ok: false,
        credited: false,
        alreadyCredited: false,
        error: iErr.message || 'Failed to create customer wallet.',
      };
    }
  }

  // 3. Finalize authoritative transaction ledger record; rollback wallet & lock on failure
  const { error: txErr } = await adminClient
    .from('transactions')
    .update({
      customer_id: customerId,
      amount: roundedAmount,
      type: 'referral_reward',
      status: 'completed',
      description: params.description,
      reference_id: params.referenceId,
      game_name: 'Swift Sweeps Referral',
      created_at: nowIso,
    })
    .eq('id', params.txId);

  if (txErr) {
    // Compensating rollback to preserve wallet/ledger consistency
    try {
      const rollbackPayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (effectiveTarget === 'available_balance') {
        rollbackPayload.balance = currentCash;
      } else {
        rollbackPayload.referral_bonus_balance = currentRefBonus;
      }
      await adminClient.from('wallets').update(rollbackPayload).eq('customer_id', customerId);
    } catch {}
    await releaseLockRow();
    return {
      ok: false,
      credited: false,
      alreadyCredited: false,
      error: txErr.message || 'Failed to record referral transaction.',
    };
  }

  // 4. Deterministic notification upsert (prevents duplicate notifications on retry)
  try {
    await adminClient.from('notifications').upsert({
      id: `notif_${params.txId}`,
      user_id: customerId,
      title: params.notificationTitle,
      message: params.notificationMessage,
      type: 'referral',
      read: false,
      link_tab: params.linkTab || 'referrals',
      link_request_id: params.referenceId,
      created_at: nowIso,
    });
  } catch {}

  return {
    ok: true,
    credited: true,
    alreadyCredited: false,
    balanceAfter: effectiveTarget === 'available_balance' ? nextCash : nextRefBonus,
  };
}

function isRpcUnavailableError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('could not find the function') ||
    msg.includes('credit_referral_award_atomic') && msg.includes('does not exist')
  );
}

async function awardReferralAtomically(params: {
  adminClient: any;
  awardId: string;
  referrerId: string;
  refereeId: string;
  referralCodeUsed: string;
  source: string;
  rewardMode: string;
  payoutTarget: ReferralPayoutTarget;
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  qualifyingDepositId?: string | null;
  qualifyingDepositAmount: number;
  fraudFlags: string[];
  staffReason?: string | null;
  assignedBy?: string | null;
  assignedByName?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  referrerDescription: string;
  refereeDescription: string;
  referrerNotifTitle: string;
  referrerNotifMessage: string;
  refereeNotifTitle: string;
  refereeNotifMessage: string;
  existingRewardedAt?: string | null;
}): Promise<{ ok: boolean; status: 'rewarded' | 'processing'; awardRow?: any; error?: string }> {
  const nowIso = new Date().toISOString();
  const refTxId = `tx_ref_r_${params.awardId}`;
  const eeTxId = `tx_ref_f_${params.awardId}`;

  // Step 0: Guard against downgrading an already-rewarded award during concurrent requests
  const { data: preExistingAward } = await params.adminClient
    .from('referral_awards')
    .select('*')
    .eq('id', params.awardId)
    .maybeSingle();

  if (preExistingAward?.status === 'rewarded') {
    return { ok: true, status: 'rewarded', awardRow: preExistingAward };
  }

  // Step 1: Ensure non-rewarded 'processing' row exists BEFORE crediting wallets
  const processingPayload: Record<string, any> = {
    id: params.awardId,
    referrer_id: params.referrerId,
    referee_id: params.refereeId,
    referral_code_used: params.referralCodeUsed,
    source: params.source,
    reward_mode: params.rewardMode,
    payout_target: params.payoutTarget,
    referrer_reward_amount: params.referrerRewardAmount,
    referee_reward_amount: params.refereeRewardAmount,
    qualifying_deposit_id: params.qualifyingDepositId || null,
    qualifying_deposit_amount: params.qualifyingDepositAmount,
    status: 'processing',
    fraud_flags: params.fraudFlags,
    updated_at: nowIso,
  };
  if (params.staffReason !== undefined) processingPayload.staff_reason = params.staffReason;
  if (params.assignedBy !== undefined) processingPayload.assigned_by = params.assignedBy;
  if (params.assignedByName !== undefined) processingPayload.assigned_by_name = params.assignedByName;
  if (params.reviewedBy !== undefined) processingPayload.reviewed_by = params.reviewedBy;
  if (params.reviewedByName !== undefined) processingPayload.reviewed_by_name = params.reviewedByName;
  if (params.reviewNotes !== undefined) processingPayload.review_notes = params.reviewNotes;

  if (preExistingAward) {
    const { data: claimedRows, error: prepErr } = await params.adminClient
      .from('referral_awards')
      .update(processingPayload)
      .eq('id', params.awardId)
      .neq('status', 'rewarded')
      .select();

    if (prepErr) {
      return {
        ok: false,
        status: 'processing',
        error: prepErr.message || 'Failed to prepare referral award record.',
      };
    }
    if (!Array.isArray(claimedRows) || claimedRows.length === 0) {
      const { data: winner } = await params.adminClient
        .from('referral_awards')
        .select('*')
        .eq('id', params.awardId)
        .maybeSingle();
      if (winner?.status === 'rewarded') {
        return { ok: true, status: 'rewarded', awardRow: winner };
      }
    }
  } else {
    const { error: prepErr } = await params.adminClient
      .from('referral_awards')
      .insert({ ...processingPayload, created_at: nowIso });

    if (prepErr) {
      const code = String(prepErr?.code || '');
      const msg = String(prepErr?.message || '').toLowerCase();
      if (code === '23505' || msg.includes('duplicate')) {
        await new Promise((r) => setTimeout(r, 90));
        const { data: racedAward } = await params.adminClient
          .from('referral_awards')
          .select('*')
          .eq('id', params.awardId)
          .maybeSingle();
        if (racedAward?.status === 'rewarded') {
          return { ok: true, status: 'rewarded', awardRow: racedAward };
        }
      } else {
        return {
          ok: false,
          status: 'processing',
          error: prepErr.message || 'Failed to prepare referral award record.',
        };
      }
    }
  }

  // Step 2: Prefer atomic PostgreSQL PL/pgSQL transaction RPC when deployed
  if (typeof params.adminClient?.rpc === 'function') {
    try {
      const rpcRes = await params.adminClient.rpc('credit_referral_award_atomic', {
        p_award_id: params.awardId,
        p_referrer_id: params.referrerId,
        p_referee_id: params.refereeId,
        p_payout_target: params.payoutTarget,
        p_referrer_amount: params.referrerRewardAmount,
        p_referee_amount: params.refereeRewardAmount,
        p_referrer_tx_id: refTxId,
        p_referee_tx_id: eeTxId,
        p_referrer_desc: params.referrerDescription,
        p_referee_desc: params.refereeDescription,
        p_referrer_notif_title: params.referrerNotifTitle,
        p_referrer_notif_msg: params.referrerNotifMessage,
        p_referee_notif_title: params.refereeNotifTitle,
        p_referee_notif_msg: params.refereeNotifMessage,
        p_qualifying_deposit_id: params.qualifyingDepositId || null,
        p_qualifying_deposit_amount: params.qualifyingDepositAmount,
        p_reward_mode: params.rewardMode,
        p_reviewed_by: params.reviewedBy || null,
        p_reviewed_by_name: params.reviewedByName || null,
        p_review_notes: params.reviewNotes || null,
        p_fraud_flags: params.fraudFlags,
      });

      if (!rpcRes?.error) {
        const { data: finalized } = await params.adminClient
          .from('referral_awards')
          .select('*')
          .eq('id', params.awardId)
          .maybeSingle();
        return { ok: true, status: 'rewarded', awardRow: finalized || processingPayload };
      }

      if (!isRpcUnavailableError(rpcRes.error)) {
        return {
          ok: false,
          status: 'processing',
          error: rpcRes.error.message || 'Atomic referral payout RPC failed.',
        };
      }
    } catch (rpcErr: any) {
      if (!isRpcUnavailableError(rpcErr)) {
        return {
          ok: false,
          status: 'processing',
          error: rpcErr?.message || 'Atomic referral payout RPC failed.',
        };
      }
    }
  }

  // Step 3: Ordered idempotent fallback (never marks rewarded until all required credits succeed)
  if (params.referrerRewardAmount > 0) {
    const refCredit = await creditPlayerWallet({
      adminClient: params.adminClient,
      customerId: params.referrerId,
      amount: params.referrerRewardAmount,
      target: params.payoutTarget,
      txId: refTxId,
      idempotencyKey: `idemp_ref_r_${params.awardId}`,
      description: params.referrerDescription,
      referenceId: params.awardId,
      notificationTitle: params.referrerNotifTitle,
      notificationMessage: params.referrerNotifMessage,
      linkTab: 'referrals',
    });

    if (!refCredit.ok) {
      return {
        ok: false,
        status: 'processing',
        error: refCredit.error || 'Failed to credit referrer wallet.',
      };
    }
  }

  if (params.refereeRewardAmount > 0) {
    const eeCredit = await creditPlayerWallet({
      adminClient: params.adminClient,
      customerId: params.refereeId,
      amount: params.refereeRewardAmount,
      target: params.payoutTarget,
      txId: eeTxId,
      idempotencyKey: `idemp_ref_f_${params.awardId}`,
      description: params.refereeDescription,
      referenceId: params.awardId,
      notificationTitle: params.refereeNotifTitle,
      notificationMessage: params.refereeNotifMessage,
      linkTab: 'wallet',
    });

    if (!eeCredit.ok) {
      return {
        ok: false,
        status: 'processing',
        error: eeCredit.error || 'Failed to credit referee welcome bonus wallet.',
      };
    }
  }

  // Step 4: Mark status = 'rewarded' ONLY AFTER both wallet credits + ledger transactions succeeded
  const finalizedAt = params.existingRewardedAt || nowIso;
  const { data: rewardedRow, error: finalizeErr } = await params.adminClient
    .from('referral_awards')
    .update({
      status: 'rewarded',
      payout_target: params.payoutTarget,
      referrer_reward_amount: params.referrerRewardAmount,
      referee_reward_amount: params.refereeRewardAmount,
      qualifying_deposit_id: params.qualifyingDepositId || null,
      qualifying_deposit_amount: params.qualifyingDepositAmount,
      rewarded_at: finalizedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.awardId)
    .select()
    .maybeSingle();

  if (finalizeErr) {
    return {
      ok: false,
      status: 'processing',
      error: finalizeErr.message || 'Wallet credited, failed to finalize referral award status.',
    };
  }

  return {
    ok: true,
    status: 'rewarded',
    awardRow: rewardedRow || { ...processingPayload, status: 'rewarded', rewarded_at: finalizedAt },
  };
}

async function computeBudgetUsage(adminClient: any, referrerId: string) {
  const { data: refAwards } = await adminClient
    .from('referral_awards')
    .select('id, status, referrer_id, referrer_reward_amount, referee_reward_amount, rewarded_at')
    .eq('status', 'rewarded')
    .limit(500);

  const list = Array.isArray(refAwards) ? refAwards : [];
  const referrerRewardedCount = list.filter((a: any) => a.referrer_id === referrerId).length;
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const dailyTotalPaidToday = list
    .filter((a: any) => String(a.rewarded_at || '').startsWith(todayPrefix))
    .reduce(
      (sum: number, a: any) =>
        sum + Number(a.referrer_reward_amount || 0) + Number(a.referee_reward_amount || 0),
      0
    );

  return {
    referrerRewardedCount,
    dailyTotalPaidToday: Number(dailyTotalPaidToday.toFixed(2)),
  };
}

async function computeRefereeRealCashDeposits(adminClient: any, refereeId: string) {
  const { data: topups } = await adminClient
    .from('topups')
    .select('id, amount, status, payment_method_id, created_at, updated_at')
    .eq('customer_id', refereeId)
    .order('updated_at', { ascending: false })
    .limit(100);

  const realCash = (Array.isArray(topups) ? topups : []).filter((t: any) => isRealCashTopUpRow(t));
  const total = realCash.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const latest = realCash[0] || null;
  return {
    realDepositTotal: Number(total.toFixed(2)),
    qualifyingDepositId: latest?.id ? String(latest.id) : undefined,
    qualifyingDepositAmount: latest ? Number(latest.amount || 0) : 0,
  };
}

function getAwardCreditedStatus(
  awardId: string,
  txList: any[],
  referrerId?: string,
  refereeId?: string
): {
  referrerCredited: boolean;
  referrerAmount: number;
  referrerTxId?: string;
  refereeCredited: boolean;
  refereeAmount: number;
  refereeTxId?: string;
} {
  const expectedRefTxId = `tx_ref_r_${awardId}`;
  const expectedEeTxId = `tx_ref_f_${awardId}`;
  let referrerTx: any = null;
  let refereeTx: any = null;

  for (const tx of txList) {
    if (!tx || tx.type !== 'referral_reward' || String(tx.status || '').toLowerCase() !== 'completed') {
      continue;
    }
    if (tx.id === expectedRefTxId || (referrerId && tx.customer_id === referrerId && tx.reference_id === awardId && tx.id !== expectedEeTxId)) {
      referrerTx = tx;
    }
    if (tx.id === expectedEeTxId || (refereeId && tx.customer_id === refereeId && tx.reference_id === awardId && tx.id !== expectedRefTxId)) {
      refereeTx = tx;
    }
  }

  return {
    referrerCredited: Boolean(referrerTx),
    referrerAmount: referrerTx ? Number(referrerTx.amount || 0) : 0,
    referrerTxId: referrerTx?.id,
    refereeCredited: Boolean(refereeTx),
    refereeAmount: refereeTx ? Number(refereeTx.amount || 0) : 0,
    refereeTxId: refereeTx?.id,
  };
}

export async function reconcileMissingReferralRewards(
  deps: ReferralHandlerDeps,
  options?: {
    userId?: string;
    awardIds?: string[];
    limit?: number;
    actor?: { id: string; name: string; role: string };
  }
): Promise<{
  scanned: number;
  reconciledCount: number;
  skippedCount: number;
  details: Array<{
    awardId: string;
    referrerId: string;
    refereeId: string;
    referrerCredited: number;
    refereeCredited: number;
    walletBalanceRestored?: number;
    reason?: string;
  }>;
}> {
  const limit = Math.min(Math.max(Number(options?.limit || 50), 1), 200);
  const targetUserId = options?.userId ? String(options.userId).trim() : '';

  let candidateAwards: any[] = [];
  if (Array.isArray(options?.awardIds) && options!.awardIds!.length > 0) {
    const { data } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .in('id', options!.awardIds!)
      .limit(limit);
    candidateAwards = Array.isArray(data) ? data : [];
  } else if (targetUserId) {
    const [{ data: asReferrer }, { data: asReferee }] = await Promise.all([
      deps.adminClient
        .from('referral_awards')
        .select('*')
        .eq('referrer_id', targetUserId)
        .in('status', ['rewarded', 'processing'])
        .order('updated_at', { ascending: false })
        .limit(limit),
      deps.adminClient
        .from('referral_awards')
        .select('*')
        .eq('referee_id', targetUserId)
        .in('status', ['rewarded', 'processing'])
        .limit(5),
    ]);
    const seen = new Map<string, any>();
    for (const row of [...(asReferrer || []), ...(asReferee || [])]) {
      if (row?.id) seen.set(row.id, row);
    }
    candidateAwards = Array.from(seen.values());
  } else {
    const { data } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .in('status', ['rewarded', 'processing'])
      .order('updated_at', { ascending: false })
      .limit(limit);
    candidateAwards = Array.isArray(data) ? data : [];
  }

  if (candidateAwards.length === 0) {
    return { scanned: 0, reconciledCount: 0, skippedCount: 0, details: [] };
  }

  const config = await loadReferralProgramConfig(deps.adminClient);
  const participantIds = Array.from(
    new Set(candidateAwards.flatMap((a: any) => [a.referrer_id, a.referee_id]).filter(Boolean))
  );

  const [
    { data: participantUsers },
    { data: existingTxs },
    { data: participantWallets },
    { data: participantBonusLoads },
    { data: allParticipantAwardsAsReferrer },
    { data: allParticipantAwardsAsReferee },
    { data: participantBonusTopups },
  ] = await Promise.all([
    participantIds.length > 0
      ? deps.adminClient
          .from('users')
          .select('id, display_name, email, email_verified, referral_code, referred_by')
          .in('id', participantIds)
      : Promise.resolve({ data: [] }),
    participantIds.length > 0
      ? deps.adminClient
          .from('transactions')
          .select('id, customer_id, amount, type, status, reference_id, description')
          .in('customer_id', participantIds)
          .eq('type', 'referral_reward')
          .limit(500)
      : Promise.resolve({ data: [] }),
    participantIds.length > 0
      ? deps.adminClient
          .from('wallets')
          .select('customer_id, balance, referral_bonus_balance, currency, updated_at')
          .in('customer_id', participantIds)
      : Promise.resolve({ data: [] }),
    participantIds.length > 0
      ? deps.adminClient
          .from('transactions')
          .select('id, customer_id, amount, type, status, reference_id, description')
          .in('customer_id', participantIds)
          .eq('type', 'bonus')
          .limit(500)
      : Promise.resolve({ data: [] }),
    participantIds.length > 0
      ? deps.adminClient
          .from('referral_awards')
          .select('id, referrer_id, referee_id, status, payout_target')
          .in('referrer_id', participantIds)
          .eq('status', 'rewarded')
          .limit(500)
      : Promise.resolve({ data: [] }),
    participantIds.length > 0
      ? deps.adminClient
          .from('referral_awards')
          .select('id, referrer_id, referee_id, status, payout_target')
          .in('referee_id', participantIds)
          .eq('status', 'rewarded')
          .limit(500)
      : Promise.resolve({ data: [] }),
    participantIds.length > 0
      ? deps.adminClient
          .from('topups')
          .select('id, customer_id, amount, status, payment_method_id')
          .in('customer_id', participantIds)
          .eq('payment_method_id', 'referral_bonus')
          .limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  const usersById: Record<string, any> = {};
  for (const u of participantUsers || []) {
    usersById[u.id] = u;
  }
  const txsList = Array.isArray(existingTxs) ? existingTxs : [];
  const walletsByCustomer: Record<string, any> = {};
  for (const w of participantWallets || []) {
    if (w?.customer_id) walletsByCustomer[w.customer_id] = w;
  }
  const awardTargetById: Record<string, ReferralPayoutTarget> = {};
  for (const row of [
    ...candidateAwards,
    ...(allParticipantAwardsAsReferrer || []),
    ...(allParticipantAwardsAsReferee || []),
  ]) {
    if (row?.id) {
      awardTargetById[row.id] =
        row.payout_target === 'available_balance' ? 'available_balance' : 'referral_bonus';
    }
  }

  const details: Array<{
    awardId: string;
    referrerId: string;
    refereeId: string;
    referrerCredited: number;
    refereeCredited: number;
    walletBalanceRestored?: number;
    reason?: string;
  }> = [];
  const detailByAwardId = new Map<string, (typeof details)[number]>();
  const reconciledAwardIds = new Set<string>();
  let skippedCount = 0;

  for (const award of candidateAwards) {
    if (!award?.id || !award.referrer_id || !award.referee_id) continue;

    const referee = usersById[award.referee_id];
    const referrer = usersById[award.referrer_id];
    const depositProgress = await computeRefereeRealCashDeposits(deps.adminClient, award.referee_id);
    const effectiveDepositTotal = Math.max(
      Number(award.qualifying_deposit_amount || 0),
      depositProgress.realDepositTotal
    );

    const isStaffAuthorized =
      award.source === 'manual_link_and_reward' ||
      Boolean(award.reviewed_by) ||
      Boolean(award.assigned_by && award.source === 'manual_link_and_reward');
    const meetsQualification =
      effectiveDepositTotal >= config.qualificationDepositMin &&
      (!config.requireEmailVerified || Boolean(referee?.email_verified ?? true));

    const storedRefAmt = Number(award.referrer_reward_amount || 0);
    const storedEeAmt = Number(award.referee_reward_amount || 0);
    const calculated = calculateReferralPayouts(
      config,
      effectiveDepositTotal > 0 ? effectiveDepositTotal : config.qualificationDepositMin
    );

    // Verify entitlement before ever crediting missing rewards
    const entitled = isStaffAuthorized || meetsQualification || storedRefAmt > 0 || storedEeAmt > 0;
    if (!entitled) {
      skippedCount += 1;
      details.push({
        awardId: award.id,
        referrerId: award.referrer_id,
        refereeId: award.referee_id,
        referrerCredited: 0,
        refereeCredited: 0,
        reason: 'Not entitled (deposit/email/staff authorization criteria not met)',
      });
      continue;
    }

    const expectedRefAmt = storedRefAmt > 0 ? storedRefAmt : calculated.referrerAmount;
    const expectedEeAmt = storedEeAmt > 0 ? storedEeAmt : calculated.refereeAmount;
    const payoutTarget: ReferralPayoutTarget =
      award.payout_target === 'available_balance'
        ? 'available_balance'
        : award.payout_target === 'referral_bonus'
        ? 'referral_bonus'
        : config.payoutTarget;
    awardTargetById[award.id] = payoutTarget;

    const existingCredits = getAwardCreditedStatus(
      award.id,
      txsList,
      award.referrer_id,
      award.referee_id
    );

    const needsRefCredit = expectedRefAmt > 0 && !existingCredits.referrerCredited;
    const needsEeCredit = expectedEeAmt > 0 && !existingCredits.refereeCredited;

    if (!needsRefCredit && !needsEeCredit) {
      // Ensure processing award finishes transitioning to rewarded if both required legs are already paid
      if (award.status === 'processing') {
        await deps.adminClient
          .from('referral_awards')
          .update({
            status: 'rewarded',
            rewarded_at: award.rewarded_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', award.id);
      }
      continue;
    }

    let refCreditedAmt = 0;
    let eeCreditedAmt = 0;
    let legFailed = false;
    let legError = '';

    if (needsRefCredit) {
      const refRes = await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: award.referrer_id,
        amount: expectedRefAmt,
        target: payoutTarget,
        txId: `tx_ref_r_${award.id}`,
        idempotencyKey: `idemp_ref_r_${award.id}`,
        description: `Referral Reward Reconciliation (Award #${award.id.slice(-6)}): ${referee?.display_name || referee?.email || award.referee_id}`,
        referenceId: award.id,
        notificationTitle: 'Referral Reward Credited',
        notificationMessage: `Your missing $${expectedRefAmt.toFixed(2)} referral bonus for ${referee?.display_name || 'your referred friend'} has been credited to your wallet.`,
        linkTab: 'referrals',
      });
      if (refRes.ok && refRes.credited) {
        refCreditedAmt = expectedRefAmt;
        txsList.push({
          id: `tx_ref_r_${award.id}`,
          customer_id: award.referrer_id,
          amount: expectedRefAmt,
          type: 'referral_reward',
          status: 'completed',
          reference_id: award.id,
        });
        if (payoutTarget === 'referral_bonus') {
          const existingW = walletsByCustomer[award.referrer_id];
          walletsByCustomer[award.referrer_id] = {
            ...(existingW || { customer_id: award.referrer_id, balance: 0 }),
            referral_bonus_balance:
              refRes.balanceAfter ??
              Number((Number(existingW?.referral_bonus_balance ?? 0) + expectedRefAmt).toFixed(2)),
          };
        }
      } else if (!refRes.ok) {
        legFailed = true;
        legError = refRes.error || 'Referrer reconciliation failed';
      }
    }

    if (needsEeCredit) {
      const eeRes = await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: award.referee_id,
        amount: expectedEeAmt,
        target: payoutTarget,
        txId: `tx_ref_f_${award.id}`,
        idempotencyKey: `idemp_ref_f_${award.id}`,
        description: `Welcome Referral Bonus Reconciliation (Award #${award.id.slice(-6)}): Code ${award.referral_code_used}`,
        referenceId: award.id,
        notificationTitle: 'Welcome Referral Bonus Credited',
        notificationMessage: `Your $${expectedEeAmt.toFixed(2)} welcome referral bonus has been credited to your wallet!`,
        linkTab: 'wallet',
      });
      if (eeRes.ok && eeRes.credited) {
        eeCreditedAmt = expectedEeAmt;
        txsList.push({
          id: `tx_ref_f_${award.id}`,
          customer_id: award.referee_id,
          amount: expectedEeAmt,
          type: 'referral_reward',
          status: 'completed',
          reference_id: award.id,
        });
        if (payoutTarget === 'referral_bonus') {
          const existingW = walletsByCustomer[award.referee_id];
          walletsByCustomer[award.referee_id] = {
            ...(existingW || { customer_id: award.referee_id, balance: 0 }),
            referral_bonus_balance:
              eeRes.balanceAfter ??
              Number((Number(existingW?.referral_bonus_balance ?? 0) + expectedEeAmt).toFixed(2)),
          };
        }
      } else if (!eeRes.ok) {
        legFailed = true;
        legError = eeRes.error || 'Referee reconciliation failed';
      }
    }

    const nowIso = new Date().toISOString();
    if (!legFailed && (refCreditedAmt > 0 || eeCreditedAmt > 0 || award.status === 'processing')) {
      await deps.adminClient
        .from('referral_awards')
        .update({
          status: 'rewarded',
          payout_target: payoutTarget,
          referrer_reward_amount: expectedRefAmt,
          referee_reward_amount: expectedEeAmt,
          qualifying_deposit_id: depositProgress.qualifyingDepositId || award.qualifying_deposit_id || null,
          qualifying_deposit_amount: effectiveDepositTotal,
          rewarded_at: award.rewarded_at || nowIso,
          updated_at: nowIso,
        })
        .eq('id', award.id);
    }

    if (refCreditedAmt > 0 || eeCreditedAmt > 0) {
      reconciledAwardIds.add(award.id);
      const entry = {
        awardId: award.id,
        referrerId: award.referrer_id,
        refereeId: award.referee_id,
        referrerCredited: refCreditedAmt,
        refereeCredited: eeCreditedAmt,
        reason: legFailed ? legError : undefined,
      };
      details.push(entry);
      detailByAwardId.set(award.id, entry);

      await deps.writeAudit(deps.adminClient, {
        actorId: options?.actor?.id || 'system',
        actorName: options?.actor?.name || 'Referral Auto-Reconciler',
        actorRole: options?.actor?.role || 'admin',
        action: 'REFERRAL_REWARD_RECONCILED',
        entityType: 'referral',
        entityId: award.id,
        details: `Reconciled missing referral wallet credit(s) for award ${award.id} (Referrer ${referrer?.display_name || award.referrer_id}: +$${refCreditedAmt.toFixed(2)}, Friend ${referee?.display_name || award.referee_id}: +$${eeCreditedAmt.toFixed(2)}, target=${payoutTarget}).`,
      });
    } else if (legFailed) {
      skippedCount += 1;
      details.push({
        awardId: award.id,
        referrerId: award.referrer_id,
        refereeId: award.referee_id,
        referrerCredited: 0,
        refereeCredited: 0,
        reason: legError,
      });
    }
  }

  // Second pass: Wallet Ledger Integrity Reconciliation
  // Detects & heals desync where completed referral_reward transactions exist for referral_bonus
  // yet wallets.referral_bonus_balance was overwritten/zeroed (while subtracting legitimate game loads).
  const bonusLoadTxs = Array.isArray(participantBonusLoads) ? participantBonusLoads : [];
  const bonusTopups = Array.isArray(participantBonusTopups) ? participantBonusTopups : [];
  const participantsToVerify = targetUserId
    ? participantIds.filter((id) => id === targetUserId)
    : participantIds;

  for (const uid of participantsToVerify) {
    const userReferralCredits = txsList
      .filter((tx: any) => {
        if (!tx || tx.customer_id !== uid || tx.type !== 'referral_reward') return false;
        if (String(tx.status || '').toLowerCase() !== 'completed') return false;
        const target =
          (tx.reference_id && awardTargetById[tx.reference_id]) ||
          (config.payoutTarget === 'available_balance' ? 'available_balance' : 'referral_bonus');
        return target === 'referral_bonus';
      })
      .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);

    if (userReferralCredits <= 0) continue;

    const loadTxRefIds = new Set<string>();
    const txDebits = bonusLoadTxs
      .filter((tx: any) => {
        if (!tx || tx.customer_id !== uid || tx.type !== 'bonus') return false;
        if (String(tx.status || '').toLowerCase() !== 'completed') return false;
        const desc = String(tx.description || '').toLowerCase();
        if (!desc.startsWith('referral bonus loaded to')) return false;
        if (tx.reference_id) loadTxRefIds.add(String(tx.reference_id));
        return true;
      })
      .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);

    const legacyTopupDebits = bonusTopups
      .filter((t: any) => {
        if (!t || t.customer_id !== uid || t.payment_method_id !== 'referral_bonus') return false;
        const st = String(t.status || '').toLowerCase();
        if (st !== 'completed' && st !== 'approved') return false;
        return !loadTxRefIds.has(String(t.id));
      })
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const expectedRefBonusBalance = Math.max(
      0,
      Number((userReferralCredits - txDebits - legacyTopupDebits).toFixed(2))
    );
    if (expectedRefBonusBalance <= 0) continue;

    const existingWallet = walletsByCustomer[uid];
    const currentWalletRefBonus = Number(existingWallet?.referral_bonus_balance ?? 0);

    if (!existingWallet || currentWalletRefBonus + 0.009 < expectedRefBonusBalance) {
      const nowIso = new Date().toISOString();
      const restoredDelta = Number(
        Math.max(0, expectedRefBonusBalance - currentWalletRefBonus).toFixed(2)
      );
      let walletFixed = false;

      if (existingWallet) {
        const { error: updErr } = await deps.adminClient
          .from('wallets')
          .update({
            referral_bonus_balance: expectedRefBonusBalance,
            updated_at: nowIso,
          })
          .eq('customer_id', uid);
        if (!updErr) walletFixed = true;
      } else {
        const { error: insErr } = await deps.adminClient.from('wallets').insert({
          customer_id: uid,
          balance: 0,
          referral_bonus_balance: expectedRefBonusBalance,
          pending_withdrawal: 0,
          pending_deposit: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          currency: 'USD',
          updated_at: nowIso,
        });
        if (!insErr) walletFixed = true;
      }

      if (walletFixed) {
        const matchingAward =
          candidateAwards.find((a: any) => a.referee_id === uid) ||
          candidateAwards.find((a: any) => a.referrer_id === uid) ||
          candidateAwards[0];
        if (matchingAward?.id) {
          reconciledAwardIds.add(matchingAward.id);
          const existingDetail = detailByAwardId.get(matchingAward.id);
          if (existingDetail) {
            existingDetail.walletBalanceRestored = Number(
              ((existingDetail.walletBalanceRestored || 0) + restoredDelta).toFixed(2)
            );
          } else {
            const newDetail = {
              awardId: matchingAward.id,
              referrerId: matchingAward.referrer_id,
              refereeId: matchingAward.referee_id,
              referrerCredited: 0,
              refereeCredited: 0,
              walletBalanceRestored: restoredDelta,
              reason: 'Restored missing Game Bonus Wallet balance from completed referral transactions',
            };
            details.push(newDetail);
            detailByAwardId.set(matchingAward.id, newDetail);
          }
        }

        await deps.writeAudit(deps.adminClient, {
          actorId: options?.actor?.id || 'system',
          actorName: options?.actor?.name || 'Referral Auto-Reconciler',
          actorRole: options?.actor?.role || 'admin',
          action: 'REFERRAL_WALLET_BALANCE_RECONCILED',
          entityType: 'wallet',
          entityId: uid,
          details: `Restored Game Bonus Wallet balance for ${usersById[uid]?.display_name || uid} from $${currentWalletRefBonus.toFixed(2)} to $${expectedRefBonusBalance.toFixed(2)} (credits=$${userReferralCredits.toFixed(2)}, gameLoads=$${(txDebits + legacyTopupDebits).toFixed(2)}).`,
        });
      }
    }
  }

  return {
    scanned: candidateAwards.length,
    reconciledCount: reconciledAwardIds.size,
    skippedCount,
    details,
  };
}

async function resolveUserByIdentifier(adminClient: any, identifier: string) {
  const clean = String(identifier || '').trim();
  if (!clean) return null;

  const { data: byId } = await adminClient.from('users').select('*').eq('id', clean).maybeSingle();
  if (byId) return byId;

  if (clean.includes('@')) {
    const { data: byEmail } = await adminClient
      .from('users')
      .select('*')
      .ilike('email', clean.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (byEmail) return byEmail;
  }

  const normalizedCode = normalizeReferralCodeInput(clean);
  if (normalizedCode) {
    const { data: byCode } = await adminClient
      .from('users')
      .select('*')
      .ilike('referral_code', normalizedCode)
      .limit(1)
      .maybeSingle();
    if (byCode) return byCode;
  }

  return null;
}

export async function handlePostReferralAttribute(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.refereeId ? String(body.refereeId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }

    const refereeId = String(body?.refereeId || caller.id || '').trim();
    const rawCode = normalizeReferralCodeInput(body?.referralCode);
    const deviceFingerprint = String(body?.deviceFingerprint || req?.headers?.['x-device-fingerprint'] || '').trim().slice(0, 128) || null;
    const signupIp = extractClientIp(req) || null;

    if (!refereeId) {
      return res.status(400).json({ error: 'refereeId is required.' });
    }

    const { data: referee, error: refErr } = await deps.adminClient
      .from('users')
      .select('*')
      .eq('id', refereeId)
      .maybeSingle();

    if (refErr) {
      return res.status(500).json({ error: refErr.message });
    }
    if (!referee) {
      return res.status(404).json({ error: 'Player account not found.' });
    }

    // Store IP/device telemetry on the player account when absent
    const telemetryPatch: Record<string, any> = {};
    if (signupIp && !referee.signup_ip) telemetryPatch.signup_ip = signupIp;
    if (deviceFingerprint && !referee.device_fingerprint) {
      telemetryPatch.device_fingerprint = deviceFingerprint;
    }
    if (Object.keys(telemetryPatch).length > 0) {
      telemetryPatch.updated_at = new Date().toISOString();
      await deps.adminClient.from('users').update(telemetryPatch).eq('id', referee.id).catch(() => {});
    }

    if (!rawCode) {
      return res.status(200).json({ success: true, organic: true, message: 'No referral code provided.' });
    }

    if (referee.referred_by && normalizeReferralCodeInput(referee.referred_by) !== rawCode) {
      return res.status(409).json({
        error: 'This player already has a referral code attached.',
      });
    }

    const { data: referrer } = await deps.adminClient
      .from('users')
      .select('*')
      .ilike('referral_code', rawCode)
      .limit(1)
      .maybeSingle();

    if (!referrer) {
      return res.status(404).json({ error: `Referral code "${rawCode}" was not found.` });
    }

    const config = await loadReferralProgramConfig(deps.adminClient);
    const { data: sameContactUsers } = await deps.adminClient
      .from('users')
      .select('id, email, phone, signup_ip, device_fingerprint')
      .limit(200);

    const fraud = evaluateReferralFraudSignals({
      referrer: {
        id: referrer.id,
        email: referrer.email,
        phone: referrer.phone,
        signupIp: referrer.signup_ip,
        deviceFingerprint: referrer.device_fingerprint,
      },
      referee: {
        id: referee.id,
        email: referee.email,
        phone: referee.phone,
        signupIp: referee.signup_ip || signupIp,
        deviceFingerprint: referee.device_fingerprint || deviceFingerprint,
      },
      otherUsers: (sameContactUsers || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
      })),
      config,
      contextIp: signupIp,
      contextFingerprint: deviceFingerprint,
    });

    if (fraud.blocked) {
      return res.status(400).json({ error: fraud.blockReason, code: fraud.blockCode });
    }

    const nowIso = new Date().toISOString();
    await deps.adminClient
      .from('users')
      .update({ referred_by: referrer.referral_code || rawCode, updated_at: nowIso })
      .eq('id', referee.id);

    const awardId = `refaw_${referee.id}`;
    const { data: existingAward } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .eq('referee_id', referee.id)
      .maybeSingle();

    if (!existingAward) {
      const { error: insErr } = await deps.adminClient.from('referral_awards').insert({
        id: awardId,
        referrer_id: referrer.id,
        referee_id: referee.id,
        referral_code_used: referrer.referral_code || rawCode,
        source: 'signup_link',
        reward_mode: config.rewardMode,
        payout_target: config.payoutTarget,
        referrer_reward_amount: 0,
        referee_reward_amount: 0,
        qualifying_deposit_amount: 0,
        status: 'registered',
        fraud_flags: fraud.fraudFlags,
        created_at: nowIso,
        updated_at: nowIso,
      });
      if (insErr && isSchemaMissingError(insErr)) {
        return res.status(503).json({
          error: 'Referral ledger table (referral_awards) is not provisioned yet. Run Section 17 of supabase_schema.sql.',
          code: 'SCHEMA_MIGRATION_REQUIRED',
        });
      }
      if (insErr) {
        return res.status(500).json({ error: insErr.message });
      }
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: referee.id,
      actorName: referee.display_name || referee.email || 'Player',
      actorRole: referee.role || 'customer',
      action: 'REFERRAL_ATTRIBUTED_SIGNUP',
      entityType: 'user',
      entityId: referee.id,
      details: `Linked signup attribution for ${referee.email} under referrer ${referrer.display_name} (${referrer.referral_code || rawCode}).${fraud.fraudFlags.length > 0 ? ` Signals: ${fraud.fraudFlags.join(', ')}` : ''}`,
    });

    return res.status(200).json({
      success: true,
      referrerId: referrer.id,
      referralCodeUsed: referrer.referral_code || rawCode,
      fraudFlags: fraud.fraudFlags,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to attribute referral' });
  }
}

export async function handlePostReferralEvaluate(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.refereeId ? String(body.refereeId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role === 'anonymous' || !caller.id) {
      return res.status(401).json({ error: 'Authentication required to evaluate referrals.' });
    }

    const refereeId = String(body?.refereeId || caller.id).trim();
    const isStaff = caller.role === 'admin' || caller.role === 'agent';
    if (!isStaff && caller.id !== refereeId) {
      return res.status(403).json({ error: 'Forbidden: cannot evaluate another player.' });
    }

    const config = await loadReferralProgramConfig(deps.adminClient);
    if (!config.enabled) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Referral program disabled.' });
    }

    const { data: referee } = await deps.adminClient
      .from('users')
      .select('*')
      .eq('id', refereeId)
      .maybeSingle();

    if (!referee) {
      return res.status(404).json({ error: 'Player account not found.' });
    }

    const { data: existingAward, error: awErr } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .eq('referee_id', refereeId)
      .maybeSingle();

    if (awErr && isSchemaMissingError(awErr)) {
      return res.status(503).json({
        error: 'Referral ledger table (referral_awards) is not provisioned yet. Run Section 17 of supabase_schema.sql.',
        code: 'SCHEMA_MIGRATION_REQUIRED',
      });
    }

    if (
      existingAward?.status === 'rewarded' ||
      existingAward?.status === 'rejected' ||
      existingAward?.status === 'capped' ||
      existingAward?.status === 'held_for_review'
    ) {
      // Issue 5: Always synchronize cumulative eligible deposits onto existing referral ledger rows
      // without issuing duplicate referral rewards.
      const depositProgress = await computeRefereeRealCashDeposits(deps.adminClient, referee.id);
      let syncedAward = existingAward;
      const storedDeposit = Number(existingAward.qualifying_deposit_amount || 0);
      const nextDepositId = depositProgress.qualifyingDepositId || existingAward.qualifying_deposit_id || null;

      if (
        depositProgress.realDepositTotal !== storedDeposit ||
        (nextDepositId && nextDepositId !== existingAward.qualifying_deposit_id)
      ) {
        const { data: updatedDepositRow } = await deps.adminClient
          .from('referral_awards')
          .update({
            qualifying_deposit_amount: depositProgress.realDepositTotal,
            qualifying_deposit_id: nextDepositId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAward.id)
          .select()
          .maybeSingle();
        if (updatedDepositRow) {
          syncedAward = updatedDepositRow;
        }
      }

      let reconciled = false;
      if (syncedAward.status === 'rewarded') {
        const recRes = await reconcileMissingReferralRewards(deps, { awardIds: [syncedAward.id] });
        reconciled = recRes.reconciledCount > 0;
        const { data: refreshed } = await deps.adminClient
          .from('referral_awards')
          .select('*')
          .eq('id', syncedAward.id)
          .maybeSingle();
        if (refreshed) syncedAward = refreshed;
      }

      return res.status(200).json({
        success: true,
        alreadyFinalized: syncedAward.status !== 'held_for_review',
        alreadyHeld: syncedAward.status === 'held_for_review',
        depositSynced: true,
        reconciled,
        depositTotal: depositProgress.realDepositTotal,
        status: syncedAward.status,
        award: normalizeReferralLedgerRow(syncedAward),
      });
    }

    const refCode = normalizeReferralCodeInput(existingAward?.referral_code_used || referee.referred_by);
    if (!existingAward && !refCode) {
      return res.status(200).json({ success: true, skipped: true, reason: 'No referrer attributed.' });
    }

    let referrer: any = null;
    if (existingAward?.referrer_id) {
      const { data: rById } = await deps.adminClient
        .from('users')
        .select('*')
        .eq('id', existingAward.referrer_id)
        .maybeSingle();
      referrer = rById;
    } else if (refCode) {
      const { data: rByCode } = await deps.adminClient
        .from('users')
        .select('*')
        .ilike('referral_code', refCode)
        .limit(1)
        .maybeSingle();
      referrer = rByCode;
    }

    if (!referrer) {
      return res.status(200).json({ success: true, skipped: true, reason: 'Referrer profile unavailable.' });
    }

    if (existingAward?.status === 'held_for_review') {
      return res.status(200).json({
        success: true,
        alreadyHeld: true,
        status: 'held_for_review',
        award: normalizeReferralLedgerRow(existingAward),
      });
    }

    const nowIso = new Date().toISOString();
    const depositProgress = await computeRefereeRealCashDeposits(deps.adminClient, referee.id);
    const emailVerified = Boolean(referee.email_verified);
    const awardId = existingAward?.id || `refaw_${referee.id}`;

    if (config.requireEmailVerified && !emailVerified) {
      await deps.adminClient.from('referral_awards').upsert({
        id: awardId,
        referrer_id: referrer.id,
        referee_id: referee.id,
        referral_code_used: referrer.referral_code || refCode,
        source: existingAward?.source || 'signup_link',
        reward_mode: config.rewardMode,
        payout_target: config.payoutTarget,
        referrer_reward_amount: 0,
        referee_reward_amount: 0,
        qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
        qualifying_deposit_amount: depositProgress.realDepositTotal,
        status: 'registered',
        fraud_flags: existingAward?.fraud_flags || [],
        updated_at: nowIso,
      });
      return res.status(200).json({
        success: true,
        qualified: false,
        status: 'registered',
        depositTotal: depositProgress.realDepositTotal,
      });
    }

    if (depositProgress.realDepositTotal < config.qualificationDepositMin) {
      await deps.adminClient.from('referral_awards').upsert({
        id: awardId,
        referrer_id: referrer.id,
        referee_id: referee.id,
        referral_code_used: referrer.referral_code || refCode,
        source: existingAward?.source || 'signup_link',
        reward_mode: config.rewardMode,
        payout_target: config.payoutTarget,
        referrer_reward_amount: 0,
        referee_reward_amount: 0,
        qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
        qualifying_deposit_amount: depositProgress.realDepositTotal,
        status: 'pending_deposit',
        fraud_flags: existingAward?.fraud_flags || [],
        updated_at: nowIso,
      });
      return res.status(200).json({
        success: true,
        qualified: false,
        status: 'pending_deposit',
        depositTotal: depositProgress.realDepositTotal,
        minimumRequired: config.qualificationDepositMin,
      });
    }

    // Evaluate fraud signals on qualification
    const { data: otherUsers } = await deps.adminClient
      .from('users')
      .select('id, email, phone')
      .limit(200);

    const fraud = evaluateReferralFraudSignals({
      referrer: {
        id: referrer.id,
        email: referrer.email,
        phone: referrer.phone,
        signupIp: referrer.signup_ip,
        deviceFingerprint: referrer.device_fingerprint,
      },
      referee: {
        id: referee.id,
        email: referee.email,
        phone: referee.phone,
        signupIp: referee.signup_ip,
        deviceFingerprint: referee.device_fingerprint,
      },
      otherUsers: otherUsers || [],
      config,
      contextIp: extractClientIp(req),
    });

    const combinedFlags = Array.from(
      new Set([...(Array.isArray(existingAward?.fraud_flags) ? existingAward.fraud_flags : []), ...fraud.fraudFlags])
    );

    if (fraud.blocked) {
      await deps.adminClient.from('referral_awards').upsert({
        id: awardId,
        referrer_id: referrer.id,
        referee_id: referee.id,
        referral_code_used: referrer.referral_code || refCode,
        source: existingAward?.source || 'signup_link',
        reward_mode: config.rewardMode,
        payout_target: config.payoutTarget,
        referrer_reward_amount: 0,
        referee_reward_amount: 0,
        qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
        qualifying_deposit_amount: depositProgress.realDepositTotal,
        status: 'rejected',
        fraud_flags: combinedFlags,
        review_notes: fraud.blockReason,
        updated_at: nowIso,
      });
      await deps.writeAudit(deps.adminClient, {
        actorId: 'system',
        actorName: 'Referral Fraud Guard',
        actorRole: 'admin',
        action: 'REFERRAL_AUTO_BLOCKED',
        entityType: 'user',
        entityId: referee.id,
        details: `${fraud.blockReason} (Referrer: ${referrer.email})`,
      });
      return res.status(200).json({
        success: false,
        blocked: true,
        status: 'rejected',
        error: fraud.blockReason,
      });
    }

    const depositBasis = depositProgress.qualifyingDepositAmount || depositProgress.realDepositTotal;
    const payouts = calculateReferralPayouts(config, depositBasis);
    const budget = await computeBudgetUsage(deps.adminClient, referrer.id);
    const capCheck = checkReferralBudgetCaps({
      config,
      referrerRewardedCount: budget.referrerRewardedCount,
      dailyTotalPaidToday: budget.dailyTotalPaidToday,
      payoutTotal: payouts.totalAmount,
    });

    if (!capCheck.allowed) {
      await deps.adminClient.from('referral_awards').upsert({
        id: awardId,
        referrer_id: referrer.id,
        referee_id: referee.id,
        referral_code_used: referrer.referral_code || refCode,
        source: existingAward?.source || 'signup_link',
        reward_mode: config.rewardMode,
        payout_target: config.payoutTarget,
        referrer_reward_amount: 0,
        referee_reward_amount: 0,
        qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
        qualifying_deposit_amount: depositProgress.realDepositTotal,
        status: 'capped',
        fraud_flags: combinedFlags,
        review_notes: capCheck.capReason,
        updated_at: nowIso,
      });
      return res.status(200).json({
        success: true,
        status: 'capped',
        message: capCheck.capReason,
      });
    }

    if (fraud.shouldHold || (combinedFlags.length > 0 && config.holdFlaggedForReview)) {
      const { data: heldRow } = await deps.adminClient
        .from('referral_awards')
        .upsert({
          id: awardId,
          referrer_id: referrer.id,
          referee_id: referee.id,
          referral_code_used: referrer.referral_code || refCode,
          source: existingAward?.source || 'signup_link',
          reward_mode: config.rewardMode,
          payout_target: config.payoutTarget,
          referrer_reward_amount: payouts.referrerAmount,
          referee_reward_amount: payouts.refereeAmount,
          qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
          qualifying_deposit_amount: depositProgress.realDepositTotal,
          status: 'held_for_review',
          fraud_flags: combinedFlags,
          review_notes: `Held automatically due to anti-fraud signal(s): ${combinedFlags.join(', ')}`,
          updated_at: nowIso,
        })
        .select()
        .maybeSingle();

      await deps.writeAudit(deps.adminClient, {
        actorId: 'system',
        actorName: 'Referral Fraud Guard',
        actorRole: 'admin',
        action: 'REFERRAL_HELD_FOR_REVIEW',
        entityType: 'user',
        entityId: referee.id,
        details: `Held referral reward ($${payouts.referrerAmount.toFixed(2)} / $${payouts.refereeAmount.toFixed(2)}) between ${referrer.display_name} and ${referee.display_name}. Flags: ${combinedFlags.join(', ')}`,
      });

      return res.status(200).json({
        success: true,
        status: 'held_for_review',
        award: normalizeReferralLedgerRow(heldRow),
      });
    }

    // Finalize & pay atomically (one-time per referee; NEVER marks rewarded unless wallet + ledger succeed)
    const atomicRes = await awardReferralAtomically({
      adminClient: deps.adminClient,
      awardId,
      referrerId: referrer.id,
      refereeId: referee.id,
      referralCodeUsed: referrer.referral_code || refCode,
      source: existingAward?.source || 'signup_link',
      rewardMode: config.rewardMode,
      payoutTarget: config.payoutTarget,
      referrerRewardAmount: payouts.referrerAmount,
      refereeRewardAmount: payouts.refereeAmount,
      qualifyingDepositId: depositProgress.qualifyingDepositId || null,
      qualifyingDepositAmount: depositProgress.realDepositTotal,
      fraudFlags: combinedFlags,
      referrerDescription: `Referral Reward: ${referee.display_name || referee.email} verified email & deposited $${depositProgress.realDepositTotal.toFixed(2)}`,
      refereeDescription: `Welcome Referral Bonus: Qualified under code ${referrer.referral_code || refCode}`,
      referrerNotifTitle: 'Referral Reward Credited',
      referrerNotifMessage: `You received $${payouts.referrerAmount.toFixed(2)} because ${referee.display_name || 'your friend'} verified their email and met the real deposit requirement.`,
      refereeNotifTitle: 'Welcome Referral Bonus Credited',
      refereeNotifMessage: `You received a $${payouts.refereeAmount.toFixed(2)} welcome referral bonus after qualifying!`,
    });

    if (!atomicRes.ok) {
      if (String(atomicRes.error || '').includes('Concurrent referral credit in progress')) {
        await new Promise((r) => setTimeout(r, 120));
        const { data: winner } = await deps.adminClient
          .from('referral_awards')
          .select('*')
          .eq('id', awardId)
          .maybeSingle();
        if (winner?.status === 'rewarded') {
          return res.status(200).json({
            success: true,
            alreadyFinalized: true,
            status: 'rewarded',
            award: normalizeReferralLedgerRow(winner),
          });
        }
      }
      return res.status(500).json({
        success: false,
        status: 'processing',
        error: atomicRes.error || 'Failed to credit referral wallet atomically.',
      });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: 'system',
      actorName: 'Referral Engine',
      actorRole: 'admin',
      action: 'REFERRAL_REWARD_CREDITED',
      entityType: 'wallet',
      entityId: referrer.id,
      details: `Credited $${payouts.referrerAmount.toFixed(2)} to referrer ${referrer.display_name} and $${payouts.refereeAmount.toFixed(2)} to friend ${referee.display_name} (${config.payoutTarget}).`,
    });

    return res.status(200).json({
      success: true,
      qualified: true,
      status: 'rewarded',
      award: normalizeReferralLedgerRow(atomicRes.awardRow),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Referral evaluation failed' });
  }
}

export async function handlePostManualAssignReferral(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.actingUserId ? String(body.actingUserId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role !== 'admin' && caller.role !== 'agent') {
      return res.status(403).json({
        error: 'Access Denied: Only Administrators and Support Agents can link referrals.',
      });
    }

    const refereeId = String(body?.refereeId || '').trim();
    const referrerQuery = String(body?.referrerQuery || body?.referrerId || '').trim();
    const mode = body?.mode === 'link_and_reward' ? 'link_and_reward' : 'link_only';
    const reason = String(body?.reason || '').trim();

    if (!refereeId || !referrerQuery) {
      return res.status(400).json({ error: 'Player ID and Referrer (email, ID, or code) are required.' });
    }

    const { data: referee } = await deps.adminClient
      .from('users')
      .select('*')
      .eq('id', refereeId)
      .maybeSingle();

    if (!referee) {
      return res.status(404).json({ error: 'Target player not found.' });
    }

    const referrer = await resolveUserByIdentifier(deps.adminClient, referrerQuery);
    if (!referrer) {
      return res.status(404).json({ error: `Referrer matching "${referrerQuery}" not found.` });
    }

    const { data: existingAward, error: awErr } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .eq('referee_id', referee.id)
      .maybeSingle();

    if (awErr && isSchemaMissingError(awErr)) {
      return res.status(503).json({
        error: 'Referral ledger table (referral_awards) is not provisioned yet. Run Section 17 of supabase_schema.sql.',
        code: 'SCHEMA_MIGRATION_REQUIRED',
      });
    }

    const hasExistingReferrer = Boolean(
      (referee.referred_by && String(referee.referred_by).trim() !== '') ||
        (existingAward && existingAward.referrer_id)
    );
    const isChangingExistingReferrer =
      hasExistingReferrer &&
      (existingAward?.referrer_id
        ? existingAward.referrer_id !== referrer.id
        : normalizeReferralCodeInput(referee.referred_by) !==
          normalizeReferralCodeInput(referrer.referral_code || referrer.id));

    if (hasExistingReferrer && isChangingExistingReferrer) {
      if (caller.role !== 'admin') {
        return res.status(403).json({
          error:
            'Access Denied: This player already has a referrer. Only Administrators can reassign an existing referrer.',
        });
      }
      if (!reason || reason.length < 3) {
        return res.status(400).json({
          error: 'A clear reason (at least 3 characters) is required when reassigning an existing referrer.',
        });
      }
    }

    if (existingAward?.status === 'rewarded' && mode === 'link_and_reward') {
      return res.status(409).json({
        error:
          'This player has already triggered a one-time referral payout. Choose "Link Only" to adjust attribution without double-paying.',
      });
    }

    const config = await loadReferralProgramConfig(deps.adminClient);
    const { data: otherUsers } = await deps.adminClient
      .from('users')
      .select('id, email, phone')
      .limit(200);

    const fraud = evaluateReferralFraudSignals({
      referrer: {
        id: referrer.id,
        email: referrer.email,
        phone: referrer.phone,
        signupIp: referrer.signup_ip,
        deviceFingerprint: referrer.device_fingerprint,
      },
      referee: {
        id: referee.id,
        email: referee.email,
        phone: referee.phone,
        signupIp: referee.signup_ip,
        deviceFingerprint: referee.device_fingerprint,
      },
      otherUsers: otherUsers || [],
      config,
    });

    if (fraud.blocked) {
      return res.status(400).json({ error: fraud.blockReason, code: fraud.blockCode });
    }

    const nowIso = new Date().toISOString();
    const resolvedRefCode =
      normalizeReferralCodeInput(referrer.referral_code) || `REF_${referrer.id.slice(-5).toUpperCase()}`;

    if (!referrer.referral_code) {
      await deps.adminClient
        .from('users')
        .update({ referral_code: resolvedRefCode, updated_at: nowIso })
        .eq('id', referrer.id);
    }

    await deps.adminClient
      .from('users')
      .update({ referred_by: resolvedRefCode, updated_at: nowIso })
      .eq('id', referee.id);

    const awardId = existingAward?.id || `refaw_${referee.id}`;
    const source = isChangingExistingReferrer
      ? 'admin_reassign'
      : mode === 'link_and_reward'
      ? 'manual_link_and_reward'
      : 'manual_link';

    if (mode === 'link_only') {
      const depositProgress = await computeRefereeRealCashDeposits(deps.adminClient, referee.id);
      const nextStatus =
        existingAward?.status === 'rewarded'
          ? 'rewarded'
          : referee.email_verified
          ? 'pending_deposit'
          : 'registered';

      const { data: saved, error: saveErr } = await deps.adminClient
        .from('referral_awards')
        .upsert({
          id: awardId,
          referrer_id: referrer.id,
          referee_id: referee.id,
          referral_code_used: resolvedRefCode,
          source,
          reward_mode: config.rewardMode,
          payout_target: config.payoutTarget,
          referrer_reward_amount: existingAward?.referrer_reward_amount || 0,
          referee_reward_amount: existingAward?.referee_reward_amount || 0,
          qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
          qualifying_deposit_amount: depositProgress.realDepositTotal,
          status: nextStatus,
          fraud_flags: fraud.fraudFlags,
          staff_reason: reason || null,
          assigned_by: caller.id,
          assigned_by_name: caller.displayName,
          updated_at: nowIso,
        })
        .select()
        .maybeSingle();

      if (saveErr) {
        return res.status(500).json({ error: saveErr.message });
      }

      await deps.writeAudit(deps.adminClient, {
        actorId: caller.id,
        actorName: caller.displayName,
        actorRole: caller.role,
        action: isChangingExistingReferrer ? 'REFERRAL_REASSIGNED' : 'MANUAL_REFERRAL_LINKED',
        entityType: 'user',
        entityId: referee.id,
        details: `${isChangingExistingReferrer ? 'Reassigned' : 'Manually linked'} player ${referee.display_name} (${referee.email}) to referrer ${referrer.display_name} (${resolvedRefCode}) [Link Only].${reason ? ` Reason: ${reason}` : ''}`,
      });

      return res.status(200).json({
        success: true,
        mode: 'link_only',
        status: nextStatus,
        message: `Linked ${referee.display_name} to referrer ${referrer.display_name} (${resolvedRefCode}).`,
        award: normalizeReferralLedgerRow(saved),
      });
    }

    // Mode: link_and_reward
    const depositProgress = await computeRefereeRealCashDeposits(deps.adminClient, referee.id);
    const depositBasis =
      depositProgress.realDepositTotal > 0
        ? depositProgress.realDepositTotal
        : config.qualificationDepositMin;
    const payouts = calculateReferralPayouts(config, depositBasis);

    const budget = await computeBudgetUsage(deps.adminClient, referrer.id);
    const capCheck = checkReferralBudgetCaps({
      config,
      referrerRewardedCount: budget.referrerRewardedCount,
      dailyTotalPaidToday: budget.dailyTotalPaidToday,
      payoutTotal: payouts.totalAmount,
    });

    if (!capCheck.allowed) {
      return res.status(409).json({ error: capCheck.capReason, code: 'REFERRAL_CAP_REACHED' });
    }

    if (fraud.shouldHold && caller.role !== 'admin') {
      const { data: heldRow } = await deps.adminClient
        .from('referral_awards')
        .upsert({
          id: awardId,
          referrer_id: referrer.id,
          referee_id: referee.id,
          referral_code_used: resolvedRefCode,
          source,
          reward_mode: config.rewardMode,
          payout_target: config.payoutTarget,
          referrer_reward_amount: payouts.referrerAmount,
          referee_reward_amount: payouts.refereeAmount,
          qualifying_deposit_id: depositProgress.qualifyingDepositId || null,
          qualifying_deposit_amount: depositProgress.realDepositTotal,
          status: 'held_for_review',
          fraud_flags: fraud.fraudFlags,
          staff_reason: reason || null,
          assigned_by: caller.id,
          assigned_by_name: caller.displayName,
          review_notes: `Manual Link+Reward held for Admin verification (${fraud.fraudFlags.join(', ')})`,
          updated_at: nowIso,
        })
        .select()
        .maybeSingle();

      await deps.writeAudit(deps.adminClient, {
        actorId: caller.id,
        actorName: caller.displayName,
        actorRole: caller.role,
        action: 'MANUAL_REFERRAL_HELD_FOR_REVIEW',
        entityType: 'user',
        entityId: referee.id,
        details: `Agent ${caller.displayName} linked ${referee.display_name} to ${referrer.display_name}; payout placed in Admin Review Queue (${fraud.fraudFlags.join(', ')}).`,
      });

      return res.status(200).json({
        success: true,
        mode: 'link_and_reward',
        status: 'held_for_review',
        message: `Linked ${referee.display_name} to ${referrer.display_name}. Reward placed in Admin Review Queue due to ${fraud.fraudFlags.join(', ')}.`,
        award: normalizeReferralLedgerRow(heldRow),
      });
    }

    const atomicRes = await awardReferralAtomically({
      adminClient: deps.adminClient,
      awardId,
      referrerId: referrer.id,
      refereeId: referee.id,
      referralCodeUsed: resolvedRefCode,
      source,
      rewardMode: config.rewardMode,
      payoutTarget: config.payoutTarget,
      referrerRewardAmount: payouts.referrerAmount,
      refereeRewardAmount: payouts.refereeAmount,
      qualifyingDepositId: depositProgress.qualifyingDepositId || null,
      qualifyingDepositAmount: depositProgress.realDepositTotal,
      fraudFlags: fraud.fraudFlags,
      staffReason: reason || null,
      assignedBy: caller.id,
      assignedByName: caller.displayName,
      reviewedBy: caller.role === 'admin' ? caller.id : null,
      reviewedByName: caller.role === 'admin' ? caller.displayName : null,
      referrerDescription: `Manual Referral Reward (${caller.displayName}): ${referee.display_name || referee.email}`,
      refereeDescription: `Welcome Referral Bonus (${caller.displayName}): Linked to ${referrer.display_name}`,
      referrerNotifTitle: 'Referral Reward Credited',
      referrerNotifMessage: `Staff credited your $${payouts.referrerAmount.toFixed(2)} referral bonus for ${referee.display_name}.`,
      refereeNotifTitle: 'Welcome Referral Bonus Credited',
      refereeNotifMessage: `Staff credited your $${payouts.refereeAmount.toFixed(2)} welcome referral bonus!`,
    });

    if (!atomicRes.ok) {
      return res.status(500).json({
        success: false,
        status: 'processing',
        error: atomicRes.error || 'Failed to credit referral wallets atomically.',
      });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: caller.role,
      action: isChangingExistingReferrer
        ? 'REFERRAL_REASSIGNED_AND_REWARDED'
        : 'MANUAL_REFERRAL_LINKED_AND_REWARDED',
      entityType: 'user',
      entityId: referee.id,
      details: `${isChangingExistingReferrer ? 'Reassigned' : 'Manually linked'} ${referee.display_name} to ${referrer.display_name} (${resolvedRefCode}) and issued $${payouts.referrerAmount.toFixed(2)} referrer / $${payouts.refereeAmount.toFixed(2)} friend bonus.${reason ? ` Reason: ${reason}` : ''}`,
    });

    return res.status(200).json({
      success: true,
      mode: 'link_and_reward',
      status: 'rewarded',
      message: `Linked ${referee.display_name} to ${referrer.display_name} and credited $${payouts.referrerAmount.toFixed(2)} / $${payouts.refereeAmount.toFixed(2)}.`,
      award: normalizeReferralLedgerRow(atomicRes.awardRow),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to manually assign referral' });
  }
}

export async function handlePatchVanityReferralCode(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.actingUserId ? String(body.actingUserId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied: Only Administrators can assign custom vanity referral codes.',
      });
    }

    const userId = String(body?.userId || '').trim();
    const vanityCode = normalizeReferralCodeInput(body?.vanityCode);
    if (!userId || !vanityCode) {
      return res.status(400).json({ error: 'userId and vanityCode are required.' });
    }
    if (!isValidVanityReferralCode(vanityCode)) {
      return res.status(400).json({
        error: 'Vanity code must be 3–24 characters using letters, numbers, underscores, or hyphens.',
      });
    }

    const { data: targetUser } = await deps.adminClient
      .from('users')
      .select('id, email, display_name, referral_code')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const { data: conflict } = await deps.adminClient
      .from('users')
      .select('id, display_name')
      .ilike('referral_code', vanityCode)
      .neq('id', userId)
      .limit(1)
      .maybeSingle();

    if (conflict) {
      return res.status(409).json({
        error: `Referral code "${vanityCode}" is already assigned to ${conflict.display_name || conflict.id}.`,
      });
    }

    const oldCode = targetUser.referral_code;
    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await deps.adminClient
      .from('users')
      .update({ referral_code: vanityCode, updated_at: nowIso })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (updErr) {
      return res.status(500).json({ error: updErr.message });
    }

    // Keep existing attributed players pointing at the user's updated code
    if (oldCode && normalizeReferralCodeInput(oldCode) !== vanityCode) {
      await deps.adminClient
        .from('users')
        .update({ referred_by: vanityCode, updated_at: nowIso })
        .ilike('referred_by', oldCode)
        .catch(() => {});
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'REFERRAL_VANITY_CODE_SET',
      entityType: 'user',
      entityId: userId,
      details: `Assigned custom vanity referral code "${vanityCode}" to ${targetUser.display_name || targetUser.email}${oldCode ? ` (previously ${oldCode})` : ''}.`,
    });

    return res.status(200).json({
      success: true,
      referralCode: vanityCode,
      user: updated,
      message: `Custom vanity code "${vanityCode}" assigned successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update vanity referral code' });
  }
}

export async function handleGetAdminReferralLedger(
  deps: ReferralHandlerDeps,
  parsedUrl: URL,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: (parsedUrl.searchParams.get('userId') || '').trim() || undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role !== 'admin' && caller.role !== 'agent') {
      return res.status(403).json({
        error: 'Access Denied: Staff authorization required to inspect referral ledger.',
      });
    }

    const statusFilter = (parsedUrl.searchParams.get('status') || 'all').trim().toLowerCase();
    const search = (parsedUrl.searchParams.get('search') || '').trim().toLowerCase();
    const rawLimit = Number.parseInt(parsedUrl.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 100;

    // Automatically & safely reconcile any rewarded ledger rows missing wallet/transaction credits
    await reconcileMissingReferralRewards(deps, {
      limit: 50,
      actor: { id: caller.id, name: caller.displayName, role: caller.role },
    });

    let query = deps.adminClient
      .from('referral_awards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: rows, error: awErr } = await query;
    if (awErr) {
      if (isSchemaMissingError(awErr)) {
        return res.status(503).json({
          error: 'Referral ledger table (referral_awards) is not provisioned yet. Run Section 17 of supabase_schema.sql.',
          code: 'SCHEMA_MIGRATION_REQUIRED',
        });
      }
      return res.status(500).json({ error: awErr.message });
    }

    const list = Array.isArray(rows) ? rows : [];
    const userIds = Array.from(
      new Set(
        list
          .flatMap((r: any) => [r.referrer_id, r.referee_id])
          .filter(Boolean)
      )
    );

    const usersById: Record<string, { displayName: string; email?: string; referralCode?: string }> = {};
    if (userIds.length > 0) {
      const { data: uRows } = await deps.adminClient
        .from('users')
        .select('id, display_name, email, referral_code')
        .in('id', userIds);

      for (const u of uRows || []) {
        usersById[u.id] = {
          displayName: u.display_name || u.email?.split('@')[0] || 'Player',
          email: u.email,
          referralCode: u.referral_code,
        };
      }
    }

    let entries = list
      .map((r: any) => normalizeReferralLedgerRow(r, usersById))
      .filter((e): e is ReferralLedgerEntry => Boolean(e));

    if (search) {
      entries = entries.filter(
        (e) =>
          (e.referrerName || '').toLowerCase().includes(search) ||
          (e.refereeName || '').toLowerCase().includes(search) ||
          (e.referrerEmail || '').toLowerCase().includes(search) ||
          (e.refereeEmail || '').toLowerCase().includes(search) ||
          (e.referralCodeUsed || '').toLowerCase().includes(search)
      );
    }

    // Always compute leaderboard across recent rewarded/all entries cleanly
    const { data: allForBoard } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const boardIds = Array.from(
      new Set(
        (allForBoard || [])
          .flatMap((r: any) => [r.referrer_id, r.referee_id])
          .filter((id: string) => id && !usersById[id])
      )
    );
    if (boardIds.length > 0) {
      const { data: moreUsers } = await deps.adminClient
        .from('users')
        .select('id, display_name, email, referral_code')
        .in('id', boardIds);
      for (const u of moreUsers || []) {
        usersById[u.id] = {
          displayName: u.display_name || u.email?.split('@')[0] || 'Player',
          email: u.email,
          referralCode: u.referral_code,
        };
      }
    }

    const allNormalized = (allForBoard || [])
      .map((r: any) => normalizeReferralLedgerRow(r, usersById))
      .filter((e): e is ReferralLedgerEntry => Boolean(e));

    const topReferrers = computeTopReferrers(allNormalized, usersById).slice(0, 15);
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const stats = {
      totalCount: allNormalized.length,
      heldCount: allNormalized.filter((a) => a.status === 'held_for_review').length,
      rewardedCount: allNormalized.filter((a) => a.status === 'rewarded').length,
      totalReferrerPaid: Number(
        allNormalized
          .filter((a) => a.status === 'rewarded')
          .reduce((s, a) => s + a.referrerRewardAmount, 0)
          .toFixed(2)
      ),
      totalFriendPaid: Number(
        allNormalized
          .filter((a) => a.status === 'rewarded')
          .reduce((s, a) => s + a.refereeRewardAmount, 0)
          .toFixed(2)
      ),
      dailyPaidToday: Number(
        allNormalized
          .filter((a) => a.status === 'rewarded' && (a.rewardedAt || '').startsWith(todayPrefix))
          .reduce((s, a) => s + a.referrerRewardAmount + a.refereeRewardAmount, 0)
          .toFixed(2)
      ),
    };

    return res.status(200).json({
      success: true,
      awards: entries,
      topReferrers,
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load referral ledger' });
  }
}

export async function handlePostReviewReferral(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.actingUserId ? String(body.actingUserId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied: Only Administrators can approve or reject held referral awards.',
      });
    }

    const awardId = String(body?.awardId || '').trim();
    const decision = body?.decision === 'approve' ? 'approve' : body?.decision === 'reject' ? 'reject' : '';
    const reviewNotes = String(body?.reviewNotes || '').trim();

    if (!awardId || !decision) {
      return res.status(400).json({ error: 'awardId and decision (approve or reject) are required.' });
    }

    const { data: award, error: awErr } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .eq('id', awardId)
      .maybeSingle();

    if (awErr && isSchemaMissingError(awErr)) {
      return res.status(503).json({
        error: 'Referral ledger table (referral_awards) is not provisioned yet. Run Section 17 of supabase_schema.sql.',
        code: 'SCHEMA_MIGRATION_REQUIRED',
      });
    }
    if (!award) {
      return res.status(404).json({ error: 'Referral award record not found.' });
    }
    if (award.status === 'rewarded') {
      await reconcileMissingReferralRewards(deps, {
        awardIds: [award.id],
        actor: { id: caller.id, name: caller.displayName, role: caller.role },
      });
      return res.status(409).json({ error: 'This referral reward has already been approved and credited.' });
    }

    const nowIso = new Date().toISOString();

    if (decision === 'reject') {
      const { data: rejectedRow } = await deps.adminClient
        .from('referral_awards')
        .update({
          status: 'rejected',
          reviewed_by: caller.id,
          reviewed_by_name: caller.displayName,
          review_notes: reviewNotes || 'Declined during Admin anti-fraud review.',
          updated_at: nowIso,
        })
        .eq('id', award.id)
        .select()
        .maybeSingle();

      await deps.writeAudit(deps.adminClient, {
        actorId: caller.id,
        actorName: caller.displayName,
        actorRole: 'admin',
        action: 'REFERRAL_HOLD_REJECTED',
        entityType: 'wallet',
        entityId: award.referee_id,
        details: `Rejected held referral award ${award.id}. Notes: ${reviewNotes || 'Fraud review rejection'}`,
      });

      return res.status(200).json({
        success: true,
        status: 'rejected',
        award: normalizeReferralLedgerRow(rejectedRow),
        message: 'Held referral award rejected.',
      });
    }

    // Approve held award -> credit both wallets atomically before marking rewarded
    const config = await loadReferralProgramConfig(deps.adminClient);
    const depositProgress = await computeRefereeRealCashDeposits(deps.adminClient, award.referee_id);
    const effectiveDepositTotal = Math.max(
      Number(award.qualifying_deposit_amount || 0),
      depositProgress.realDepositTotal
    );

    const payouts =
      Number(award.referrer_reward_amount || 0) > 0 || Number(award.referee_reward_amount || 0) > 0
        ? {
            referrerAmount: Number(award.referrer_reward_amount || 0),
            refereeAmount: Number(award.referee_reward_amount || 0),
            totalAmount: Number(
              (Number(award.referrer_reward_amount || 0) + Number(award.referee_reward_amount || 0)).toFixed(2)
            ),
          }
        : calculateReferralPayouts(
            config,
            effectiveDepositTotal || config.qualificationDepositMin
          );

    const payoutTarget: ReferralPayoutTarget =
      award.payout_target === 'available_balance' ? 'available_balance' : config.payoutTarget;

    const atomicRes = await awardReferralAtomically({
      adminClient: deps.adminClient,
      awardId: award.id,
      referrerId: award.referrer_id,
      refereeId: award.referee_id,
      referralCodeUsed: award.referral_code_used || '',
      source: award.source || 'signup_link',
      rewardMode: award.reward_mode || config.rewardMode,
      payoutTarget,
      referrerRewardAmount: payouts.referrerAmount,
      refereeRewardAmount: payouts.refereeAmount,
      qualifyingDepositId: depositProgress.qualifyingDepositId || award.qualifying_deposit_id || null,
      qualifyingDepositAmount: effectiveDepositTotal,
      fraudFlags: Array.isArray(award.fraud_flags) ? award.fraud_flags : [],
      reviewedBy: caller.id,
      reviewedByName: caller.displayName,
      reviewNotes: reviewNotes || 'Approved after Admin review.',
      referrerDescription: `Referral Reward Approved (${caller.displayName}): Award #${award.id.slice(-6)}`,
      refereeDescription: `Welcome Referral Bonus Approved (${caller.displayName})`,
      referrerNotifTitle: 'Held Referral Reward Approved',
      referrerNotifMessage: `Admin verified and credited $${payouts.referrerAmount.toFixed(2)} referral bonus to your wallet.`,
      refereeNotifTitle: 'Welcome Referral Bonus Approved',
      refereeNotifMessage: `Admin approved and credited your $${payouts.refereeAmount.toFixed(2)} welcome referral bonus!`,
    });

    if (!atomicRes.ok) {
      return res.status(500).json({
        success: false,
        status: 'processing',
        error: atomicRes.error || 'Failed to credit held referral award atomically.',
      });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'REFERRAL_HOLD_APPROVED',
      entityType: 'wallet',
      entityId: award.referrer_id,
      details: `Approved held referral ${award.id}; credited $${payouts.referrerAmount.toFixed(2)} / $${payouts.refereeAmount.toFixed(2)}. ${reviewNotes ? `Notes: ${reviewNotes}` : ''}`,
    });

    return res.status(200).json({
      success: true,
      status: 'rewarded',
      award: normalizeReferralLedgerRow(atomicRes.awardRow),
      message: 'Held referral approved and credited.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to review referral award' });
  }
}

export async function handlePostReconcileReferrals(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.actingUserId ? String(body.actingUserId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role !== 'admin' && caller.role !== 'agent') {
      return res.status(403).json({
        error: 'Access Denied: Staff authorization required to reconcile referral rewards.',
      });
    }

    const result = await reconcileMissingReferralRewards(deps, {
      userId: body?.userId ? String(body.userId).trim() : undefined,
      awardIds: Array.isArray(body?.awardIds) ? body.awardIds : undefined,
      limit: Number(body?.limit || 100),
      actor: { id: caller.id, name: caller.displayName, role: caller.role },
    });

    const creditedLegs = result.details.reduce(
      (sum, d) =>
        sum +
        (d.referrerCredited > 0 ? 1 : 0) +
        (d.refereeCredited > 0 ? 1 : 0) +
        ((d.walletBalanceRestored || 0) > 0 ? 1 : 0),
      0
    );
    const totalCreditedAmount = Number(
      result.details
        .reduce(
          (sum, d) =>
            sum +
            Number(d.referrerCredited || 0) +
            Number(d.refereeCredited || 0) +
            Number(d.walletBalanceRestored || 0),
          0
        )
        .toFixed(2)
    );

    return res.status(200).json({
      success: true,
      ...result,
      checkedAwards: result.scanned,
      reconciledAwards: result.reconciledCount,
      creditedLegs,
      totalCreditedAmount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to reconcile referral rewards' });
  }
}

export async function handleGetReferralSummary(
  deps: ReferralHandlerDeps,
  parsedUrl: URL,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const requestedUserId = (parsedUrl.searchParams.get('userId') || '').trim();
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: requestedUserId || undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role === 'anonymous' || !caller.id) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const isStaff = caller.role === 'admin' || caller.role === 'agent';
    const targetUserId = isStaff && requestedUserId ? requestedUserId : caller.id;

    const config = await loadReferralProgramConfig(deps.adminClient);

    // Recover eligible unfinalized referee awards (e.g., if user verified email + deposited before evaluate ran)
    if (config.enabled) {
      try {
        const [{ data: preOwner }, { data: preAward }] = await Promise.all([
          deps.adminClient
            .from('users')
            .select('id, email, display_name, phone, referred_by, email_verified, signup_ip, device_fingerprint')
            .eq('id', targetUserId)
            .maybeSingle(),
          deps.adminClient
            .from('referral_awards')
            .select('*')
            .eq('referee_id', targetUserId)
            .maybeSingle(),
        ]);

        const isUnfinalized =
          !preAward ||
          preAward.status === 'registered' ||
          preAward.status === 'pending_deposit';
        const refCode = normalizeReferralCodeInput(
          preAward?.referral_code_used || preOwner?.referred_by
        );

        if (
          preOwner &&
          isUnfinalized &&
          (preAward?.referrer_id || refCode) &&
          (!config.requireEmailVerified || Boolean(preOwner.email_verified))
        ) {
          const depProgress = await computeRefereeRealCashDeposits(deps.adminClient, targetUserId);
          if (depProgress.realDepositTotal >= config.qualificationDepositMin) {
            let referrer: any = null;
            if (preAward?.referrer_id) {
              const { data: rById } = await deps.adminClient
                .from('users')
                .select('*')
                .eq('id', preAward.referrer_id)
                .maybeSingle();
              referrer = rById;
            } else if (refCode) {
              const { data: rByCode } = await deps.adminClient
                .from('users')
                .select('*')
                .ilike('referral_code', refCode)
                .limit(1)
                .maybeSingle();
              referrer = rByCode;
            }

            if (referrer && referrer.id !== targetUserId) {
              const { data: otherUsers } = await deps.adminClient
                .from('users')
                .select('id, email, phone')
                .limit(200);
              const fraud = evaluateReferralFraudSignals({
                referrer: {
                  id: referrer.id,
                  email: referrer.email,
                  phone: referrer.phone,
                  signupIp: referrer.signup_ip,
                  deviceFingerprint: referrer.device_fingerprint,
                },
                referee: {
                  id: preOwner.id,
                  email: preOwner.email,
                  phone: preOwner.phone,
                  signupIp: preOwner.signup_ip,
                  deviceFingerprint: preOwner.device_fingerprint,
                },
                otherUsers: otherUsers || [],
                config,
                contextIp: extractClientIp(req),
              });
              const combinedFlags = Array.from(
                new Set([
                  ...(Array.isArray(preAward?.fraud_flags) ? preAward.fraud_flags : []),
                  ...fraud.fraudFlags,
                ])
              );
              const awardId = preAward?.id || `refaw_${preOwner.id}`;
              const depositBasis = depProgress.qualifyingDepositAmount || depProgress.realDepositTotal;
              const payouts = calculateReferralPayouts(config, depositBasis);
              const budget = await computeBudgetUsage(deps.adminClient, referrer.id);
              const capCheck = checkReferralBudgetCaps({
                config,
                referrerRewardedCount: budget.referrerRewardedCount,
                dailyTotalPaidToday: budget.dailyTotalPaidToday,
                payoutTotal: payouts.totalAmount,
              });

              if (
                !fraud.blocked &&
                capCheck.allowed &&
                !fraud.shouldHold &&
                !(combinedFlags.length > 0 && config.holdFlaggedForReview)
              ) {
                await awardReferralAtomically({
                  adminClient: deps.adminClient,
                  awardId,
                  referrerId: referrer.id,
                  refereeId: preOwner.id,
                  referralCodeUsed: referrer.referral_code || refCode,
                  source: preAward?.source || 'signup_link',
                  rewardMode: config.rewardMode,
                  payoutTarget: config.payoutTarget,
                  referrerRewardAmount: payouts.referrerAmount,
                  refereeRewardAmount: payouts.refereeAmount,
                  qualifyingDepositId: depProgress.qualifyingDepositId || null,
                  qualifyingDepositAmount: depProgress.realDepositTotal,
                  fraudFlags: combinedFlags,
                  referrerDescription: `Referral Reward: ${preOwner.display_name || preOwner.email} verified email & deposited $${depProgress.realDepositTotal.toFixed(2)}`,
                  refereeDescription: `Welcome Referral Bonus: Qualified under code ${referrer.referral_code || refCode}`,
                  referrerNotifTitle: 'Referral Reward Credited',
                  referrerNotifMessage: `You received $${payouts.referrerAmount.toFixed(2)} because ${preOwner.display_name || 'your friend'} verified their email and met the real deposit requirement.`,
                  refereeNotifTitle: 'Welcome Referral Bonus Credited',
                  refereeNotifMessage: `You received a $${payouts.refereeAmount.toFixed(2)} welcome referral bonus after qualifying!`,
                });
              }
            }
          }
        }
      } catch {
        // Non-blocking auto-recovery inside summary read
      }
    }

    // Automatically & safely reconcile missing wallet/ledger credits for this user first
    await reconcileMissingReferralRewards(deps, {
      userId: targetUserId,
      limit: 50,
    });

    const [{ data: owner }, { data: ownerWallet }, { data: ownerReferralTxs }, { data: awards, error: awErr }, { data: refereeAward }] =
      await Promise.all([
        deps.adminClient
          .from('users')
          .select('id, referral_code, display_name, referred_by, email_verified')
          .eq('id', targetUserId)
          .maybeSingle(),
        deps.adminClient
          .from('wallets')
          .select('customer_id, balance, referral_bonus_balance')
          .eq('customer_id', targetUserId)
          .maybeSingle(),
        deps.adminClient
          .from('transactions')
          .select('id, customer_id, amount, type, status, reference_id, created_at')
          .eq('customer_id', targetUserId)
          .eq('type', 'referral_reward')
          .limit(200),
        deps.adminClient
          .from('referral_awards')
          .select('*')
          .eq('referrer_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(100),
        deps.adminClient
          .from('referral_awards')
          .select('*')
          .eq('referee_id', targetUserId)
          .maybeSingle(),
      ]);

    if (awErr && isSchemaMissingError(awErr)) {
      return res.status(503).json({
        error: 'Referral ledger table (referral_awards) is not provisioned yet.',
        code: 'SCHEMA_MIGRATION_REQUIRED',
      });
    }

    const referralCode =
      owner?.referral_code || `REF_${targetUserId.slice(-5).toUpperCase()}`;

    const ownerTxList = Array.isArray(ownerReferralTxs) ? ownerReferralTxs : [];
    const awardRows = Array.isArray(awards) ? awards : [];
    const refereeIds = awardRows.map((a: any) => a.referee_id).filter(Boolean);

    const refereesById: Record<string, any> = {};
    const depositTotalsById: Record<string, number> = {};

    if (refereeIds.length > 0) {
      const [{ data: refUsers }, { data: refTopups }] = await Promise.all([
        deps.adminClient
          .from('users')
          .select('id, display_name, email_verified, created_at')
          .in('id', refereeIds),
        deps.adminClient
          .from('topups')
          .select('customer_id, amount, status, payment_method_id')
          .in('customer_id', refereeIds)
          .limit(300),
      ]);

      for (const u of refUsers || []) {
        refereesById[u.id] = u;
      }
      for (const t of refTopups || []) {
        if (isRealCashTopUpRow(t)) {
          depositTotalsById[t.customer_id] = Number(
            ((depositTotalsById[t.customer_id] || 0) + Number(t.amount || 0)).toFixed(2)
          );
        }
      }
    }

    const referredUsers: ReferredUser[] = awardRows.map((row: any) => {
      const refUser = refereesById[row.referee_id];
      const depositTotal = Math.max(
        Number(row.qualifying_deposit_amount || 0),
        depositTotalsById[row.referee_id] || 0
      );
      const ledgerCredits = getAwardCreditedStatus(
        row.id,
        ownerTxList,
        targetUserId,
        row.referee_id
      );
      const expectedRefAmt = Number(row.referrer_reward_amount || 0);
      const actualCreditedRef = ledgerCredits.referrerAmount;
      const effectiveStatus =
        row.status === 'rewarded' && expectedRefAmt > 0 && !ledgerCredits.referrerCredited
          ? 'processing'
          : row.status;

      return {
        id: row.referee_id,
        displayName: refUser?.display_name || 'Invited Player',
        joinedAt: refUser?.created_at || row.created_at,
        status: effectiveStatus,
        depositTotal,
        // All displayed reward amounts reflect actual completed wallet ledger transactions
        rewardEarned: actualCreditedRef,
        refereeRewardEarned: Number(row.referee_reward_amount || 0),
        emailVerified: Boolean(refUser?.email_verified),
        hasRealDepositMet: depositTotal >= config.qualificationDepositMin,
        fraudFlags: Array.isArray(row.fraud_flags) ? row.fraud_flags : [],
        reviewNotes: row.review_notes || undefined,
        source: row.source,
      };
    });

    // Authoritative ledger-backed referrer earnings
    const totalRewardsEarned = Number(
      referredUsers.reduce((s, r) => s + (r.rewardEarned || 0), 0).toFixed(2)
    );
    const pendingRewards = Number(
      awardRows
        .filter((r: any) => r.status === 'held_for_review' || r.status === 'processing')
        .reduce((s: number, r: any) => s + Number(r.referrer_reward_amount || 0), 0)
        .toFixed(2)
    );

    // Build Referee Welcome Bonus state strictly backed by wallet/ledger transactions
    const refereeDeposits = await computeRefereeRealCashDeposits(deps.adminClient, targetUserId);
    const hasReferrer = Boolean(refereeAward || owner?.referred_by);
    let referrerDisplayName: string | undefined;
    if (refereeAward?.referrer_id) {
      const { data: rUser } = await deps.adminClient
        .from('users')
        .select('id, display_name')
        .eq('id', refereeAward.referrer_id)
        .maybeSingle();
      referrerDisplayName = rUser?.display_name || undefined;
    } else if (owner?.referred_by) {
      const { data: rByCode } = await deps.adminClient
        .from('users')
        .select('id, display_name')
        .ilike('referral_code', normalizeReferralCodeInput(owner.referred_by))
        .limit(1)
        .maybeSingle();
      referrerDisplayName = rByCode?.display_name || undefined;
    }

    const welcomeTxCredits = refereeAward?.id
      ? getAwardCreditedStatus(refereeAward.id, ownerTxList, refereeAward.referrer_id, targetUserId)
      : { refereeCredited: false, refereeAmount: 0, refereeTxId: undefined };

    const fallbackExpectedWelcome = hasReferrer
      ? calculateReferralPayouts(
          config,
          refereeDeposits.realDepositTotal > 0
            ? refereeDeposits.realDepositTotal
            : config.qualificationDepositMin
        ).refereeAmount
      : 0;
    const storedWelcomeAmt = Number(refereeAward?.referee_reward_amount || 0);
    const expectedWelcomeAmt = storedWelcomeAmt > 0 ? storedWelcomeAmt : fallbackExpectedWelcome;

    let welcomeStatus: 'none' | 'pending' | 'processing' | 'rewarded' | 'held' | 'rejected' = 'none';
    if (hasReferrer) {
      if (refereeAward?.status === 'rejected' || refereeAward?.status === 'capped') {
        welcomeStatus = 'rejected';
      } else if (refereeAward?.status === 'held_for_review') {
        welcomeStatus = 'held';
      } else if (
        refereeAward?.status === 'rewarded' &&
        (welcomeTxCredits.refereeCredited || expectedWelcomeAmt === 0)
      ) {
        welcomeStatus = 'rewarded';
      } else if (
        refereeAward?.status === 'processing' ||
        (refereeAward?.status === 'rewarded' && !welcomeTxCredits.refereeCredited && expectedWelcomeAmt > 0) ||
        (refereeDeposits.realDepositTotal >= config.qualificationDepositMin &&
          (!config.requireEmailVerified || Boolean(owner?.email_verified ?? true)))
      ) {
        welcomeStatus = 'processing';
      } else {
        welcomeStatus = 'pending';
      }
    }

    const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host || '';
    const proto = req?.headers?.['x-forwarded-proto'] || 'https';
    const origin = req?.headers?.origin || (host ? `${proto}://${host}` : '');
    const referralLink = origin ? `${origin}/signup?ref=${referralCode}` : `/signup?ref=${referralCode}`;

    return res.status(200).json({
      success: true,
      summary: {
        referralCode,
        referralLink,
        totalReferred: referredUsers.length,
        activeReferred: referredUsers.filter((u) => u.status === 'rewarded').length,
        totalRewardsEarned,
        pendingRewards,
        heldRewardsCount: referredUsers.filter((u) => u.status === 'held_for_review').length,
        rewardMode: config.rewardMode,
        referrerRewardValue: config.referrerRewardValue,
        refereeRewardValue: config.refereeRewardValue,
        rewardPerReferral: config.referrerRewardValue,
        qualifyingDepositMin: config.qualificationDepositMin,
        payoutTarget: config.payoutTarget,
        maxReferralsPerUser: config.maxReferralsPerUser,
        programEnabled: config.enabled,
        referredUsers,
        walletBalances: {
          availableBalance: Number(ownerWallet?.balance ?? ownerWallet?.available_balance ?? 0),
          referralBonusBalance: Number(ownerWallet?.referral_bonus_balance ?? 0),
        },
        welcomeBonus: {
          hasReferrer,
          awardId: refereeAward?.id,
          referrerId: refereeAward?.referrer_id,
          referrerName: referrerDisplayName,
          referralCodeUsed: refereeAward?.referral_code_used || owner?.referred_by || undefined,
          status: welcomeStatus,
          expectedAmount: expectedWelcomeAmt,
          creditedAmount: welcomeTxCredits.refereeAmount,
          depositTotal: Math.max(
            Number(refereeAward?.qualifying_deposit_amount || 0),
            refereeDeposits.realDepositTotal
          ),
          qualifyingDepositMin: config.qualificationDepositMin,
          payoutTarget:
            refereeAward?.payout_target === 'available_balance'
              ? 'available_balance'
              : config.payoutTarget,
          txId: welcomeTxCredits.refereeTxId,
          rewardedAt: refereeAward?.rewarded_at || undefined,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch referral summary' });
  }
}

export async function handlePostAdminReferralConfig(
  deps: ReferralHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.actingUserId ? String(body.actingUserId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (caller.role !== 'admin') {
      return res.status(403).json({
        error: 'Access Denied: Only Administrators can modify referral program settings.',
      });
    }

    const normalized = normalizeReferralConfig(body?.referralProgram || body);
    const { data: existingCfg } = await deps.adminClient
      .from('app_config')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const nextData = {
      ...(existingCfg?.data || {}),
      referralProgram: normalized,
    };

    const { error: upsertErr } = await deps.adminClient.from('app_config').upsert({
      id: 'main',
      data: nextData,
      updated_at: nowIso,
    });

    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'REFERRAL_SETTINGS_UPDATED',
      entityType: 'settings',
      entityId: 'referral_program',
      details: `Updated referral rules: ${normalized.enabled ? 'Enabled' : 'Disabled'}, mode=${normalized.rewardMode}, referrer=${normalized.referrerRewardValue}, friend=${normalized.refereeRewardValue}, minDeposit=$${normalized.qualificationDepositMin}, target=${normalized.payoutTarget}, maxPerUser=${normalized.maxReferralsPerUser}, dailyCap=$${normalized.dailyPayoutCap}.`,
    });

    return res.status(200).json({
      success: true,
      referralProgram: normalized,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save referral settings' });
  }
}
