-- Additive: reason when room is not available for allocation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'unavailable_reason'
  ) THEN
    ALTER TABLE rooms ADD COLUMN unavailable_reason TEXT;
  END IF;
END $$;
