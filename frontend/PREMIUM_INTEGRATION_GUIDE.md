# Premium System - Frontend Integration Guide

## Overview

This guide explains how to integrate premium features into your React frontend components. The premium system enforces limits at both frontend (UX) and backend (security) layers.

## Quick Start

### 1. Import Required Hooks and Components

```javascript
import { 
  usePremiumStatus, 
  useGoalLimits, 
  useHabitLimits, 
  useJournalLimits 
} from '../hooks/usePremium';
import { 
  LimitIndicator, 
  UpgradeModal, 
  FeatureLock,
  PremiumBadge 
} from '../components/premium/PremiumComponents';
```

### 2. Check Premium Status in Components

```javascript
function MyComponent() {
  const { isPremium, daysRemaining, isExpiringSoon } = usePremiumStatus();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Your component logic
}
```

### 3. Enforce Limits Before Actions

```javascript
const handleCreateGoal = async () => {
  const goalLimits = useGoalLimits(currentGoalCount);
  
  // Frontend validation (UX)
  if (!goalLimits.canCreate) {
    setShowUpgradeModal(true);
    return;
  }
  
  // API call (backend validates too)
  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(goalData)
  });
  
  // Handle premium limit error from backend
  if (response.status === 403) {
    const data = await response.json();
    if (data.requiresPremium) {
      setShowUpgradeModal(true);
    }
  }
};
```

## Available Hooks

### `usePremiumStatus()`

Returns user's premium status.

```javascript
const { 
  isPremium,        // boolean: true if user has active premium
  isFree,           // boolean: true if user is on free tier
  premiumExpiresAt, // Date: when premium expires
  daysRemaining,    // number: days until expiration
  isExpiringSoon    // boolean: true if expires in < 7 days
} = usePremiumStatus();
```

### `useGoalLimits(currentGoalCount)`

Returns goal-related limits and validation.

```javascript
const {
  maxGoals,        // number | '∞': max active goals allowed
  currentGoals,    // number: current goal count
  canCreate,       // boolean: can create new goal
  remaining,       // number | '∞': remaining slots
  maxSubgoals,     // number: max subgoals per goal
  percentUsed,     // number: percentage of limit used
  isPremium        // boolean: premium status
} = useGoalLimits(goals.length);
```

### `useHabitLimits(currentHabitCount)`

Returns habit-related limits and validation.

```javascript
const {
  maxHabits,        // number | '∞': max active habits allowed
  currentHabits,    // number: current habit count
  canCreate,        // boolean: can create new habit
  remaining,        // number | '∞': remaining slots
  canSetReminders,  // boolean: can set reminders
  percentUsed,      // number: percentage of limit used
  isPremium         // boolean: premium status
} = useHabitLimits(habits.length);
```

### `useJournalLimits(todayEntryCount)`

Returns journal-related limits and validation.

```javascript
const {
  maxEntries,      // number | '∞': max entries per day
  todayEntries,    // number: entries created today
  canCreate,       // boolean: can create new entry
  remaining,       // number | '∞': remaining entries today
  maxLength,       // number: max entry length in characters
  canExport,       // boolean: can export journal
  percentUsed,     // number: percentage of daily limit used
  isPremium        // boolean: premium status
} = useJournalLimits(todayCount);
```

### `useCommunityLimits(joinedCount, ownedCount)`

Returns community-related limits and validation.

```javascript
const {
  maxJoined,             // number | '∞': max communities to join
  maxOwned,              // number | '∞': max communities to own
  joinedCount,           // number: current joined count
  ownedCount,            // number: current owned count
  canJoin,               // boolean: can join new community
  canCreate,             // boolean: can create new community
  canCreateCommunity,    // boolean: has create permission
  isPremium              // boolean: premium status
} = useCommunityLimits(joined, owned);
```

### `useAIFeatures()`

Returns AI feature access status.

```javascript
const {
  hasAccess,                 // boolean: has any AI access
  aiSuggestions,             // boolean: can use AI suggestions
  smartGoalRecommendations,  // boolean: can use smart recommendations
  aiJournalPrompts,          // boolean: can use journal prompts
  aiInsights,                // boolean: can use AI insights
  maxRequestsPerDay,         // number: max AI requests per day
  isPremium                  // boolean: premium status
} = useAIFeatures();
```

### `useAnalyticsFeatures()`

Returns analytics feature access status.

```javascript
const {
  basicStats,         // boolean: can view basic stats
  advancedInsights,   // boolean: can view advanced insights
  customReports,      // boolean: can create custom reports
  isPremium           // boolean: premium status
} = useAnalyticsFeatures();
```

## UI Components

### `<PremiumBadge />`

Displays a premium badge for premium users.

```javascript
<PremiumBadge className="ml-2" />
```

### `<PremiumExpiryWarning />`

Shows warning when premium is expiring soon (< 7 days).

```javascript
<PremiumExpiryWarning className="mb-4" />
```

### `<LimitIndicator />`

Shows current usage vs limit with progress bar.

```javascript
<LimitIndicator
  current={goals.length}
  max={goalLimits.maxGoals}
  label="Active Goals"
  showPercentage={true}
  className="mb-4"
/>
```

### `<FeatureLock />`

Locks premium-only features with overlay.

```javascript
<FeatureLock
  isLocked={!isPremium}
  onUpgradeClick={() => setShowUpgradeModal(true)}
  message="AI features require premium"
>
  <AIFeaturesComponent />
</FeatureLock>
```

### `<UpgradePrompt />`

Shows upgrade prompt with comparison.

```javascript
<UpgradePrompt
  title="Upgrade to Premium"
  message="You've reached your goal limit"
  feature="Active Goals"
  currentLimit={5}
  premiumLimit={10}
  onUpgrade={() => setShowUpgradeModal(true)}
  onCancel={() => setShowPrompt(false)}
/>
```

### `<UpgradeModal />`

Full-featured upgrade modal with pricing plans.

```javascript
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  preselectedPlan="annual"
/>
```

### `<PremiumFeatureComparison />`

Table comparing free vs premium features.

```javascript
<PremiumFeatureComparison className="mb-6" />
```

## Integration Patterns

### Pattern 1: Goal Creation Form

```javascript
import { useGoalLimits, usePremiumStatus } from '../hooks/usePremium';
import { LimitIndicator, UpgradeModal } from '../components/premium/PremiumComponents';

function GoalCreationForm() {
  const [goals, setGoals] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const goalLimits = useGoalLimits(goals.length);
  const { isPremium } = usePremiumStatus();
  
  const handleSubmit = async (data) => {
    // Frontend check
    if (!goalLimits.canCreate) {
      setShowUpgradeModal(true);
      return;
    }
    
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // Backend returned premium limit error
      if (response.status === 403) {
        const result = await response.json();
        if (result.requiresPremium) {
          setShowUpgradeModal(true);
        }
        return;
      }
      
      if (response.ok) {
        const result = await response.json();
        setGoals([...goals, result.goal]);
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };
  
  return (
    <div>
      <LimitIndicator
        current={goals.length}
        max={goalLimits.maxGoals}
        label="Active Goals"
      />
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="title"
          disabled={!goalLimits.canCreate}
        />
        
        <button 
          type="submit"
          disabled={!goalLimits.canCreate}
        >
          {goalLimits.canCreate ? 'Create Goal' : 'Limit Reached'}
        </button>
      </form>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
```

### Pattern 2: Feature Lock

```javascript
import { useAIFeatures } from '../hooks/usePremium';
import { FeatureLock } from '../components/premium/PremiumComponents';

function AIInsightsPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { hasAccess } = useAIFeatures();
  
  return (
    <FeatureLock
      isLocked={!hasAccess}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      message="AI Insights require premium"
    >
      <AIInsightsContent />
    </FeatureLock>
  );
}
```

### Pattern 3: Conditional Rendering

```javascript
import { usePremiumStatus } from '../hooks/usePremium';

function SettingsPage() {
  const { isPremium } = usePremiumStatus();
  
  return (
    <div>
      <h2>Settings</h2>
      
      {/* Show to all users */}
      <BasicSettings />
      
      {/* Show only to premium users */}
      {isPremium && (
        <AdvancedSettings />
      )}
      
      {/* Show upgrade button to free users */}
      {!isPremium && (
        <button onClick={() => setShowUpgradeModal(true)}>
          Upgrade to unlock advanced settings
        </button>
      )}
    </div>
  );
}
```

### Pattern 4: Daily Limit Tracking (Journal)

```javascript
import { useJournalLimits } from '../hooks/usePremium';

function JournalEntryForm() {
  const [todayEntries, setTodayEntries] = useState([]);
  const journalLimits = useJournalLimits(todayEntries.length);
  
  useEffect(() => {
    // Fetch today's entries
    fetchTodayEntries();
  }, []);
  
  const handleCreate = async (content) => {
    if (!journalLimits.canCreate) {
      alert(`Daily limit reached (${journalLimits.maxEntries} entries/day)`);
      setShowUpgradeModal(true);
      return;
    }
    
    // Create entry
    const response = await fetch('/api/journal/entries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (response.status === 403) {
      setShowUpgradeModal(true);
    }
  };
  
  return (
    <div>
      <LimitIndicator
        current={journalLimits.todayEntries}
        max={journalLimits.maxEntries}
        label="Journal Entries Today"
      />
      
      <textarea
        maxLength={journalLimits.maxLength}
        disabled={!journalLimits.canCreate}
      />
      
      <p className="text-xs text-gray-500">
        {content.length} / {journalLimits.maxLength} characters
      </p>
      
      <button 
        onClick={handleCreate}
        disabled={!journalLimits.canCreate}
      >
        Create Entry ({journalLimits.remaining} remaining today)
      </button>
    </div>
  );
}
```

## Best Practices

### 1. Always Validate on Backend

**❌ BAD - Only frontend check:**
```javascript
if (!isPremium) {
  alert('Premium required');
  return;
}
// No backend validation
```

**✅ GOOD - Frontend + Backend:**
```javascript
// Frontend check (UX)
if (!goalLimits.canCreate) {
  setShowUpgradeModal(true);
  return;
}

// Backend validates too (security)
const response = await fetch('/api/goals', { method: 'POST', ... });
if (response.status === 403) {
  // Handle backend rejection
}
```

### 2. Fetch Current Counts

Always fetch actual counts from the server, don't rely on Redux state alone.

```javascript
useEffect(() => {
  async function fetchGoals() {
    const response = await fetch('/api/goals');
    const data = await response.json();
    setGoals(data.goals);
  }
  fetchGoals();
}, []);
```

### 3. Handle Backend Errors Gracefully

```javascript
try {
  const response = await fetch('/api/goals', { ... });
  
  if (response.status === 403) {
    const data = await response.json();
    if (data.requiresPremium) {
      setShowUpgradeModal(true);
      return;
    }
  }
  
  if (!response.ok) {
    throw new Error('Failed to create goal');
  }
  
  // Success
} catch (error) {
  console.error(error);
  alert('Failed to create goal. Please try again.');
}
```

### 4. Show Clear Limit Information

```javascript
// ✅ GOOD - Clear feedback
<div>
  <LimitIndicator current={5} max={5} label="Active Goals" />
  <p>You've used all 5 goal slots. Upgrade for 10 goals.</p>
  <button onClick={showUpgrade}>Upgrade Now</button>
</div>

// ❌ BAD - Vague message
<div>
  <p>Cannot create goal</p>
</div>
```

### 5. Disable Actions at Limit

```javascript
<button
  onClick={handleCreate}
  disabled={!goalLimits.canCreate}
  className={goalLimits.canCreate ? 'bg-blue-500' : 'bg-gray-300 cursor-not-allowed'}
>
  {goalLimits.canCreate ? 'Create Goal' : `Limit Reached (${goalLimits.maxGoals})`}
</button>
```

## Testing Premium Features

### Test with Free User

```javascript
// In Redux state or local storage, set:
user.premium_expires_at = null; // Free user

// Expected behavior:
// - maxActiveGoals = 5
// - maxActiveHabits = 5
// - maxEntriesPerDay = 1
// - canSetReminders = false
// - canExport = false
```

### Test with Premium User

```javascript
// Set future expiration
const futureDate = new Date();
futureDate.setFullYear(futureDate.getFullYear() + 1);
user.premium_expires_at = futureDate.toISOString();

// Expected behavior:
// - maxActiveGoals = 10
// - maxActiveHabits = 10
// - maxEntriesPerDay = 5
// - canSetReminders = true
// - canExport = true
```

### Test Expiring Premium

```javascript
// Set expiration in 3 days
const soonDate = new Date();
soonDate.setDate(soonDate.getDate() + 3);
user.premium_expires_at = soonDate.toISOString();

// Expected behavior:
// - isPremium = true
// - isExpiringSoon = true
// - daysRemaining = 3
// - Shows expiry warning
```

## Common Issues

### Issue 1: Hook returns null/undefined

**Cause:** User object not in Redux state
**Solution:** Ensure auth reducer stores user with `premium_expires_at`

```javascript
// In auth reducer
case 'LOGIN_SUCCESS':
  return {
    ...state,
    user: action.payload.user, // Must include premium_expires_at
    token: action.payload.token
  };
```

### Issue 2: Limits not updating after upgrade

**Cause:** Stale Redux state
**Solution:** Refetch user data after upgrade

```javascript
const handleUpgradeSuccess = async () => {
  // Refetch user to get updated premium_expires_at
  const response = await fetch('/api/auth/me');
  const data = await response.json();
  dispatch({ type: 'UPDATE_USER', payload: data.user });
};
```

### Issue 3: User bypasses frontend check

**Cause:** Only frontend validation
**Solution:** Backend ALWAYS validates (already implemented)

```javascript
// Backend validates in controller:
// api/src/controllers/goalController.js
// Even if frontend is bypassed, backend rejects
```

## Security Notes

1. **Frontend limits are for UX ONLY** - They improve user experience by preventing unnecessary API calls, but they provide ZERO security.

2. **Backend is the security layer** - All limits are enforced in the backend controllers with database queries.

3. **Never trust client-side data** - Users can modify JavaScript, so backend must always validate.

4. **Token-based auth** - Premium status comes from JWT or session, not client state.

## Example Files

See these example files for complete integration:
- `/frontend/src/examples/GoalCreationExample.jsx` - Full goal creation with limits
- `/frontend/src/components/premium/PremiumComponents.jsx` - All UI components
- `/frontend/src/components/premium/UpgradeModal.jsx` - Upgrade flow

## Next Steps

1. **Update your existing components** to use premium hooks
2. **Add LimitIndicators** to creation forms
3. **Show UpgradeModal** when limits are reached
4. **Add PremiumBadge** to user profile/nav
5. **Lock premium features** using FeatureLock component
6. **Test thoroughly** with free and premium accounts
