-- Housekeeping inventory catalogue and billing-ready consumption records.
-- Consumption is recorded now; external billing remains disabled until a PMS/NightBridge adapter is implemented.

CREATE TABLE IF NOT EXISTS housekeeping_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'minibar' CHECK (category IN ('minibar','coffee','other')),
  unit TEXT NOT NULL DEFAULT 'each',
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  nightbridge_item_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hk_inventory_items_business ON housekeeping_inventory_items(business_id, active, sort_order, name);

CREATE TABLE IF NOT EXISTS housekeeping_inventory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_session_id UUID NOT NULL REFERENCES housekeeping_service_sessions(id) ON DELETE CASCADE,
  housekeeping_task_id UUID REFERENCES housekeeping_tasks(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  inventory_item_id UUID REFERENCES housekeeping_inventory_items(id) ON DELETE SET NULL,
  item_name_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL,
  unit_snapshot TEXT NOT NULL DEFAULT 'each',
  quantity_taken INTEGER NOT NULL DEFAULT 0 CHECK (quantity_taken >= 0),
  quantity_restocked INTEGER NOT NULL DEFAULT 0 CHECK (quantity_restocked >= 0),
  unit_price_snapshot NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  billing_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (billing_status IN ('not_applicable','pending','posted','failed')),
  external_system TEXT,
  external_item_id TEXT,
  external_reference TEXT,
  client_reference UUID NOT NULL DEFAULT gen_random_uuid(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hk_inventory_record_client_reference ON housekeeping_inventory_records(client_reference);
CREATE INDEX IF NOT EXISTS idx_hk_inventory_records_business_created ON housekeeping_inventory_records(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_inventory_records_room_created ON housekeeping_inventory_records(business_id, room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_inventory_records_booking_created ON housekeeping_inventory_records(business_id, booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hk_inventory_records_session ON housekeeping_inventory_records(service_session_id, created_at DESC);

ALTER TABLE housekeeping_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_inventory_records ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE housekeeping_inventory_items IS 'Business-managed minibar/coffee inventory catalogue; nightbridge_item_id is reserved for future PMS mapping.';
COMMENT ON TABLE housekeeping_inventory_records IS 'Audited housekeeping consumption/replenishment records. Billing is intentionally decoupled and disabled until an external PMS adapter is implemented.';
