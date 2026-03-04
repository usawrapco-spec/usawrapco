-- Add missing columns to vehicle_measurements that the seed data expects
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS year_range text;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS driver_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS passenger_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS three_quarter_wrap_sqft numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS half_wrap_sqft numeric;
