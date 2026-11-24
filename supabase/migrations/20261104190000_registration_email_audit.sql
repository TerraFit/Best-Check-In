-- Track each registration card-validation email issuance and resend attempt.
alter table public.registration_application_tokens
  add column if not exists email_send_status text not null default 'not_attempted',
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text,
  add column if not exists resend_email_id text,
  add column if not exists created_by text;

create index if not exists registration_application_tokens_email_audit_idx
  on public.registration_application_tokens (business_id, created_at desc, email_send_status);
