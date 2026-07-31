-- ============================================================
-- FastCheckIn Lost & Found Module — Migration 009
-- Run manually in Supabase SQL Editor against the production DB.
-- Safe to re-run: uses IF NOT EXISTS / additive columns only.
-- Builds on lost_and_found stub created in 003_housekeeping_phase2.
-- ============================================================

-- 1. Expand lost_and_found with operational columns
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
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good'
  CHECK (condition IS NULL OR condition IN ('excellent', 'good', 'fair', 'poor', 'damaged'));
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2);
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS check_out_date DATE;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS returned_to TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Drop old narrow status constraint and apply full lifecycle
DO $$
BEGIN
  ALTER TABLE lost_and_found DROP CONSTRAINT IF EXISTS lost_and_found_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE lost_and_found DROP CONSTRAINT IF EXISTS lost_and_found_status_check;

-- Map legacy statuses before applying new check
UPDATE lost_and_found SET status = 'newly_found' WHERE status = 'open';
UPDATE lost_and_found SET status = 'collected' WHERE status = 'claimed';
UPDATE lost_and_found SET status = 'unclaimed' WHERE status = 'disposed';

ALTER TABLE lost_and_found
  ALTER COLUMN status SET DEFAULT 'newly_found';

ALTER TABLE lost_and_found
  ADD CONSTRAINT lost_and_found_status_check
  CHECK (status IN (
    'newly_found',
    'awaiting_contact',
    'guest_contacted',
    'collection_arranged',
    'courier_booked',
    'returned',
    'collected',
    'unclaimed',
    'archived'
  ));

-- Unique tag per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_laf_tag_business
  ON lost_and_found (business_id, tag_number)
  WHERE tag_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_laf_status ON lost_and_found (business_id, status);
CREATE INDEX IF NOT EXISTS idx_laf_found_date ON lost_and_found (business_id, found_date DESC);
CREATE INDEX IF NOT EXISTS idx_laf_guest ON lost_and_found (business_id, guest_name);
CREATE INDEX IF NOT EXISTS idx_laf_category ON lost_and_found (business_id, category);
CREATE INDEX IF NOT EXISTS idx_laf_booking_ref ON lost_and_found (business_id, booking_reference);

-- Tag number sequence helper (per-business sequential tags: LF-YYYY-NNNN)
CREATE TABLE IF NOT EXISTS lost_and_found_tag_sequences (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  last_seq    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Activity / communication history
CREATE TABLE IF NOT EXISTS lost_and_found_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES lost_and_found(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL
                    CHECK (event_type IN (
                      'created',
                      'photos_added',
                      'status_change',
                      'note_added',
                      'guest_contacted',
                      'storage_updated',
                      'returned',
                      'archived',
                      'updated'
                    )),
  employee_id     UUID,
  employee_name   TEXT,
  communication_method TEXT
                    CHECK (communication_method IS NULL OR communication_method IN (
                      'email', 'sms', 'whatsapp', 'phone', 'in_person', 'other'
                    )),
  outcome         TEXT,
  from_status     TEXT,
  to_status       TEXT,
  details         JSONB DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laf_activity_item ON lost_and_found_activity (item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_laf_activity_business ON lost_and_found_activity (business_id, created_at DESC);

-- 3. Categories (built-in + custom per business)
CREATE TABLE IF NOT EXISTS lost_and_found_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_builtin   BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 100,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_laf_cat_name
  ON lost_and_found_categories (COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Seed built-in categories (business_id NULL = global defaults)
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

-- 4. Storage locations (built-in + custom)
CREATE TABLE IF NOT EXISTS lost_and_found_storage_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  is_builtin   BOOLEAN NOT NULL DEFAULT false,
  sort_order   INTEGER NOT NULL DEFAULT 100,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_laf_storage_name
  ON lost_and_found_storage_locations (COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

INSERT INTO lost_and_found_storage_locations (business_id, name, is_builtin, sort_order)
SELECT NULL, v.name, true, v.sort_order
FROM (VALUES
  ('Shelf', 10),
  ('Cupboard', 20),
  ('Safe', 30),
  ('Cabinet', 40),
  ('Box Number', 50)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM lost_and_found_storage_locations s
  WHERE s.business_id IS NULL AND lower(s.name) = lower(v.name)
);

-- 5. RLS
ALTER TABLE lost_and_found_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_tag_sequences ENABLE ROW LEVEL SECURITY;

-- Ensure parent table RLS is on
ALTER TABLE lost_and_found ENABLE ROW LEVEL SECURITY;
