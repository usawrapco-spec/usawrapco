-- Add pricing/install columns to vehicle_measurements (missed in prior migration)
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS wrap_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS install_hours numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS install_pay numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS suggested_price numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS data_quality text;
