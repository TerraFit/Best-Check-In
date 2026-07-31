-- ============================================================
-- FastCheckIn Lost & Found — Migration 010
-- Collection confirmation, reminders, guest_replied status,
-- operational storage location seeds.
-- ============================================================

-- Collection / handover fields
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS collected_by_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS collected_by_id_number TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS collection_signature_url TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS released_by_staff_id UUID;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS released_by_staff_name TEXT;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

-- Expand activity event types for collection + reminders
ALTER TABLE lost_and_found_activity DROP CONSTRAINT IF EXISTS lost_and_found_activity_event_type_check;
ALTER TABLE lost_and_found_activity
  ADD CONSTRAINT lost_and_found_activity_event_type_check
  CHECK (event_type IN (
    'created',
    'photos_added',
    'status_change',
    'note_added',
    'guest_contacted',
    'guest_replied',
    'storage_updated',
    'returned',
    'collected',
    'archived',
    'updated',
    'reminder_sent'
  ));

-- Add guest_replied to status lifecycle (between guest_contacted and collection_arranged)
ALTER TABLE lost_and_found DROP CONSTRAINT IF EXISTS lost_and_found_status_check;
ALTER TABLE lost_and_found
  ADD CONSTRAINT lost_and_found_status_check
  CHECK (status IN (
    'newly_found',
    'awaiting_contact',
    'guest_contacted',
    'guest_replied',
    'collection_arranged',
    'courier_booked',
    'returned',
    'collected',
    'unclaimed',
    'archived'
  ));

-- Operational storage locations (global builtins)
INSERT INTO lost_and_found_storage_locations (business_id, name, is_builtin, sort_order)
SELECT NULL, v.name, true, v.sort_order
FROM (VALUES
  ('Reception Safe', 10),
  ('Reception Shelf A', 20),
  ('Reception Shelf B', 30),
  ('Housekeeping Cupboard', 40),
  ('Manager Safe', 50),
  ('Maintenance Room', 60),
  ('Laundry', 70),
  ('External Storage', 80)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM lost_and_found_storage_locations s
  WHERE s.business_id IS NULL AND lower(s.name) = lower(v.name)
);

-- Soft-deprecate overly generic builtins if present (keep active for existing data)
-- Businesses should prefer the operational names above.

COMMENT ON COLUMN lost_and_found.photo_urls IS 'Public or signed URLs in bucket lost-found-photos/{business_id}/{yyyy}/{mm}/{tag}/';
COMMENT ON COLUMN lost_and_found.collection_signature_url IS 'Signature image URL captured at handover';
