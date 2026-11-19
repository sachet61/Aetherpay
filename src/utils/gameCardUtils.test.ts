import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeExternalHttpUrl,
  resolveGameCardLinks,
  toggleGameCardOverlay,
} from './gameCardUtils';

test('isSafeExternalHttpUrl accepts http/https URLs and rejects empty or unsafe schemes', () => {
  assert.equal(isSafeExternalHttpUrl('https://milkywayapp.xyz/'), true);
  assert.equal(isSafeExternalHttpUrl('http://start.firekirin.xyz:8580/index.html'), true);
  assert.equal(isSafeExternalHttpUrl('#'), false);
  assert.equal(isSafeExternalHttpUrl(''), false);
  assert.equal(isSafeExternalHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalHttpUrl(undefined), false);
});

test('resolveGameCardLinks extracts separate Web play and Get app URLs from links', () => {
  const result = resolveGameCardLinks({
    gameUrl: 'https://fallback-web.example.com',
    downloadUrl: 'https://fallback-dl.example.com',
    links: [
      { label: 'Web Play', url: 'https://play.example.com' },
      { label: 'Download Link', url: 'https://app.example.com/apk' },
    ],
  });

  assert.deepEqual(result, {
    webPlayUrl: 'https://play.example.com',
    getAppUrl: 'https://app.example.com/apk',
    hasWebPlayUrl: true,
    hasGetAppUrl: true,
  });
});

test('resolveGameCardLinks falls back to gameUrl and downloadUrl when links are omitted', () => {
  const result = resolveGameCardLinks({
    gameUrl: 'https://web.example.com',
    downloadUrl: 'https://dl.example.com',
    links: [],
  });

  assert.deepEqual(result, {
    webPlayUrl: 'https://web.example.com',
    getAppUrl: 'https://dl.example.com',
    hasWebPlayUrl: true,
    hasGetAppUrl: true,
  });
});

test('resolveGameCardLinks marks invalid or placeholder URLs cleanly', () => {
  const result = resolveGameCardLinks({
    gameUrl: '#',
    downloadUrl: '',
    links: [{ label: 'Web Play', url: '#' }],
  });

  assert.deepEqual(result, {
    webPlayUrl: '#',
    getAppUrl: '#',
    hasWebPlayUrl: false,
    hasGetAppUrl: false,
  });
});

test('toggleGameCardOverlay opens, closes, and switches active card id cleanly', () => {
  assert.equal(toggleGameCardOverlay(null, 'gc_1'), 'gc_1');
  assert.equal(toggleGameCardOverlay('gc_1', 'gc_1'), null);
  assert.equal(toggleGameCardOverlay('gc_1', 'gc_2'), 'gc_2');
});
