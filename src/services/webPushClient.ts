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

class WebPushClient {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSubscribing = false;

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

  public async subscribeToPushNotifications(currentUser: UserProfile): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.isPushSupported()) {
      return { success: false, error: 'Push notifications are not supported by this browser.' };
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

  // Trigger push alert dispatch when a user sends a chat message
  public async notifyRecipientViaPush(params: {
    recipientId: string;
    recipientRole?: string;
    senderName: string;
    messageText: string;
    conversationId: string;
  }): Promise<void> {
    try {
      await fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: params.recipientId,
          recipientRole: params.recipientRole,
          title: `New message from ${params.senderName}`,
          body: params.messageText.slice(0, 120),
          url: `/#chat`,
          conversationId: params.conversationId,
        }),
      });
    } catch (e) {
      // Background push failures are non-blocking
    }
  }
}

export const webPushClient = new WebPushClient();
