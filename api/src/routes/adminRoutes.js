const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', adminController.login);

router.use(requireAdminAuth);

router.get('/users', adminController.getUsers);
router.get('/goals', adminController.getGoals);
router.get('/habits', adminController.getHabits);
router.get('/analytics', adminController.getAnalytics);
router.post('/email/send', adminController.sendEmail);

module.exports = router;
