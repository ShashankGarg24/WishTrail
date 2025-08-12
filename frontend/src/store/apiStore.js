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
  locationAPI
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
      
      // Activities
      activityFeed: [],
      recentActivities: [],
      
      // Leaderboard
      leaderboard: [],
      
      // Explore
      exploreFeed: null,
      suggestedUsers: [],
      trendingCategories: [],
      exploreSearchResults: null,
      
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
      
      getDashboardStats: async () => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getDashboardStats();
          const { stats } = response.data.data;
          set({ dashboardStats: stats, loading: false });
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
      
      getGoals: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await goalsAPI.getGoals(params);
          const { goals, pagination } = response.data.data;
          set({ goals, goalsPagination: pagination, loading: false });
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
      
      // =====================
      // USERS ACTIONS
      // =====================
      
      getUsers: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getUsers(params);
          const { users, pagination } = response.data.data;
          set({ users, usersPagination: pagination, loading: false });
          return { success: true, users, pagination };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      searchUsers: async (searchTerm) => {
        try {
          const response = await usersAPI.searchUsers({ search: searchTerm });
          const { users } = response.data.data;
          return users;
        } catch (error) {
          console.error('Error searching users:', error);
          return [];
        }
      },
      
      getUser: async (id) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getUser(id);
          const {user, stats, isFollowing} = response.data.data;
          set({ loading: false });
          return { success: true, user, stats, isFollowing};
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
          
          // Update local state
          set(state => ({
            followedUsers: [...state.followedUsers, userId],
            users: state.users.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: true }
                : user
            ),
            leaderboard: state.leaderboard.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: true }
                : user
            ),
            suggestedUsers: state.suggestedUsers.map(user => 
              user._id === userId 
                ? { ...user, isFollowing: true }
                : user
            )
          }));
          
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
      
      getActivityFeed: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await socialAPI.getActivityFeed(params);
          const activities = response.data.data;
          set({ activityFeed: activities, loading: false });
          return activities;
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return [];
        }
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