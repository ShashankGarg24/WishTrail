## WishTrail

A social goal-tracking app to create goals, complete them with proof, and stay motivated with friends.

### Features

- **Authentication & Accounts**
  - Email/password signup and login with JWT auth and session persistence
  - Multi‑step signup with OTP (request, verify, resend)
  - Password reset flow (forgot/reset)
  - "Me" endpoint to bootstrap authenticated sessions

- **User Profiles**
  - Profile fields: name, username, avatar, bio, location, date of birth, interests
  - Privacy controls: public, friends-only, private
  - Profile summary endpoint with follower/following counts and recent goals
  - Avatar upload support

- **Goals (Wishes)**
  - Create/Read/Update/Delete goals with validation
  - Fields: title, description, category, priority, duration, target date, year
  - Frontend limits: title ≤ 200 chars; description ≤ 1000 chars; completion note ≤ 1000 chars (with live counters)
  - Backend limits: server-side validation mirrors frontend limits and minimum completion note length (≥ 10 words)
  - Year and filters (status/category); yearly summaries and stats
  - Duration enforcement: computed `canCompleteAfter` lock to prevent too-early completions
  - Complete/uncomplete a goal with optional note and image attachment
  - Daily completion limit (3/day) with accurate `todayCompletions` and `dailyLimit` in dashboard stats
  - Shareable goals: public share data and dynamic Open Graph image generation
  - Like/unlike goals (social feedback for completed goals)
  - Points system with duration base, priority multiplier, category bonus, early-completion bonus, and note-quality bonus
  - Concurrency-safe counters: goal create/delete/complete are transactional; `totalGoals`, `completedGoals`, `totalPoints`, and `dailyCompletions` stay in sync

- **Dashboard**
  - Headline metrics: total goals, completed, active, today’s completions/limit, total points, level
  - Progress visualization per selected year
  - Daily limit notice and streak/achievement surfacing via activities

- **Activities & Feed**
  - Activity types: goal_created, goal_completed, level_up, streak_milestone, achievement_earned, user_followed
  - Rich post details: shared completion notes and images when public
  - Like/unlike activities; comment threads and replies
  - Infinite scrolling with client-side caching and optimistic interactions

- **Explore & Social Graph**
  - Discover users with trending/suggested lists and search
  - Follow/unfollow; follow requests (request/accept/reject/cancel)
  - Mutual followers and follow stats endpoints
  - Block/unblock users

- **Notifications**
  - Types include: new_follower, follow_request, follow_request_accepted, goal_liked, activity_liked, activity_comment, comment_reply, mention, goal_reminder, streak_milestone, level_up, friend_created_goal, friend_completed_goal, goal_due_soon, weekly_summary, monthly_summary
  - List, pagination, unread count, mark read, mark all read
  - Grouped UI (today/week/month/older)

- **Leaderboards**
  - Global leaderboard
  - Category leaderboards
  - Achievements and friends leaderboards

- **Moderation & Safety**
  - In-app reporting for users/activities
  - Block/unblock user
  - Bloom filter service and cron job scaffolding for content defenses

- **Media & Sharing**
  - Completion attachments (image) with validation
  - Share modal for generating social-friendly goal achievement cards
  - Per-goal share data endpoint and OG image for rich previews

- **Location & Personalization**
  - City suggestions endpoint for profile/location fields
  - Interest-based goal suggestions on empty dashboard

- **Performance & Caching**
  - Client-side caches with TTL for feeds, users, notifications, goals, and dashboard stats
  - Redis config and cache service available; server-side caching hooks can be enabled as needed

- **APIs & Architecture**
  - RESTful API modules: auth, users, goals, activities, social, notifications, moderation, explore, leaderboard, location, upload, feedback
  - Robust validation and error handling; auth middleware for protected routes
  - Vercel deployment configs for both API and frontend

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


