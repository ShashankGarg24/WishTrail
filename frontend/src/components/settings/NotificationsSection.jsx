import { getNativeNotificationPermission, reconcileNativeNotifications } from '../../services/nativeNotifications';
import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { settingsAPI } from '../../services/api';

const NotificationsSection = () => {
  const isNativeApp = typeof window !== 'undefined' && !!window.ReactNativeWebView;
  const [notif, setNotif] = useState(null);
  const [originalNotif, setOriginalNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devicePermissionGranted, setDevicePermissionGranted] = useState(null);

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;

    const onSynced = ({ detail: { settings, granted } }) => {
      setDevicePermissionGranted(granted);
      setNotif(prev => prev ? { ...prev, inApp: { ...prev.inApp, enabled: settings.inApp.enabled } } : settings);
      setOriginalNotif(prev => prev ? { ...prev, inApp: { ...prev.inApp, enabled: settings.inApp.enabled } } : settings);
    };
    window.addEventListener('wt_notification_settings', onSynced);
    getNativeNotificationPermission().then(setDevicePermissionGranted).catch(err => setError(err.message));
    return () => window.removeEventListener('wt_notification_settings', onSynced);
  }, [isNativeApp]);

  useEffect(() => {
    setHasChanges(JSON.stringify(notif) !== JSON.stringify(originalNotif));
  }, [notif, originalNotif]);

  const fetchNotificationSettings = async () => {
    try {
      const settings = isNativeApp
        ? (await reconcileNativeNotifications(true)).settings
        : (await settingsAPI.getNotificationSettings()).data.data.notifications;
      setNotif(settings);
      setOriginalNotif(JSON.parse(JSON.stringify(settings)));
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
      setError('Could not load notification preferences. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const updateNotifSettings = (next) => {
    setNotif(next);
    setHasChanges(JSON.stringify(next) !== JSON.stringify(originalNotif));
    setError('');
    setSuccess('');
  };

  const saveNotifSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let next = notif;
      if (isNativeApp && notif.inApp.enabled !== false) {
        const granted = await getNativeNotificationPermission();
        setDevicePermissionGranted(granted);
        if (!granted) next = { ...notif, inApp: { ...notif.inApp, enabled: false } };
      }
      await settingsAPI.updateNotificationSettings({ notifications: next });
      setNotif(next);
      setOriginalNotif(JSON.parse(JSON.stringify(next)));
      setHasChanges(false);
      setSuccess('Notification preferences saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      setError(err?.response?.data?.message || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setNotif(JSON.parse(JSON.stringify(originalNotif)));
    setHasChanges(false);
    setError('');
    setSuccess('');
  };

  const handleMasterToggle = async (checked) => {
    setCheckingPermission(true);
    setError('');
    setSuccess('');
    try {
      const granted = checked ? await getNativeNotificationPermission(true) : devicePermissionGranted;
      if (checked) setDevicePermissionGranted(granted);
      const enabled = checked && granted;
      // Save only the master switch immediately; other edits retain their Save/Discard flow.
      const response = await settingsAPI.getNotificationSettings();
      const saved = response.data.data.notifications;
      await settingsAPI.updateNotificationSettings({ notifications: { ...saved, inApp: { ...saved.inApp, enabled } } });
      setNotif(prev => ({ ...prev, inApp: { ...prev.inApp, enabled } }));
      setOriginalNotif(prev => ({ ...prev, inApp: { ...prev.inApp, enabled } }));
      if (checked && !granted) setError('Notifications are off. You can enable them later in your device settings.');
    } catch (err) {
      setError(err.message || 'Could not update notification preferences. Please try again.');
    } finally { setCheckingPermission(false); }
  };

  if (loading || !notif) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">{loading ? 'Loading...' : error}</div>
        {!loading && <button type="button" onClick={() => { setLoading(true); fetchNotificationSettings(); }} className="mt-3 text-blue-600">Retry</button>}
      </div>
    );
  }

  const inAppEnabled = notif?.inApp?.enabled !== false && (!isNativeApp || devicePermissionGranted === true);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {isNativeApp
            ? 'Manage how and when you receive app notifications.'
            : 'Manage how and when you receive email notifications.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {isNativeApp && (
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">App Notifications</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{checkingPermission ? 'Updating notification preference...' : 'Choose whether WishTrail can send you notifications'}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={checkingPermission || saving || devicePermissionGranted === null}
                  checked={inAppEnabled}
                  onChange={(e) => handleMasterToggle(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {devicePermissionGranted === false && (
              <button
                type="button"
                onClick={() => {
                  try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WT_OPEN_APP_NOTIFICATION_SETTINGS' })); } catch (_) { }
                }}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Smartphone className="h-4 w-4" />
                Open App Settings to enable notifications
              </button>
            )}
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Allow important updates via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notif?.email?.enabled !== false}
                onChange={(e) => updateNotifSettings({
                  ...notif,
                  email: { ...(notif.email || {}), enabled: e.target.checked }
                })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {isNativeApp && inAppEnabled && (
          <div className={`border-b border-gray-200 dark:border-gray-700 pb-6 ${!inAppEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Daily Log Reminders</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Remind me daily to write my log</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={!inAppEnabled || checkingPermission || saving}
                  checked={notif?.inApp?.dailyLogReminder !== false}
                  onChange={(e) => updateNotifSettings({
                    ...notif,
                    inApp: { ...(notif.inApp || {}), dailyLogReminder: e.target.checked }
                  })}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!inAppEnabled ? 'cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
          </div>
        )}

        {isNativeApp && inAppEnabled && (
          <div className={`border-b border-gray-200 dark:border-gray-700 pb-6 ${!inAppEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Motivation Reminders</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Get daily motivational reminder at 8 AM</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={!inAppEnabled || checkingPermission || saving}
                  checked={notif?.inApp?.motivationReminder !== false}
                  onChange={(e) => updateNotifSettings({
                    ...notif,
                    inApp: { ...(notif.inApp || {}), motivationReminder: e.target.checked }
                  })}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!inAppEnabled ? 'cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
          </div>
        )}

        {isNativeApp && inAppEnabled && (
          <div className={`${!inAppEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Social Activity</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Notifications for follows, likes, and comments</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={!inAppEnabled || checkingPermission || saving}
                  checked={notif?.inApp?.socialUpdates !== false}
                  onChange={(e) => updateNotifSettings({
                    ...notif,
                    inApp: { ...(notif.inApp || {}), socialUpdates: e.target.checked }
                  })}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!inAppEnabled ? 'cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
          </div>
        )}

        {isNativeApp && inAppEnabled && (
          <div className={`${!inAppEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Habit Reminders</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Reminders to complete your scheduled habits</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  disabled={!inAppEnabled || checkingPermission || saving}
                  checked={notif?.inApp?.habitReminders !== false}
                  onChange={(e) => updateNotifSettings({
                    ...notif,
                    inApp: { ...(notif.inApp || {}), habitReminders: e.target.checked }
                  })}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!inAppEnabled ? 'cursor-not-allowed' : ''}`}></div>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasChanges || saving || checkingPermission}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={saveNotifSettings}
            disabled={!hasChanges || saving || checkingPermission}
            className="px-6 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white dark:text-gray-900 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSection;
