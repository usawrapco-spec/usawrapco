-- Add missing columns to vehicle_measurements that the seed data expects
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS year_range text;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS driver_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS passenger_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS three_quarter_wrap_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS half_wrap_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS wrap_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS install_hours numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS install_pay numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS suggested_price numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS data_quality text;
