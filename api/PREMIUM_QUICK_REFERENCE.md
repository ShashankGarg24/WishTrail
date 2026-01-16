# Premium System - Quick Reference Card

## 🎯 Core Concept
```
Database stores: premium_expires_at (timestamp or NULL)
System checks: is premium_expires_at > NOW()?
Result: ✅ Active Premium OR ❌ Free User
```

## 📁 Key Files
```
api/database/schemas/003_add_premium_support.sql   ← Database migration
api/src/config/premiumFeatures.js                   ← Feature limits (EDIT THIS)
api/src/middleware/premium.js                       ← Middleware & utilities
api/src/services/pgUserService.js                   ← User service (updated)
api/src/controllers/premiumController.js            ← Premium API endpoints
api/src/routes/premiumRoutes.js                     ← Premium routes
```

## 🚀 3-Step Integration

### 1. Run Migration
```bash
psql -h <host> -U <user> -d <db> -f api/database/schemas/003_add_premium_support.sql
```

### 2. Add Routes
```javascript
// In app.js
const premiumRoutes = require('./routes/premiumRoutes');
app.use('/api/v1/premium', premiumRoutes);
```

### 3. Protect Endpoints
```javascript
const { requirePremium, checkFeatureLimit } = require('./middleware/premium');

// Block free users
router.get('/analytics/advanced', authenticate, requirePremium, controller);

// Check limits
router.post('/goals', authenticate, 
  checkFeatureLimit('goals', 'maxActiveGoals', async (req) => {
    return await goalService.countActiveGoals(req.user.id);
  }),
  controller
);
```

## 💎 Common Operations

### Grant Premium
```javascript
const userService = require('./services/pgUserService');

// Grant 1 month
await userService.grantPremium(userId, 1);

// Grant 12 months (annual)
await userService.grantPremium(userId, 12);
```

### Check Premium Status
```javascript
const { checkPremiumStatus } = require('./middleware/premium');

const user = await userService.findById(userId);
const status = checkPremiumStatus(user);
// { isPremium: true, premiumExpiresAt: ..., daysRemaining: 365 }
```

### Validate Feature Access
```javascript
const { validateFeatureAccess } = require('./middleware/premium');

const check = await validateFeatureAccess(user, 'goals', 'maxActiveGoals', 10);
if (!check.allowed) {
  return res.status(403).json({
    success: false,
    message: check.reason
    // ,
    // upgradeUrl: '/premium'
  });
}
```

## 📊 Feature Limits

| Feature | Free | Premium |
|---------|------|---------|
| **Goals** | 10 active | Unlimited |
| **Habits** | 5 active | Unlimited |
| **Journal** | 3/day | Unlimited |
| **Following** | 100 max | 1000 max |
| **Communities** | Join 5 | Join 50, Create 5 |
| **Storage** | 100 MB | 10 GB |
| **Export Data** | ❌ | ✅ |
| **AI Features** | ❌ | ✅ |
| **Analytics** | Basic | Advanced |

## 🛡️ Security Patterns

### ✅ DO
```javascript
// Always check server-side
router.post('/goals', authenticate, requirePremium, controller);

// Use database timestamp
const isPremium = user.premium_expires_at && 
                  new Date(user.premium_expires_at) > new Date();
```

### ❌ DON'T
```javascript
// Never trust client
if (req.body.isPremium) { /* BAD */ }

// Never use boolean flag
user.isPremium = true; // Can get out of sync
```

## 🔧 Admin Operations

```javascript
// Get statistics
const stats = await userService.getPremiumStats();
// { active_premium_users: 150, free_users: 1000, ... }

// Find expiring (for reminders)
const expiring = await userService.getUsersWithExpiringPremium(7);

// Find expired (for win-back)
const expired = await userService.getExpiredPremiumUsers(30);

// Revoke premium
await userService.revokePremium(userId);
```

## 📡 API Endpoints

```http
# User Endpoints
GET    /api/v1/premium/status          # Get my premium status
GET    /api/v1/premium/features        # Get my feature limits
POST   /api/v1/premium/subscribe       # Subscribe to premium
POST   /api/v1/premium/cancel          # Cancel subscription

# Admin Endpoints
GET    /api/v1/premium/stats           # Get overall statistics
GET    /api/v1/premium/expiring?days=7 # Get expiring users
GET    /api/v1/premium/expired?days=30 # Get expired users
POST   /api/v1/premium/grant           # Grant premium to user
POST   /api/v1/premium/revoke          # Revoke premium from user
```

## 🎨 Frontend Integration

```javascript
// Fetch premium status
const { data } = await api.get('/api/v1/premium/status');
console.log(data.isPremium); // true/false

// Show premium badge
{user.isPremium && <Badge>Premium</Badge>}

// Disable free features
<button disabled={!user.isPremium}>
  Export Data {!user.isPremium && '(Premium Only)'}
</button>

// Show upgrade prompt
{currentGoals >= 10 && !user.isPremium && (
  <Alert>
    Goal limit reached. <Link to="/premium">Upgrade</Link>
  </Alert>
)}
```

## 🐛 Troubleshooting

```sql
-- Check user's premium status
SELECT id, username, premium_expires_at,
       premium_expires_at > CURRENT_TIMESTAMP as is_active
FROM users WHERE id = ?;

-- Find all active premium users
SELECT COUNT(*) FROM users 
WHERE premium_expires_at > CURRENT_TIMESTAMP;

-- Manually set premium (testing)
UPDATE users 
SET premium_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE id = ?;
```

## 📚 Documentation

- **Full Guide**: `api/PREMIUM_IMPLEMENTATION_GUIDE.md`
- **Examples**: `api/src/controllers/premiumExamples.js`
- **Integration**: `api/INTEGRATION_GUIDE.js`
- **Summary**: `api/PREMIUM_SUMMARY.md`

## 🎯 Key Principles

1. **Database = Truth**: `premium_expires_at` is the ONLY source
2. **Server-Side**: Always validate on server, never trust client
3. **Centralized**: All limits in `premiumFeatures.js`
4. **Automatic**: No cron needed for expiration
5. **Scalable**: Works with millions of users

---

**Quick Start**: Run migration → Add routes → Protect endpoints → Done! 🚀
