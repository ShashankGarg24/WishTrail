const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const rateLimit = require('express-rate-limit');
const operations = require('../controllers/adminOperationsController');
const pass2 = require('../controllers/adminPass2Controller');

const router = express.Router();

router.post('/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
}), adminController.login);

router.use(requireAdminAuth);
router.get('/campaigns/options', pass2.campaignOptions);
router.post('/campaigns/review', pass2.reviewCampaign);
router.post('/campaigns/test', pass2.testCampaign);
router.post('/campaigns/send', pass2.sendCampaign);
router.get('/product-control', pass2.getProduct);
router.put('/product-control/maintenance', pass2.setMaintenance);
router.put('/product-control/promotion', pass2.setPromotion);

router.get('/overview', operations.getOverview);
router.get('/users/:id', operations.getUser);
router.patch('/users/:id/status', operations.setUserStatus);
router.post('/users/:id/premium', operations.grantPremium);
router.delete('/users/:id/premium', operations.revokePremium);
router.get('/goals/:id', operations.getGoal);
router.get('/habits/:id', operations.getHabit);
router.get('/reports', operations.getReports);
router.get('/reports/:id', operations.getReport);
router.patch('/reports/:id/dismiss', operations.dismissReport);

router.get('/users', adminController.getUsers);
router.get('/goals', adminController.getGoals);
router.get('/habits', adminController.getHabits);
router.get('/analytics', adminController.getAnalytics);
router.post('/email/send', pass2.sendCampaign);
router.get('/product-updates', adminController.getProductUpdates);
router.get('/product-updates/:version', pass2.getRelease);
router.post('/product-updates', adminController.createProductUpdate);
router.put('/product-updates/:version', adminController.updateProductUpdate);
router.delete('/product-updates/:version', adminController.deleteProductUpdate);

module.exports = router;
