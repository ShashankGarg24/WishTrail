-- Existing database schema update for migration 010.
-- The JavaScript migration is the deploy-safe canonical runner because it also
-- backfills data before enforcing NOT NULL. This file is provided for manual
-- DBA review/execution when required.
BEGIN;

ALTER TABLE habit_logs
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS legacy_date_key DATE;

UPDATE habit_logs
SET legacy_date_key = date_key
WHERE legacy_date_key IS NULL;

UPDATE habit_logs hl
SET occurred_at = COALESCE(
  (
    SELECT (entry->>'timestamp')::timestamptz
    FROM unnest(hl.completion_times_mood) AS entry
    WHERE entry ? 'timestamp' AND (entry->>'timestamp') IS NOT NULL
    ORDER BY (entry->>'timestamp')::timestamptz ASC
    LIMIT 1
  ),
  (hl.legacy_date_key::timestamp AT TIME ZONE COALESCE(NULLIF(u.timezone, ''), 'UTC')),
  hl.created_at
)
FROM users u
WHERE u.id = hl.user_id
  AND hl.occurred_at IS NULL;

ALTER TABLE habit_logs
  ALTER COLUMN occurred_at SET NOT NULL,
  ALTER COLUMN occurred_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_occurred_at
  ON habit_logs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_occurred_at
  ON habit_logs (habit_id, occurred_at DESC);

COMMIT;
