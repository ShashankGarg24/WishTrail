# Premium Feature System - Implementation Guide

## Overview

The WishTrail premium system uses a **timestamp-based expiration model** stored in PostgreSQL as the single source of truth. This approach is secure, scalable, and difficult to bypass.

## Architecture

### Database Layer
- **Field**: `premium_expires_at` (TIMESTAMP WITH TIME ZONE, nullable)
- **Location**: `users` table in PostgreSQL
- **Values**:
  - `NULL`: Free user (never had premium)
  - Future timestamp: Active premium user
  - Past timestamp: Expired premium user

### Configuration Layer
- **File**: `api/src/config/premiumFeatures.js`
- **Purpose**: Define all feature limits for free vs premium users
- **Single Source of Truth**: All feature restrictions are defined here

### Enforcement Layer
- **File**: `api/src/middleware/premium.js`
- **Purpose**: Middleware and utilities to enforce premium restrictions
- **Security**: Server-side validation prevents client-side bypass

## Database Setup

### 1. Run Migration

```sql
-- Execute the migration script
-- File: api/database/schemas/003_add_premium_support.sql
psql -h <host> -U <user> -d <database> -f api/database/schemas/003_add_premium_support.sql
```

### 2. Verify Schema

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'premium_expires_at';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND indexname LIKE '%premium%';
```

## Usage Examples

### 1. Check Premium Status in Controllers

```javascript
const { checkPremiumStatus } = require('../middleware/premium');

// In any controller
const getUserProfile = async (req, res) => {
  const user = await userService.findById(req.user.id);
  const premiumStatus = checkPremiumStatus(user);
  
  res.json({
    success: true,
    data: {
      user: user,
      premium: premiumStatus
    }
  });
};
```

### 2. Protect Premium-Only Routes

```javascript
const { requirePremium } = require('../middleware/premium');

// Only allow premium users to access this endpoint
router.get('/api/v1/analytics/advanced', 
  authenticate, 
  requirePremium, 
  analyticsController.getAdvanced
);

router.post('/api/v1/goals/export', 
  authenticate, 
  requirePremium, 
  goalController.exportGoals
);
```

### 3. Check Feature Limits

```javascript
const { checkFeatureLimit } = require('../middleware/premium');
const { getFeatureLimits } = require('../config/premiumFeatures');

// Check if user can create more goals
router.post('/api/v1/goals', 
  authenticate,
  checkFeatureLimit('goals', 'maxActiveGoals', async (req) => {
    // Return current count to compare against limit
    const currentGoalCount = await goalService.countActiveGoals(req.user.id);
    return currentGoalCount;
  }),
  goalController.createGoal
);
```

### 4. Manual Feature Validation

```javascript
const { validateFeatureAccess } = require('../middleware/premium');

const createHabit = async (req, res) => {
  const user = await userService.findById(req.user.id);
  const currentHabits = await habitService.countActiveHabits(user.id);
  
  // Validate if user can create more habits
  const validation = await validateFeatureAccess(
    user, 
    'habits', 
    'maxActiveHabits', 
    currentHabits
  );
  
  if (!validation.allowed) {
    return res.status(403).json({
      success: false,
      message: validation.reason,
      limit: validation.limit,
      current: currentHabits,
      upgradeUrl: '/premium/plans'
    });
  }
  
  // Create habit...
};
```

### 5. Get Feature Limits for UI

```javascript
const { getUserFeatureLimits } = require('../middleware/premium');

// Return all feature limits for frontend
const getFeatureLimits = async (req, res) => {
  const user = await userService.findById(req.user.id);
  const limits = getUserFeatureLimits(user);
  
  res.json({
    success: true,
    data: limits
  });
};
```

### 6. Grant Premium (Payment Processing)

```javascript
const userService = require('../services/pgUserService');
const { grantPremium } = require('../middleware/premium');

// After successful payment
const handlePaymentSuccess = async (userId, planDuration) => {
  // Grant premium for specified duration (in months)
  const expirationDate = grantPremium(planDuration);
  
  // Update user in database
  await userService.updatePremiumExpiration(userId, expirationDate);
  
  // Or use the service method directly
  await userService.grantPremium(userId, planDuration);
  
  console.log(`Premium granted to user ${userId} until ${expirationDate}`);
};
```

### 7. Attach Premium Info to All Requests

```javascript
const { attachPremiumInfo } = require('../middleware/premium');

// Add to your main router/app middleware stack
app.use(authenticate); // Your auth middleware
app.use(attachPremiumInfo); // Adds premium info to req object

// Now in any controller:
const someController = (req, res) => {
  // Premium info available on request
  console.log(req.isPremium); // boolean
  console.log(req.daysRemaining); // number or null
  
  // Helper functions available
  const goalLimits = req.getFeatureLimits('goals');
  const canExport = req.canPerformAction('analytics', 'canExportData');
};
```

## Feature Categories & Limits

### Goals
```javascript
// Free users
maxActiveGoals: 10
maxGoalsPerYear: 20
maxSubgoalsPerGoal: 5
canExportData: false

// Premium users
maxActiveGoals: unlimited
maxGoalsPerYear: unlimited
maxSubgoalsPerGoal: 20
canExportData: true
```

### Habits
```javascript
// Free users
maxActiveHabits: 5
historyRetentionDays: 90

// Premium users
maxActiveHabits: unlimited
historyRetentionDays: unlimited
advancedAnalytics: true
```

### Journal
```javascript
// Free users
maxEntriesPerDay: 3
maxEntryLength: 1000
canAddPhotos: false
retentionDays: 180

// Premium users
maxEntriesPerDay: unlimited
maxEntryLength: 5000
canAddPhotos: true
retentionDays: unlimited
```

### Social & Community
```javascript
// Free users
maxFollowing: 100
maxCommunitiesJoined: 5
canCreateCommunity: false

// Premium users
maxFollowing: 1000
maxCommunitiesJoined: 50
canCreateCommunity: true
maxOwnedCommunities: 5
```

**See `api/src/config/premiumFeatures.js` for complete list**

## Admin Operations

### Grant Premium to User

```javascript
const userService = require('../services/pgUserService');

// Grant 1 month premium
await userService.grantPremium(userId, 1);

// Grant 12 months (annual)
await userService.grantPremium(userId, 12);

// Grant 6 months
await userService.grantPremium(userId, 6);
```

### Revoke Premium

```javascript
await userService.revokePremium(userId);
```

### Get Premium Statistics

```javascript
const stats = await userService.getPremiumStats();
console.log(stats);
// {
//   active_premium_users: 150,
//   expired_premium_users: 45,
//   free_users: 1000,
//   expiring_soon_users: 12
// }
```

### Get Users with Expiring Premium

```javascript
// Get users with premium expiring in next 7 days
const expiringUsers = await userService.getUsersWithExpiringPremium(7);

// Send renewal reminders
expiringUsers.forEach(user => {
  sendRenewalEmail(user.email, user.days_remaining);
});
```

### Get Expired Premium Users (Re-engagement)

```javascript
// Get users whose premium expired in last 30 days
const expiredUsers = await userService.getExpiredPremiumUsers(30);

// Send win-back campaign
expiredUsers.forEach(user => {
  sendWinBackEmail(user.email, user.days_since_expired);
});
```

## Frontend Integration

### Get User Premium Status

```javascript
// GET /api/v1/premium/status
fetch('/api/v1/premium/status', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => {
  console.log(data.isPremium); // true/false
  console.log(data.premiumExpiresAt); // timestamp or null
  console.log(data.daysRemaining); // number or null
  console.log(data.features); // all feature limits
});
```

### Show Premium Badge

```javascript
if (user.isPremium) {
  return <Badge>Premium</Badge>;
}
```

### Check Feature Availability

```javascript
// Client-side check (for UI only - not for security)
if (user.isPremium || currentGoals < 10) {
  // Show "Create Goal" button
} else {
  // Show "Upgrade to Premium" button
}

// Note: Always validate server-side as well!
```

## Security Best Practices

### ✅ DO

1. **Always check premium status server-side**
   ```javascript
   // Good
   router.post('/api/goals', authenticate, requirePremium, createGoal);
   ```

2. **Use database timestamp as source of truth**
   ```javascript
   // Good
   const isPremium = user.premium_expires_at && 
                     new Date(user.premium_expires_at) > new Date();
   ```

3. **Validate on every request**
   ```javascript
   // Good - middleware runs on every request
   app.use(authenticate);
   app.use(attachPremiumInfo);
   ```

4. **Use provided utility functions**
   ```javascript
   // Good
   const { isPremiumActive } = require('../config/premiumFeatures');
   const active = isPremiumActive(user.premium_expires_at);
   ```

### ❌ DON'T

1. **Don't trust client-side checks**
   ```javascript
   // Bad - client can modify this
   if (req.body.isPremium) {
     allowPremiumFeature();
   }
   ```

2. **Don't store boolean flags**
   ```javascript
   // Bad - can get out of sync
   user.isPremium = true;
   user.premiumExpiresAt = someDate;
   ```

3. **Don't skip validation**
   ```javascript
   // Bad - no validation
   router.post('/api/export', createExport); // Missing auth & premium check!
   ```

4. **Don't hardcode limits in controllers**
   ```javascript
   // Bad - limits should be in premiumFeatures.js
   if (goalCount >= 10 && !user.isPremium) {
     return error();
   }
   ```

## Monitoring & Analytics

### Track Premium Conversions

```javascript
// Log when free users hit limits
const logFeatureLimitReached = (userId, feature) => {
  analytics.track('Feature Limit Reached', {
    userId,
    feature,
    timestamp: new Date()
  });
};
```

### Monitor Premium Access Attempts

```javascript
// Track premium feature access attempts
const logPremiumAccessAttempt = (userId, endpoint) => {
  analytics.track('Premium Feature Attempted', {
    userId,
    endpoint,
    isPremium: false
  });
};
```

## Cron Jobs

### Daily Premium Check

```javascript
// cron/premiumJobs.js
const cron = require('node-cron');
const userService = require('../services/pgUserService');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  // Send expiration warnings
  const expiringUsers = await userService.getUsersWithExpiringPremium(7);
  for (const user of expiringUsers) {
    await sendExpirationWarning(user);
  }
  
  // Get premium stats
  const stats = await userService.getPremiumStats();
  await sendAdminReport(stats);
});
```

## Testing

### Unit Tests

```javascript
const { isPremiumActive, canPerformAction } = require('../config/premiumFeatures');

describe('Premium Features', () => {
  it('should identify active premium', () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    expect(isPremiumActive(futureDate)).toBe(true);
  });
  
  it('should identify expired premium', () => {
    const pastDate = new Date('2020-01-01');
    expect(isPremiumActive(pastDate)).toBe(false);
  });
  
  it('should enforce free user limits', () => {
    const check = canPerformAction('goals', 'maxActiveGoals', null, 10);
    expect(check.allowed).toBe(false);
  });
  
  it('should allow premium users unlimited goals', () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    const check = canPerformAction('goals', 'maxActiveGoals', futureDate, 1000);
    expect(check.allowed).toBe(true);
  });
});
```

## Troubleshooting

### User shows as free but should be premium

```sql
-- Check database value
SELECT id, username, premium_expires_at, 
       premium_expires_at > CURRENT_TIMESTAMP as is_active
FROM users 
WHERE id = <user_id>;
```

### Premium not working after payment

1. Verify database was updated
2. Check timezone issues (all timestamps should be UTC)
3. Ensure user logs out and back in (JWT may need refresh)
4. Check middleware is properly configured

### Feature limits not enforced

1. Verify middleware is attached to route
2. Check if bypass logic exists in controller
3. Ensure premiumFeatures.js is properly configured
4. Check for typos in feature category/action names

## Support

For issues or questions:
- Check this README
- Review `premiumFeatures.js` for available features
- Inspect `premium.js` middleware for utilities
- Check database migration was applied

---

**Last Updated**: 2026-01-13
**Version**: 1.0.0
