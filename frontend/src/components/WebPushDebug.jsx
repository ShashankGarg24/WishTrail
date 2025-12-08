import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * WebPushDebug Component
 * Displays detailed web push notification status for debugging
 */
export default function WebPushDebug() {
  const [status, setStatus] = useState({
    browserSupport: false,
    serviceWorkerSupport: false,
    permission: 'unknown',
    firebaseConfig: false,
    fcmToken: null,
    deviceRegistered: false,
    errors: [],
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    const newStatus = {
      browserSupport: false,
      serviceWorkerSupport: false,
      permission: 'unknown',
      firebaseConfig: false,
      fcmToken: null,
      deviceRegistered: false,
      errors: [],
    };

    try {
      // Check browser support
      newStatus.browserSupport = 'Notification' in window;
      if (!newStatus.browserSupport) {
        newStatus.errors.push('Browser does not support notifications');
      }

      // Check service worker support
      newStatus.serviceWorkerSupport = 'serviceWorker' in navigator;
      if (!newStatus.serviceWorkerSupport) {
        newStatus.errors.push('Browser does not support service workers');
      }

      // Check notification permission
      if (newStatus.browserSupport) {
        newStatus.permission = Notification.permission;
      }

      // Check Firebase config
      const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
        'VITE_FIREBASE_VAPID_KEY',
      ];

      const missingVars = [];
      for (const varName of requiredVars) {
        const value = import.meta.env[varName];
        if (!value || value === '') {
          missingVars.push(varName);
        }
      }

      if (missingVars.length === 0) {
        newStatus.firebaseConfig = true;
        
        // Check if APP_ID is for web (should contain ':web:')
        const appId = import.meta.env.VITE_FIREBASE_APP_ID;
        if (appId && !appId.includes(':web:')) {
          newStatus.errors.push(`APP_ID appears to be for ${appId.includes(':android:') ? 'Android' : appId.includes(':ios:') ? 'iOS' : 'mobile'}, not web. You need a Web app ID from Firebase Console.`);
        }
      } else {
        newStatus.errors.push(`Missing Firebase config: ${missingVars.join(', ')}`);
      }

      // Check for FCM token in localStorage (if previously obtained)
      try {
        const tokenKey = Object.keys(localStorage).find(key => 
          key.includes('firebase:token') || key.includes('fcm_token')
        );
        if (tokenKey) {
          newStatus.fcmToken = 'Token exists (check console for details)';
        }
      } catch (e) {
        // Ignore
      }

      // Check if device is registered
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('http://localhost:5000/api/v1/notifications/devices', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            const webDevices = data.data?.devices?.filter(d => d.platform === 'web') || [];
            newStatus.deviceRegistered = webDevices.length > 0;
            if (webDevices.length > 0) {
              newStatus.fcmToken = `${webDevices.length} web device(s) registered`;
            }
          }
        }
      } catch (e) {
        newStatus.errors.push(`Could not check device registration: ${e.message}`);
      }

    } catch (error) {
      newStatus.errors.push(`Error checking status: ${error.message}`);
    }

    setStatus(newStatus);
    setChecking(false);
  };

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setStatus(prev => ({ ...prev, permission }));
      if (permission === 'granted') {
        // Trigger app to initialize web push
        window.location.reload();
      }
    } catch (error) {
      alert('Error requesting permission: ' + error.message);
    }
  };

  const StatusIcon = ({ condition }) => {
    if (condition === true) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (condition === false) return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  if (checking) {
    return (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md border border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Checking web push status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Web Push Debug
        </h3>
        <button
          onClick={checkStatus}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-xs">
        {/* Browser Support */}
        <div className="flex items-center gap-2">
          <StatusIcon condition={status.browserSupport} />
          <span className="text-gray-700 dark:text-gray-300">
            Browser Notifications: {status.browserSupport ? 'Supported' : 'Not Supported'}
          </span>
        </div>

        {/* Service Worker Support */}
        <div className="flex items-center gap-2">
          <StatusIcon condition={status.serviceWorkerSupport} />
          <span className="text-gray-700 dark:text-gray-300">
            Service Workers: {status.serviceWorkerSupport ? 'Supported' : 'Not Supported'}
          </span>
        </div>

        {/* Permission Status */}
        <div className="flex items-center gap-2">
          <StatusIcon condition={status.permission === 'granted'} />
          <span className="text-gray-700 dark:text-gray-300">
            Permission: {status.permission}
          </span>
          {status.permission === 'default' && (
            <button
              onClick={requestPermission}
              className="ml-auto px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Allow
            </button>
          )}
        </div>

        {/* Firebase Config */}
        <div className="flex items-center gap-2">
          <StatusIcon condition={status.firebaseConfig} />
          <span className="text-gray-700 dark:text-gray-300">
            Firebase Config: {status.firebaseConfig ? 'Valid' : 'Invalid'}
          </span>
        </div>

        {/* FCM Token */}
        <div className="flex items-center gap-2">
          <StatusIcon condition={!!status.fcmToken} />
          <span className="text-gray-700 dark:text-gray-300">
            FCM Token: {status.fcmToken || 'Not obtained'}
          </span>
        </div>

        {/* Device Registered */}
        <div className="flex items-center gap-2">
          <StatusIcon condition={status.deviceRegistered} />
          <span className="text-gray-700 dark:text-gray-300">
            Device Registered: {status.deviceRegistered ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Errors */}
      {status.errors.length > 0 && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-800 dark:text-red-400 mb-1">Issues Found:</p>
          <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
            {status.errors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Console Logs Hint */}
      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          💡 Check browser console for detailed logs starting with [WebPush]
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => window.open('chrome://settings/content/notifications', '_blank')}
          className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Browser Settings
        </button>
        <button
          onClick={() => console.log('Firebase Config:', {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...',
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY?.substring(0, 10) + '...',
          })}
          className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Log Config
        </button>
        <button
          onClick={async () => {
            try {
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification('Test Notification', {
                body: 'This is a local test notification',
                icon: '/icons/icon-192.png',
                badge: '/icons/badge-72.png',
                data: { url: '/notifications' },
              });
              console.log('[Test] Local notification shown');
            } catch (error) {
              console.error('[Test] Error showing notification:', error);
              alert('Error: ' + error.message);
            }
          }}
          className="w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Local Notification
        </button>
      </div>
    </div>
  );
}
