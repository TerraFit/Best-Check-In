-- 014_employee_additional_departments.sql
-- Allows small properties to give one employee multiple organisational departments.
-- The existing primary `department` remains unchanged for backwards compatibility.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS additional_departments TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_employees_additional_departments_gin
  ON employees USING GIN (additional_departments);
