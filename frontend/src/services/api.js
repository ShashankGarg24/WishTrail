import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors with refresh flow
let isRefreshing = false;
const queue = [];
const processQueue = (error, token = null) => {
  while (queue.length > 0) {
    const { resolve, reject, originalRequest } = queue.shift();
    if (token) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      resolve(api(originalRequest));
    } else {
      reject(error);
    }
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error || {};
    if (!response) return Promise.reject(error);
    if (response.status !== 401) return Promise.reject(error);

    const originalRequest = config;
    // If refresh itself failed, logout
    if (originalRequest?.url?.includes('/auth/refresh')) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, originalRequest });
      });
    }

    // Start refresh
    isRefreshing = true;
    try {
      const res = await api.post('/auth/refresh', null, { withCredentials: true });
      const newToken = res?.data?.data?.token;
      if (!newToken) throw new Error('No access token in refresh response');
      localStorage.setItem('token', newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      // Retry original
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshErr) {
      // On refresh failure, clear token and avoid infinite reload loops
      try { localStorage.removeItem('token'); } catch {}
      try { delete api.defaults.headers.common.Authorization; } catch {}
      processQueue(refreshErr, null);
      // Only navigate if not already on auth, and do it once
      try {
        const onAuth = window.location.pathname.startsWith('/auth');
        if (!onAuth) window.location.assign('/auth');
      } catch {}
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  updatePassword: (passwordData) => api.put('/auth/password', passwordData),

  // Password reset API
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  
  // Multi-step signup API
  checkExistingUser: (data) => api.post('/auth/check-existing', data),
  requestOTP: (userData) => api.post('/auth/request-otp', userData),
  verifyOTP: (otpData) => api.post('/auth/verify-otp', otpData),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
};

// Goals API
export const goalsAPI = {
  getGoals: (params) => api.get('/goals', { params }),
  getGoal: (id) => api.get(`/goals/${id}`),
  getTrendingGoals: (params) => api.get('/goals/trending', { params }),
  createGoal: (goalData) => api.post('/goals', goalData),
  updateGoal: (id, goalData) => api.put(`/goals/${id}`, goalData),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  toggleGoalCompletion: (id, completionNote, shareCompletionNote = true) => 
    api.patch(`/goals/${id}/toggle`, { completionNote, shareCompletionNote }),
  likeGoal: (id) => api.patch(`/goals/${id}/like`),
  getYearlyGoals: (year, userId) => api.get(`/goals/yearly/${year}`, { params: { userId } }),
  getShareableGoal: (id) => api.get(`/goals/${id}/share`),
  getOGImageUrl: (id) => `${api.defaults.baseURL}/goals/${id}/og-image`,
  searchGoals: (params) => api.get('/goals/search', { params }),
  getGoalPost: (id) => api.get(`/goals/${id}/post`),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getDashboardStats: () => api.get('/users/dashboard'),
  getProfileSummary: () => api.get('/users/profile'),
  getSuggestedUsers: (params) => api.get('/users/suggestions', { params }),
  getInterests: (params) => api.get('/users/interests', { params }),
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserGoals: (id, params) => api.get(`/users/${id}/goals`, { params }),
  getUserYearlyGoals: (id, year, params) => api.get(`/users/${id}/goals/yearly/${year}`, { params }),
  getUserActivities: (id, params) => api.get(`/users/${id}/activities`, { params }),
  updatePrivacy: (data) => api.put('/users/privacy', data),
  addDashboardYear: (year) => api.post('/users/dashboard/years', { year }),
};
// Moderation API
export const moderationAPI = {
  report: (payload) => api.post('/moderation/report', payload),
  blockUser: (userId) => api.post(`/moderation/block/${userId}`),
  unblockUser: (userId) => api.delete(`/moderation/block/${userId}`),
  listBlocked: () => api.get('/moderation/blocked')
};

// Social API
export const socialAPI = {
  followUser: (userId) => api.post(`/social/follow/${userId}`),
  unfollowUser: (userId) => api.delete(`/social/follow/${userId}`),
  getFollowers: (params) => api.get('/social/followers', { params }),
  getFollowing: (params) => api.get('/social/following', { params }),
  checkFollowingStatus: (userId) => api.get(`/social/following/check/${userId}`),
  getMutualFollowers: (userId) => api.get(`/social/mutual/${userId}`),
  getSuggestedUsers: (params) => api.get('/social/suggestions', { params }),
  getFollowStats: (params) => api.get('/social/stats', { params }),
  getActivityFeed: (params) => api.get('/social/feed', { params }),
  getPopularUsers: (params) => api.get('/social/popular', { params }),
  getFollowRequests: (params) => api.get('/social/follow/requests', { params }),
  acceptFollowRequest: (followerId) => {
    const id = (followerId && typeof followerId === 'object') ? (followerId._id || followerId.id) : followerId;
    return api.post(`/social/follow/requests/${id}/accept`);
  },
  rejectFollowRequest: (followerId) => {
    const id = (followerId && typeof followerId === 'object') ? (followerId._id || followerId.id) : followerId;
    return api.post(`/social/follow/requests/${id}/reject`);
  },
  cancelFollowRequest: (userId) => api.delete(`/social/follow/requests/${userId}`),
};

// Activities API
export const activitiesAPI = {
  getActivityFeed: (params) => api.get('/activities/feed', { params }),
  getRecentActivities: (params) => api.get('/activities/recent', { params }),
  getTrendingActivities: (params) => api.get('/activities/trending', { params }),
  getActivityStats: (params) => api.get('/activities/stats', { params }),
  getUserActivities: (userId, params) => api.get(`/activities/user/${userId}`, { params }),
  getActivity: (id) => api.get(`/activities/${id}`),
  likeActivity: (id, like) => api.patch(`/activities/${id}/like`, typeof like === 'boolean' ? { like } : {}),
  getComments: (activityId, params) => api.get(`/activities/${activityId}/comments`, { params }),
  addComment: (activityId, body) => api.post(`/activities/${activityId}/comments`, body),
  replyComment: (activityId, commentId, body) => api.post(`/activities/${activityId}/comments/${commentId}/replies`, body),
  toggleCommentLike: (activityId, commentId, like) => api.patch(`/activities/${activityId}/comments/${commentId}/like`, typeof like === 'boolean' ? { like } : {}),
};

// Leaderboard API
export const leaderboardAPI = {
  getGlobalLeaderboard: (params) => api.get('/leaderboard/', { params }),
  getCategoryLeaderboard: (category, params) => api.get(`/leaderboard/category/${category}`, { params }),
  getFriendsLeaderboard: (params) => api.get('/leaderboard/friends', { params }),
  getLeaderboardStats: () => api.get('/leaderboard/stats'),
};

// Explore API (removed)

// Notifications API
export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', { settings }),
  ping: () => api.post('/notifications/ping')
};

// Journals API
export const journalsAPI = {
  getPrompt: () => api.get('/journals/prompt'),
  createEntry: (payload) => api.post('/journals', payload),
  updateEntry: (id, payload) => api.patch(`/journals/${id}`, payload),
  getMyEntries: (params) => api.get('/journals/me', { params }),
  getHighlights: (userId, params) => api.get(`/journals/highlights/${userId}`, { params }),
  getStats: (userId) => api.get(`/journals/stats/${userId}`),
  export: (params) => api.get('/journals/export', { params, responseType: 'blob' })
};

// Habits API
export const habitsAPI = {
  list: (params) => api.get('/habits', { params }),
  create: (payload) => api.post('/habits', payload),
  get: (id) => api.get(`/habits/${id}`),
  update: (id, payload) => api.put(`/habits/${id}`, payload),
  archive: (id) => api.patch(`/habits/${id}/archive`),
  remove: (id) => api.delete(`/habits/${id}`),
  stats: () => api.get('/habits/stats'),
  log: (id, payload) => api.post(`/habits/${id}/log`, payload),
  heatmap: (id, params) => api.get(`/habits/${id}/heatmap`, { params }),
  analytics: (params) => api.get('/habits/analytics', { params }),
};

// Location API
export const locationAPI = {
  getCitySuggestions: (query) =>
    api.get(`/location/search-city?q=${encodeURIComponent(query)}`)
};

// Upload API
export const uploadAPI = {
  uploadAvatar: (formData) => api.post('/upload/avatar', formData)
}

// Feedback API (helper)
export const feedbackAPI = {
  submit: (formData) => api.post('/feedback', formData)
}

// Utility functions
export const handleApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors?.length > 0) {
    return error.response.data.errors[0].msg;
  }
  return error.message || 'An unexpected error occurred';
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common.Authorization;
  }
};

export default api; 