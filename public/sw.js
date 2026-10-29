// Swift Sweeps Service Worker — Realtime Background Web Push & Notification Dispatcher

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Notification Even When Browser is Closed or Minimized
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
  const options = {
    body: data.body || 'You have a new message from customer care.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.data?.url || (data.url ? data.url : '/#chat'),
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'open_chat', title: 'Open Chat' },
      { action: 'close', title: 'Dismiss' },
    ],
    tag: data.tag || 'swiftsweeps_msg',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click / Tap — Focus Existing Tab or Open Target Route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
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
        // If an existing tab is open, focus it and navigate
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
