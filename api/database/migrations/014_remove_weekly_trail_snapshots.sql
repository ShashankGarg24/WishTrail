-- Remove the abandoned persisted-recap experiment. Abort if a target
-- environment contains data so product records can never be dropped blindly.
BEGIN;
DO $$
DECLARE has_rows BOOLEAN;
BEGIN
  IF to_regclass('public.weekly_trail_snapshots') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM weekly_trail_snapshots LIMIT 1)' INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'weekly_trail_snapshots contains data; review it before removal';
    END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS weekly_trail_snapshots;
COMMIT;
