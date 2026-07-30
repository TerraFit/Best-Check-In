-- Optional: document / relax legacy stay_night on housekeeping_tasks
--
-- Phase 2 migration 003 did NOT define stay_night.
-- Live DBs that still have stay_night NOT NULL come from an earlier prototype.
-- Application now always sends a calculated stay_night on insert.
--
-- Prefer keeping the column (populated) for history.
-- Only run the ALTER below if you want to drop the NOT NULL constraint
-- without relying on the app always sending stay_night.

-- ALTER TABLE housekeeping_tasks
--   ALTER COLUMN stay_night DROP NOT NULL;

-- Or add a default so old writers never fail:
ALTER TABLE housekeeping_tasks
  ALTER COLUMN stay_night SET DEFAULT 1;

-- Backfill any accidental nulls (if constraint already dropped):
-- UPDATE housekeeping_tasks SET stay_night = 1 WHERE stay_night IS NULL;
