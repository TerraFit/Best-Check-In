-- 005_room_readiness.sql
-- Normalize housekeeping_status to readiness vocabulary.
-- Safe / idempotent. Does not drop legacy values from CHECK constraints
-- if none exist; only rewrites row values.
--
-- Canonical readiness:
--   ready | not_ready | cleaning_in_progress | awaiting_inspection | do_not_disturb
--
-- Legacy mapped:
--   clean, inspected              → ready
--   dirty, refresh_required,
--   full_service_required         → not_ready

UPDATE rooms
SET housekeeping_status = 'ready',
    updated_at = NOW()
WHERE housekeeping_status IN ('clean', 'inspected');

UPDATE rooms
SET housekeeping_status = 'not_ready',
    updated_at = NOW()
WHERE housekeeping_status IN ('dirty', 'refresh_required', 'full_service_required');

-- Optional: default for brand-new rooms (if column default still 'clean')
-- ALTER TABLE rooms ALTER COLUMN housekeeping_status SET DEFAULT 'ready';
