import axios from 'axios';
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
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
  createGoal: (goalData) => api.post('/goals', goalData),
  updateGoal: (id, goalData) => api.put(`/goals/${id}`, goalData),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  toggleGoalCompletion: (id, completionNote, shareCompletionNote = true) => 
    api.patch(`/goals/${id}/toggle`, { completionNote, shareCompletionNote }),
  likeGoal: (id) => api.patch(`/goals/${id}/like`),
  getYearlyGoals: (year, userId) => api.get(`/goals/yearly/${year}`, { params: { userId } }),
  getShareableGoal: (id) => api.get(`/goals/${id}/share`),
  getOGImageUrl: (id) => `${api.defaults.baseURL}/goals/${id}/og-image`,
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  getDashboardStats: () => api.get('/users/dashboard'),
  getProfileSummary: () => api.get('/users/profile'),
  getSuggestedUsers: (params) => api.get('/users/suggestions', { params }),
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserGoals: (id, params) => api.get(`/users/${id}/goals`, { params }),
  getUserYearlyGoals: (id, year, params) => api.get(`/users/${id}/goals/yearly/${year}`, { params }),
  getUserActivities: (id, params) => api.get(`/users/${id}/activities`, { params }),
  updatePrivacy: (data) => api.put('/users/privacy', data),
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
};

// Activities API
export const activitiesAPI = {
  getActivityFeed: (params) => api.get('/activities/feed', { params }),
  getRecentActivities: (params) => api.get('/activities/recent', { params }),
  getTrendingActivities: (params) => api.get('/activities/trending', { params }),
  getActivityStats: (params) => api.get('/activities/stats', { params }),
  getUserActivities: (userId, params) => api.get(`/activities/user/${userId}`, { params }),
  getActivity: (id) => api.get(`/activities/${id}`),
  likeActivity: (id) => api.patch(`/activities/${id}/like`),
};

// Leaderboard API
export const leaderboardAPI = {
  getGlobalLeaderboard: (params) => api.get('/leaderboard/', { params }),
  getCategoryLeaderboard: (category, params) => api.get(`/leaderboard/category/${category}`, { params }),
  getAchievementLeaderboard: (params) => api.get('/leaderboard/achievements', { params }),
  getFriendsLeaderboard: (params) => api.get('/leaderboard/friends', { params }),
  getLeaderboardStats: () => api.get('/leaderboard/stats'),
};

// Explore API
export const exploreAPI = {
  getExploreFeed: (params) => api.get('/explore', { params }),
  getSuggestedUsers: (params) => api.get('/explore/users', { params }),
  getTrendingCategories: (params) => api.get('/explore/categories', { params }),
  searchExplore: (params) => api.get('/explore/search', { params }),
};

// Location API
export const locationAPI = {
  getCitySuggestions: (query) =>
    api.get(`/location/search-city?q=${encodeURIComponent(query)}`)
};

// Feedback API (helper)
export const feedbackAPI = {
  submit: (formData) => api.post('/feedback', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
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