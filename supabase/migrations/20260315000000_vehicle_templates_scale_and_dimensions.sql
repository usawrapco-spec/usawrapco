-- Add scale-aware dimension columns to vehicle_templates
ALTER TABLE vehicle_templates
  ADD COLUMN IF NOT EXISTS width_inches   numeric,
  ADD COLUMN IF NOT EXISTS height_inches  numeric,
  ADD COLUMN IF NOT EXISTS scale_factor   numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS bbox_raw       text,
  ADD COLUMN IF NOT EXISTS source_format  text DEFAULT 'image';
