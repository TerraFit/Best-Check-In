-- 016_housekeeping_issues.sql
-- Structured housekeeping issues reported from checklist items.
-- Lost & Found remains a separate workflow.
-- Idempotent for production reconciliation: safe to run where the table already exists.

CREATE TABLE IF NOT EXISTS housekeeping_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_session_id UUID NOT NULL REFERENCES housekeeping_service_sessions(id) ON DELETE CASCADE,
  housekeeping_task_id UUID NOT NULL REFERENCES housekeeping_tasks(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  room_number TEXT,
  employee_id UUID,
  employee_name TEXT,
  checklist_item_id TEXT NOT NULL,
  checklist_item_label TEXT NOT NULL,
  category TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  other_description TEXT,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','verified','dismissed')),
  maintenance_requested BOOLEAN NOT NULL DEFAULT false,
  maintenance_status TEXT CHECK (maintenance_status IS NULL OR maintenance_status IN ('pending','assigned','in_progress','resolved','verified')),
  photo_url TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE housekeeping_issues ADD COLUMN IF NOT EXISTS room_number TEXT;
CREATE INDEX IF NOT EXISTS idx_hk_issues_business_status ON housekeeping_issues(business_id, status, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_issues_session ON housekeeping_issues(service_session_id, reported_at ASC);
CREATE INDEX IF NOT EXISTS idx_hk_issues_task ON housekeeping_issues(housekeeping_task_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_issues_room ON housekeeping_issues(business_id, room_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_issues_maintenance ON housekeeping_issues(business_id, maintenance_requested, maintenance_status, reported_at DESC);

ALTER TABLE housekeeping_issues ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('housekeeping-issue-photos', 'housekeeping-issue-photos', true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE housekeeping_issues IS 'Structured issues reported by housekeeping against a specific checklist item. Lost & Found is deliberately separate.';
COMMENT ON COLUMN housekeeping_issues.other_description IS 'Required when issue_type is Other.';
COMMENT ON COLUMN housekeeping_issues.maintenance_requested IS 'Whether the issue has explicitly been routed to Maintenance.';
