BEGIN;

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS year INTEGER;

UPDATE habits
SET year = EXTRACT(YEAR FROM created_at)::INTEGER
WHERE year IS NULL;

ALTER TABLE habits
  ALTER COLUMN year SET NOT NULL;

ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_valid_year;
ALTER TABLE habits
  ADD CONSTRAINT habits_valid_year CHECK (year BETWEEN 2020 AND 2100);

CREATE INDEX IF NOT EXISTS idx_habits_year ON habits(year);
CREATE INDEX IF NOT EXISTS idx_habits_user_year ON habits(user_id, year);

COMMIT;
