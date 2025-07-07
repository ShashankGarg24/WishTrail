const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Leaderboard routes
router.get('/', leaderboardController.getGlobalLeaderboard);
router.get('/category/:category', leaderboardController.getCategoryLeaderboard);
router.get('/achievements', leaderboardController.getAchievementLeaderboard);
router.get('/friends', leaderboardController.getFriendsLeaderboard);
router.get('/stats', leaderboardController.getLeaderboardStats);

module.exports = router; 