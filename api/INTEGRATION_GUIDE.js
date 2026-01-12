/**
 * Integration Instructions for Main App
 * 
 * Follow these steps to integrate the premium system into your existing app.
 */

// ============================================
// STEP 1: Add Premium Routes to Main App
// ============================================

// In your main server.js or app.js file:
const premiumRoutes = require('./routes/premiumRoutes');

// Add the routes
app.use('/api/v1/premium', premiumRoutes);

// ============================================
// STEP 2: Add Premium Info Middleware (RECOMMENDED)
// ============================================

// This makes premium info available on every authenticated request
const { attachPremiumInfo } = require('./middleware/premium');

// Add after your authentication middleware
app.use(authenticate); // Your existing auth middleware
app.use(attachPremiumInfo); // Add this line

// Now in any controller, you have:
// req.isPremium (boolean)
// req.premiumExpiresAt (timestamp or null)
// req.daysRemaining (number or null)
// req.getFeatureLimits(category) (function)
// req.canPerformAction(category, action, currentValue) (function)

// ============================================
// STEP 3: Protect Premium-Only Endpoints
// ============================================

// Example: In your existing routes
const { requirePremium } = require('./middleware/premium');

// Protect specific endpoints
router.get('/api/v1/analytics/advanced', authenticate, requirePremium, analyticsController.getAdvanced);
router.post('/api/v1/goals/export', authenticate, requirePremium, goalController.exportGoals);
router.get('/api/v1/insights/ai', authenticate, requirePremium, insightsController.getAI);

// ============================================
// STEP 4: Add Feature Limits to Existing Endpoints
// ============================================

// Example: In your goalRoutes.js
const { checkFeatureLimit } = require('./middleware/premium');
const goalService = require('./services/goalService');

router.post('/api/v1/goals',
  authenticate,
  checkFeatureLimit('goals', 'maxActiveGoals', async (req) => {
    // Return current count to compare against limit
    return await goalService.countActiveGoals(req.user.id);
  }),
  goalController.createGoal
);

// Example: In your habitRoutes.js
router.post('/api/v1/habits',
  authenticate,
  checkFeatureLimit('habits', 'maxActiveHabits', async (req) => {
    return await habitService.countActiveHabits(req.user.id);
  }),
  habitController.createHabit
);

// Example: In your journalRoutes.js
router.post('/api/v1/journal',
  authenticate,
  checkFeatureLimit('journal', 'maxEntriesPerDay', async (req) => {
    return await journalService.countTodayEntries(req.user.id);
  }),
  journalController.createEntry
);

// ============================================
// STEP 5: Update Existing Controllers (Manual Checks)
// ============================================

// In controllers where you need custom logic:
const { validateFeatureAccess, getUserFeatureLimits } = require('./middleware/premium');
const userService = require('./services/pgUserService');

// Example: In your existing goalController.js
const createGoal = async (req, res, next) => {
  try {
    // ... your existing validation ...
    
    // Add premium check (if not using middleware)
    const user = await userService.findById(req.user.id);
    const currentGoals = await goalService.countActiveGoals(req.user.id);
    
    const validation = await validateFeatureAccess(
      user,
      'goals',
      'maxActiveGoals',
      currentGoals
    );
    
    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: `You've reached your goal limit (${validation.limit})`,
        upgradeUrl: '/premium/plans'
      });
    }
    
    // ... rest of your existing code ...
    const goal = await goalService.create(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      data: goal
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// STEP 6: Update getUserProfile or getMe Endpoint
// ============================================

// In your authController.js or userController.js:
const { checkPremiumStatus, getUserFeatureLimits } = require('./middleware/premium');

const getMe = async (req, res, next) => {
  try {
    const user = await userService.findById(req.user.id);
    const premiumStatus = checkPremiumStatus(user);
    const featureLimits = getUserFeatureLimits(user);
    
    // Your existing sanitization
    const sanitizedUser = sanitizeAuthMe(user);
    
    res.json({
      success: true,
      data: {
        user: sanitizedUser,
        premium: premiumStatus,
        limits: featureLimits.features // Optional: send feature limits
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// STEP 7: Add Payment Processing Integration
// ============================================

// Create a new controller for payment webhooks
// Example: paymentController.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const userService = require('./services/pgUserService');

// Stripe webhook handler
const handleStripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.metadata.userId;
        const planType = session.metadata.planType;
        
        // Determine duration based on plan
        const durationMap = {
          'monthly': 1,
          'quarterly': 3,
          'annual': 12
        };
        const duration = durationMap[planType] || 1;
        
        // Grant premium
        await userService.grantPremium(userId, duration);
        
        // Send confirmation email
        await sendPremiumConfirmationEmail(userId, planType);
        
        console.log(`Premium granted to user ${userId} for ${duration} months`);
        break;
      
      case 'customer.subscription.deleted':
        // Don't revoke immediately - let it expire naturally
        console.log('Subscription cancelled:', event.data.object.id);
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// ============================================
// STEP 8: Create Cron Job for Expiration Reminders
// ============================================

// Create: cron/premiumReminderJob.js
const cron = require('node-cron');
const userService = require('../services/pgUserService');
const emailService = require('../services/emailService');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running premium expiration check...');
    
    // Get users expiring in 7 days
    const expiringUsers = await userService.getUsersWithExpiringPremium(7);
    
    for (const user of expiringUsers) {
      await emailService.sendExpirationWarning(
        user.email,
        user.name,
        user.days_remaining
      );
      console.log(`Sent expiration warning to ${user.email}`);
    }
    
    // Get users who expired yesterday (for win-back)
    const recentlyExpired = await userService.getExpiredPremiumUsers(1);
    
    for (const user of recentlyExpired) {
      await emailService.sendWinBackEmail(user.email, user.name);
      console.log(`Sent win-back email to ${user.email}`);
    }
    
    console.log(`Premium check complete. Expiring: ${expiringUsers.length}, Expired: ${recentlyExpired.length}`);
  } catch (error) {
    console.error('Premium reminder job error:', error);
  }
});

// ============================================
// STEP 9: Add to Main Server Startup
// ============================================

// In your main server.js:
const premiumReminderJob = require('./cron/premiumReminderJob');

// Job starts automatically when required

// ============================================
// STEP 10: Environment Variables
// ============================================

// Add to your .env file:
/*
# Premium/Payment Settings
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PREMIUM_MONTHLY_PRICE_ID=price_...
PREMIUM_ANNUAL_PRICE_ID=price_...

# Frontend URLs
FRONTEND_URL=https://yourapp.com
PREMIUM_PLANS_URL=https://yourapp.com/premium
*/

// ============================================
// STEP 11: Update Frontend Integration
// ============================================

// Example frontend code (React/Vue/etc):
/*
// Fetch user with premium status
const { data } = await api.get('/api/v1/auth/me');
console.log(data.premium.isPremium); // true/false
console.log(data.premium.daysRemaining); // 365

// Check feature limits
const { data: limits } = await api.get('/api/v1/premium/features');
console.log(limits.features.goals.maxActiveGoals); // 10 or -1 (unlimited)

// Show premium badge
{user.premium.isPremium && <PremiumBadge />}

// Disable features for free users
<button 
  disabled={!user.premium.isPremium}
  onClick={exportData}
>
  Export Data {!user.premium.isPremium && '(Premium)'}
</button>

// Show upgrade prompt
{!user.premium.isPremium && currentGoals >= 10 && (
  <Alert>
    You've reached your goal limit. 
    <Link to="/premium">Upgrade to Premium</Link> for unlimited goals!
  </Alert>
)}
*/

// ============================================
// COMPLETE INTEGRATION CHECKLIST
// ============================================

/*
Database:
☐ Run migration: 003_add_premium_support.sql
☐ Verify premium_expires_at column exists
☐ Test database functions

Backend:
☐ Add premium routes to main app
☐ Add attachPremiumInfo middleware
☐ Protect premium-only endpoints with requirePremium
☐ Add feature limit checks to creation endpoints
☐ Update getMe/profile endpoints to include premium status
☐ Set up payment webhook handler
☐ Configure environment variables
☐ Set up cron job for expiration reminders
☐ Test granting/revoking premium

Frontend:
☐ Update user state to include premium info
☐ Show/hide features based on premium status
☐ Add premium badge to UI
☐ Create upgrade prompts at feature limits
☐ Build premium landing/pricing page
☐ Integrate payment flow (Stripe Checkout, etc.)

Testing:
☐ Test free user hitting limits
☐ Test premium user with unlimited access
☐ Test expired premium user (reverts to free)
☐ Test payment flow end-to-end
☐ Test expiration reminders
☐ Test admin granting/revoking premium

Deployment:
☐ Deploy database migration
☐ Deploy backend changes
☐ Deploy frontend changes
☐ Configure payment provider (Stripe, etc.)
☐ Set up monitoring/analytics
☐ Test in production
*/

// ============================================
// EXAMPLE: Complete Express App Integration
// ============================================

/*
// server.js or app.js

const express = require('express');
const app = express();

// Middleware
const { authenticate } = require('./middleware/auth');
const { attachPremiumInfo } = require('./middleware/premium');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goalRoutes');
const habitRoutes = require('./routes/habitRoutes');
const journalRoutes = require('./routes/journalRoutes');
const premiumRoutes = require('./routes/premiumRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes
app.use('/api/v1/auth', authRoutes);

// Protected routes (require authentication)
app.use(authenticate);
app.use(attachPremiumInfo); // Add premium info to all authenticated requests

app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/journal', journalRoutes);
app.use('/api/v1/premium', premiumRoutes);
app.use('/api/v1/payment', paymentRoutes);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Premium system: ACTIVE ✓');
});
*/

module.exports = {
  // Export functions if needed for testing
};
