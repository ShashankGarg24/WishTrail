## WishTrail

A social goal-tracking app to create goals, complete them with proof, and stay motivated with friends.

### Features

- **Authentication & Accounts**
  - Email/password signup & login with JWT and session persistence
  - Multi‑step signup with OTP (request, verify, resend)
  - Password reset flow (forgot/reset)
  - Bootstrap session via `GET /me`
  - Profile update, password change, privacy toggle

- **User Profiles**
  - Fields: name, username, avatar, bio, location, date of birth, interests
  - Avatar upload
  - Privacy: public, friends‑only, private
  - Follower/following counts and recent goals

- **Goals (Wishes)**
  - CRUD with validation; yearly partitioning and filters
  - Fields: title, description, category, priority, duration, target date, year
  - Frontend limits: title ≤ 200, description ≤ 1000, completion note ≤ 1000 (live counters)
  - Backend validation mirrors limits + completion note minimum length
  - Duration enforcement with `canCompleteAfter` lock (prevents too‑early completions)
  - Complete/uncomplete with optional note and image attachment
  - Daily completion limit (3/day) reflected in dashboard stats
  - Points system (duration base, priority multiplier, category bonus, early‑completion bonus, note‑quality bonus)
  - Social: like/unlike completed goals
  - Share: per‑goal share data endpoint + dynamic Open Graph image
  - Concurrency‑safe counters via transactions; totals stay consistent

- **Habits**
  - Create habits linked to a goal or standalone
  - Scheduling: daily, weekly, custom days (`daysOfWeek`)
  - Timezone‑aware reminders (HH:mm) with per‑minute matching and 10‑minute window
  - Logs with statuses: done, skipped, missed; optional note/mood/journal link
  - Streaks: current, longest; total completions; last logged date key
  - Streak milestones (1/7/30/100) activity surfacing; optional 30‑day OG share image
  - Archive/unarchive, delete
  - Analytics: 30/90‑day aggregates, top streaks, heatmap API

- **Dashboard**
  - Headline metrics: total goals, completed, in‑progress, today’s completions/limit, total points, level
  - Year switcher with per‑year progress bar and goal list
  - Add future years for planning
  - Daily limit notice and activity surfacing

- **Activities & Feed**
  - Types: goal_created, goal_completed, level_up, streak_milestone, achievement_earned, user_followed
  - Rich post details: completion notes and images (if public)
  - Like/unlike activities; comments and replies (UI)
  - Infinite scrolling with client‑side caching and optimistic interactions

- **Explore & Social Graph**
  - Discover/trending goals bar, user search, interests catalog
  - Follow/unfollow, follow requests (request/accept/reject/cancel)
  - Mutuals and basic follow stats
  - Block/unblock users

- **Notifications**
  - Types: new_follower, follow_request, follow_request_accepted, goal_liked, activity_liked, activity_comment, comment_reply, mention, goal_reminder, streak_milestone, level_up, friend_created_goal, friend_completed_goal, goal_due_soon, weekly_summary, monthly_summary
  - List with pagination; unread count; mark read / mark all read
  - User settings with habit‑reminder controls (skip if already done)

- **Leaderboards**
  - Global, friends, and category leaderboards
  - Level system with emoji/icon and color

- **Moderation & Safety**
  - Report users/activities with reasons and description
  - Block/unblock; server‑side checks
  - Bloom filter service & cron scaffolding for content defenses

- **Media & Sharing**
  - Goal completion attachments (image) with validation
  - Share modal that renders a 600×800 social card (client) and supports native share/copy/download
  - Public share URLs and OG images for rich previews

- **Location & Personalization**
  - City suggestions endpoint for profile/location fields
  - Interest‑based goal and habit suggestions

- **Performance & Caching**
  - Client caches (Zustand) with TTL for feeds, users, notifications, goals, dashboard, habits, goal posts
  - Redis config for server jobs and idempotency in reminders

- **APIs & Architecture**
  - Modular REST APIs: auth, users, goals, activities, social, notifications, moderation, explore, leaderboard, location, upload, feedback, habits
  - Centralized error handling and auth middleware
  - Vercel deployment configs for API and frontend

### Tech Stack

- Frontend: React + Vite, Tailwind CSS, Zustand, Framer Motion
- Backend: Node.js, Express, MongoDB (Mongoose), Redis (optional)
- Utilities: Cloudinary, Canvas (OG images), Cron jobs

### Key Reliability Guarantees

- Atomic goal mutations using MongoDB transactions to keep counters and daily logs consistent under concurrency
- Idempotent daily completion updates (one entry per goal per day)

### Directory Pointers

- API: `api/src` (controllers, routes, models, services, middleware)
- Frontend: `frontend/src` (pages, components, store)


