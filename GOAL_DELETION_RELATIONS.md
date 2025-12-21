# Goal Deletion - Direct and Indirect Relations

## Overview
When a goal is deleted, the following entities and relationships need to be cleaned up to maintain data integrity across the system.

---

## 🎯 Direct Relations (Must Delete/Update)


### 1. **Activity Model** (`Activity.js`)
- **Field**: `data.goalId` (ObjectId reference to Goal)
- **Impact**: Activities of type `goal_completed` and `goal_created`
- **Action Required**: Delete all activities where `data.goalId` matches the deleted goal
- **Query**: `Activity.deleteMany({ 'data.goalId': goalId })`

### 2. **ActivityComment Model** (`ActivityComment.js`)
- **Field**: `activityId` (references Activity)
- **Impact**: Comments on goal-related activities
- **Action Required**: Delete comments on activities that are deleted (cascading from Activity cleanup)
- **Query**: First get activity IDs, then `ActivityComment.deleteMany({ activityId: { $in: activityIds } })`

### 3. **Like Model** (`Like.js`)
- **Field**: `targetId` with `targetType: 'goal'`
- **Impact**: All likes on the goal
- **Action Required**: Delete all likes for the goal
- **Query**: `Like.deleteMany({ targetType: 'goal', targetId: goalId })`
- **Note**: Also need to delete likes on goal-related activities

### 4. **Notification Model** (`Notification.js`)
- **Field**: `data.goalId` (ObjectId reference to Goal)
- **Impact**: Notifications about goal completion, creation, likes, etc.
- **Action Required**: Delete all notifications related to the goal
- **Query**: `Notification.deleteMany({ 'data.goalId': goalId })`

### 5. **Habit Model** (`Habit.js`)
- **Field**: `goalId` (ObjectId reference to Goal)
- **Impact**: Habits linked to the goal
- **Action Required**: 
  - Option 1: Set `goalId` to `null` (unlink)
  - Option 2: Delete habits if they were created specifically for this goal
- **Query**: `Habit.updateMany({ goalId: goalId }, { $unset: { goalId: 1 } })`

### 6. **Goal Model - Sub-Goals** (`Goal.js`)
- **Field**: `subGoals[].linkedGoalId` (self-reference)
- **Impact**: Other goals that have this goal as a sub-goal
- **Action Required**: Remove sub-goal entries that reference the deleted goal
- **Query**: `Goal.updateMany({ 'subGoals.linkedGoalId': goalId }, { $pull: { subGoals: { linkedGoalId: goalId } } })`

### 7. **Goal Model - Habit Links** (`Goal.js`)
- **Field**: `habitLinks[].habitId` (reference to Habit)
- **Impact**: The goal's own habit links
- **Action Required**: Already handled when goal is deleted (embedded in goal document)

### 8. **Goal Model - Community Info** (`Goal.js`)
- **Field**: `communityInfo.sourceId` (reference to source Goal)
- **Impact**: Goals that are community mirrors of this goal
- **Action Required**: Delete or deactivate community mirror goals
- **Query**: `Goal.updateMany({ 'communityInfo.sourceId': goalId }, { $set: { isActive: false } })`

### 9. **User Model - Stats** (`User.js`)
- **Field**: `totalGoals`, `completedGoals`
- **Impact**: User's statistics need adjustment
- **Action Required**: 
  - Decrement `totalGoals` by 1
  - If goal was completed, decrement `completedGoals` by 1
- **Query**: `User.updateOne({ _id: userId }, { $inc: { totalGoals: -1, completedGoals: goal.completed ? -1 : 0 } })`

### 10. **User Model - Daily Completions** (`User.js`)
- **Field**: `dailyCompletions[date][].goalId`
- **Impact**: Daily completion tracking
- **Action Required**: Remove goal from daily completions map
- **Query**: Need to iterate through dailyCompletions map and pull matching goalId entries

---

## 🔗 Indirect Relations (Cascading Effects)

### 11. **CommunityActivity Model** (`CommunityActivity.js`)
- **Field**: `data.goalId`
- **Impact**: Community feed activities related to the goal
- **Action Required**: Delete community activities
- **Query**: `CommunityActivity.deleteMany({ 'data.goalId': goalId })`

### 12. **CommunityItem Model** (`CommunityItem.js`)
- **Field**: `sourceId` with `type: 'goal'`
- **Impact**: Community items that reference this goal
- **Action Required**: Mark as inactive or delete
- **Query**: `CommunityItem.updateMany({ type: 'goal', sourceId: goalId }, { $set: { isActive: false } })`

### 13. **Leaderboard Impact**
- **Impact**: User's leaderboard position may change
- **Action Required**: No direct cleanup, but leaderboard queries will reflect updated user stats

### 14. **Cache Invalidation**
- **Impact**: Cached trending goals, user stats, activity feeds
- **Action Required**: 
  - Invalidate trending goals cache
  - Invalidate user stats cache
  - Invalidate activity feed cache
- **Service**: `cacheService.invalidateTrendingGoals()`, etc.

### 15. **Search Indexes**
- **Impact**: Goal might be in search indexes
- **Action Required**: Automatic (MongoDB indexes update on delete)

---

## ⚠️ Current Implementation Issues

### Current `deleteGoal` in `goalController.js` (Lines 456-497):
```javascript
// INCOMPLETE - Only handles:
✅ Goal document deletion
✅ User.totalGoals decrement
❌ Activities deletion
❌ Likes deletion
❌ Comments deletion (cascading)
❌ Notifications deletion
❌ Habit unlinking
❌ Sub-goal references cleanup
❌ Community mirrors cleanup
❌ Daily completions cleanup
❌ Points adjustment (if completed)
❌ completedGoals adjustment (if completed)
```

### Current `deleteGoal` in `goalService.js` (Lines 237-257):
```javascript
// SOFT DELETE ONLY - Only marks isActive: false
✅ Marks goal as inactive
✅ Invalidates trending goals cache
❌ Does NOT clean up related entities
❌ Does NOT adjust user stats
❌ Does NOT remove from daily completions
```

---

## ✅ IMPLEMENTED SOLUTION

### ✨ Complete Hard Delete with Transaction-based Cleanup

**Implementation Location**: `api/src/controllers/goalController.js` (deleteGoal function)

### 🔄 Cleanup Process (All in One Transaction):

1. ✅ **Validate Goal** - Find goal and check ownership
2. ✅ **Delete Activities** - All goal_created and goal_completed activities
3. ✅ **Cascade Delete Comments** - Comments on deleted activities
4. ✅ **Delete Likes** - Likes on goal AND its activities
5. ✅ **Delete Notifications** - All notifications about the goal
6. ✅ **Unlink Habits** - Remove goalId reference (keep habits)
7. ✅ **Unlink Sub-Goals** - Remove from other goals' subGoals array
8. ✅ **Handle Community Goals**:
   - If community mirror: Just delete (doesn't affect source)
   - If community source: Deactivate mirrors and community items
9. ✅ **Delete CommunityActivities** - Community feed cleanup
10. ✅ **Update User Stats**:
    - Decrement `totalGoals`
    - If completed: decrement `completedGoals`
11. ✅ **Clean Daily Completions** - Remove from tracking map
12. ✅ **Hard Delete Goal** - Permanent removal from database
13. ✅ **Invalidate Caches** - Clear all related caches

### 🎯 Key Features:

- **Hard Delete**: Permanent removal (no soft delete)
- **Transaction Safety**: All operations in single transaction (rollback on error)
- **Smart Community Handling**: 
  - Deleting community mirror → Only your copy deleted
  - Deleting community source → Mirrors deactivated (not deleted)
- **Habit Preservation**: Habits unlinked but not deleted
- **Sub-Goal Preservation**: Sub-goals remain, just unlinked
- **Complete Cleanup**: No orphaned data left behind
- **Stats Accuracy**: User stats properly adjusted

---

## 📝 Implementation Summary Table

| Entity | Field | Relation Type | Action Taken |
|--------|-------|---------------|--------------|
| Activity | data.goalId | Direct | ✅ DELETED |
| ActivityComment | activityId | Indirect (cascade) | ✅ DELETED |
| Like (goal) | targetId/targetType | Direct | ✅ DELETED |
| Like (activities) | targetId/targetType | Indirect | ✅ DELETED |
| Notification | data.goalId | Direct | ✅ DELETED |
| Habit | goalId | Direct | ✅ UNLINKED (preserved) |
| Goal (sub-goals) | subGoals[].linkedGoalId | Direct (self) | ✅ UNLINKED (preserved) |
| Goal (community mirrors) | communityInfo.sourceId | Direct | ✅ DEACTIVATED |
| User.totalGoals | - | Direct | ✅ DECREMENTED |
| User.completedGoals | - | Direct | ✅ DECREMENTED (if completed) |
| User.dailyCompletions | Map | Direct | ✅ CLEANED UP |
| CommunityActivity | data.goalId | Indirect | ✅ DELETED |
| CommunityItem | sourceId | Indirect | ✅ DEACTIVATED |
| Cache | Various | Indirect | ✅ INVALIDATED |
| Goal Document | - | Self | ✅ HARD DELETED |

---

## 🛡️ Safety Features

1. **Transaction Rollback**: If any operation fails, all changes are reverted
2. **Ownership Check**: Only goal owner can delete
3. **Community Protection**: Deleting your mirror doesn't affect community source
4. **Data Preservation**: Habits and sub-goals preserved (just unlinked)
5. **Comprehensive Modal**: UI shows exactly what will be deleted/preserved
6. **Cache Invalidation**: Ensures consistency across the app

---

## 🎨 Frontend Changes

**DeleteConfirmModal Updates**:
- ✅ Shows detailed breakdown of what will be deleted
- ✅ Shows what will be preserved (habits, sub-goals)
- ✅ Prevents background scroll when modal is open
- ✅ Clear warning about permanent deletion

---

## 🔒 Policy Implemented

**✅ Hard Delete with Full Cleanup** (Your Choice)
- Complete transaction-based cascading cleanup
- Warning modal showing exactly what gets deleted
- Habits and sub-goals preserved (unlinked)
- Community mirrors handled intelligently
- Points and stats properly adjusted
- No restriction on deleting completed goals
