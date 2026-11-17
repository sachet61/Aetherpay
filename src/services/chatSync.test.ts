import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAttachmentMetadata,
  resolveCanonicalConversationId,
  isBotGreetingMessage,
  mapDbMessageRowToChatMessage,
  sortAndDeduplicateMessages,
  mergeAuthoritativeMessages,
} from './chatOrderUtils';
import type { ChatMessage } from '../types';

test('resolves attachment metadata from direct columns', () => {
  const row = {
    attachment_url: 'https://cdn.example.com/receipt1.webp',
    attachment_name: 'receipt1.webp',
  };
  const result = extractAttachmentMetadata(row);
  assert.equal(result.url, 'https://cdn.example.com/receipt1.webp');
  assert.equal(result.name, 'receipt1.webp');
});

test('resolves attachment metadata from transaction_data JSONB proofUrl and receiptUrl and normalizes Supabase URLs', () => {
  const row1 = {
    transaction_data: {
      proofUrl: '/uploads/chat/deposit_proof.webp',
      proofName: 'deposit_proof.webp',
    },
  };
  const res1 = extractAttachmentMetadata(row1);
  assert.equal(res1.url, '/uploads/chat/deposit_proof.webp');
  assert.equal(res1.name, 'deposit_proof.webp');

  const row2 = {
    transaction_data: {
      receiptUrl: 'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/rec.webp?t=123',
    },
  };
  const res2 = extractAttachmentMetadata(row2);
  assert.equal(res2.url, '/api/storage/file?bucket=chat_attachments&path=rec.webp');
  assert.equal(res2.name, 'Attached image');

  const row3 = {
    transaction_data: JSON.stringify({
      attachmentUrl: 'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/sign/chat_attachments/conv_u1/p.webp?token=abc',
      attachmentName: 'p.webp',
    }),
  };
  const res3 = extractAttachmentMetadata(row3);
  assert.equal(res3.url, '/api/storage/file?bucket=chat_attachments&path=conv_u1%2Fp.webp');
  assert.equal(res3.name, 'p.webp');
});

test('computes deterministic canonical conversation IDs across legacy prefixes', () => {
  assert.equal(resolveCanonicalConversationId(undefined, 'usr_12345'), 'conv_usr_12345');
  assert.equal(resolveCanonicalConversationId('conv_usr_999'), 'conv_usr_999');
  assert.equal(resolveCanonicalConversationId('usr_888'), 'conv_usr_888');
  assert.equal(resolveCanonicalConversationId('conv_cust_abc'), 'conv_abc');
});

test('accurately identifies and filters out bot greeting spam', () => {
  assert.equal(isBotGreetingMessage('Welcome to Swift Sweeps Support! Our agents are here.'), true);
  assert.equal(isBotGreetingMessage('Hi, please let our treasury and gaming care specialists assist you today.'), true);
  assert.equal(isBotGreetingMessage('Hello and welcome!', 'Sarah Lin'), true);
  assert.equal(isBotGreetingMessage('Hi, can you help me with my topup deposit?'), false);
  assert.equal(isBotGreetingMessage('Credentials configured for Orion Stars!'), false);
});

test('sortAndDeduplicateMessages sorts strictly by (createdAt ASC, id ASC) and promotes confirmed delivery status', () => {
  const input: ChatMessage[] = [
    { id: 'm3', conversationId: 'conv_1', text: 'third', createdAt: '2026-11-16T10:00:02.000Z', deliveryStatus: 'sending' },
    { id: 'm1', conversationId: 'conv_1', text: 'first', createdAt: '2026-11-16T10:00:01.000Z', deliveryStatus: 'sent' },
    { id: 'm2_b', conversationId: 'conv_1', text: 'tie b', createdAt: '2026-11-16T10:00:01.500Z', deliveryStatus: 'sent' },
    { id: 'm2_a', conversationId: 'conv_1', text: 'tie a', createdAt: '2026-11-16T10:00:01.500Z', deliveryStatus: 'sent' },
    { id: 'm3', conversationId: 'conv_1', text: 'third', createdAt: '2026-11-16T10:00:02.000Z', deliveryStatus: 'sent' },
  ];

  const sorted = sortAndDeduplicateMessages(input, true);
  assert.deepEqual(
    sorted.map((m) => m.id),
    ['m1', 'm2_a', 'm2_b', 'm3']
  );
  assert.equal(sorted[3].deliveryStatus, 'sent');
});

test('mergeAuthoritativeMessages preserves failed local messages, paginated older history, and existing attachmentUrl on partial rows', () => {
  const local: ChatMessage[] = [
    { id: 'old_0', conversationId: 'conv_1', text: 'older paginated', createdAt: '2026-11-16T09:00:00.000Z', deliveryStatus: 'sent' },
    { id: 'm_fail', conversationId: 'conv_1', text: 'offline msg', createdAt: '2026-11-16T10:05:00.000Z', deliveryStatus: 'failed', deliveryError: 'Network down' },
    {
      id: 'm_confirm',
      conversationId: 'conv_1',
      text: 'pending confirm',
      attachmentUrl: '/api/storage/file?bucket=chat_attachments&path=conv_1%2Fpic.webp',
      attachmentName: 'pic.webp',
      createdAt: '2026-11-16T10:02:00.000Z',
      deliveryStatus: 'sending',
    },
  ];

  const remoteRows = [
    {
      id: 'm_confirm',
      conversation_id: 'conv_1',
      sender_id: 'u1',
      sender_name: 'Alice',
      sender_role: 'customer',
      content: 'pending confirm',
      created_at: '2026-11-16T10:02:00.000Z',
    },
    {
      id: 'm_peer',
      conversation_id: 'conv_1',
      sender_id: 'agent_1',
      sender_name: 'Support',
      sender_role: 'agent',
      content: 'Reply from agent',
      is_internal_note: false,
      created_at: '2026-11-16T10:03:00.000Z',
    },
  ].map((r) => mapDbMessageRowToChatMessage(r, 'conv_1'));

  const merged = mergeAuthoritativeMessages(local, remoteRows, 'conv_1');
  assert.deepEqual(
    merged.map((m) => m.id),
    ['old_0', 'm_confirm', 'm_peer', 'm_fail']
  );
  assert.equal(merged[1].deliveryStatus, 'sent');
  assert.equal(merged[1].deliveryError, undefined);
  assert.equal(merged[1].attachmentUrl, '/api/storage/file?bucket=chat_attachments&path=conv_1%2Fpic.webp');
  assert.equal(merged[1].attachmentName, 'pic.webp');
  assert.equal(merged[3].deliveryStatus, 'failed');
  assert.equal(merged[3].deliveryError, 'Network down');
});

test('mergeAuthoritativeMessages with pruneToServerSnapshot clears stale sent local messages on empty server response while keeping sending/failed', () => {
  const local: ChatMessage[] = [
    { id: 'stale_1', conversationId: 'conv_1', text: 'deleted on server', createdAt: '2026-11-16T09:00:00.000Z', deliveryStatus: 'sent' },
    { id: 'pending_1', conversationId: 'conv_1', text: 'still sending', createdAt: '2026-11-17T10:00:00.000Z', deliveryStatus: 'sending' },
    { id: 'failed_1', conversationId: 'conv_1', text: 'retry me', createdAt: '2026-11-17T10:01:00.000Z', deliveryStatus: 'failed' },
  ];

  const merged = mergeAuthoritativeMessages(local, [], 'conv_1', {
    pruneToServerSnapshot: true,
    pageLimit: 50,
  });

  assert.deepEqual(
    merged.map((m) => m.id),
    ['pending_1', 'failed_1']
  );
});

test('mergeAuthoritativeMessages with pruneToServerSnapshot keeps older paginated history when pageLimit is full', () => {
  const local: ChatMessage[] = [
    { id: 'old_page', conversationId: 'conv_1', text: 'older page', createdAt: '2026-11-16T08:00:00.000Z', deliveryStatus: 'sent' },
    { id: 'ghost_recent', conversationId: 'conv_1', text: 'deleted in recent window', createdAt: '2026-11-16T10:01:30.000Z', deliveryStatus: 'sent' },
  ];

  const remoteRows = [
    {
      id: 'm_1',
      conversation_id: 'conv_1',
      sender_id: 'u1',
      sender_name: 'Alice',
      sender_role: 'customer',
      content: 'first recent',
      created_at: '2026-11-16T10:01:00.000Z',
    },
    {
      id: 'm_2',
      conversation_id: 'conv_1',
      sender_id: 'u1',
      sender_name: 'Alice',
      sender_role: 'customer',
      content: 'second recent',
      created_at: '2026-11-16T10:02:00.000Z',
    },
  ].map((r) => mapDbMessageRowToChatMessage(r, 'conv_1'));

  const merged = mergeAuthoritativeMessages(local, remoteRows, 'conv_1', {
    pruneToServerSnapshot: true,
    pageLimit: 2,
  });

  assert.deepEqual(
    merged.map((m) => m.id),
    ['old_page', 'm_1', 'm_2']
  );
});
