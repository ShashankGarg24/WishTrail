const adminService = require('../services/adminService');
const productUpdateService = require('../services/productUpdateService');
const redis = require('../config/redis');
const { signAdminToken, getRequestIp, isAllowedAdminIp } = require('../middleware/adminAuth');

const PRODUCT_UPDATE_TYPES = ['feature', 'enhancement', 'bug_fix'];

const validateProductUpdate = ({ title, description, version, type }) => {
  if (typeof title !== 'string' || typeof description !== 'string' || typeof version !== 'string' ||
      !title.trim() || !description.trim() || !version.trim() || title.length > 255 || description.length > 20000 ||
      !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,49}$/.test(version) || /[<>]/.test(title + description)) {
    return 'Use plain text: title 1-255 characters, description 1-20000, version 1-50 letters/numbers/dots/dashes';
  }
  if (!PRODUCT_UPDATE_TYPES.includes(type || 'feature')) {
    return `Type must be one of: ${PRODUCT_UPDATE_TYPES.join(', ')}`;
  }
  return null;
};

const clearProductUpdateCache = async () => {
  try {
    const keys = await redis.keys('wishtrail:whats_new:list:*');
    if (Array.isArray(keys) && keys.length) await redis.del(...keys);
  } catch {
    // A cache miss/outage must never prevent an admin from publishing a release note.
  }
};

const validateAdminCredentials = ({ email, username, password }) => {
  const configuredEmail = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD || '';

  const incomingIdentity = (email || username || '').trim().toLowerCase();

  if (!configuredEmail || !configuredPassword) {
    return false;
  }

  return incomingIdentity === configuredEmail && password === configuredPassword;
};

module.exports = {
  async login(req, res, next) {
    try {
      if (!isAllowedAdminIp(req)) return res.status(403).json({ success: false, message: 'Admin access denied for this IP' });
      const { email, username, password } = req.body || {};

      if (!password || (!email && !username)) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      if (!validateAdminCredentials({ email, username, password })) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin credentials'
        });
      }

      const identity = (email || username).trim().toLowerCase();
      const ip = getRequestIp(req);
      const token = signAdminToken({ scope: 'admin-panel', email: identity, ip });

      return res.status(200).json({
        success: true,
        data: {
          token,
          email: identity
        }
      });
    } catch (error) {
      return next(error);
    }
  },

  async getUsers(req, res, next) {
    try {
      const result = await adminService.getUsers(req.query || {});
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },

  async getGoals(req, res, next) {
    try {
      const result = await adminService.getGoals(req.query || {});
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },

  async getHabits(req, res, next) {
    try {
      const result = await adminService.getHabits(req.query || {});
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  },

  async getAnalytics(req, res, next) {
    try {
      const analytics = await adminService.getAnalytics(req.query || {});
      return res.status(200).json({ success: true, data: { analytics } });
    } catch (error) {
      return next(error);
    }
  },

  async getProductUpdates(req, res, next) {
    try {
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const { updates, total } = await productUpdateService.listForAdmin({ ...req.query, limit, offset: (page - 1) * limit });
      return res.status(200).json({ success: true, data: { updates, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } } });
    } catch (error) {
      return next(error);
    }
  },

  async createProductUpdate(req, res, next) {
    try {
      const { title, description, version, isMajor = false, type = 'feature' } = req.body || {};
      const validationError = typeof isMajor !== 'boolean' ? 'Major must be a boolean' : validateProductUpdate({ title, description, version, type });
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      const update = await productUpdateService.createUpdate({ title: title.trim(), description: description.trim(), version: version.trim(), isMajor: isMajor === true, type });
      await clearProductUpdateCache();
      return res.status(201).json({ success: true, data: { update } });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, message: 'That version already exists' });
      return next(error);
    }
  },

  async updateProductUpdate(req, res, next) {
    try {
      const originalVersion = String(req.params.version || '').trim();
      const { title, description, version, isMajor = false, type = 'feature' } = req.body || {};
      const validationError = typeof isMajor !== 'boolean' ? 'Major must be a boolean' : validateProductUpdate({ title, description, version, type });
      if (!originalVersion) return res.status(400).json({ success: false, message: 'Original version is required' });
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      const update = await productUpdateService.updateUpdate(originalVersion, { title: title.trim(), description: description.trim(), version: version.trim(), isMajor: isMajor === true, type });
      if (!update) return res.status(404).json({ success: false, message: 'Release note not found' });
      await clearProductUpdateCache();
      return res.status(200).json({ success: true, data: { update } });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, message: 'That version already exists' });
      return next(error);
    }
  },

  async deleteProductUpdate(req, res, next) {
    try {
      const result = await productUpdateService.deleteUpdate(req.params.version);
      if (!result) return res.status(404).json({ success: false, message: 'Release note not found' });
      await clearProductUpdateCache();
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }
};
