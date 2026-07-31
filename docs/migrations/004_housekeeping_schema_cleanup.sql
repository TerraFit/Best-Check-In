-- =============================================================================
-- 004_housekeeping_schema_cleanup.sql
-- Align live housekeeping_tasks with approved Phase 2 (003) without data loss.
--
-- APPROVED Phase 2 columns (003):
--   id, business_id, room_id, room_number, room_name, booking_id, guest_name,
--   task_type, is_checkout, scheduled_date, priority, status,
--   assigned_staff_id, assigned_staff_name, notes, started_at, completed_at,
--   completed_by, inspection_status, policy_used, created_at, updated_at
--
-- LEGACY (prototype, NOT in 003):
--   stay_night  — NOT NULL was blocking inserts; app now always populates it.
--   Other prototype columns (if present) are left in place; only NOT NULL is relaxed
--   where the approved design does not require the field.
-- =============================================================================

-- 1) stay_night: keep column (history), default + allow null for Phase 2 writers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'housekeeping_tasks'
      AND column_name = 'stay_night'
  ) THEN
    -- Safe default so any future omit does not fail
    BEGIN
      ALTER TABLE housekeeping_tasks ALTER COLUMN stay_night SET DEFAULT 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'stay_night DEFAULT skipped: %', SQLERRM;
    END;

    -- Relax NOT NULL — Phase 2 does not require this field
    BEGIN
      ALTER TABLE housekeeping_tasks ALTER COLUMN stay_night DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'stay_night DROP NOT NULL skipped: %', SQLERRM;
    END;

    -- Backfill nulls if any
    UPDATE housekeeping_tasks SET stay_night = 1 WHERE stay_night IS NULL;
  END IF;
END $$;

-- 2) Ensure Phase 2 required columns exist (additive only)
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS room_id UUID;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS room_number INTEGER;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS booking_id UUID;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS is_checkout BOOLEAN DEFAULT false;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'standard';
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS assigned_staff_id UUID;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS inspection_status TEXT;
ALTER TABLE housekeeping_tasks ADD COLUMN IF NOT EXISTS policy_used TEXT;

-- 3) Indexes from Phase 2 (idempotent)
CREATE INDEX IF NOT EXISTS idx_hk_tasks_business_date ON housekeeping_tasks (business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_room ON housekeeping_tasks (room_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_status ON housekeeping_tasks (business_id, status);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_booking ON housekeeping_tasks (booking_id);

-- 4) Document remaining columns for operators (read-only check)
-- Run in SQL editor to list live columns vs Phase 2:
-- SELECT column_name, is_nullable, column_default, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'housekeeping_tasks'
-- ORDER BY ordinal_position;
