const Notification = require('../models/Notification');

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

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};

