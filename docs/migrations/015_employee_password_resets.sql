CREATE TABLE IF NOT EXISTS employee_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_password_resets_employee ON employee_password_resets(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_password_resets_token_hash ON employee_password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_employee_password_resets_expiry ON employee_password_resets(expires_at);
ALTER TABLE employee_password_resets ENABLE ROW LEVEL SECURITY;
