import { useState, useEffect, useRef, useCallback } from 'react';
import { Crown, Lock, Download, AlertTriangle, ExternalLink, UserX, AlertCircle, CheckCircle, Loader2, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import useApiStore from '../../store/apiStore';
import { settingsAPI, usersAPI } from '../../services/api';

const AccountSection = () => {
  const { user, isDarkMode, setThemeMode, syncThemeFromServer, logout } = useApiStore();
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [blockedPage, setBlockedPage] = useState(1);
  const [hasMoreBlocked, setHasMoreBlocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [loadingMoreBlocked, setLoadingMoreBlocked] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState('request');
  const [deletionOtp, setDeletionOtp] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isSendingDeletionCode, setIsSendingDeletionCode] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const blockedListRef = useRef(null);
  const observerTarget = useRef(null);

  useEffect(() => {
    fetchPrivacySettings();
    syncThemeFromServer();
    fetchBlockedUsers(1);
  }, [syncThemeFromServer]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!observerTarget.current || blockedLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreBlocked && !loadingMoreBlocked) {
          fetchBlockedUsers(blockedPage + 1);
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMoreBlocked, loadingMoreBlocked, blockedPage, blockedLoading]);

  const fetchPrivacySettings = async () => {
    try {
      const response = await settingsAPI.getPrivacySettings();
      setPrivateAccount(response.data.data.isPrivate);
      setShowHabits(response.data.data.showHabits ?? false);
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
      setError('Failed to load privacy settings');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchBlockedUsers = async (page = 1) => {
    if (page === 1) {
      setBlockedLoading(true);
    } else {
      setLoadingMoreBlocked(true);
    }
    
    try {
      const response = await settingsAPI.getBlockedUsers({ page, limit: 10 });
      const newUsers = response.data.data.users || [];
      
      if (page === 1) {
        setBlocked(newUsers);
      } else {
        setBlocked(prev => [...prev, ...newUsers]);
      }
      
      setBlockedPage(page);
      setHasMoreBlocked(newUsers.length === 10); // If we got full page, there might be more
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
      if (page === 1) {
        setBlocked([]);
      }
    } finally {
      setBlockedLoading(false);
      setLoadingMoreBlocked(false);
    }
  };

  const handlePrivacyToggle = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await settingsAPI.updatePrivacySettings({ isPrivate: !privateAccount });
      setPrivateAccount((prev) => !prev);
      setSuccess('Privacy settings updated successfully');
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      setError(error.response?.data?.message || 'Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleHabitsPrivacyToggle = async () => {
    setHabitsLoading(true);
    setError("");
    setSuccess("");
    try {
      await settingsAPI.updatePrivacySettings({ showHabits: !showHabits });
      setShowHabits((prev) => !prev);
      setSuccess('Habits privacy updated successfully');
    } catch (error) {
      console.error('Failed to update habits privacy settings:', error);
      setError(error.response?.data?.message || 'Failed to update habits privacy settings');
    } finally {
      setHabitsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setError("");
    setSuccess("");
    try {
      await settingsAPI.updateThemeSettings({ theme: newTheme });
      setThemeMode(newTheme === 'dark');
      setSuccess(`Theme changed to ${newTheme} mode`);
    } catch (error) {
      console.error('Failed to update theme:', error);
      setError(error.response?.data?.message || 'Failed to update theme');
    }
  };

  const unblockUser = async (username) => {
    setError("");
    setSuccess("");
    try {
      await settingsAPI.unblockUser(username);
      setBlocked(blocked.filter((u) => u.username !== username));
      setSuccess('User unblocked successfully');
      
      // If we're running low on items and there might be more, load next page
      if (blocked.length <= 5 && hasMoreBlocked) {
        fetchBlockedUsers(blockedPage + 1);
      }
    } catch (error) {
      console.error('Failed to unblock user:', error);
      setError(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  // const handleManageBilling = () => {
  //   // TODO: Implement billing portal redirect
  //   console.log('Navigate to billing portal');
  // };

  // const handleRequestExport = () => {
  //   // TODO: Implement data export
  //   console.log('Request data export');
  // };

  // const handleDeactivateAccount = () => {
  //   // TODO: Implement account deactivation
  //   console.log('Deactivate account');
  // };

  const closeDeleteDialog = () => {
    if (isDeletingAccount) return;
    setIsDeleteDialogOpen(false);
    setDeleteStep('request');
    setDeletionOtp('');
    setDeleteError('');
  };

  const handleRequestDeletionCode = async () => {
    try {
      setIsSendingDeletionCode(true);
      setDeleteError('');
      await usersAPI.requestAccountDeletionOTP();
      setDeleteStep('verify');
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'We could not send a verification code. Please try again.');
    } finally {
      setIsSendingDeletionCode(false);
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(deletionOtp)) {
      setDeleteError('Enter the 6-digit code from your email.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeleteError('');
      await usersAPI.deleteAccount({ otp: deletionOtp });
      setDeleteStep('complete');
      window.setTimeout(async () => {
        await logout();
        window.location.replace('/');
      }, 2500);
    } catch (error) {
      setDeleteError(error.response?.data?.message || 'We could not delete your account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  // Mock subscription data - replace with actual data from API
  const subscriptionPlan = {
    name: 'Professional Monthly',
    nextBilling: 'Oct 24, 2026',
    isPremium: true
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your privacy, blocked users, and account preferences.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <p className="text-xs sm:text-sm">{success}</p>
        </div>
      )}

      {initialLoading ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c99e6] mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subscription Plan - Commented Out */}
          {/* <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Subscription Plan</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your current subscription and billing cycles.</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                WISHTRAIL PRO
              </span>
            </div>

            <div className="ml-11 space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {subscriptionPlan.name}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Next billing date: {subscriptionPlan.nextBilling}
                </p>
              </div>

              <button
                onClick={handleManageBilling}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Manage Billing
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div> */}

          {/* Privacy & Data */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Privacy Settings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Control who can see your profile and content.</p>
              </div>
            </div>

            <div className="ml-0 sm:ml-11 space-y-4">
              {/* Private Account */}
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Private Account</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {privateAccount
                      ? "Your profile is private."
                      : "Your profile is public."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privateAccount}
                    disabled={loading}
                    onChange={handlePrivacyToggle}
                  />
                  <div className={`w-10 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              {/* Habits Privacy */}
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Show Habits on Profile</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {showHabits
                      ? "Your habits are visible."
                      : "Your habits are private."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showHabits}
                    disabled={habitsLoading}
                    onChange={handleHabitsPrivacyToggle}
                  />
                  <div className={`w-10 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${habitsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              {/* Privacy Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-xs sm:text-sm">Current Privacy Settings</h4>
                <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-0.5 sm:space-y-1">
                  <li>• {privateAccount ? "Private" : "Public"} profile visibility</li>
                  <li>• {privateAccount ? "Only followers" : "Everyone"} can see your activities</li>
                  <li>• {privateAccount ? "Only followers" : "Everyone"} can see your goals</li>
                  <li>• {showHabits ? (privateAccount ? "Only followers" : "Everyone") : "Only you"} can see your habits</li>
                </ul>
              </div>

              {/* Data Export - Commented Out */}
              {/* <div>
                <p className="font-medium text-gray-900 dark:text-white mb-2">Data Export</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Download a complete archive of your data, including goals, milestones, and habit history.
                </p>
                <button
                  onClick={handleRequestExport}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Request Export
                </button>
              </div> */}
            </div>
          </div>

          {/* Appearance */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Appearance</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Customize how WishTrail looks for you.</p>
              </div>
            </div>

            <div className="ml-0 sm:ml-11">
              {/* Theme Toggle */}
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    You are currently using the {isDarkMode ? 'dark' : 'light'} theme.
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTheme}
                  className="relative p-2 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 dark:hover:bg-white/10 border border-gray-300 dark:border-gray-600 transition-all duration-300 group flex-shrink-0"
                >
                  <div className="relative w-4 h-4 sm:w-5 sm:h-5">
                    <Sun className={`absolute inset-0 h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 transition-all duration-300 ${
                      isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                    }`} />
                    <Moon className={`absolute inset-0 h-4 w-4 sm:h-5 sm:w-5 text-blue-400 transition-all duration-300 ${
                      isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                    }`} />
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-yellow-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Blocked Users */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Blocked Users</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Manage users you have blocked.</p>
              </div>
            </div>

            <div className="ml-0 sm:ml-11">
              {blockedLoading ? (
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Loading blocked users...</div>
              ) : blocked.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No blocked users.</p>
              ) : (
                <div 
                  ref={blockedListRef}
                  className="max-h-80 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 space-y-1.5 sm:space-y-2 scrollbar-thin"
                >
                  {blocked.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 sm:p-3 rounded-lg gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <img 
                          src={user.avatar || '/api/placeholder/40/40'} 
                          alt={user.name} 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(user.username)}
                        className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex-shrink-0 px-2 py-1"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                  
                  {/* Intersection Observer Target */}
                  {hasMoreBlocked && (
                    <div ref={observerTarget} className="py-3 sm:py-4 text-center">
                      {loadingMoreBlocked && (
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          <span>Loading more...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg bg-red-100 dark:bg-red-900/20"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" /></div>
              <h3 className="text-sm sm:text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
            </div>
            <div className="ml-0 sm:ml-11 rounded-lg border-2 border-red-200 p-3 sm:p-4 dark:border-red-900/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Delete account</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Permanently erase your profile, goals, habits, logs, activity, comments, sessions, and related data. This cannot be undone.</p>
                </div>
                <button type="button" onClick={() => setIsDeleteDialogOpen(true)} className="shrink-0 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30">Delete account</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl dark:border-red-900/50 dark:bg-gray-900 sm:p-6"
          >
            {deleteStep === 'complete' ? <>
              <div className="mb-4 flex justify-center"><div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-950/40"><CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" /></div></div>
              <h3 id="delete-account-title" className="text-center text-lg font-bold text-gray-900 dark:text-white">Your account has been deleted</h3>
              <p className="mt-2 text-center text-sm leading-6 text-gray-600 dark:text-gray-400">Your WishTrail profile and associated app data have been permanently removed. Taking you back to the home page…</p>
              <button type="button" onClick={async () => { await logout(); window.location.replace('/'); }} className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Return to home</button>
            </> : <>
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-xl bg-red-100 p-2.5 dark:bg-red-950/50"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
              <div><h3 id="delete-account-title" className="text-lg font-bold text-gray-900 dark:text-white">Permanently delete account?</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">This action is immediate and cannot be reversed.</p></div>
            </div>
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">We will erase your profile, goals, habits, logs, public activity, comments, preferences, notifications, device sessions, and related media.</div>
            {deleteError && <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{deleteError}</p>}
            {deleteStep === 'request' && <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-gray-400">For your security, we will email a one-time verification code to your account address. The code is the final confirmation to delete your account.</p>}
            {deleteStep === 'verify' && <>
            <label className="mb-3 block text-sm font-medium text-gray-800 dark:text-gray-200">Verification code
              <input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={deletionOtp} onChange={(event) => setDeletionOtp(event.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" disabled={isDeletingAccount} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </label>
            <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">Use the 6-digit code sent to your account email. It expires in 10 minutes and can only be used once.</p>
            <button type="button" onClick={handleRequestDeletionCode} disabled={isSendingDeletionCode || isDeletingAccount} className="mt-2 text-xs font-semibold text-red-700 hover:text-red-800 disabled:opacity-50 dark:text-red-300">{isSendingDeletionCode ? 'Sending a new code…' : 'Send a new code'}</button>
            </>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={closeDeleteDialog} disabled={isDeletingAccount} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Cancel</button>
              {deleteStep === 'request' ? (
                <button type="button" onClick={handleRequestDeletionCode} disabled={isSendingDeletionCode} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isSendingDeletionCode ? 'Sending…' : 'Send verification code'}</button>
              ) : (
                <button type="button" onClick={handleDeleteAccount} disabled={isDeletingAccount || deletionOtp.length !== 6} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isDeletingAccount ? 'Deleting…' : 'Delete forever'}</button>
              )}
            </div>
            </>}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AccountSection;
