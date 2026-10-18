const Config = require('../models/Config');

/**
 * Config Controller
 * Manages system-wide configuration settings
 */
module.exports = {
  /**
   * Get all config settings
   */
  async getAllConfigs(req, res, next) {
    try {
      const configs = await Config.find().select('-__v').sort({ key: 1 });
      res.status(200).json({ 
        success: true, 
        data: { configs } 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a specific config by key
   */
  async getConfigByKey(req, res, next) {
    try {
      const { key } = req.params;
      const config = await Config.findOne({ key: key.toLowerCase() });
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Config not found'
        });
      }

      res.status(200).json({
        success: true,
        data: { config }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update or create a config setting (Admin only)
   */
  async upsertConfig(req, res, next) {
    try {
      const { key, value, description } = req.body;

      const product = require('../services/adminProductService');
      if (key === 'maintenance_mode') {
        await product.setMaintenance({ enabled: value, message: description });
      } else if (key === 'promotion') {
        await product.setPromotion(value);
      } else {
        return res.status(400).json({ success: false, message: 'Unsupported runtime setting' });
      }
      const saved = await Config.findOne({ key });
      return res.json({ success: true, data: { config: saved } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a config setting (Admin only)
   */
  async deleteConfig(req, res, next) {
    try {
      const { key } = req.params;
      if (!['maintenance_mode', 'promotion'].includes(key)) return res.status(400).json({ success: false, message: 'Unsupported runtime setting' });
      const config = await Config.findOneAndDelete({ key: key.toLowerCase() });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Config not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Config deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get maintenance mode status (Public endpoint)
   */
  async getMaintenanceStatus(req, res, next) {
    try {
      const isMaintenanceMode = await Config.isMaintenanceMode();
      const config = await Config.findOne({ key: 'maintenance_mode' });

      res.status(200).json({
        success: true,
        data: {
          maintenanceMode: isMaintenanceMode,
          message: config?.description || 'System is under maintenance. Please try again later.'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle maintenance mode (Admin only)
   */
  async toggleMaintenanceMode(req, res, next) {
    try {
      const { enabled, message } = req.body;
      await require('../services/adminProductService').setMaintenance({ enabled, message });
      const config = await Config.findOne({ key: 'maintenance_mode' });

      res.status(200).json({
        success: true,
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
        data: { config }
      });
    } catch (error) {
      next(error);
    }
  }
};
