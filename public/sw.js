// Swift Sweeps Service Worker — Realtime Background Web Push & Notification Dispatcher

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
  const targetUrl = data.data?.url || data.url || '/#chat';

  // High-priority Heads-Up Notification configuration (Messenger / FB Lite style)
  const options = {
    body: data.body || 'You have a new message from customer care.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.png',
    image: data.image || undefined,
    // Distinct mobile vibration rhythm [buzz, pause, buzz, pause, long buzz]
    vibrate: [200, 100, 200, 100, 250],
    data: {
      url: targetUrl,
      conversationId: data.data?.conversationId || data.conversationId,
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
