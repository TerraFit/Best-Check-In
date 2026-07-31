-- ============================================================
-- FastCheckIn Room Operations — Phase 1 Migration
-- Run manually in Supabase SQL Editor against the production DB.
-- Safe to re-run: uses IF NOT EXISTS / additive columns only.
-- ============================================================

-- 1. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Identity
  room_number           INTEGER NOT NULL,
  room_name             TEXT,
  room_code             TEXT NOT NULL,  -- immutable internal code for integrations

  -- Classification
  room_type             TEXT DEFAULT 'Standard',
  max_adults            INTEGER DEFAULT 2,
  max_children          INTEGER DEFAULT 0,
  max_infants           INTEGER DEFAULT 0,

  -- Three independent operational layers
  availability_status   TEXT NOT NULL DEFAULT 'available'
                          CHECK (availability_status IN (
                            'available', 'unavailable', 'out_of_order', 'maintenance'
                          )),
  occupancy_status      TEXT NOT NULL DEFAULT 'vacant'
                          CHECK (occupancy_status IN (
                            'vacant', 'reserved', 'occupied', 'departure_pending'
                          )),
  housekeeping_status   TEXT NOT NULL DEFAULT 'clean'
                          CHECK (housekeeping_status IN (
                            'clean', 'dirty',
                            'refresh_required', 'full_service_required',
                            'cleaning_in_progress',
                            'awaiting_inspection', 'inspected',
                            'do_not_disturb'
                          )),

  room_condition        TEXT DEFAULT 'good'
                          CHECK (room_condition IN (
                            'good', 'minor_damage', 'major_damage', 'needs_maintenance'
                          )),
  cleaning_priority     TEXT DEFAULT 'standard'
                          CHECK (cleaning_priority IN (
                            'vip', 'early_arrival', 'standard', 'late_checkout', 'maintenance'
                          )),

  active                BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (business_id, room_number),
  UNIQUE (business_id, room_code)
);

CREATE INDEX IF NOT EXISTS idx_rooms_business ON rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(business_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_availability ON rooms(business_id, availability_status);
CREATE INDEX IF NOT EXISTS idx_rooms_occupancy ON rooms(business_id, occupancy_status);

-- 2. Room events (timeline)
CREATE TABLE IF NOT EXISTS room_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  source        TEXT DEFAULT 'system',   -- system | staff | guest | integration
  severity      TEXT DEFAULT 'info'
                  CHECK (severity IN ('info', 'warning', 'critical')),
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_name    TEXT,
  performed_by  UUID,
  details       JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_events_room ON room_events(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_events_business ON room_events(business_id, created_at DESC);

-- 3. Bookings: additive room columns (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_number INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_name TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);

-- NOTE: Reducing businesses.total_rooms must NEVER auto-delete rooms.
-- Excess rooms should be deactivated (active = false) via sync-rooms with confirmDeactivate.
