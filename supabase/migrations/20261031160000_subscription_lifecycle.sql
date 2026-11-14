-- FastCheckIn subscription lifecycle foundation.
-- Stores only Peach customer/mandate references; never raw card data.

alter table public.businesses
  add column if not exists trial_start timestamp without time zone,
  add column if not exists payment_grace_ends_at timestamp without time zone,
  add column if not exists payment_attempted_at timestamp without time zone,
  add column if not exists payment_failure_count integer not null default 0,
  add column if not exists payment_last_error text,
  add column if not exists payment_provider text,
  add column if not exists payment_customer_id text,
  add column if not exists payment_mandate_id text;

create table if not exists public.subscription_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  billing_period_start timestamp without time zone not null,
  amount integer not null,
  currency text not null default 'ZAR',
  provider text not null default 'peach',
  provider_payment_id text,
  status text not null,
  error_code text,
  error_message text,
  attempt_number integer not null default 1,
  created_at timestamp without time zone not null default now(),
  updated_at timestamp without time zone not null default now(),
  unique (business_id, billing_period_start, attempt_number)
);

create index if not exists subscription_payment_attempts_business_idx
  on public.subscription_payment_attempts (business_id, created_at desc);

create table if not exists public.subscription_email_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_key text not null,
  recipient text not null,
  sent_at timestamp without time zone not null default now(),
  unique (business_id, event_key)
);

create index if not exists subscription_email_events_business_idx
  on public.subscription_email_events (business_id, sent_at desc);

create table if not exists public.trial_extensions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  previous_trial_end timestamp without time zone,
  new_trial_end timestamp without time zone not null,
  added_days integer,
  reason text not null,
  granted_by uuid,
  created_at timestamp without time zone not null default now()
);

create index if not exists trial_extensions_business_idx
  on public.trial_extensions (business_id, created_at desc);

alter table public.subscription_payment_attempts enable row level security;
alter table public.subscription_email_events enable row level security;
alter table public.trial_extensions enable row level security;

-- These operational tables are server-side only. No public/authenticated policies are created.

-- Existing paid businesses were previously left in `trial` status by the legacy billing flow.
-- Promote records that already have a confirmed paid state without touching unpaid/test trials.
update public.businesses
set
  subscription_status = 'active',
  trial_end = null,
  payment_grace_ends_at = null,
  payment_failure_count = 0,
  payment_last_error = null,
  updated_at = now()
where payment_status = 'paid'
  and subscription_status in ('trial', 'trialing');
