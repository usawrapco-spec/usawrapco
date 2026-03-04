-- full_wrap_sqft = NO roof (sides + back + hood) — industry standard "full wrap"
-- full_wrap_with_roof_sqft = WITH roof (sides + back + hood + roof)
ALTER TABLE vehicle_measurements ADD COLUMN IF NOT EXISTS full_wrap_with_roof_sqft numeric;

COMMENT ON COLUMN vehicle_measurements.full_wrap_sqft IS 'Full wrap sqft WITHOUT roof (sides + back + hood)';
COMMENT ON COLUMN vehicle_measurements.full_wrap_with_roof_sqft IS 'Full wrap sqft WITH roof (sides + back + hood + roof)';
