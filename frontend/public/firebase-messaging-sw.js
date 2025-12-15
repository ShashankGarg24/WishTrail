// Firebase Messaging Service Worker
// This file handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
// Note: Service workers can't access import.meta.env directly
// Config is passed via query params when registering the service worker
// Or hardcoded here (these values are public and safe to expose)
let firebaseConfig = null;

// Try to get config from URL params (if passed during registration)
try {
  const urlParams = new URLSearchParams(self.location.search);
  if (urlParams.has('firebaseConfig')) {
    firebaseConfig = JSON.parse(decodeURIComponent(urlParams.get('firebaseConfig')));
  }
} catch (e) {
}

// Fallback to hardcoded config (loaded from .env during build)
if (!firebaseConfig) {
  firebaseConfig = {
    apiKey: "AIzaSyBCVzRjPmFBZHsMtzG0cvKwwCl82sRzezI",
    authDomain: "wishtrail-291cc.firebaseapp.com",
    projectId: "wishtrail-291cc",
    storageBucket: "wishtrail-291cc.appspot.com",
    messagingSenderId: "432981958169",
    appId: "1:432981958169:web:50d54b52a28642445f9488" // TODO: Replace with WEB app ID from Firebase Console
  };
}

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  
  const messaging = firebase.messaging();
  
  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    
    const notificationTitle = payload.data?.title || payload.notification?.title || 'WishTrail';
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || '',
      icon: payload.data?.icon || '/icons/icon-192.png',
      badge: payload.data?.badge || '/icons/badge-72.png',
      data: {
        url: payload.data?.url || '/notifications',
        type: payload.data?.type || '',
        id: payload.data?.id || ''
      },
      tag: payload.data?.id || Date.now().toString(),
      requireInteraction: false,
      vibrate: [200, 100, 200],
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
}

// Service worker lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/notifications';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // If no window is open, open a new one
        return self.clients.openWindow(urlToOpen);
      })
  );
});
