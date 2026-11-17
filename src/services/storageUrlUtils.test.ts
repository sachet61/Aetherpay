import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStorageLocation,
  buildProxyStorageUrl,
  toProxyStorageUrl,
  toDirectSupabaseStorageUrl,
  parseTransactionDataField,
} from './storageUrlUtils';

test('extractStorageLocation parses public, sign, authenticated, and proxy URLs while stripping query tokens', () => {
  assert.deepEqual(
    extractStorageLocation(
      'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/conv_u1/1700_abcd.webp?t=12345'
    ),
    { bucket: 'chat_attachments', path: 'conv_u1/1700_abcd.webp' }
  );

  assert.deepEqual(
    extractStorageLocation(
      'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/sign/chat_attachments/folder/my%20photo.webp?token=xyz#hash'
    ),
    { bucket: 'chat_attachments', path: 'folder/my photo.webp' }
  );

  assert.deepEqual(
    extractStorageLocation('/api/storage/file?bucket=chat_attachments&path=conv_u2%2Fimg.webp'),
    { bucket: 'chat_attachments', path: 'conv_u2/img.webp' }
  );

  assert.deepEqual(
    extractStorageLocation(
      '/api/storage/file?url=https%3A%2F%2Ffsykihwprqdptrqapxxg.supabase.co%2Fstorage%2Fv1%2Fobject%2Fauthenticated%2Fchat_attachments%2Fconv_u3%2Fimg.png%3Ft%3D999'
    ),
    { bucket: 'chat_attachments', path: 'conv_u3/img.png' }
  );
});

test('toProxyStorageUrl normalizes Supabase URLs into canonical same-origin proxy URLs and preserves external/data URIs', () => {
  const proxied = toProxyStorageUrl(
    'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/conv_u1/photo.webp?t=123'
  );
  assert.equal(proxied, buildProxyStorageUrl('chat_attachments', 'conv_u1/photo.webp'));

  assert.equal(toProxyStorageUrl('https://cdn.example.com/static/banner.png'), 'https://cdn.example.com/static/banner.png');
  assert.equal(toProxyStorageUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(toProxyStorageUrl('   '), undefined);
});

test('toDirectSupabaseStorageUrl reconstructs direct Supabase public URL from proxy URL', () => {
  const direct = toDirectSupabaseStorageUrl(
    '/api/storage/file?bucket=chat_attachments&path=conv_u1%2Fphoto.webp',
    'https://fsykihwprqdptrqapxxg.supabase.co'
  );
  assert.equal(
    direct,
    'https://fsykihwprqdptrqapxxg.supabase.co/storage/v1/object/public/chat_attachments/conv_u1/photo.webp'
  );
});

test('parseTransactionDataField handles plain objects and serialized JSON strings safely', () => {
  assert.deepEqual(parseTransactionDataField({ attachmentUrl: '/a.webp' }), { attachmentUrl: '/a.webp' });
  assert.deepEqual(parseTransactionDataField('{"attachmentUrl":"/b.webp","amount":50}'), {
    attachmentUrl: '/b.webp',
    amount: 50,
  });
  assert.equal(parseTransactionDataField('not-json'), undefined);
  assert.equal(parseTransactionDataField(null), undefined);
});
