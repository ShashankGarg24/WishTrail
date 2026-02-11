import { useState, useEffect, useRef } from 'react';
import { Bell, Mail, Smartphone, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { settingsAPI } from '../../services/api';

const NotificationsSection = () => {
  const [notif, setNotif] = useState(null);
  const [originalNotif, setOriginalNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openJournalDd, setOpenJournalDd] = useState(false);
  const [openMotivationDd, setOpenMotivationDd] = useState(false);
  const journalDdRef = useRef(null);
  const motivationDdRef = useRef(null);

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (openJournalDd && journalDdRef.current && !journalDdRef.current.contains(e.target)) {
        setOpenJournalDd(false);
      }
      if (openMotivationDd && motivationDdRef.current && !motivationDdRef.current.contains(e.target)) {
        setOpenMotivationDd(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openJournalDd, openMotivationDd]);

  const fetchNotificationSettings = async () => {
    try {
      const response = await settingsAPI.getNotificationSettings();
      const data = response.data.data;
      const settings = data.notificationSettings || {
        inAppEnabled: true,
        habits: { enabled: true },
        journal: { enabled: true, frequency: 'daily' },
        motivation: { enabled: false, frequency: 'off' },
        social: { enabled: true }
      };
      setNotif(settings);
      setOriginalNotif(JSON.parse(JSON.stringify(settings)));
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
      const defaultSettings = {
        inAppEnabled: true,
        habits: { enabled: true },
        journal: { enabled: true, frequency: 'daily' },
        motivation: { enabled: false, frequency: 'off' },
        social: { enabled: true }
      };
      setNotif(defaultSettings);
      setOriginalNotif(JSON.parse(JSON.stringify(defaultSettings)));
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
      await settingsAPI.updateNotificationSettings({
        notificationSettings: notif
      });
      setOriginalNotif(JSON.parse(JSON.stringify(notif)));
      setHasChanges(false);
      setSuccess('Notification preferences saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setError(error.response?.data?.message || 'Failed to save notification settings');
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

  if (loading || !notif) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage how and when you receive updates about your goals, habits, and social activity.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* In-App Notifications Master Toggle */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">In-App Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Master switch for all in-app notifications</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notif.inAppEnabled !== false}
                onChange={(e) => updateNotifSettings({ ...notif, inAppEnabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Habit Reminders */}
        <div className={`border-b border-gray-200 dark:border-gray-700 pb-6 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Habit Reminders</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Get notified to complete your daily habits</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                disabled={!notif.inAppEnabled}
                checked={(notif.habits?.enabled !== false)}
                onChange={(e) => {
                  if (!notif.inAppEnabled) return;
                  updateNotifSettings({
                    ...notif,
                    habits: { ...(notif.habits || {}), enabled: e.target.checked }
                  });
                }}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}></div>
            </label>
          </div>
        </div>

        {/* Journal Reminders */}
        <div className={`border-b border-gray-200 dark:border-gray-700 pb-6 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Journal Reminders</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Remind me to write in my journal</p>
            </div>
            <div ref={journalDdRef} className="relative ml-4">
              <button
                type="button"
                disabled={!notif.inAppEnabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenJournalDd(v => !v);
                  setOpenMotivationDd(false);
                }}
                className={`w-36 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium ${!notif.inAppEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {(notif.journal?.enabled === false || notif.journal?.frequency === 'off')
                  ? 'Off'
                  : (notif.journal?.frequency
                    ? notif.journal.frequency.charAt(0).toUpperCase() + notif.journal.frequency.slice(1)
                    : 'Daily')}
              </button>
              {openJournalDd && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  {['daily', 'weekly', 'off'].map(opt => (
                    <button
                      key={opt}
                      className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => {
                        const next = opt === 'off'
                          ? { ...notif, journal: { ...(notif.journal || {}), enabled: false, frequency: 'off' } }
                          : { ...notif, journal: { enabled: true, frequency: opt } };
                        updateNotifSettings(next);
                        setOpenJournalDd(false);
                      }}
                    >
                      {opt === 'off' ? 'Off' : (opt.charAt(0).toUpperCase() + opt.slice(1))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Motivation */}
        <div className={`border-b border-gray-200 dark:border-gray-700 pb-6 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Motivation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Receive motivational quotes and tips</p>
            </div>
            <div ref={motivationDdRef} className="relative ml-4">
              <button
                type="button"
                disabled={!notif.inAppEnabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMotivationDd(v => !v);
                  setOpenJournalDd(false);
                }}
                className={`w-36 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium ${!notif.inAppEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {(notif.motivation?.enabled === false || notif.motivation?.frequency === 'off')
                  ? 'Off'
                  : (notif.motivation?.frequency
                    ? notif.motivation.frequency.charAt(0).toUpperCase() + notif.motivation.frequency.slice(1)
                    : 'Daily')}
              </button>
              {openMotivationDd && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  {['daily', 'weekly', 'off'].map(opt => (
                    <button
                      key={opt}
                      className="w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => {
                        const next = opt === 'off'
                          ? { ...notif, motivation: { ...(notif.motivation || {}), enabled: false, frequency: 'off' } }
                          : { ...notif, motivation: { enabled: true, frequency: opt } };
                        updateNotifSettings(next);
                        setOpenMotivationDd(false);
                      }}
                    >
                      {opt === 'off' ? 'Off' : (opt.charAt(0).toUpperCase() + opt.slice(1))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Social Activity */}
        <div className={`${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Social Activity</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Notifications for follows, likes, and comments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                disabled={!notif.inAppEnabled}
                checked={(notif.social?.enabled === true)}
                onChange={(e) => {
                  if (!notif.inAppEnabled) return;
                  updateNotifSettings({
                    ...notif,
                    social: { ...(notif.social || {}), enabled: e.target.checked }
                  });
                }}
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}></div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasChanges || saving}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={saveNotifSettings}
            disabled={!hasChanges || saving}
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
