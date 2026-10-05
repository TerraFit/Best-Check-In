-- SuperAdmin and platform actor IDs are not required to be UUIDs.
alter table public.platform_employees alter column invited_by type text using invited_by::text;
alter table public.platform_employees alter column archived_by type text using archived_by::text;
