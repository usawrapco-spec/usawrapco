-- Add category, std_hours, std_value columns for installer pay engine
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS std_hours numeric;
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS std_value numeric;

-- Unique constraint to support upsert-based seeding from the component
ALTER TABLE vehicle_measurements DROP CONSTRAINT IF EXISTS uq_vehicle_ymm;
ALTER TABLE vehicle_measurements ADD CONSTRAINT uq_vehicle_ymm
  UNIQUE (make, model, body_style, year_start, year_end);
