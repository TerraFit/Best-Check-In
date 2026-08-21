-- FastCheckIn Housekeeping Service Performance — Stage B additive migration
-- Adds recoverable structured checklist state to the Stage A session table (004).

ALTER TABLE housekeeping_service_sessions
  ADD COLUMN IF NOT EXISTS checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_active_business
  ON housekeeping_service_sessions(business_id, status, started_at DESC);

COMMENT ON COLUMN housekeeping_service_sessions.checklist_state IS
  'Structured checklist item state keyed by stable checklist item id; survives browser refresh/sleep.';
