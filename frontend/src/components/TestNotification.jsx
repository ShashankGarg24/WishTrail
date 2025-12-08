import { useState } from 'react';
import { Bell } from 'lucide-react';

/**
 * TestNotification Component
 * Use this component to test browser notifications during development
 * Remove or hide this in production
 */
export default function TestNotification() {
  const [testing, setTesting] = useState(false);

  const testNotification = async () => {
    setTesting(true);
    
    try {
      // Check if notifications are supported and permitted
      if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
      }

      if (Notification.permission !== 'granted') {
        alert('Please enable notifications first');
        return;
      }

      // Show a test notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification('Test Notification', {
          body: 'This is a test notification from WishTrail',
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: 'test-notification',
          data: {
            url: '/notifications',
          },
          requireInteraction: false,
        });
        
        console.log('Test notification shown');
      } else {
        // Fallback to standard Notification API
        new Notification('Test Notification', {
          body: 'This is a test notification from WishTrail',
          icon: '/icons/icon-192.png',
        });
      }
    } catch (error) {
      console.error('Error showing test notification:', error);
      alert('Failed to show notification: ' + error.message);
    } finally {
      setTimeout(() => setTesting(false), 1000);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <button
      onClick={testNotification}
      disabled={testing}
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all disabled:opacity-50"
      title="Test Browser Notification (Dev Only)"
    >
      <Bell className={`w-4 h-4 ${testing ? 'animate-bounce' : ''}`} />
      <span className="text-sm font-medium">Test Push</span>
    </button>
  );
}
