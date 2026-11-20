import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIT_CONFIG,
  buildComparisonReportHtml,
  buildOrderedPngFilename,
  classifyRouteStatus,
  mergeUniqueRoutes,
  normalizeRouteEntry,
  padSequence,
} from './audit.mjs';

test('AUDIT_CONFIG includes required hardcoded credentials for Admin, Agent, and Customer', () => {
  const admin = AUDIT_CONFIG.roles.find((r) => r.role === 'admin');
  const agent = AUDIT_CONFIG.roles.find((r) => r.role === 'agent');
  const customer = AUDIT_CONFIG.roles.find((r) => r.role === 'customer');

  assert.equal(admin?.email, 'sachet61@gmail.com');
  assert.equal(admin?.password, 'a12345678');
  assert.equal(agent?.email, 'haudemaxe@gmail.com');
  assert.equal(agent?.password, 'a12345678');
  assert.equal(customer?.email, 'rashilbasukala@gmail.com');
  assert.equal(customer?.password, 'a12345678');
  assert.ok(admin?.routes.length >= 8);
  assert.ok(agent?.routes.length >= 5);
  assert.ok(customer?.routes.length >= 9);
});

test('padSequence and buildOrderedPngFilename enforce strict 001_role_route.png ordering', () => {
  assert.equal(padSequence(1, 3), '001');
  assert.equal(padSequence(12, 3), '012');
  assert.equal(
    buildOrderedPngFilename(1, 'admin', '/#ops_dashboard'),
    '001_admin_ops_dashboard.png'
  );
  assert.equal(
    buildOrderedPngFilename(14, 'customer', 'http://localhost:3000/#wallet'),
    '014_customer_wallet.png'
  );
});

test('normalizeRouteEntry and mergeUniqueRoutes deduplicate explicit and discovered routes', () => {
  assert.equal(normalizeRouteEntry('#ops_chat', 'http://localhost:3000'), '/#ops_chat');
  const merged = mergeUniqueRoutes(
    ['/#ops_dashboard', '/#ops_chat'],
    ['http://localhost:3000/#ops_chat', '#ops_requests', '/#ops_users'],
    'http://localhost:3000'
  );
  assert.deepEqual(merged, ['/#ops_dashboard', '/#ops_chat', '/#ops_requests', '/#ops_users']);
});

test('classifyRouteStatus distinguishes loaded, redirected, and restricted outcomes', () => {
  assert.deepEqual(
    classifyRouteStatus({
      requestedRoute: '/#ops_dashboard',
      actualUrl: 'http://localhost:3000/#ops_dashboard',
      bodyText: 'Admin Overview',
    }),
    { status: 'loaded', detail: '' }
  );

  assert.equal(
    classifyRouteStatus({
      requestedRoute: '/#ops_dashboard',
      actualUrl: 'http://localhost:3000/#dashboard',
      bodyText: 'Player Home',
    }).status,
    'redirected'
  );

  assert.equal(
    classifyRouteStatus({
      requestedRoute: '/#ops_config',
      actualUrl: 'http://localhost:3000/#ops_config',
      bodyText: 'Admin Exclusive Area',
    }).status,
    'restricted'
  );
});

test('buildComparisonReportHtml sorts cards sequentially, escapes XSS, and configures print page breaks', () => {
  const html = buildComparisonReportHtml(
    [
      {
        sequence: 2,
        role: 'customer',
        roleLabel: 'Customer',
        requestedRoute: '/#wallet',
        actualUrl: 'http://localhost:3000/#wallet',
        status: 'loaded',
        detail: '',
        filename: '002_customer_wallet.png',
        desktopOverflowPx: 0,
        mobileOverflowPx: 0,
      },
      {
        sequence: 1,
        role: 'admin',
        roleLabel: 'Admin',
        requestedRoute: '/#ops_dashboard',
        actualUrl: 'http://localhost:3000/#ops_dashboard',
        status: 'loaded',
        detail: '<script>alert(1)</script>',
        filename: '001_admin_ops_dashboard.png',
        desktopOverflowPx: 0,
        mobileOverflowPx: 4,
      },
    ],
    { appUrl: 'http://localhost:3000', generatedAt: '2026-11-19' }
  );

  const idx1 = html.indexOf('001_admin_ops_dashboard.png');
  const idx2 = html.indexOf('002_customer_wallet.png');
  assert.ok(idx1 !== -1 && idx2 !== -1 && idx1 < idx2);
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('break-after: page;'));
  assert.ok(html.includes('window.print()'));
});
