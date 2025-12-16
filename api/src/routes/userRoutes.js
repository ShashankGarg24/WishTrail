const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.get('/', userController.getUsers);
router.get('/dashboard', userController.getDashboardStats);
router.get('/profile', userController.getProfileSummary);
router.get('/analytics', userController.getAnalytics);
router.post('/timezone', userController.updateTimezone);
router.post('/dashboard/years', userController.addDashboardYear);
router.get('/suggestions', userController.getSuggestedUsers);
router.get('/interests', userController.listInterests);
router.get('/search', userController.searchUsers);
router.get('/:id', userController.getUser);
router.get('/:id/goals', userController.getUserGoals);
router.get('/:id/goals/yearly/:year', userController.getUserYearlyGoals);
router.get('/:id/activities', userController.getUserActivities);
router.put('/privacy', userController.updatePrivacy);
// Block status helper
router.get('/:userId/block-status', userController.getBlockStatus);

module.exports = router; 