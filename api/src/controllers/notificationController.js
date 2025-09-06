const DeviceToken = require('../models/DeviceToken');

exports.registerDevice = async (req, res, next) => {
  try {
    const { token, platform = 'unknown', provider = 'expo' } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    try {
      const masked = token.slice(0, 12) + '...';
      console.log('[notifications] registerDevice hit', {
        userId: (req.user && (req.user.id || req.user._id)) || null,
        platform,
        provider,
        token: masked
      });
    } catch {}
    const doc = await DeviceToken.findOneAndUpdate(
      { userId: req.user._id || req.user.id, token },
      { $set: { platform, provider, lastSeenAt: new Date(), isActive: true } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: { device: doc } });
  } catch (e) { next(e); }
};

exports.unregisterDevice = async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    await DeviceToken.updateOne({ userId: req.user._id || req.user.id, token }, { $set: { isActive: false } });
    res.status(200).json({ success: true });
  } catch (e) { next(e); }
};

const Notification = require('../models/Notification');
const { sendExpoPushToUser } = require('../services/pushService');

// @desc    Get current user's notifications
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead, type } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const options = {
      limit: parsedLimit,
      skip: (parsedPage - 1) * parsedLimit
    };
    if (typeof isRead !== 'undefined') options.isRead = String(isRead) === 'true';
    if (type) options.type = type;

    const [items, total, unread] = await Promise.all([
      Notification.getUserNotifications(req.user.id, options),
      Notification.countDocuments({ userId: req.user.id, ...(typeof options.isRead === 'boolean' ? { isRead: options.isRead } : {}) }),
      Notification.getUnreadCount(req.user.id)
    ]);

    return res.status(200).json({ success: true, data: { notifications: items, pagination: { page: parsedPage, limit: parsedLimit, total, pages: Math.ceil(total / parsedLimit) }, unread } });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const updated = await Notification.markAsRead(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: { notification: updated } });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id);
    return res.status(200).json({ success: true, data: { result } });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  try {
    const deleted = await Notification.deleteNotification(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: { notification: deleted } });
  } catch (err) {
    next(err);
  }
};

// @desc    List current user's registered device tokens
// @route   GET /api/v1/notifications/devices
// @access  Private
const listDevices = async (req, res, next) => {
  try {
    const items = await DeviceToken.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: { devices: items } });
  } catch (err) {
    next(err);
  }
};

// @desc    Send a test push to current user's devices (no DB write)
// @route   POST /api/v1/notifications/test-push
// @access  Private
const testPush = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const title = req.body?.title || 'Test Notification';
    const message = req.body?.message || 'This is a test push from WishTrail';
    const url = req.body?.url || '/explore?tab=notifications';
    const type = req.body?.type || 'test';
    const fake = { _id: new Date().getTime(), userId, type, title, message, data: { url } };
    const result = await sendExpoPushToUser(userId, fake);
    return res.status(200).json({ success: true, data: { result } });
  } catch (e) { next(e); }
};

module.exports = {
  registerDevice: exports.registerDevice,
  unregisterDevice: exports.unregisterDevice,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  listDevices,
  testPush
};

