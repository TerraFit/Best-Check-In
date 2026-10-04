create table if not exists public.website_enquiries (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  full_name text not null,
  company_name text not null,
  email text not null,
  telephone text not null,
  address text,
  website text,
  total_rooms integer,
  total_establishments integer,
  sa_establishments integer,
  sa_provinces text[] not null default '{}',
  international_establishments integer not null default 0,
  international_countries text[] not null default '{}',
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists website_enquiries_status_created_idx
  on public.website_enquiries(status, created_at desc);

alter table public.website_enquiries enable row level security;
