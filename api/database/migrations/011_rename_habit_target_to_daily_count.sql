-- Target completions used to represent a lifetime total. It now represents
-- the number of completions expected on each scheduled habit day.
ALTER TABLE habits
  RENAME COLUMN target_completions TO daily_target_count;

ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_target_completions_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_daily_target_count_check
  CHECK (daily_target_count IS NULL OR daily_target_count > 0);
