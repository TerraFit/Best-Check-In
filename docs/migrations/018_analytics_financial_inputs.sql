-- ============================================================
-- 018 — Manual financial inputs for Analytics Snapshot PDFs
-- ============================================================
-- Financial figures are intentionally separate from booking data.
-- They are manually supplied by the business until a future
-- accounting / NightBridge integration can provide authoritative data.

CREATE TABLE IF NOT EXISTS analytics_financial_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  revenue NUMERIC(14,2),
  cost_of_sale NUMERIC(14,2),
  operating_costs NUMERIC(14,2),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analytics_financial_inputs_period_chk CHECK (date_to >= date_from),
  CONSTRAINT analytics_financial_inputs_values_chk CHECK (
    (revenue IS NULL OR revenue >= 0) AND
    (cost_of_sale IS NULL OR cost_of_sale >= 0) AND
    (operating_costs IS NULL OR operating_costs >= 0)
  ),
  CONSTRAINT analytics_financial_inputs_period_uidx UNIQUE (business_id, date_from, date_to)
);

CREATE INDEX IF NOT EXISTS idx_analytics_financial_inputs_business_period
  ON analytics_financial_inputs (business_id, date_from, date_to);

CREATE OR REPLACE FUNCTION set_analytics_financial_inputs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_analytics_financial_inputs_updated_at ON analytics_financial_inputs;
CREATE TRIGGER trg_analytics_financial_inputs_updated_at
  BEFORE UPDATE ON analytics_financial_inputs
  FOR EACH ROW EXECUTE FUNCTION set_analytics_financial_inputs_updated_at();

ALTER TABLE analytics_financial_inputs ENABLE ROW LEVEL SECURITY;

-- Browser access is not required; Netlify Functions use the service key
-- after enforcing the authoritative business identity in the JWT.
