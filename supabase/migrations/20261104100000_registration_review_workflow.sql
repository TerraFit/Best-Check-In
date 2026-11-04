-- Registration card mandate, approval scheduling, and applicant review workflow.
-- This migration is committed to the feature branch only; it is not applied to the live database.

alter table public.businesses
  add column if not exists registration_payment_status text not null default 'not_started',
  add column if not exists registration_payment_intent_id text,
  add column if not exists registration_card_verified_at timestamptz,
  add column if not exists trial_scheduled_start timestamptz;

create table if not exists public.registration_application_tokens (
  token_hash text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists registration_application_tokens_business_idx
  on public.registration_application_tokens (business_id, expires_at desc);

create table if not exists public.business_application_review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  request_type text not null check (request_type in ('clarification', 'document_replacement', 'additional_information')),
  document_key text,
  message text not null,
  status text not null default 'awaiting_applicant' check (status in ('awaiting_applicant', 'responded', 'closed')),
  requested_by text,
  requested_at timestamptz not null default now(),
  applicant_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_application_review_requests_business_idx
  on public.business_application_review_requests (business_id, created_at desc);

create table if not exists public.business_application_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  review_request_id uuid references public.business_application_review_requests(id) on delete set null,
  document_key text not null,
  storage_path text not null,
  original_filename text not null,
  content_type text not null,
  uploaded_by text not null default 'applicant',
  created_at timestamptz not null default now()
);

create index if not exists business_application_documents_business_idx
  on public.business_application_documents (business_id, created_at desc);

alter table public.registration_application_tokens enable row level security;
alter table public.business_application_review_requests enable row level security;
alter table public.business_application_documents enable row level security;

revoke all on public.registration_application_tokens from anon, authenticated;
revoke all on public.business_application_review_requests from anon, authenticated;
revoke all on public.business_application_documents from anon, authenticated;
grant all on public.registration_application_tokens to service_role;
grant all on public.business_application_review_requests to service_role;
grant all on public.business_application_documents to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-application-documents', 'business-application-documents', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

-- No Storage policies are added: all document access must go through authenticated
-- Netlify functions using the server-side service key and short-lived signed URLs.
