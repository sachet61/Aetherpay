import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMessageInternalNote,
  filterVisibleMessagesForRole,
  getInitials,
  formatChatDateDivider,
  formatConversationTimestamp,
  buildGroupedMessages,
  normalizeTicketStatus,
  deriveTruthfulConnectionStatus,
} from './chatPresentationUtils';
import type { ChatMessage } from '../types';

test('filterVisibleMessagesForRole strips internal notes for customers and unauthenticated roles', () => {
  const msgs: ChatMessage[] = [
    {
      id: 'm1',
      conversationId: 'conv_u1',
      senderId: 'u1',
      senderName: 'Player',
      senderRole: 'customer',
      text: 'Hello',
      createdAt: '2026-11-18T10:00:00.000Z',
    },
    {
      id: 'm2',
      conversationId: 'conv_u1',
      senderId: 'a1',
      senderName: 'Agent',
      senderRole: 'agent',
      text: 'Internal check on customer account',
      isInternalNote: true,
      createdAt: '2026-11-18T10:01:00.000Z',
    },
    {
      id: 'm3',
      conversationId: 'conv_u1',
      senderId: 'a1',
      senderName: 'Agent',
      senderRole: 'agent',
      text: 'Hidden via txData flag',
      transactionData: { isInternalNote: true } as any,
      createdAt: '2026-11-18T10:02:00.000Z',
    },
    {
      id: 'm4',
      conversationId: 'conv_u1',
      senderId: 'a1',
      senderName: 'Agent',
      senderRole: 'agent',
      text: 'Public reply',
      isInternalNote: false,
      createdAt: '2026-11-18T10:03:00.000Z',
    },
  ];

  assert.equal(isMessageInternalNote(msgs[1]), true);
  assert.equal(isMessageInternalNote(msgs[2]), true);
  assert.equal(isMessageInternalNote(msgs[3]), false);

  const customerVisible = filterVisibleMessagesForRole(msgs, 'customer');
  assert.deepEqual(
    customerVisible.map((m) => m.id),
    ['m1', 'm4']
  );

  const unknownVisible = filterVisibleMessagesForRole(msgs, undefined);
  assert.deepEqual(
    unknownVisible.map((m) => m.id),
    ['m1', 'm4']
  );

  const agentVisible = filterVisibleMessagesForRole(msgs, 'agent');
  assert.deepEqual(
    agentVisible.map((m) => m.id),
    ['m1', 'm2', 'm3', 'm4']
  );

  const adminVisible = filterVisibleMessagesForRole(msgs, 'admin');
  assert.equal(adminVisible.length, 4);
});

test('getInitials formats customer and single-word names cleanly', () => {
  assert.equal(getInitials('Rashil Basukala'), 'RB');
  assert.equal(getInitials('Suman Karki'), 'SK');
  assert.equal(getInitials('Alex'), 'AL');
  assert.equal(getInitials(''), 'U');
});

test('formatChatDateDivider and formatConversationTimestamp categorize Today, Yesterday, and older dates', () => {
  const now = new Date(2026, 10, 18, 14, 0, 0); // Nov 18, 2026 local
  const todayIso = new Date(2026, 10, 18, 9, 15, 0).toISOString();
  const yesterdayIso = new Date(2026, 10, 17, 16, 30, 0).toISOString();
  const earlierWeekIso = new Date(2026, 10, 15, 11, 0, 0).toISOString();

  assert.equal(formatChatDateDivider(todayIso, now), 'Today');
  assert.equal(formatChatDateDivider(yesterdayIso, now), 'Yesterday');
  assert.equal(formatConversationTimestamp(yesterdayIso, now), 'Yesterday');
  assert.match(formatConversationTimestamp(todayIso, now), /\d{2}:\d{2}/);
  assert.ok(formatConversationTimestamp(earlierWeekIso, now).length > 0);
});

test('buildGroupedMessages groups consecutive messages from same sender and separates internal notes and dates', () => {
  const baseDay1 = '2026-11-17T10:00:00.000Z';
  const baseDay2a = '2026-11-18T10:00:00.000Z';
  const baseDay2b = '2026-11-18T10:02:00.000Z';
  const baseDay2Note = '2026-11-18T10:03:00.000Z';
  const baseDay2c = '2026-11-18T10:04:00.000Z';

  const msgs: ChatMessage[] = [
    { id: '1', conversationId: 'c1', senderId: 'u1', senderName: 'P', senderRole: 'customer', text: 'hi', createdAt: baseDay1 },
    { id: '2', conversationId: 'c1', senderId: 'a1', senderName: 'A', senderRole: 'agent', text: 'hey 1', createdAt: baseDay2a },
    { id: '3', conversationId: 'c1', senderId: 'a1', senderName: 'A', senderRole: 'agent', text: 'hey 2', createdAt: baseDay2b },
    { id: '4', conversationId: 'c1', senderId: 'a1', senderName: 'A', senderRole: 'agent', text: 'note', isInternalNote: true, createdAt: baseDay2Note },
    { id: '5', conversationId: 'c1', senderId: 'a1', senderName: 'A', senderRole: 'agent', text: 'hey 3', createdAt: baseDay2c },
  ];

  const grouped = buildGroupedMessages(msgs, new Date(baseDay2c));
  assert.equal(grouped[0].showDateDivider, true);
  assert.equal(grouped[1].showDateDivider, true);
  assert.equal(grouped[1].isFirstInGroup, true);
  assert.equal(grouped[1].isLastInGroup, false);
  assert.equal(grouped[2].isFirstInGroup, false);
  assert.equal(grouped[2].isLastInGroup, true);
  assert.equal(grouped[3].isFirstInGroup, true);
  assert.equal(grouped[3].isLastInGroup, true);
  assert.equal(grouped[4].isFirstInGroup, true);
});

test('deriveTruthfulConnectionStatus reflects genuine browser and sync state', () => {
  assert.deepEqual(
    deriveTruthfulConnectionStatus({ browserOnline: false, syncStatus: 'connected' }),
    { isOnline: false, label: 'Offline', dotColorClass: 'bg-slate-500' }
  );
  assert.deepEqual(
    deriveTruthfulConnectionStatus({ browserOnline: true, syncStatus: 'error' }),
    { isOnline: false, label: 'Reconnecting...', dotColorClass: 'bg-amber-400' }
  );
  assert.deepEqual(
    deriveTruthfulConnectionStatus({ browserOnline: true, syncStatus: 'connected' }),
    { isOnline: true, label: 'Online', dotColorClass: 'bg-emerald-400' }
  );
});

test('normalizeTicketStatus clamps unexpected status strings safely', () => {
  assert.equal(normalizeTicketStatus('pending'), 'pending');
  assert.equal(normalizeTicketStatus('RESOLVED'), 'resolved');
  assert.equal(normalizeTicketStatus('closed'), 'closed');
  assert.equal(normalizeTicketStatus('unknown_val'), 'open');
});
