-- Email delivery and engagement tracking for the SuperAdmin website-enquiry mini CRM.
create table if not exists public.website_enquiry_emails (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.website_enquiries(id) on delete set null,
  resend_email_id text unique,
  email_type text not null,
  recipient text not null,
  subject text not null,
  send_status text not null default 'sent'
    check (send_status in ('sent','delivered','opened','clicked','bounced','complained','failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  last_event_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists website_enquiry_emails_enquiry_created_idx
  on public.website_enquiry_emails(enquiry_id, created_at desc);
create index if not exists website_enquiry_emails_status_created_idx
  on public.website_enquiry_emails(send_status, created_at desc);
alter table public.website_enquiry_emails enable row level security;

create table if not exists public.website_email_events (
  event_id text primary key,
  resend_email_id text,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index if not exists website_email_events_email_idx
  on public.website_email_events(resend_email_id, occurred_at desc);
alter table public.website_email_events enable row level security;
