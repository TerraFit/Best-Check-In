create table if not exists public.platform_employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  platform_role text not null check (platform_role in ('platform_operations','platform_developer','platform_finance','platform_analytics','platform_compliance','platform_support')),
  status text not null default 'Invited' check (status in ('Invited','Active','Archived')),
  password_hash text,
  invitation_token_hash text,
  invitation_expires_at timestamptz,
  invited_at timestamptz not null default now(),
  invited_by uuid,
  activated_at timestamptz,
  last_login timestamptz,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_platform_employees_email_lower on public.platform_employees (lower(email));
create index if not exists idx_platform_employees_status on public.platform_employees (status);
create index if not exists idx_platform_employees_role on public.platform_employees (platform_role);
alter table public.platform_employees enable row level security;
revoke all on public.platform_employees from anon, authenticated;
create table if not exists public.platform_employee_audit (
  id uuid primary key default gen_random_uuid(),
  platform_employee_id uuid references public.platform_employees(id) on delete set null,
  action text not null,
  actor_id text,
  actor_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_platform_employee_audit_employee on public.platform_employee_audit (platform_employee_id, created_at desc);
create index if not exists idx_platform_employee_audit_created on public.platform_employee_audit (created_at desc);
alter table public.platform_employee_audit enable row level security;
revoke all on public.platform_employee_audit from anon, authenticated;
