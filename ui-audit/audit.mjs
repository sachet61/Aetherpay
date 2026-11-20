import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const OUTPUT_DIR = path.join(__dirname, 'ui-audit-output');
export const ZIP_FILENAME = 'ui-comparison.zip';
export const HTML_REPORT_FILENAME = 'ui-comparison-report.html';

export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const DEFAULT_APP_CANDIDATES = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

/**
 * Hardcoded credentials and explicit route definitions per role.
 * Dynamic link/nav discovery runs after login and merges with `routes`.
 */
export const AUDIT_CONFIG = {
  roles: [
    {
      role: 'admin',
      label: 'Admin',
      email: 'sachet61@gmail.com',
      password: 'a12345678',
      routes: [
        '/#ops_dashboard',
        '/#ops_requests',
        '/#ops_chat',
        '/#ops_game_credentials',
        '/#ops_users',
        '/#ops_game_catalog',
        '/#ops_config',
        '/#ops_audit',
      ],
    },
    {
      role: 'agent',
      label: 'Agent',
      email: 'haudemaxe@gmail.com',
      password: 'a12345678',
      routes: [
        '/#ops_chat',
        '/#ops_game_credentials',
        '/#ops_requests',
        '/#ops_users',
        '/#ops_dashboard',
        '/#ops_config',
        '/#ops_audit',
      ],
    },
    {
      role: 'customer',
      label: 'Customer',
      email: 'rashilbasukala@gmail.com',
      password: 'a12345678',
      routes: [
        '/#dashboard',
        '/#wallet',
        '/#topup',
        '/#withdrawal',
        '/#game_accounts',
        '/#chat',
        '/#referrals',
        '/#rules',
        '/#profile',
        '/#ops_dashboard',
      ],
    },
  ],
};

export function padSequence(num, width = 3) {
  return String(Math.max(1, Math.floor(num))).padStart(width, '0');
}

export function sanitizeRouteSlug(routeStr) {
  const cleaned = String(routeStr || 'home')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/?#\/?/, '')
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return cleaned || 'home';
}

export function buildOrderedPngFilename(sequence, role, route) {
  return `${padSequence(sequence, 3)}_${String(role).toLowerCase()}_${sanitizeRouteSlug(route)}.png`;
}

export function normalizeRouteEntry(rawRoute, baseUrl) {
  const raw = String(rawRoute || '').trim();
  if (!raw) return '/#dashboard';
  if (/^https?:\/\//i.test(raw)) {
    const u = new URL(raw);
    return `${u.pathname || '/'}${u.search || ''}${u.hash || ''}`;
  }
  if (raw.startsWith('#')) return `/${raw}`;
  if (raw.startsWith('/')) return raw;
  const parsed = new URL(raw, baseUrl || 'http://localhost:3000');
  return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
}

export function mergeUniqueRoutes(explicitRoutes = [], discoveredRoutes = [], baseUrl = 'http://localhost:3000') {
  const seen = new Set();
  const merged = [];
  for (const candidate of [...explicitRoutes, ...discoveredRoutes]) {
    const normalized = normalizeRouteEntry(candidate, baseUrl);
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(normalized);
    }
  }
  return merged;
}

export function classifyRouteStatus({ requestedRoute, actualUrl, bodyText }) {
  const reqNorm = normalizeRouteEntry(requestedRoute).toLowerCase();
  let actualPathAndHash = '';
  try {
    const u = new URL(actualUrl);
    actualPathAndHash = `${u.pathname || '/'}${u.hash || ''}`.toLowerCase();
  } catch {
    actualPathAndHash = String(actualUrl || '').toLowerCase();
  }

  const textLower = String(bodyText || '').toLowerCase();
  if (
    textLower.includes('admin exclusive area') ||
    textLower.includes('access restricted') ||
    textLower.includes('reserved for platform administrators')
  ) {
    return { status: 'restricted', detail: 'RBAC restriction screen shown' };
  }

  const reqHash = reqNorm.includes('#') ? reqNorm.slice(reqNorm.indexOf('#')) : '';
  const actHash = actualPathAndHash.includes('#')
    ? actualPathAndHash.slice(actualPathAndHash.indexOf('#'))
    : '';

  if (reqHash && actHash && reqHash !== actHash) {
    return { status: 'redirected', detail: `Redirected ${reqHash} -> ${actHash}` };
  }
  if (!reqHash && reqNorm !== actualPathAndHash && actualPathAndHash !== '/') {
    return { status: 'redirected', detail: `Redirected to ${actualPathAndHash}` };
  }

  return { status: 'loaded', detail: '' };
}

export function escapeXml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeHtml(raw) {
  return escapeXml(raw);
}

export function buildComparisonReportHtml(records, meta = {}) {
  const title = escapeHtml(meta.title || 'Swift Sweeps — Role & Responsive UI Comparison Report');
  const appUrl = escapeHtml(meta.appUrl || '');
  const generatedAt = escapeHtml(meta.generatedAt || new Date().toLocaleString());
  const ordered = [...records].sort((a, b) => a.sequence - b.sequence);

  const countLoaded = ordered.filter((r) => r.status === 'loaded').length;
  const countRedirected = ordered.filter((r) => r.status === 'redirected').length;
  const countRestricted = ordered.filter((r) => r.status === 'restricted').length;
  const countOverflow = ordered.filter(
    (r) => (r.desktopOverflowPx || 0) > 2 || (r.mobileOverflowPx || 0) > 2
  ).length;

  const cardsHtml = ordered
    .map((item) => {
      const seq = padSequence(item.sequence, 3);
      const hasOverflow = (item.desktopOverflowPx || 0) > 2 || (item.mobileOverflowPx || 0) > 2;
      const statusClass = `status-${escapeHtml(item.status)}`;
      const roleClass = `role-${escapeHtml(item.role)}`;

      return `
      <article class="audit-card" data-role="${escapeHtml(item.role)}" data-flagged="${
        item.status !== 'loaded' || hasOverflow ? 'true' : 'false'
      }">
        <header class="card-header">
          <div class="card-title-row">
            <span class="seq-badge">#${seq}</span>
            <span class="role-badge ${roleClass}">${escapeHtml(item.roleLabel.toUpperCase())}</span>
            <div>
              <h2>${escapeHtml(item.requestedRoute)}</h2>
              <div class="meta-line">
                <span>Actual: <code>${escapeHtml(item.actualUrl)}</code></span>
                ${item.detail ? `<span> · ${escapeHtml(item.detail)}</span>` : ''}
                <span> · File: <code>${escapeHtml(item.filename)}</code></span>
              </div>
            </div>
          </div>
          <div class="badges-row">
            <span class="overflow-pill ${hasOverflow ? 'overflow-warn' : 'overflow-ok'}">
              ${
                hasOverflow
                  ? `Overflow D:+${item.desktopOverflowPx}px / M:+${item.mobileOverflowPx}px`
                  : '0px Overflow'
              }
            </span>
            <span class="status-pill ${statusClass}">${escapeHtml(item.status.toUpperCase())}</span>
          </div>
        </header>
        <div class="image-wrapper">
          <img src="./${escapeHtml(item.filename)}" alt="#${seq} ${escapeHtml(item.roleLabel)} ${escapeHtml(
        item.requestedRoute
      )} side by side comparison" loading="lazy" />
        </div>
      </article>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @page {
      size: landscape;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #070D20;
      color: #F8FAFC;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .report-header {
      background: #10182D;
      border: 1px solid #1E293B;
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .report-header h1 {
      margin: 0 0 6px 0;
      font-size: 20px;
    }
    .report-sub {
      color: #94A3B8;
      font-size: 12px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .filter-btn, .print-btn {
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid #334155;
      background: #070D20;
      color: #E2E8F0;
    }
    .filter-btn.active {
      background: #5036F5;
      border-color: #6D56FF;
      color: #FFFFFF;
    }
    .print-btn {
      background: #F59E0B;
      border-color: #F59E0B;
      color: #070D20;
    }
    .summary-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .summary-pill {
      padding: 6px 12px;
      border-radius: 999px;
      background: #10182D;
      border: 1px solid #1E293B;
      font-size: 12px;
      font-weight: 600;
    }
    .audit-card {
      background: #10182D;
      border: 1px solid #1E293B;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 24px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .audit-card.hidden {
      display: none;
    }
    .card-header {
      padding: 14px 18px;
      background: #0B1224;
      border-bottom: 1px solid #1E293B;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .card-title-row h2 {
      margin: 0;
      font-size: 14px;
      font-family: monospace;
      color: #F8FAFC;
    }
    .meta-line {
      margin-top: 3px;
      font-size: 11px;
      color: #94A3B8;
    }
    .meta-line code {
      background: #070D20;
      padding: 2px 6px;
      border-radius: 5px;
      color: #CBD5E1;
    }
    .seq-badge {
      background: #5036F5;
      color: #FFFFFF;
      font-family: monospace;
      font-weight: 800;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .role-badge, .status-pill, .overflow-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid #334155;
    }
    .role-admin { background: rgba(245, 158, 11, 0.16); color: #FBBF24; border-color: rgba(245, 158, 11, 0.45); }
    .role-agent { background: rgba(6, 182, 212, 0.16); color: #22D3EE; border-color: rgba(6, 182, 212, 0.45); }
    .role-customer { background: rgba(80, 54, 245, 0.22); color: #C7D2FE; border-color: rgba(80, 54, 245, 0.55); }
    .status-loaded { color: #34D399; border-color: rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.12); }
    .status-redirected { color: #A5B4FC; border-color: rgba(99, 102, 241, 0.45); background: rgba(99, 102, 241, 0.12); }
    .status-restricted { color: #FBBF24; border-color: rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.12); }
    .status-error { color: #FDA4AF; border-color: rgba(244, 63, 94, 0.45); background: rgba(244, 63, 94, 0.12); }
    .overflow-ok { color: #94A3B8; background: #070D20; }
    .overflow-warn { color: #FCA5A5; border-color: #EF4444; background: rgba(239, 68, 68, 0.14); }
    .badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .image-wrapper {
      padding: 12px;
      background: #070D20;
    }
    .image-wrapper img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 10px;
      border: 1px solid #1E293B;
    }
    @media print {
      body {
        padding: 0;
        background: #070D20 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      .audit-card {
        break-after: page;
        page-break-after: always;
        margin-bottom: 0;
      }
      .audit-card:last-of-type {
        break-after: auto;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <div>
      <h1>${title}</h1>
      <div class="report-sub">Target: <code>${appUrl}</code> · Generated: ${generatedAt} · Desktop (${DESKTOP_VIEWPORT.width}×${DESKTOP_VIEWPORT.height}) vs. Mobile (${MOBILE_VIEWPORT.width}×${MOBILE_VIEWPORT.height})</div>
    </div>
    <div class="toolbar no-print">
      <button class="filter-btn active" onclick="filterCards('all', this)">All (${ordered.length})</button>
      <button class="filter-btn" onclick="filterCards('admin', this)">Admin</button>
      <button class="filter-btn" onclick="filterCards('agent', this)">Agent</button>
      <button class="filter-btn" onclick="filterCards('customer', this)">Customer</button>
      <button class="filter-btn" onclick="filterCards('flagged', this)">Flagged</button>
      <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
    </div>
  </header>

  <div class="summary-strip">
    <span class="summary-pill">Total Captures: ${ordered.length}</span>
    <span class="summary-pill">Loaded: ${countLoaded}</span>
    <span class="summary-pill">Redirected: ${countRedirected}</span>
    <span class="summary-pill">Restricted: ${countRestricted}</span>
    <span class="summary-pill">Overflows: ${countOverflow}</span>
  </div>

  ${cardsHtml}

  <script>
    function filterCards(filter, btn) {
      document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      document.querySelectorAll('.audit-card').forEach(function (card) {
        if (filter === 'all') {
          card.classList.remove('hidden');
        } else if (filter === 'flagged') {
          card.classList.toggle('hidden', card.getAttribute('data-flagged') !== 'true');
        } else {
          card.classList.toggle('hidden', card.getAttribute('data-role') !== filter);
        }
      });
    }
  </script>
</body>
</html>`;
}

async function resolveAppUrl() {
  const explicit = (process.env.APP_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  for (const candidate of DEFAULT_APP_CANDIDATES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch(candidate, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || res.status < 500) {
        return candidate;
      }
    } catch {
      clearTimeout(timer);
    }
  }

  throw new Error(
    `Could not auto-detect running app on ${DEFAULT_APP_CANDIDATES.join(', ')}. Start the dev server or pass APP_URL=http://localhost:3000.`
  );
}

function resolveChromiumExecutable() {
  const envExec = (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '').trim();
  if (envExec && fsSync.existsSync(envExec)) return envExec;

  const containerShell = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
  if (fsSync.existsSync(containerShell)) return containerShell;

  return undefined;
}

async function waitForAppSettled(page) {
  await page.waitForLoadState('domcontentloaded');

  await page
    .waitForFunction(
      () => {
        const hasSplash = Boolean(document.querySelector('[role="status"]'));
        const hasHydration = Boolean(document.querySelector('[data-testid="session-hydration-screen"]'));
        const hasFallback = Boolean(document.querySelector('[data-testid="lazy-page-fallback"]'));
        const bodyReady = (document.body?.innerText || '').trim().length > 10;
        return !hasSplash && !hasHydration && !hasFallback && bodyReady;
      },
      { timeout: 15000 }
    )
    .catch(() => {});

  await page
    .evaluate(async () => {
      try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
      } catch {
        // ignore font wait errors
      }
      const vh = window.innerHeight || 900;
      const visibleImgs = Array.from(document.querySelectorAll('img')).filter((img) => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.top < vh + 100;
      });
      await Promise.race([
        Promise.all(
          visibleImgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.addEventListener('load', res, { once: true });
                  img.addEventListener('error', res, { once: true });
                })
          )
        ),
        new Promise((r) => setTimeout(r, 1800)),
      ]);
    })
    .catch(() => {});

  await page.waitForTimeout(450);
}

async function loginAsRole(page, appUrl, roleCfg) {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await waitForAppSettled(page);

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(roleCfg.email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(roleCfg.password);

  const signInBtn = page.locator('form button[type="submit"]').first();
  await signInBtn.click();

  const authOutcome = await page.waitForFunction(
    () => {
      const hasEmailInput = Boolean(document.querySelector('input[type="email"]'));
      const hasPrimaryNav = Boolean(document.querySelector('header nav'));
      const hash = window.location.hash || '';
      if (!hasEmailInput && (hasPrimaryNav || hash.length > 1)) {
        return { ok: true };
      }
      const errEl = document.querySelector('[class*="rose"], [class*="red"]');
      const errText = errEl?.textContent?.trim() || '';
      if (errText && /invalid|error|failed|not verified|incorrect/i.test(errText)) {
        return { ok: false, error: errText };
      }
      return null;
    },
    { timeout: 25000 }
  );

  const outcome = await authOutcome.jsonValue();
  if (!outcome?.ok) {
    throw new Error(`Sign-in failed for ${roleCfg.email}: ${outcome?.error || 'Unknown auth error'}`);
  }

  await waitForAppSettled(page);
}

async function discoverRoutesForRole(page, appUrl) {
  const discovered = new Set();

  // 1. Inspect internal <a href> links
  const hrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') || '')
      .filter(Boolean);
  });

  for (const href of hrefs) {
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      try {
        const u = new URL(href);
        if (u.origin === new URL(appUrl).origin) {
          discovered.add(normalizeRouteEntry(href, appUrl));
        }
      } catch {
        // ignore invalid URLs
      }
    } else {
      discovered.add(normalizeRouteEntry(href, appUrl));
    }
  }

  // 2. Click-probe safe Primary Navigation buttons (and "More" dropdown menu items)
  const navSelector = 'header nav button';
  const navCount = await page.locator(navSelector).count();
  for (let i = 0; i < navCount; i++) {
    const btn = page.locator(navSelector).nth(i);
    const label = ((await btn.innerText().catch(() => '')) || '').trim();
    if (!label || /logout|sign out/i.test(label)) continue;

    if (/^more$/i.test(label)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(150);
      const menuItems = page.locator('[role="menu"] [role="menuitem"]');
      const menuCount = await menuItems.count();
      for (let m = 0; m < menuCount; m++) {
        // Re-open More menu if clicking previous item closed it
        if ((await menuItems.count()) === 0) {
          await btn.click().catch(() => {});
          await page.waitForTimeout(150);
        }
        const item = page.locator('[role="menu"] [role="menuitem"]').nth(m);
        if (await item.isVisible().catch(() => false)) {
          await item.click().catch(() => {});
          await page.waitForTimeout(180);
          const hash = await page.evaluate(() => window.location.hash || '');
          if (hash) discovered.add(normalizeRouteEntry(hash, appUrl));
        }
      }
      continue;
    }

    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(180);
      const hash = await page.evaluate(() => window.location.hash || '');
      if (hash) discovered.add(normalizeRouteEntry(hash, appUrl));
    }
  }

  return Array.from(discovered);
}

async function navigateRoute(page, appUrl, routeEntry) {
  const normalized = normalizeRouteEntry(routeEntry, appUrl);
  const targetUrl = `${appUrl}${normalized}`;
  const currentUrl = page.url();

  const targetParsed = new URL(targetUrl);
  const currentParsed = new URL(currentUrl || appUrl);

  if (
    currentParsed.origin === targetParsed.origin &&
    currentParsed.pathname === targetParsed.pathname &&
    targetParsed.hash
  ) {
    await page.evaluate((nextHash) => {
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      } else {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }, targetParsed.hash);
  } else {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }

  await waitForAppSettled(page);
}

async function stitchSideBySidePng({
  sequence,
  roleLabel,
  role,
  requestedRoute,
  actualUrl,
  status,
  detail,
  desktopBuf,
  mobileBuf,
  desktopOverflowPx,
  mobileOverflowPx,
}) {
  const padding = 24;
  const gap = 24;
  const headerH = 92;
  const labelH = 32;
  const desktopW = DESKTOP_VIEWPORT.width;
  const desktopH = DESKTOP_VIEWPORT.height;
  const mobileW = MOBILE_VIEWPORT.width;
  const mobileH = MOBILE_VIEWPORT.height;

  const canvasW = padding + desktopW + gap + mobileW + padding; // 1902
  const canvasH = headerH + padding + labelH + Math.max(desktopH, mobileH) + padding; // 1048

  const seqText = `#${padSequence(sequence, 3)}`;
  const roleColors =
    role === 'admin'
      ? { bg: '#3B280D', border: '#F59E0B', text: '#FBBF24' }
      : role === 'agent'
      ? { bg: '#0B3340', border: '#06B6D4', text: '#22D3EE' }
      : { bg: '#1F1B52', border: '#5036F5', text: '#C7D2FE' };

  const statusColor =
    status === 'loaded'
      ? '#10B981'
      : status === 'redirected'
      ? '#818CF8'
      : status === 'restricted'
      ? '#F59E0B'
      : '#EF4444';

  const overflowText =
    desktopOverflowPx > 2 || mobileOverflowPx > 2
      ? `Overflow D:+${desktopOverflowPx}px M:+${mobileOverflowPx}px`
      : '0px Horizontal Overflow';

  const subtitle = detail ? `${actualUrl} · ${detail}` : actualUrl;

  const headerSvg = Buffer.from(`
    <svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${canvasW}" height="${headerH}" fill="#10182D" />
      <line x1="0" y1="${headerH}" x2="${canvasW}" y2="${headerH}" stroke="#1E293B" stroke-width="2" />

      <rect x="${padding}" y="24" width="76" height="42" rx="10" fill="#5036F5" />
      <text x="${padding + 38}" y="51" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-size="18" font-weight="bold">${escapeXml(
    seqText
  )}</text>

      <rect x="${padding + 92}" y="27" width="114" height="36" rx="18" fill="${roleColors.bg}" stroke="${
    roleColors.border
  }" stroke-width="1.5" />
      <text x="${padding + 149}" y="50" text-anchor="middle" fill="${
    roleColors.text
  }" font-family="sans-serif" font-size="13" font-weight="bold">${escapeXml(roleLabel.toUpperCase())}</text>

      <text x="${padding + 226}" y="42" fill="#F8FAFC" font-family="monospace" font-size="20" font-weight="bold">${escapeXml(
    requestedRoute
  )}</text>
      <text x="${padding + 226}" y="68" fill="#94A3B8" font-family="monospace" font-size="13">${escapeXml(
    subtitle.slice(0, 120)
  )}</text>

      <rect x="${canvasW - padding - 380}" y="27" width="210" height="36" rx="18" fill="#070D20" stroke="#334155" stroke-width="1.5" />
      <text x="${canvasW - padding - 275}" y="50" text-anchor="middle" fill="${
    desktopOverflowPx > 2 || mobileOverflowPx > 2 ? '#FCA5A5' : '#94A3B8'
  }" font-family="monospace" font-size="12" font-weight="bold">${escapeXml(overflowText)}</text>

      <rect x="${canvasW - padding - 154}" y="27" width="154" height="36" rx="18" fill="#070D20" stroke="${statusColor}" stroke-width="1.8" />
      <text x="${canvasW - padding - 77}" y="50" text-anchor="middle" fill="${statusColor}" font-family="monospace" font-size="13" font-weight="bold">${escapeXml(
    status.toUpperCase()
  )}</text>

      <text x="${padding}" y="${headerH + padding + 18}" fill="#CBD5E1" font-family="monospace" font-size="14" font-weight="bold">DESKTOP (${desktopW}x${desktopH}px)${
    desktopOverflowPx > 2 ? ` · +${desktopOverflowPx}px` : ''
  }</text>
      <text x="${padding + desktopW + gap}" y="${headerH + padding + 18}" fill="#CBD5E1" font-family="monospace" font-size="14" font-weight="bold">MOBILE (${mobileW}x${mobileH}px)${
    mobileOverflowPx > 2 ? ` · +${mobileOverflowPx}px` : ''
  }</text>

      <rect x="${padding - 2}" y="${headerH + padding + labelH - 2}" width="${desktopW + 4}" height="${
    desktopH + 4
  }" rx="8" fill="none" stroke="#1E293B" stroke-width="2" />
      <rect x="${padding + desktopW + gap - 2}" y="${headerH + padding + labelH - 2}" width="${mobileW + 4}" height="${
    mobileH + 4
  }" rx="12" fill="none" stroke="#334155" stroke-width="2" />
    </svg>
  `);

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: '#070D20',
    },
  })
    .composite([
      { input: headerSvg, top: 0, left: 0 },
      { input: desktopBuf, top: headerH + padding + labelH, left: padding },
      { input: mobileBuf, top: headerH + padding + labelH, left: padding + desktopW + gap },
    ])
    .png()
    .toBuffer();
}

export async function runAudit() {
  const appUrl = await resolveAppUrl();
  const headless = process.env.HEADLESS !== 'false';
  const executablePath = resolveChromiumExecutable();

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`\n[ui-audit] Target App URL: ${appUrl}`);
  console.log(`[ui-audit] Output Directory: ${OUTPUT_DIR}`);
  console.log(`[ui-audit] Browser Mode: ${headless ? 'headless' : 'headed'}${executablePath ? ` (${executablePath})` : ''}\n`);

  const browser = await chromium.launch({
    headless,
    ...(executablePath ? { executablePath } : {}),
  });

  const records = [];
  let sequence = 0;

  try {
    for (const roleCfg of AUDIT_CONFIG.roles) {
      console.log(`\n--- Role: ${roleCfg.label} (${roleCfg.email}) ---`);
      const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });

      const desktopPage = await context.newPage();
      desktopPage.on('dialog', (d) => void d.dismiss().catch(() => {}));

      console.log(`[ui-audit] Signing in as ${roleCfg.label}...`);
      await loginAsRole(desktopPage, appUrl, roleCfg);

      const discoveredRoutes = await discoverRoutesForRole(desktopPage, appUrl);
      const roleRoutes = mergeUniqueRoutes(roleCfg.routes || [], discoveredRoutes, appUrl);
      console.log(`[ui-audit] Routes queued for ${roleCfg.label}: ${roleRoutes.length}`);

      const mobilePage = await context.newPage();
      await mobilePage.setViewportSize(MOBILE_VIEWPORT);
      mobilePage.on('dialog', (d) => void d.dismiss().catch(() => {}));

      // Hydrate mobile tab initially onto first route using same authenticated context
      await mobilePage.goto(`${appUrl}${roleRoutes[0] || '/'}`, { waitUntil: 'domcontentloaded' });
      await waitForAppSettled(mobilePage);

      for (const routeEntry of roleRoutes) {
        sequence += 1;
        const seqLabel = padSequence(sequence, 3);
        process.stdout.write(`  [${seqLabel}] ${roleCfg.label} -> ${routeEntry} ... `);

        try {
          await Promise.all([
            navigateRoute(desktopPage, appUrl, routeEntry),
            navigateRoute(mobilePage, appUrl, routeEntry),
          ]);

          const [desktopMetrics, mobileMetrics, desktopBuf, mobileBuf] = await Promise.all([
            desktopPage.evaluate(() => ({
              url: window.location.href,
              bodyText: document.body?.innerText || '',
              overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            })),
            mobilePage.evaluate(() => ({
              url: window.location.href,
              bodyText: document.body?.innerText || '',
              overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            })),
            desktopPage.screenshot({ type: 'png', fullPage: false }),
            mobilePage.screenshot({ type: 'png', fullPage: false }),
          ]);

          const classified = classifyRouteStatus({
            requestedRoute: routeEntry,
            actualUrl: desktopMetrics.url || mobileMetrics.url,
            bodyText: `${desktopMetrics.bodyText}\n${mobileMetrics.bodyText}`,
          });

          const filename = buildOrderedPngFilename(sequence, roleCfg.role, routeEntry);
          const stitchedBuf = await stitchSideBySidePng({
            sequence,
            role: roleCfg.role,
            roleLabel: roleCfg.label,
            requestedRoute: routeEntry,
            actualUrl: desktopMetrics.url,
            status: classified.status,
            detail: classified.detail,
            desktopBuf,
            mobileBuf,
            desktopOverflowPx: desktopMetrics.overflowPx,
            mobileOverflowPx: mobileMetrics.overflowPx,
          });

          await fs.writeFile(path.join(OUTPUT_DIR, filename), stitchedBuf);

          records.push({
            sequence,
            role: roleCfg.role,
            roleLabel: roleCfg.label,
            requestedRoute: routeEntry,
            actualUrl: desktopMetrics.url,
            status: classified.status,
            detail: classified.detail,
            filename,
            desktopOverflowPx: desktopMetrics.overflowPx,
            mobileOverflowPx: mobileMetrics.overflowPx,
          });

          console.log(`${classified.status.toUpperCase()} (D:+${desktopMetrics.overflowPx}px M:+${mobileMetrics.overflowPx}px) -> ${filename}`);
        } catch (routeErr) {
          console.log(`ERROR (${routeErr?.message || routeErr})`);
          records.push({
            sequence,
            role: roleCfg.role,
            roleLabel: roleCfg.label,
            requestedRoute: routeEntry,
            actualUrl: '',
            status: 'error',
            detail: routeErr?.message || 'Capture failed',
            filename: '',
            desktopOverflowPx: 0,
            mobileOverflowPx: 0,
          });
        }
      }

      await context.close();
    }

    const html = buildComparisonReportHtml(records, { appUrl });
    const htmlPath = path.join(OUTPUT_DIR, HTML_REPORT_FILENAME);
    await fs.writeFile(htmlPath, html, 'utf8');

    const zip = new JSZip();
    zip.file(HTML_REPORT_FILENAME, html);
    for (const rec of records) {
      if (rec.filename) {
        const pngBuf = await fs.readFile(path.join(OUTPUT_DIR, rec.filename));
        zip.file(rec.filename, pngBuf);
      }
    }
    const zipBuf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const zipPath = path.join(OUTPUT_DIR, ZIP_FILENAME);
    await fs.writeFile(zipPath, zipBuf);

    console.log(`\n[ui-audit] Complete! Generated ${records.length} comparisons.`);
    console.log(`[ui-audit] HTML Report: ${htmlPath}`);
    console.log(`[ui-audit] ZIP Archive: ${zipPath}\n`);
  } finally {
    await browser.close();
  }
}

const isCliEntry = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isCliEntry) {
  runAudit().catch((err) => {
    console.error('[ui-audit] Fatal error:', err);
    process.exitCode = 1;
  });
}
