/**
 * Service Worker for NEXUS Notifications & PWA
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'NEXUS', body: 'Нове сповіщення' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'NEXUS', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    badge: data.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    tag: data.tag || 'nexus-notification',
    data: data.data || {}
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
