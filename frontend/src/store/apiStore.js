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
  setAuthToken
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
      
      register: async (name, email, password) => {
        try {
          set({ loading: true, error: null });
          const response = await authAPI.signup({ name, email, password });
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
      
      completeGoal: async (id, completionNote) => {
        try {
          set({ loading: true, error: null });
          const response = await goalsAPI.completeGoal(id, completionNote);
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
      
      toggleGoal: async (id) => {
        try {
          const response = await goalsAPI.toggleGoal(id);
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
      
      getUser: async (id) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.getUser(id);
          const { user, stats, isFollowing } = response.data.data;
          set({ loading: false });
          return { success: true, user, stats, isFollowing };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      searchUsers: async (query, params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await usersAPI.searchUsers({ q: query, ...params });
          const { users, pagination } = response.data.data;
          set({ users, usersPagination: pagination, loading: false });
          return { success: true, users, pagination };
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
      
      // =====================
      // ACTIVITIES ACTIONS
      // =====================
      
      getActivityFeed: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await activitiesAPI.getActivityFeed(params);
          const { activities } = response.data.data;
          set({ activityFeed: activities, loading: false });
          return { success: true, activities };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      getRecentActivities: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await activitiesAPI.getRecentActivities(params);
          const { activities } = response.data.data;
          set({ recentActivities: activities, loading: false });
          return { success: true, activities };
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({ loading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },
      
      likeActivity: async (activityId) => {
        try {
          const response = await activitiesAPI.likeActivity(activityId);
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
      
      getLeaderboard: async (params = {}) => {
        try {
          set({ loading: true, error: null });
          const response = await leaderboardAPI.getGlobalLeaderboard(params);
          const { leaderboard } = response.data.data;
          set({ leaderboard, loading: false });
          return { success: true, leaderboard };
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