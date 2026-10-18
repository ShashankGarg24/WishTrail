/**
 * Premium Routes
 * 
 * Routes for premium subscription management and feature access
 */

const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { protect } = require('../middleware/auth');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { requirePremium } = require('../middleware/premium');

// Public routes (require authentication only)
router.get('/status', protect, premiumController.getPremiumStatus);
router.get('/features', protect, premiumController.getFeatureLimits);
router.post('/subscribe', protect, premiumController.subscribeToPremium);
router.post('/cancel', protect, premiumController.cancelSubscription);

// Administrative operations use the separate scoped admin token.
router.get('/stats', requireAdminAuth, premiumController.getPremiumStats);
router.get('/expiring', requireAdminAuth, premiumController.getExpiringUsers);
router.get('/expired', requireAdminAuth, premiumController.getExpiredUsers);
router.post('/grant', requireAdminAuth, premiumController.grantPremiumToUser);
router.delete('/revoke', requireAdminAuth, premiumController.revokePremiumFromUser);

module.exports = router;
