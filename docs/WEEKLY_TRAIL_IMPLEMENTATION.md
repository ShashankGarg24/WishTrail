# Weekly Trail ephemeral V1

Weekly Trail calculates the authenticated user's previous local Monday–Sunday at request time. It is eligible only on the following Monday, Tuesday, or Wednesday, and only when one configured activity threshold is met. It creates no recap, history, event, schedule-history, retention, cleanup, backfill, or scheduler data.

The API is `GET /api/v1/weekly-trail/current`. `POST /api/v1/weekly-trail/current/seen` stores only `users.last_seen_weekly_trail_period_key`. Home marks a qualifying teaser seen after delivery and keeps it reopenable on that client until the returned user-local `expiresAt`. The detail endpoint recalculates the same eligible week. Thursday and later always return `NOT_IN_WINDOW`, so missed weeks are never presented.

Qualification defaults are configurable with:

- `WEEKLY_TRAIL_MIN_ACTIVE_DAYS=2`
- `WEEKLY_TRAIL_MIN_GOALS_COMPLETED=1`
- `WEEKLY_TRAIL_MIN_GOAL_PROGRESS_EVENTS=2`
- `WEEKLY_TRAIL_MIN_HABIT_COMPLETIONS=3`

The calculator reuses goals, meaningful `goal_updates`, habits, habit logs, explicit emotion samples, and the user's timezone. Emotion-only and social activity never qualify. Emotion summaries require three samples. Habit consistency is omitted when current Habit data cannot support a reliable denominator; V1 does not reconstruct historical schedule changes.

Profile → My Trail remains the existing chronological goal journey. Weekly Trail has no history UI, historical route, or My Trail recap entry.

Migration 013 retains only the optional seen-period column. Environments that received the abandoned snapshot table can run `node database/migrations/run_014_remove_weekly_trail_snapshots.js`. Migration 014 aborts if the table contains any row. It has not been applied automatically.
