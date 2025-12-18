const express = require('express');
const { protect } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// All routes are protected
router.use(protect);

// Privacy settings
router.get('/privacy', settingsController.getPrivacySettings);
router.post('/privacy', settingsController.updatePrivacySettings);

// Theme settings
router.get('/theme', settingsController.getThemeSettings);
router.post('/theme', settingsController.updateThemeSettings);

// Blocked users
router.get('/blocked', settingsController.getBlockedUsers);
router.post('/blocked', settingsController.blockUser);
router.delete('/blocked/:username', settingsController.unblockUser);

// Notification settings
router.get('/notifications', settingsController.getNotificationSettings);
router.post('/notifications', settingsController.updateNotificationSettings);

// Password
router.post('/password', settingsController.updatePassword);

module.exports = router;
