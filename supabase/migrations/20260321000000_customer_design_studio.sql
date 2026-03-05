-- Customer Design Studio: extend mockup_results for public customer tool
ALTER TABLE mockup_results
  ADD COLUMN IF NOT EXISTS vehicle_photo_url  text,
  ADD COLUMN IF NOT EXISTS sketch_url         text,
  ADD COLUMN IF NOT EXISTS lead_name          text,
  ADD COLUMN IF NOT EXISTS lead_email         text,
  ADD COLUMN IF NOT EXISTS lead_phone         text,
  ADD COLUMN IF NOT EXISTS apparel_type       text,
  ADD COLUMN IF NOT EXISTS apparel_base_color text,
  ADD COLUMN IF NOT EXISTS print_area         text,
  ADD COLUMN IF NOT EXISTS print_width_in     numeric,
  ADD COLUMN IF NOT EXISTS print_height_in    numeric;
