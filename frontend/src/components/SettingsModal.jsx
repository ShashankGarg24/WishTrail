import { useEffect, useState, useRef } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { motion } from 'framer-motion';
import { X, Lock, Eye, EyeOff, Shield, Settings, Bell, UserX, Moon, Sun, Palette, ArrowLeft } from 'lucide-react';
import useApiStore from '../store/apiStore';

const SettingsModal = ({ isOpen, onClose }) => {
  const { user, updateUserPrivacy, updatePassword, logout, notificationSettings, loadNotificationSettings, 
    updateNotificationSettings, listBlockedUsers, unblockUser, toggleTheme,isDarkMode } = useApiStore();
  const [activeTab, setActiveTab] = useState('privacy');
  const [mobileView, setMobileView] = useState('tabs'); // 'tabs' or 'content'
  const [notif, setNotif] = useState(null);
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [openJournalDd, setOpenJournalDd] = useState(false);
  const [openMotivationDd, setOpenMotivationDd] = useState(false);
  const journalDdRef = useRef(null);
  const motivationDdRef = useRef(null);
  const [blockedList, setBlockedList] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(false);

  // Autosave helper for notification settings
  const saveNotifSettings = async (next) => {
    setNotif(next);
    try {
      await updateNotificationSettings(next);
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      (async () => {
        const settings = notificationSettings || (await loadNotificationSettings());
        setNotif(settings || {
          inAppEnabled: true,
          habits: { enabled: true },
          journal: { enabled: true, frequency: 'daily' },
          motivation: { enabled: false, frequency: 'off' },
          social: { enabled: true }
        });
      })();
    }
  }, [isOpen]);

  // Load blocked users when switching to the tab
  useEffect(() => {
    const loadBlocked = async () => {
      try {
        setBlockedLoading(true);
        const res = await listBlockedUsers();
        if (res?.success) setBlockedList(res.users || []);
      } catch (_) {
        setBlockedList([]);
      } finally { setBlockedLoading(false); }
    };
    if (isOpen && activeTab === 'blocked') loadBlocked();
  }, [isOpen, activeTab, listBlockedUsers]);

  // Close dropdowns on outside click
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

  const handlePrivacyToggle = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateUserPrivacy(!isPrivate);
      if (result.success) {
        setIsPrivate(!isPrivate);
        setSuccess('Privacy settings updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update privacy settings');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Failed to update privacy settings');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const result = await updatePassword({
        currentPassword,
        newPassword
      });

      if (result.success) {
        setSuccess(result.message || 'Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
            onClose();

            setTimeout(() => {
            logout(); // Clear token, redirect, etc.
            });
        }, 2000);

      } else {
        setError(result.error || 'Failed to update password');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Failed to update password');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Tab configuration for easy extension
  const tabs = [
    {
      id: 'privacy',
      label: 'Privacy',
      icon: Shield,
      component: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Privacy</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isPrivate
                  ? 'Your profile is private. Only followers can see your activities and goals.'
                  : 'Your profile is public. Anyone can see your activities and goals.'}
              </p>
            </div>
            <button
              onClick={handlePrivacyToggle}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                isPrivate ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Privacy Settings</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• {isPrivate ? 'Private' : 'Public'} profile visibility</li>
              <li>• {isPrivate ? 'Only followers' : 'Everyone'} can see your activities</li>
              <li>• {isPrivate ? 'Only followers' : 'Everyone'} can see your goals</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'theme',
      label: 'Theme',
      icon: Palette,
      component: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {'You are currently using the '}
                {isDarkMode ? 'dark' : 'light'}
                {' theme. Toggle to switch between them.'}
              </p>
            </div>
            {/* Theme Toggle */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 dark:hover:bg-white/10 border border-white/20 dark:border-white/10 transition-all duration-300 group"
              >
              <div className="relative w-5 h-5">
                <Sun className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 ${
                  isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                }`} />
                <Moon className={`absolute inset-0 h-5 w-5 text-blue-400 transition-all duration-300 ${
                  isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                }`} />
              </div>
                
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </div>
        </div>
      )
    },
    {
      id: 'blocked',
      label: 'Blocked',
      icon: UserX,
      component: (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Blocked users</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Users you’ve blocked won’t be able to follow or interact with you. Unblock them here if you change your mind.</p>
          {blockedLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : (blockedList.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">You haven’t blocked anyone.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
              {blockedList.map((u) => (
                <div key={u._id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={u.avatar || '/api/placeholder/40/40'} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name || 'User'}</div>
                      {u.username && <div className="text-xs text-gray-500 truncate">@{u.username}</div>}
                    </div>
                  </div>
                  <button
                    onClick={async () => { await unblockUser(u._id); setBlockedList(prev => prev.filter(x => x._id !== u._id)); }}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs"
                  >Unblock</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      component: (
        <div className="space-y-6">
          {!notif ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : (
            <>
              {/* Compact stacked list */}
              <div className="rounded-lg">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Master */}
                  <div className="flex items-center justify-between py-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">In-App notifications</h3>
                    <button
                      onClick={() => saveNotifSettings({ ...notif, inAppEnabled: !notif.inAppEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${notif.inAppEnabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shrink-0 ${notif.inAppEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Habit reminders */}
                  <div className={`flex items-center justify-between py-3 ${!notif.inAppEnabled ? 'opacity-50' : ''}`}>
                    <h3 className="text-sm text-gray-900 dark:text-white">Habit reminders</h3>
                    <button
                      onClick={() => { if (!notif.inAppEnabled) return; const next = { ...notif, habits: { ...(notif.habits || {}), enabled: !(notif.habits?.enabled !== false) } }; saveNotifSettings(next); }}
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
                        {(notif.journal?.enabled === false || notif.journal?.frequency === 'off') ? 'Off' : (notif.journal?.frequency || 'daily')}
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
                                saveNotifSettings(next);
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
                        {(notif.motivation?.enabled === false || notif.motivation?.frequency === 'off') ? 'Off' : (notif.motivation?.frequency || 'off')}
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
                                saveNotifSettings(next);
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
                      onClick={() => { if (!notif.inAppEnabled) return; const next = { ...notif, social: { ...(notif.social || {}), enabled: !(notif.social?.enabled === true) } }; saveNotifSettings(next); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${(notif.social?.enabled === true) ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'} ${!notif.inAppEnabled ? 'cursor-not-allowed' : ''}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shrink-0 ${(notif.social?.enabled === true) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Autosave on change: no explicit save button */}
            </>
          )}
        </div>
      )
    },
    {
      id: 'password',
      label: 'Password',
      icon: Lock,
      component: (
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Enter your new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Confirm your new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Password Requirements</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Must contain letters and numbers</li>
              <li>• Different from your current password</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )
    }
    // Future tabs can be easily added here
  ];

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Reset mobile view to tabs when modal opens (only on mobile)
      if (window.innerWidth < 768) {
        setMobileView('tabs');
      }
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl h-[700px] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {/* Mobile back button - only show when in content view */}
            {mobileView === 'content' && (
              <button
                onClick={() => setMobileView('tabs')}
                className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <Settings className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Desktop */}
          <div className="hidden md:flex w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-col flex-shrink-0">
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Mobile Tabs View */}
          {mobileView === 'tabs' && (
            <div className="md:hidden flex-1 overflow-y-auto">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileView('content')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          )}

          {/* Right Content Area - Desktop always shows, Mobile shows when content view */}
          <div className={`flex-1 overflow-y-auto ${mobileView === 'tabs' ? 'hidden' : 'flex'} md:flex md:w-full`}>
            <div className="p-6 w-full">
              {/* Error/Success Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <X className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
              
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span>{success}</span>
                  </div>
                </motion.div>
              )}

              {/* Tab Content */}
              <div className="space-y-6">
                {tabs.find(tab => tab.id === activeTab)?.component}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;