-- Multi-right platform employees do not have a single legacy platform_role.
-- Keep platform_role only as a compatibility field for single-right employees.
alter table public.platform_employees alter column platform_role drop not null;
