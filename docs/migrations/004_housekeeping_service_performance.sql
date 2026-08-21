-- FastCheckIn Housekeeping Service Performance — Stage A
-- Adds service-session history and configurable target durations.
-- Do NOT remove or alter the existing housekeeping task schedule.

CREATE TABLE IF NOT EXISTS housekeeping_service_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  warning_minutes INTEGER NOT NULL DEFAULT 15 CHECK (warning_minutes >= 0),
  final_countdown_seconds INTEGER NOT NULL DEFAULT 5 CHECK (final_countdown_seconds BETWEEN 1 AND 60),
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_pause BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housekeeping_service_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('refresh','full_service','deep_cleaning','mattress_flip_air','checkout_inspection')),
  room_type TEXT,
  target_minutes INTEGER NOT NULL CHECK (target_minutes > 0 AND target_minutes <= 1440),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hk_service_targets_unique
  ON housekeeping_service_targets(business_id, service_type, COALESCE(room_type, '__DEFAULT__'));
CREATE INDEX IF NOT EXISTS idx_hk_service_targets_lookup
  ON housekeeping_service_targets(business_id, service_type, room_type, active);

CREATE TABLE IF NOT EXISTS housekeeping_service_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  housekeeping_task_id UUID NOT NULL REFERENCES housekeeping_tasks(id) ON DELETE RESTRICT,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  employee_id UUID,
  employee_name TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('refresh','full_service','deep_cleaning','mattress_flip_air','checkout_inspection')),
  room_type_snapshot TEXT,
  target_minutes_snapshot INTEGER NOT NULL CHECK (target_minutes_snapshot > 0),
  warning_minutes_snapshot INTEGER NOT NULL DEFAULT 15 CHECK (warning_minutes_snapshot >= 0),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  actual_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','abandoned')),
  checklist_completed_count INTEGER NOT NULL DEFAULT 0 CHECK (checklist_completed_count >= 0),
  checklist_total_count INTEGER NOT NULL DEFAULT 0 CHECK (checklist_total_count >= 0),
  issues_reported_count INTEGER NOT NULL DEFAULT 0 CHECK (issues_reported_count >= 0),
  quality_result TEXT CHECK (quality_result IS NULL OR quality_result IN ('pending','passed','passed_with_minor_issue','failed_rework_required')),
  rework_started_at TIMESTAMPTZ,
  rework_completed_at TIMESTAMPTZ,
  rework_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_business_started ON housekeeping_service_sessions(business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_employee ON housekeeping_service_sessions(business_id, employee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_task ON housekeeping_service_sessions(housekeeping_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hk_service_sessions_one_active_task ON housekeeping_service_sessions(housekeeping_task_id) WHERE status = 'active';

ALTER TABLE housekeeping_service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_service_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_service_sessions ENABLE ROW LEVEL SECURITY;

INSERT INTO housekeeping_service_settings (business_id)
SELECT id FROM businesses
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO housekeeping_service_targets (business_id, service_type, room_type, target_minutes)
SELECT b.id, v.service_type, NULL, v.target_minutes
FROM businesses b
CROSS JOIN (VALUES ('refresh',45),('full_service',60),('deep_cleaning',120),('mattress_flip_air',30),('checkout_inspection',10)) AS v(service_type,target_minutes)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE housekeeping_service_sessions IS 'Performance history for each housekeeping service execution. Target values are snapshots so historical performance never changes when management edits configuration.';
COMMENT ON COLUMN housekeeping_service_targets.room_type IS 'Optional generic room-type override such as Standard, Junior Suite, Suite, Luxury Suite, Presidential Suite or Penthouse. NULL means the service-level default.';
