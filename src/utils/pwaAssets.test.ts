import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  APPLE_TOUCH_ICON_URL,
  DEFAULT_NOTIFICATION_ICON_URL,
  FAVICON_PNG_URL,
  NOTIFICATION_BADGE_URL,
  PWA_ICON_192_URL,
  PWA_ICON_512_URL,
  PWA_MASKABLE_512_URL,
  resolveNotificationBadgeUrl,
  resolveNotificationIconUrl,
} from './pwaAssets';

function readPngDimensions(filePath: string): { width: number; height: number; colorType: number } {
  const buf = fs.readFileSync(filePath);
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(buf.subarray(0, 8).equals(pngSig), `${filePath} must have valid PNG signature`);
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', `${filePath} must begin with IHDR chunk`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf.readUInt8(25),
  };
}

test('notification asset resolvers upgrade legacy paths to -v2 brand and badge URLs', () => {
  assert.equal(resolveNotificationIconUrl(undefined), DEFAULT_NOTIFICATION_ICON_URL);
  assert.equal(resolveNotificationIconUrl('/pwa-192x192.png'), '/pwa-192x192-v2.png');
  assert.equal(resolveNotificationIconUrl('/favicon.png'), '/pwa-192x192-v2.png');
  assert.equal(resolveNotificationIconUrl('https://cdn.example.com/custom.png'), 'https://cdn.example.com/custom.png');

  assert.equal(resolveNotificationBadgeUrl(undefined), NOTIFICATION_BADGE_URL);
  assert.equal(resolveNotificationBadgeUrl('/favicon.png'), '/notification-badge-v2.png');
  assert.equal(resolveNotificationBadgeUrl('/pwa-192x192.png'), '/notification-badge-v2.png');
});

test('all versioned -v2 PWA and badge PNG assets exist with exact dimensions and RGBA color type', () => {
  const expected: Array<[string, number, number]> = [
    [PWA_ICON_192_URL, 192, 192],
    [PWA_ICON_512_URL, 512, 512],
    [PWA_MASKABLE_512_URL, 512, 512],
    [APPLE_TOUCH_ICON_URL, 180, 180],
    [FAVICON_PNG_URL, 96, 96],
    [NOTIFICATION_BADGE_URL, 96, 96],
  ];

  const casinoRoyaleBytes = fs.readFileSync(path.resolve('public/images/games/casinoroyale-v2.webp'));

  for (const [urlPath, width, height] of expected) {
    const filePath = path.resolve('public', urlPath.replace(/^\//, ''));
    assert.ok(fs.existsSync(filePath), `Expected asset ${filePath} to exist`);
    const dims = readPngDimensions(filePath);
    assert.equal(dims.width, width, `${urlPath} width mismatch`);
    assert.equal(dims.height, height, `${urlPath} height mismatch`);
    assert.equal(dims.colorType, 6, `${urlPath} should be RGBA (colorType 6)`);
    assert.equal(
      fs.readFileSync(filePath).equals(casinoRoyaleBytes),
      false,
      `${urlPath} must not be a copy of CasinoRoyale.png`
    );
  }

  for (const legacyFile of ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png', 'favicon.png']) {
    const filePath = path.resolve('public', legacyFile);
    assert.equal(
      fs.readFileSync(filePath).equals(casinoRoyaleBytes),
      false,
      `Legacy path ${legacyFile} must not remain a copy of CasinoRoyale.png`
    );
  }
});

test('manifest, index.html, sw.js, api/index.ts, and vercel.json wire -v2 icons, separate maskable, and no-cache headers', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve('public/manifest.webmanifest'), 'utf8'));
  assert.ok(manifest.short_name.length <= 12, 'short_name must be <= 12 chars');
  assert.deepEqual(
    manifest.icons.map((i: any) => ({ src: i.src, sizes: i.sizes, purpose: i.purpose })),
    [
      { src: '/pwa-192x192-v2.png', sizes: '192x192', purpose: 'any' },
      { src: '/pwa-512x512-v2.png', sizes: '512x512', purpose: 'any' },
      { src: '/pwa-maskable-512x512-v2.png', sizes: '512x512', purpose: 'maskable' },
    ]
  );

  const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert.match(html, /href="\/apple-touch-icon-v2\.png"/);
  assert.match(html, /href="\/favicon-v2\.png"/);
  assert.match(html, /href="\/icon\.svg"/);

  const sw = fs.readFileSync(path.resolve('public/sw.js'), 'utf8');
  assert.match(sw, /\/pwa-192x192-v2\.png/);
  assert.match(sw, /\/notification-badge-v2\.png/);

  const api = fs.readFileSync(path.resolve('api/index.ts'), 'utf8');
  assert.match(api, /\/pwa-192x192-v2\.png/);
  assert.match(api, /\/notification-badge-v2\.png/);

  const vercel = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
  const headerSources = (vercel.headers || []).map((h: any) => h.source);
  assert.ok(headerSources.includes('/manifest.webmanifest'));
  assert.ok(headerSources.includes('/sw.js'));
});
