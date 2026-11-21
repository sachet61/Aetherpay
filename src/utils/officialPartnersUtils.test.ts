import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractPlatformUsername,
  getMessageLink,
  getPartnerDisplayDomain,
  getPartnerInitials,
  movePartnerByStep,
  reorderPartnerList,
  sortOfficialPartners,
  validateOfficialPartnerInput,
  validatePartnerIconFile,
  validatePartnerIconUrl,
  validatePartnerUrl,
} from './officialPartnersUtils.js';
import type { OfficialPartner } from '../types';

test('validatePartnerUrl enforces strict https and exact allowed hosts per platform', () => {
  // Valid URLs
  assert.equal(validatePartnerUrl('https://facebook.com/SwiftSweeps', 'facebook').valid, true);
  assert.equal(validatePartnerUrl('https://www.facebook.com/SwiftSweeps', 'facebook').valid, true);
  assert.equal(validatePartnerUrl('https://m.facebook.com/SwiftSweeps', 'facebook').valid, true);
  assert.equal(validatePartnerUrl('https://fb.com/SwiftSweeps', 'facebook').valid, true);
  assert.equal(validatePartnerUrl('https://m.me/SwiftSweeps', 'facebook').valid, true);

  assert.equal(validatePartnerUrl('https://instagram.com/swiftsweeps', 'instagram').valid, true);
  assert.equal(validatePartnerUrl('https://www.instagram.com/swiftsweeps', 'instagram').valid, true);
  assert.equal(validatePartnerUrl('https://ig.me/m/swiftsweeps', 'instagram').valid, true);

  assert.equal(validatePartnerUrl('https://t.me/swiftsweeps', 'telegram').valid, true);
  assert.equal(validatePartnerUrl('https://telegram.me/swiftsweeps', 'telegram').valid, true);

  // Reject http://, javascript:, data:, mismatched hosts, and userinfo tricks
  assert.equal(validatePartnerUrl('http://facebook.com/SwiftSweeps', 'facebook').valid, false);
  assert.equal(validatePartnerUrl('javascript:alert(1)', 'facebook').valid, false);
  assert.equal(validatePartnerUrl('https://evilfacebook.com/SwiftSweeps', 'facebook').valid, false);
  assert.equal(validatePartnerUrl('https://facebook.com.evil.com/SwiftSweeps', 'facebook').valid, false);
  assert.equal(validatePartnerUrl('https://t.me/swiftsweeps', 'facebook').valid, false);
  assert.equal(validatePartnerUrl('https://instagram.com/swiftsweeps', 'telegram').valid, false);
  assert.equal(validatePartnerUrl('https://facebook.com@evil.com/path', 'facebook').valid, false);
});

test('validatePartnerIconUrl and validatePartnerIconFile reject SVG and enforce 512KB PNG/JPG/WebP', () => {
  assert.equal(validatePartnerIconUrl('').valid, true);
  assert.equal(validatePartnerIconUrl('https://cdn.example.com/icon.webp').valid, true);
  assert.equal(validatePartnerIconUrl('http://cdn.example.com/icon.png').valid, false);
  assert.equal(validatePartnerIconUrl('https://cdn.example.com/icon.svg').valid, false);
  assert.equal(validatePartnerIconUrl('javascript:alert(1)').valid, false);

  assert.equal(
    validatePartnerIconFile({ name: 'icon.png', size: 120_000, type: 'image/png' }).valid,
    true
  );
  assert.equal(
    validatePartnerIconFile({ name: 'icon.webp', size: 512 * 1024, type: 'image/webp' }).valid,
    true
  );
  assert.equal(
    validatePartnerIconFile({ name: 'icon.jpg', size: 512 * 1024 + 1, type: 'image/jpeg' }).valid,
    false
  );
  assert.equal(
    validatePartnerIconFile({ name: 'icon.svg', size: 2048, type: 'image/svg+xml' }).valid,
    false
  );
  assert.equal(
    validatePartnerIconFile({ name: 'anim.gif', size: 2048, type: 'image/gif' }).valid,
    false
  );
});

test('getMessageLink uses explicit messageLink override when set, otherwise derives handle link or falls back to pageUrl', () => {
  // Explicit override takes priority
  assert.equal(
    getMessageLink({
      platform: 'facebook',
      pageUrl: 'https://www.facebook.com/SwiftSweeps',
      messageLink: 'https://m.me/custom_support',
    }),
    'https://m.me/custom_support'
  );

  // Auto-derived from usernames
  assert.equal(
    getMessageLink({
      platform: 'facebook',
      pageUrl: 'https://www.facebook.com/SwiftSweepsOfficial/',
      messageLink: null,
    }),
    'https://m.me/SwiftSweepsOfficial'
  );
  assert.equal(
    getMessageLink({
      platform: 'instagram',
      pageUrl: 'https://instagram.com/swift.sweeps',
      messageLink: null,
    }),
    'https://ig.me/m/swift.sweeps'
  );
  assert.equal(
    getMessageLink({
      platform: 'telegram',
      pageUrl: 'https://telegram.me/SwiftSweepsSupport',
      messageLink: null,
    }),
    'https://t.me/SwiftSweepsSupport'
  );

  // Non-username paths fall back cleanly to pageUrl
  assert.equal(
    extractPlatformUsername('https://www.facebook.com/groups/swiftsweeps', 'facebook'),
    null
  );
  assert.equal(
    getMessageLink({
      platform: 'facebook',
      pageUrl: 'https://www.facebook.com/groups/swiftsweeps',
      messageLink: null,
    }),
    'https://www.facebook.com/groups/swiftsweeps'
  );
  assert.equal(
    getMessageLink({
      platform: 'facebook',
      pageUrl: 'https://www.facebook.com/profile.php?id=10001234',
      messageLink: null,
    }),
    'https://www.facebook.com/profile.php?id=10001234'
  );
  assert.equal(
    getMessageLink({
      platform: 'telegram',
      pageUrl: 'https://t.me/+InviteHashHere',
      messageLink: null,
    }),
    'https://t.me/+InviteHashHere'
  );
  assert.equal(
    getMessageLink({
      platform: 'instagram',
      pageUrl: 'https://www.instagram.com/reel/abc123/',
      messageLink: null,
    }),
    'https://www.instagram.com/reel/abc123/'
  );
});

test('validateOfficialPartnerInput enforces note max 80 chars, required name, and URL checks', () => {
  const tooLongNote = 'x'.repeat(81);
  const invalid = validateOfficialPartnerInput({
    name: '   ',
    platform: 'instagram',
    pageUrl: 'https://facebook.com/wrong',
    note: tooLongNote,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.pageUrl);
  assert.ok(invalid.errors.note);

  const valid = validateOfficialPartnerInput({
    name: '  Official VIP Desk ',
    platform: 'telegram',
    pageUrl: 'https://t.me/SwiftVIPDesk',
    note: 'x'.repeat(80),
    isVisible: true,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized?.name, 'Official VIP Desk');
  assert.equal(valid.normalized?.note?.length, 80);
});

test('sorting, domain formatting, initials, and reordering produce deterministic order', () => {
  const sample: OfficialPartner[] = [
    {
      id: 'p2',
      name: 'Zeta IG',
      iconUrl: null,
      platform: 'instagram',
      pageUrl: 'https://www.instagram.com/zeta',
      messageLink: null,
      gameId: null,
      note: null,
      isVisible: true,
      sortOrder: 1,
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p1',
      name: 'Alpha FB',
      iconUrl: null,
      platform: 'facebook',
      pageUrl: 'https://www.facebook.com/alpha',
      messageLink: null,
      gameId: 'fire_kirin',
      note: null,
      isVisible: true,
      sortOrder: 0,
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p3',
      name: 'Beta TG',
      iconUrl: null,
      platform: 'telegram',
      pageUrl: 'https://t.me/beta_tg',
      messageLink: null,
      gameId: null,
      note: null,
      isVisible: false,
      sortOrder: 2,
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  assert.deepEqual(
    sortOfficialPartners(sample, 'name_asc').map((p) => p.id),
    ['p1', 'p3', 'p2']
  );
  assert.deepEqual(
    sortOfficialPartners(sample, 'platform').map((p) => p.platform),
    ['facebook', 'instagram', 'telegram']
  );
  assert.deepEqual(
    reorderPartnerList(sample, 'p3', 'p1').map((p) => [p.id, p.sortOrder]),
    [
      ['p3', 0],
      ['p1', 1],
      ['p2', 2],
    ]
  );
  assert.deepEqual(
    movePartnerByStep(sample, 'p2', 'up').map((p) => p.id),
    ['p2', 'p1', 'p3']
  );
  assert.equal(getPartnerDisplayDomain('https://www.facebook.com/alpha'), 'facebook.com');
  assert.equal(getPartnerInitials('Official VIP Desk'), 'OV');
});
