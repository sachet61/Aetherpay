import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_GAME_ICON,
  DEFERRED_GAME_IMAGE_PATHS,
  HERO_BANNER_IMAGE,
  LOCAL_GAME_IMAGES,
  PRIORITY_GAME_IMAGE_PATHS,
  TOP_PRIORITY_GAME_COUNT,
  isLocalGameAssetSelected,
  resolveGameImageUrl,
} from './imageUtils';
import {
  CORE_ASSET_URLS,
  CRITICAL_ASSET_URLS,
  DEFERRED_ASSET_URLS,
  normalizeAssetUrlList,
  resolveTargetAssetPlan,
} from './assetPreloader';
import { FAVICON_PNG_URL } from './pwaAssets';

function readWebpDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF', `${filePath} must have RIFF header`);
  assert.equal(buf.subarray(8, 12).toString('ascii'), 'WEBP', `${filePath} must have WEBP signature`);

  const chunk = buf.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    const widthMinus1 = buf.readUIntLE(24, 3);
    const heightMinus1 = buf.readUIntLE(27, 3);
    return { width: widthMinus1 + 1, height: heightMinus1 + 1 };
  }
  if (chunk === 'VP8 ') {
    // Key frame start code at offset 23..25 = 0x9d 0x01 0x2a
    assert.equal(buf[23], 0x9d);
    assert.equal(buf[24], 0x01);
    assert.equal(buf[25], 0x2a);
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  if (chunk === 'VP8L') {
    assert.equal(buf[20], 0x2f);
    const bits = buf.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  throw new Error(`Unsupported WebP chunk type ${chunk} in ${filePath}`);
}

test('resolveGameImageUrl maps legacy PNG/JPEG paths, /src/images prefixes, kebab aliases, and preserves external/QR URLs', () => {
  assert.equal(resolveGameImageUrl(undefined), DEFAULT_GAME_ICON);
  assert.equal(resolveGameImageUrl(''), DEFAULT_GAME_ICON);

  // Legacy canonical PNG / JPEG database values
  assert.equal(resolveGameImageUrl('/images/Firekirin.png'), '/images/games/firekirin-v2.webp');
  assert.equal(resolveGameImageUrl('/src/images/MilkyWay.png'), '/images/games/milkyway-v2.webp');
  assert.equal(resolveGameImageUrl('src/images/Juwa.png'), '/images/games/juwa-v2.webp');
  assert.equal(resolveGameImageUrl('/images/CasinoIgnite.jpeg'), '/images/games/casinoignite-v2.webp');
  assert.equal(resolveGameImageUrl('Winstar.png'), '/images/games/winstar-v2.webp');

  // Legacy alias & kebab duplicates
  assert.equal(resolveGameImageUrl('/images/fire-kirin.png'), '/images/games/firekirin-v2.webp');
  assert.equal(resolveGameImageUrl('/images/winstar-slots.png'), '/images/games/winstar-v2.webp');
  assert.equal(resolveGameImageUrl('/images/river.png'), '/images/games/riversweeps-v2.webp');
  assert.equal(resolveGameImageUrl('/images/casino-ignite.png'), '/images/games/casinoignite-v2.webp');
  assert.equal(resolveGameImageUrl('vegas777.png'), '/images/games/vegassweeps-v2.webp');
  assert.equal(resolveGameImageUrl('Casino Royal'), '/images/games/casinoroyale-v2.webp');

  // Already upgraded -v2.webp path stays idempotent
  assert.equal(resolveGameImageUrl('/images/games/orionstars-v2.webp'), '/images/games/orionstars-v2.webp');

  // Payment QR uploads and external URLs must remain untouched
  assert.equal(resolveGameImageUrl('/images/qr/chime_qr_1792028577550.jpg'), '/images/qr/chime_qr_1792028577550.jpg');
  assert.equal(resolveGameImageUrl('https://cdn.example.com/custom.png'), 'https://cdn.example.com/custom.png');
  assert.equal(resolveGameImageUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');

  // Admin catalog selection highlight matches both legacy and WebP values
  const winstar = LOCAL_GAME_IMAGES.find((a) => a.id === 'gc_winstar')!;
  assert.equal(isLocalGameAssetSelected('/images/Winstar.png', winstar), true);
  assert.equal(isLocalGameAssetSelected('/src/images/winstar-slots.png', winstar), true);
  assert.equal(isLocalGameAssetSelected('/images/games/winstar-v2.webp', winstar), true);
  assert.equal(isLocalGameAssetSelected('/images/Juwa.png', winstar), false);
});

test('all 20 game WebP icons and hero banner exist with exact dimensions and compressed byte budgets', () => {
  assert.equal(LOCAL_GAME_IMAGES.length, 20);
  let totalGameBytes = 0;

  for (const asset of LOCAL_GAME_IMAGES) {
    assert.match(asset.path, /^\/images\/games\/[a-z0-9]+-v2\.webp$/);
    const diskPath = path.resolve('public', asset.path.replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPath), `Missing game asset ${diskPath}`);
    const dims = readWebpDimensions(diskPath);
    assert.equal(dims.width, 512, `${asset.path} width must be 512`);
    assert.equal(dims.height, 512, `${asset.path} height must be 512`);

    const size = fs.statSync(diskPath).size;
    assert.ok(size <= 80 * 1024, `${asset.path} exceeds 80 KB budget (${size} bytes)`);
    totalGameBytes += size;
  }

  assert.ok(totalGameBytes < 700 * 1024, `Total 20-game WebP payload must be < 700 KB (got ${totalGameBytes})`);

  const heroDiskPath = path.resolve('public', HERO_BANNER_IMAGE.replace(/^\//, ''));
  assert.ok(fs.existsSync(heroDiskPath), `Missing hero banner ${heroDiskPath}`);
  const heroDims = readWebpDimensions(heroDiskPath);
  assert.equal(heroDims.width, 1376);
  assert.equal(heroDims.height, 768);
  assert.ok(fs.statSync(heroDiskPath).size <= 90 * 1024, 'Hero banner WebP must be <= 90 KB');
});

test('assetPreloader splits top 8 priority game icons from deferred pool and vercel.json caches only immutable game/banner paths', () => {
  assert.equal(TOP_PRIORITY_GAME_COUNT, 8);
  assert.equal(PRIORITY_GAME_IMAGE_PATHS.length, 8);
  assert.equal(DEFERRED_GAME_IMAGE_PATHS.length, 12);

  for (const p of PRIORITY_GAME_IMAGE_PATHS) {
    assert.ok(CRITICAL_ASSET_URLS.includes(p), `Priority game ${p} must be in CRITICAL_ASSET_URLS`);
    assert.ok(!DEFERRED_ASSET_URLS.includes(p), `Priority game ${p} must not be in DEFERRED_ASSET_URLS`);
  }
  assert.ok(CRITICAL_ASSET_URLS.includes(HERO_BANNER_IMAGE));
  assert.equal(normalizeAssetUrlList(['', '  ', '/a.webp', '/a.webp']).length, 1);
  assert.equal(new Set(CORE_ASSET_URLS).size, new Set([...CRITICAL_ASSET_URLS, ...DEFERRED_ASSET_URLS]).size);

  const vercel = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
  const headersBySource = new Map<string, Array<{ key: string; value: string }>>(
    (vercel.headers || []).map((entry: any) => [entry.source, entry.headers || []])
  );

  for (const immutableSource of ['/images/games/(.*)', '/images/banners/(.*)']) {
    const hdrs = headersBySource.get(immutableSource) || [];
    const cc = hdrs.find((h) => h.key === 'Cache-Control')?.value || '';
    assert.match(cc, /max-age=31536000/);
    assert.match(cc, /immutable/);
  }

  assert.equal(headersBySource.has('/images/qr/(.*)'), false, 'Mutable admin QR folder must not be immutable cached');
  assert.equal(headersBySource.has('/images/(.*)'), false, 'Wildcard /images/(.*) must not override mutable QR caching');
});

test('resolveTargetAssetPlan tailors required and background assets per destination and index.html preloads top 4 WebPs', () => {
  const authPlan = resolveTargetAssetPlan('auth');
  assert.ok(authPlan.requiredUrls.includes(FAVICON_PNG_URL));
  assert.equal(authPlan.requiredUrls.includes(HERO_BANNER_IMAGE), false, 'Auth splash must not block on dashboard hero banner');
  assert.ok(authPlan.backgroundUrls.includes(HERO_BANNER_IMAGE), 'Hero banner should warm quietly in background after auth paint');
  assert.equal(authPlan.requiredUrls.length, 1 + TOP_PRIORITY_GAME_COUNT);

  const dashboardPlan = resolveTargetAssetPlan('customer_dashboard');
  assert.ok(dashboardPlan.requiredUrls.includes(HERO_BANNER_IMAGE), 'Customer dashboard requires hero banner');
  assert.equal(dashboardPlan.requiredUrls.includes('/images/games/firekirin-v2.webp'), true);
  assert.equal(dashboardPlan.backgroundUrls.includes(HERO_BANNER_IMAGE), false);
  assert.equal(dashboardPlan.backgroundUrls.length, 12);

  const staffPlan = resolveTargetAssetPlan('staff_ops');
  assert.deepEqual(staffPlan.requiredUrls, [FAVICON_PNG_URL]);
  assert.deepEqual(staffPlan.backgroundUrls, []);

  // Custom catalog order overrides default order cleanly without duplicates
  const customPlan = resolveTargetAssetPlan('auth', [
    '/images/games/yolo-v2.webp',
    '/images/games/yolo-v2.webp',
    '/images/games/vegasx-v2.webp',
  ]);
  assert.deepEqual(customPlan.requiredUrls, [
    FAVICON_PNG_URL,
    '/images/games/yolo-v2.webp',
    '/images/games/vegasx-v2.webp',
  ]);

  const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
  for (const top4 of PRIORITY_GAME_IMAGE_PATHS.slice(0, 4)) {
    assert.ok(
      html.includes(`<link rel="preload" as="image" type="image/webp" fetchpriority="high" href="${top4}" />`),
      `index.html must preload ${top4}`
    );
  }

  const splashSource = fs.readFileSync(path.resolve('src/components/common/StartupSplash.tsx'), 'utf8');
  assert.equal(splashSource.includes('Client Memory Cache'), false, 'StartupSplash must not display internal cache telemetry');
});
