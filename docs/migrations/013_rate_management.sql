-- ============================================================
-- FastCheckIn Rate Management — Migration 013
-- Branch: feature/rate-management-nightbridge
-- Run manually in Supabase SQL Editor against the production DB.
-- Safe to re-run: uses IF NOT EXISTS / additive columns only.
-- ============================================================
-- Design decisions (approved):
-- - Seasons are date-range based (no mandatory year column)
-- - Mid season optional; same season name may appear multiple times
-- - Nightly booking_rate_snapshots are the authoritative historical record
-- - bookings.room_revenue is a convenient derived total (never replaces snapshots)
-- - bookings.total_amount and bookings.season left completely unchanged
-- - Provider room mapping is a dedicated table (not on every rate row)
-- - Specials: applies_to = 'all' | 'rooms' (room_ids empty = all)
-- - No silent R0; no fabricated historical rates; no invented NightBridge API
-- ============================================================

-- ------------------------------------------------------------
-- 1. business_seasons
-- Date-range seasons per business. Year is derived from dates.
-- Multiple ranges with the same name are allowed.
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

-- Note: Overlap prevention is enforced in the rate-resolution / season
-- service layer. A pure exclusion constraint across variable names is
-- complex; application validation is the primary guard for MVP.

-- ------------------------------------------------------------
-- 2. rate_provider_mappings
-- Maps FastCheckIn rooms to external provider room identities.
-- Separates identity mapping from rate records.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_provider_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,                    -- 'manual' | 'nightbridge' | future
  internal_room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  external_room_id    TEXT NOT NULL,
  external_room_name  TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active external identity per provider per internal room
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_provider_map_internal
  ON rate_provider_mappings (business_id, provider, internal_room_id)
  WHERE active = true;

-- Same external room cannot map to multiple internal rooms for a provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_provider_map_external
  ON rate_provider_mappings (business_id, provider, external_room_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_rate_provider_map_business
  ON rate_provider_mappings (business_id);

-- ------------------------------------------------------------
-- 3. room_rates
-- Room-specific rates, optionally linked to a season.
-- Provider field records source; external IDs live in mappings.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_rates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id               UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  season_id             UUID REFERENCES business_seasons(id) ON DELETE SET NULL,
  rate_amount           NUMERIC(12,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'ZAR',
  provider              TEXT NOT NULL DEFAULT 'manual',
  external_provider_id  TEXT,                          -- rate-plan / rate ID at provider
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

-- Helpful uniqueness for manual provider + season (one active rate per room/season)
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_rates_manual_season
  ON room_rates (business_id, room_id, season_id)
  WHERE active = true AND provider = 'manual' AND season_id IS NOT NULL;

-- ------------------------------------------------------------
-- 4. rate_specials
-- Temporary specials: fixed amount or percentage.
-- applies_to = 'all' | 'rooms'
--   - 'all'  → room_ids empty / ignored
--   - 'rooms' → room_ids lists the target rooms (one or many)
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
  -- percentage must be 0–100
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
-- 5. booking_rate_snapshots
-- AUTHORITATIVE immutable nightly rate record.
-- One row per room-night. Never recalculated from current rates.
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
-- 6. bookings — additive derived column only
-- room_revenue = SUM(resolved_rate) of its snapshots.
-- total_amount and season are intentionally untouched.
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
  'total_amount meaning is unchanged.';

-- ------------------------------------------------------------
-- 7. RLS (enable; policies remain application + service-role primary)
-- ------------------------------------------------------------
ALTER TABLE business_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_provider_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rate_snapshots ENABLE ROW LEVEL SECURITY;

-- Minimal tenant isolation policies (service role bypasses RLS).
-- Tighten / expand when full policy set is exported from Supabase.

DO $$
BEGIN
  -- business_seasons
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'business_seasons' AND policyname = 'business_seasons_tenant_isolation'
  ) THEN
    CREATE POLICY business_seasons_tenant_isolation ON business_seasons
      FOR ALL
      USING (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''))
      WITH CHECK (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''));
  END IF;

  -- rate_provider_mappings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rate_provider_mappings' AND policyname = 'rate_provider_mappings_tenant_isolation'
  ) THEN
    CREATE POLICY rate_provider_mappings_tenant_isolation ON rate_provider_mappings
      FOR ALL
      USING (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''))
      WITH CHECK (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''));
  END IF;

  -- room_rates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'room_rates' AND policyname = 'room_rates_tenant_isolation'
  ) THEN
    CREATE POLICY room_rates_tenant_isolation ON room_rates
      FOR ALL
      USING (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''))
      WITH CHECK (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''));
  END IF;

  -- rate_specials
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rate_specials' AND policyname = 'rate_specials_tenant_isolation'
  ) THEN
    CREATE POLICY rate_specials_tenant_isolation ON rate_specials
      FOR ALL
      USING (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''))
      WITH CHECK (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''));
  END IF;

  -- booking_rate_snapshots
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_rate_snapshots' AND policyname = 'booking_rate_snapshots_tenant_isolation'
  ) THEN
    CREATE POLICY booking_rate_snapshots_tenant_isolation ON booking_rate_snapshots
      FOR ALL
      USING (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''))
      WITH CHECK (business_id::text = COALESCE(current_setting('request.jwt.claims', true)::json->>'business_id', ''));
  END IF;
END $$;

-- ============================================================
-- End of migration 013_rate_management.sql
-- ============================================================
