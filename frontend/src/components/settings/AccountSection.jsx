import { useState, useEffect, useRef, useCallback } from 'react';
import { Crown, Lock, Download, AlertTriangle, ExternalLink, UserX, AlertCircle, CheckCircle, Loader2, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import useApiStore from '../../store/apiStore';
import { settingsAPI } from '../../services/api';

const AccountSection = () => {
  const { user } = useApiStore();
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
  const blockedListRef = useRef(null);
  const observerTarget = useRef(null);

  useEffect(() => {
    fetchPrivacySettings();
    fetchThemeSettings();
    fetchBlockedUsers(1);
  }, []);

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

  const fetchThemeSettings = async () => {
    try {
      const response = await settingsAPI.getThemeSettings();
      const theme = response.data.data.theme;
      setIsDarkMode(theme === 'dark');
    } catch (error) {
      console.error('Failed to fetch theme settings:', error);
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
      setIsDarkMode(!isDarkMode);
      // Apply theme change immediately
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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

  const handleManageBilling = () => {
    // TODO: Implement billing portal redirect
    console.log('Navigate to billing portal');
  };

  const handleRequestExport = () => {
    // TODO: Implement data export
    console.log('Request data export');
  };

  const handleDeactivateAccount = () => {
    // TODO: Implement account deactivation
    console.log('Deactivate account');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log('Delete account');
  };

  // Mock subscription data - replace with actual data from API
  const subscriptionPlan = {
    name: 'Professional Monthly',
    nextBilling: 'Oct 24, 2026',
    isPremium: true
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your privacy, blocked users, and account preferences.
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

      {initialLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
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

            <div className="ml-11 space-y-4">
              {/* Private Account */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Private Account</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {privateAccount
                      ? "Your profile is private. Only followers can see your activities and goals."
                      : "Your profile is public. Anyone can see your activities and goals."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={privateAccount}
                    disabled={loading}
                    onChange={handlePrivacyToggle}
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              {/* Habits Privacy */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Show Habits on Profile</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {showHabits
                      ? "Your habits are visible. They follow your profile privacy settings."
                      : "Your habits are private. Only you can see them on your profile."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showHabits}
                    disabled={habitsLoading}
                    onChange={handleHabitsPrivacyToggle}
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${habitsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              {/* Privacy Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Current Privacy Settings</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customize how WishTrail looks for you.</p>
              </div>
            </div>

            <div className="ml-11">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You are currently using the {isDarkMode ? 'dark' : 'light'} theme.
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTheme}
                  className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 dark:hover:bg-white/10 border border-gray-300 dark:border-gray-600 transition-all duration-300 group"
                >
                  <div className="relative w-5 h-5">
                    <Sun className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 ${
                      isDarkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                    }`} />
                    <Moon className={`absolute inset-0 h-5 w-5 text-purple-400 transition-all duration-300 ${
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
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <UserX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Blocked Users</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage users you have blocked.</p>
              </div>
            </div>

            <div className="ml-11">
              {blockedLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading blocked users...</div>
              ) : blocked.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No blocked users.</p>
              ) : (
                <div 
                  ref={blockedListRef}
                  className="max-h-96 overflow-y-auto pr-2 space-y-2"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {blocked.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar || '/api/placeholder/40/40'} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full object-cover" 
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(user.username)}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                  
                  {/* Intersection Observer Target */}
                  {hasMoreBlocked && (
                    <div ref={observerTarget} className="py-4 text-center">
                      {loadingMoreBlocked && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading more...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h3>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div className="p-4 border-2 border-red-200 dark:border-red-900/30 rounded-lg">
                <div className="mb-3">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">ACCOUNT TERMINATION</p>
                </div>
                
                {/* Deactivate Account */}
                <div className="mb-4 pb-4 border-b border-red-200 dark:border-red-900/30">
                  <button
                    onClick={handleDeactivateAccount}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm"
                  >
                    Deactivate Account
                  </button>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Temporarily disable your account. You can reactivate anytime.
                  </p>
                </div>

                {/* Delete Account */}
                <div>
                  <button
                    onClick={handleDeleteAccount}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm"
                  >
                    Delete Account
                  </button>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Permanently remove your account and all associated data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSection;
