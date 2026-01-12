// Service worker installation - skip waiting to activate immediately
self.addEventListener('install', () => self.skipWaiting());

// Service worker activation - claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// NOTE: Push notifications are handled by firebase-messaging-sw.js
// Do NOT handle push events here to avoid duplicates
/* REMOVED - causing duplicate notifications
self.addEventListener('push', (event) => {
  
  let data = {};
  let notification = {};
  
  try {
    // FCM sends data in a specific format
    const payload = event.data.json();
    
    // FCM can send notification payload or data payload
    // notification payload: { notification: { title, body }, data: { ... } }
    // data payload: { data: { title, body, ... } }
    
    if (payload.notification) {
      notification = payload.notification;
      data = payload.data || {};
    } else if (payload.data) {
      // Data-only message
      data = payload.data;
      notification = {
        title: data.title || 'WishTrail',
        body: data.body || data.message || '',
        icon: data.icon
      };
    } else {
      // Fallback for other formats
      notification = payload;
      data = payload;
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    // Fallback
    try {
      data = event.data.json();
      notification = data;
    } catch (_) {
      data = {};
      notification = {};
    }
  }

  const title = notification.title || data.title || 'WishTrail';
  const options = {
    body: notification.body || data.body || data.message || '',
    icon: notification.icon || data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    data: {
      url: data.url || '/',
      type: data.type || '',
      id: data.id || '',
    },
    tag: data.id || Date.now().toString(),
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
*/

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const url = data.url || '/notifications';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if ('focus' in client) {
          // Navigate the existing window and focus it
          client.navigate(url);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      return self.clients.openWindow(url);
    })
  );
});

// Handle notification close event (optional - for analytics)
self.addEventListener('notificationclose', (event) => {
  // You can send analytics here if needed
});

// Background message handler for FCM
// This allows Firebase to handle messages when the app is in the background
self.addEventListener('message', (event) => {  
  // Handle messages from the app if needed
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


