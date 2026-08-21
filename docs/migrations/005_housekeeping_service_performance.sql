-- FastCheckIn Housekeeping Service Performance — Stage A/B
-- Adds immutable service-session records and configurable execution targets.
-- Run after housekeeping migrations 003/004.

ALTER TABLE housekeeping_settings
  ADD COLUMN IF NOT EXISTS refresh_target_seconds INTEGER NOT NULL DEFAULT 2700,
  ADD COLUMN IF NOT EXISTS full_service_target_seconds INTEGER NOT NULL DEFAULT 3600,
  ADD COLUMN IF NOT EXISTS warning_threshold_seconds INTEGER NOT NULL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS final_countdown_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS warning_sound_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_warning_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS housekeeping_service_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_id UUID NOT NULL UNIQUE REFERENCES housekeeping_tasks(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_type TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('refresh', 'full_service')),
  target_duration_seconds INTEGER NOT NULL CHECK (target_duration_seconds > 0),
  warning_threshold_seconds INTEGER NOT NULL DEFAULT 900 CHECK (warning_threshold_seconds >= 0),
  final_countdown_seconds INTEGER NOT NULL DEFAULT 5 CHECK (final_countdown_seconds >= 0),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  actual_duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_by UUID,
  completed_by UUID,
  checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  issue_count INTEGER NOT NULL DEFAULT 0,
  rework_required BOOLEAN NOT NULL DEFAULT false,
  rework_started_at TIMESTAMPTZ,
  rework_completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_business_started
  ON housekeeping_service_sessions(business_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_room
  ON housekeeping_service_sessions(room_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_active
  ON housekeeping_service_sessions(business_id, status)
  WHERE status = 'active';

ALTER TABLE housekeeping_service_sessions ENABLE ROW LEVEL SECURITY;
