# Quick Start: Update Your Existing Components

This guide shows you exactly how to add premium enforcement to your existing goal, habit, and journal components.

## Step 1: Update Auth Redux Store

First, ensure your auth reducer stores the premium expiration date.

### File: `frontend/src/store/authReducer.js` (or similar)

```javascript
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload.user, // Must include premium_expires_at
        token: action.payload.token,
        isAuthenticated: true
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case 'LOGOUT':
      return initialState;
    
    default:
      return state;
  }
}
```

### Update Login/Register API calls to include premium data:

```javascript
// frontend/src/services/authService.js
export const login = async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  const data = await response.json();
  
  // Ensure backend returns premium_expires_at
  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      premium_expires_at: data.user.premium_expires_at, // ← Important!
      // ... other fields
    },
    token: data.token
  };
};
```

## Step 2: Update Goal Creation Component

### Find your existing goal creation component (e.g., `GoalForm.jsx`, `CreateGoal.jsx`)

**Add these imports:**

```javascript
import { useGoalLimits, usePremiumStatus } from '../hooks/usePremium';
import { LimitIndicator, UpgradeModal } from '../components/premium/PremiumComponents';
```

**Add state and hooks:**

```javascript
function YourGoalComponent() {
  // Existing state
  const [goals, setGoals] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '' });
  
  // Add these:
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPremium } = usePremiumStatus();
  const goalLimits = useGoalLimits(goals.length);
  
  // ... rest of component
}
```

**Add limit indicator in JSX (before the form):**

```javascript
<LimitIndicator
  current={goals.length}
  max={goalLimits.maxGoals}
  label="Active Goals"
  className="mb-4"
/>
```

**Update form submit handler:**

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // ✅ Add this check
  if (!goalLimits.canCreate) {
    setShowUpgradeModal(true);
    return;
  }
  
  try {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yourToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    // ✅ Add this error handling
    if (response.status === 403) {
      const data = await response.json();
      if (data.requiresPremium) {
        setShowUpgradeModal(true);
        return;
      }
    }
    
    if (response.ok) {
      const data = await response.json();
      setGoals([...goals, data.goal]);
      setFormData({ title: '', description: '' });
    }
  } catch (error) {
    console.error('Failed to create goal:', error);
  }
};
```

**Disable form inputs when at limit:**

```javascript
<input
  type="text"
  value={formData.title}
  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
  disabled={!goalLimits.canCreate} // ← Add this
  className="..."
/>

<button
  type="submit"
  disabled={!goalLimits.canCreate} // ← Add this
  className="..."
>
  {goalLimits.canCreate ? 'Create Goal' : 'Limit Reached'}
</button>
```

**Add upgrade modal at the end:**

```javascript
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
/>
```

## Step 3: Update Habit Creation Component

### Find your habit creation component

**Imports:**

```javascript
import { useHabitLimits, usePremiumStatus } from '../hooks/usePremium';
import { LimitIndicator, UpgradeModal } from '../components/premium/PremiumComponents';
```

**State and hooks:**

```javascript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const { isPremium } = usePremiumStatus();
const habitLimits = useHabitLimits(habits.length);
```

**Limit indicator:**

```javascript
<LimitIndicator
  current={habits.length}
  max={habitLimits.maxHabits}
  label="Active Habits"
  className="mb-4"
/>
```

**Submit handler:**

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!habitLimits.canCreate) {
    setShowUpgradeModal(true);
    return;
  }
  
  // Your existing API call...
  
  // Add error handling for 403
  if (response.status === 403) {
    const data = await response.json();
    if (data.requiresPremium) {
      setShowUpgradeModal(true);
    }
  }
};
```

**For reminders (checkbox or toggle):**

```javascript
<label>
  <input
    type="checkbox"
    checked={formData.hasReminder}
    onChange={(e) => setFormData({ ...formData, hasReminder: e.target.checked })}
    disabled={!habitLimits.canSetReminders} // ← Disable if free user
  />
  Enable Reminders
  {!habitLimits.canSetReminders && (
    <span className="text-xs text-yellow-600 ml-2">
      (Premium only)
    </span>
  )}
</label>
```

## Step 4: Update Journal Entry Component

### Find your journal entry component

**Imports:**

```javascript
import { useJournalLimits } from '../hooks/usePremium';
import { LimitIndicator, UpgradeModal } from '../components/premium/PremiumComponents';
```

**State and hooks:**

```javascript
const [todayEntries, setTodayEntries] = useState([]);
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const journalLimits = useJournalLimits(todayEntries.length);
```

**Fetch today's entries:**

```javascript
useEffect(() => {
  async function fetchTodayEntries() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const response = await fetch(`/api/journal/entries?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setTodayEntries(data.entries || []);
  }
  fetchTodayEntries();
}, []);
```

**Limit indicator:**

```javascript
<LimitIndicator
  current={journalLimits.todayEntries}
  max={journalLimits.maxEntries}
  label="Entries Today"
  className="mb-4"
/>
```

**Character count:**

```javascript
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  maxLength={journalLimits.maxLength}
  disabled={!journalLimits.canCreate}
  className="..."
/>
<p className="text-xs text-gray-500">
  {content.length} / {journalLimits.maxLength} characters
</p>
```

**Submit handler:**

```javascript
const handleSubmit = async () => {
  if (!journalLimits.canCreate) {
    alert(`Daily limit reached (${journalLimits.maxEntries} entries/day)`);
    setShowUpgradeModal(true);
    return;
  }
  
  // Your existing API call...
  
  if (response.status === 403) {
    setShowUpgradeModal(true);
  }
};
```

**Export button (premium only):**

```javascript
<button
  onClick={handleExport}
  disabled={!journalLimits.canExport}
  className="..."
>
  {journalLimits.canExport ? 'Export Journal' : '🔒 Export (Premium)'}
</button>

{!journalLimits.canExport && (
  <p className="text-xs text-gray-500">
    <button onClick={() => setShowUpgradeModal(true)} className="underline">
      Upgrade to premium
    </button>
    {' '}to export your journal
  </p>
)}
```

## Step 5: Add Premium Badge to User Profile/Nav

### In your navigation component:

```javascript
import { usePremiumStatus } from '../hooks/usePremium';
import { PremiumBadge } from '../components/premium/PremiumComponents';

function Navigation() {
  const { isPremium } = usePremiumStatus();
  
  return (
    <nav>
      <div className="user-menu">
        <img src={user.avatar} alt="Profile" />
        <span>{user.name}</span>
        <PremiumBadge /> {/* ← Automatically shows if premium */}
      </div>
      
      {!isPremium && (
        <button onClick={() => navigate('/premium')}>
          ⭐ Upgrade
        </button>
      )}
    </nav>
  );
}
```

## Step 6: Add Expiry Warning (Premium Users)

### In your dashboard or profile page:

```javascript
import { PremiumExpiryWarning } from '../components/premium/PremiumComponents';

function Dashboard() {
  return (
    <div>
      <PremiumExpiryWarning className="mb-4" />
      {/* Rest of dashboard */}
    </div>
  );
}
```

## Step 7: Lock Premium-Only Features

### For AI features:

```javascript
import { useAIFeatures } from '../hooks/usePremium';
import { FeatureLock } from '../components/premium/PremiumComponents';

function AIInsightsSection() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { hasAccess } = useAIFeatures();
  
  return (
    <FeatureLock
      isLocked={!hasAccess}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      message="AI Insights require premium"
    >
      <div>
        {/* Your AI insights content */}
      </div>
    </FeatureLock>
  );
}
```

### For advanced analytics:

```javascript
import { useAnalyticsFeatures } from '../hooks/usePremium';

function AnalyticsPage() {
  const { basicStats, advancedInsights } = useAnalyticsFeatures();
  
  return (
    <div>
      {/* Everyone sees basic stats */}
      <BasicStatsComponent />
      
      {/* Only premium sees advanced */}
      {advancedInsights ? (
        <AdvancedInsightsComponent />
      ) : (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p>🔒 Advanced insights are available with premium</p>
          <button onClick={() => navigate('/premium')}>
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
```

## Step 8: Create Premium Page

### Create `frontend/src/pages/PremiumPage.jsx`:

```javascript
import React, { useState } from 'react';
import { usePremiumStatus } from '../hooks/usePremium';
import { PremiumFeatureComparison } from '../components/premium/PremiumComponents';
import { UpgradeModal } from '../components/premium/UpgradeModal';

export default function PremiumPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPremium, daysRemaining } = usePremiumStatus();
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Upgrade to Premium
        </h1>
        <p className="text-xl text-gray-600">
          Unlock all features and reach your goals faster
        </p>
      </div>
      
      {isPremium && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <p className="text-green-800">
            ✨ You're currently premium with {daysRemaining} days remaining.
          </p>
        </div>
      )}
      
      <PremiumFeatureComparison className="mb-12" />
      
      <div className="text-center">
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-lg text-lg font-bold hover:shadow-xl transition-shadow"
        >
          {isPremium ? 'Extend Premium' : 'Upgrade Now'}
        </button>
      </div>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
```

### Add route:

```javascript
// In your router configuration
import PremiumPage from './pages/PremiumPage';

<Route path="/premium" element={<PremiumPage />} />
```

## Testing Your Implementation

### Test as Free User:

1. Log in as a user with `premium_expires_at = null`
2. Create 5 goals → should allow
3. Try to create 6th goal → should show upgrade modal
4. Create 1 habit with reminders → reminder checkbox should be disabled
5. Create 1 journal entry → should allow
6. Try 2nd journal entry same day → should show limit reached
7. Try to export journal → should show "Premium only"

### Test as Premium User:

1. Log in as a user with future `premium_expires_at`
2. Create 10 goals → should allow
3. Create 10 habits with reminders → should allow
4. Create 5 journal entries in one day → should allow
5. Export journal → should work
6. See premium badge in navigation

### Test Premium Expiring:

1. Set `premium_expires_at` to 3 days from now
2. Should see yellow warning banner
3. Premium features still work
4. Warning suggests renewal

### Test Expired Premium:

1. Set `premium_expires_at` to yesterday
2. Should behave like free user
3. Limits should be free tier limits
4. Premium badge should not show

## Common Issues

**Issue:** Hooks return undefined/null
**Fix:** Ensure auth reducer stores `premium_expires_at` from login response

**Issue:** Limits not updating after creating items
**Fix:** Refetch the list after successful creation

**Issue:** Backend still allows creation even at limit
**Fix:** Check that you deployed the updated backend controllers

**Issue:** Upgrade modal doesn't show
**Fix:** Ensure `showUpgradeModal` state is initialized and UpgradeModal is rendered

## Next Steps

1. ✅ Update auth to include premium data
2. ✅ Add premium checks to goal creation
3. ✅ Add premium checks to habit creation
4. ✅ Add premium checks to journal entries
5. ✅ Add premium badge to navigation
6. ✅ Create premium page
7. ✅ Test thoroughly
8. ⏳ Set up payment integration (see main checklist)

---

**Need Help?** See [PREMIUM_INTEGRATION_GUIDE.md](./PREMIUM_INTEGRATION_GUIDE.md) for detailed documentation.
