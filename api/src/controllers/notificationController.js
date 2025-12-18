const DeviceToken = require('../models/DeviceToken');
const Notification = require('../models/Notification');
const { sendFcmToUser } = require('../services/pushService');
const User = require('../models/User');
const { sanitizeNotification } = require('../utility/sanitizer');

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
      'new_follower','follow_request_accepted',
      'activity_comment','comment_reply','mention',
      'activity_liked','comment_liked','goal_liked'
    ];
    // Note: 'follow_request' is excluded - it's in a separate section via /follow-requests

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
        .populate('data.activityId', 'type message')
        .populate('data.commentId'),
      Notification.countDocuments(baseQuery),
      // Unread count should reflect same scope/category
      Notification.countDocuments({ userId: req.user.id, isRead: false, ...(type ? { type } : (scopeValue === 'social' ? { type: { $in: socialTypes } } : {})) })
    ]);

    console.log('[getNotifications] Query:', JSON.stringify(baseQuery));
    console.log('[getNotifications] Found items:', items.length, 'Types:', items.map(i => i.type));

    // Sanitize notifications
    const sanitizedNotifications = items.map(notification => sanitizeNotification(notification));
    
    console.log('[getNotifications] Sanitized count:', sanitizedNotifications.length);

    return res.status(200).json({ success: true, data: { notifications: sanitizedNotifications, pagination: { page: parsedPage, limit: parsedLimit, total, pages: Math.ceil(total / parsedLimit) }, unread } });
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
    const sanitized = sanitizeNotification(updated);
    return res.status(200).json({ success: true, data: { notification: sanitized } });
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
    const sanitized = sanitizeNotification(deleted);
    return res.status(200).json({ success: true, data: { notification: sanitized } });
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
// @desc    Get follow requests (paginated, separate from regular notifications)
// @route   GET /api/v1/notifications/follow-requests
// @access  Private
const getFollowRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const baseQuery = { 
      userId: req.user.id, 
      type: 'follow_request'
    };

    const [items, total] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip)
        .populate('data.followerId', 'name avatar username')
        .populate('data.actorId', 'name avatar username'),
      Notification.countDocuments(baseQuery)
    ]);

    const sanitizedRequests = items.map(notification => sanitizeNotification(notification));
    
    return res.status(200).json({ 
      success: true, 
      data: { 
        requests: sanitizedRequests, 
        pagination: { 
          page: parsedPage, 
          limit: parsedLimit, 
          total, 
          pages: Math.ceil(total / parsedLimit) 
        } 
      } 
    });
  } catch (err) {
    console.error('[getFollowRequests] Error:', err);
    next(err);
  }
};

// @desc    Accept a follow request
// @route   POST /api/v1/notifications/follow-requests/:notificationId/accept
// @access  Private
const acceptFollowRequest = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Find the notification
    const notification = await Notification.findOne({ 
      _id: notificationId, 
      userId, 
      type: 'follow_request' 
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Follow request not found' });
    }

    const followerId = notification.data.followerId;

    // Accept the follow request
    const Follow = require('../models/Follow');
    await Follow.acceptFollowRequest(followerId, userId);

    // Convert the notification from follow_request to new_follower
    await Notification.convertFollowRequestToNewFollower(followerId, userId);

    // Notify the requester that their request was accepted
    await Notification.createFollowAcceptedNotification(userId, followerId);

    return res.status(200).json({ 
      success: true, 
      message: 'Follow request accepted' 
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject a follow request
// @route   POST /api/v1/notifications/follow-requests/:notificationId/reject
// @access  Private
const rejectFollowRequest = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Find the notification
    const notification = await Notification.findOne({ 
      _id: notificationId, 
      userId, 
      type: 'follow_request' 
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Follow request not found' });
    }

    const followerId = notification.data.followerId;

    // Reject the follow request
    const Follow = require('../models/Follow');
    await Follow.rejectFollowRequest(followerId, userId);

    // Delete the notification
    await Notification.deleteFollowRequestNotification(followerId, userId);

    return res.status(200).json({ 
      success: true, 
      message: 'Follow request rejected' 
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerDevice: exports.registerDevice,
  unregisterDevice: exports.unregisterDevice,
  getNotifications,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  listDevices: exports.listDevices,
  testPush
};

