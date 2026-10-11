-- Weekly Trail ephemeral V1. Recaps are calculated at request time.
BEGIN;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_weekly_trail_period_key VARCHAR(8);
COMMIT;
