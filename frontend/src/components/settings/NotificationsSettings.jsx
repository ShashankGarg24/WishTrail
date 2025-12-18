import { useState, useEffect, useRef } from "react";
import { settingsAPI } from "../../services/api";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function NotificationsSettings() {
  const [notif, setNotif] = useState(null);
  const [originalNotif, setOriginalNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setError("");
    setSuccess("");
  };

  const saveNotifSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await settingsAPI.updateNotificationSettings({
        notificationSettings: notif
      });
      setOriginalNotif(JSON.parse(JSON.stringify(notif)));
      setHasChanges(false);
      setSuccess('Notification settings saved successfully');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setError(error.response?.data?.message || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !notif) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="rounded-lg">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* In-App notifications */}
          <div className="flex items-center justify-between py-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">In-App notifications</h3>
            <button
              onClick={() => updateNotifSettings({ ...notif, inAppEnabled: !notif.inAppEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${notif.inAppEnabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shrink-0 ${notif.inAppEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Habit reminders */}
          <div className={`flex items-center justify-between py-3 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
            <h3 className="text-sm text-gray-900 dark:text-white">Habit reminders</h3>
            <button
              onClick={() => { if (!notif.inAppEnabled) return; const next = { ...notif, habits: { ...(notif.habits || {}), enabled: !(notif.habits?.enabled !== false) } }; updateNotifSettings(next); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${(notif.habits?.enabled !== false) ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'} ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shrink-0 ${(notif.habits?.enabled !== false) ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Journal reminders */}
          <div className={`flex items-center justify-between py-3 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
            <h3 className="text-sm text-gray-900 dark:text-white">Journal reminders</h3>
            <div ref={journalDdRef} className="relative ml-4">
              <button
                type="button"
                disabled={!notif.inAppEnabled}
                onClick={(e) => { e.stopPropagation(); setOpenJournalDd(v => !v); setOpenMotivationDd(false); }}
                className={`w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}
              >
                {(notif.journal?.enabled === false || notif.journal?.frequency === 'off') ? 'Off' : (notif.journal?.frequency ? notif.journal.frequency.charAt(0).toUpperCase() + notif.journal.frequency.slice(1) : 'Daily')}
              </button>
              {openJournalDd && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  {['daily','weekly','off'].map(opt => (
                    <button
                      key={opt}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        const v = opt;
                        const next = v === 'off'
                          ? { ...notif, journal: { ...(notif.journal || {}), enabled: false, frequency: 'off' } }
                          : { ...notif, journal: { enabled: true, frequency: v } };
                        updateNotifSettings(next);
                        setOpenJournalDd(false);
                      }}
                    >{opt === 'off' ? 'Off' : (opt.charAt(0).toUpperCase() + opt.slice(1))}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Motivation */}
          <div className={`flex items-center justify-between py-3 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
            <h3 className="text-sm text-gray-900 dark:text-white">Motivation</h3>
            <div ref={motivationDdRef} className="relative ml-4">
              <button
                type="button"
                disabled={!notif.inAppEnabled}
                onClick={(e) => { e.stopPropagation(); setOpenMotivationDd(v => !v); setOpenJournalDd(false); }}
                className={`w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}
              >
                {(notif.motivation?.enabled === false || notif.motivation?.frequency === 'off') ? 'Off' : (notif.motivation?.frequency ? notif.motivation.frequency.charAt(0).toUpperCase() + notif.motivation.frequency.slice(1) : 'Daily')}
              </button>
              {openMotivationDd && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  {['daily','weekly','off'].map(opt => (
                    <button
                      key={opt}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        const v = opt;
                        const next = v === 'off'
                          ? { ...notif, motivation: { ...(notif.motivation || {}), enabled: false, frequency: 'off' } }
                          : { ...notif, motivation: { enabled: true, frequency: v } };
                        updateNotifSettings(next);
                        setOpenMotivationDd(false);
                      }}
                    >{opt === 'off' ? 'Off' : (opt.charAt(0).toUpperCase() + opt.slice(1))}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Social activity */}
          <div className={`flex items-center justify-between py-3 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
            <h3 className="text-sm text-gray-900 dark:text-white">Social activity</h3>
            <button
              onClick={() => { if (!notif.inAppEnabled) return; const next = { ...notif, social: { ...(notif.social || {}), enabled: !(notif.social?.enabled === true) } }; updateNotifSettings(next); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${(notif.social?.enabled === true) ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'} ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shrink-0 ${(notif.social?.enabled === true) ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveNotifSettings}
        disabled={!hasChanges || saving}
        className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
      </button>
    </div>
  );
}
