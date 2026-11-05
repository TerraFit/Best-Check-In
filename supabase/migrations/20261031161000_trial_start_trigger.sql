create or replace function public.set_fastcheckin_trial_start()
returns trigger
language plpgsql
as $$
begin
  if new.trial_end is not null and new.trial_start is null then
    new.trial_start := new.trial_end - interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_trial_start_trigger on public.businesses;
create trigger businesses_trial_start_trigger
before insert or update of trial_end, trial_start on public.businesses
for each row execute function public.set_fastcheckin_trial_start();

update public.businesses
set trial_start = trial_end - interval '14 days'
where trial_end is not null and trial_start is null and subscription_status in ('trial', 'trialing');
