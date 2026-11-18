// Swift Sweeps Service Worker — Realtime Background Web Push & Scoped Static Media Cache

const MEDIA_CACHE_PREFIX = 'swiftsweeps-media-';
const MEDIA_CACHE_NAME = 'swiftsweeps-media-v2';

const CACHEABLE_BRAND_PNG_PATHS = new Set([
  '/pwa-192x192-v2.png',
  '/pwa-512x512-v2.png',
  '/pwa-maskable-512x512-v2.png',
  '/apple-touch-icon-v2.png',
  '/favicon-v2.png',
  '/notification-badge-v2.png',
]);

function isCacheableStaticMediaPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  if (pathname.startsWith('/images/qr/') || pathname.startsWith('/api/')) {
    return false;
  }
  if (pathname.startsWith('/images/games/') || pathname.startsWith('/images/banners/')) {
    return pathname.endsWith('.webp') || pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg');
  }
  return CACHEABLE_BRAND_PNG_PATHS.has(pathname);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(MEDIA_CACHE_PREFIX) && key !== MEDIA_CACHE_NAME)
            .map((staleKey) => caches.delete(staleKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request || request.method !== 'GET' || request.mode === 'navigate') {
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (!isCacheableStaticMediaPath(requestUrl.pathname)) {
    return;
  }

  event.respondWith(
    caches.open(MEDIA_CACHE_NAME).then((cache) =>
      cache.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        });
      })
    )
  );
});

// Handle Background Push Notification Even When Browser or PWA is Minimized / Closed
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Swift Sweeps Support';
  const defaultTargetUrl = data.data?.targetRole === 'staff' ? '/#ops_chat' : '/#chat';
  const targetUrl = data.data?.url || data.url || defaultTargetUrl;

  const DEFAULT_ICON = '/pwa-192x192-v2.png';
  const DEFAULT_BADGE = '/notification-badge-v2.png';
  const LEGACY_ICONS = ['/pwa-192x192.png', '/pwa-512x512.png', '/favicon.png'];
  const LEGACY_BADGES = ['/favicon.png', '/pwa-192x192.png'];

  const resolvedIcon = !data.icon || LEGACY_ICONS.includes(data.icon) ? DEFAULT_ICON : data.icon;
  const resolvedBadge = !data.badge || LEGACY_BADGES.includes(data.badge) ? DEFAULT_BADGE : data.badge;

  // High-priority Heads-Up Notification configuration (Messenger / FB Lite style)
  const options = {
    body: data.body || 'You have a new message from customer care.',
    icon: resolvedIcon,
    badge: resolvedBadge,
    image: data.image || undefined,
    // Distinct mobile vibration rhythm [buzz, pause, buzz, pause, long buzz]
    vibrate: [200, 100, 200, 100, 250],
    data: {
      url: targetUrl,
      conversationId: data.data?.conversationId || data.conversationId,
      targetUserId: data.data?.targetUserId,
      targetRole: data.data?.targetRole,
      dateOfArrival: Date.now(),
      primaryKey: Date.now(),
    },
    // Priority heads-up display on Android lockscreen & active screen
    requireInteraction: true,
    renotify: true,
    tag: data.tag || `swiftsweeps_alert_${Date.now()}`,
    actions: [
      { action: 'open_action', title: '💬 Open / Reply' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click / Tap — Focus Existing Tab or Open Target Route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/#chat';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // If an existing tab or PWA window is open, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then((focusedClient) => {
              if (focusedClient && 'navigate' in focusedClient) {
                return focusedClient.navigate(targetUrl);
              } else if ('navigate' in client) {
                return client.navigate(targetUrl);
              }
            });
          }
        }
        // Otherwise, launch a fresh window/PWA instance
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
