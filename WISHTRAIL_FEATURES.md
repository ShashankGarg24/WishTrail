# WishTrail - Comprehensive Features Documentation

**Last Updated:** January 2025  
**Purpose:** Complete feature inventory for Google Stitch AI redesign

---

## 📋 Table of Contents

1. [Overview & High-Level Features](#overview--high-level-features)
2. [Technology Stack](#technology-stack)
3. [Premium Tier System](#premium-tier-system)
4. [Page-by-Page Feature Breakdown](#page-by-page-feature-breakdown)

---

## Overview & High-Level Features

WishTrail is a **goal tracking and social wellness platform** that combines personal development, habit building, journaling, and community features. The platform enables users to:

### Core Features

#### **Goals & Wishes Management**
- Create, track, and complete personal goals with yearly partitioning
- CRUD operations with validation and character limits
- Category-based organization (Personal, Health, Career, Finance, etc.)
- Priority levels (Low, Medium, High) with multipliers
- Duration-based completion locks (prevents premature completion)
- Points system with multiple bonuses (priority, category, early completion, note quality)
- Subgoals support (1 for free, up to 10 for premium)
- Completion with proof (optional note and image attachment)
- 3 completions per day limit
- Social features: like/unlike, comments, sharing
- Dynamic Open Graph images for social sharing
- Concurrency-safe counters via database transactions

#### **Habits & Daily Tracking**
- Create habits linked to goals or standalone
- Scheduling: daily, weekly, custom days (daysOfWeek)
- Timezone-aware reminders with HH:mm format
- Per-minute reminder matching with 10-minute window
- Mood tracking: Great, Good, Okay, Tough, Skip (neutral default)
- Mood stored per completion timestamp in JSONB array
- Streaks: current, longest, total completions
- Streak milestones (1, 7, 30, 100 days) with activity surfacing
- Optional 30-day milestone OG share image
- Habit logs with paginated daily view
- 1-tap completion + 2-second non-blocking mood nudge on dashboard
- Analytics: 30/90/365-day aggregates, top streaks, heatmaps
- Expandable completion timestamps with mood per log

#### **Personal Dashboard**
- Headline metrics: total goals, completed, in-progress, today's completions, points, level
- Year switcher with per-year progress bar
- Add future years for planning
- Delete past years
- Daily completion limit notice (3/day)
- Activity surfacing (streaks, achievements, level-ups)
- Goal and habit quick actions
- Search and filtering (all, completed, in-progress)
- Sorting (newest, oldest, completion rate)
- Paginated goal and habit lists
- Community goals and habits display (coming soon)

#### **Journal & Reflection**
- Daily journal entries with mood selection
- AI-generated motivational responses
- Visibility controls: public, friends-only, private
- Positive points tracking
- Daily limits: 1 entry/day (free), 5/day (premium)
- Character limits: 500 (free), 2000 (premium)
- Timezone-aware daily key (YYYY-MM-DD format)
- Journal export (premium only)
- Journal highlights on profile
- Infinite scroll with pagination

#### **Social Features**
- Follow/unfollow system
- Follow requests for private accounts (request/accept/reject/cancel)
- Mutuals tracking
- Block/unblock users
- Report system (user, goal, activity, comment)
- Like/unlike activities and goals
- Comments and replies (UI implemented)
- User search with interest-based recommendations
- Privacy settings: public, friends-only, private

#### **Activity Feed**
- Activity types: goal_created, goal_completed, level_up, streak_milestone, achievement_earned, user_followed
- Rich post details with completion notes and images
- Infinite scrolling with client-side caching
- Optimistic UI interactions
- Like/unlike with pending states
- Comment counts
- User menu (follow/unfollow, report, block)
- Trending goals carousel (top 20)

#### **Explore & Discovery**
- User discovery with interest-based recommendations
- Trending goals with pagination
- Community discovery
- Interest catalog filtering
- User search with autocomplete
- Goal search with filters
- Multi-tab interface (Users, Goals, Communities)
- Deep linking support (?goalId=)

#### **Communities**
- Create and manage communities
- Community types: public, invite-only, private
- Member limits (configurable)
- Community goals and habits (shared items)
- Dashboard with stats: members, active goals, completed goals
- Leaderboard: top contributors, engagement metrics
- Community progress tracking
- Banner and avatar customization
- Interest-based categorization
- Join limits: 7 (free), 50 (premium)
- Own limits: 3 (free), 10 (premium)

#### **Leaderboards**
- Global and friends leaderboards
- Types: goals completed, current streak
- Timeframes: all-time, monthly, weekly, daily
- Category filtering
- Rank tracking with badges (🥇🥈🥉)
- User stats display
- Real-time updates
- Click to view profiles

#### **Notifications**
- Types: follow requests, likes, comments, achievements, streak reminders
- Read/unread status tracking
- Mark all read functionality
- Follow request actions (accept/reject)
- Pagination with infinite scroll
- Real-time badge counts
- Time-ago formatting
- Deep linking to goals/activities

#### **User Profiles**
- Profile fields: name, username, avatar, bio, location, DOB, interests
- Avatar upload with fallback initials
- Current mood emoji display
- Social stats: followers, following, mutuals
- Privacy controls: public, friends-only, private
- Visibility toggles: showHabits, showJournal
- Tabs: Overview, Goals, Habits, Journal
- Goal statistics: total, completed, streak
- Habit statistics with analytics cards
- Paginated goals and habits lists
- Journal entries with infinite scroll
- Profile editing modal
- Social actions: follow/unfollow, block, report
- Share profile functionality

#### **Analytics & Insights**
- Goal analytics: completion rate, category breakdown, time trends
- Habit analytics: streak heatmaps, completion patterns, mood analysis
- 30/90/365-day views (free: 60 days, premium: 365 days)
- Interactive charts: Line, Bar, Doughnut (Chart.js)
- Paginated logs with detailed breakdowns
- Average mood calculation
- Expandable timestamps
- Data retention: 60 days (free), unlimited (premium)

#### **Points & Gamification**
- Base points by goal duration
- Priority multipliers (Low: 1x, Medium: 1.5x, High: 2x)
- Category bonuses (varies by category)
- Early completion bonus
- Note quality bonus
- Level progression system
- Achievement badges
- Milestone celebrations

#### **Media & Sharing**
- Goal completion image uploads
- Dynamic Open Graph images for social sharing
- Per-goal share data endpoints
- Profile share sheets
- Native mobile app share integration
- Social card previews

#### **Performance & Caching**
- Zustand state management
- Redis caching with TTL
- Optimistic UI updates
- Infinite scroll with pagination
- Client-side caching strategies
- Lazy loading components
- Skeleton loaders

#### **Moderation & Safety**
- Report system (user, goal, activity, comment)
- Block/unblock functionality
- Content filters
- Privacy controls
- Community guidelines enforcement
- Copyright policy compliance

---

## Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **UI Library:** Tailwind CSS
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Charts:** Chart.js with react-chartjs-2
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Forms:** React Hot Toast for notifications

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Databases:** 
  - PostgreSQL (users, goals, habits, journal)
  - MongoDB (activities, communities, legacy data)
  - Redis (caching, sessions)
- **Authentication:** JWT with httpOnly cookies
- **File Storage:** Local uploads + cloud storage
- **Email:** Nodemailer with OTP system

### Mobile
- **Framework:** React Native with Expo
- **WebView:** React Native WebView
- **Push Notifications:** Expo Notifications
- **Deep Linking:** Expo Linking
- **Platform:** Android & iOS

### DevOps & Deployment
- **Hosting:** Vercel (frontend + serverless API)
- **Database:** Managed PostgreSQL + MongoDB Atlas
- **CDN:** Vercel Edge Network
- **Environment:** Node.js 18+

---

## Premium Tier System

### Free Tier
| Feature | Limit |
|---------|-------|
| Active Goals | 5 |
| Subgoals per Goal | 1 |
| Active Habits | 5 |
| Habit Reminders | ❌ None |
| Habit History Retention | 60 days |
| Journal Entries/Day | 1 |
| Journal Character Limit | 500 |
| Journal Export | ❌ |
| Communities Joined | 7 |
| Communities Owned | 3 |
| AI Suggestions | ❌ |
| Advanced Analytics | ❌ Basic only |
| Analytics History | 60 days |

### Premium Tier
| Feature | Limit |
|---------|-------|
| Active Goals | 10 |
| Subgoals per Goal | 10 |
| Active Habits | 10 |
| Habit Reminders | ✅ Up to 5/habit |
| Habit History Retention | Unlimited |
| Journal Entries/Day | 5 |
| Journal Character Limit | 2000 |
| Journal Export | ✅ PDF/JSON |
| Communities Joined | 50 |
| Communities Owned | 10 |
| AI Suggestions | ✅ Unlimited |
| Advanced Analytics | ✅ Full access |
| Analytics History | 365 days |
| Custom Reports | ✅ |
| Priority Support | ✅ |
| No Ads | ✅ |

---

## Page-by-Page Feature Breakdown

### 1. **HomePage** (`/`)
**Purpose:** Landing page for unauthenticated users

**Features:**
- Hero section with app introduction
- Feature showcase carousel:
  - Personal Dashboard
  - Social Feed
  - Discover People & Goals
  - Habit Tracking
  - Daily Journal
  - Leaderboards
- Benefits list with icons
- Call-to-action buttons (Sign Up / Login)
- Responsive design with gradient backgrounds
- Smooth scroll interactions
- Dark mode support

---

### 2. **AuthPage** (`/auth`)
**Purpose:** User authentication (login/signup)

**Features:**
- Tab switcher: Login / Sign Up
- Email/password authentication
- Multi-step signup with OTP:
  1. Email + Password entry
  2. OTP verification
  3. Resend OTP option
- Password reset flow:
  - Forgot password link
  - Email OTP verification
  - New password entry
- Form validation with character limits
- Error handling with toast notifications
- JWT token storage (httpOnly cookies)
- Session persistence
- Redirect to dashboard on success
- Dark mode support

---

### 3. **DashboardPage** (`/dashboard`)
**Purpose:** Main user dashboard for goals and habits

**Features:**

#### **Header & Navigation**
- Year switcher with dropdown
- Add future years for planning
- Delete past years
- Active tab indicator (Goals / Habits)
- Search bar with real-time filtering
- Create goal/habit buttons
- Premium upgrade prompt

#### **Goals Tab**
- Headline metrics cards:
  - Total goals
  - Completed goals
  - In-progress goals
  - Today's completions (with 3/day limit)
  - Total points
  - Current level
- Year progress bar
- Goal filters: All, Completed, In-Progress
- Goal sorting: Newest, Oldest
- Goal search with query persistence
- Paginated goal grid (9 per page)
- Goal cards with:
  - Title, description (expandable)
  - Category badge
  - Priority indicator
  - Progress bar
  - Quick actions (complete, delete)
  - Analytics button
  - Share button
- Empty state with create prompt
- Community goals section (upcoming)

#### **Habits Tab**
- Habit summary cards:
  - Total habits
  - Active today
  - Current streak 🔥
  - Completion rate
- Habit search with autocomplete
- Habit sorting: Newest, Completion Rate
- Habit filters (upcoming)
- Paginated habit grid (9 per page)
- Habit cards with:
  - Title, description
  - Frequency display (Daily/Weekly/Custom)
  - Scheduled days indicator
  - Current/longest streak
  - 1-tap quick completion button
  - 2-second mood nudge (Great/Good/Okay/Tough)
  - Analytics button
  - Detail view button
- Quick action buttons inline
- Mood selection with emoji icons
- Optimistic UI updates
- Community habits section (upcoming)

#### **Modals**
- Goal details modal (create/edit/view)
- Habit creation modal
- Goal analytics modal (redirect to dedicated page)
- Habit detail modal with logs

#### **Interactions**
- Smooth animations (Framer Motion)
- Loading skeletons
- Toast notifications
- Deep linking support (?goalId=)
- Body scroll locking during modals

---

### 4. **ProfilePage** (`/profile/@username`)
**Purpose:** User profile view (own or others)

**Features:**

#### **Profile Header**
- Banner/cover area
- Profile picture (avatar)
- Current mood emoji (editable for own profile)
- Name and username display
- Social stats:
  - Total goals
  - Followers (clickable)
  - Following (clickable)
- Action buttons:
  - Edit Profile (own)
  - Follow/Unfollow (others)
  - Pending/Cancel Request (others)
  - Profile menu (report, block, share)
- Bio section
- Location, interests display
- Social links (YouTube, Instagram, Website)
- Privacy indicator (Public/Private/Friends-Only)

#### **Tabs**
1. **Overview Tab**
   - Goal statistics card:
     - Total goals
     - Completed goals
     - Current streak 🔥
   - Habit statistics card:
     - Embedded analytics (30 days)
     - Completion rate, streak
   - Current goals preview (3 goals)
   - View all goals button

2. **Goals Tab**
   - Paginated goals list (9 per page)
   - Goal cards with details
   - Privacy-aware display
   - Load more pagination
   - Empty state for no goals
   - Clickable to open goal modal

3. **Habits Tab**
   - Paginated habits list (9 per page)
   - Habit cards with streak info
   - Visibility controlled by showHabits setting
   - Privacy-aware display
   - Load more pagination
   - Empty state with create prompt
   - Clickable to open habit modal

4. **Journal Tab** (own profile only)
   - Write today's journal button
   - Journal entry cards:
     - Date/time display
     - Visibility badge
     - Mood indicator
     - Content preview (line-clamp-3)
     - AI motivation snippet
   - Infinite scroll with pagination
   - Export journal button (premium)
   - Empty state with create prompt
   - Journal submitted state (1/day limit)

#### **Privacy Controls**
- Private profiles hide content from non-followers
- Follow requests required for private accounts
- Habit visibility toggle (showHabits)
- Journal visibility per entry
- Analytics privacy

#### **Modals**
- Profile edit modal:
  - Avatar upload
  - Name, username, bio
  - Location, DOB, interests
  - Social links
  - Privacy settings
  - Habit/journal visibility toggles
- Journal prompt modal (AI-generated prompts)
- Journal entry view modal
- Journal export modal (premium)
- Goal details modal
- Habit detail modal
- Follow list modal (followers/following)
- Report modal
- Block modal
- Share sheet

#### **Follow Management**
- Paginated followers list (20 per page)
- Paginated following list (20 per page)
- Load more functionality
- Quick follow/unfollow actions
- Mutual followers indicator

---

### 5. **FeedPage** (`/feed`)
**Purpose:** Social activity feed

**Features:**

#### **Header**
- Page title with activity icon
- Refresh button
- Trending goals carousel (top 20):
  - Horizontal scroll
  - Goal cards with images
  - Like counts, category badges
  - Click to open goal modal

#### **Activity Stream**
- Activity types:
  - goal_created
  - goal_completed (with note/image)
  - level_up
  - streak_milestone (1, 7, 30, 100 days)
  - achievement_earned
  - user_followed
- Activity cards with:
  - User avatar and name
  - Timestamp (time-ago format)
  - Activity description
  - Goal preview (if applicable)
  - Completion note (if public)
  - Completion image (if attached)
  - Like button with count
  - Comment button with count
  - Activity menu (report, block)
- Infinite scroll with pagination (10 per page)
- Optimistic like/unlike
- Loading skeletons
- Empty state for no activities

#### **Interactions**
- Like/unlike activities
- View comments (modal)
- Open goal details (modal)
- Follow/unfollow users
- Report activities
- Block users
- Share activities

#### **Modals**
- Goal details modal (with comments)
- Activity comments modal
- Report modal
- Block modal
- Share sheet

---

### 6. **DiscoverPage** (`/discover`)
**Purpose:** Explore users, goals, and communities

**Features:**

#### **Tabs**
1. **Users Tab**
   - Search bar with real-time filtering
   - Interest filter dropdown (50+ categories)
   - Recommended users:
     - Interest-based suggestions
     - Avatar, name, username
     - Bio preview
     - Follower count
     - Follow/Unfollow button
     - Follow state indicator (Following, Pending)
   - User search results (paginated)
   - Load more pagination
   - Empty state

2. **Goals Tab**
   - Trending goals list (9 per page)
   - Goal cards with:
     - Title, description
     - Category badge
     - Like count
     - User avatar/name
     - Click to open modal
   - Pagination with load more
   - Empty state

3. **Communities Tab**
   - Community discovery grid
   - Community cards:
     - Banner image
     - Avatar
     - Name, description
     - Member count / limit
     - Visibility badge
     - Interest tags
   - Click to navigate to community page
   - Search functionality
   - Empty state

#### **Search**
- Real-time search across users, goals, communities
- Debounced API calls
- Search history
- Clear search button
- Loading states

#### **Interactions**
- Follow/unfollow users
- Cancel follow requests
- Like goals
- Open goal modals
- Navigate to profiles
- Report users
- Block users

#### **Modals**
- Goal details modal
- Report modal
- Block modal

---

### 7. **CommunitiesPage** (`/communities`)
**Purpose:** Community management and discovery

**Features:**

#### **My Communities**
- Communities you've joined
- Community cards with:
  - Banner image
  - Avatar
  - Name, description
  - Member count / limit
  - Visibility badge
  - Interest tags
- Click to open community detail page

#### **Discover Communities**
- Public communities to join
- Same card layout as "My Communities"
- Search functionality
- Interest-based filtering

#### **Create Community**
- Create button with modal
- Form fields:
  - Name (required)
  - Description
  - Visibility (public, invite-only, private)
  - Member limit (default: 100)
  - Interests (multi-select)
- Validation with character limits
- Premium limits apply (3 owned free, 10 premium)

#### **Search**
- Search across all communities
- Real-time filtering
- Empty state for no results

---

### 8. **CommunityDetailPage** (`/communities/:id`)
**Purpose:** Individual community page

**Features:**

#### **Header**
- Banner image
- Community avatar
- Name, description
- Member count / limit
- Visibility badge
- Interest tags
- Join/Leave button
- Community menu (report, settings)

#### **Tabs**
1. **Dashboard Tab**
   - Community stats cards:
     - Total members
     - Active members (7 days)
     - Total activity
     - Total goals
     - Total habits
     - Active goals
     - Completed goals
   - Leaderboard:
     - Top contributors
     - Engagement scores
     - Clickable to profiles
   - Recent activity feed

2. **Members Tab**
   - Member list with pagination
   - Member cards:
     - Avatar, name, username
     - Join date
     - Completed goals count
     - Role badge (owner, admin, member)
   - Click to view profile
   - Owner actions (kick, promote)

3. **Items Tab** (Community Goals & Habits)
   - Shared goals list
   - Shared habits list
   - Add community goal/habit button (owner/admin)
   - Item cards with:
     - Title, description
     - Creator info
     - Community progress
     - Personal progress
     - Join/adopt button
   - Empty state

4. **Settings Tab** (owner/admin only)
   - Edit community details
   - Change visibility
   - Update member limit
   - Manage interests
   - Delete community

#### **Interactions**
- Join/leave community
- Invite members (invite-only)
- Create community items
- Adopt community goals/habits
- Track personal progress
- View member profiles

---

### 9. **LeaderboardPage** (`/leaderboard`)
**Purpose:** Global and friends leaderboards

**Features:**

#### **Tabs**
- **Global Leaderboard:** All users
- **Friends Leaderboard:** Users you follow

#### **Filters**
- **Type:**
  - Goals Completed
  - Current Streak
- **Timeframe:**
  - All Time
  - Monthly
  - Weekly
  - Daily
- **Category:**
  - All Categories
  - Health & Fitness
  - Personal Development
  - Career & Education
  - Finance & Business
  - Relationships & Social
  - Creative & Hobbies
  - Spiritual & Mindfulness
  - Travel & Adventure
  - Home & Lifestyle
  - Entertainment & Fun
  - Other

#### **Leaderboard Display**
- Rank position with badges:
  - 🥇 1st place
  - 🥈 2nd place
  - 🥉 3rd place
  - Numbered ranks (4+)
- User cards:
  - Avatar
  - Name, username
  - Stat value (goals completed or streak days)
  - Rank badge
- Click to view profile
- Current user highlight (if ranked)
- Top 3 highlighted with gradient backgrounds
- Pagination with load more

#### **Empty States**
- No data for selected filters
- Friends leaderboard empty (follow users prompt)

---

### 10. **NotificationsPage** (`/notifications`)
**Purpose:** User notifications and follow requests

**Features:**

#### **Header**
- Notification icon with unread badge
- Title and description
- Refresh button
- Mark all read button

#### **Follow Requests Section**
- Pending follow requests list
- Request cards:
  - User avatar, name, username
  - Request timestamp
  - Accept button
  - Reject button
- Empty state for no requests

#### **Notifications List**
- Notification types:
  - Follow requests (accepted/sent)
  - Likes on goals/activities
  - Comments on goals/activities
  - Achievement earned
  - Streak milestone reached
  - Level up
  - Community invites
- Notification cards:
  - Icon based on type
  - User avatar (if applicable)
  - Message text
  - Timestamp (time-ago)
  - Read/unread indicator
  - Click to navigate to related content
- Pagination with load more (15 per page)
- Infinite scroll
- Empty state for no notifications

#### **Interactions**
- Mark notification as read (auto on click)
- Mark all notifications as read
- Accept/reject follow requests
- Navigate to goal/activity/profile
- Load more notifications

---

### 11. **SettingsPage** (`/settings`)
**Purpose:** User settings and preferences

**Features:**

#### **Settings Sections**

1. **Privacy Settings**
   - Account visibility:
     - Public
     - Friends Only
     - Private
   - Habit visibility toggle (showHabits)
   - Journal visibility toggle (showJournal)
   - Profile visibility controls
   - Activity visibility controls
   - Who can follow you
   - Who can see your followers/following

2. **Theme Settings**
   - Light mode
   - Dark mode
   - System default
   - Theme preview

3. **Blocked Users**
   - List of blocked users
   - User cards with:
     - Avatar, name, username
     - Block date
     - Unblock button
   - Empty state for no blocks

4. **Password Settings**
   - Current password entry
   - New password entry
   - Confirm password entry
   - Password strength indicator
   - Change password button
   - Validation with minimum 8 characters

5. **Notifications Settings** (upcoming)
   - Push notification toggles
   - Email notification preferences
   - Notification types:
     - Follow requests
     - Likes
     - Comments
     - Achievements
     - Streak reminders
     - Community updates

#### **Layout**
- Sidebar navigation (desktop)
- Tab navigation (mobile)
- Modal-based interface
- Form validation
- Success/error toasts
- Confirmation dialogs for destructive actions

---

### 12. **HabitAnalyticsPage** (`/habits/:id/analytics`)
**Purpose:** Detailed habit analytics and logs

**Features:**

#### **Header**
- Back button to dashboard
- Habit title
- Date range selector:
  - 30 days
  - 90 days
  - 365 days (premium only, free limited to 60)
- Premium upgrade prompt

#### **Overview Stats Cards**
- Total completions
- Current streak 🔥
- Longest streak
- Completion rate %
- Total days tracked
- Scheduled vs completed

#### **Charts**
1. **Completion Trend (Line Chart)**
   - Daily completions over selected period
   - Hover tooltips with exact counts
   - Gradient fill
   - Responsive

2. **Day of Week Analysis (Bar Chart)**
   - Completions per day of week
   - Average line
   - Color-coded bars

3. **Status Distribution (Doughnut Chart)**
   - Done, Skipped, Missed counts
   - Percentage labels
   - Color-coded segments

4. **Mood Analysis (Bar Chart)**
   - Mood distribution (Great, Good, Okay, Tough)
   - Count and percentage
   - Color-coded bars

#### **Heatmap**
- Interactive calendar heatmap
- Color intensity by completion count
- Click to view day details
- Day status indicators (done, skipped, missed)
- Hover tooltips

#### **Daily Logs List**
- Paginated logs (10 per page)
- Log cards:
  - Date display
  - Status badge (Done ✓, Skipped ⏭, Missed ✗)
  - Average mood badge (with color and emoji)
  - Completion timestamps (collapsible):
    - Timestamp display
    - Mood per timestamp (emoji + label)
    - Expand/collapse toggle
    - Smooth animations (Framer Motion)
  - Empty state for no completions
- Load more button
- Total pages indicator

#### **Interactions**
- Change date range
- Click day in heatmap
- Expand/collapse timestamps
- Load more logs
- Navigate back

---

### 13. **GoalAnalyticsPage** (`/goals/:id/analytics`)
**Purpose:** Detailed goal analytics and insights

**Features:**

#### **Header**
- Back button to dashboard
- Goal title
- Date range selector

#### **Overview Stats**
- Total time spent
- Days since created
- Completion percentage
- Points earned
- Priority level
- Category

#### **Charts**
1. **Progress Over Time (Line Chart)**
   - Progress percentage over time
   - Milestones marked
   - Gradient fill

2. **Subgoal Completion (Bar Chart)**
   - Completed vs total subgoals
   - Percentage display

3. **Category Comparison (Radar Chart)**
   - Compare goal to category average
   - Multiple metrics

#### **Activity Timeline**
- Chronological activity list
- Activity types:
  - Goal created
  - Subgoal completed
  - Progress updated
  - Goal completed
- Timestamps
- Icons per activity type

#### **Insights**
- Completion velocity
- Time to completion (if completed)
- Days remaining (if active)
- Predicted completion date
- Category ranking

---

### 14. **InspirationPage** (`/inspiration`)
**Purpose:** Inspirational content and AI suggestions (premium)

**Features:**
- Daily inspirational quotes
- AI-generated goal suggestions
- Success stories from community
- Motivational prompts
- Premium-only feature
- Empty state for free users with upgrade prompt

---

### 15. **Policy Pages**
**Purpose:** Legal compliance pages

**Pages:**
1. **PrivacyPolicy** (`/privacy-policy`)
   - Data collection details
   - Usage of personal information
   - Cookie policy
   - Third-party services
   - User rights

2. **TermsOfService** (`/terms-of-service`)
   - User agreement
   - Acceptable use policy
   - Account responsibilities
   - Limitation of liability
   - Termination clauses

3. **CommunityGuidelines** (`/community-guidelines`)
   - Expected behavior
   - Prohibited content
   - Reporting mechanisms
   - Consequences for violations

4. **CopyrightPolicy** (`/copyright-policy`)
   - DMCA compliance
   - Copyright ownership
   - Infringement reporting
   - Counter-notice process

**Features:**
- Clean, readable layout
- Table of contents
- Last updated date
- Contact information
- Print-friendly format

---

### 16. **Error Pages**
**Purpose:** Error handling and fallbacks

**Pages:**
1. **GenericErrorPage** (`/error/generic`)
   - Generic error message
   - Retry button
   - Home button

2. **NetworkErrorPage** (`/error/network`)
   - Network error message
   - Check connection prompt
   - Retry button

3. **404 Not Found** (auto-generated)
   - Page not found message
   - Search suggestions
   - Home button

**Features:**
- Friendly error messages
- Actionable buttons
- Consistent branding
- Dark mode support

---

## Additional Features

### **Shared Components**

#### **Modals**
- GoalPostModal (view/edit/complete goals)
- HabitDetailModal (view/log habits)
- HabitAnalyticsModal (embedded analytics)
- ProfileEditModal (edit profile)
- JournalPromptModal (write journal entries)
- JournalEntryModal (view journal entries)
- JournalExportModal (export journal - premium)
- ActivityCommentsModal (view/add comments)
- FollowListModal (followers/following lists)
- ReportModal (report content)
- BlockModal (block users)
- UpgradeModal (premium upgrade)
- SettingsLayoutModal (settings interface)

#### **Navigation**
- Navbar (top navigation):
  - Logo
  - Search bar
  - Navigation links (Dashboard, Feed, Discover, Communities, Leaderboard)
  - Notifications badge
  - Profile menu
  - Dark mode toggle
- Mobile navigation (bottom bar):
  - Dashboard
  - Feed
  - Discover
  - Profile
  - Menu

#### **UI Components**
- WishCard (goal card component)
- HabitCard (habit card component)
- ActivityCard (activity feed card)
- UserCard (user profile card)
- CommunityCard (community card)
- SkeletonLoader (loading states)
- ExpandableText (text truncation with expand)
- ShareSheet (native-like share interface)
- Toast notifications (success, error, info)
- Confirmation dialogs

### **Utilities**

#### **Timezone Management**
- User timezone storage
- Timezone-aware date keys (YYYY-MM-DD)
- Reminder scheduling in user timezone
- Completion timestamp conversion
- Daily limit calculations per timezone

#### **State Management**
- Zustand store with persistence
- Optimistic UI updates
- Cache invalidation strategies
- Loading state management
- Error state management

#### **API Integration**
- RESTful API endpoints
- JWT authentication
- Request/response interceptors
- Error handling middleware
- Rate limiting
- CORS configuration

#### **Performance Optimization**
- Code splitting with React.lazy
- Suspense boundaries
- Lazy loading images
- Debounced search
- Memoized calculations
- Virtualized lists (infinite scroll)

#### **Accessibility**
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast compliance
- Alt text for images

---

## Mobile App Features

### **React Native App** (`/app`)

**Features:**
- WebView-based hybrid app
- Deep linking support
- Push notifications (Expo Notifications)
- Pull-to-refresh
- Native share integration
- Custom pull-to-refresh UI
- App shortcuts (Android)
- Splash screen
- App icon
- Status bar styling
- Safe area handling
- Back button handling

**Deep Linking:**
- Goal links: `wishtrail://goal/:id`
- Profile links: `wishtrail://profile/:username`
- Feed links: `wishtrail://feed`
- Universal links (HTTPS fallback)

**Push Notifications:**
- Follow requests
- Likes and comments
- Achievements
- Streak reminders
- Community updates
- Opt-in/opt-out controls

---

## Deployment & Infrastructure

### **Vercel Deployment**
- Frontend: Static site generation
- API: Serverless functions
- Edge network CDN
- Automatic HTTPS
- Preview deployments
- Environment variables
- Custom domains

### **Database Management**
- PostgreSQL: Managed instance (users, goals, habits, journal)
- MongoDB: Atlas cluster (activities, communities)
- Redis: Managed instance (caching, sessions)
- Automated backups
- Connection pooling
- Query optimization

### **Environment Configuration**
- Development: Local databases
- Staging: Test databases
- Production: Production databases
- Environment-specific configs
- Secrets management

---

## Future Roadmap

### **Upcoming Features**
- AI-powered goal suggestions (premium)
- Custom reports and data export
- Calendar integration
- Reminders and notifications system
- Community challenges
- Collaborative goals
- Video journal entries
- Streak recovery (premium)
- Multi-language support
- Accessibility enhancements

---

## Summary

WishTrail is a comprehensive goal tracking and social wellness platform with **15+ pages**, **100+ features**, and a robust **premium tier system**. The application combines personal development tools (goals, habits, journal) with social features (feed, discovery, communities) and gamification (points, levels, leaderboards) to create an engaging user experience.

**Key Differentiators:**
- Mood tracking integrated with habit completion
- Timezone-aware scheduling and reminders
- Community-driven features with shared goals
- Advanced analytics with interactive charts
- Premium tier with enhanced limits and features
- Mobile app with deep linking and push notifications
- Comprehensive privacy and moderation tools

This documentation provides a complete inventory of features for Google Stitch to understand the full scope of WishTrail's functionality for redesign purposes.

---

**End of Documentation**
