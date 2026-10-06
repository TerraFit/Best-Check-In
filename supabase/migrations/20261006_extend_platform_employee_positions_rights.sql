-- Add editable organisational position and multiple platform rights.
-- Rights are intentionally separate from business-employee roles and from the
-- legacy single platform_role column, which remains for compatibility.
alter table public.platform_employees add column if not exists position text;
alter table public.platform_employees add column if not exists rights text[] not null default '{}'::text[];

update public.platform_employees
set position = coalesce(position, 'member')
where position is null;

update public.platform_employees
set rights = case
  when rights = '{}'::text[] and platform_role is not null
    then array[replace(platform_role, 'platform_', '')]
  else rights
end
where rights = '{}'::text[];

alter table public.platform_employees drop constraint if exists platform_employees_position_check;
alter table public.platform_employees
  add constraint platform_employees_position_check
  check (position in ('general_manager','manager','supervisor','member'));

alter table public.platform_employees drop constraint if exists platform_employees_rights_check;
alter table public.platform_employees
  add constraint platform_employees_rights_check
  check (rights <@ array['operations','developer','finance','analytics','compliance','support']::text[]);

create index if not exists platform_employees_position_idx
  on public.platform_employees(position);

create index if not exists platform_employees_rights_gin_idx
  on public.platform_employees using gin(rights);
