# 🔍 Profile Page - API Endpoints Analysis

## Overview
Complete analysis of all API endpoints used by the Profile Page, their current response structure, and required sanitization improvements.

---

## 📋 Profile Page API Endpoints

### **1. User Profile APIs**

#### `GET /api/v1/users/:id` - Get User Profile
**Frontend Usage:** `getUser(idOrUsername)`
**When Called:** 
- Viewing another user's profile
- Initial profile load for non-own profiles

**Current Response Structure:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "userId",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",  // ❌ SHOULD NOT BE EXPOSED
      "avatar": "url",
      "bio": "User bio",
      "gender": "male",
      "location": "New York",
      "interests": ["fitness", "travel"],
      "isPrivate": false,
      "isVerified": true,
      "isPremium": false,
      "socialLinks": {
        "website": "https://example.com",
        "youtube": "username",
        "instagram": "username"
      },
      "createdAt": "2024-01-01",
      "followersCount": 100,
      "followingCount": 50,
      "goalsCount": 25,
      "passwordChangedAt": "...",  // ❌ INTERNAL FIELD
      "refreshToken": "...",  // ❌ SENSITIVE
      "passwordResetToken": "...",  // ❌ SENSITIVE
      "notificationSettings": {...},  // ❌ PRIVATE SETTING
      "__v": 0  // ❌ INTERNAL FIELD
    },
    "stats": {
      "goalsCompleted": 10,
      "currentStreak": 5,
      "totalPoints": 1500
    },
    "isFollowing": false,
    "isRequested": false
  }
}
```

**🔒 Required Sanitization:**
- ❌ Remove: `email` (except for own profile)
- ❌ Remove: `password`, `refreshToken`, `passwordResetToken`, `passwordResetExpires`
- ❌ Remove: `passwordChangedAt`
- ❌ Remove: `notificationSettings` (except for own profile)
- ❌ Remove: `dashboardYears` (except for own profile)
- ❌ Remove: `timezone`, `timezoneOffsetMinutes` (except for own profile)
- ❌ Remove: `__v`, `deletedAt`, internal fields
- ✅ Keep: Public profile fields only

**Backend Files:**
- Controller: `api/src/controllers/userController.js` → `getUser()`
- Service: `api/src/services/userService.js` → `getUserProfile()`

---

#### `GET /api/v1/users/profile` - Get Own Profile Summary
**Frontend Usage:** Used for own profile data
**When Called:** Checking own profile

**Current Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      // All user fields including sensitive ones
    }
  }
}
```

**🔒 Required Sanitization:**
- ✅ Own profile can include more fields (email, settings)
- ❌ Remove: `password`, `refreshToken`, tokens
- ❌ Remove: `__v`

---

#### `GET /api/v1/users/:id/goals` - Get User Goals
**Frontend Usage:** `getUserGoals(userId, { page, limit })`
**When Called:** 
- Loading goals on profile page
- Pagination when scrolling

**Current Response:**
```json
{
  "success": true,
  "data": {
    "goals": [
      {
        "_id": "goalId",
        "title": "Goal Title",
        "description": "Description",
        "userId": {
          "_id": "userId",
          "name": "John Doe",
          "username": "johndoe",
          "avatar": "url",
          "email": "john@example.com",  // ❌ SHOULD NOT BE EXPOSED
          "password": "...",  // ❌ CRITICAL - NEVER EXPOSE
          // ... other user fields
        },
        "category": "Health & Fitness",
        "priority": "high",
        "status": "in-progress",
        "progress": 50,
        "targetDate": "2025-12-31",
        "year": 2025,
        "likesCount": 10,
        "commentsCount": 5,
        "isPrivate": false,
        "createdAt": "2024-01-01",
        "__v": 0  // ❌ INTERNAL
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 9,
      "total": 25,
      "pages": 3
    }
  }
}
```

**🔒 Required Sanitization:**
- ✅ Goal fields are mostly safe
- ❌ If `userId` is populated, sanitize nested user object
- ❌ Remove: `__v`, `deletedAt`
- ❌ Nested userId should only have: `_id`, `name`, `username`, `avatar`, `isVerified`

**Backend Files:**
- Controller: `api/src/controllers/userController.js` → `getUserGoals()`
- Service: `api/src/services/goalService.js` → `getUserGoals()`

---

### **2. Social APIs**

#### `POST /api/v1/social/follow/:userId` - Follow User
**Frontend Usage:** `followUser(userId)`
**When Called:** Click follow button

**Current Response:**
```json
{
  "success": true,
  "message": "User followed successfully",
  "data": {
    "requested": false
  }
}
```

**🔒 Required Sanitization:**
- ✅ Response is already safe
- No user objects returned

---

#### `DELETE /api/v1/social/follow/:userId` - Unfollow User
**Frontend Usage:** `unfollowUser(userId)`
**When Called:** Click unfollow button

**Current Response:**
```json
{
  "success": true,
  "message": "Unfollowed successfully"
}
```

**🔒 Required Sanitization:**
- ✅ Response is already safe

---

#### `DELETE /api/v1/social/follow/requests/:userId` - Cancel Follow Request
**Frontend Usage:** `cancelFollowRequest(userId)`
**When Called:** Cancel pending follow request

**Current Response:**
```json
{
  "success": true,
  "message": "Follow request canceled"
}
```

**🔒 Required Sanitization:**
- ✅ Response is already safe

---

#### `GET /api/v1/social/followers` - Get Followers List
**Frontend Usage:** `getFollowers(userId, { page, limit })`
**When Called:** Opening followers modal

**Current Response:**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "_id": "followId",
        "followerId": {
          "_id": "userId",
          "name": "John Doe",
          "username": "johndoe",
          "avatar": "url",
          "bio": "Bio",
          "email": "john@example.com",  // ❌ SHOULD NOT BE EXPOSED
          "isPrivate": false,
          "isVerified": true,
          "password": "...",  // ❌ CRITICAL
          // ... more fields
        },
        "followingId": "targetUserId",
        "status": "accepted",
        "createdAt": "2024-01-01"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

**🔒 Required Sanitization:**
- ❌ Sanitize `followerId` user object
- ❌ Only include: `_id`, `name`, `username`, `avatar`, `bio`, `isVerified`, `isPrivate`
- ❌ Remove all sensitive fields from nested user

**Backend Files:**
- Controller: `api/src/controllers/socialController.js` → `getFollowers()`

---

#### `GET /api/v1/social/following` - Get Following List
**Frontend Usage:** `getFollowing(userId, { page, limit })`
**When Called:** Opening following modal

**Current Response:**
```json
{
  "success": true,
  "data": {
    "following": [
      {
        "_id": "followId",
        "followingId": {
          "_id": "userId",
          "name": "Jane Doe",
          "username": "janedoe",
          "avatar": "url",
          "email": "jane@example.com",  // ❌ SHOULD NOT BE EXPOSED
          // ... sensitive fields
        },
        "status": "accepted"
      }
    ],
    "pagination": {...}
  }
}
```

**🔒 Required Sanitization:**
- ❌ Sanitize `followingId` user object
- Same rules as followers list

---

### **3. Journal APIs**

#### `GET /api/v1/journals/me` - Get My Journal Entries
**Frontend Usage:** `journalsAPI.getMyEntries({ limit, skip })`
**When Called:** 
- Viewing journal tab on own profile
- Scrolling for more entries

**Current Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "_id": "entryId",
        "userId": "userId",  // Just ID, not populated
        "dayKey": "2025-12-16",
        "content": "My journal entry",
        "mood": "happy",
        "visibility": "private",
        "prompt": "What made you smile today?",
        "createdAt": "2025-12-16T10:00:00Z",
        "updatedAt": "2025-12-16T10:00:00Z",
        "__v": 0  // ❌ INTERNAL
      }
    ]
  }
}
```

**🔒 Required Sanitization:**
- ❌ Remove: `__v`
- ✅ Most fields are safe for own journal
- Ensure `userId` is not populated with full user object

**Backend Files:**
- Controller: `api/src/controllers/journalController.js` → `getMyEntries()`

---

#### `GET /api/v1/journals/highlights/:userId` - Get User Journal Highlights
**Frontend Usage:** `getUserJournalHighlights(userId, { limit })`
**When Called:** Loading journal highlights (public entries)

**Current Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "_id": "entryId",
        "userId": {
          "_id": "userId",
          "name": "John Doe",
          "username": "johndoe",
          "avatar": "url",
          "email": "john@example.com"  // ❌ SHOULD NOT BE EXPOSED
        },
        "dayKey": "2025-12-16",
        "content": "Public journal entry",
        "mood": "happy",
        "visibility": "public",
        "createdAt": "2025-12-16"
      }
    ]
  }
}
```

**🔒 Required Sanitization:**
- ❌ Sanitize nested `userId` object
- ❌ Remove: `__v`

---

### **4. Habit APIs**

#### `GET /api/v1/habits` - List User Habits
**Frontend Usage:** `habitsAPI.list()`
**When Called:** Loading habits on overview tab

**Current Response:**
```json
{
  "success": true,
  "data": {
    "habits": [
      {
        "_id": "habitId",
        "userId": "userId",
        "name": "Morning Exercise",
        "description": "30 min workout",
        "frequency": "daily",
        "currentStreak": 7,
        "longestStreak": 21,
        "totalCompletions": 50,
        "isActive": true,
        "createdAt": "2024-01-01",
        "__v": 0  // ❌ INTERNAL
      }
    ]
  }
}
```

**🔒 Required Sanitization:**
- ❌ Remove: `__v`
- ✅ Most fields are safe

**Backend Files:**
- Controller: `api/src/controllers/habitController.js` → `listHabits()`

---

#### `GET /api/v1/habits/analytics` - Get Habit Analytics
**Frontend Usage:** `habitsAPI.analytics({ days: 30 })`
**When Called:** Loading habit analytics on overview tab

**Current Response:**
```json
{
  "success": true,
  "data": {
    "totalHabits": 5,
    "activeHabits": 4,
    "completionRate": 85.5,
    "currentStreaks": {...},
    "weeklyProgress": [...]
  }
}
```

**🔒 Required Sanitization:**
- ✅ Response is already safe - no sensitive data

---

### **5. Moderation APIs**

#### `POST /api/v1/moderation/report` - Report User
**Frontend Usage:** `report({ targetType: 'user', targetId, reason, description })`
**When Called:** Submitting report from profile menu

**Current Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "reportId": "reportId"
  }
}
```

**🔒 Required Sanitization:**
- ✅ Response is already safe

---

#### `POST /api/v1/moderation/block/:userId` - Block User
**Frontend Usage:** `blockUser(userId)`
**When Called:** Blocking user from profile menu

**Current Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

**🔒 Required Sanitization:**
- ✅ Response is already safe

---

## 🎯 Priority Sanitization Tasks

### **CRITICAL (Must Fix Immediately)**

1. **`GET /api/v1/users/:id`** - User Profile
   - Create sanitizer to remove email, tokens, settings for non-own profiles
   - File: `api/src/controllers/userController.js` → `getUser()`

2. **`GET /api/v1/users/:id/goals`** - User Goals
   - Sanitize nested `userId` object when populated
   - File: `api/src/controllers/userController.js` → `getUserGoals()`

3. **`GET /api/v1/social/followers`** - Followers List
   - Sanitize nested `followerId` user objects
   - File: `api/src/controllers/socialController.js` → `getFollowers()`

4. **`GET /api/v1/social/following`** - Following List
   - Sanitize nested `followingId` user objects
   - File: `api/src/controllers/socialController.js` → `getFollowing()`

### **HIGH (Fix Soon)**

5. **`GET /api/v1/journals/highlights/:userId`** - Journal Highlights
   - Sanitize nested `userId` object
   - File: `api/src/controllers/journalController.js` → `getUserHighlights()`

6. **Remove `__v` from all responses**
   - Add to Mongoose schema options or sanitizer
   - Apply globally

### **MEDIUM (Include in Cleanup)**

7. **`GET /api/v1/journals/me`** - My Journal Entries
   - Remove `__v`
   - Ensure userId not populated

8. **`GET /api/v1/habits`** - Habits List
   - Remove `__v`

---

## 📝 Implementation Plan

### Step 1: Create Sanitizer Utility (15 min)
Create `api/src/utility/sanitizer.js` with:
- `sanitizeUser(user, isSelf)`
- `sanitizeGoal(goal, isOwner)`
- `sanitizeJournalEntry(entry, isOwner)`
- `sanitizeArray(array, sanitizerFn)`

### Step 2: Update User Controller (20 min)
- `getUser()` - Apply user sanitizer
- `getUserGoals()` - Sanitize nested userId
- `getUsers()` - Sanitize all users in list

### Step 3: Update Social Controller (15 min)
- `getFollowers()` - Sanitize followerId objects
- `getFollowing()` - Sanitize followingId objects

### Step 4: Update Journal Controller (10 min)
- `getUserHighlights()` - Sanitize userId objects
- `getMyEntries()` - Remove __v

### Step 5: Update Habit Controller (5 min)
- `listHabits()` - Remove __v
- `getHabit()` - Remove __v

### Step 6: Test All Endpoints (30 min)
- Test with own profile
- Test with other user's profile
- Test with private profiles
- Verify no sensitive data leaks

---

## 🧪 Testing Checklist

- [ ] `GET /api/v1/users/:id` - No email/tokens in response for other users
- [ ] `GET /api/v1/users/:id` - Email included for own profile
- [ ] `GET /api/v1/users/:id/goals` - Nested userId sanitized
- [ ] `GET /api/v1/social/followers` - No sensitive data in follower objects
- [ ] `GET /api/v1/social/following` - No sensitive data in following objects
- [ ] `GET /api/v1/journals/highlights/:userId` - User object sanitized
- [ ] All responses - No `__v` field
- [ ] All responses - No `password` or token fields
- [ ] Private profile - Goals not accessible without follow
- [ ] Blocked user - Profile not accessible

---

**Total APIs to Sanitize:** 8 endpoints
**Estimated Time:** 1.5 hours
**Priority:** CRITICAL - Potential data leakage

