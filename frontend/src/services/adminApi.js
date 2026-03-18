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

export const adminAuth = {
  tokenKey: ADMIN_TOKEN_KEY,
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  setToken: (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(ADMIN_TOKEN_KEY)
};

export const adminAPI = {
  login: ({ email, password }) => adminApi.post(`${ADMIN_BASE_PATH}/login`, { email, password }),
  getUsers: (params) => adminApi.get(`${ADMIN_BASE_PATH}/users`, { params }),
  getGoals: (params) => adminApi.get(`${ADMIN_BASE_PATH}/goals`, { params }),
  getHabits: (params) => adminApi.get(`${ADMIN_BASE_PATH}/habits`, { params }),
  getAnalytics: (params) => adminApi.get(`${ADMIN_BASE_PATH}/analytics`, { params }),
  sendEmail: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/email/send`, payload),
  getAnnouncements: (params) => adminApi.get(`${ADMIN_BASE_PATH}/announcements`, { params }),
  createAnnouncement: (payload) => adminApi.post(`${ADMIN_BASE_PATH}/announcements`, payload),
  updateAnnouncement: (id, payload) => adminApi.patch(`${ADMIN_BASE_PATH}/announcements/${id}`, payload)
};
