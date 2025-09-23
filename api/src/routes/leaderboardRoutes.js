const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureFlags');

const router = express.Router();

// Routes with optional authentication
router.get('/', optionalAuth, requireFeature('leaderboard'), leaderboardController.getGlobalLeaderboard);

// Routes that require login
router.get('/category/:category', protect, requireFeature('leaderboard'), leaderboardController.getCategoryLeaderboard);
router.get('/friends',  protect, requireFeature('leaderboard'), leaderboardController.getFriendsLeaderboard);
router.get('/stats', protect, requireFeature('leaderboard'), leaderboardController.getLeaderboardStats);

module.exports = router; 