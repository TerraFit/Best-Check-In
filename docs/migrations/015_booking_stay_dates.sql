-- FastCheckIn Booking Stay Dates — Migration 015
-- Source of truth: check_in_date + nights. check_out_date is derived.
-- Run after existing booking migrations.

-- Backfill any historical bookings where checkout is missing or inconsistent.
UPDATE bookings
SET check_out_date = (check_in_date + nights)::date
WHERE check_in_date IS NOT NULL
  AND nights IS NOT NULL
  AND nights >= 1
  AND check_out_date IS DISTINCT FROM (check_in_date + nights)::date;

-- Keep checkout synchronized for every future INSERT/UPDATE.
CREATE OR REPLACE FUNCTION sync_booking_checkout_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.check_in_date IS NULL THEN
    RAISE EXCEPTION 'check_in_date is required';
  END IF;

  IF NEW.nights IS NULL OR NEW.nights < 1 THEN
    RAISE EXCEPTION 'nights must be at least 1';
  END IF;

  NEW.check_out_date := (NEW.check_in_date + NEW.nights)::date;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_checkout_date ON bookings;
CREATE TRIGGER trg_sync_booking_checkout_date
BEFORE INSERT OR UPDATE OF check_in_date, nights, check_out_date
ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_booking_checkout_date();

COMMENT ON COLUMN bookings.nights IS 'Authoritative length of stay in nights. Checkout date is derived automatically as check_in_date + nights.';
COMMENT ON COLUMN bookings.check_out_date IS 'Derived from check_in_date + nights. Client-supplied values are ignored/replaced.';
