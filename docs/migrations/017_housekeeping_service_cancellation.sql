-- FastCheckIn Housekeeping Service Performance — cancellation audit (migration 017)
-- Apply after 016_housekeeping_issues.sql.
-- Cancellation is distinct from completion and requires an auditable reason.

ALTER TABLE housekeeping_service_sessions
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE housekeeping_service_sessions
  DROP CONSTRAINT IF EXISTS housekeeping_service_sessions_cancellation_reason_check;

ALTER TABLE housekeeping_service_sessions
  ADD CONSTRAINT housekeeping_service_sessions_cancellation_reason_check
  CHECK (status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL AND btrim(cancellation_reason) <> ''));

CREATE INDEX IF NOT EXISTS idx_hk_service_sessions_cancelled
  ON housekeeping_service_sessions(business_id, cancelled_at DESC)
  WHERE status = 'cancelled';

COMMENT ON COLUMN housekeeping_service_sessions.cancellation_reason IS 'Required human-readable reason when a housekeeping service session is cancelled.';
COMMENT ON COLUMN housekeeping_service_sessions.cancelled_by IS 'Employee ID or actor ID that cancelled the housekeeping service.';
