/**
 * Premium Controller
 * 
 * Handles premium subscription management, status checks, and feature limits.
 * This controller provides endpoints for:
 * - Checking premium status
 * - Getting feature limits
 * - Managing subscriptions (grant, extend, revoke)
 */

const userService = require('../services/pgUserService');
const {
  checkPremiumStatus,
  getUserFeatureLimits,
  getPremiumStatusResponse,
  grantPremium,
  extendPremium
} = require('../middleware/premium');

/**
 * @desc    Get current user's premium status
 * @route   GET /api/v1/premium/status
 * @access  Private
 */
const getPremiumStatus = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const response = getPremiumStatusResponse(user);
    res.json(response);
  } catch (error) {
    console.error('Get premium status error:', error);
    next(error);
  }
};

/**
 * @desc    Get feature limits for current user
 * @route   GET /api/v1/premium/features
 * @access  Private
 */
const getFeatureLimits = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const limits = getUserFeatureLimits(user);
    
    res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    console.error('Get feature limits error:', error);
    next(error);
  }
};

/**
 * @desc    Get premium statistics (Admin only)
 * @route   GET /api/v1/premium/stats
 * @access  Private/Admin
 */
const getPremiumStats = async (req, res, next) => {
  try {
    // TODO: Add admin authorization check
    // if (!req.user.isAdmin) { return res.status(403).json(...); }
    
    const stats = await userService.getPremiumStats();
    const activePremiumUsers = await userService.getActivePremiumUsers();
    const expiringUsers = await userService.getUsersWithExpiringPremium(7);
    
    res.json({
      success: true,
      data: {
        summary: stats,
        activePremiumCount: activePremiumUsers.length,
        expiringCount: expiringUsers.length,
        recentActivePremium: activePremiumUsers.slice(0, 10).map(u => ({
          id: u.id,
          username: u.username,
          expiresAt: u.premium_expires_at
        })),
        recentExpiring: expiringUsers.slice(0, 10).map(u => ({
          id: u.id,
          username: u.username,
          expiresAt: u.premium_expires_at,
          daysRemaining: u.days_remaining
        }))
      }
    });
  } catch (error) {
    console.error('Get premium stats error:', error);
    next(error);
  }
};

/**
 * @desc    Grant premium to a user (Admin only)
 * @route   POST /api/v1/premium/grant
 * @access  Private/Admin
 */
const grantPremiumToUser = async (req, res, next) => {
  try {
    // TODO: Add admin authorization check
    // if (!req.user.isAdmin) { return res.status(403).json(...); }
    
    const { userId, durationMonths } = req.body;
    
    if (!userId || !durationMonths) {
      return res.status(400).json({
        success: false,
        message: 'userId and durationMonths are required'
      });
    }

    if (durationMonths < 1 || durationMonths > 120) {
      return res.status(400).json({
        success: false,
        message: 'durationMonths must be between 1 and 120'
      });
    }

    const updatedUser = await userService.grantPremium(userId, durationMonths);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `Premium granted for ${durationMonths} month(s)`,
      data: {
        userId: updatedUser.id,
        username: updatedUser.username,
        premiumExpiresAt: updatedUser.premium_expires_at
      }
    });
  } catch (error) {
    console.error('Grant premium error:', error);
    next(error);
  }
};

/**
 * @desc    Revoke premium from a user (Admin only)
 * @route   POST /api/v1/premium/revoke
 * @access  Private/Admin
 */
const revokePremiumFromUser = async (req, res, next) => {
  try {
    // TODO: Add admin authorization check
    // if (!req.user.isAdmin) { return res.status(403).json(...); }
    
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const updatedUser = await userService.revokePremium(userId);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Premium revoked successfully',
      data: {
        userId: updatedUser.id,
        username: updatedUser.username,
        premiumExpiresAt: null
      }
    });
  } catch (error) {
    console.error('Revoke premium error:', error);
    next(error);
  }
};

/**
 * @desc    Process premium subscription purchase (Payment webhook)
 * @route   POST /api/v1/premium/subscribe
 * @access  Private
 */
const subscribeToPremium = async (req, res, next) => {
  try {
    const { planType, paymentId } = req.body;
    
    // Validate payment (integrate with Stripe, PayPal, etc.)
    // const paymentValid = await validatePayment(paymentId);
    // if (!paymentValid) { return res.status(400).json(...); }
    
    // Determine duration based on plan
    const durationMap = {
      'monthly': 1,
      'quarterly': 3,
      'annual': 12,
      'lifetime': 1200 // 100 years for lifetime
    };
    
    const duration = durationMap[planType] || 1;
    
    // Grant premium
    const updatedUser = await userService.grantPremium(req.user.id, duration);
    
    // Log subscription for analytics
    console.log({
      type: 'premium_subscription',
      userId: req.user.id,
      plan: planType,
      duration: duration,
      paymentId: paymentId,
      timestamp: new Date().toISOString()
    });
    
    // TODO: Send confirmation email
    // await sendPremiumConfirmationEmail(updatedUser.email, planType, updatedUser.premium_expires_at);
    
    res.json({
      success: true,
      message: 'Premium subscription activated',
      data: {
        isPremium: true,
        premiumExpiresAt: updatedUser.premium_expires_at,
        plan: planType
      }
    });
  } catch (error) {
    console.error('Subscribe to premium error:', error);
    next(error);
  }
};

/**
 * @desc    Cancel premium subscription (set to expire at end of period)
 * @route   POST /api/v1/premium/cancel
 * @access  Private
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    
    if (!user || !user.premium_expires_at) {
      return res.status(400).json({
        success: false,
        message: 'No active premium subscription found'
      });
    }

    // Don't revoke immediately - let it expire naturally
    // Optionally: Cancel auto-renewal in payment processor
    // await cancelAutoRenewal(user.stripeCustomerId);
    
    res.json({
      success: true,
      message: 'Subscription cancelled. Premium access will continue until expiration.',
      data: {
        premiumExpiresAt: user.premium_expires_at,
        willExpireIn: Math.ceil((new Date(user.premium_expires_at) - new Date()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    next(error);
  }
};

/**
 * @desc    Get users with expiring premium (Admin only)
 * @route   GET /api/v1/premium/expiring
 * @access  Private/Admin
 */
const getExpiringUsers = async (req, res, next) => {
  try {
    // TODO: Add admin authorization check
    
    const { days = 7 } = req.query;
    const expiringUsers = await userService.getUsersWithExpiringPremium(parseInt(days));
    
    res.json({
      success: true,
      data: {
        count: expiringUsers.length,
        users: expiringUsers.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          premiumExpiresAt: u.premium_expires_at,
          daysRemaining: u.days_remaining
        }))
      }
    });
  } catch (error) {
    console.error('Get expiring users error:', error);
    next(error);
  }
};

/**
 * @desc    Get recently expired premium users (Admin only)
 * @route   GET /api/v1/premium/expired
 * @access  Private/Admin
 */
const getExpiredUsers = async (req, res, next) => {
  try {
    // TODO: Add admin authorization check
    
    const { days = 30 } = req.query;
    const expiredUsers = await userService.getExpiredPremiumUsers(parseInt(days));
    
    res.json({
      success: true,
      data: {
        count: expiredUsers.length,
        users: expiredUsers.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          premiumExpiredAt: u.premium_expires_at,
          daysSinceExpired: u.days_since_expired
        }))
      }
    });
  } catch (error) {
    console.error('Get expired users error:', error);
    next(error);
  }
};

module.exports = {
  getPremiumStatus,
  getFeatureLimits,
  getPremiumStats,
  grantPremiumToUser,
  revokePremiumFromUser,
  subscribeToPremium,
  cancelSubscription,
  getExpiringUsers,
  getExpiredUsers
};
