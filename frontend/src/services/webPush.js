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
      console.log('[WebPush] Firebase Messaging is not supported in this browser');
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
    console.log('[WebPush] Firebase Messaging initialized successfully');
    
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
    console.log('[WebPush] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[WebPush] Error requesting notification permission:', error);
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
        console.log('[WebPush] Service worker registered:', registration);
      } catch (error) {
        console.warn('[WebPush] Failed to register firebase-messaging-sw.js, trying sw.js:', error);
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      
      await navigator.serviceWorker.ready;
      console.log('[WebPush] Service worker ready');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log('[WebPush] FCM token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.warn('[WebPush] No registration token available. Request permission first.');
        return null;
      }
    } else {
      console.warn('[WebPush] Service workers are not supported');
      return null;
    }
  } catch (error) {
    console.error('[WebPush] Error getting FCM token:', error);
    console.error('[WebPush] Error details:', error.message, error.code);
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
      console.warn('[WebPush] Messaging not initialized for foreground listener');
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[WebPush] Foreground message received:', payload);
      
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
      console.log('[WebPush] Token already registered in this session, skipping duplicate registration');
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
    console.log('[WebPush] Device registered with backend successfully');
    
    // Store token in session to prevent duplicate registrations
    sessionStorage.setItem(sessionKey, token);
    
    return response;
  } catch (error) {
    console.error('[WebPush] Error registering device with backend:', error);
    return null;
  }
};

/**
 * Initialize web push notifications
 * This is the main function to call from your app
 */
export const initializeWebPush = async (registerDeviceAPI, onMessageCallback) => {
  try {
    console.log('[WebPush] 🚀 Starting web push initialization...');
    
    // Check if running in native app (skip web push in that case)
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      console.log('[WebPush] Running in native app, skipping web push initialization');
      return null;
    }

    console.log('[WebPush] Step 1/5: Initializing Firebase Messaging...');
    // Initialize Firebase Messaging
    const msg = await initializeFirebaseMessaging();
    if (!msg) {
      console.error('[WebPush] ❌ Firebase Messaging initialization failed');
      return null;
    }
    console.log('[WebPush] ✅ Firebase Messaging initialized');

    console.log('[WebPush] Step 2/5: Checking notification permission...');
    // Request notification permission
    const permission = await requestNotificationPermission();
    console.log('[WebPush] Current permission:', permission);
    if (permission !== 'granted') {
      console.warn('[WebPush] ⚠️ Notification permission not granted:', permission);
      return null;
    }
    console.log('[WebPush] ✅ Notification permission granted');

    console.log('[WebPush] Step 3/5: Getting FCM token...');
    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      console.error('[WebPush] ❌ Failed to get FCM token');
      return null;
    }
    console.log('[WebPush] ✅ FCM token obtained:', token.substring(0, 30) + '...');

    console.log('[WebPush] Step 4/5: Registering device with backend...');
    // Register device with backend
    const registered = await registerDeviceWithBackend(token, registerDeviceAPI);
    if (!registered) {
      console.error('[WebPush] ❌ Failed to register device with backend');
      // Continue anyway - token is obtained
    } else {
      console.log('[WebPush] ✅ Device registered with backend');
    }

    console.log('[WebPush] Step 5/5: Setting up foreground message listener...');
    // Setup foreground message listener
    const unsubscribe = setupForegroundMessageListener(onMessageCallback);
    console.log('[WebPush] ✅ Foreground message listener set up');

    console.log('[WebPush] 🎉 Web push initialization complete!');
    return {
      token,
      unsubscribe,
    };
  } catch (error) {
    console.error('[WebPush] ❌ Error initializing web push:', error);
    console.error('[WebPush] Error stack:', error.stack);
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
