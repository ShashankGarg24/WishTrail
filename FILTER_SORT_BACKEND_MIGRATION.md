# Filter & Sort Backend Migration

## Summary
Migrated filter and sort functionality from client-side (React useMemo) to server-side (MongoDB queries) for better performance and scalability.

## Changes Made

### Backend Updates

#### 1. Goals API (`api/src/controllers/goalController.js`)
- Added `filter` parameter: `'all'` (default), `'completed'`, `'in-progress'`
- Added `sort` parameter: `'newest'` (default), `'oldest'`
- Changed sorting field from `createdAt` to `updatedAt`
- Applied to both search and regular getGoals endpoints

**Filter Logic:**
- `all`: No filter on completed field
- `completed`: `query.completed = true`
- `in-progress`: `query.completed = false`

**Sort Logic:**
- `newest`: `{ completed: 1, updatedAt: -1 }` (in-progress first, newest first)
- `oldest`: `{ completed: 1, updatedAt: 1 }` (in-progress first, oldest first)

#### 2. Habits API (`api/src/controllers/habitController.js`, `api/src/services/habitService.js`)
- Added `sort` parameter: `'newest'` (default), `'oldest'`, `'completion'`
- Changed sorting field from `createdAt` to `updatedAt`
- Applied to both listHabits and searchHabits endpoints

**Sort Logic:**
- `newest`: `{ updatedAt: -1 }`
- `oldest`: `{ updatedAt: 1 }`
- `completion`: `{ totalCompletions: -1, updatedAt: -1 }`

### Frontend Updates

#### 1. DashboardPage (`frontend/src/pages/DashboardPage.jsx`)
- **Removed** client-side filtering/sorting from `useMemo` hooks
- Updated all API calls to pass `filter` and `sort` parameters:
  - Initial load effect
  - Year change effect
  - Page change effect
  - Search effects (both goals and habits)
- Simplified `visibleGoals` useMemo (removed filter/sort logic)
- Simplified `userHabits` useMemo (removed sort logic)

#### 2. API Store (`frontend/src/store/apiStore.js`)
- Updated `loadHabits` to accept and pass `sort` parameter
- Updated `searchHabits` to accept and pass `sort` parameter
- Goals methods already supported params, no changes needed

## Benefits

1. **Performance**: Filtering/sorting done at database level with indexes
2. **Scalability**: No need to load all data into memory on client
3. **Consistency**: Single source of truth for data ordering
4. **Pagination**: Works correctly with filtered/sorted data
5. **Network**: Only filtered/sorted data sent over network

## API Usage Examples

### Goals
```javascript
// Get all goals, newest first (default)
GET /api/goals?year=2024

// Get only completed goals, oldest first
GET /api/goals?year=2024&filter=completed&sort=oldest

// Search in-progress goals, newest first
GET /api/goals?q=fitness&filter=in-progress&sort=newest
```

### Habits
```javascript
// Get all habits, newest first (default)
GET /api/habits?page=1&limit=9

// Get habits sorted by completion count
GET /api/habits?page=1&limit=9&sort=completion

// Search habits, oldest first
GET /api/habits?q=exercise&sort=oldest
```

## Backward Compatibility
- All parameters are optional with sensible defaults
- Existing API calls without filter/sort continue to work
- Default behavior: `filter='all'`, `sort='newest'`
