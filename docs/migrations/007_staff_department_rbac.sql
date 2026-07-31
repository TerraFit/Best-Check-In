-- 007_staff_department_rbac.sql
-- Additive: department + current_shift for organisational structure.
-- Does not delete existing staff. Does not change permissions logic.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS current_shift TEXT;

-- Backfill department from staff_role / role heuristics when empty
UPDATE employees
SET department = CASE
  WHEN COALESCE(staff_role, role) IN ('housekeeper', 'team_leader') THEN 'housekeeping'
  WHEN COALESCE(staff_role, role) = 'laundry_attendant' THEN 'laundry'
  WHEN COALESCE(staff_role, role) = 'maintenance' THEN 'maintenance'
  WHEN COALESCE(staff_role, role) IN ('front_desk', 'night_auditor') THEN 'front_office'
  WHEN COALESCE(staff_role, role) IN ('administration', 'finance') THEN 'administration'
  WHEN COALESCE(staff_role, role) = 'marketing' THEN 'marketing'
  WHEN COALESCE(staff_role, role) = 'security' THEN 'security'
  WHEN COALESCE(staff_role, role) IN ('general_manager', 'supervisor', 'business_owner') THEN 'management'
  ELSE COALESCE(department, 'custom')
END
WHERE department IS NULL OR department = '';

CREATE INDEX IF NOT EXISTS idx_employees_department
  ON employees (business_id, department);
