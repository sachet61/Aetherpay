import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  claimNotificationAlertId,
  dispatchBrowserNotification,
} from './browserNotificationUtils';
import { executeSendTestAlertFlow } from './webPushTestUtils';

test('dispatchBrowserNotification uses ServiceWorkerRegistration.showNotification on mobile PWAs where new Notification throws', async () => {
  let swCalledWith: any = null;
  const result = await dispatchBrowserNotification(
    'Swift Sweeps Support',
    { body: 'Agent reply received', tag: 'msg_1' },
    {
      permission: 'granted',
      getRegistration: async () => ({
        showNotification: async (title, opts) => {
          swCalledWith = { title, opts };
        },
      }),
      NotificationConstructor: class {
        constructor() {
          throw new TypeError('Illegal constructor');
        }
        onclick = null;
        close() {}
      } as any,
    }
  );

  assert.equal(result.dispatched, true);
  assert.equal(result.method, 'service-worker');
  assert.equal(swCalledWith.title, 'Swift Sweeps Support');
  assert.equal(swCalledWith.opts.body, 'Agent reply received');
});

test('dispatchBrowserNotification falls back to desktop Notification constructor when no SW registration is active', async () => {
  let ctorTitle = '';
  const result = await dispatchBrowserNotification(
    'Desktop Alert',
    { body: 'Hello player' },
    {
      permission: 'granted',
      getRegistration: async () => null,
      autoCloseMs: 0,
      NotificationConstructor: class {
        onclick = null;
        constructor(title: string) {
          ctorTitle = title;
        }
        close() {}
      } as any,
    }
  );

  assert.equal(result.dispatched, true);
  assert.equal(result.method, 'window-notification');
  assert.equal(ctorTitle, 'Desktop Alert');
});

test('claimNotificationAlertId deduplicates overlapping events and bounds set growth', () => {
  const seen = new Set<string>();
  assert.equal(claimNotificationAlertId('msg_1', seen, 3), true);
  assert.equal(claimNotificationAlertId('msg_1', seen, 3), false);
  assert.equal(claimNotificationAlertId('msg_2', seen, 3), true);
  assert.equal(claimNotificationAlertId('msg_3', seen, 3), true);
  assert.equal(claimNotificationAlertId('msg_4', seen, 3), true);
  assert.equal(seen.size, 3);
  assert.equal(seen.has('msg_1'), false);
  assert.equal(seen.has('msg_4'), true);
});

test('executeSendTestAlertFlow fails truthfully when backend /api/push/notify returns 500 or sent=0', async () => {
  const baseEnv = {
    permission: 'granted' as NotificationPermission,
    isIOS: false,
    isStandalone: true,
    browserName: 'Chrome',
    platform: 'android',
    user: { id: 'cust_1', role: 'customer', email: 'c@example.com' },
    getRegistration: async () => ({
      pushManager: {
        getSubscription: async () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }),
        subscribe: async () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }),
      },
    }),
    formatSubscription: () => ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'p256key', auth: 'authkey' },
    }),
    buildAuthHeaders: async () => ({ 'Content-Type': 'application/json', 'x-user-id': 'cust_1' }),
    urlBase64ToUint8Array: () => new Uint8Array([1, 2, 3]),
  };

  // Case A: notify returns 500
  const errRes = await executeSendTestAlertFlow({
    ...baseEnv,
    fetchFn: async (url) => {
      if (url === '/api/push/subscribe') {
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      return { ok: false, status: 500, json: async () => ({ error: 'FUNCTION_INVOCATION_FAILED' }) };
    },
  });
  assert.equal(errRes.success, false);
  assert.match(errRes.message, /FUNCTION_INVOCATION_FAILED/);

  // Case B: notify returns 200 with sent=0
  const zeroRes = await executeSendTestAlertFlow({
    ...baseEnv,
    fetchFn: async (url) => {
      if (url === '/api/push/subscribe') {
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      return { ok: true, status: 200, json: async () => ({ sent: 0, failed: 0 }) };
    },
  });
  assert.equal(zeroRes.success, false);
  assert.match(zeroRes.message, /0 sent/);

  // Case C: full pass only when subscribe succeeds AND notify returns sent > 0
  const passRes = await executeSendTestAlertFlow({
    ...baseEnv,
    fetchFn: async (url) => {
      if (url === '/api/push/subscribe') {
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }
      return { ok: true, status: 200, json: async () => ({ sent: 1, failed: 0 }) };
    },
  });
  assert.equal(passRes.success, true);
  assert.equal(passRes.sentCount, 1);
});

test('all relative imports inside /api/*.ts use explicit .js specifiers required by Node ESM on Vercel', () => {
  const apiDir = path.resolve(process.cwd(), 'api');
  const files = fs.readdirSync(apiDir).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length > 0);

  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  for (const file of files) {
    const content = fs.readFileSync(path.join(apiDir, file), 'utf8');
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const specifier = match[1];
      // Allow type-only imports to reference .ts types, but verify every value import ends in .js
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const statementSnippet = content.slice(Math.max(0, match.index - 200), match.index);
      const isTypeOnly = /import\s+type\b/.test(statementSnippet.slice(statementSnippet.lastIndexOf('import')));
      if (!isTypeOnly) {
        assert.ok(
          specifier.endsWith('.js'),
          `Relative runtime import '${specifier}' in api/${file} (line starting at col ${lineStart}) must end with .js for Vercel Node ESM`
        );
      }
    }
  }
});
