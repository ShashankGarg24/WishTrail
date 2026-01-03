const Report = require('../models/Report');
const pgBlockService = require('../services/pgBlockService');
const { sanitizeBlockedUsers } = require('../utility/sanitizer');

// @desc Report a user or activity
// @route POST /api/v1/moderation/report
// @access Private
const reportContent = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    if (!['user', 'activity'].includes(targetType)) return res.status(400).json({ success: false, message: 'Invalid targetType' });
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required' });
    const doc = await Report.findOneAndUpdate(
      { reporterId: req.user.id, targetType, targetId },
      { $set: { reason, description: description || '' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: { report: doc } });
  } catch (err) { next(err); }
};

// @desc Block a user
// @route POST /api/v1/moderation/block/:userId
// @access Private
const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;
    const doc = await pgBlockService.blockUser(blockerId, parseInt(userId));
    // Follow relationships are automatically removed by pgBlockService.blockUser
    res.status(200).json({ 
      success: true, 
      data: { 
        block: doc,
        isBlocked: true,
        message: 'User blocked successfully'
      } 
    });
  } catch (err) { next(err); }
};

// @desc Unblock a user
// @route DELETE /api/v1/moderation/block/:userId
// @access Private
const unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;
    await pgBlockService.unblockUser(blockerId, parseInt(userId));
    res.status(200).json({ 
      success: true, 
      data: {
        isBlocked: false,
        message: 'User unblocked successfully'
      }
    });
  } catch (err) { next(err); }
};

// @desc List users I have blocked (active)
// @route GET /api/v1/moderation/blocked
// @access Private
const listBlocked = async (req, res, next) => {
  try {
    const blockedUsers = await pgBlockService.getBlockedUsers(req.user.id, {
      limit: 1000,
      offset: 0,
      includeUser: true
    });
    
    const users = blockedUsers.map(block => ({
      id: block.user.id,
      name: block.user.name,
      username: block.user.username,
      avatar: block.user.avatarUrl
    }));
    
    const sanitized = sanitizeBlockedUsers(users);
    console.log('Sanitized blocked users:', sanitized);
    res.json({ success: true, data: { users: sanitized } });
  } catch (err) { next(err); }
};

module.exports = { reportContent, blockUser, unblockUser, listBlocked };


