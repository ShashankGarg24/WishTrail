const express = require('express');
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Activity routes
router.get('/feed', activityController.getActivityFeed);
router.get('/recent', activityController.getRecentActivities);
router.get('/trending', activityController.getTrendingActivities);
router.get('/stats', activityController.getActivityStats);
router.get('/user/:userId', activityController.getUserActivities);
router.get('/:id', activityController.getActivity);
router.patch('/:id/like', activityController.toggleActivityLike);

module.exports = router; 