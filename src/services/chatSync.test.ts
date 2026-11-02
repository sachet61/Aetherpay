import test from 'node:test';
import assert from 'node:assert/strict';

// Pure logic for attachment extraction
function extractAttachmentMetadata(row: any): { url?: string; name?: string } {
  const url =
    row.attachment_url ||
    row.transaction_data?.attachmentUrl ||
    row.transaction_data?.proofUrl ||
    row.transaction_data?.proof_url ||
    row.transaction_data?.receiptUrl ||
    row.transaction_data?.receipt_url ||
    row.transaction_data?.imageUrl ||
    row.transaction_data?.image_url ||
    row.proof_url ||
    undefined;

  const name =
    row.attachment_name ||
    row.transaction_data?.attachmentName ||
    row.transaction_data?.proofName ||
    row.transaction_data?.fileName ||
    (url ? 'Attached image' : undefined);

  return { url, name };
}

// Pure logic for canonical conversation ID determination
function getCanonicalConvId(customerId?: string, conversationId?: string): string {
  if (customerId && customerId.trim()) {
    return `conv_${customerId.trim()}`;
  }
  if (conversationId && conversationId.trim()) {
    return conversationId.startsWith('conv_') ? conversationId : `conv_${conversationId}`;
  }
  return '';
}

// Pure logic for bot greeting filter
function isBotGreetingMessage(content: string, senderName?: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  return (
    lower.includes('welcome to swift sweeps support') ||
    lower.includes('treasury and gaming care specialists assist you today') ||
    (senderName === 'Sarah Lin' && lower.includes('welcome'))
  );
}

test('resolves attachment metadata from direct columns', () => {
  const row = {
    attachment_url: 'https://cdn.example.com/receipt1.webp',
    attachment_name: 'receipt1.webp',
  };
  const result = extractAttachmentMetadata(row);
  assert.equal(result.url, 'https://cdn.example.com/receipt1.webp');
  assert.equal(result.name, 'receipt1.webp');
});

test('resolves attachment metadata from transaction_data JSONB proofUrl and receiptUrl', () => {
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
      receiptUrl: 'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/rec.webp',
    },
  };
  const res2 = extractAttachmentMetadata(row2);
  assert.equal(res2.url, 'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/rec.webp');
  assert.equal(res2.name, 'Attached image');
});

test('computes deterministic canonical conversation IDs', () => {
  assert.equal(getCanonicalConvId('usr_12345'), 'conv_usr_12345');
  assert.equal(getCanonicalConvId(undefined, 'conv_usr_999'), 'conv_usr_999');
  assert.equal(getCanonicalConvId(undefined, 'usr_888'), 'conv_usr_888');
});

test('accurately identifies and filters out bot greeting spam', () => {
  assert.equal(isBotGreetingMessage('Welcome to Swift Sweeps Support! Our agents are here.'), true);
  assert.equal(isBotGreetingMessage('Hi, please let our treasury and gaming care specialists assist you today.'), true);
  assert.equal(isBotGreetingMessage('Hello and welcome!', 'Sarah Lin'), true);
  assert.equal(isBotGreetingMessage('Hi, can you help me with my topup deposit?'), false);
  assert.equal(isBotGreetingMessage('Credentials configured for Orion Stars!'), false);
});
