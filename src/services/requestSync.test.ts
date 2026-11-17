import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapDbWithdrawalRowToRequest,
  mergeWithdrawalRequests,
  mapDbTopupRowToRequest,
  mergeTopupRequests,
  findRequestById,
} from './requestSyncUtils';
import type { TopUpRequest, WithdrawalRequest } from '../types';

test('mapDbWithdrawalRowToRequest maps live Supabase withdrawal row accurately', () => {
  const dbRow = {
    id: 'req_wdr_1794915456959',
    customer_id: '2417f8fc-ce8f-499c-9edf-4328b2ee2a01',
    customer_name: 'Rashil Basukala',
    amount: '50.00',
    fee: '0.00',
    net_amount: '50.00',
    payout_method_id: 'chime',
    payout_method_name: 'Chime Direct',
    payout_details: {
      sourceGameCatalogId: 'game_fire_kirin',
      sourceGameName: 'Fire Kirin',
      sourceGameUsername: 'Rashil Basukala',
      reservedAmount: 50,
    },
    status: 'submitted',
    reviewer_id: null,
    reviewer_name: null,
    review_notes: null,
    transaction_hash: null,
    created_at: '2026-11-17T11:37:36.96+00:00',
    updated_at: '2026-11-17T11:37:36.96+00:00',
  };

  const mapped = mapDbWithdrawalRowToRequest(dbRow);
  assert.equal(mapped.id, 'req_wdr_1794915456959');
  assert.equal(mapped.customerId, '2417f8fc-ce8f-499c-9edf-4328b2ee2a01');
  assert.equal(mapped.amount, 50);
  assert.equal(mapped.reservedAmount, 50);
  assert.equal(mapped.status, 'submitted');
  assert.equal(mapped.sourceGameCatalogId, 'game_fire_kirin');
  assert.equal(mapped.sourceGameName, 'Fire Kirin');
  assert.equal(mapped.sourceGameUsername, 'Rashil Basukala');
});

test('mergeWithdrawalRequests hydrates missing request from DB without erasing existing timeline or game context', () => {
  const local: WithdrawalRequest[] = [
    {
      id: 'req_wdr_local_1',
      customerId: 'cust_1',
      customerName: 'Alice',
      amount: 25,
      currency: 'USD',
      feeAmount: 0,
      netPayout: 25,
      reservedAmount: 25,
      sourceGameCatalogId: 'g_orion',
      sourceGameName: 'Orion Stars',
      timeline: [
        {
          status: 'submitted',
          note: 'Initial request',
          timestamp: '2026-11-17T10:00:00.000Z',
          actorName: 'Alice',
        },
      ],
      status: 'submitted',
      createdAt: '2026-11-17T10:00:00.000Z',
      updatedAt: '2026-11-17T10:00:00.000Z',
    },
  ];

  const dbRows = [
    {
      id: 'req_wdr_local_1',
      customer_id: 'cust_1',
      customer_name: 'Alice',
      amount: 25,
      fee: 0,
      net_amount: 25,
      payout_method_id: 'chime',
      payout_method_name: 'Chime',
      payout_details: {},
      status: 'submitted',
      created_at: '2026-11-17T10:00:00.000Z',
      updated_at: '2026-11-17T10:01:00.000Z',
    },
    {
      id: 'req_wdr_remote_2',
      customer_id: 'cust_2',
      customer_name: 'Rashil',
      amount: 50,
      fee: 0,
      net_amount: 50,
      payout_method_id: 'chime',
      payout_method_name: 'Chime Direct',
      payout_details: {},
      status: 'submitted',
      created_at: '2026-11-17T11:37:36.960Z',
      updated_at: '2026-11-17T11:37:36.960Z',
    },
  ];

  const merged = mergeWithdrawalRequests(local, dbRows, false);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'req_wdr_remote_2');
  assert.equal(merged[1].id, 'req_wdr_local_1');
  assert.equal(merged[1].timeline.length, 1);
  assert.equal(merged[1].sourceGameCatalogId, 'g_orion');
  assert.ok(findRequestById(merged, ' req_wdr_remote_2 '));
});

test('mergeWithdrawalRequests handles replaceAll while preserving existing metadata and pruning soft deletes', () => {
  const local: WithdrawalRequest[] = [
    {
      id: 'req_wdr_keep',
      customerId: 'c1',
      customerName: 'User 1',
      amount: 100,
      currency: 'USD',
      feeAmount: 0,
      netPayout: 100,
      reservedAmount: 100,
      sourceGameName: 'Fire Kirin',
      timeline: [
        {
          status: 'submitted',
          note: 'Submitted',
          timestamp: '2026-11-17T09:00:00.000Z',
          actorName: 'User 1',
        },
      ],
      status: 'submitted',
      createdAt: '2026-11-17T09:00:00.000Z',
      updatedAt: '2026-11-17T09:00:00.000Z',
    },
    {
      id: 'req_wdr_stale',
      customerId: 'c2',
      customerName: 'Stale',
      amount: 10,
      currency: 'USD',
      feeAmount: 0,
      netPayout: 10,
      reservedAmount: 10,
      timeline: [],
      status: 'submitted',
      createdAt: '2026-11-16T09:00:00.000Z',
      updatedAt: '2026-11-16T09:00:00.000Z',
    },
  ];

  const merged = mergeWithdrawalRequests(
    local,
    [
      {
        id: 'req_wdr_keep',
        customer_id: 'c1',
        customer_name: 'User 1',
        amount: 100,
        fee: 0,
        net_amount: 100,
        status: 'completed',
        created_at: '2026-11-17T09:00:00.000Z',
        updated_at: '2026-11-17T09:05:00.000Z',
      },
      {
        id: 'req_wdr_deleted',
        deleted_at: '2026-11-17T09:06:00.000Z',
      },
    ],
    true
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'completed');
  assert.equal(merged[0].sourceGameName, 'Fire Kirin');
  assert.equal(merged[0].timeline.length, 1);
});

test('mapDbTopupRowToRequest & mergeTopupRequests preserve existing bonusPercentage and game username', () => {
  const existing: TopUpRequest = {
    id: 'req_top_1',
    customerId: 'cust_1',
    customerName: 'Alice',
    amount: 50,
    currency: 'USD',
    method: 'cashapp',
    methodName: 'CashApp',
    bonusAmount: 15,
    bonusPercentage: 30,
    feeAmount: 0,
    finalWalletCredit: 65,
    targetGameUsername: 'alice_fk',
    status: 'submitted',
    createdAt: '2026-11-17T10:00:00.000Z',
    updatedAt: '2026-11-17T10:00:00.000Z',
  };

  const mapped = mapDbTopupRowToRequest(
    {
      id: 'req_top_1',
      customer_id: 'cust_1',
      customer_name: 'Alice',
      amount: 50,
      bonus_amount: 15,
      payment_method_id: 'cashapp',
      payment_method_name: 'CashApp',
      status: 'completed',
      created_at: '2026-11-17T10:00:00.000Z',
      updated_at: '2026-11-17T10:02:00.000Z',
    },
    existing
  );

  assert.equal(mapped.bonusPercentage, 30);
  assert.equal(mapped.targetGameUsername, 'alice_fk');
  assert.equal(mapped.status, 'completed');

  const merged = mergeTopupRequests([existing], [{ id: 'req_top_1', deleted_at: '2026-11-17T10:03:00.000Z' }], false);
  assert.equal(merged.length, 0);
});
