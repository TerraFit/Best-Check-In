-- 008_employee_role_hierarchy.sql
-- Normalise employees.role / staff_role to authority hierarchy only.
-- Department remains separate. Full backwards-compatible data conversion.

-- Drop existing role CHECK constraint(s) if present
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_staff_role_check;

-- Convert legacy job-title / system roles → hierarchy authority levels
UPDATE employees
SET role = CASE
  WHEN role IN ('general_manager', 'General Manager', 'gm', 'GM', 'manager', 'Manager') THEN 'Manager'
  WHEN role IN ('supervisor', 'Supervisor') THEN 'Supervisor'
  WHEN role IN ('team_leader', 'Team Leader', 'lead', 'TeamLeader') THEN 'Team Leader'
  WHEN role IN ('foreman', 'Foreman') THEN 'Foreman'
  WHEN role IN ('director', 'Director') THEN 'Director'
  WHEN role IN ('EmployeeOverview', 'Employee (Legacy)', 'employee', 'Employee', 'custom', 'Custom Role', 'Custom') THEN 'Employee (Legacy)'
  WHEN role IN (
    'front_desk', 'Front Desk', 'housekeeper', 'Housekeeper',
    'laundry_attendant', 'Laundry Attendant', 'maintenance', 'Maintenance',
    'administration', 'Administration', 'marketing', 'Marketing',
    'finance', 'Finance', 'night_auditor', 'Night Auditor',
    'security', 'Security', 'receptionist', 'reception'
  ) THEN 'Employee (Legacy)'
  WHEN role IS NULL OR role = '' THEN 'Employee (Legacy)'
  ELSE 'Employee (Legacy)'
END;

UPDATE employees
SET staff_role = CASE
  WHEN COALESCE(staff_role, '') IN ('general_manager', 'General Manager', 'gm', 'GM', 'manager', 'Manager') THEN 'Manager'
  WHEN COALESCE(staff_role, '') IN ('supervisor', 'Supervisor') THEN 'Supervisor'
  WHEN COALESCE(staff_role, '') IN ('team_leader', 'Team Leader', 'lead', 'TeamLeader') THEN 'Team Leader'
  WHEN COALESCE(staff_role, '') IN ('foreman', 'Foreman') THEN 'Foreman'
  WHEN COALESCE(staff_role, '') IN ('director', 'Director') THEN 'Director'
  WHEN COALESCE(staff_role, '') IN ('EmployeeOverview', 'Employee (Legacy)', 'employee', 'Employee', 'custom', 'Custom Role', 'Custom') THEN 'Employee (Legacy)'
  WHEN COALESCE(staff_role, '') IN (
    'front_desk', 'Front Desk', 'housekeeper', 'Housekeeper',
    'laundry_attendant', 'Laundry Attendant', 'maintenance', 'Maintenance',
    'administration', 'Administration', 'marketing', 'Marketing',
    'finance', 'Finance', 'night_auditor', 'Night Auditor',
    'security', 'Security', 'receptionist', 'reception'
  ) THEN 'Employee (Legacy)'
  WHEN staff_role IS NULL OR staff_role = '' THEN COALESCE(role, 'Employee (Legacy)')
  ELSE 'Employee (Legacy)'
END;

-- Keep staff_role in sync with role after conversion
UPDATE employees
SET staff_role = role
WHERE staff_role IS DISTINCT FROM role;

-- New CHECK: only hierarchy authority levels on role
ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (
    role IS NULL
    OR role IN (
      'Employee (Legacy)',
      'Team Leader',
      'Supervisor',
      'Foreman',
      'Manager',
      'Director'
    )
  );

-- Optional matching constraint on staff_role (nullable for partial backfills)
ALTER TABLE employees
  ADD CONSTRAINT employees_staff_role_check
  CHECK (
    staff_role IS NULL
    OR staff_role IN (
      'Employee (Legacy)',
      'Team Leader',
      'Supervisor',
      'Foreman',
      'Manager',
      'Director'
    )
  );

NOTIFY pgrst, 'reload schema';
