-- Vehicle Measurements table (already populated via import script)
-- CREATE TABLE IF NOT EXISTS is a no-op if the table already exists.

CREATE TABLE IF NOT EXISTS vehicle_measurements (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year                 integer,
  year_start           integer,
  year_end             integer,
  make                 text NOT NULL,
  model                text NOT NULL,
  trim                 text,
  body_style           text,
  full_wrap_sqft       numeric,
  partial_wrap_sqft    numeric,
  hood_sqft            numeric,
  roof_sqft            numeric,
  trunk_sqft           numeric,
  doors_sqft           numeric,
  bumpers_sqft         numeric,
  mirrors_sqft         numeric,
  pillars_sqft         numeric,
  rockers_sqft         numeric,
  side_width           numeric,
  side_height          numeric,
  side_sqft            numeric,
  back_width           numeric,
  back_height          numeric,
  back_sqft            numeric,
  hood_width           numeric,
  hood_length          numeric,
  roof_width           numeric,
  roof_length          numeric,
  total_sqft           numeric,
  linear_feet          numeric,
  print_width_standard numeric,
  notes                text,
  verified             boolean DEFAULT false,
  source               text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_measurements_make_model_idx
  ON vehicle_measurements (make, model);

CREATE INDEX IF NOT EXISTS vehicle_measurements_year_range_idx
  ON vehicle_measurements (year_start, year_end);

ALTER TABLE vehicle_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "vehicle_measurements_authenticated_read"
  ON vehicle_measurements FOR SELECT
  TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "vehicle_measurements_admin_write"
  ON vehicle_measurements FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));
