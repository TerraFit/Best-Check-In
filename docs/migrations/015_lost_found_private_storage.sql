-- 015_lost_found_private_storage.sql
-- Lost & Found photos and collection signatures can contain guest personal data.
-- Keep the bucket private; application reads must use authorized short-lived signed URLs.

UPDATE storage.buckets
SET public = false
WHERE id = 'lost-found-photos';

COMMENT ON COLUMN lost_and_found.photo_urls IS
  'Storage paths (preferred) or legacy URLs in private bucket lost-found-photos; reads are converted to short-lived signed URLs by authorized server endpoints';
COMMENT ON COLUMN lost_and_found.collection_signature_url IS
  'Storage path (preferred) or legacy URL for handover signature in private bucket; reads are authorized and signed server-side';
