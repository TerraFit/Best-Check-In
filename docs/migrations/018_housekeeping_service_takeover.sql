-- FastCheckIn Housekeeping Service Performance — takeover audit (migration 018)
-- A takeover preserves the original service start time and checklist state while
-- retaining the previous employee's session as an auditable cancelled handover.

ALTER TABLE housekeeping_service_sessions
  ADD COLUMN IF NOT EXISTS takeover_from_session_id UUID,
  ADD COLUMN IF NOT EXISTS takeover_reason TEXT,
  ADD COLUMN IF NOT EXISTS taken_over_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS taken_over_by UUID;

CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_takeover
  ON housekeeping_service_sessions(business_id, takeover_from_session_id)
  WHERE takeover_from_session_id IS NOT NULL;

COMMENT ON COLUMN housekeeping_service_sessions.takeover_from_session_id IS 'Previous service session replaced by this takeover.';
COMMENT ON COLUMN housekeeping_service_sessions.takeover_reason IS 'Human-readable reason supplied when this service session was taken over.';
COMMENT ON COLUMN housekeeping_service_sessions.taken_over_at IS 'Timestamp at which this service session was created as a takeover.';
COMMENT ON COLUMN housekeeping_service_sessions.taken_over_by IS 'Employee or actor that took over the previous service session.';
