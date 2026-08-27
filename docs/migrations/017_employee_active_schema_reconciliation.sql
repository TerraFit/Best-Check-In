-- 017_employee_active_schema_reconciliation.sql
-- Reconciles production employee schema drift with the RBAC contract.
-- Safe to re-run: additive only.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

UPDATE employees
SET active = CASE
  WHEN status = 'Disabled' THEN false
  WHEN status = 'Active' THEN true
  ELSE COALESCE(active, true)
END
WHERE active IS DISTINCT FROM CASE
  WHEN status = 'Disabled' THEN false
  WHEN status = 'Active' THEN true
  ELSE COALESCE(active, true)
END;

CREATE INDEX IF NOT EXISTS idx_employees_active
  ON employees (business_id, active)
  WHERE active = true;
