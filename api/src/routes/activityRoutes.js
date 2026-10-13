const express = require('express');
const activityController = require('../controllers/activityController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Routes with optional authentication
router.get('/recent', optionalAuth, activityController.getRecentActivities);

// Routes that require login
router.get('/trending', protect, activityController.getTrendingActivities);
router.get('/stats', protect, activityController.getActivityStats);
router.get('/user/:userId', protect, activityController.getUserActivities);
// Apply snapshot visibility to detail, reactions, comments, and replies alike.
router.use('/:id', protect, async (req, res, next) => {
  try {
    if (/^[a-f0-9]{24}$/i.test(req.params.id)) {
      const activity = await require('../models/Activity').findById(req.params.id).lean();
      await require('../services/goalShareAccess').assertShareAccess(activity, req.user.id);
    }
    next();
  } catch (error) { next(error); }
});

router.get('/:id', protect, activityController.getActivity);
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await require('../services/goalShareService').deleteShare(req.params.id, req.user.id);
    res.json({ success: true, message: 'Shared post deleted' });
  } catch (error) { next(error); }
});
router.patch('/:id/like', protect, activityController.toggleActivityLike);
router.get('/:id/comments', protect, activityController.getActivityComments);
router.post('/:id/comments', protect, activityController.addActivityComment);
router.post('/:id/comments/:commentId/replies', protect, activityController.replyToActivityComment);
router.patch('/:id/comments/:commentId/like', protect, activityController.toggleCommentLike);

module.exports = router;
