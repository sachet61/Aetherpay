import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterRealtimeRowsForUser,
  shouldAcceptIncomingChatMessage,
} from './notificationScoping';

test('filterRealtimeRowsForUser drops all user-scoped tables when logged out while preserving public ticker/config', () => {
  assert.deepEqual(
    filterRealtimeRowsForUser('messages', [{ id: 'm1', conversation_id: 'conv_u1', content: 'Secret' }], null),
    []
  );
  assert.deepEqual(
    filterRealtimeRowsForUser('conversations', [{ id: 'conv_u1', customer_id: 'u1' }], null),
    []
  );
  assert.deepEqual(
    filterRealtimeRowsForUser('topups', [{ id: 't1', customer_id: 'u1' }], null),
    []
  );
  assert.deepEqual(
    filterRealtimeRowsForUser('faked_cashouts', [{ id: 'fc1', amount: 120 }], null),
    [{ id: 'fc1', amount: 120 }]
  );
  assert.deepEqual(
    filterRealtimeRowsForUser('app_config', [{ id: 'main', data: {} }], null),
    [{ id: 'main', data: {} }]
  );
});

test('filterRealtimeRowsForUser isolates customer realtime messages, conversations, and wallet rows strictly to active user', () => {
  const customerA = { id: 'u1', role: 'customer' as const };

  const messages = filterRealtimeRowsForUser(
    'messages',
    [
      { id: 'm1', conversation_id: 'conv_u1', content: 'For A', is_internal_note: false },
      { id: 'm2', conversation_id: 'conv_u2', content: 'For B', is_internal_note: false },
      { id: 'm3', conversation_id: 'conv_u1', content: 'Staff note', is_internal_note: true },
      { id: 'm4', conversation_id: 'u1', content: 'Legacy conv ID for A' },
    ],
    customerA
  );
  assert.deepEqual(
    messages.map((m) => m.id),
    ['m1', 'm4']
  );

  const convs = filterRealtimeRowsForUser(
    'conversations',
    [
      { id: 'conv_u1', customer_id: 'u1' },
      { id: 'conv_u2', customer_id: 'u2' },
    ],
    customerA
  );
  assert.deepEqual(
    convs.map((c) => c.id),
    ['conv_u1']
  );

  const topups = filterRealtimeRowsForUser(
    'topups',
    [
      { id: 't1', customer_id: 'u1' },
      { id: 't2', customer_id: 'u2' },
      { id: 't3' }, // missing customer_id must not leak
    ],
    customerA
  );
  assert.deepEqual(
    topups.map((t) => t.id),
    ['t1']
  );

  assert.deepEqual(filterRealtimeRowsForUser('audit_logs', [{ id: 'al1' }], customerA), []);
});

test('shouldAcceptIncomingChatMessage blocks cross-customer, logged-out, and internal-note alerts', () => {
  const customerA = { id: 'u1', role: 'customer' as const };
  const agent = { id: 'a1', role: 'agent' as const };

  const msgForB = {
    id: 'm_b',
    conversationId: 'conv_u2',
    senderId: 'a1',
    senderRole: 'agent' as const,
    text: 'Private B',
    isInternalNote: false,
  };
  const msgForA = {
    id: 'm_a',
    conversationId: 'conv_u1',
    senderId: 'a1',
    senderRole: 'agent' as const,
    text: 'Hello A',
    isInternalNote: false,
  };
  const internalNoteForA = {
    ...msgForA,
    id: 'm_note',
    isInternalNote: true,
  };
  const msgFromB = {
    id: 'm_from_b',
    conversationId: 'conv_u2',
    senderId: 'u2',
    senderRole: 'customer' as const,
    text: 'Customer B support question',
    isInternalNote: false,
  };

  assert.equal(shouldAcceptIncomingChatMessage(msgForA, null), false);
  assert.equal(shouldAcceptIncomingChatMessage(msgForB, customerA), false);
  assert.equal(shouldAcceptIncomingChatMessage(internalNoteForA, customerA), false);
  assert.equal(shouldAcceptIncomingChatMessage(msgForA, customerA, { forNotificationAlert: true }), true);
  assert.equal(shouldAcceptIncomingChatMessage(msgFromB, agent, { forNotificationAlert: true }), true);
  assert.equal(shouldAcceptIncomingChatMessage(msgForA, agent, { forNotificationAlert: true }), false);
});
