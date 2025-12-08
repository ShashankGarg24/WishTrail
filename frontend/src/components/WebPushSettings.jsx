import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission, isNotificationEnabled } from '../services/webPush';

/**
 * WebPushSettings Component
 * Allows users to enable/disable browser push notifications
 * Can be integrated into the Settings page or as a standalone component
 */
export default function WebPushSettings() {
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isChecking, setIsChecking] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check current permission status
  useEffect(() => {
    const checkPermission = () => {
      const permission = getNotificationPermission();
      setPermissionStatus(permission);
      setIsChecking(false);
    };

    checkPermission();

    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
        permissionStatus.onchange = () => {
          checkPermission();
        };
      }).catch(() => {
        // Permissions API not supported
      });
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermissionStatus(result || 'denied');
      
      if (result === 'granted') {
        // Notification permission granted, the app will automatically register the token
        console.log('Push notifications enabled');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'unsupported':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Browser notifications enabled';
      case 'denied':
        return 'Browser notifications blocked';
      case 'unsupported':
        return 'Browser notifications not supported';
      default:
        return 'Browser notifications not enabled';
    }
  };

  const getStatusDescription = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'You will receive notifications in your browser for likes, comments, follows, and more.';
      case 'denied':
        return 'You have blocked notifications. To enable them, you need to update your browser settings.';
      case 'unsupported':
        return 'Your browser does not support push notifications. Try using Chrome, Firefox, or Edge.';
      default:
        return 'Enable browser notifications to stay updated even when the app is closed.';
    }
  };

  const openBrowserSettings = () => {
    const message = `To enable notifications:\n\n` +
      `Chrome/Edge: Settings → Privacy and security → Site Settings → Notifications → ${window.location.origin}\n\n` +
      `Firefox: Settings → Privacy & Security → Permissions → Notifications → Settings → ${window.location.origin}\n\n` +
      `Safari: Preferences → Websites → Notifications → ${window.location.origin}`;
    
    alert(message);
  };

  if (isChecking) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  // Don't show if running in native app
  if (typeof window !== 'undefined' && window.ReactNativeWebView) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {getStatusText()}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {getStatusDescription()}
          </p>
          
          <div className="mt-3 flex gap-2">
            {permissionStatus === 'default' && (
              <button
                onClick={handleEnableNotifications}
                disabled={isRequesting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Requesting...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Enable Notifications
                  </>
                )}
              </button>
            )}
            
            {permissionStatus === 'denied' && (
              <button
                onClick={openBrowserSettings}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Open Browser Settings
              </button>
            )}
            
            {permissionStatus === 'granted' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                All set!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {permissionStatus === 'granted' && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> You can customize which types of notifications you want to receive in your notification settings below.
          </p>
        </div>
      )}
    </div>
  );
}
