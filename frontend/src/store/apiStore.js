import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { 
  authAPI, 
  goalsAPI, 
  usersAPI, 
  socialAPI, 
  activitiesAPI, 
  leaderboardAPI,
  exploreAPI,
  handleApiError,
  setAuthToken,
  locationAPI,
  moderationAPI,
  notificationsAPI
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
      
      // Client-side caches (TTL + persisted)
      cacheActivityFeed: {}, // key -> { data, ts }
      cacheUsers: {},        // key -> { data, ts }
      cacheNotifications: {},// key -> { data, ts }
      cacheGoals: {},        // key -> { data, ts }
      cacheDashboardStats: null, // { data, ts }
      cacheTTLs: {
        activityFeed: 15 * 60 * 1000,   // 15 minutes
        users: 30 * 60 * 1000,          // 30 minutes
        notifications: 5 * 60 * 1000,   // 5 minutes
        goals: Number.POSITIVE_INFINITY, // cache until explicitly invalidated
        dashboardStats: Number.POSITIVE_INFINITY,
      },
      maxCacheEntries: {
        activityFeed: 8,
        users: 8,
        notifications: 5,
        goals: 8,
      },
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
      
      // Leaderboard
      leaderboard: [],
      
      // Explore
      exploreFeed: null,
      suggestedUsers: [],
      trendingCategories: [],
      exploreSearchResults: null,
      goalsSearchResults: [],
      interestsCatalog: [],
      
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
          const errorMessage = handleApiError(error);
          set({ isAuthenticated: false, user: null });
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
              success: true };
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
          // Trigger a forced stats refresh since edits can change totals/points
          try { await get().getDashboardStats({ force: true }); } catch {}
          
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
          try { await get().getDashboardStats({ force: true }); } catch {}
          
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
          
          return { success: true, isLiked, likeCount };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
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
          const {user, stats, isFollowing, isRequested} = response.data.data;
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
            users: state.users.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: !requested, isRequested: requested }
                : user
            ),
            leaderboard: state.leaderboard.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: true }
                : user
            ),
            suggestedUsers: state.suggestedUsers.map(user => 
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
            users: state.users.map(u => u._id === userId ? { ...u, isRequested: false } : u),
            suggestedUsers: state.suggestedUsers.map(u => u._id === userId ? { ...u, isRequested: false } : u)
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
      
      unfollowUser: async (userId) => {
        try {
          const response = await socialAPI.unfollowUser(userId);
          
          // Update local state
          set(state => ({
            followedUsers: state.followedUsers.filter(id => id !== userId),
            users: state.users.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: false }
                : user
            ),
            leaderboard: state.leaderboard.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: false }
                : user
            ),
            suggestedUsers: state.suggestedUsers.map(user => 
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
          await socialAPI.acceptFollowRequest(followerId);
          set(state => ({ followRequests: state.followRequests.filter(r => r.followerId._id !== followerId) }));
          return { success: true };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },
      rejectFollowRequest: async (followerId) => {
        try {
          await socialAPI.rejectFollowRequest(followerId);
          set(state => ({ followRequests: state.followRequests.filter(r => r.followerId._id !== followerId) }));
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
            const { notifications, pagination, unread } = cached.data;
            set({ notifications, notificationsPagination: pagination, unreadNotifications: unread });
            return { success: true, notifications, pagination, unread };
          }
          set({ loading: true, error: null });
          const response = await notificationsAPI.getNotifications(params);
          const { notifications, pagination, unread } = response.data.data;
          set({ notifications, notificationsPagination: pagination, unreadNotifications: unread, loading: false });
          get()._setCacheWithLimit('cacheNotifications', key, { notifications, pagination, unread });
          return { success: true, notifications, pagination, unread };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      loadMoreNotifications: async () => {
        try {
          const { notificationsPagination } = get();
          if (!notificationsPagination) return;
          const nextPage = notificationsPagination.page + 1;
          const response = await notificationsAPI.getNotifications({ page: nextPage, limit: notificationsPagination.limit });
          const { notifications: more, pagination } = response.data.data;
          set(state => ({ notifications: [...state.notifications, ...more], notificationsPagination: pagination }));
          // also keep cache entry for this page to avoid immediate refetch
          const key = get()._cacheKeyFromParams({ page: nextPage, limit: notificationsPagination.limit });
          const unreadNow = get().unreadNotifications;
          get()._setCacheWithLimit('cacheNotifications', key, { notifications: more, pagination, unread: unreadNow });
        } catch {}
      },
      markNotificationRead: async (id) => {
        try {
          await notificationsAPI.markAsRead(id);
          set(state => ({ 
            notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n),
            unreadNotifications: Math.max((state.unreadNotifications || 0) - 1, 0)
          }));
        } catch {}
      },
      markAllNotificationsRead: async () => {
        try {
          await notificationsAPI.markAllAsRead();
          set(state => ({ notifications: state.notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })), unreadNotifications: 0 }));
        } catch {}
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
      
      getAchievementLeaderboard: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await leaderboardAPI.getAchievementLeaderboard(params);
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
      
      // =====================
      // EXPLORE ACTIONS
      // =====================
      
      getExploreFeed: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await exploreAPI.getExploreFeed(params);
          const exploreFeed = response.data.data;
          set({ exploreFeed, loading: false });
          return { success: true, exploreFeed };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      getSuggestedUsers: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await exploreAPI.getSuggestedUsers(params);
          const { users } = response.data.data;
          set({ suggestedUsers: users, loading: false });
          return { success: true, users };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
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
      
      getTrendingCategories: async (params = {}) => {
        try {
          const response = await exploreAPI.getTrendingCategories(params);
          const { categories } = response.data.data;
          set({ trendingCategories: categories });
          return { success: true, categories };
        } catch (error) {
          const errorMessage = handleApiError(error);
          return { success: false, error: errorMessage };
        }
      },
      
      searchExplore: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await exploreAPI.searchExplore(params);
          const results = response.data.data;
          set({ exploreSearchResults: results, loading: false });
          return { success: true, results };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
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
    }
  )
);

export default useApiStore; 