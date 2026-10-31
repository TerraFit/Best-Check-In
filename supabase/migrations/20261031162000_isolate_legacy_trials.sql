-- Do not let the new automated billing engine suddenly charge or restrict
-- historical trial records created before the subscription lifecycle existed.
-- Paid records were promoted to active by the previous migration.
update public.businesses
set subscription_status = 'legacy_trial', updated_at = now()
where subscription_status in ('trial', 'trialing')
  and payment_status is distinct from 'paid'
  and trial_end is not null
  and trial_end < now() - interval '7 days';
