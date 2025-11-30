import axios from 'axios';
import { API_CONFIG } from '../config/api';

/**
 * Configuration Service
 * Handles system configuration and maintenance mode checks
 */
export const configService = {
  /**
   * Check if the system is in maintenance mode
   */
  async checkMaintenanceMode() {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/config/maintenance`, {
        timeout: 5000 // 5 second timeout
      });
      return {
        isMaintenanceMode: response.data?.data?.maintenanceMode || false,
        message: response.data?.data?.message || ''
      };
    } catch (error) {
      // If the endpoint returns 503, it means maintenance mode is active
      if (error.response?.status === 503) {
        return {
          isMaintenanceMode: true,
          message: error.response?.data?.message || 'System is under maintenance.'
        };
      }
      // If there's a network error, don't block the app
      console.error('Failed to check maintenance mode:', error);
      return {
        isMaintenanceMode: false,
        message: ''
      };
    }
  },

  /**
   * Get all configuration settings (Admin only)
   */
  async getAllConfigs(token) {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/config`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data?.data?.configs || [];
  },

  /**
   * Get a specific config by key (Admin only)
   */
  async getConfigByKey(key, token) {
    const response = await axios.get(`${API_CONFIG.BASE_URL}/config/${key}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data?.data?.config;
  },

  /**
   * Update or create a config (Admin only)
   */
  async upsertConfig(key, value, description, token) {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/config`,
      { key, value, description },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data?.data?.config;
  },

  /**
   * Toggle maintenance mode (Admin only)
   */
  async toggleMaintenanceMode(enabled, message, token) {
    const response = await axios.put(
      `${API_CONFIG.BASE_URL}/config/maintenance`,
      { enabled, message },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  /**
   * Delete a config (Admin only)
   */
  async deleteConfig(key, token) {
    const response = await axios.delete(`${API_CONFIG.BASE_URL}/config/${key}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default configService;
