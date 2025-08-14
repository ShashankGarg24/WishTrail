const Report = require('../models/Report');
const Block = require('../models/Block');
const Follow = require('../models/Follow');

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
    const doc = await Block.blockUser(blockerId, userId);
    // auto-unfollow both ways
    try { await Follow.unfollowUser(blockerId, userId); } catch {}
    try { await Follow.unfollowUser(userId, blockerId); } catch {}
    res.status(200).json({ success: true, data: { block: doc } });
  } catch (err) { next(err); }
};

// @desc Unblock a user
// @route DELETE /api/v1/moderation/block/:userId
// @access Private
const unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;
    const doc = await Block.unblockUser(blockerId, userId);
    res.status(200).json({ success: true, data: { block: doc } });
  } catch (err) { next(err); }
};

module.exports = { reportContent, blockUser, unblockUser };


