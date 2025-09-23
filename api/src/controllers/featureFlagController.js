const { getAllFlags } = require('../services/featureFlagService');

module.exports = {
  async list(req, res, next) {
    try {
      const flags = await getAllFlags();
      res.status(200).json({ success: true, data: { flags } });
    } catch (e) { next(e); }
  }
};


