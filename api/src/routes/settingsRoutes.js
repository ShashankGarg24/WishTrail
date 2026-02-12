const express = require('express');
const { body } = require('express-validator');
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
router.post('/password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[a-zA-Z]/)
    .withMessage('New password must contain at least one letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number')
    .matches(/[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\/'`~;]/)
    .withMessage('New password must contain at least one special character')
], settingsController.updatePassword);

module.exports = router;
