const express = require('express');
const socialController = require('../controllers/socialController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Social routes
router.post('/follow/:userId', socialController.followUser);
router.delete('/follow/:userId', socialController.unfollowUser);
router.get('/follow/requests', socialController.getFollowRequests);
router.post('/follow/requests/:followerId/accept', socialController.acceptFollowRequest);
router.post('/follow/requests/:followerId/reject', socialController.rejectFollowRequest);
router.delete('/follow/requests/:userId', socialController.cancelFollowRequest);
router.get('/followers', socialController.getFollowers);
router.get('/following', socialController.getFollowing);
router.get('/following/check/:userId', socialController.checkFollowingStatus);
router.get('/mutual/:userId', socialController.getMutualFollowers);
router.get('/suggestions', socialController.getSuggestedUsers);
router.get('/stats', socialController.getFollowStats);
router.get('/feed', socialController.getActivityFeed);
router.get('/popular', socialController.getPopularUsers);

module.exports = router; 