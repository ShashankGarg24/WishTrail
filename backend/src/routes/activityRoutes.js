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
router.get('/:id', protect, activityController.getActivity);
router.patch('/:id/like', protect, activityController.toggleActivityLike);

module.exports = router;