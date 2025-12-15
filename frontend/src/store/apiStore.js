import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  authAPI,
  goalsAPI,
  usersAPI,
  socialAPI,
  activitiesAPI,
  leaderboardAPI,
  handleApiError,
  setAuthToken,
  locationAPI,
  moderationAPI,
  notificationsAPI,
  journalsAPI,
  habitsAPI,
  featuresAPI
} from '../services/api';

const useApiStore = create(
  persist(
    (set, get) => ({
      // Theme state
      isDarkMode: false,
      toggleTheme: () => set(state => ({ isDarkMode: !state.isDarkMode })),

      // Loading states
      loading: false,
      error: null,

      // User state
      user: null,
      isAuthenticated: false,
      token: null,

      // Dashboard stats
      dashboardStats: null,

      // Goals
      goals: [],
      goalsPagination: null,
      communityGoalsByYear: {},

      // Users
      users: [],
      usersPagination: null,

      // Social
      followedUsers: [],
      followers: [],
      following: [],
      blockedUsers: [],
      followRequests: [],

      // Activities
      activityFeed: [],
      recentActivities: [],

      // Notifications
      notifications: [],
      notificationsPagination: null,
      unreadNotifications: 0,
      notificationSettings: null,

      // Journaling
      journalPrompt: null,
      journalEntries: [],
      journalHighlights: [],

      // Client-side caches (TTL + persisted)
      cacheActivityFeed: {}, // key -> { data, ts }
      cacheUsers: {},        // key -> { data, ts }
      cacheNotifications: {},// key -> { data, ts }
      cacheGoals: {},        // key -> { data, ts }
      cacheGoalPosts: {},    // key -> { data, ts } (goal:<id> or activity:<id>)
      cacheDashboardStats: null, // { data, ts }
      // Habits cache
      habits: [],
      habitsPagination: null,
      cacheHabitsTs: 0,
      habitAnalytics: null,
      cacheHabitAnalyticsTs: 0,
      habitStats: null,
      cacheHabitStatsTs: 0,
      // UI state
      settingsModalOpen: false,
      // Feature flags (web)
      features: null,
      // Dashboard years (client cache)
      dashboardYears: [],
      cacheTTLs: {
        activityFeed: 15 * 60 * 1000,   // 15 minutes
        users: 30 * 60 * 1000,          // 30 minutes
        notifications: 5 * 60 * 1000,   // 5 minutes
        goals: Number.POSITIVE_INFINITY, // cache until explicitly invalidated
        dashboardStats: Number.POSITIVE_INFINITY,
        habits: 2 * 60 * 1000,          // 2 minutes
        habitAnalytics: 5 * 60 * 1000,  // 5 minutes
        goalPosts: 2 * 60 * 1000        // 2 minutes (goal post detail)
      },
      maxCacheEntries: {
        activityFeed: 8,
        users: 8,
        notifications: 5,
        goals: 8,
        goalPosts: 24
      },
      openSettingsModal: () => set({ settingsModalOpen: true }),
      closeSettingsModal: () => set({ settingsModalOpen: false }),

      _cacheKeyFromParams: (params = {}) => {
        const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null);
        entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return entries.map(([k, v]) => `${k}=${String(v)}`).join('&') || 'default';
      },

      _isFresh: (ts, ttl) => (typeof ts === 'number' && Date.now() - ts < ttl),

      _setCacheWithLimit: (bucketName, key, payload) => {
        const current = get()[bucketName] || {};
        const bucket = { ...current, [key]: { data: payload, ts: Date.now() } };
        const which = bucketName === 'cacheActivityFeed'
          ? 'activityFeed'
          : bucketName === 'cacheUsers'
            ? 'users'
            : bucketName === 'cacheGoals'
              ? 'goals'
              : bucketName === 'cacheGoalPosts'
                ? 'goalPosts'
                : 'notifications';
        const limit = get().maxCacheEntries[which];
        const keys = Object.keys(bucket);
        if (keys.length > limit) {
          keys
            .map(k => [k, bucket[k]?.ts || 0])
            .sort((a, b) => a[1] - b[1])
            .slice(0, Math.max(0, keys.length - limit))
            .forEach(([k]) => { delete bucket[k]; });
        }
        set({ [bucketName]: bucket });
      },

      invalidateGoalPostCache: ({ goalId, activityId } = {}) => {
        try {
          const prev = get().cacheGoalPosts || {};
          const next = { ...prev };
          if (goalId !== undefined && goalId !== null) delete next[`goal:${String(goalId)}`];
          if (activityId !== undefined && activityId !== null) delete next[`activity:${String(activityId)}`];
          set({ cacheGoalPosts: next });
        } catch { }
      },

      invalidateGoalPostByGoal: (id) => { try { get().invalidateGoalPostCache({ goalId: id }); } catch { } },
      invalidateGoalPostByActivity: (id) => { try { get().invalidateGoalPostCache({ activityId: id }); } catch { } },

      // Leaderboard
      leaderboard: [],

      // Explore removed; keep interestsCatalog used by Discover
      goalsSearchResults: [],
      interestsCatalog: [],
      // Cached trending goals for stories bar (per params key)
      cacheTrendingGoals: {},

      // =====================
      // AUTH ACTIONS
      // =====================

      signup: async (userData) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.signup(userData);
          const { user, token } = response.data.data;

          setAuthToken(token);
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false
          });

          return { success: true, user, token };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      register: async (profileData) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.register(profileData);
          const { user, token } = response.data.data;

          setAuthToken(token);
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false
          });

          return { success: true, user, token };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      login: async (email, password) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.login({ email, password });
          const { user, token } = response.data.data;

          setAuthToken(token);
          set({
            user,
            token,
            isAuthenticated: true,
            loading: false
          });

          return { success: true, user, token };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          throw error;
        }
      },

      // =====================
      // PASSWORD RESET ACTIONS
      // =====================

      forgotPassword: async (email) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.forgotPassword(email);
          const result = response.data.data;
          set({ loading: false });
          return { success: true, data: result };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      resetPassword: async (token, newPassword) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.resetPassword(token, newPassword);
          const result = response.data.data;
          set({ loading: false });
          return { success: true, data: result };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // =====================
      // MULTI-STEP SIGNUP ACTIONS
      // =====================

      checkExistingUser: async (data) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.checkExistingUser(data);
          const result = response.data.data;
          set({ loading: false });
          return { success: true, data: result };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      requestOTP: async (userData) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.requestOTP(userData);
          const result = response.data.data;
          set({ loading: false });
          return { success: true, data: result };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      verifyOTP: async (otpData) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.verifyOTP(otpData);
          const result = response.data.data;
          set({ loading: false });
          return { success: true, data: result };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      resendOTP: async (data) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.resendOTP(data);
          const result = response.data.data;
          set({ loading: false });
          return { success: true, data: result };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
          setAuthToken(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            goals: [],
            dashboardStats: null,
            activityFeed: [],
            recentActivities: [],
            followedUsers: [],
            followers: [],
            following: []
          });
          return { success: true };
        } catch (error) {
          // Even if logout fails, clear local state
          setAuthToken(null);
          set({
            user: null,
            token: null,
            isAuthenticated: false
          });
          return { success: true };
        }
      },

      getMe: async () => {
        try {
          const response = await authAPI.getMe();
          const { user } = response.data.data;
          set({ user, isAuthenticated: true });
          return { success: true, user };
        } catch (error) {
          // Do not hard-logout on transient 401 from /me; allow refresh flow to handle
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      // =====================
      // PASSWORD RESET ACTIONS
      // =====================

      updateProfile: async (userData) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.updateProfile(userData);
          const { user } = response.data.data;
          set({ user, loading: false });
          return { success: true, user };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      addDashboardYear: async (year) => {
        try {
          const res = await usersAPI.addDashboardYear(year);
          const years = res?.data?.data?.years || [];
          set({ dashboardYears: years });
          return { success: true, years };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      updateProfile: async (userData) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.updateProfile(userData);
          const { user } = response.data.data;
          set({ user, loading: false });
          return { success: true, user };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },


      // Update user privacy setting
      updateUserPrivacy: async (isPrivate) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.updatePrivacy({ isPrivate });

          if (response.data.success) {
            set((state) => ({
              user: {
                ...state.user,
                isPrivate: isPrivate
              },
              loading: false
            }));
            return { success: true };
          }

          throw new Error(response.data.message || 'Failed to update privacy settings');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Update user password
      updatePassword: async ({ currentPassword, newPassword }) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.updatePassword({
            currentPassword,
            newPassword
          });

          if (response.data.success) {
            set({ loading: false });
            return {
              message: response.data.message,
              success: true
            };
          }

          throw new Error(response.data.message || 'Failed to update password');
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      locationSuggestions: [],
      searchCitySuggestions: async (query) => {
        if (!query || query.trim().length < 2) {
          set({ locationSuggestions: [] });
          return;
        }

        try {
          const results = await locationAPI.getCitySuggestions(query);
          set({ locationSuggestions: results.data });
        } catch (err) {
          console.error('Failed to fetch location suggestions', err);
          set({ locationSuggestions: [] });
        }
      },

      // =====================
      // DASHBOARD ACTIONS
      // =====================

      getDashboardStats: async (opts = {}) => {
        try {
          const force = !!opts.force;
          // Cached
          const ttl = get().cacheTTLs.dashboardStats;
          const cached = get().cacheDashboardStats;
          if (!force && cached && get()._isFresh(cached.ts, ttl)) {
            const stats = cached.data;
            set({ dashboardStats: stats });
            return { success: true, stats };
          }
          set({ loading: true, error: null });
          const response = await usersAPI.getDashboardStats();
          const { stats } = response.data.data;
          set({ dashboardStats: stats, loading: false });
          set({ cacheDashboardStats: { data: stats, ts: Date.now() } });
          return { success: true, stats };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // =====================
      // HABITS ACTIONS
      // =====================
      loadHabits: async (opts = {}) => {
        try {
          set({ loading: true, error: null });
          const force = !!opts.force;
          const page = opts.page || 1;
          const limit = opts.limit || 50;
          const includeArchived = opts.includeArchived || false;
          
          const ts = get().cacheHabitsTs || 0;
          const ttl = get().cacheTTLs.habits;
          if (!force && ts && Date.now() - ts < ttl && Array.isArray(get().habits) && get().habits.length > 0 && page === 1) {
            set({ loading: false });
            return { success: true, habits: get().habits, pagination: get().habitsPagination };
          }
          
          const res = await habitsAPI.list({ page, limit, includeArchived });
          const habits = res?.data?.data?.habits || [];
          const pagination = res?.data?.data?.pagination || null;
          set({ habits, habitsPagination: pagination, cacheHabitsTs: Date.now(), loading: false });
          return { success: true, habits, pagination };
        } catch (error) {
          set({ loading: false, error: handleApiError(error) });
          return { success: false, error: handleApiError(error) };
        }
      },

      appendHabit: (habit) => {
        if (!habit) return;
        set(state => ({ habits: [habit, ...(state.habits || [])], cacheHabitsTs: Date.now() }));
      },

      logHabit: async (id, status) => {
        try {
          await habitsAPI.log(id, { status });
          set(state => ({
            habits: (state.habits || []).map(h => {
              if (h._id !== id) return h;
              if (status === 'done') {
                const nextStreak = (h.currentStreak || 0) + 1;
                const longest = Math.max(h.longestStreak || 0, nextStreak);
                return { ...h, currentStreak: nextStreak, longestStreak: longest, totalCompletions: (h.totalCompletions || 0) + 1 };
              }
              return { ...h, currentStreak: 0 };
            })
          }));
          return { success: true };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      updateHabit: async (id, payload) => {
        try {
          const res = await habitsAPI.update(id, payload);
          const updated = res?.data?.data || res?.data;
          if (updated) {
            set(state => ({ habits: (state.habits || []).map(h => h._id === id ? { ...h, ...updated } : h) }));
          }
          return { success: true, habit: updated };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      deleteHabit: async (id) => {
        try {
          await habitsAPI.remove(id);
          set(state => ({ habits: (state.habits || []).filter(h => h._id !== id) }));
          return { success: true };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      loadHabitAnalytics: async (opts = {}) => {
        try {
          const force = !!opts.force;
          const ts = get().cacheHabitAnalyticsTs || 0;
          const ttl = get().cacheTTLs.habitAnalytics;
          if (!force && ts && Date.now() - ts < ttl && get().habitAnalytics) {
            return { success: true, data: get().habitAnalytics };
          }
          const res = await habitsAPI.analytics({ days: 30 });
          const data = res?.data?.data || null;
          set({ habitAnalytics: data, cacheHabitAnalyticsTs: Date.now() });
          return { success: true, data };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      loadHabitStats: async (opts = {}) => {
        try {
          const force = !!opts.force;
          const ts = get().cacheHabitStatsTs || 0;
          const ttl = get().cacheTTLs.habitAnalytics; // reuse TTL
          if (!force && ts && Date.now() - ts < ttl && get().habitStats) {
            return { success: true, data: get().habitStats };
          }
          const res = await habitsAPI.stats();
          const data = res?.data?.data?.stats || res?.data?.data || null;
          set({ habitStats: data, cacheHabitStatsTs: Date.now() });
          return { success: true, data };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      // =====================
      // GOALS ACTIONS
      // =====================

      getGoals: async (params = {}, opts = {}) => {
        try {
          const force = !!opts.force;
          const key = get()._cacheKeyFromParams(params);
          const ttl = get().cacheTTLs.goals;
          const cachedEntry = get().cacheGoals[key];
          if (!force && cachedEntry && get()._isFresh(cachedEntry.ts, ttl)) {
            const { goals, pagination } = cachedEntry.data;
            set({ goals, goalsPagination: pagination });
            return { success: true, goals, pagination };
          }
          set({ loading: true, error: null });
          const response = await goalsAPI.getGoals(params);
          const { goals, pagination } = response.data.data;
          set({ goals, goalsPagination: pagination, loading: false });
          get()._setCacheWithLimit('cacheGoals', key, { goals, pagination });
          return { success: true, goals, pagination };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Fetch community goals separately, unpaged for current year, then cache by year
      loadCommunityGoalsForYear: async (year, opts = {}) => {
        try {
          if (!year) return { success: true, goals: [] };
          const force = !!opts.force;
          const bucket = get().communityGoalsByYear || {};
          const entry = bucket[String(year)];
          const fresh = entry && Array.isArray(entry.goals) && entry.ts && (Date.now() - entry.ts < get().cacheTTLs.goals);
          if (!force && fresh) {
            return { success: true, goals: entry.goals };
          }
          // Pull large page to approximate all
          const res = await goalsAPI.getGoals({ year, communityOnly: true, page: 1, limit: 1000 });
          const goals = res?.data?.data?.goals || [];
          const next = { ...(get().communityGoalsByYear || {}), [String(year)]: { goals, ts: Date.now() } };
          set({ communityGoalsByYear: next });
          return { success: true, goals };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      // Goal Division actions
      getGoalProgress: async (goalId) => {
        try {
          const res = await goalsAPI.getProgress(goalId);
          const data = res?.data?.data || { percent: 0 };
          // Update goal object in state with progress if present
          set(state => ({ goals: (state.goals || []).map(g => g._id === goalId ? { ...g, progress: data } : g) }));
          return { success: true, progress: data };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      setSubGoals: async (goalId, subGoals) => {
        try {
          const res = await goalsAPI.setSubGoals(goalId, subGoals);
          const goal = res?.data?.data?.goal;
          if (goal) set(state => ({ goals: (state.goals || []).map(g => g._id === goalId ? { ...g, ...goal } : g) }));
          return { success: true, goal };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      toggleSubGoalItem: async (goalId, index, completed, note) => {
        try {
          const res = await goalsAPI.toggleSubGoal(goalId, index, completed, note);
          const goal = res?.data?.data?.goal;
          if (goal) set(state => ({ goals: (state.goals || []).map(g => g._id === goalId ? { ...g, ...goal } : g) }));
          return { success: true, goal };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      setHabitLinks: async (goalId, habitLinks) => {
        try {
          const res = await goalsAPI.setHabitLinks(goalId, habitLinks);
          const goal = res?.data?.data?.goal;
          if (goal) set(state => ({ goals: (state.goals || []).map(g => g._id === goalId ? { ...g, ...goal } : g) }));
          return { success: true, goal };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      createGoal: async (goalData) => {
        try {
          set({ loading: true, error: null });
          const response = await goalsAPI.createGoal(goalData);
          const { goal } = response.data.data;

          // Add to current goals list
          set(state => ({
            goals: [goal, ...state.goals],
            loading: false
          }));
          // Invalidate caches related to goals and dashboard
          const yearToInvalidate = goal?.year || goalData?.year;
          const currentCache = get().cacheGoals || {};
          const newCache = { ...currentCache };
          if (yearToInvalidate !== undefined) {
            Object.keys(newCache).forEach(k => { if (k.includes(`year=${yearToInvalidate}`)) delete newCache[k]; });
          } else {
            // if year not known, clear all
            Object.keys(newCache).forEach(k => { delete newCache[k]; });
          }
          set({ cacheGoals: newCache, cacheDashboardStats: null });
          // Invalidate goal post detail cache for this goal
          try { get().invalidateGoalPostByGoal?.(goal?._id); } catch { }

          return { success: true, goal };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      updateGoal: async (id, goalData) => {
        try {
          set({ loading: true, error: null });
          const response = await goalsAPI.updateGoal(id, goalData);
          const { goal } = response.data.data;

          // Update in current goals list
          set(state => ({
            goals: state.goals.map(g => g._id === id ? goal : g),
            loading: false
          }));

          // Invalidate caches and force refresh dashboard stats
          const yearToInvalidate = goal?.year;
          const currentCache = get().cacheGoals || {};
          const newCache = { ...currentCache };
          if (yearToInvalidate !== undefined) {
            Object.keys(newCache).forEach(k => { if (k.includes(`year=${yearToInvalidate}`)) delete newCache[k]; });
          }
          set({ cacheGoals: newCache, cacheDashboardStats: null });
          // Invalidate goal post detail cache for this goal
          try { get().invalidateGoalPostByGoal?.(id); } catch { }
          // Trigger a forced stats refresh since edits can change totals/points
          try { await get().getDashboardStats({ force: true }); } catch { }

          return { success: true, goal };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      deleteGoal: async (id) => {
        try {
          set({ loading: true, error: null });
          await goalsAPI.deleteGoal(id);

          // Remove from current goals list
          set(state => ({
            goals: state.goals.filter(g => g._id !== id),
            loading: false
          }));

          // Invalidate all goal caches (unknown year) and dashboard stats
          set({ cacheGoals: {}, cacheDashboardStats: null });
          // Invalidate goal post detail cache for this goal
          try { get().invalidateGoalPostByGoal?.(id); } catch { }

          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      toggleGoalCompletion: async (id, completionNote, shareCompletionNote = true) => {
        try {
          const response = await goalsAPI.toggleGoalCompletion(id, completionNote, shareCompletionNote);
          const { goal } = response.data.data;

          // Update in current goals list
          set(state => ({
            goals: state.goals.map(g => g._id === id ? goal : g)
          }));

          // Invalidate caches and refresh stats
          const yearToInvalidate = goal?.year;
          const currentCache = get().cacheGoals || {};
          const newCache = { ...currentCache };
          if (yearToInvalidate !== undefined) {
            Object.keys(newCache).forEach(k => { if (k.includes(`year=${yearToInvalidate}`)) delete newCache[k]; });
          }
          set({ cacheGoals: newCache, cacheDashboardStats: null });
          // Invalidate goal post detail cache for this goal
          try { get().invalidateGoalPostByGoal?.(id); } catch { }
          try { await get().getDashboardStats({ force: true }); } catch { }

          return { success: true, goal };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      likeGoal: async (id) => {
        try {
          const response = await goalsAPI.likeGoal(id);
          const { isLiked, likeCount } = response.data.data;

          // Update in current goals list
          set(state => ({
            goals: state.goals.map(g =>
              g._id === id
                ? { ...g, likeCount, isLiked }
                : g
            )
          }));

          // Invalidate goal post detail cache for this goal
          try { get().invalidateGoalPostByGoal?.(id); } catch { }
          return { success: true, isLiked, likeCount };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      // Trending goals (paged/strategies)
      getTrendingGoals: async (params = {}, opts = {}) => {
        try {
          const force = !!opts.force;
          const key = get()._cacheKeyFromParams(params);
          const bucket = get().cacheTrendingGoals || {};
          const cached = bucket[key];
          // Keep lightweight cache for 10 minutes
          const ts = cached?.ts || 0;
          const fresh = Date.now() - ts < 10 * 60 * 1000;
          if (!force && cached && fresh) {
            return cached.data; // { goals, pagination }
          }
          const res = await goalsAPI.getTrendingGoals(params);
          const data = res?.data?.data || { goals: [], pagination: null };
          const nextBucket = { ...(get().cacheTrendingGoals || {}), [key]: { data, ts: Date.now() } };
          set({ cacheTrendingGoals: nextBucket });
          return data;
        } catch (error) {
          return { goals: [], pagination: null };
        }
      },

      getYearlyGoals: async (year, userId) => {
        try {
          set({ loading: true, error: null });
          const response = await goalsAPI.getYearlyGoals(year, userId);
          const { summary, goals } = response.data.data;
          set({ loading: false });
          return { success: true, summary, goals };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },


      getShareableGoal: async (id) => {
        try {
          const response = await goalsAPI.getShareableGoal(id);
          return { success: true, data: response.data.data };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      getOGImageUrl: (id) => {
        return goalsAPI.getOGImageUrl(id);
      },

      getGoalPost: async (id, opts = {}) => {
        try {
          const force = !!opts.force;
          const ttlMs = get().cacheTTLs?.goalPosts || 2 * 60 * 1000; // 2 minutes
          const bucket = get().cacheGoalPosts || {};
          const keysToCheck = [];
          if (id !== undefined && id !== null) {
            const sid = String(id);
            keysToCheck.push(`goal:${sid}`);
            keysToCheck.push(`activity:${sid}`);
          }
          if (!force) {
            for (const key of keysToCheck) {
              const entry = bucket[key];
              if (entry && typeof entry.ts === 'number' && Date.now() - entry.ts < ttlMs) {
                return { success: true, ...entry.data };
              }
            }
          }
          const response = await goalsAPI.getGoalPost(id);
          const resp = response?.data || {};
          // Cache by both goal and activity identifiers if present
          try {
            const goalId = resp?.data?.goal?._id;
            const activityId = resp?.data?.social?.activityId;
            const now = Date.now();
            const current = get().cacheGoalPosts || {};
            const next = { ...current };
            if (goalId) next[`goal:${String(goalId)}`] = { data: resp, ts: now };
            if (activityId) next[`activity:${String(activityId)}`] = { data: resp, ts: now };
            // Also cache the request id if not one of the above
            if (id && !goalId && !activityId) next[`goal:${String(id)}`] = { data: resp, ts: now };
            set({ cacheGoalPosts: next });
          } catch { }
          return { success: true, ...resp };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      // Search completed, discoverable goals (public users)
      searchGoals: async (params = {}) => {
        try {
          const response = await goalsAPI.searchGoals(params);
          const { goals, pagination } = response.data.data;
          set({ goalsSearchResults: goals });
          return { goals, pagination };
        } catch (error) {
          console.error('Error searching goals:', error);
          set({ goalsSearchResults: [] });
          return { goals: [], pagination: null };
        }
      },

      // =====================
      // USERS ACTIONS
      // =====================

      getUsers: async (params = {}, opts = {}) => {
        try {
          const force = !!opts.force;
          const key = get()._cacheKeyFromParams(params);
          const ttl = get().cacheTTLs.users;
          const cached = get().cacheUsers[key];
          if (!force && cached && get()._isFresh(cached.ts, ttl)) {
            const { users, pagination } = cached.data;
            return { success: true, users, pagination };
          }
          set({ loading: true, error: null });
          const response = await usersAPI.getUsers(params);
          const { users, pagination } = response.data.data;
          set({ users, usersPagination: pagination, loading: false });
          get()._setCacheWithLimit('cacheUsers', key, { users, pagination });
          return { success: true, users, pagination };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      searchUsers: async (params = {}) => {
        try {
          const query = {};
          if (params.search && String(params.search).trim()) query.search = String(params.search).trim();
          if (params.interest && String(params.interest).trim()) query.interest = String(params.interest).trim();
          if (params.page) query.page = params.page;
          if (params.limit) query.limit = params.limit;
          const response = await usersAPI.searchUsers(query);
          const { users, pagination } = response.data.data;
          return { users, pagination };
        } catch (error) {
          console.error('Error searching users:', error);
          return { users: [], pagination: null };
        }
      },

      getUser: async (id) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getUser(id);
          const { user, stats, isFollowing, isRequested } = response.data.data;
          set({ loading: false });
          return { success: true, user, stats, isFollowing, isRequested };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      getUserActivities: async (userId, params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getUserActivities(userId, params);
          const activities = response.data.data;
          set({ loading: false });
          return { success: true, activities };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      getUserGoals: async (userId, params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getUserGoals(userId, params);
          const { goals, pagination } = response.data.data;
          set({ loading: false });
          return { success: true, goals, pagination };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // =====================
      // SOCIAL ACTIONS
      // =====================

      followUser: async (userId) => {
        try {
          const response = await socialAPI.followUser(userId);
          const message = response.data?.message || '';
          const requested = response.data?.data?.requested === true || /request/i.test(message);
          // Update local state
          set(state => ({
            followedUsers: requested ? state.followedUsers : [...state.followedUsers, userId],
            users: state?.users?.map(user =>
              user._id === userId
                ? { ...user, isFollowing: !requested, isRequested: requested }
                : user
            ),
            leaderboard: state?.leaderboard?.map(user =>
              user._id === userId
                ? { ...user, isFollowing: true }
                : user
            ),
            suggestedUsers: state?.suggestedUsers?.map(user =>
              user._id === userId
                ? { ...user, isFollowing: !requested, isRequested: requested }
                : user
            )
          }));

          return { success: true, isRequested: requested };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      cancelFollowRequest: async (userId) => {
        try {
          await socialAPI.cancelFollowRequest(userId);
          set(state => ({
            users: state?.users?.map(u => u._id === userId ? { ...u, isRequested: false } : u),
            suggestedUsers: state?.suggestedUsers?.map(u => u._id === userId ? { ...u, isRequested: false } : u)
          }));
          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      // Moderation actions
      report: async ({ targetType, targetId, reason, description }) => {
        try {
          const res = await moderationAPI.report({ targetType, targetId, reason, description });
          return { success: true, data: res.data?.data };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      blockUser: async (userId) => {
        try {
          await moderationAPI.blockUser(userId);
          set(state => ({ blockedUsers: [...state.blockedUsers, userId] }));
          // Clear follow state both ways in local caches
          set(state => ({
            users: (state.users || []).map(u => u._id === userId ? { ...u, isFollowing: false, isRequested: false } : u),
            leaderboard: (state.leaderboard || []).map(u => u._id === userId ? { ...u, isFollowing: false } : u),
            followedUsers: (state.followedUsers || []).filter(id => id !== userId)
          }));
          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      unblockUser: async (userId) => {
        try {
          await moderationAPI.unblockUser(userId);
          set(state => ({ blockedUsers: state.blockedUsers.filter(id => id !== userId) }));
          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      listBlockedUsers: async () => {
        try {
          const res = await moderationAPI.listBlocked();
          const users = res?.data?.data?.users || [];
          return { success: true, users };
        } catch (error) {
          return { success: false, error: handleApiError(error), users: [] };
        }
      },

      unfollowUser: async (userId) => {
        try {
          const response = await socialAPI.unfollowUser(userId);

          // Update local state
          set(state => ({
            followedUsers: state.followedUsers.filter(id => id !== userId),
            users: state?.users?.map(user =>
              user._id === userId
                ? { ...user, isFollowing: false }
                : user
            ),
            leaderboard: state?.leaderboard?.map(user =>
              user._id === userId
                ? { ...user, isFollowing: false }
                : user
            ),
            suggestedUsers: state?.suggestedUsers?.map(user =>
              user._id === userId
                ? { ...user, isFollowing: false }
                : user
            )
          }));

          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      getFollowers: async (userId) => {
        try {
          const response = await socialAPI.getFollowers({ userId });
          const { followers } = response.data.data;
          set({ followers });
          return { success: true, followers };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      getFollowing: async (userId) => {
        try {
          const response = await socialAPI.getFollowing({ userId });
          const { following } = response.data.data;
          set({ following });
          return { success: true, following };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      getFollowRequests: async (params = {}) => {
        try {
          const response = await socialAPI.getFollowRequests(params);
          const { requests } = response.data.data;
          set({ followRequests: requests });
          return { success: true, requests };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      acceptFollowRequest: async (followerId) => {
        try {
          const id = (followerId && typeof followerId === 'object') ? (followerId._id || followerId.id) : followerId;
          await socialAPI.acceptFollowRequest(id);
          set(state => ({
            followRequests: (state.followRequests || []).filter(r => {
              const rid = r?.followerId?._id || r?.followerId || r?._id;
              return String(rid) !== String(id);
            })
          }));
          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      rejectFollowRequest: async (followerId) => {
        try {
          const id = (followerId && typeof followerId === 'object') ? (followerId._id || followerId.id) : followerId;
          await socialAPI.rejectFollowRequest(id);
          set(state => ({
            followRequests: (state.followRequests || []).filter(r => {
              const rid = r?.followerId?._id || r?.followerId || r?._id;
              return String(rid) !== String(id);
            })
          }));
          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      // Initialize following status for current user
      initializeFollowingStatus: async () => {
        try {
          const { user } = get();
          if (user) {
            const response = await socialAPI.getFollowing();
            const { following } = response.data.data;
            const followedUserIds = following.map(f => f._id);
            set({ followedUsers: followedUserIds, following });
            return followedUserIds;
          }
        } catch (error) {
          console.error('Error initializing following status:', error);
          return [];
        }
      },

      // =====================
      // ACTIVITIES ACTIONS
      // =====================

      getActivityFeed: async (params = {}, opts = {}) => {
        try {
          const force = !!opts.force;
          const key = get()._cacheKeyFromParams(params);
          const ttl = get().cacheTTLs.activityFeed;
          const cached = get().cacheActivityFeed[key];
          if (!force && cached && get()._isFresh(cached.ts, ttl)) {
            return cached.data; // { activities, pagination }
          }
          set({ loading: true, error: null });
          const response = await socialAPI.getActivityFeed(params);
          const activities = response.data.data; // { activities, pagination }
          set({ activityFeed: activities, loading: false });
          get()._setCacheWithLimit('cacheActivityFeed', key, activities);
          return activities;
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return [];
        }
      },

      // =====================
      // NOTIFICATIONS ACTIONS
      // =====================
      getNotifications: async (params = {}, opts = {}) => {
        try {
          const force = !!opts.force;
          const key = get()._cacheKeyFromParams(params);
          const ttl = get().cacheTTLs.notifications;
          const cached = get().cacheNotifications[key];
          if (!force && cached && get()._isFresh(cached.ts, ttl)) {
            const { notifications = [], pagination, unread = 0 } = cached.data || {};
            set({ notifications, notificationsPagination: pagination, unreadNotifications: unread });
            return { success: true, notifications, pagination, unread };
          }
          set({ loading: true, error: null });
          const response = await notificationsAPI.getNotifications(params);
          const { notifications = [], pagination, unread = 0 } = response.data?.data || {};
          set({ notifications, notificationsPagination: pagination, unreadNotifications: unread, loading: false });
          get()._setCacheWithLimit('cacheNotifications', key, { notifications, pagination, unread });
          return { success: true, notifications, pagination, unread };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage, notifications: [], notificationsPagination: null, unreadNotifications: 0 });
          return { success: false, error: errorMessage };
        }
      },

      // =====================
      // NOTIFICATION SETTINGS
      // =====================
      loadNotificationSettings: async () => {
        try {
          const res = await notificationsAPI.getSettings();
          const settings = res?.data?.data?.settings || null;
          set({ notificationSettings: settings });
          return settings;
        } catch (error) {
          return null;
        }
      },

      updateNotificationSettings: async (settings) => {
        try {
          const res = await notificationsAPI.updateSettings(settings);
          const updated = res?.data?.data?.settings || settings;
          set({ notificationSettings: updated });
          return { success: true, settings: updated };
        } catch (error) {
          return { success: false, error: handleApiError(error) };
        }
      },

      // =====================
      // JOURNALING ACTIONS
      // =====================
      getJournalPrompt: async () => {
        try {
          const res = await journalsAPI.getPrompt();
          const prompt = res?.data?.data?.prompt;
          if (prompt) {
            set({ journalPrompt: prompt });
          }
          return prompt;
        } catch (error) {
          return null;
        }
      },

      createJournalEntry: async ({ content, promptKey, visibility = 'private', mood = 'neutral', tags = [] }) => {
        try {
          const res = await journalsAPI.createEntry({ content, promptKey, visibility, mood, tags });
          const entry = res?.data?.data?.entry;
          if (entry) {
            set(state => ({ journalEntries: [entry, ...state.journalEntries] }));
          }
          return { success: true, entry };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      updateJournalEntry: async (id, payload) => {
        try {
          const res = await journalsAPI.updateEntry(id, payload);
          const entry = res?.data?.data?.entry;
          if (entry) {
            set(state => ({ journalEntries: state.journalEntries.map(e => e._id === entry._id ? entry : e) }));
          }
          return { success: true, entry };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      getMyJournalEntries: async (params = {}) => {
        try {
          const res = await journalsAPI.getMyEntries(params);
          const entries = res?.data?.data?.entries || [];
          set({ journalEntries: entries });
          return entries;
        } catch (error) {
          set({ journalEntries: [] });
          return [];
        }
      },

      getUserJournalHighlights: async (userId, params = {}) => {
        try {
          const res = await journalsAPI.getHighlights(userId, params);
          const highlights = res?.data?.data?.highlights || [];
          set({ journalHighlights: highlights });
          return highlights;
        } catch (error) {
          set({ journalHighlights: [] });
          return [];
        }
      },

      loadMoreNotifications: async () => {
        try {
          const { notificationsPagination } = get();
          if (!notificationsPagination) return;
          const nextPage = notificationsPagination.page + 1;
          const response = await notificationsAPI.getNotifications({ page: nextPage, limit: notificationsPagination.limit });
          const { notifications: more, pagination } = response.data.data;
          set(state => ({ notifications: [...(state.notifications || []), ...(more || [])], notificationsPagination: pagination }));
          // also keep cache entry for this page to avoid immediate refetch
          const key = get()._cacheKeyFromParams({ page: nextPage, limit: notificationsPagination.limit });
          const unreadNow = get().unreadNotifications;
          get()._setCacheWithLimit('cacheNotifications', key, { notifications: more, pagination, unread: unreadNow });
        } catch { }
      },

      markNotificationRead: async (id) => {
        try {
          await notificationsAPI.markAsRead(id);
          set(state => ({
            notifications: (state.notifications || []).map(n => n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n),
            unreadNotifications: Math.max((state.unreadNotifications || 0) - 1, 0)
          }));
        } catch { }
      },

      markAllNotificationsRead: async () => {
        try {
          await notificationsAPI.markAllAsRead();
          set(state => ({ notifications: (state.notifications || []).map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })), unreadNotifications: 0 }));
        } catch { }
      },

      getRecentActivities: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await activitiesAPI.getRecentActivities(params);
          const activities = response.data.data;
          set({ recentActivities: activities, loading: false });
          return activities;
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return [];
        }
      },

      likeActivity: async (activityId, like) => {
        try {
          const response = await activitiesAPI.likeActivity(activityId, like);
          const { isLiked, likeCount } = response.data.data;

          // Update in activity feed
          set(state => ({
            activityFeed: state.activityFeed.map(activity =>
              activity._id === activityId
                ? { ...activity, likeCount, isLiked }
                : activity
            ),
            recentActivities: state.recentActivities.map(activity =>
              activity._id === activityId
                ? { ...activity, likeCount, isLiked }
                : activity
            )
          }));

          // Invalidate cached goal post for this activity
          try { get().invalidateGoalPostByActivity?.(activityId); } catch { }
          return { success: true, isLiked, likeCount };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      unlikeActivity: async (activityId) => {
        try {
          const response = await activitiesAPI.likeActivity(activityId, false);
          const { isLiked, likeCount } = response.data.data;

          // Update in activity feed
          set(state => ({
            activityFeed: state.activityFeed.map(activity =>
              activity._id === activityId
                ? { ...activity, likeCount, isLiked }
                : activity
            ),
            recentActivities: state.recentActivities.map(activity =>
              activity._id === activityId
                ? { ...activity, likeCount, isLiked }
                : activity
            )
          }));

          // Invalidate cached goal post for this activity
          try { get().invalidateGoalPostByActivity?.(activityId); } catch { }
          return { success: true, isLiked, likeCount };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      // =====================
      // LEADERBOARD ACTIONS
      // =====================

      getGlobalLeaderboard: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await leaderboardAPI.getGlobalLeaderboard(params);
          const { leaderboard } = response.data.data;
          set({ leaderboard, loading: false });
          return leaderboard;
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return [];
        }
      },

      getCategoryLeaderboard: async (category, params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await leaderboardAPI.getCategoryLeaderboard(category, params);
          const { leaderboard } = response.data.data;
          set({ leaderboard, loading: false });
          return { success: true, leaderboard };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      getFriendsLeaderboard: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await leaderboardAPI.getFriendsLeaderboard(params);
          const { leaderboard } = response.data.data;
          set({ leaderboard, loading: false });
          return { success: true, leaderboard };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      getLeaderboardStats: async () => {
        try {
          const response = await leaderboardAPI.getLeaderboardStats();
          const { stats } = response.data.data;
          return { success: true, stats };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },

      loadInterests: async (limit = 64) => {
        try {
          const res = await usersAPI.getInterests({ limit });
          const interests = res?.data?.data?.interests || [];
          set({ interestsCatalog: interests });
          return interests;
        } catch (err) {
          console.error('Failed to load interests', err);
          set({ interestsCatalog: [] });
          return [];
        }
      },

      // =====================
      // HELPER METHODS
      // =====================

      clearError: () => set({ error: null }),

      setLoading: (loading) => set({ loading }),

      // Initialize auth state from localStorage
      initializeAuth: () => {
        const token = localStorage.getItem('token');
        if (token) {
          setAuthToken(token);
          set({ token, isAuthenticated: true });
          // Optionally fetch user data
          get().getMe();
          // Load feature flags on startup (non-blocking)
          try { get().loadFeatures?.(); } catch { }
          // Auto-detect timezone and send to backend (fire-and-forget)
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            const offset = -new Date().getTimezoneOffset();
            if (tz || typeof offset === 'number') {
              fetch(`${API_CONFIG.BASE_URL}/users/timezone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                credentials: 'include',
                body: JSON.stringify({ timezone: tz || undefined, timezoneOffsetMinutes: offset })
              }).catch(() => { });
            }
          } catch { }
        }
        
        // 🔥 NEW: Register callback for axios interceptor to update store after refresh
        if (typeof window !== 'undefined') {
          window.__updateAuthToken = (newToken) => {
            if (newToken) {
              set({ token: newToken, isAuthenticated: true });
            } else {
              set({ 
                token: null, 
                isAuthenticated: false,
                user: null
              });
            }
          };
        }
      }
      ,
      // =====================
      // FEATURES
      // =====================
      loadFeatures: async () => {
        try {
          const res = await featuresAPI.list();
          const flags = res?.data?.data?.flags || null;
          if (flags) set({ features: flags });
          return flags;
        } catch (err) {
          return null;
        }
      },

      isFeatureEnabled: (key) => {
        try {
          const k = String(key || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
          const flags = (get().features) || {};
          // default to true if not present
          return !!(flags[k] ? flags[k].web !== false : true);
        } catch {
          return true;
        }
      }
    }),
    {
      name: 'wishtrail-api-store',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      merge: (persistedState, currentState) => {
        // Ensure arrays are always initialized even after hydration
        return {
          ...currentState,
          ...persistedState,
          // Explicitly ensure critical arrays are never undefined
          notifications: currentState.notifications || [],
          goals: currentState.goals || [],
          users: currentState.users || [],
          activityFeed: currentState.activityFeed || [],
          habits: currentState.habits || [],
          followedUsers: currentState.followedUsers || [],
          followers: currentState.followers || [],
          following: currentState.following || [],
          blockedUsers: currentState.blockedUsers || [],
          followRequests: currentState.followRequests || [],
          journalEntries: currentState.journalEntries || [],
          journalHighlights: currentState.journalHighlights || [],
          leaderboard: currentState.leaderboard || [],
          goalsSearchResults: currentState.goalsSearchResults || [],
          interestsCatalog: currentState.interestsCatalog || [],
          recentActivities: currentState.recentActivities || [],
        };
      },
    }
  )
);

export default useApiStore; 