import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase config - will be loaded from environment variables
const getFirebaseConfig = () => {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
};

let messaging = null;
let firebaseApp = null;

/**
 * Initialize Firebase Messaging
 */
export const initializeFirebaseMessaging = async () => {
  try {
    // Check if FCM is supported in this browser
    const supported = await isSupported();
    if (!supported) {
      return null;
    }

    const config = getFirebaseConfig();
    
    // Validate config
    if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
      console.warn('[WebPush] Firebase config is incomplete. Please set VITE_FIREBASE_* environment variables.');
      return null;
    }

    // Initialize Firebase app if not already initialized
    if (!firebaseApp) {
      firebaseApp = initializeApp(config);
    }

    // Get messaging instance
    messaging = getMessaging(firebaseApp);
    
    return messaging;
  } catch (error) {
    console.error('[WebPush] Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('[WebPush] This browser does not support notifications');
      return null;
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      console.warn('[WebPush] Notification permission was previously denied');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    return null;
  }
};

/**
 * Get FCM token for the device
 */
export const getFCMToken = async () => {
  try {
    if (!messaging) {
      await initializeFirebaseMessaging();
    }

    if (!messaging) {
      console.warn('[WebPush] Messaging not initialized');
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[WebPush] VAPID key not configured. Set VITE_FIREBASE_VAPID_KEY in your environment variables.');
      return null;
    }

    // Register service worker first
    if ('serviceWorker' in navigator) {
      // Try firebase-messaging-sw.js first, fallback to sw.js
      let registration;
      try {
        // Pass Firebase config to service worker via query params
        const config = getFirebaseConfig();
        const configParam = encodeURIComponent(JSON.stringify(config));
        registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?firebaseConfig=${configParam}`);
      } catch (error) {
        console.warn('[WebPush] Failed to register firebase-messaging-sw.js, trying sw.js:', error);
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      
      await navigator.serviceWorker.ready;
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        return token;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

/**
 * Setup foreground message listener
 * This handles notifications when the app is open and in focus
 */
export const setupForegroundMessageListener = (callback) => {
  try {
    if (!messaging) {
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      
      // Show notification when app is in foreground
      // Service worker's onBackgroundMessage only fires when app is in background
      const title = payload.data?.title || payload.notification?.title || 'WishTrail';
      const body = payload.data?.body || payload.notification?.body || '';
      const icon = payload.data?.icon || payload.notification?.icon || '/icons/icon-192.png';
      const url = payload.data?.url || payload.fcmOptions?.link || '/notifications';
      
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon,
            badge: payload.data?.badge || '/icons/badge-72.png',
            data: {
              url,
              type: payload.data?.type || '',
              id: payload.data?.id || ''
            },
            tag: payload.data?.id || Date.now().toString(),
            requireInteraction: false,
            vibrate: [200, 100, 200]
          });
        });
      }
      
      // Call user callback if provided for in-app updates
      if (callback && typeof callback === 'function') {
        callback(payload);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('[WebPush] Error setting up foreground message listener:', error);
    return null;
  }
};

/**
 * Register device with backend
 */
export const registerDeviceWithBackend = async (token, apiFunction) => {
  try {
    if (!token) {
      console.warn('[WebPush] No token provided for device registration');
      return null;
    }

    // Check if we already registered this token in this session
    const sessionKey = 'webpush_registered_token';
    const registeredToken = sessionStorage.getItem(sessionKey);
    
    if (registeredToken === token) {
      return { ok: true, cached: true };
    }

    // Get timezone information
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffsetMinutes = -new Date().getTimezoneOffset();

    const payload = {
      token,
      platform: 'web',
      provider: 'fcm',
      timezone,
      timezoneOffsetMinutes,
    };

    const response = await apiFunction(payload);
    
    // Store token in session to prevent duplicate registrations
    sessionStorage.setItem(sessionKey, token);
    
    return response;
  } catch (error) {
    return null;
  }
};

/**
 * Initialize web push notifications
 * This is the main function to call from your app
 */
export const initializeWebPush = async (registerDeviceAPI, onMessageCallback) => {
  try {
    
    // Check if running in native app (skip web push in that case)
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      return null;
    }

    // Initialize Firebase Messaging
    const msg = await initializeFirebaseMessaging();
    if (!msg) {
      return null;
    }

    // Request notification permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      return null;
    }

    // Setup foreground message listener
    const unsubscribe = setupForegroundMessageListener(onMessageCallback);

    return {
      token,
      unsubscribe,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Check if notifications are supported and enabled
 */
export const isNotificationEnabled = () => {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Notification.permission === 'granted'
  );
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};
