-- Add wrap_sqft (full wrap minus roof), install formula fields, and data quality flag
-- to vehicle_measurements table.

ALTER TABLE vehicle_measurements
  ADD COLUMN IF NOT EXISTS wrap_sqft numeric,
  ADD COLUMN IF NOT EXISTS install_hours numeric,
  ADD COLUMN IF NOT EXISTS install_pay numeric,
  ADD COLUMN IF NOT EXISTS data_quality text DEFAULT 'good';

-- Backfill wrap_sqft for existing data: full_wrap - roof (fallback: full * 0.85)
UPDATE vehicle_measurements
SET wrap_sqft = COALESCE(full_wrap_sqft, 0) - COALESCE(roof_sqft, COALESCE(full_wrap_sqft, 0) * 0.15)
WHERE wrap_sqft IS NULL AND full_wrap_sqft IS NOT NULL AND full_wrap_sqft > 0;

-- Index for filtering out cab-only entries in vehicle selector
CREATE INDEX IF NOT EXISTS idx_vm_data_quality ON vehicle_measurements(data_quality);
