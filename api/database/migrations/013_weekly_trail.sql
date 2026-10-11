-- Weekly Trail V1: minimal schema proposal. NOT applied.
-- Reuses existing users.timezone, goal_updates, goals, habits and habit_logs.
-- Those belong to the existing domain migrations; this migration does not create
-- or alter Goal/Habit source data, add source indexes, or reconstruct history.
-- The calculator reuses current habit schedule and archive fields.
-- No scheduler, recap backfill, schedule history, trigger or baseline insertion.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_weekly_trail_period_key VARCHAR(8);

CREATE TABLE IF NOT EXISTS weekly_trail_snapshots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_key VARCHAR(8) NOT NULL,
  start_local_date DATE NOT NULL,
  end_local_date DATE NOT NULL,
  timezone_at_finalization TEXT NOT NULL,
  formula_version INTEGER NOT NULL,
  recap JSONB NOT NULL,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_key)
);

-- The UNIQUE constraint's B-tree serves owner-scoped descending history via a
-- backward scan. No additional history index is needed for retained V1 recaps.
-- Owner-scoped cleanup filters end_local_date using the same user_id prefix;
-- retention defaults to six calendar months and runs in bounded API requests.
-- It deletes snapshots only. My Trail derives recap references from their IDs.
COMMIT;
