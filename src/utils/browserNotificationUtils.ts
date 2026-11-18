import { DEFAULT_NOTIFICATION_ICON_URL, NOTIFICATION_BADGE_URL } from './pwaAssets';

export function claimNotificationAlertId(
  msgId: string | null | undefined,
  seenIds: Set<string>,
  maxEntries: number = 250
): boolean {
  const id = typeof msgId === 'string' ? msgId.trim() : '';
  if (!id || seenIds.has(id)) return false;
  seenIds.add(id);
  while (seenIds.size > maxEntries) {
    const oldest = seenIds.values().next().value;
    if (oldest === undefined) break;
    seenIds.delete(oldest);
  }
  return true;
}

export interface BrowserNotificationEnv {
  permission?: NotificationPermission;
  getRegistration?: () => Promise<Pick<ServiceWorkerRegistration, 'showNotification'> | null | undefined>;
  NotificationConstructor?: {
    new (title: string, options?: NotificationOptions): {
      onclick: ((this: any, ev: any) => any) | null;
      close: () => void;
    };
  };
  onWindowFocus?: () => void;
  autoCloseMs?: number;
}

export interface BrowserNotificationResult {
  dispatched: boolean;
  method: 'service-worker' | 'window-notification' | 'none';
  error?: string;
}

async function resolveSwRegistration(
  env?: BrowserNotificationEnv
): Promise<Pick<ServiceWorkerRegistration, 'showNotification'> | null> {
  if (env?.getRegistration) {
    try {
      const reg = await env.getRegistration();
      if (reg && typeof reg.showNotification === 'function') return reg;
    } catch {
      return null;
    }
    return null;
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing && typeof existing.showNotification === 'function') {
      return existing;
    }
  } catch {}

  try {
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
    const reg = await Promise.race([readyPromise, timeoutPromise]);
    if (reg && typeof reg.showNotification === 'function') {
      return reg;
    }
  } catch {}

  return null;
}

/**
 * Dispatches an OS / PWA notification safely across both Desktop and Mobile platforms.
 * Mobile browsers and installed PWAs (Android Chrome, Samsung Internet, Brave Mobile, iOS Home Screen PWA)
 * throw `TypeError: Illegal constructor` for `new Notification(...)` and require `registration.showNotification()`.
 */
export async function dispatchBrowserNotification(
  title: string,
  options?: NotificationOptions,
  env?: BrowserNotificationEnv
): Promise<BrowserNotificationResult> {
  const permission =
    env?.permission ??
    (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied');

  if (permission !== 'granted') {
    return { dispatched: false, method: 'none', error: `Notification permission is ${permission}` };
  }

  const mergedOptions: NotificationOptions = {
    icon: DEFAULT_NOTIFICATION_ICON_URL,
    badge: NOTIFICATION_BADGE_URL,
    silent: true,
    ...options,
  };

  // 1. ServiceWorkerRegistration.showNotification() — required on Android, Samsung Internet, Brave Mobile, and iOS PWAs
  const swReg = await resolveSwRegistration(env);
  if (swReg && typeof swReg.showNotification === 'function') {
    try {
      await swReg.showNotification(title, mergedOptions);
      return { dispatched: true, method: 'service-worker' };
    } catch (swErr: any) {
      // Fall through to window.Notification if SW showNotification throws on a desktop edge case
      if (!env?.NotificationConstructor && (typeof window === 'undefined' || !('Notification' in window))) {
        return {
          dispatched: false,
          method: 'none',
          error: swErr?.message || 'Service worker notification failed',
        };
      }
    }
  }

  // 2. Desktop window.Notification constructor fallback
  const NotifCtor =
    env?.NotificationConstructor ??
    (typeof window !== 'undefined' && 'Notification' in window ? (window.Notification as any) : undefined);

  if (typeof NotifCtor === 'function') {
    try {
      const notif = new NotifCtor(title, mergedOptions);
      notif.onclick = () => {
        if (env?.onWindowFocus) env.onWindowFocus();
        else if (typeof window !== 'undefined') window.focus();
        try {
          notif.close();
        } catch {}
      };
      const closeAfter = env?.autoCloseMs ?? 6000;
      if (closeAfter > 0) {
        setTimeout(() => {
          try {
            notif.close();
          } catch {}
        }, closeAfter);
      }
      return { dispatched: true, method: 'window-notification' };
    } catch (ctorErr: any) {
      return {
        dispatched: false,
        method: 'none',
        error: ctorErr?.message || 'Notification constructor not allowed in this browser context',
      };
    }
  }

  return { dispatched: false, method: 'none', error: 'No supported browser notification API available' };
}
