-- 016_harden_lost_found_rls_auth_metadata.sql
-- Never use editable auth.user_metadata for tenant authorization.
-- The application server uses authoritative JWT validation + tenant binding;
-- these policies provide safe defense-in-depth for direct authenticated Data API access.

drop policy if exists laf_delete_own on public.lost_and_found;
drop policy if exists laf_insert_own on public.lost_and_found;
drop policy if exists laf_select_own on public.lost_and_found;
drop policy if exists laf_update_own on public.lost_and_found;
drop policy if exists laf_activity_insert_own on public.lost_and_found_activity;
drop policy if exists laf_activity_select_own on public.lost_and_found_activity;
drop policy if exists laf_cat_select on public.lost_and_found_categories;
drop policy if exists laf_storage_select on public.lost_and_found_storage_locations;
drop policy if exists laf_seq_all_own on public.lost_and_found_tag_sequences;

create policy laf_select_own on public.lost_and_found
  for select to authenticated
  using ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_insert_own on public.lost_and_found
  for insert to authenticated
  with check ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_update_own on public.lost_and_found
  for update to authenticated
  using ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''))
  with check ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_delete_own on public.lost_and_found
  for delete to authenticated
  using ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_activity_select_own on public.lost_and_found_activity
  for select to authenticated
  using ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_activity_insert_own on public.lost_and_found_activity
  for insert to authenticated
  with check ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_cat_select on public.lost_and_found_categories
  for select to authenticated
  using (business_id is null or (business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_storage_select on public.lost_and_found_storage_locations
  for select to authenticated
  using (business_id is null or (business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));

create policy laf_seq_all_own on public.lost_and_found_tag_sequences
  for all to authenticated
  using ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''))
  with check ((business_id)::text = coalesce((auth.jwt() -> 'app_metadata' ->> 'business_id'), ''));
