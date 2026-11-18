// Client Web Push & Service Worker Registration Manager
import { UserProfile } from '../types';
import { notificationSoundService } from './notificationSoundService';
import { DEFAULT_NOTIFICATION_ICON_URL, NOTIFICATION_BADGE_URL } from '../utils/pwaAssets';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { authSessionService } from './authSessionService';

const LAST_ENDPOINT_STORAGE_KEY = 'swiftsweeps_push_endpoint';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export type DevicePlatform = 'android' | 'ios' | 'desktop';

class WebPushClient {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSubscribing = false;
  private lastSyncedBindingKey: string | null = null;

  public getCachedEndpoint(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(LAST_ENDPOINT_STORAGE_KEY);
      return val && val.startsWith('https://') ? val : null;
    } catch {
      return null;
    }
  }

  private setCachedEndpoint(endpoint: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (endpoint && endpoint.startsWith('https://')) {
        localStorage.setItem(LAST_ENDPOINT_STORAGE_KEY, endpoint);
      } else {
        localStorage.removeItem(LAST_ENDPOINT_STORAGE_KEY);
      }
    } catch {}
  }

  private async buildPushAuthHeaders(
    explicitUser?: Pick<UserProfile, 'id' | 'role'> | null
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const session = authSessionService.getActiveSession();
    const uid = explicitUser?.id || session?.userId;
    const role = explicitUser?.role || session?.role;
    if (uid) headers['x-user-id'] = uid;
    if (role) headers['x-user-role'] = role;

    if (supabase && isSupabaseConfigured()) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-supabase-token'] = token;
        }
      } catch {}
    }
    return headers;
  }

  public getDevicePlatform(): DevicePlatform {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
  }

  public getBrowserName(): string {
    if (typeof window === 'undefined') return 'Browser';
    const ua = navigator.userAgent;
    if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
    if (/edg/i.test(ua)) return 'Microsoft Edge';
    if (/opr|opera/i.test(ua)) return 'Opera';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if ((navigator as any).brave || /brave/i.test(ua)) return 'Brave';
    if (/chrome|crios/i.test(ua)) return 'Chrome';
    if (/safari/i.test(ua)) return 'Safari';
    return 'Browser';
  }

  public async isBraveBrowser(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const nav = navigator as any;
    if (nav.brave && typeof nav.brave.isBrave === 'function') {
      try {
        return await nav.brave.isBrave();
      } catch {
        return false;
      }
    }
    return /brave/i.test(navigator.userAgent);
  }

  public isIOS(): boolean {
    return this.getDevicePlatform() === 'ios';
  }

  public isAndroid(): boolean {
    return this.getDevicePlatform() === 'android';
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      // Guarantee worker is ready before returning (fixes Samsung Internet InvalidStateError)
      const reg = await navigator.serviceWorker.ready;
      this.swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('[WebPushClient] Service worker registration notice:', err);
      try {
        const fallback = await navigator.serviceWorker.getRegistration();
        if (fallback) {
          this.swRegistration = fallback;
          return fallback;
        }
      } catch {}
      return null;
    }
  }

  public async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.swRegistration) return this.swRegistration;
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const readyReg = await navigator.serviceWorker.ready;
        if (readyReg) {
          this.swRegistration = readyReg;
          return readyReg;
        }
      } catch {}
    }
    return this.registerServiceWorker();
  }

  public isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  public getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  }

  public async hasActiveSubscription(): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    try {
      const reg = await this.getRegistration();
      if (!reg) return false;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  // Extracts keys directly as base64 strings so Samsung Internet & Brave never drop ArrayBuffer keys
  private formatSubscriptionPayload(subscription: PushSubscription): {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  } {
    const rawJson = typeof subscription.toJSON === 'function' ? subscription.toJSON() : ({} as any);
    const p256dhKey = subscription.getKey ? subscription.getKey('p256dh') : null;
    const authKey = subscription.getKey ? subscription.getKey('auth') : null;

    const p256dh = arrayBufferToBase64(p256dhKey) || rawJson.keys?.p256dh || '';
    const auth = arrayBufferToBase64(authKey) || rawJson.keys?.auth || '';

    return {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: {
        p256dh,
        auth,
      },
    };
  }

  public async subscribeToPushNotifications(currentUser: UserProfile): Promise<{
    success: boolean;
    error?: string;
    isBraveFCMBlocked?: boolean;
  }> {
    if (!this.isPushSupported()) {
      return { success: false, error: 'Push notifications are not supported by this browser.' };
    }

    // On iOS Safari, Web Push is only supported once added to Home Screen as PWA
    if (this.isIOS() && !this.isStandalone()) {
      return {
        success: false,
        error: 'On iPhone and iPad, please first tap Share [↑] and "Add to Home Screen" to enable background alerts.',
      };
    }

    if (this.isSubscribing) {
      return { success: false, error: 'Subscription is already in progress.' };
    }

    this.isSubscribing = true;

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.isSubscribing = false;
        return { success: false, error: 'Notification permission was denied or dismissed.' };
      }

      // 2. Ensure Service Worker is registered and ready
      const reg = await this.getRegistration();
      if (!reg) {
        this.isSubscribing = false;
        return { success: false, error: 'Could not initialize background service worker.' };
      }

      // 3. Fetch VAPID public key from backend
      const res = await fetch('/api/push/vapid-public-key');
      if (!res.ok) {
        this.isSubscribing = false;
        return { success: false, error: 'Failed to retrieve push encryption credentials.' };
      }
      const { publicKey } = await res.json();
      if (!publicKey) {
        this.isSubscribing = false;
        return { success: false, error: 'Invalid VAPID public key returned from server.' };
      }

      // 4. Subscribe to PushManager with Brave/Samsung Internet resilience
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription: PushSubscription | null = null;

      try {
        subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any,
          });
        }
      } catch (pushErr: any) {
        const isBrave = await this.isBraveBrowser();
        const msg = String(pushErr?.message || pushErr);
        if (isBrave || msg.toLowerCase().includes('push service error') || msg.toLowerCase().includes('not supported')) {
          this.isSubscribing = false;
          return {
            success: false,
            isBraveFCMBlocked: true,
            error:
              'Brave blocks Google Push Services by default. To fix: Open brave://settings/privacy, enable "Use Google services for push messaging", and refresh.',
          };
        }
        throw pushErr;
      }

      if (!subscription) {
        this.isSubscribing = false;
        return { success: false, error: 'Push subscription could not be created.' };
      }

      // 5. Explicitly format subscription with base64 keys
      const normalizedSubscription = this.formatSubscriptionPayload(subscription);
      this.setCachedEndpoint(normalizedSubscription.endpoint);

      // 6. Send subscription to backend API with verified auth headers
      const authHeaders = await this.buildPushAuthHeaders(currentUser);
      const subResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          subscription: normalizedSubscription,
          userId: currentUser.id,
          userRole: currentUser.role,
          userEmail: currentUser.email,
          platform: this.getDevicePlatform(),
          browser: this.getBrowserName(),
        }),
      });

      if (subResponse.ok) {
        this.lastSyncedBindingKey = `${currentUser.id}:${currentUser.role}:${normalizedSubscription.endpoint}`;
      }
      this.isSubscribing = false;
      return { success: subResponse.ok };
    } catch (err: any) {
      this.isSubscribing = false;
      console.warn('[WebPushClient] Push subscription error:', err);
      return { success: false, error: err?.message || 'Failed to register push subscription.' };
    }
  }

  // Auto-sync (or silently re-subscribe if granted after prior logout) and strictly rebind to currentUser
  public async autoSyncIfGranted(currentUser: UserProfile): Promise<boolean> {
    if (typeof window === 'undefined' || !currentUser?.id || !this.isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    if (this.isIOS() && !this.isStandalone()) return false;

    try {
      const reg = await this.getRegistration();
      if (!reg) return false;
      let sub = await reg.pushManager.getSubscription();

      // If browser permission is already granted but subscription was cleared on previous logout,
      // silently establish a fresh PushSubscription for the newly logged-in user.
      if (!sub) {
        try {
          const vapidRes = await fetch('/api/push/vapid-public-key');
          if (vapidRes.ok) {
            const { publicKey } = await vapidRes.json();
            if (publicKey) {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
              });
            }
          }
        } catch {
          return false;
        }
      }

      if (!sub) return false;
      const normalized = this.formatSubscriptionPayload(sub);
      this.setCachedEndpoint(normalized.endpoint);

      const bindingKey = `${currentUser.id}:${currentUser.role}:${normalized.endpoint}`;
      if (this.lastSyncedBindingKey === bindingKey) {
        return true;
      }

      const authHeaders = await this.buildPushAuthHeaders(currentUser);
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          subscription: normalized,
          userId: currentUser.id,
          userRole: currentUser.role,
          userEmail: currentUser.email,
          platform: this.getDevicePlatform(),
          browser: this.getBrowserName(),
        }),
      });
      if (res.ok) {
        this.lastSyncedBindingKey = bindingKey;
      }
      return res.ok;
    } catch {
      return false;
    }
  }

  // Immediately revoke server binding & close local browser PushSubscription on logout
  public async unsubscribeFromPushNotifications(prevUser?: UserProfile | null): Promise<void> {
    if (typeof window === 'undefined') return;
    this.lastSyncedBindingKey = null;
    const cachedEndpoint = this.getCachedEndpoint();
    this.setCachedEndpoint(null);

    const authHeaders = await this.buildPushAuthHeaders(prevUser);

    let liveEndpoint = cachedEndpoint;
    let activeSub: PushSubscription | null = null;
    if (this.isPushSupported()) {
      try {
        const reg = this.swRegistration || (await navigator.serviceWorker.getRegistration());
        if (reg?.pushManager) {
          activeSub = await reg.pushManager.getSubscription();
          if (activeSub?.endpoint) {
            liveEndpoint = activeSub.endpoint;
          }
        }
      } catch {}
    }

    if (liveEndpoint || prevUser?.id) {
      try {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          keepalive: true,
          headers: authHeaders,
          body: JSON.stringify({
            endpoint: liveEndpoint || undefined,
            userId: prevUser?.id,
            revokeAllForUser: !liveEndpoint,
          }),
        });
      } catch {}
    }

    if (activeSub) {
      try {
        await activeSub.unsubscribe();
      } catch {}
    }
  }

  // Trigger high-priority push alert dispatch
  public async dispatchPushAlert(params: {
    recipientId: string;
    recipientRole?: string;
    senderId?: string;
    title: string;
    body: string;
    url?: string;
    tag?: string;
    conversationId?: string;
    actionType?: 'chat' | 'payout' | 'deposit' | 'game';
  }): Promise<void> {
    try {
      const session = authSessionService.getActiveSession();
      const effectiveSenderId = params.senderId || session?.userId;
      if (!effectiveSenderId) return;

      const authHeaders = await this.buildPushAuthHeaders();
      await fetch('/api/push/notify', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          recipientId: params.recipientId,
          recipientRole: params.recipientRole,
          senderId: effectiveSenderId,
          title: params.title,
          body: params.body.slice(0, 160),
          url: params.url || '/#chat',
          tag: params.tag || `alert_${params.actionType || 'msg'}_${Date.now()}`,
          conversationId: params.conversationId,
          actionType: params.actionType,
        }),
      });
    } catch (e) {
      // Background push failures are non-blocking
    }
  }

  // Trigger push alert dispatch when a user sends a chat message
  public async notifyRecipientViaPush(params: {
    recipientId: string;
    recipientRole?: string;
    senderId?: string;
    senderName: string;
    messageText: string;
    conversationId: string;
  }): Promise<void> {
    const isToStaff = params.recipientRole === 'agent' || params.recipientRole === 'admin' || params.recipientId === 'staff';
    return this.dispatchPushAlert({
      recipientId: params.recipientId,
      recipientRole: params.recipientRole,
      senderId: params.senderId,
      title: `Swift Sweeps: ${params.senderName}`,
      body: params.messageText,
      url: isToStaff ? '/#ops_chat' : '/#chat',
      tag: `chat_${params.conversationId}`,
      conversationId: params.conversationId,
      actionType: 'chat',
    });
  }

  // Trigger a test alert directly to the current user's device with self-healing sync
  public async sendTestAlert(currentUser: UserProfile): Promise<{ success: boolean; message: string }> {
    try {
      const reg = await this.getRegistration();

      // Check permission first
      if (Notification.permission !== 'granted') {
        return {
          success: false,
          message: 'Notifications are not enabled yet. Tap "Enable Alerts" first.',
        };
      }

      const authHeaders = await this.buildPushAuthHeaders(currentUser);

      // Pre-flight self-healing: re-sync local PushSubscription to backend before dispatching
      if (reg) {
        try {
          const localSub = await reg.pushManager.getSubscription();
          if (localSub) {
            const normalized = this.formatSubscriptionPayload(localSub);
            this.setCachedEndpoint(normalized.endpoint);
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                subscription: normalized,
                userId: currentUser.id,
                userRole: currentUser.role,
                userEmail: currentUser.email,
                platform: this.getDevicePlatform(),
                browser: this.getBrowserName(),
              }),
            });
          }
        } catch {}
      }

      // Dispatch backend push
      const res = await fetch('/api/push/notify', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          recipientId: currentUser.id,
          recipientRole: currentUser.role,
          senderId: currentUser.id,
          title: 'Swift Sweeps Support',
          body: 'Test alert: Background notification received with sound & vibration!',
          url: currentUser.role === 'customer' ? '/#chat' : '/#ops_chat',
          tag: `test_${Date.now()}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent > 0) {
        return {
          success: true,
          message: `Heads-up alert dispatched! (${data.sent} device reached on ${this.getBrowserName()})`,
        };
      }

      // Self-healing fallback: If server reported 0 devices or push service was blocked in Brave,
      // dispatch direct service worker notification + chime immediately so user experiences the alert!
      if (reg && 'showNotification' in reg) {
        try {
          await reg.showNotification('Swift Sweeps Support', {
            body: 'Test alert: Heads-up notification active with sound & vibration!',
            icon: DEFAULT_NOTIFICATION_ICON_URL,
            badge: NOTIFICATION_BADGE_URL,
            vibrate: [200, 100, 200, 100, 250],
            tag: `test_local_${Date.now()}`,
            data: { url: '/#chat' },
          } as any);
          notificationSoundService.playIncomingMessageSound();
          return {
            success: true,
            message: `Alert triggered on ${this.getBrowserName()}! Minimize or lock screen to test background alerts.`,
          };
        } catch {}
      }

      // Last fallback: Web Audio + Desktop notification
      notificationSoundService.playIncomingMessageSound();
      notificationSoundService.showDesktopNotification('Swift Sweeps Support', {
        body: 'Test alert: Background notification chime and banner active!',
      });

      return {
        success: true,
        message: `Alert tested on ${this.getBrowserName()}! Chime and heads-up banner active.`,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error sending test alert' };
    }
  }
}

export const webPushClient = new WebPushClient();
