const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Routes with optional authentication
router.get('/', optionalAuth, leaderboardController.getGlobalLeaderboard);

// Routes that require login
router.get('/category/:category', protect, leaderboardController.getCategoryLeaderboard);
router.get('/friends',  protect, leaderboardController.getFriendsLeaderboard);
router.get('/stats', protect, leaderboardController.getLeaderboardStats);

module.exports = router; 