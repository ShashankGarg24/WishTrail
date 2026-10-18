import axios from 'axios';
import { API_CONFIG } from '../config/api';

const ADMIN_TOKEN_KEY = 'wishtrail_admin_token';
const normalizeSegment = (value, fallback = 'admin') => {
  const raw = String(value || fallback).trim().replace(/^\/+|\/+$/g, '');
  const cleaned = raw.replace(/[^a-zA-Z0-9/_-]/g, '');
  return cleaned || fallback;
};
const ADMIN_API_SEGMENT = normalizeSegment(import.meta.env.VITE_ADMIN_API_ROUTE_SEGMENT, 'admin');
const ADMIN_BASE_PATH = `/${ADMIN_API_SEGMENT}`;

const adminApi = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(response => response, error => {
  const requestToken = error.config?.headers?.Authorization;
  if (error.response?.status === 401 && requestToken && requestToken === `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}`) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('wishtrail-admin-session-expired'));
  }
  return Promise.reject(error);
});

export const adminAuth = {
  tokenKey: ADMIN_TOKEN_KEY,
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setToken: (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(ADMIN_TOKEN_KEY)
};

export const adminAPI = {
  campaignOptions: () => adminApi.get(`${ADMIN_BASE_PATH}/campaigns/options`),
  reviewCampaign: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/campaigns/review`, payload),
  testCampaign: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/campaigns/test`, payload),
  sendCampaign: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/campaigns/send`, payload),
  getRelease: (version) => adminApi.get(`${ADMIN_BASE_PATH}/product-updates/${encodeURIComponent(version)}`),
  getProductControl: () => adminApi.get(`${ADMIN_BASE_PATH}/product-control`),
  setMaintenance: (payload) => adminApi.put(`${ADMIN_BASE_PATH}/product-control/maintenance`, payload),
  setPromotion: (payload) => adminApi.put(`${ADMIN_BASE_PATH}/product-control/promotion`, payload),
  getOverview: (params) => adminApi.get(`${ADMIN_BASE_PATH}/overview`, { params }),
  getUser: (id) => adminApi.get(`${ADMIN_BASE_PATH}/users/${encodeURIComponent(id)}`),
  setUserStatus: (id, active) => adminApi.patch(`${ADMIN_BASE_PATH}/users/${encodeURIComponent(id)}/status`, { active }),
  grantPremium: (id, months) => adminApi.post(`${ADMIN_BASE_PATH}/users/${encodeURIComponent(id)}/premium`, { months }),
  revokePremium: (id) => adminApi.delete(`${ADMIN_BASE_PATH}/users/${encodeURIComponent(id)}/premium`),
  getGoal: (id) => adminApi.get(`${ADMIN_BASE_PATH}/goals/${encodeURIComponent(id)}`),
  getHabit: (id) => adminApi.get(`${ADMIN_BASE_PATH}/habits/${encodeURIComponent(id)}`),
  getReports: (params) => adminApi.get(`${ADMIN_BASE_PATH}/reports`, { params }),
  getReport: (id) => adminApi.get(`${ADMIN_BASE_PATH}/reports/${encodeURIComponent(id)}`),
  dismissReport: (id) => adminApi.patch(`${ADMIN_BASE_PATH}/reports/${encodeURIComponent(id)}/dismiss`),
  login: ({ email, password }) => adminApi.post(`${ADMIN_BASE_PATH}/login`, { email, password }),
  getUsers: (params) => adminApi.get(`${ADMIN_BASE_PATH}/users`, { params }),
  getGoals: (params) => adminApi.get(`${ADMIN_BASE_PATH}/goals`, { params }),
  getHabits: (params) => adminApi.get(`${ADMIN_BASE_PATH}/habits`, { params }),
  getAnalytics: (params) => adminApi.get(`${ADMIN_BASE_PATH}/analytics`, { params }),
  sendEmail: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/email/send`, payload),
  getProductUpdates: (params) => adminApi.get(`${ADMIN_BASE_PATH}/product-updates`, { params }),
  createProductUpdate: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/product-updates`, payload),
  updateProductUpdate: (version, payload) => adminApi.put(`${ADMIN_BASE_PATH}/product-updates/${encodeURIComponent(version)}`, payload),
  deleteProductUpdate: (version) => adminApi.delete(`${ADMIN_BASE_PATH}/product-updates/${encodeURIComponent(version)}`)
};
