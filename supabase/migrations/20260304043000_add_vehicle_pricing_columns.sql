-- Add pricing/install columns to vehicle_measurements (missed in prior migration)
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS wrap_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS install_hours numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS install_pay numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS suggested_price numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS data_quality text;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS full_wrap_with_roof_sqft numeric;

-- Clarification: full_wrap_sqft = NO roof (sides + back + hood)
--                full_wrap_with_roof_sqft = WITH roof (sides + back + hood + roof)
COMMENT ON COLUMN vehicle_measurements.full_wrap_sqft IS 'Full wrap sqft WITHOUT roof (sides + back + hood)';
COMMENT ON COLUMN vehicle_measurements.full_wrap_with_roof_sqft IS 'Full wrap sqft WITH roof (sides + back + hood + roof)';

-- Backfill full_wrap_with_roof_sqft from existing data
UPDATE vehicle_measurements
SET full_wrap_with_roof_sqft = COALESCE(full_wrap_sqft, 0) + COALESCE(roof_sqft, 0)
WHERE full_wrap_with_roof_sqft IS NULL AND full_wrap_sqft IS NOT NULL;
