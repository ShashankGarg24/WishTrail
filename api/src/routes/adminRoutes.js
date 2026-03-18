const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAllowedAdminIp, requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();

router.use(requireAllowedAdminIp);

router.post('/login', adminController.login);

router.use(requireAdminAuth);

router.get('/users', adminController.getUsers);
router.get('/goals', adminController.getGoals);
router.get('/habits', adminController.getHabits);
router.get('/analytics', adminController.getAnalytics);
router.post('/email/send', adminController.sendEmail);

router.get('/announcements', adminController.listAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.patch('/announcements/:id', adminController.updateAnnouncement);

module.exports = router;
