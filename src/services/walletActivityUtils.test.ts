import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStaffTopUpDraft,
  buildStaffWithdrawalDraft,
  buildUnifiedWalletActivity,
  computeCumulativeCompletedDeposits,
  computeCumulativeCompletedWithdrawals,
  deriveLatestCompletedTopUp,
  filterUnifiedWalletActivity,
  getActivityStatusMeta,
  getDefaultBonusPercentageForMethod,
  mapDbTransactionRowToWalletTransaction,
  mapDbWalletRowToWallet,
  mergeWalletTransactions,
  reconcileWalletWithTopups,
  resolveDashboardTopUpDisplay,
} from './walletActivityUtils';
import type {
  TopUpRequest,
  UserWallet,
  WalletTransaction,
  WithdrawalRequest,
} from '../types';

test('deriveLatestCompletedTopUp includes base + bonus and ignores pending/rejected requests', () => {
  const topups: TopUpRequest[] = [
    {
      id: 'req_topup_pending_newest',
      customerId: 'cust_1',
      customerName: 'Player One',
      amount: 500,
      bonusAmount: 150,
      status: 'verifying',
      targetGameName: 'Fire Kirin',
      createdAt: '2026-11-17T12:00:00.000Z',
      updatedAt: '2026-11-17T12:00:00.000Z',
    },
    {
      id: 'req_topup_rejected',
      customerId: 'cust_1',
      customerName: 'Player One',
      amount: 300,
      bonusAmount: 90,
      status: 'rejected',
      targetGameName: 'Orion Stars',
      reviewNotes: 'Receipt mismatch',
      createdAt: '2026-11-17T11:30:00.000Z',
      updatedAt: '2026-11-17T11:45:00.000Z',
    },
    {
      id: 'req_topup_completed_latest',
      customerId: 'cust_1',
      customerName: 'Player One',
      amount: 100,
      bonusAmount: 30,
      finalWalletCredit: 130,
      status: 'completed',
      targetGameName: 'Game Vault',
      createdAt: '2026-11-16T09:00:00.000Z',
      updatedAt: '2026-11-17T11:00:00.000Z',
    },
    {
      id: 'req_topup_completed_older',
      customerId: 'cust_1',
      customerName: 'Player One',
      amount: 200,
      bonusAmount: 40,
      status: 'completed',
      targetGameName: 'Juwa',
      createdAt: '2026-11-17T08:00:00.000Z',
      updatedAt: '2026-11-17T09:00:00.000Z',
    },
  ];

  const latest = deriveLatestCompletedTopUp(topups, 'cust_1');
  assert.ok(latest);
  assert.equal(latest.requestId, 'req_topup_completed_latest');
  assert.equal(latest.baseAmount, 100);
  assert.equal(latest.bonusAmount, 30);
  assert.equal(latest.finalCreditedAmount, 130);
  assert.equal(latest.targetGameName, 'Game Vault');
  assert.equal(latest.completedAt, '2026-11-17T11:00:00.000Z');
});

test('mapDbWalletRowToWallet never leaks cumulative total_deposited into lastTopUpAmount', () => {
  const existingStaleWallet: UserWallet = {
    customerId: 'cust_1',
    currency: 'USD',
    availableBalance: 0,
    referralBonusBalance: 25,
    reservedBalance: 0,
    pendingDepositBalance: 0,
    lastTopUpAmount: 999, // stale incorrect cache
    lastTopUpGame: 'Wrong Game',
    lastUpdatedAt: '2026-11-17T08:00:00.000Z',
  };

  const dbRow = {
    customer_id: 'cust_1',
    balance: '45.00',
    pending_withdrawal: '10.00',
    pending_deposit: '50.00',
    total_deposited: '1500.00', // cumulative lifetime counter
    total_withdrawn: '200.00',
    currency: 'USD',
    updated_at: '2026-11-17T12:00:00.000Z',
  };

  // Case 1: Authoritative completed deposit exists -> overrides stale cache, ignores total_deposited
  const topups: TopUpRequest[] = [
    {
      id: 'req_topup_1',
      customerId: 'cust_1',
      customerName: 'Alice',
      amount: 100,
      bonusAmount: 30,
      status: 'approved',
      targetGameName: 'Fire Kirin',
      createdAt: '2026-11-17T10:00:00.000Z',
      updatedAt: '2026-11-17T10:05:00.000Z',
    },
  ];
  const mapped = mapDbWalletRowToWallet(dbRow, existingStaleWallet, topups, {
    authoritativeTopupsLoaded: true,
  });
  assert.equal(mapped.lastTopUpAmount, 130);
  assert.equal(mapped.lastTopUpGame, 'Fire Kirin');
  assert.equal(mapped.totalDeposited, 1500);
  assert.equal(mapped.referralBonusBalance, 25);

  // Case 2: No completed deposit exists after authoritative hydration -> resets to 0 instead of 1500
  const mappedNoCompleted = mapDbWalletRowToWallet(dbRow, existingStaleWallet, [], {
    authoritativeTopupsLoaded: true,
  });
  assert.equal(mappedNoCompleted.lastTopUpAmount, 0);
  assert.equal(mappedNoCompleted.lastTopUpGame, undefined);
  assert.equal(mappedNoCompleted.totalDeposited, 1500);

  // Dashboard helper does not invent fake fallback game names when uncompleted
  const dashEmpty = resolveDashboardTopUpDisplay(mappedNoCompleted, [], 'cust_1');
  assert.equal(dashEmpty.hasCompletedTopUp, false);
  assert.equal(dashEmpty.amount, 0);
  assert.equal(dashEmpty.gameName, null);
});

test('reconcileWalletWithTopups & computeCumulativeCompletedDeposits stay consistent', () => {
  const wallet: UserWallet = {
    customerId: 'cust_2',
    currency: 'USD',
    availableBalance: 0,
    lastTopUpAmount: 0,
  };
  const topups: TopUpRequest[] = [
    {
      id: 't1',
      customerId: 'cust_2',
      customerName: 'Bob',
      amount: 50,
      bonusAmount: 10,
      status: 'completed',
      targetGameName: 'Juwa',
      createdAt: '2026-11-17T08:00:00.000Z',
      updatedAt: '2026-11-17T08:05:00.000Z',
    },
    {
      id: 't2',
      customerId: 'cust_2',
      customerName: 'Bob',
      amount: 100,
      bonusAmount: 30,
      status: 'completed',
      targetGameName: 'Orion Stars',
      createdAt: '2026-11-17T09:00:00.000Z',
      updatedAt: '2026-11-17T09:10:00.000Z',
    },
  ];

  const reconciled = reconcileWalletWithTopups(wallet, topups);
  assert.equal(reconciled.lastTopUpAmount, 130);
  assert.equal(reconciled.lastTopUpGame, 'Orion Stars');
  assert.equal(computeCumulativeCompletedDeposits(topups, 'cust_2'), 150);
});

test('buildUnifiedWalletActivity merges deposits, withdrawals, and referrals while deduplicating linked ledger rows', () => {
  const topups: TopUpRequest[] = [
    {
      id: 'req_topup_done',
      customerId: 'cust_1',
      customerName: 'Alice',
      amount: 100,
      bonusAmount: 30,
      finalWalletCredit: 130,
      methodName: 'CashApp',
      targetGameName: 'Fire Kirin',
      targetGameUsername: 'alice_fk',
      status: 'completed',
      reviewerName: 'Agent Sam',
      reviewNotes: 'Verified receipt',
      createdAt: '2026-11-17T10:00:00.000Z',
      updatedAt: '2026-11-17T10:05:00.000Z',
    },
    {
      id: 'req_topup_rej',
      customerId: 'cust_1',
      customerName: 'Alice',
      amount: 75,
      bonusAmount: 15,
      methodName: 'Chime Direct',
      targetGameName: 'Orion Stars',
      status: 'rejected',
      reviewerName: 'Agent Sam',
      reviewNotes: 'Screenshot blurry, please resubmit',
      createdAt: '2026-11-17T11:00:00.000Z',
      updatedAt: '2026-11-17T11:10:00.000Z',
    },
  ];

  const withdrawals: WithdrawalRequest[] = [
    {
      id: 'req_wdr_proc',
      customerId: 'cust_1',
      customerName: 'Alice',
      amount: 80,
      feeAmount: 4,
      netPayout: 76,
      methodName: 'Crypto USDT',
      sourceGameName: 'Fire Kirin',
      sourceGameUsername: 'alice_fk',
      status: 'processing',
      payoutReference: 'TXHASH_999',
      reviewerName: 'Admin One',
      reviewNotes: 'Queued for chain confirmation',
      createdAt: '2026-11-17T12:00:00.000Z',
      updatedAt: '2026-11-17T12:05:00.000Z',
    },
  ];

  const transactions: WalletTransaction[] = [
    // Linked to req_topup_done -> MUST be deduplicated
    {
      id: 'tx_dep_1',
      customerId: 'cust_1',
      type: 'deposit',
      amount: 100,
      relatedRequestId: 'req_topup_done',
      description: 'Direct Game Top-Up',
      status: 'completed',
      createdAt: '2026-11-17T10:05:00.000Z',
    },
    // Linked bonus to req_topup_done -> MUST be deduplicated
    {
      id: 'tx_bns_1',
      customerId: 'cust_1',
      type: 'bonus',
      amount: 30,
      relatedRequestId: 'req_topup_done',
      description: '30% Promo Bonus',
      status: 'completed',
      createdAt: '2026-11-17T10:05:01.000Z',
    },
    // Linked hold to req_wdr_proc -> MUST be deduplicated
    {
      id: 'tx_wdr_hold_1',
      customerId: 'cust_1',
      type: 'withdrawal_hold',
      amount: 80,
      relatedRequestId: 'req_wdr_proc',
      description: 'Cashout Request Hold',
      status: 'pending',
      createdAt: '2026-11-17T12:00:00.000Z',
    },
    // Standalone Referral Reward -> MUST be kept!
    {
      id: 'tx_ref_1',
      customerId: 'cust_1',
      type: 'referral_reward',
      amount: 25,
      description: 'Referral Bonus Credit: Bob verified email and loaded game account',
      status: 'completed',
      createdAt: '2026-11-17T13:00:00.000Z',
    },
    // Orphaned historical withdrawal without request row -> MUST be kept!
    {
      id: 'tx_wdr_old',
      customerId: 'cust_1',
      type: 'withdrawal',
      amount: 40,
      relatedRequestId: 'req_wdr_archived_999',
      description: 'Historical Cashout Paid',
      status: 'completed',
      createdAt: '2026-11-15T09:00:00.000Z',
    },
  ];

  const unified = buildUnifiedWalletActivity({
    customerId: 'cust_1',
    topups,
    withdrawals,
    transactions,
  });

  // 2 topups + 1 withdrawal + 1 referral + 1 orphaned old withdrawal = 5 items
  assert.equal(unified.length, 5);
  // Sorted descending by createdAt
  assert.deepEqual(
    unified.map((i) => i.id),
    ['tx_ref_1', 'req_wdr_proc', 'req_topup_rej', 'req_topup_done', 'tx_wdr_old']
  );

  // Check deposit enrichment
  const doneDeposit = unified.find((i) => i.id === 'req_topup_done')!;
  assert.equal(doneDeposit.category, 'deposit');
  assert.equal(doneDeposit.baseAmount, 100);
  assert.equal(doneDeposit.bonusAmount, 30);
  assert.equal(doneDeposit.netAmount, 130);
  assert.equal(doneDeposit.reviewerName, 'Agent Sam');

  // Check rejected deposit visibility & notes
  const rejDeposit = unified.find((i) => i.id === 'req_topup_rej')!;
  assert.equal(rejDeposit.status, 'rejected');
  assert.equal(rejDeposit.reviewNotes, 'Screenshot blurry, please resubmit');
  assert.equal(rejDeposit.direction, 'neutral');

  // Check category filters & search
  assert.equal(filterUnifiedWalletActivity(unified, { category: 'deposit' }).length, 2);
  assert.equal(filterUnifiedWalletActivity(unified, { category: 'withdrawal' }).length, 2);
  assert.equal(filterUnifiedWalletActivity(unified, { category: 'referral' }).length, 1);

  const searchRes = filterUnifiedWalletActivity(unified, { searchTerm: 'blurry' });
  assert.equal(searchRes.length, 1);
  assert.equal(searchRes[0].id, 'req_topup_rej');

  const refSearch = filterUnifiedWalletActivity(unified, { searchTerm: 'TXHASH_999' });
  assert.equal(refSearch.length, 1);
  assert.equal(refSearch[0].id, 'req_wdr_proc');
});

test('mergeWalletTransactions & mapDbTransactionRowToWalletTransaction preserve local fee/balanceAfter and handle soft deletes', () => {
  const existing = mapDbTransactionRowToWalletTransaction({
    id: 'tx_1',
    customer_id: 'cust_1',
    amount: '25.00',
    type: 'referral_reward',
    status: 'completed',
    description: 'Referral Bonus Credit',
    reference_id: null,
    game_name: null,
    created_at: '2026-11-17T10:00:00.000Z',
  });
  assert.equal(existing.amount, 25);
  assert.equal(existing.type, 'referral_reward');

  const merged = mergeWalletTransactions(
    [{ ...existing, balanceAfter: 120, idempotencyKey: 'idemp_ref_1' }],
    [
      {
        id: 'tx_1',
        customer_id: 'cust_1',
        amount: 25,
        type: 'referral_reward',
        status: 'completed',
        description: 'Referral Bonus Credit',
        created_at: '2026-11-17T10:00:00.000Z',
      },
      {
        id: 'tx_2',
        customer_id: 'cust_1',
        amount: 50,
        type: 'adjustment',
        status: 'completed',
        description: 'Manual Credit',
        created_at: '2026-11-17T11:00:00.000Z',
      },
    ],
    true
  );

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'tx_2');
  assert.equal(merged[1].balanceAfter, 120);
  assert.equal(merged[1].idempotencyKey, 'idemp_ref_1');
});

test('getActivityStatusMeta covers all request lifecycle statuses', () => {
  for (const status of [
    'submitted',
    'verifying',
    'pending_verification',
    'processing',
    'approved',
    'completed',
    'rejected',
    'cancelled',
  ]) {
    const meta = getActivityStatusMeta(status);
    assert.ok(meta.label.length > 0);
    assert.ok(meta.textClass.startsWith('text-'));
  }
});

test('buildStaffTopUpDraft handles completed without screenshot, pending mode, custom bonus, and validation', () => {
  const invalid = buildStaffTopUpDraft({
    customerId: 'cust_1',
    customerName: 'Player One',
    reviewerId: 'adm_1',
    reviewerName: 'Admin One',
    amount: 0,
    method: 'cashapp',
    methodName: 'Verified CashApp',
    status: 'completed',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);

  // Completed emergency top-up without screenshot proof, custom 25% bonus
  const completed = buildStaffTopUpDraft({
    customerId: 'cust_1',
    customerName: 'Player One',
    reviewerId: 'adm_1',
    reviewerName: 'Admin One',
    amount: 100,
    bonusPercentage: 25,
    method: 'cashapp',
    methodName: 'Verified CashApp',
    targetGameCatalogId: 'game_fk',
    targetGameName: 'Fire Kirin',
    targetGameUsername: 'player_fk_77',
    providerRef: '$playerOne',
    notes: 'Paid earlier in chat; logged by admin',
    status: 'completed',
    nowIso: '2026-11-17T12:00:00.000Z',
    requestId: 'req_topup_staff_1',
  });

  assert.equal(completed.valid, true);
  assert.ok(completed.request);
  assert.equal(completed.request.status, 'completed');
  assert.equal(completed.request.receiptUrl, undefined);
  assert.equal(completed.request.bonusAmount, 25);
  assert.equal(completed.request.finalWalletCredit, 125);
  assert.equal(completed.request.reviewerName, 'Admin One');
  assert.equal(completed.request.reviewNotes, 'Paid earlier in chat; logged by admin');
  assert.equal(completed.chatTransactionData?.status, 'completed');
  assert.equal(completed.chatTransactionData?.approvedBy, 'Admin One');
  assert.equal(completed.chatTransactionData?.finalCredit, 125);

  // Pending mode with default method bonus
  const defaultBonus = getDefaultBonusPercentageForMethod('chime');
  assert.equal(defaultBonus, 15);
  const pending = buildStaffTopUpDraft({
    customerId: 'cust_1',
    customerName: 'Player One',
    reviewerId: 'adm_1',
    reviewerName: 'Admin One',
    amount: 60,
    method: 'chime',
    methodName: 'Chime Direct',
    status: 'submitted',
    requestId: 'req_topup_staff_2',
  });
  assert.equal(pending.valid, true);
  assert.equal(pending.request?.status, 'submitted');
  assert.equal(pending.request?.bonusAmount, 9);
  assert.equal(pending.request?.reviewerId, undefined);
  assert.equal(pending.chatTransactionData?.status, 'pending');
});

test('buildStaffWithdrawalDraft bypasses deposit lock, computes fees, and supports completed & pending states', () => {
  const invalidFee = buildStaffWithdrawalDraft({
    customerId: 'cust_1',
    customerName: 'Player One',
    reviewerId: 'adm_1',
    reviewerName: 'Admin One',
    amount: 50,
    feeAmount: 50,
    method: 'cashapp',
    methodName: 'Verified CashApp',
    status: 'completed',
  });
  assert.equal(invalidFee.valid, false);

  const completed = buildStaffWithdrawalDraft({
    customerId: 'cust_1',
    customerName: 'Player One',
    reviewerId: 'adm_1',
    reviewerName: 'Admin One',
    amount: 200,
    feeAmount: 5,
    method: 'crypto',
    methodName: 'Crypto USDT',
    payoutHandle: 'TX_WALLET_123',
    payoutReference: 'HASH_ABC',
    sourceGameCatalogId: 'game_orion',
    sourceGameName: 'Orion Stars',
    sourceGameUsername: 'orion_88',
    notes: 'Emergency chat cashout logged',
    status: 'completed',
    nowIso: '2026-11-17T13:00:00.000Z',
    requestId: 'req_wdr_staff_1',
  });

  assert.equal(completed.valid, true);
  assert.ok(completed.request);
  assert.equal(completed.request.status, 'completed');
  assert.equal(completed.request.netPayout, 195);
  assert.equal(completed.request.payoutDetails.createdByStaff, true);
  assert.equal(completed.request.payoutDetails.bypassedDepositLock, true);
  assert.equal(completed.request.payoutDetails.cryptoAddress, 'TX_WALLET_123');
  assert.equal(completed.request.payoutReference, 'HASH_ABC');
  assert.equal(completed.chatTransactionData?.status, 'completed');
  assert.equal(completed.chatTransactionData?.approvedBy, 'Admin One');

  const pending = buildStaffWithdrawalDraft({
    customerId: 'cust_1',
    customerName: 'Player One',
    reviewerId: 'adm_1',
    reviewerName: 'Admin One',
    amount: 80,
    method: 'cashapp',
    methodName: 'Verified CashApp',
    payoutHandle: '$playerOne',
    status: 'submitted',
    requestId: 'req_wdr_staff_2',
  });
  assert.equal(pending.valid, true);
  assert.equal(pending.request?.status, 'submitted');
  assert.equal(pending.request?.payoutReference, undefined);
  assert.equal(pending.chatTransactionData?.status, 'pending');

  assert.equal(
    computeCumulativeCompletedWithdrawals(
      [completed.request!, pending.request!],
      'cust_1'
    ),
    200
  );
});

