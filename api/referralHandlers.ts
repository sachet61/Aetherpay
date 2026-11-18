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
} from '../src/utils/referralUtils';
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
}) {
  const { adminClient, customerId, amount, target } = params;
  if (amount <= 0) return;

  const nowIso = new Date().toISOString();
  const { data: wallet } = await adminClient
    .from('wallets')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  const currentCash = Number(wallet?.balance ?? wallet?.available_balance ?? 0);
  const currentRefBonus = Number(wallet?.referral_bonus_balance ?? 0);

  const nextCash = target === 'available_balance' ? Number((currentCash + amount).toFixed(2)) : currentCash;
  const nextRefBonus =
    target === 'referral_bonus' ? Number((currentRefBonus + amount).toFixed(2)) : currentRefBonus;

  if (wallet) {
    const updatePayload: Record<string, any> = {
      updated_at: nowIso,
    };
    if (target === 'available_balance') {
      updatePayload.balance = nextCash;
    } else {
      updatePayload.referral_bonus_balance = nextRefBonus;
    }
    const { error: wErr } = await adminClient
      .from('wallets')
      .update(updatePayload)
      .eq('customer_id', customerId);
    if (wErr && String(wErr.message || '').includes('referral_bonus_balance')) {
      // Fallback if referral_bonus_balance column has not been added yet
      await adminClient
        .from('wallets')
        .update({ balance: Number((currentCash + amount).toFixed(2)), updated_at: nowIso })
        .eq('customer_id', customerId);
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
    const { error: iErr } = await adminClient.from('wallets').insert(insertPayload);
    if (iErr && String(iErr.message || '').includes('referral_bonus_balance')) {
      delete insertPayload.referral_bonus_balance;
      insertPayload.balance = Number((currentCash + amount).toFixed(2));
      await adminClient.from('wallets').insert(insertPayload);
    }
  }

  // Idempotent transaction record
  await adminClient.from('transactions').upsert({
    id: params.txId,
    customer_id: customerId,
    amount,
    type: 'referral_reward',
    status: 'completed',
    description: params.description,
    reference_id: params.referenceId,
    created_at: nowIso,
  });

  // In-app notification
  await adminClient.from('notifications').insert({
    id: `notif_ref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: customerId,
    title: params.notificationTitle,
    message: params.notificationMessage,
    type: 'referral',
    read: false,
    link_tab: 'referrals',
    created_at: nowIso,
  });
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
      existingAward?.status === 'rejected'
    ) {
      return res.status(200).json({
        success: true,
        alreadyFinalized: true,
        status: existingAward.status,
        award: normalizeReferralLedgerRow(existingAward),
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

    // Finalize & pay atomically (one-time per referee)
    const { data: rewardedRow, error: payErr } = await deps.adminClient
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
        status: 'rewarded',
        fraud_flags: combinedFlags,
        rewarded_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .maybeSingle();

    if (payErr) {
      return res.status(500).json({ error: payErr.message });
    }

    if (payouts.referrerAmount > 0) {
      await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: referrer.id,
        amount: payouts.referrerAmount,
        target: config.payoutTarget,
        txId: `tx_ref_r_${awardId}`,
        idempotencyKey: `idemp_ref_r_${awardId}`,
        description: `Referral Reward: ${referee.display_name || referee.email} verified email & deposited $${depositProgress.realDepositTotal.toFixed(2)}`,
        referenceId: awardId,
        notificationTitle: 'Referral Reward Credited',
        notificationMessage: `You received $${payouts.referrerAmount.toFixed(2)} because ${referee.display_name || 'your friend'} verified their email and met the real deposit requirement.`,
      });
    }

    if (payouts.refereeAmount > 0) {
      await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: referee.id,
        amount: payouts.refereeAmount,
        target: config.payoutTarget,
        txId: `tx_ref_f_${awardId}`,
        idempotencyKey: `idemp_ref_f_${awardId}`,
        description: `Welcome Referral Bonus: Qualified under code ${referrer.referral_code || refCode}`,
        referenceId: awardId,
        notificationTitle: 'Welcome Referral Bonus Credited',
        notificationMessage: `You received a $${payouts.refereeAmount.toFixed(2)} welcome referral bonus after qualifying!`,
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
      award: normalizeReferralLedgerRow(rewardedRow),
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

    const { data: paidRow, error: payErr } = await deps.adminClient
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
        status: 'rewarded',
        fraud_flags: fraud.fraudFlags,
        staff_reason: reason || null,
        assigned_by: caller.id,
        assigned_by_name: caller.displayName,
        reviewed_by: caller.role === 'admin' ? caller.id : null,
        reviewed_by_name: caller.role === 'admin' ? caller.displayName : null,
        rewarded_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .maybeSingle();

    if (payErr) {
      return res.status(500).json({ error: payErr.message });
    }

    if (payouts.referrerAmount > 0) {
      await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: referrer.id,
        amount: payouts.referrerAmount,
        target: config.payoutTarget,
        txId: `tx_ref_r_${awardId}`,
        idempotencyKey: `idemp_ref_r_${awardId}`,
        description: `Manual Referral Reward (${caller.displayName}): ${referee.display_name || referee.email}`,
        referenceId: awardId,
        notificationTitle: 'Referral Reward Credited',
        notificationMessage: `Staff credited your $${payouts.referrerAmount.toFixed(2)} referral bonus for ${referee.display_name}.`,
      });
    }

    if (payouts.refereeAmount > 0) {
      await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: referee.id,
        amount: payouts.refereeAmount,
        target: config.payoutTarget,
        txId: `tx_ref_f_${awardId}`,
        idempotencyKey: `idemp_ref_f_${awardId}`,
        description: `Welcome Referral Bonus (${caller.displayName}): Linked to ${referrer.display_name}`,
        referenceId: awardId,
        notificationTitle: 'Welcome Referral Bonus Credited',
        notificationMessage: `Staff credited your $${payouts.refereeAmount.toFixed(2)} welcome referral bonus!`,
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
      award: normalizeReferralLedgerRow(paidRow),
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

    // Approve held award -> credit both wallets
    const config = await loadReferralProgramConfig(deps.adminClient);
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
            Number(award.qualifying_deposit_amount || 0) || config.qualificationDepositMin
          );

    const payoutTarget: ReferralPayoutTarget =
      award.payout_target === 'available_balance' ? 'available_balance' : config.payoutTarget;

    const { data: approvedRow, error: updErr } = await deps.adminClient
      .from('referral_awards')
      .update({
        status: 'rewarded',
        referrer_reward_amount: payouts.referrerAmount,
        referee_reward_amount: payouts.refereeAmount,
        reviewed_by: caller.id,
        reviewed_by_name: caller.displayName,
        review_notes: reviewNotes || 'Approved after Admin review.',
        rewarded_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', award.id)
      .select()
      .maybeSingle();

    if (updErr) {
      return res.status(500).json({ error: updErr.message });
    }

    if (payouts.referrerAmount > 0) {
      await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: award.referrer_id,
        amount: payouts.referrerAmount,
        target: payoutTarget,
        txId: `tx_ref_r_${award.id}`,
        idempotencyKey: `idemp_ref_r_${award.id}`,
        description: `Referral Reward Approved (${caller.displayName}): Award #${award.id.slice(-6)}`,
        referenceId: award.id,
        notificationTitle: 'Held Referral Reward Approved',
        notificationMessage: `Admin verified and credited $${payouts.referrerAmount.toFixed(2)} referral bonus to your wallet.`,
      });
    }

    if (payouts.refereeAmount > 0) {
      await creditPlayerWallet({
        adminClient: deps.adminClient,
        customerId: award.referee_id,
        amount: payouts.refereeAmount,
        target: payoutTarget,
        txId: `tx_ref_f_${award.id}`,
        idempotencyKey: `idemp_ref_f_${award.id}`,
        description: `Welcome Referral Bonus Approved (${caller.displayName})`,
        referenceId: award.id,
        notificationTitle: 'Welcome Referral Bonus Approved',
        notificationMessage: `Admin approved and credited your $${payouts.refereeAmount.toFixed(2)} welcome referral bonus!`,
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
      award: normalizeReferralLedgerRow(approvedRow),
      message: 'Held referral approved and credited.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to review referral award' });
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

    const { data: owner } = await deps.adminClient
      .from('users')
      .select('id, referral_code, display_name')
      .eq('id', targetUserId)
      .maybeSingle();

    const config = await loadReferralProgramConfig(deps.adminClient);
    const referralCode =
      owner?.referral_code || `REF_${targetUserId.slice(-5).toUpperCase()}`;

    const { data: awards, error: awErr } = await deps.adminClient
      .from('referral_awards')
      .select('*')
      .eq('referrer_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (awErr && isSchemaMissingError(awErr)) {
      return res.status(503).json({
        error: 'Referral ledger table (referral_awards) is not provisioned yet.',
        code: 'SCHEMA_MIGRATION_REQUIRED',
      });
    }

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
      return {
        id: row.referee_id,
        displayName: refUser?.display_name || 'Invited Player',
        joinedAt: refUser?.created_at || row.created_at,
        status: row.status,
        depositTotal,
        rewardEarned: row.status === 'rewarded' ? Number(row.referrer_reward_amount || 0) : 0,
        refereeRewardEarned: row.status === 'rewarded' ? Number(row.referee_reward_amount || 0) : 0,
        emailVerified: Boolean(refUser?.email_verified),
        hasRealDepositMet: depositTotal >= config.qualificationDepositMin,
        fraudFlags: Array.isArray(row.fraud_flags) ? row.fraud_flags : [],
        reviewNotes: row.review_notes || undefined,
        source: row.source,
      };
    });

    const totalRewardsEarned = Number(
      referredUsers.reduce((s, r) => s + (r.rewardEarned || 0), 0).toFixed(2)
    );
    const pendingRewards = Number(
      awardRows
        .filter((r: any) => r.status === 'held_for_review')
        .reduce((s: number, r: any) => s + Number(r.referrer_reward_amount || 0), 0)
        .toFixed(2)
    );

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
