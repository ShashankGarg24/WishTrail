const adminService = require('../services/adminService');
const { signAdminToken, getRequestIp } = require('../middleware/adminAuth');

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

  async sendEmail(req, res, next) {
    try {
      const { mode, userIds, inactiveDays, subject, title, subtitle, body, ending } = req.body || {};
      const result = await adminService.sendBroadcastEmail({
        mode,
        userIds,
        inactiveDays,
        subject,
        title,
        subtitle,
        body,
        ending
      });

      return res.status(200).json({
        success: true,
        message: 'Email broadcast completed',
        data: result
      });
    } catch (error) {
      if (error.message === 'Subject, title, body and ending are required') {
        return res.status(400).json({ success: false, message: error.message });
      }
      return next(error);
    }
  }
};
