-- ============================================================
-- FastCheckIn Rate Management — Migration 013 (REVISED)
-- Branch: feature/rate-management-nightbridge
-- Run manually in Supabase SQL Editor against the production DB.
-- Safe to re-run: uses IF NOT EXISTS / additive columns only.
-- ============================================================
-- Design decisions (approved + integrity revisions):
-- - Seasons are date-range based (no mandatory year column)
-- - Mid season optional; same season name may appear multiple times
-- - Nightly booking_rate_snapshots are the AUTHORITATIVE immutable record
-- - bookings.room_revenue is a derived convenience column only
-- - bookings.total_amount and bookings.season left completely unchanged
-- - Provider room mapping is a dedicated table
-- - Specials: applies_to = 'all' | 'rooms'
-- - Cross-business references blocked by triggers
-- - Snapshots: INSERT allowed; UPDATE/DELETE prohibited
-- - RLS enabled to match existing migration pattern; isolation is
--   primarily application-level + service-role (see section 8)
-- ============================================================

-- ------------------------------------------------------------
-- 1. business_seasons
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_seasons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  effective_from  DATE NOT NULL,
  effective_to    DATE NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT business_seasons_date_range_chk
    CHECK (effective_from <= effective_to)
);

CREATE INDEX IF NOT EXISTS idx_business_seasons_business
  ON business_seasons (business_id);

CREATE INDEX IF NOT EXISTS idx_business_seasons_active_dates
  ON business_seasons (business_id, effective_from, effective_to)
  WHERE active = true;

-- Overlap prevention enforced in application/service layer for MVP.

-- ------------------------------------------------------------
-- 2. rate_provider_mappings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_provider_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  internal_room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  external_room_id    TEXT NOT NULL,
  external_room_name  TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_provider_map_internal
  ON rate_provider_mappings (business_id, provider, internal_room_id)
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_provider_map_external
  ON rate_provider_mappings (business_id, provider, external_room_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_rate_provider_map_business
  ON rate_provider_mappings (business_id);

-- ------------------------------------------------------------
-- 3. room_rates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_rates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id               UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  season_id             UUID REFERENCES business_seasons(id) ON DELETE SET NULL,
  rate_amount           NUMERIC(12,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'ZAR',
  provider              TEXT NOT NULL DEFAULT 'manual',
  external_provider_id  TEXT,
  active                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT room_rates_amount_non_negative
    CHECK (rate_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_room_rates_business
  ON room_rates (business_id);

CREATE INDEX IF NOT EXISTS idx_room_rates_room
  ON room_rates (room_id);

CREATE INDEX IF NOT EXISTS idx_room_rates_season
  ON room_rates (season_id)
  WHERE season_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_room_rates_active
  ON room_rates (business_id, room_id, active)
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_rates_manual_season
  ON room_rates (business_id, room_id, season_id)
  WHERE active = true AND provider = 'manual' AND season_id IS NOT NULL;

-- ------------------------------------------------------------
-- 4. rate_specials
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_specials (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  special_type          TEXT NOT NULL,
  value                 NUMERIC(12,2) NOT NULL,
  applies_to            TEXT NOT NULL,
  room_ids              UUID[] NOT NULL DEFAULT '{}',
  effective_from        DATE NOT NULL,
  effective_to          DATE NOT NULL,
  active                BOOLEAN NOT NULL DEFAULT true,
  provider              TEXT NOT NULL DEFAULT 'manual',
  external_provider_id  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rate_specials_type_chk
    CHECK (special_type IN ('fixed', 'percentage')),
  CONSTRAINT rate_specials_applies_to_chk
    CHECK (applies_to IN ('all', 'rooms')),
  CONSTRAINT rate_specials_date_range_chk
    CHECK (effective_from <= effective_to),
  CONSTRAINT rate_specials_value_non_negative
    CHECK (value >= 0),
  CONSTRAINT rate_specials_percentage_range_chk
    CHECK (special_type <> 'percentage' OR (value >= 0 AND value <= 100))
);

CREATE INDEX IF NOT EXISTS idx_rate_specials_business
  ON rate_specials (business_id);

CREATE INDEX IF NOT EXISTS idx_rate_specials_active_dates
  ON rate_specials (business_id, effective_from, effective_to)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_rate_specials_rooms
  ON rate_specials USING GIN (room_ids)
  WHERE applies_to = 'rooms';

-- ------------------------------------------------------------
-- 5. booking_rate_snapshots  (AUTHORITATIVE + IMMUTABLE)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_rate_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id           UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  stay_date         DATE NOT NULL,
  resolved_rate     NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'ZAR',
  season_id         UUID REFERENCES business_seasons(id) ON DELETE SET NULL,
  season_name       TEXT,
  special_id        UUID REFERENCES rate_specials(id) ON DELETE SET NULL,
  special_name      TEXT,
  provider          TEXT NOT NULL DEFAULT 'manual',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT booking_rate_snapshots_rate_non_negative
    CHECK (resolved_rate >= 0),
  CONSTRAINT booking_rate_snapshots_unique_night
    UNIQUE (booking_id, room_id, stay_date)
);

CREATE INDEX IF NOT EXISTS idx_booking_rate_snapshots_booking
  ON booking_rate_snapshots (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_rate_snapshots_business
  ON booking_rate_snapshots (business_id);

CREATE INDEX IF NOT EXISTS idx_booking_rate_snapshots_room_date
  ON booking_rate_snapshots (room_id, stay_date);

CREATE INDEX IF NOT EXISTS idx_booking_rate_snapshots_stay_date
  ON booking_rate_snapshots (business_id, stay_date);

-- ------------------------------------------------------------
-- 6. bookings.room_revenue (derived convenience column only)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'room_revenue'
  ) THEN
    ALTER TABLE bookings
      ADD COLUMN room_revenue NUMERIC(12,2);
  END IF;
END $$;

COMMENT ON COLUMN bookings.room_revenue IS
  'Derived room revenue = SUM(booking_rate_snapshots.resolved_rate). '
  'Authoritative history lives in booking_rate_snapshots. '
  'Must be updated transactionally with snapshot inserts. '
  'total_amount meaning is unchanged.';

-- ------------------------------------------------------------
-- 7. CROSS-BUSINESS INTEGRITY TRIGGERS
-- Prevents any row from referencing entities of another business.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION rate_mgmt_assert_same_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_biz UUID;
  v_season_biz UUID;
  v_special_biz UUID;
  v_booking_biz UUID;
  v_rid UUID;
BEGIN
  -- room ownership
  IF TG_TABLE_NAME IN ('room_rates', 'rate_provider_mappings', 'booking_rate_snapshots') THEN
    IF TG_TABLE_NAME = 'rate_provider_mappings' THEN
      SELECT business_id INTO v_room_biz FROM rooms WHERE id = NEW.internal_room_id;
    ELSE
      SELECT business_id INTO v_room_biz FROM rooms WHERE id = NEW.room_id;
    END IF;
    IF v_room_biz IS NULL THEN
      RAISE EXCEPTION 'rate_mgmt: referenced room does not exist';
    END IF;
    IF v_room_biz <> NEW.business_id THEN
      RAISE EXCEPTION 'rate_mgmt: cross-business room reference blocked (table=%)', TG_TABLE_NAME;
    END IF;
  END IF;

  -- season ownership
  IF TG_TABLE_NAME IN ('room_rates', 'booking_rate_snapshots') AND NEW.season_id IS NOT NULL THEN
    SELECT business_id INTO v_season_biz FROM business_seasons WHERE id = NEW.season_id;
    IF v_season_biz IS NULL THEN
      RAISE EXCEPTION 'rate_mgmt: referenced season does not exist';
    END IF;
    IF v_season_biz <> NEW.business_id THEN
      RAISE EXCEPTION 'rate_mgmt: cross-business season reference blocked (table=%)', TG_TABLE_NAME;
    END IF;
  END IF;

  -- special ownership (snapshots)
  IF TG_TABLE_NAME = 'booking_rate_snapshots' AND NEW.special_id IS NOT NULL THEN
    SELECT business_id INTO v_special_biz FROM rate_specials WHERE id = NEW.special_id;
    IF v_special_biz IS NULL THEN
      RAISE EXCEPTION 'rate_mgmt: referenced special does not exist';
    END IF;
    IF v_special_biz <> NEW.business_id THEN
      RAISE EXCEPTION 'rate_mgmt: cross-business special reference blocked';
    END IF;
  END IF;

  -- booking ownership (snapshots)
  IF TG_TABLE_NAME = 'booking_rate_snapshots' THEN
    -- bookings may store business linkage as business_id or tenant_id depending on history;
    -- prefer business_id, fall back to tenant_id if present.
    SELECT COALESCE(
      (SELECT business_id FROM bookings WHERE id = NEW.booking_id LIMIT 1),
      (SELECT tenant_id FROM bookings WHERE id = NEW.booking_id LIMIT 1)
    ) INTO v_booking_biz;
    -- If neither column yields a value, skip strict check (legacy shape) but still
    -- require the booking to exist via the FK. Application layer always filters by business.
    IF v_booking_biz IS NOT NULL AND v_booking_biz <> NEW.business_id THEN
      RAISE EXCEPTION 'rate_mgmt: cross-business booking reference blocked';
    END IF;
  END IF;

  -- specials.room_ids ownership
  IF TG_TABLE_NAME = 'rate_specials' AND NEW.applies_to = 'rooms' AND NEW.room_ids IS NOT NULL THEN
    FOREACH v_rid IN ARRAY NEW.room_ids LOOP
      SELECT business_id INTO v_room_biz FROM rooms WHERE id = v_rid;
      IF v_room_biz IS NULL THEN
        RAISE EXCEPTION 'rate_mgmt: special references non-existent room %', v_rid;
      END IF;
      IF v_room_biz <> NEW.business_id THEN
        RAISE EXCEPTION 'rate_mgmt: special contains cross-business room_id %', v_rid;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach triggers (drop + recreate for re-run safety)
DROP TRIGGER IF EXISTS trg_room_rates_same_business ON room_rates;
CREATE TRIGGER trg_room_rates_same_business
  BEFORE INSERT OR UPDATE ON room_rates
  FOR EACH ROW EXECUTE FUNCTION rate_mgmt_assert_same_business();

DROP TRIGGER IF EXISTS trg_rate_provider_mappings_same_business ON rate_provider_mappings;
CREATE TRIGGER trg_rate_provider_mappings_same_business
  BEFORE INSERT OR UPDATE ON rate_provider_mappings
  FOR EACH ROW EXECUTE FUNCTION rate_mgmt_assert_same_business();

DROP TRIGGER IF EXISTS trg_booking_rate_snapshots_same_business ON booking_rate_snapshots;
CREATE TRIGGER trg_booking_rate_snapshots_same_business
  BEFORE INSERT OR UPDATE ON booking_rate_snapshots
  FOR EACH ROW EXECUTE FUNCTION rate_mgmt_assert_same_business();

DROP TRIGGER IF EXISTS trg_rate_specials_same_business ON rate_specials;
CREATE TRIGGER trg_rate_specials_same_business
  BEFORE INSERT OR UPDATE ON rate_specials
  FOR EACH ROW EXECUTE FUNCTION rate_mgmt_assert_same_business();

-- ------------------------------------------------------------
-- 8. SNAPSHOT IMMUTABILITY
-- INSERT allowed; UPDATE and DELETE prohibited at database level.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION rate_mgmt_forbid_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'booking_rate_snapshots are immutable. '
    'UPDATE/DELETE are not permitted. '
    'For post-confirmation amendments, create a controlled re-pricing flow '
    '(void prior logical association and insert new snapshots under a new '
    'confirmation event). Contact support for exceptional admin correction.';
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_rate_snapshots_no_update ON booking_rate_snapshots;
CREATE TRIGGER trg_booking_rate_snapshots_no_update
  BEFORE UPDATE ON booking_rate_snapshots
  FOR EACH ROW EXECUTE FUNCTION rate_mgmt_forbid_snapshot_mutation();

DROP TRIGGER IF EXISTS trg_booking_rate_snapshots_no_delete ON booking_rate_snapshots;
CREATE TRIGGER trg_booking_rate_snapshots_no_delete
  BEFORE DELETE ON booking_rate_snapshots
  FOR EACH ROW EXECUTE FUNCTION rate_mgmt_forbid_snapshot_mutation();

-- Note: Service role still hits these triggers. True emergency correction
-- requires temporarily disabling the trigger (documented operational step),
-- not a normal application path.

-- ------------------------------------------------------------
-- 9. RLS — enable only (matches existing migration pattern)
-- ------------------------------------------------------------
-- Inspection of prior migrations (e.g. 009) shows ENABLE ROW LEVEL SECURITY
-- without JWT claim policies. Tenant isolation is enforced by:
--   1. Netlify functions using SUPABASE_SERVICE_KEY (bypasses RLS)
--   2. Application-level business_id filtering (verifyBusinessAuth / _rbac)
-- Creating untested JWT policies risks blocking legitimate access.
-- Therefore we enable RLS and do NOT invent policies here.
-- Policies can be added later once the exact JWT claim shape is confirmed
-- and tested against production tokens.

ALTER TABLE business_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_provider_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rate_snapshots ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- BOOKING AMENDMENT LIFECYCLE (documented for Step 9)
-- ------------------------------------------------------------
-- BEFORE confirmation:
--   Rates may be recalculated freely; no snapshots yet.
-- AT confirmation:
--   Resolve nightly rates → INSERT booking_rate_snapshots →
--   set bookings.room_revenue = SUM(resolved_rate) in same transaction.
-- AFTER confirmation:
--   Snapshots are immutable (DB-enforced).
--   If room / dates / nights change:
--     MVP safest behaviour = require explicit reconfirmation path that
--     does NOT mutate existing rows. Options for Step 9:
--       a) Block amendment of pricing-affecting fields once snapshots exist
--       b) Soft-void prior snapshots (add voided_at later) + insert new set
--          under a new confirmation event
--   Do NOT silently UPDATE historical snapshots.
--   room_revenue must be recomputed only from the active snapshot set.
-- ------------------------------------------------------------

-- ============================================================
-- End of revised migration 013_rate_management.sql
-- ============================================================
