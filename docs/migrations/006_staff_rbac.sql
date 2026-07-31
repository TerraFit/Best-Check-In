-- 006_staff_rbac.sql
-- Safe additive migration for Role-Based Access Control on employees.
-- Does not delete existing staff records.

-- Canonical staff role (text for flexibility + custom roles)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS staff_role TEXT;

-- JSON array of permission capability keys (optional override / custom sets)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS permission_set JSONB DEFAULT NULL;

-- Explicit active flag (complements status)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Last login timestamp
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Backfill staff_role from legacy role column when empty
UPDATE employees
SET staff_role = COALESCE(NULLIF(staff_role, ''), role, 'EmployeeOverview')
WHERE staff_role IS NULL OR staff_role = '';

-- Sync active from status
UPDATE employees
SET active = CASE
  WHEN status = 'Disabled' THEN false
  WHEN status = 'Active' THEN true
  ELSE COALESCE(active, true)
END;

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_employees_staff_role
  ON employees (business_id, staff_role);

CREATE INDEX IF NOT EXISTS idx_employees_active
  ON employees (business_id, active)
  WHERE active = true;
