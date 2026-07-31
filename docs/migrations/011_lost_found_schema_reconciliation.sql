-- ============================================================
-- FastCheckIn Lost & Found — Migration 011
-- Schema reconciliation for PRODUCTION databases that only have
-- the Phase-2 housekeeping stub of lost_and_found (migration 003).
--
-- Source of truth: feature/lost-found application code
--   Netlify: create/update/collect/contact/get-*-lost-found*
--   Types: src/types/lostFound.ts
--
-- SAFE:
--   * Does NOT DROP lost_and_found or any rows
--   * Does NOT recreate lost_and_found
--   * Additive columns only (IF NOT EXISTS)
--   * CREATE TABLE IF NOT EXISTS for new tables
--   * Idempotent constraints / indexes / policies
-- ============================================================

-- --------------------------------------------------------------------------
-- 1. Expand lost_and_found — every column the application reads/writes
-- --------------------------------------------------------------------------
-- Existing (003) kept as-is:
--   id, business_id, room_id, booking_id, guest_name, housekeeping_task_id,
--   found_by_staff_id, description, status, found_date, notes,
--   created_at, updated_at

ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS tag_number TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Miscellaneous';
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS time_found TIME;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS booking_reference TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS found_by_staff_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS storage_location TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS storage_detail TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good';
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12, 2);
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS check_out_date DATE;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS returned_to TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS collected_by_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS collected_by_id_number TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS collection_signature_url TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS released_by_staff_id UUID;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS released_by_staff_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

-- Normalise photo_urls so optional-photo workflow never hits NULL
UPDATE lost_and_found SET photo_urls = '{}' WHERE photo_urls IS NULL;
ALTER TABLE lost_and_found ALTER COLUMN photo_urls SET DEFAULT '{}';

-- Condition CHECK (named, re-applyable)
ALTER TABLE lost_and_found DROP CONSTRAINT IF EXISTS lost_and_found_condition_check;
ALTER TABLE lost_and_found
  ADD CONSTRAINT lost_and_found_condition_check
  CHECK (
    condition IS NULL
    OR condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')
  );

-- Map legacy housekeeping statuses BEFORE replacing the status CHECK
UPDATE lost_and_found SET status = 'newly_found' WHERE status IN ('open');
UPDATE lost_and_found SET status = 'collected'   WHERE status IN ('claimed');
UPDATE lost_and_found SET status = 'unclaimed'   WHERE status IN ('disposed');
-- Keep 'archived' as-is (valid in both old and new sets)

ALTER TABLE lost_and_found ALTER COLUMN status SET DEFAULT 'newly_found';

ALTER TABLE lost_and_found DROP CONSTRAINT IF EXISTS lost_and_found_status_check;
ALTER TABLE lost_and_found
  ADD CONSTRAINT lost_and_found_status_check
  CHECK (status IN (
    'newly_found',
    'awaiting_contact',
    'guest_contacted',
    'guest_replied',
    'collection_arranged',
    'courier_booked',
    'returned',
    'collected',
    'unclaimed',
    'archived'
  ));

-- --------------------------------------------------------------------------
-- 2. lost_and_found_activity
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_and_found_activity (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id              UUID NOT NULL REFERENCES lost_and_found(id) ON DELETE CASCADE,
  event_type           TEXT NOT NULL,
  employee_id          UUID,
  employee_name        TEXT,
  communication_method TEXT,
  outcome              TEXT,
  from_status          TEXT,
  to_status            TEXT,
  details              JSONB DEFAULT '{}'::jsonb,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lost_and_found_activity DROP CONSTRAINT IF EXISTS lost_and_found_activity_event_type_check;
ALTER TABLE lost_and_found_activity
  ADD CONSTRAINT lost_and_found_activity_event_type_check
  CHECK (event_type IN (
    'created',
    'photos_added',
    'status_change',
    'note_added',
    'guest_contacted',
    'guest_replied',
    'storage_updated',
    'returned',
    'collected',
    'archived',
    'updated',
    'reminder_sent'
  ));

ALTER TABLE lost_and_found_activity DROP CONSTRAINT IF EXISTS lost_and_found_activity_communication_method_check;
ALTER TABLE lost_and_found_activity
  ADD CONSTRAINT lost_and_found_activity_communication_method_check
  CHECK (
    communication_method IS NULL
    OR communication_method IN ('email', 'sms', 'whatsapp', 'phone', 'in_person', 'other')
  );

-- --------------------------------------------------------------------------
-- 3. Tag sequence (LF-YYYY-NNNN per business)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_and_found_tag_sequences (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  last_seq    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- 4. Categories (global builtins + per-business customs)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_and_found_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_builtin  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO lost_and_found_categories (business_id, name, is_builtin, sort_order)
SELECT NULL, v.name, true, v.sort_order
FROM (VALUES
  ('Clothing', 10),
  ('Electronics', 20),
  ('Jewellery', 30),
  ('Documents', 40),
  ('Wallets', 50),
  ('Keys', 60),
  ('Chargers', 70),
  ('Toiletries', 80),
  ('Toys', 90),
  ('Books', 100),
  ('Sports Equipment', 110),
  ('Medical Devices', 120),
  ('Miscellaneous', 999)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM lost_and_found_categories c
  WHERE c.business_id IS NULL AND lower(c.name) = lower(v.name)
);

-- --------------------------------------------------------------------------
-- 5. Storage locations (app table name: lost_and_found_storage_locations)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_and_found_storage_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_builtin  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO lost_and_found_storage_locations (business_id, name, is_builtin, sort_order)
SELECT NULL, v.name, true, v.sort_order
FROM (VALUES
  ('Reception Safe', 10),
  ('Reception Shelf A', 20),
  ('Reception Shelf B', 30),
  ('Housekeeping Cupboard', 40),
  ('Manager Safe', 50),
  ('Maintenance Room', 60),
  ('Laundry', 70),
  ('External Storage', 80)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM lost_and_found_storage_locations s
  WHERE s.business_id IS NULL AND lower(s.name) = lower(v.name)
);

-- --------------------------------------------------------------------------
-- 6. Indexes
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_laf_tag_business
  ON lost_and_found (business_id, tag_number)
  WHERE tag_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_laf_business ON lost_and_found (business_id);
CREATE INDEX IF NOT EXISTS idx_laf_status ON lost_and_found (business_id, status);
CREATE INDEX IF NOT EXISTS idx_laf_found_date ON lost_and_found (business_id, found_date DESC);
CREATE INDEX IF NOT EXISTS idx_laf_guest ON lost_and_found (business_id, guest_name);
CREATE INDEX IF NOT EXISTS idx_laf_category ON lost_and_found (business_id, category);
CREATE INDEX IF NOT EXISTS idx_laf_booking_ref ON lost_and_found (business_id, booking_reference);
CREATE INDEX IF NOT EXISTS idx_laf_room_number ON lost_and_found (business_id, room_number);
CREATE INDEX IF NOT EXISTS idx_laf_booking_id ON lost_and_found (business_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_laf_storage ON lost_and_found (business_id, storage_location);
CREATE INDEX IF NOT EXISTS idx_laf_found_by ON lost_and_found (business_id, found_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_laf_room_id ON lost_and_found (room_id);

CREATE INDEX IF NOT EXISTS idx_laf_activity_item
  ON lost_and_found_activity (item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_laf_activity_business
  ON lost_and_found_activity (business_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_laf_cat_name
  ON lost_and_found_categories (
    COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_laf_storage_name
  ON lost_and_found_storage_locations (
    COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

-- --------------------------------------------------------------------------
-- 7. updated_at trigger
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lost_and_found_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lost_and_found_updated_at ON lost_and_found;
CREATE TRIGGER trg_lost_and_found_updated_at
  BEFORE UPDATE ON lost_and_found
  FOR EACH ROW
  EXECUTE FUNCTION lost_and_found_set_updated_at();

-- --------------------------------------------------------------------------
-- 8. RLS — business isolation (service_role still bypasses)
-- --------------------------------------------------------------------------
ALTER TABLE lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_tag_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS laf_select_own ON lost_and_found;
DROP POLICY IF EXISTS laf_insert_own ON lost_and_found;
DROP POLICY IF EXISTS laf_update_own ON lost_and_found;
DROP POLICY IF EXISTS laf_delete_own ON lost_and_found;

CREATE POLICY laf_select_own ON lost_and_found
  FOR SELECT USING (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

CREATE POLICY laf_insert_own ON lost_and_found
  FOR INSERT WITH CHECK (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

CREATE POLICY laf_update_own ON lost_and_found
  FOR UPDATE USING (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

CREATE POLICY laf_delete_own ON lost_and_found
  FOR DELETE USING (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

DROP POLICY IF EXISTS laf_activity_select_own ON lost_and_found_activity;
DROP POLICY IF EXISTS laf_activity_insert_own ON lost_and_found_activity;

CREATE POLICY laf_activity_select_own ON lost_and_found_activity
  FOR SELECT USING (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

CREATE POLICY laf_activity_insert_own ON lost_and_found_activity
  FOR INSERT WITH CHECK (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

DROP POLICY IF EXISTS laf_cat_select ON lost_and_found_categories;
CREATE POLICY laf_cat_select ON lost_and_found_categories
  FOR SELECT USING (
    business_id IS NULL
    OR business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

DROP POLICY IF EXISTS laf_storage_select ON lost_and_found_storage_locations;
CREATE POLICY laf_storage_select ON lost_and_found_storage_locations
  FOR SELECT USING (
    business_id IS NULL
    OR business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

DROP POLICY IF EXISTS laf_seq_all_own ON lost_and_found_tag_sequences;
CREATE POLICY laf_seq_all_own ON lost_and_found_tag_sequences
  FOR ALL
  USING (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  )
  WITH CHECK (
    business_id::text = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'business_id',
      auth.jwt() -> 'app_metadata' ->> 'business_id',
      ''
    )
  );

-- --------------------------------------------------------------------------
-- 9. Documentation comments
-- --------------------------------------------------------------------------
COMMENT ON TABLE lost_and_found IS 'FastCheckIn Lost & Found items';
COMMENT ON COLUMN lost_and_found.photo_urls IS
  'TEXT[] of public/signed URLs in bucket lost-found-photos; empty array = no photos';
COMMENT ON COLUMN lost_and_found.collection_signature_url IS
  'Signature image URL captured at handover';
COMMENT ON COLUMN lost_and_found.tag_number IS
  'Per-business sequential tag LF-YYYY-NNNN';
COMMENT ON TABLE lost_and_found_activity IS
  'Activity / communication history for Lost & Found items';
COMMENT ON TABLE lost_and_found_tag_sequences IS
  'Per-business year + last sequence for tag generation';
COMMENT ON TABLE lost_and_found_categories IS
  'Builtin (business_id NULL) and custom categories';
COMMENT ON TABLE lost_and_found_storage_locations IS
  'Builtin (business_id NULL) and custom storage locations';

-- --------------------------------------------------------------------------
-- 10. Reload PostgREST schema cache (prevents PGRST204 after DDL)
-- --------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
