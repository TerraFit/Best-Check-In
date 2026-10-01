-- FastCheckIn Housekeeping Inventory Notifications (migration 021)
-- Dashboard visibility remains the default. Email is opt-in and independently configurable.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS housekeeping_inventory_dashboard_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS housekeeping_inventory_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS housekeeping_inventory_email TEXT;

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS housekeeping_inventory_email_format_check;

ALTER TABLE businesses
  ADD CONSTRAINT housekeeping_inventory_email_format_check
  CHECK (
    housekeeping_inventory_email IS NULL
    OR btrim(housekeeping_inventory_email) = ''
    OR housekeeping_inventory_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

COMMENT ON COLUMN businesses.housekeeping_inventory_dashboard_enabled IS 'Show housekeeping amenity consumption/sales in the business dashboard.';
COMMENT ON COLUMN businesses.housekeeping_inventory_email_enabled IS 'Send housekeeping amenity consumption/sales notifications by email.';
COMMENT ON COLUMN businesses.housekeeping_inventory_email IS 'Optional recipient for housekeeping inventory notifications.';
