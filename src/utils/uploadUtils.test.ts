import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageFile,
  loadTopUpDraft,
  saveTopUpDraft,
  clearTopUpDraft,
  MAX_IMAGE_UPLOAD_BYTES,
} from './uploadUtils';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test('validateImageFile accepts valid images including Android empty-MIME photos with image extension', () => {
  assert.deepEqual(
    validateImageFile({ name: 'receipt.png', size: 1024 * 150, type: 'image/png' }),
    { valid: true }
  );
  assert.deepEqual(
    validateImageFile({ name: 'IMG_20261118.jpg', size: 850_000, type: '' }),
    { valid: true }
  );
});

test('validateImageFile rejects empty, non-image, and oversized files with descriptive messages', () => {
  const emptyRes = validateImageFile({ name: 'blank.png', size: 0, type: 'image/png' });
  assert.equal(emptyRes.valid, false);
  assert.match(emptyRes.error || '', /empty/i);

  const pdfRes = validateImageFile({ name: 'statement.pdf', size: 5000, type: 'application/pdf' });
  assert.equal(pdfRes.valid, false);
  assert.match(pdfRes.error || '', /unsupported file type/i);

  const bigRes = validateImageFile({
    name: 'huge.png',
    size: MAX_IMAGE_UPLOAD_BYTES + 1024,
    type: 'image/png',
  });
  assert.equal(bigRes.valid, false);
  assert.match(bigRes.error || '', /too large/i);
});

test('TopUp draft helpers save, restore, expire, and clear draft state including uploaded screenshot URL', () => {
  const storage = createMemoryStorage();
  const now = 1_700_000_000_000;

  saveTopUpDraft(storage, 'cust_1', {
    fundingMode: 'gateway_payment',
    selectedGameCatalogId: 'gc_firekirin',
    selectedMethodType: 'chime',
    selectedCryptoCoin: 'BTC',
    referralAmount: '25',
    screenshotUrl: '/api/storage/file?bucket=chat_attachments&path=receipts/cust_1_123.webp',
    screenshotName: 'proof_chime.png',
    updatedAt: now,
  });

  const loaded = loadTopUpDraft(storage, 'cust_1', now + 60_000);
  assert.ok(loaded);
  assert.equal(loaded.selectedMethodType, 'chime');
  assert.equal(loaded.selectedGameCatalogId, 'gc_firekirin');
  assert.equal(
    loaded.screenshotUrl,
    '/api/storage/file?bucket=chat_attachments&path=receipts/cust_1_123.webp'
  );
  assert.equal(loaded.screenshotName, 'proof_chime.png');

  // Expired draft clears cleanly
  const expired = loadTopUpDraft(storage, 'cust_1', now + 3 * 60 * 60 * 1000);
  assert.equal(expired, null);

  saveTopUpDraft(storage, 'cust_1', {
    fundingMode: 'gateway_payment',
    selectedGameCatalogId: 'gc_juwa',
    selectedMethodType: 'cashapp',
    selectedCryptoCoin: 'USDT',
    referralAmount: '25',
    screenshotUrl: '/api/storage/file?bucket=chat_attachments&path=receipts/cust_1_456.webp',
    screenshotName: 'proof_cashapp.png',
    updatedAt: now,
  });
  clearTopUpDraft(storage, 'cust_1');
  assert.equal(loadTopUpDraft(storage, 'cust_1', now + 1000), null);
});
