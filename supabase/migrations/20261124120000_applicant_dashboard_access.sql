-- Secure one-time password setup for applicants after card validation.
create table if not exists public.business_account_setup_tokens (
  token_hash text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists business_account_setup_tokens_business_idx
  on public.business_account_setup_tokens (business_id, expires_at desc);
alter table public.business_account_setup_tokens enable row level security;
revoke all on public.business_account_setup_tokens from anon, authenticated;
grant all on public.business_account_setup_tokens to service_role;

create or replace function public.set_business_password_with_application_token(
  p_token_hash text,
  p_password_hash text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_password_hash is null or length(p_password_hash) < 20 then
    raise exception 'INVALID_OR_EXPIRED_TOKEN';
  end if;

  select business_id into v_business_id
  from public.business_account_setup_tokens
  where token_hash = p_token_hash
    and used_at is null
    and expires_at > now()
  for update;

  if v_business_id is null then
    raise exception 'INVALID_OR_EXPIRED_TOKEN';
  end if;

  update public.businesses
  set password_hash = p_password_hash,
      setup_complete = true,
      updated_at = now()
  where id = v_business_id
    and status in ('pending', 'approved');

  if not found then
    raise exception 'INVALID_OR_EXPIRED_TOKEN';
  end if;

  update public.business_account_setup_tokens
  set used_at = now()
  where token_hash = p_token_hash and used_at is null;

  return v_business_id;
end;
$$;

revoke all on function public.set_business_password_with_application_token(text, text) from public, anon, authenticated;
grant execute on function public.set_business_password_with_application_token(text, text) to service_role;

alter table public.businesses
  add column if not exists registration_confirmation_sent_at timestamptz;
