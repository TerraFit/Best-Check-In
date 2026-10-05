-- SuperAdmin mini-CRM for website enquiries.
-- Platform employees are distinct from accommodation-establishment employees.

create table if not exists public.platform_employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_enquiry_activities (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.website_enquiries(id) on delete cascade,
  employee_id uuid references public.platform_employees(id) on delete set null,
  employee_name text,
  activity_type text not null default 'comment' check (activity_type in ('comment','call','email','meeting','note')),
  comment text not null,
  created_at timestamptz not null default now()
);

alter table public.website_enquiries
  add column if not exists assigned_employee_id uuid references public.platform_employees(id) on delete set null,
  add column if not exists assigned_employee_name text,
  add column if not exists assigned_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by text;

alter table public.website_enquiries
  drop constraint if exists website_enquiries_status_check;

alter table public.website_enquiries
  add constraint website_enquiries_status_check check (status in (
    'new',
    'open_not_contacted',
    'in_progress',
    'attempted_to_contact',
    'connected_bad_timing',
    'qualified',
    'unqualified',
    'converted'
  ));

create index if not exists website_enquiries_crm_created_idx
  on public.website_enquiries(created_at desc);
create index if not exists website_enquiries_crm_status_idx
  on public.website_enquiries(status, created_at desc);
create index if not exists website_enquiries_crm_assigned_idx
  on public.website_enquiries(assigned_employee_id, created_at desc);
create index if not exists website_enquiry_activities_enquiry_idx
  on public.website_enquiry_activities(enquiry_id, created_at desc);

alter table public.platform_employees enable row level security;
alter table public.website_enquiry_activities enable row level security;
