// Client Web Push & Service Worker Registration Manager
import { UserProfile } from '../types';

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

export type DevicePlatform = 'android' | 'ios' | 'desktop';

class WebPushClient {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSubscribing = false;

  public getDevicePlatform(): DevicePlatform {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
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
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      this.swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('[WebPushClient] Service worker registration notice:', err);
      return null;
    }
  }

  public async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.swRegistration) return this.swRegistration;
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

  public async subscribeToPushNotifications(currentUser: UserProfile): Promise<{
    success: boolean;
    error?: string;
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

      // 3. Fetch VAPID public key from backend (works on both Express and Vercel)
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

      // 4. Subscribe to PushManager
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      // 5. Send subscription to backend API to store
      const subResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId: currentUser.id,
          userRole: currentUser.role,
          platform: this.getDevicePlatform(),
        }),
      });

      this.isSubscribing = false;
      return { success: subResponse.ok };
    } catch (err: any) {
      this.isSubscribing = false;
      console.warn('[WebPushClient] Push subscription error:', err);
      return { success: false, error: err?.message || 'Failed to register push subscription.' };
    }
  }

  // Auto-sync existing subscription to server when permission is granted
  public async autoSyncIfGranted(currentUser: UserProfile): Promise<void> {
    if (typeof window === 'undefined' || !this.isPushSupported()) return;
    if (Notification.permission !== 'granted') return;

    try {
      const reg = await this.getRegistration();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub,
            userId: currentUser.id,
            userRole: currentUser.role,
            platform: this.getDevicePlatform(),
          }),
        });
      }
    } catch {
      // Non-blocking sync
    }
  }

  // Trigger high-priority push alert dispatch
  public async dispatchPushAlert(params: {
    recipientId: string;
    recipientRole?: string;
    title: string;
    body: string;
    url?: string;
    tag?: string;
    conversationId?: string;
    actionType?: 'chat' | 'payout' | 'deposit' | 'game';
  }): Promise<void> {
    try {
      await fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: params.recipientId,
          recipientRole: params.recipientRole,
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
    senderName: string;
    messageText: string;
    conversationId: string;
  }): Promise<void> {
    return this.dispatchPushAlert({
      recipientId: params.recipientId,
      recipientRole: params.recipientRole,
      title: `Swift Sweeps: ${params.senderName}`,
      body: params.messageText,
      url: `/#chat`,
      tag: `chat_${params.conversationId}`,
      conversationId: params.conversationId,
      actionType: 'chat',
    });
  }

  // Trigger a test alert directly to the current user's device
  public async sendTestAlert(currentUser: UserProfile): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: currentUser.id,
          recipientRole: currentUser.role,
          title: 'Swift Sweeps Support',
          body: 'Test alert: Background notification received with sound & vibration!',
          url: '/#chat',
          tag: `test_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.sent > 0) {
        return { success: true, message: `Notification sent! (${data.sent} device reached)` };
      } else if (res.ok && data.sent === 0) {
        return { success: false, message: 'No registered devices found. Please enable notifications first.' };
      }
      return { success: false, message: data.error || 'Failed to dispatch test notification' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error sending test alert' };
    }
  }
}

export const webPushClient = new WebPushClient();
