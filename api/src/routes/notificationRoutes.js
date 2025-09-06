const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Allow device registration with optional auth (controller will validate body token if header missing)
router.post('/devices/register', optionalAuth, notificationController.registerDevice);

// Protected routes
router.use(protect);

router.get('/', notificationController.getNotifications);
router.get('/devices', notificationController.listDevices);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.post('/devices/unregister', notificationController.unregisterDevice);
router.post('/test-push', notificationController.testPush);

module.exports = router;

