const DeviceToken = require('../models/DeviceToken');

exports.registerDevice = async (req, res, next) => {
  try {
    console.log('registerDevice hit', req.body);
    const { token, platform = 'unknown', provider = 'expo', timezone = '', timezoneOffsetMinutes = null } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    try {
      const masked = token.slice(0, 12) + '...';
      console.log('[notifications] registerDevice hit', {
        headerAuth: !!(req.headers && req.headers.authorization),
        userIdHeader: (req.user && (req.user.id || req.user._id)) || null,
        userIdBody: req.body && req.body.userId ? req.body.userId : null,
        platform,
        provider,
        token: masked
      });
    } catch {}
    // If user is not authenticated yet, accept a userId in body for initial association (fallback)
    const bodyUserId = (req.body && req.body.userId) || null;
    const userId = (req.user && (req.user._id || req.user.id)) || bodyUserId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authorized' });
    let doc;
    try {
      // First, check for and remove any duplicate tokens for this user
      const existing = await DeviceToken.find({ userId, token }).lean();
      if (existing.length > 1) {
        console.log('[notifications] Found duplicate tokens, cleaning up:', existing.length);
        // Keep the first one, delete the rest
        const keepId = existing[0]._id;
        await DeviceToken.deleteMany({ userId, token, _id: { $ne: keepId } });
      }
      
      doc = await DeviceToken.findOneAndUpdate(
        { userId, token },
        { $set: { platform, provider, lastSeenAt: new Date(), isActive: true, timezone: timezone || undefined, timezoneOffsetMinutes: timezoneOffsetMinutes ?? undefined } },
        { upsert: true, new: true }
      );

      // ONE active token per user:
      await DeviceToken.updateMany(
        { userId, token: { $ne: token } },
        { $set: { isActive: false } }
      );
    } catch (e) {
      console.error('[notifications] registerDevice DB error', e?.message);
      throw e;
    }
    // Optionally update user's canonical timezone if provided and changed (debounced by device hits naturally)
    try {
      if (timezone && req.user && req.user.id) {
        const User = require('../models/User');
        await User.updateOne({ _id: req.user.id }, { $set: { timezone, timezoneOffsetMinutes: typeof timezoneOffsetMinutes === 'number' ? timezoneOffsetMinutes : undefined } });
      }
    } catch {}
    res.status(200).json({ success: true, data: { device: doc } });
  } catch (e) { next(e); }
};

exports.unregisterDevice = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId || !token) return res.status(400).json({ error: 'Missing userId or token' });

    await DeviceToken.updateOne(
      { userId, token },
      { $set: { isActive: false, lastSeenAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[unregisterDevice]', err);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
};

const Notification = require('../models/Notification');
const { sendFcmToUser } = require('../services/pushService');
const User = require('../models/User');

// @desc    Get current user's notifications
// @route   GET /api/v1/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead, type, scope } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    // Default scope is social-only for in-app panel
    const scopeValue = (scope || 'social').toLowerCase();
    const socialTypes = [
      'new_follower','follow_request','follow_request_accepted',
      'activity_comment','comment_reply','mention',
      'activity_liked','comment_liked','goal_liked'
    ];

    // Build base query
    const baseQuery = { userId: req.user.id };
    if (typeof isRead !== 'undefined') baseQuery.isRead = String(isRead) === 'true';
    if (type) {
      baseQuery.type = type;
    } else if (scopeValue === 'social') {
      baseQuery.type = { $in: socialTypes };
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const [items, total, unread] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip)
        .populate('data.followerId', 'name avatar username')
        .populate('data.goalId', 'title category')
        .populate('data.likerId', 'name avatar username')
        .populate('data.actorId', 'name avatar username')
        .populate('data.activityId', 'type')
        .populate('data.commentId'),
      Notification.countDocuments(baseQuery),
      // Unread count should reflect same scope/category
      Notification.countDocuments({ userId: req.user.id, isRead: false, ...(type ? { type } : (scopeValue === 'social' ? { type: { $in: socialTypes } } : {})) })
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
exports.listDevices = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const devices = await DeviceToken.find({ userId }).lean();
    res.json({ devices });
  } catch (err) {
    console.error('[listDevices]', err);
    res.status(500).json({ error: 'Failed to list devices' });
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
    const url = req.body?.url || '/notifications';
    const type = req.body?.type || 'test';
    const fake = { _id: new Date().getTime(), userId, type, title, message, data: { url } };
    const result = await sendFcmToUser(userId, fake);
    return res.status(200).json({ success: true, data: { result } });
  } catch (e) { next(e); }
};

// @desc    Get current user's notification settings
// @route   GET /api/v1/notifications/settings
// @access  Private
const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notificationSettings timezone timezoneOffsetMinutes');
    return res.status(200).json({ success: true, data: { settings: user.notificationSettings, timezone: user.timezone, timezoneOffsetMinutes: user.timezoneOffsetMinutes } });
  } catch (err) { next(err); }
};

// @desc    Update current user's notification settings
// @route   PUT /api/v1/notifications/settings
// @access  Private
const updateSettings = async (req, res, next) => {
  try {
    const payload = req.body && req.body.settings ? req.body.settings : req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { notificationSettings: payload } }, { new: true, runValidators: true }).select('notificationSettings');
    return res.status(200).json({ success: true, data: { settings: user.notificationSettings } });
  } catch (err) { next(err); }
};

// @desc    Record a foreground app ping (last active)
// @route   POST /api/v1/notifications/ping
// @access  Private
const ping = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $set: { lastActiveAt: new Date() } });
    return res.status(200).json({ success: true });
  } catch (err) { next(err); }
};

module.exports = {
  registerDevice: exports.registerDevice,
  unregisterDevice: exports.unregisterDevice,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  listDevices: exports.listDevices,
  testPush,
  getSettings,
  updateSettings,
  ping
};

