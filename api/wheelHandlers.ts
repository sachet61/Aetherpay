import crypto from 'node:crypto';
import {
  DEFAULT_WHEEL_OF_LUCK_CONFIG,
  ROLLING_SPIN_COOLDOWN_MS,
  buildGameBonusLoadStaffMessage,
  computeGameCreditUnloadSplit,
  evaluateWheelEligibility,
  normalizeWheelConfig,
  selectWeightedWheelSegment,
  validateWheelConfig,
} from '../src/utils/wheelOfLuckUtils.js';
import type {
  WheelOfLuckConfig,
  WheelSpinRecord,
} from '../src/types';

export interface WheelCallerProfile {
  id: string;
  email?: string;
  displayName: string;
  role: 'admin' | 'agent' | 'customer' | 'anonymous';
  verifiedByJwt: boolean;
  jwtRejected?: boolean;
}

export interface WheelAuditInput {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface WheelHandlerDeps {
  adminClient: any;
  resolveCaller: (
    adminClient: any,
    context?: { headers?: Record<string, any>; viewerUserId?: string }
  ) => Promise<WheelCallerProfile>;
  writeAudit: (adminClient: any, input: WheelAuditInput) => Promise<any>;
  nowFn?: () => number;
  randomUnitFn?: () => number;
  notifyTelegram?: (adminClient: any, text: string) => Promise<boolean>;
}

function setNoStoreHeaders(res: any) {
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }
}

function isMissingFunctionError(err: any): boolean {
  const code = String(err?.code || '').trim();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('could not find the function') ||
    (msg.includes('function') && msg.includes('does not exist'))
  );
}

function isMissingTableOrColumnError(err: any): boolean {
  const code = String(err?.code || '').trim();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the')
  );
}

function generateCryptoRandomUnit(): number {
  return crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
}

function mapWheelSpinRow(row: any): WheelSpinRecord {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    segmentId: String(row.segment_id || ''),
    segmentLabel: String(row.segment_label || ''),
    rewardAmount: Number(Number(row.reward_amount ?? 0).toFixed(2)),
    simulatedWinAmount: Number(Number(row.simulated_win_amount ?? 0).toFixed(2)),
    probabilityWeight: Number(row.probability_weight ?? 0),
    status: String(row.status || 'completed'),
    txId: row.tx_id ? String(row.tx_id) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

async function loadAuthoritativeWheelConfig(adminClient: any): Promise<WheelOfLuckConfig> {
  const { data } = await adminClient
    .from('app_config')
    .select('data')
    .eq('id', 'main')
    .maybeSingle();
  return normalizeWheelConfig(data?.data?.wheelOfLuck || DEFAULT_WHEEL_OF_LUCK_CONFIG);
}

async function loadPlayerWalletSummary(adminClient: any, customerId: string) {
  const { data: wallet, error } = await adminClient
    .from('wallets')
    .select('customer_id, balance, referral_bonus_balance, free_play_balance, currency, updated_at')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error && isMissingTableOrColumnError(error)) {
    const { data: legacyWallet, error: legErr } = await adminClient
      .from('wallets')
      .select('customer_id, balance, referral_bonus_balance, currency, updated_at')
      .eq('customer_id', customerId)
      .maybeSingle();
    if (legErr) throw legErr;
    return {
      row: legacyWallet,
      schemaMissingFreePlay: true,
      availableBalance: Number(legacyWallet?.balance ?? 0),
      referralBonusBalance: Number(legacyWallet?.referral_bonus_balance ?? 0),
      freePlayBalance: 0,
    };
  }

  if (error) throw error;

  return {
    row: wallet,
    schemaMissingFreePlay: false,
    availableBalance: Number(wallet?.balance ?? 0),
    referralBonusBalance: Number(wallet?.referral_bonus_balance ?? 0),
    freePlayBalance: Number(wallet?.free_play_balance ?? 0),
  };
}

export async function handleGetWheelStatus(
  deps: WheelHandlerDeps,
  parsedUrl: URL,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: parsedUrl.searchParams.get('userId') || undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (!caller.id || caller.role === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required to access Wheel of Luck.' });
    }

    const nowMs = (deps.nowFn || Date.now)();
    const config = await loadAuthoritativeWheelConfig(deps.adminClient);

    const { data: spinRows, error: spinErr } = await deps.adminClient
      .from('wheel_spins')
      .select(
        'id, customer_id, segment_id, segment_label, reward_amount, simulated_win_amount, probability_weight, status, tx_id, created_at'
      )
      .eq('customer_id', caller.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (spinErr) {
      if (isMissingTableOrColumnError(spinErr)) {
        return res.status(503).json({
          error: 'Wheel of Luck database schema is pending migration (supabase_schema.sql Section 19).',
          code: 'WHEEL_SCHEMA_MISSING',
        });
      }
      return res.status(500).json({ error: spinErr.message || 'Failed to load wheel spin status.' });
    }

    const recentSpins = (spinRows || []).map(mapWheelSpinRow);
    const latestCompleted = recentSpins.find((s) => s.status === 'completed') || null;
    const walletSummary = await loadPlayerWalletSummary(deps.adminClient, caller.id);
    if (walletSummary.schemaMissingFreePlay) {
      return res.status(503).json({
        error: 'wallets.free_play_balance column is missing. Run supabase_schema.sql Section 19.',
        code: 'WHEEL_SCHEMA_MISSING',
      });
    }

    const eligibility = evaluateWheelEligibility({
      config,
      lastSpinAt: latestCompleted?.createdAt || null,
      serverNowMs: nowMs,
    });

    return res.status(200).json({
      config,
      eligibility,
      freePlayBalance: walletSummary.freePlayBalance,
      availableBalance: walletSummary.availableBalance,
      referralBonusBalance: walletSummary.referralBonusBalance,
      recentSpins,
      latestSpin: latestCompleted,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch Wheel of Luck status.' });
  }
}

export async function handlePostWheelSpin(
  deps: WheelHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.userId ? String(body.userId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (!caller.id || caller.role === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required to spin the Wheel of Luck.' });
    }

    const playerId = caller.id;
    const nowMs = (deps.nowFn || Date.now)();
    const config = await loadAuthoritativeWheelConfig(deps.adminClient);

    if (!config.enabled) {
      return res.status(403).json({
        error: 'Wheel of Luck is currently disabled by Admin.',
        code: 'WHEEL_DISABLED',
      });
    }

    const randomUnit = (deps.randomUnitFn || generateCryptoRandomUnit)();
    const selection = selectWeightedWheelSegment(config.segments, randomUnit);
    if (!selection) {
      return res.status(409).json({
        error: 'No active reward segments are configured for the Wheel of Luck.',
        code: 'NO_ACTIVE_SEGMENTS',
      });
    }

    const rawIdemp = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim().slice(0, 96) : '';
    const idempotencyKey = rawIdemp || null;
    const spinId = `wspin_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const txId = `tx_wspin_${spinId}`;
    const simDisplayAmount = config.simulatedWinDisplay.enabled
      ? Number(config.simulatedWinDisplay.amount.toFixed(2))
      : 0;

    // 1. Authoritative atomic PostgreSQL RPC path
    if (typeof deps.adminClient.rpc === 'function') {
      const { data: rpcRes, error: rpcErr } = await deps.adminClient.rpc('claim_wheel_of_luck_spin', {
        p_spin_id: spinId,
        p_customer_id: playerId,
        p_segment_id: selection.segment.id,
        p_segment_label: selection.segment.label,
        p_reward_amount: selection.segment.rewardAmount,
        p_simulated_win_amount: simDisplayAmount,
        p_probability_weight: selection.segment.probabilityWeight,
        p_idempotency_key: idempotencyKey,
        p_tx_id: txId,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        if (rpcRes.ok === false) {
          if (rpcRes.errorCode === 'COOLDOWN_ACTIVE') {
            const serverNowMs = rpcRes.serverNow ? Date.parse(rpcRes.serverNow) : nowMs;
            const eligibility = evaluateWheelEligibility({
              config,
              lastSpinAt: rpcRes.lastSpinAt || null,
              serverNowMs: Number.isFinite(serverNowMs) ? serverNowMs : nowMs,
            });
            return res.status(429).json({
              error: eligibility.reason || 'Daily spin already claimed. Please wait 24 hours.',
              code: 'COOLDOWN_ACTIVE',
              eligibility,
            });
          }
          if (rpcRes.errorCode === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: 'Player account not found.', code: 'USER_NOT_FOUND' });
          }
          return res.status(400).json({ error: rpcRes.error || 'Unable to process wheel spin.' });
        }

        const segIndex = Math.max(
          0,
          config.segments.findIndex((s) => s.id === String(rpcRes.segmentId || selection.segment.id))
        );
        const createdAt = String(rpcRes.createdAt || new Date(nowMs).toISOString());
        const serverNowStr = String(rpcRes.serverNow || createdAt);
        const serverNowParsed = Date.parse(serverNowStr);
        const eligibility = evaluateWheelEligibility({
          config,
          lastSpinAt: createdAt,
          serverNowMs: Number.isFinite(serverNowParsed) ? serverNowParsed : nowMs,
        });

        const spinRecord: WheelSpinRecord = {
          id: String(rpcRes.spinId || spinId),
          customerId: playerId,
          segmentId: String(rpcRes.segmentId || selection.segment.id),
          segmentLabel: String(rpcRes.segmentLabel || selection.segment.label),
          rewardAmount: Number(Number(rpcRes.rewardAmount ?? selection.segment.rewardAmount).toFixed(2)),
          simulatedWinAmount: Number(Number(rpcRes.simulatedWinAmount ?? simDisplayAmount).toFixed(2)),
          probabilityWeight: selection.segment.probabilityWeight,
          status: 'completed',
          txId: rpcRes.txId ? String(rpcRes.txId) : undefined,
          createdAt,
        };

        if (!rpcRes.idempotentReplay) {
          await deps.writeAudit(deps.adminClient, {
            actorId: playerId,
            actorName: caller.displayName,
            actorRole: caller.role,
            action: 'WHEEL_SPIN_CLAIMED',
            entityType: 'wallet',
            entityId: spinRecord.id,
            details: `Wheel of Luck spin landed on "${spinRecord.segmentLabel}" (actual free-play credited: $${spinRecord.rewardAmount.toFixed(2)}; display-only simulated showcase: $${spinRecord.simulatedWinAmount.toFixed(2)}).`,
          });
        }

        return res.status(200).json({
          success: true,
          idempotentReplay: Boolean(rpcRes.idempotentReplay),
          spin: spinRecord,
          segmentIndex: segIndex,
          actualRewardAmount: spinRecord.rewardAmount,
          simulatedWinDisplay: {
            enabled: config.simulatedWinDisplay.enabled,
            amount: simDisplayAmount,
            label: config.simulatedWinDisplay.label,
            isSimulatedOnly: true,
          },
          eligibility,
          freePlayBalance: Number(Number(rpcRes.freePlayBalance ?? 0).toFixed(2)),
          availableBalance: Number(Number(rpcRes.availableBalance ?? 0).toFixed(2)),
          referralBonusBalance: Number(Number(rpcRes.referralBonusBalance ?? 0).toFixed(2)),
        });
      }

      if (rpcErr && !isMissingFunctionError(rpcErr)) {
        return res.status(500).json({ error: rpcErr.message || 'Wheel spin transaction failed.' });
      }
    }

    // 2. Fallback path (when RPC is not yet installed, e.g., before SQL RPC deployment or in unit tests)
    // First check idempotency replay
    if (idempotencyKey) {
      const { data: existingByKey, error: idempErr } = await deps.adminClient
        .from('wheel_spins')
        .select(
          'id, customer_id, segment_id, segment_label, reward_amount, simulated_win_amount, probability_weight, status, tx_id, created_at'
        )
        .eq('customer_id', playerId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (idempErr && isMissingTableOrColumnError(idempErr)) {
        return res.status(503).json({
          error: 'Wheel of Luck database schema is pending migration (supabase_schema.sql Section 19).',
          code: 'WHEEL_SCHEMA_MISSING',
        });
      }

      if (existingByKey) {
        const mapped = mapWheelSpinRow(existingByKey);
        const walletSummary = await loadPlayerWalletSummary(deps.adminClient, playerId);
        const eligibility = evaluateWheelEligibility({
          config,
          lastSpinAt: mapped.createdAt,
          serverNowMs: nowMs,
        });
        const segIdx = Math.max(0, config.segments.findIndex((s) => s.id === mapped.segmentId));
        return res.status(200).json({
          success: true,
          idempotentReplay: true,
          spin: mapped,
          segmentIndex: segIdx,
          actualRewardAmount: mapped.rewardAmount,
          simulatedWinDisplay: {
            enabled: config.simulatedWinDisplay.enabled,
            amount: simDisplayAmount,
            label: config.simulatedWinDisplay.label,
            isSimulatedOnly: true,
          },
          eligibility,
          freePlayBalance: walletSummary.freePlayBalance,
          availableBalance: walletSummary.availableBalance,
          referralBonusBalance: walletSummary.referralBonusBalance,
        });
      }
    }

    // Check rolling 24h cooldown
    const { data: recentRows, error: recentErr } = await deps.adminClient
      .from('wheel_spins')
      .select('id, created_at, status')
      .eq('customer_id', playerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentErr) {
      if (isMissingTableOrColumnError(recentErr)) {
        return res.status(503).json({
          error: 'Wheel of Luck database schema is pending migration (supabase_schema.sql Section 19).',
          code: 'WHEEL_SCHEMA_MISSING',
        });
      }
      return res.status(500).json({ error: recentErr.message || 'Failed to verify spin eligibility.' });
    }

    const latestRow = Array.isArray(recentRows) && recentRows.length > 0 ? recentRows[0] : null;
    const preCheckEligibility = evaluateWheelEligibility({
      config,
      lastSpinAt: latestRow?.created_at || null,
      serverNowMs: nowMs,
    });
    if (!preCheckEligibility.eligible) {
      return res.status(429).json({
        error: preCheckEligibility.reason || 'Daily spin already claimed. Please wait 24 hours.',
        code: 'COOLDOWN_ACTIVE',
        eligibility: preCheckEligibility,
      });
    }

    const walletSummary = await loadPlayerWalletSummary(deps.adminClient, playerId);
    if (walletSummary.schemaMissingFreePlay) {
      return res.status(503).json({
        error: 'wallets.free_play_balance column is missing. Run supabase_schema.sql Section 19.',
        code: 'WHEEL_SCHEMA_MISSING',
      });
    }

    const nowIso = new Date(nowMs).toISOString();
    const rewardAmt = Number(selection.segment.rewardAmount.toFixed(2));
    const insertedRow = {
      id: spinId,
      customer_id: playerId,
      segment_id: selection.segment.id,
      segment_label: selection.segment.label,
      reward_amount: rewardAmt,
      simulated_win_amount: simDisplayAmount,
      probability_weight: selection.segment.probabilityWeight,
      idempotency_key: idempotencyKey,
      tx_id: rewardAmt > 0 ? txId : null,
      status: 'completed',
      created_at: nowIso,
    };

    const { error: spinInsertErr } = await deps.adminClient.from('wheel_spins').insert(insertedRow);
    if (spinInsertErr) {
      const msg = String(spinInsertErr.message || '').toLowerCase();
      if (String(spinInsertErr.code || '') === '23505' || msg.includes('duplicate')) {
        return res.status(409).json({
          error: 'Duplicate spin request detected. Please refresh your Wheel status.',
          code: 'DUPLICATE_SPIN_REQUEST',
        });
      }
      return res.status(500).json({ error: spinInsertErr.message || 'Failed to record wheel spin.' });
    }

    let nextFreePlay = walletSummary.freePlayBalance;
    if (rewardAmt > 0) {
      nextFreePlay = Number((walletSummary.freePlayBalance + rewardAmt).toFixed(2));

      if (walletSummary.row) {
        const { error: updErr } = await deps.adminClient
          .from('wallets')
          .update({
            free_play_balance: nextFreePlay,
            updated_at: nowIso,
          })
          .eq('customer_id', playerId);

        if (updErr) {
          await deps.adminClient.from('wheel_spins').delete().eq('id', spinId);
          return res.status(500).json({ error: updErr.message || 'Failed to credit free-play balance.' });
        }
      } else {
        const { error: insWErr } = await deps.adminClient.from('wallets').insert({
          customer_id: playerId,
          balance: 0,
          referral_bonus_balance: 0,
          free_play_balance: nextFreePlay,
          pending_withdrawal: 0,
          pending_deposit: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          currency: 'USD',
          updated_at: nowIso,
        });
        if (insWErr) {
          await deps.adminClient.from('wheel_spins').delete().eq('id', spinId);
          return res.status(500).json({ error: insWErr.message || 'Failed to initialize free-play wallet.' });
        }
      }

      const { error: txErr } = await deps.adminClient.from('transactions').insert({
        id: txId,
        customer_id: playerId,
        amount: rewardAmt,
        type: 'free_play_bonus',
        status: 'completed',
        description: `Wheel of Luck Daily Free-Play Reward (${selection.segment.label})`,
        reference_id: spinId,
        game_name: 'Wheel of Luck',
        created_at: nowIso,
      });

      if (txErr) {
        // Rollback wallet + spin so ledger and balance never diverge
        await deps.adminClient
          .from('wallets')
          .update({ free_play_balance: walletSummary.freePlayBalance, updated_at: nowIso })
          .eq('customer_id', playerId);
        await deps.adminClient.from('wheel_spins').delete().eq('id', spinId);
        return res.status(500).json({ error: txErr.message || 'Failed to record free-play transaction.' });
      }

      await deps.adminClient.from('notifications').insert({
        id: `notif_${spinId}`,
        user_id: playerId,
        title: 'Wheel of Luck Free-Play Credited!',
        message: `You won $${rewardAmt.toFixed(2)} in non-cashable Free-Play credits from the Wheel of Luck!`,
        type: 'bonus',
        read: false,
        link_tab: 'game_accounts',
        link_request_id: spinId,
        created_at: nowIso,
      });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: playerId,
      actorName: caller.displayName,
      actorRole: caller.role,
      action: 'WHEEL_SPIN_CLAIMED',
      entityType: 'wallet',
      entityId: spinId,
      details: `Wheel of Luck spin landed on "${selection.segment.label}" (actual free-play credited: $${rewardAmt.toFixed(2)}; display-only simulated showcase: $${simDisplayAmount.toFixed(2)}).`,
    });

    const spinRecord = mapWheelSpinRow(insertedRow);
    const postEligibility = evaluateWheelEligibility({
      config,
      lastSpinAt: nowIso,
      serverNowMs: nowMs,
    });

    return res.status(200).json({
      success: true,
      idempotentReplay: false,
      spin: spinRecord,
      segmentIndex: selection.segmentIndexInAll,
      actualRewardAmount: rewardAmt,
      simulatedWinDisplay: {
        enabled: config.simulatedWinDisplay.enabled,
        amount: simDisplayAmount,
        label: config.simulatedWinDisplay.label,
        isSimulatedOnly: true,
      },
      eligibility: postEligibility,
      freePlayBalance: nextFreePlay,
      availableBalance: walletSummary.availableBalance,
      referralBonusBalance: walletSummary.referralBonusBalance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to spin the Wheel of Luck.' });
  }
}

export async function handlePostAdminWheelConfig(
  deps: WheelHandlerDeps,
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
        error: 'Access Denied: Only Administrators can modify Wheel of Luck settings.',
      });
    }

    const validation = validateWheelConfig(body?.wheelOfLuck || body);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.errors[0] || 'Invalid Wheel of Luck configuration.',
        errors: validation.errors,
      });
    }

    const { data: existingCfg } = await deps.adminClient
      .from('app_config')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();

    const nowIso = new Date((deps.nowFn || Date.now)()).toISOString();
    const nextData = {
      ...(existingCfg?.data || {}),
      wheelOfLuck: validation.config,
    };

    const { error: upsertErr } = await deps.adminClient.from('app_config').upsert({
      id: 'main',
      data: nextData,
      updated_at: nowIso,
    });

    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message || 'Failed to persist Wheel of Luck config.' });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: 'admin',
      action: 'WHEEL_CONFIG_UPDATED',
      entityType: 'settings',
      entityId: 'wheel_of_luck',
      details: `Updated Wheel of Luck (${validation.config.enabled ? 'Enabled' : 'Disabled'}), ${validation.config.segments.length} segments, simulated showcase=${validation.config.simulatedWinDisplay.enabled ? `$${validation.config.simulatedWinDisplay.amount.toFixed(2)}` : 'off'}.`,
    });

    return res.status(200).json({
      success: true,
      wheelOfLuck: validation.config,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save Wheel of Luck configuration.' });
  }
}

async function sendServerTelegramTextIfConfigured(adminClient: any, text: string): Promise<boolean> {
  try {
    if (typeof fetch !== 'function') return false;
    const { data: cfgRow } = await adminClient
      .from('app_config')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();
    const tg = cfgRow?.data?.telegram;
    const botToken = typeof tg?.botToken === 'string' ? tg.botToken.trim() : '';
    const channelId = typeof tg?.channelId === 'string' ? tg.channelId.trim() : '';
    const enabled = tg?.enabled !== false;
    if (!botToken || !channelId || !enabled) return false;

    const sendReq = async (targetChatId: string) => {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId, text }),
      });
      return r.json();
    };
    let result = await sendReq(channelId);
    if (!result?.ok && result?.description?.includes('chat not found') && channelId.startsWith('-') && !channelId.startsWith('-100')) {
      result = await sendReq(`-100${channelId.replace(/^-/, '')}`);
    }
    return Boolean(result?.ok);
  } catch (err) {
    console.warn('[GameCreditTransfer] Non-fatal Telegram alert error:', err);
    return false;
  }
}

async function dispatchBonusLoadStaffNotification(
  deps: WheelHandlerDeps,
  params: {
    ownerId: string;
    caller: WheelCallerProfile;
    accountRow: any;
    direction: string;
    source: string;
    amount: number;
    txId: string;
    createdAt: string;
  }
): Promise<{
  staffMessage: any | null;
  staffNotificationDelivered: boolean;
  telegramNotified: boolean;
}> {
  let customerName = params.caller.id === params.ownerId ? params.caller.displayName : '';
  if (!customerName || customerName === 'Player' || customerName === 'Customer') {
    try {
      const { data: userRow } = await deps.adminClient
        .from('users')
        .select('id, display_name')
        .eq('id', params.ownerId)
        .maybeSingle();
      if (userRow?.display_name) {
        customerName = String(userRow.display_name).trim();
      }
    } catch {
      // keep existing fallback
    }
  }

  const payload = buildGameBonusLoadStaffMessage({
    direction: params.direction,
    source: params.source,
    amount: params.amount,
    customerId: params.ownerId,
    customerName: customerName || params.caller.displayName || 'Player',
    gameTitle: params.accountRow?.game_title,
    gameUsername: params.accountRow?.username,
    txId: params.txId,
    createdAt: params.createdAt,
  });

  if (!payload) {
    return {
      staffMessage: null,
      staffNotificationDelivered: false,
      telegramNotified: false,
    };
  }

  let staffMessage: any = null;
  let staffNotificationDelivered = false;
  let telegramNotified = false;

  try {
    const { data: existingConv } = await deps.adminClient
      .from('conversations')
      .select('id, customer_name, status')
      .eq('id', payload.conversationId)
      .maybeSingle();

    const resolvedConvStatus =
      existingConv?.status === 'closed' || existingConv?.status === 'resolved'
        ? 'open'
        : existingConv?.status || 'open';

    const { error: convErr } = await deps.adminClient.from('conversations').upsert(
      {
        id: payload.conversationId,
        customer_id: payload.senderId,
        customer_name: existingConv?.customer_name || payload.senderName,
        last_message: payload.content,
        last_message_at: payload.createdAt,
        status: resolvedConvStatus,
      },
      { onConflict: 'id' }
    );

    if (convErr) {
      console.warn('[GameCreditTransfer] Failed to upsert support conversation:', convErr);
    } else {
      const messageRow: any = {
        id: payload.id,
        conversation_id: payload.conversationId,
        sender_id: payload.senderId,
        sender_name: payload.senderName,
        sender_role: payload.senderRole,
        content: payload.content,
        transaction_data: null,
        created_at: payload.createdAt,
        is_internal_note: false,
      };

      const { data: savedMsg, error: msgErr } = await deps.adminClient
        .from('messages')
        .upsert(messageRow, { onConflict: 'id' })
        .select()
        .single();

      if (msgErr) {
        const errText = `${msgErr.code || ''} ${msgErr.message || ''}`;
        const isMissingIsInternalNote =
          msgErr.code === '42703' ||
          msgErr.code === 'PGRST204' ||
          errText.includes('is_internal_note');

        if (isMissingIsInternalNote) {
          const fallbackRow = { ...messageRow };
          delete fallbackRow.is_internal_note;
          const { data: retryMsg, error: retryErr } = await deps.adminClient
            .from('messages')
            .upsert(fallbackRow, { onConflict: 'id' })
            .select()
            .single();
          if (!retryErr && retryMsg) {
            staffMessage = retryMsg;
            staffNotificationDelivered = true;
          } else if (retryErr) {
            console.warn('[GameCreditTransfer] Failed to upsert bonus load message (retry):', retryErr);
          }
        } else {
          console.warn('[GameCreditTransfer] Failed to upsert bonus load message:', msgErr);
        }
      } else if (savedMsg) {
        staffMessage = savedMsg;
        staffNotificationDelivered = true;
      }
    }
  } catch (err) {
    console.warn('[GameCreditTransfer] Non-fatal staff chat dispatch error:', err);
  }

  try {
    telegramNotified = deps.notifyTelegram
      ? await deps.notifyTelegram(deps.adminClient, payload.telegramText)
      : await sendServerTelegramTextIfConfigured(deps.adminClient, payload.telegramText);
  } catch (err) {
    console.warn('[GameCreditTransfer] Non-fatal Telegram dispatch error:', err);
  }

  return {
    staffMessage,
    staffNotificationDelivered,
    telegramNotified,
  };
}

export async function handlePostGameCreditTransfer(
  deps: WheelHandlerDeps,
  body: any,
  res: any,
  req: any
) {
  setNoStoreHeaders(res);
  try {
    const caller = await deps.resolveCaller(deps.adminClient, {
      headers: req?.headers,
      viewerUserId: body?.userId ? String(body.userId).trim() : undefined,
    });
    if (caller.jwtRejected) {
      return res.status(401).json({ error: 'Session token expired or invalid.', code: 'TOKEN_EXPIRED' });
    }
    if (!caller.id || caller.role === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required to transfer game credits.' });
    }

    const direction = String(body?.direction || '').trim().toLowerCase();
    const source = String(body?.source || 'wallet_cash').trim().toLowerCase();
    const gameAccountId = typeof body?.gameAccountId === 'string' ? body.gameAccountId.trim() : '';
    const gameCatalogId = typeof body?.gameCatalogId === 'string' ? body.gameCatalogId.trim() : '';
    const amount = Number(Number(body?.amount || 0).toFixed(2));

    if (direction !== 'load' && direction !== 'unload') {
      return res.status(400).json({ error: 'direction must be "load" or "unload".' });
    }
    if (direction === 'load' && !['free_play', 'referral_bonus', 'wallet_cash'].includes(source)) {
      return res.status(400).json({ error: 'Invalid funding source.' });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: 'Amount must be greater than $0.00.' });
    }
    if (!gameAccountId && !gameCatalogId) {
      return res.status(400).json({ error: 'gameAccountId or gameCatalogId is required.' });
    }

    let accountRow: any = null;
    if (gameAccountId) {
      const { data, error } = await deps.adminClient
        .from('game_accounts')
        .select('id, customer_id, game_id, game_title, username, status, balance, free_play_balance, updated_at')
        .eq('id', gameAccountId)
        .maybeSingle();
      if (error && isMissingTableOrColumnError(error)) {
        return res.status(503).json({
          error: 'game_accounts balance columns are pending migration (supabase_schema.sql Section 19).',
          code: 'GAME_BALANCE_SCHEMA_MISSING',
        });
      }
      if (error) return res.status(500).json({ error: error.message });
      accountRow = data;
    } else {
      const targetCustomer =
        (caller.role === 'admin' || caller.role === 'agent') && typeof body?.customerId === 'string' && body.customerId.trim()
          ? body.customerId.trim()
          : caller.id;
      const { data, error } = await deps.adminClient
        .from('game_accounts')
        .select('id, customer_id, game_id, game_title, username, status, balance, free_play_balance, updated_at')
        .eq('customer_id', targetCustomer)
        .eq('game_id', gameCatalogId)
        .maybeSingle();
      if (error && isMissingTableOrColumnError(error)) {
        return res.status(503).json({
          error: 'game_accounts balance columns are pending migration (supabase_schema.sql Section 19).',
          code: 'GAME_BALANCE_SCHEMA_MISSING',
        });
      }
      if (error) return res.status(500).json({ error: error.message });
      accountRow = data;
    }

    if (!accountRow) {
      return res.status(404).json({ error: 'Game account not found.' });
    }
    if (accountRow.customer_id !== caller.id && caller.role !== 'admin' && caller.role !== 'agent') {
      return res.status(403).json({ error: 'Access Denied: You can only manage credits for your own game accounts.' });
    }
    if (String(accountRow.status || '').toLowerCase() !== 'active') {
      return res.status(400).json({ error: 'Game account must be active before transferring credits.' });
    }

    const ownerId = String(accountRow.customer_id);
    const nowMs = (deps.nowFn || Date.now)();
    const txId = `tx_gxf_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Atomic PostgreSQL RPC path
    if (typeof deps.adminClient.rpc === 'function') {
      const { data: rpcRes, error: rpcErr } = await deps.adminClient.rpc('transfer_game_credits_atomic', {
        p_customer_id: ownerId,
        p_game_account_id: accountRow.id,
        p_direction: direction,
        p_source: source,
        p_amount: amount,
        p_tx_id: txId,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        if (rpcRes.ok === false) {
          const status = rpcRes.errorCode === 'GAME_ACCOUNT_NOT_FOUND' ? 404 : 400;
          return res.status(status).json({ error: rpcRes.error || 'Game credit transfer failed.', code: rpcRes.errorCode });
        }

        await deps.writeAudit(deps.adminClient, {
          actorId: caller.id,
          actorName: caller.displayName,
          actorRole: caller.role,
          action: direction === 'load' ? 'GAME_CREDITS_LOADED' : 'GAME_CREDITS_UNLOADED',
          entityType: 'game_account',
          entityId: accountRow.id,
          details:
            direction === 'load'
              ? `Loaded $${amount.toFixed(2)} (${source}) into ${accountRow.game_title} (${accountRow.username}).`
              : `Unloaded $${amount.toFixed(2)} from ${accountRow.game_title} (${accountRow.username}) -> Free-Play returned: $${Number(rpcRes.freePlayReturn ?? 0).toFixed(2)}, Cash returned: $${Number(rpcRes.cashReturn ?? 0).toFixed(2)}.`,
        });

        const resolvedTxId = rpcRes.txId || txId;
        const staffNotice = await dispatchBonusLoadStaffNotification(deps, {
          ownerId,
          caller,
          accountRow,
          direction,
          source,
          amount,
          txId: resolvedTxId,
          createdAt: new Date(nowMs).toISOString(),
        });

        return res.status(200).json({
          success: true,
          direction,
          source,
          amount,
          txId: resolvedTxId,
          freePlayReturn: Number(rpcRes.freePlayReturn ?? 0),
          cashReturn: Number(rpcRes.cashReturn ?? 0),
          wallet: rpcRes.wallet,
          gameAccount: rpcRes.gameAccount,
          staffMessage: staffNotice.staffMessage,
          staffNotificationDelivered: staffNotice.staffNotificationDelivered,
          telegramNotified: staffNotice.telegramNotified,
        });
      }

      if (rpcErr && !isMissingFunctionError(rpcErr)) {
        return res.status(500).json({ error: rpcErr.message || 'Game credit transfer failed.' });
      }
    }

    // 2. Fallback server path with explicit rollback safety
    const walletSummary = await loadPlayerWalletSummary(deps.adminClient, ownerId);
    if (walletSummary.schemaMissingFreePlay) {
      return res.status(503).json({
        error: 'wallets.free_play_balance column is missing. Run supabase_schema.sql Section 19.',
        code: 'WHEEL_SCHEMA_MISSING',
      });
    }

    const nowIso = new Date(nowMs).toISOString();
    let nextWalletCash = walletSummary.availableBalance;
    let nextWalletRef = walletSummary.referralBonusBalance;
    let nextWalletFp = walletSummary.freePlayBalance;
    let nextGameBal = Number(accountRow.balance ?? 0);
    let nextGameFp = Math.min(nextGameBal, Number(accountRow.free_play_balance ?? 0));
    let fpReturn = 0;
    let cashReturn = 0;
    let txType = 'game_load';
    let txDesc = '';

    if (direction === 'load') {
      if (source === 'free_play') {
        if (nextWalletFp < amount) {
          return res.status(400).json({ error: `Insufficient Free-Play balance ($${nextWalletFp.toFixed(2)}).` });
        }
        nextWalletFp = Number((nextWalletFp - amount).toFixed(2));
        nextGameFp = Number((nextGameFp + amount).toFixed(2));
        nextGameBal = Number((nextGameBal + amount).toFixed(2));
        txDesc = `Free-Play Loaded to ${accountRow.game_title} (${accountRow.username})`;
      } else if (source === 'referral_bonus') {
        if (nextWalletRef < amount) {
          return res.status(400).json({ error: `Insufficient referral bonus balance ($${nextWalletRef.toFixed(2)}).` });
        }
        nextWalletRef = Number((nextWalletRef - amount).toFixed(2));
        nextGameFp = Number((nextGameFp + amount).toFixed(2));
        nextGameBal = Number((nextGameBal + amount).toFixed(2));
        txDesc = `Referral Bonus Loaded to ${accountRow.game_title} (${accountRow.username})`;
      } else {
        if (nextWalletCash < amount) {
          return res.status(400).json({ error: `Insufficient wallet cash balance ($${nextWalletCash.toFixed(2)}).` });
        }
        nextWalletCash = Number((nextWalletCash - amount).toFixed(2));
        nextGameBal = Number((nextGameBal + amount).toFixed(2));
        txDesc = `Wallet Cash Loaded to ${accountRow.game_title} (${accountRow.username})`;
      }
    } else {
      const split = computeGameCreditUnloadSplit({
        totalGameBalance: nextGameBal,
        trackedFreePlayBalance: nextGameFp,
        requestedAmount: amount,
      });
      if (!split.valid) {
        return res.status(400).json({ error: split.error || 'Insufficient game credits to unload.' });
      }
      fpReturn = split.freePlayReturn;
      cashReturn = split.cashReturn;
      nextGameBal = split.nextGameBalance;
      nextGameFp = split.nextGameFreePlayBalance;
      nextWalletFp = Number((nextWalletFp + fpReturn).toFixed(2));
      nextWalletCash = Number((nextWalletCash + cashReturn).toFixed(2));
      txType = 'game_redeem';
      txDesc = `Unloaded $${amount.toFixed(2)} from ${accountRow.game_title} (${accountRow.username})`;
    }

    if (walletSummary.row) {
      const { error: wErr } = await deps.adminClient
        .from('wallets')
        .update({
          balance: nextWalletCash,
          referral_bonus_balance: nextWalletRef,
          free_play_balance: nextWalletFp,
          updated_at: nowIso,
        })
        .eq('customer_id', ownerId);
      if (wErr) return res.status(500).json({ error: wErr.message });
    } else {
      const { error: wInsErr } = await deps.adminClient.from('wallets').insert({
        customer_id: ownerId,
        balance: nextWalletCash,
        referral_bonus_balance: nextWalletRef,
        free_play_balance: nextWalletFp,
        pending_withdrawal: 0,
        pending_deposit: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        currency: 'USD',
        updated_at: nowIso,
      });
      if (wInsErr) return res.status(500).json({ error: wInsErr.message });
    }

    const { error: gaErr } = await deps.adminClient
      .from('game_accounts')
      .update({
        balance: nextGameBal,
        free_play_balance: nextGameFp,
        updated_at: nowIso,
      })
      .eq('id', accountRow.id);

    if (gaErr) {
      await deps.adminClient
        .from('wallets')
        .update({
          balance: walletSummary.availableBalance,
          referral_bonus_balance: walletSummary.referralBonusBalance,
          free_play_balance: walletSummary.freePlayBalance,
          updated_at: nowIso,
        })
        .eq('customer_id', ownerId);
      return res.status(500).json({ error: gaErr.message || 'Failed to update game account balance.' });
    }

    const { error: txErr } = await deps.adminClient.from('transactions').insert({
      id: txId,
      customer_id: ownerId,
      amount,
      type: txType,
      status: 'completed',
      description: txDesc,
      reference_id: accountRow.id,
      game_name: accountRow.game_title,
      created_at: nowIso,
    });
    if (txErr) {
      // Rollback wallet and game account
      await deps.adminClient
        .from('wallets')
        .update({
          balance: walletSummary.availableBalance,
          referral_bonus_balance: walletSummary.referralBonusBalance,
          free_play_balance: walletSummary.freePlayBalance,
          updated_at: nowIso,
        })
        .eq('customer_id', ownerId);
      await deps.adminClient
        .from('game_accounts')
        .update({
          balance: Number(accountRow.balance ?? 0),
          free_play_balance: Number(accountRow.free_play_balance ?? 0),
          updated_at: nowIso,
        })
        .eq('id', accountRow.id);
      return res.status(500).json({ error: txErr.message || 'Failed to record transfer transaction.' });
    }

    await deps.writeAudit(deps.adminClient, {
      actorId: caller.id,
      actorName: caller.displayName,
      actorRole: caller.role,
      action: direction === 'load' ? 'GAME_CREDITS_LOADED' : 'GAME_CREDITS_UNLOADED',
      entityType: 'game_account',
      entityId: accountRow.id,
      details:
        direction === 'load'
          ? `Loaded $${amount.toFixed(2)} (${source}) into ${accountRow.game_title} (${accountRow.username}).`
          : `Unloaded $${amount.toFixed(2)} from ${accountRow.game_title} (${accountRow.username}) -> Free-Play returned: $${fpReturn.toFixed(2)}, Cash returned: $${cashReturn.toFixed(2)}.`,
    });

    const staffNotice = await dispatchBonusLoadStaffNotification(deps, {
      ownerId,
      caller,
      accountRow,
      direction,
      source,
      amount,
      txId,
      createdAt: nowIso,
    });

    return res.status(200).json({
      success: true,
      direction,
      source,
      amount,
      txId,
      freePlayReturn: fpReturn,
      cashReturn,
      wallet: {
        availableBalance: nextWalletCash,
        referralBonusBalance: nextWalletRef,
        freePlayBalance: nextWalletFp,
      },
      gameAccount: {
        id: accountRow.id,
        balance: nextGameBal,
        freePlayBalance: nextGameFp,
      },
      staffMessage: staffNotice.staffMessage,
      staffNotificationDelivered: staffNotice.staffNotificationDelivered,
      telegramNotified: staffNotice.telegramNotified,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to process game credit transfer.' });
  }
}
