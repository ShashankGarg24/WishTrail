/**
 * Premium Routes
 * 
 * Routes for premium subscription management and feature access
 */

const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { protect } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');

// Public routes (require authentication only)
router.get('/status', protect, premiumController.getPremiumStatus);
router.get('/features', protect, premiumController.getFeatureLimits);
router.post('/subscribe', protect, premiumController.subscribeToPremium);
router.post('/cancel', protect, premiumController.cancelSubscription);

// Admin routes (TODO: Add admin middleware)
router.get('/stats', protect, premiumController.getPremiumStats);
router.get('/expiring', protect, premiumController.getExpiringUsers);
router.get('/expired', protect, premiumController.getExpiredUsers);
router.post('/grant', protect, premiumController.grantPremiumToUser);
router.delete('/revoke', protect, premiumController.revokePremiumFromUser);

module.exports = router;
