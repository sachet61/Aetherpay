export interface NormalizedPushSubPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SendTestAlertEnv {
  permission: NotificationPermission;
  isIOS: boolean;
  isStandalone: boolean;
  browserName: string;
  platform: string;
  user: { id: string; role: string; email?: string };
  getRegistration: () => Promise<{
    pushManager: {
      getSubscription: () => Promise<any>;
      subscribe: (opts: any) => Promise<any>;
    };
  } | null>;
  formatSubscription: (sub: any) => NormalizedPushSubPayload;
  buildAuthHeaders: () => Promise<Record<string, string>>;
  fetchFn: (input: string, init?: RequestInit) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<any>;
  }>;
  urlBase64ToUint8Array: (base64: string) => Uint8Array;
  onEndpointCached?: (endpoint: string) => void;
}

export interface SendTestAlertResult {
  success: boolean;
  message: string;
  sentCount?: number;
}

/**
 * Truthful end-to-end Web Push test runner.
 * Never returns `success: true` unless the device subscription is synced AND the backend
 * Web Push endpoint confirms at least one encrypted push payload was sent (`sent > 0`).
 */
export async function executeSendTestAlertFlow(env: SendTestAlertEnv): Promise<SendTestAlertResult> {
  if (env.permission !== 'granted') {
    return {
      success: false,
      message: 'Notifications are not enabled yet. Tap "Turn On Alerts" first.',
    };
  }

  if (env.isIOS && !env.isStandalone) {
    return {
      success: false,
      message: 'On iPhone and iPad, open Swift Sweeps from your Home Screen app icon to test background alerts.',
    };
  }

  const reg = await env.getRegistration();
  if (!reg || !reg.pushManager) {
    return {
      success: false,
      message: 'Background service worker is not active yet. Refresh the page and try again.',
    };
  }

  let localSub: any = null;
  try {
    localSub = await reg.pushManager.getSubscription();
  } catch {
    localSub = null;
  }

  // Self-heal missing push subscription if browser permission is already granted
  if (!localSub) {
    const vapidRes = await env.fetchFn('/api/push/vapid-public-key', { cache: 'no-store' });
    const vapidData = await vapidRes.json().catch(() => ({}));
    if (!vapidRes.ok || !vapidData?.publicKey) {
      return {
        success: false,
        message:
          vapidData?.error ||
          `Failed to retrieve push encryption credentials from server (HTTP ${vapidRes.status}).`,
      };
    }

    try {
      localSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: env.urlBase64ToUint8Array(String(vapidData.publicKey)),
      });
    } catch (subErr: any) {
      return {
        success: false,
        message: subErr?.message || 'Browser could not create a push subscription.',
      };
    }
  }

  if (!localSub) {
    return {
      success: false,
      message: 'No active push subscription found on this device. Tap "Turn On Alerts" first.',
    };
  }

  const normalized = env.formatSubscription(localSub);
  if (!normalized.endpoint || !normalized.keys.p256dh || !normalized.keys.auth) {
    return {
      success: false,
      message: 'Device push encryption keys are incomplete. Please re-enable Background Alerts.',
    };
  }

  env.onEndpointCached?.(normalized.endpoint);

  const authHeaders = await env.buildAuthHeaders();
  const subRes = await env.fetchFn('/api/push/subscribe', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      subscription: normalized,
      userId: env.user.id,
      userRole: env.user.role,
      userEmail: env.user.email,
      platform: env.platform,
      browser: env.browserName,
    }),
  });

  const subData = await subRes.json().catch(() => ({}));
  if (!subRes.ok || subData?.success === false) {
    return {
      success: false,
      message:
        subData?.error ||
        `Failed to register device push subscription with server (HTTP ${subRes.status}).`,
    };
  }

  const notifyRes = await env.fetchFn('/api/push/notify', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      recipientId: env.user.id,
      recipientRole: env.user.role,
      senderId: env.user.id,
      title: 'Swift Sweeps Support',
      body: 'Test alert: Background notification received with sound & vibration!',
      url: env.user.role === 'customer' ? '/#chat' : '/#ops_chat',
      tag: `test_${Date.now()}`,
    }),
  });

  const notifyData = await notifyRes.json().catch(() => ({}));
  const sentCount = Number(notifyData?.sent || 0);
  const failedCount = Number(notifyData?.failed || 0);

  if (!notifyRes.ok) {
    return {
      success: false,
      sentCount: 0,
      message: notifyData?.error || `Push server failed to dispatch alert (HTTP ${notifyRes.status}).`,
    };
  }

  if (sentCount <= 0) {
    return {
      success: false,
      sentCount: 0,
      message:
        failedCount > 0
          ? `Push gateway rejected delivery (${failedCount} failed). Tap "Turn On Alerts" to refresh device keys.`
          : 'Push server did not reach any registered device (0 sent). Please tap "Turn On Alerts" again.',
    };
  }

  return {
    success: true,
    sentCount,
    message: `Heads-up alert dispatched! (${sentCount} device reached on ${env.browserName})`,
  };
}
