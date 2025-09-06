const express = require('express');
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/', notificationController.getNotifications);
router.get('/devices', notificationController.listDevices);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.post('/devices/register', notificationController.registerDevice);
router.post('/devices/unregister', notificationController.unregisterDevice);
router.post('/test-push', notificationController.testPush);

module.exports = router;

