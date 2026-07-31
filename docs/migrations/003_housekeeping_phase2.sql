-- FastCheckIn Phase 2: Intelligent Housekeeping Engine
-- Run in Supabase SQL Editor after Phase 1 rooms schema

CREATE TABLE IF NOT EXISTS housekeeping_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  policy                  TEXT NOT NULL DEFAULT 'standard'
                            CHECK (policy IN ('eco', 'standard', 'premium', 'custom')),
  custom_refresh_interval INTEGER DEFAULT 2,
  custom_full_interval    INTEGER DEFAULT 3,
  allow_skip_refresh      BOOLEAN NOT NULL DEFAULT true,
  mandatory_checkout_fs   BOOLEAN NOT NULL DEFAULT true,
  auto_generate           BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id           UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_number       INTEGER,
  room_name         TEXT,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_name        TEXT,
  task_type         TEXT NOT NULL CHECK (task_type IN ('refresh', 'full_service')),
  is_checkout       BOOLEAN NOT NULL DEFAULT false,
  scheduled_date    DATE NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'standard'
                      CHECK (priority IN ('vip', 'early_arrival', 'standard', 'late_checkout', 'maintenance')),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'cancelled')),
  assigned_staff_id UUID,
  assigned_staff_name TEXT,
  notes             TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  completed_by      UUID,
  inspection_status TEXT CHECK (inspection_status IS NULL OR inspection_status IN ('pending', 'approved', 'rejected')),
  policy_used       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hk_tasks_business_date ON housekeeping_tasks(business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_room ON housekeeping_tasks(room_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_status ON housekeeping_tasks(business_id, status);
CREATE INDEX IF NOT EXISTS idx_hk_tasks_booking ON housekeeping_tasks(booking_id);

-- Lost & Found preparation (no UI yet)
CREATE TABLE IF NOT EXISTS lost_and_found (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id           UUID REFERENCES rooms(id) ON DELETE SET NULL,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_name        TEXT,
  housekeeping_task_id UUID REFERENCES housekeeping_tasks(id) ON DELETE SET NULL,
  found_by_staff_id UUID,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'claimed', 'disposed', 'archived')),
  found_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laf_business ON lost_and_found(business_id);
CREATE INDEX IF NOT EXISTS idx_laf_room ON lost_and_found(room_id);

ALTER TABLE housekeeping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found ENABLE ROW LEVEL SECURITY;
