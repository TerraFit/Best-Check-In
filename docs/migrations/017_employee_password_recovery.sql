-- Employee password recovery via short-lived SMS OTPs.
-- Renumbered to 017 because Phase 1 already uses 015/016 for housekeeping work.
-- No plaintext OTP is stored.

CREATE TABLE IF NOT EXISTS employee_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_password_resets_employee
  ON employee_password_resets(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_password_resets_expiry
  ON employee_password_resets(expires_at);

ALTER TABLE employee_password_resets ENABLE ROW LEVEL SECURITY;

-- Recovery is performed by Netlify using the service role. No client policy is required.

COMMENT ON TABLE employee_password_resets IS
  'Short-lived, single-use password reset OTP hashes for employee SMS recovery.';
