-- Add new marine calculator columns: wrap type, transom dimensions
-- Replace mar_passes with mar_wrap_type since panel logic is now automatic
ALTER TABLE estimator_line_items
  ADD COLUMN IF NOT EXISTS mar_wrap_type text DEFAULT 'printed',
  ADD COLUMN IF NOT EXISTS mar_transom_width numeric,
  ADD COLUMN IF NOT EXISTS mar_transom_height numeric;

-- mar_passes is no longer used (panels auto-calculated from hull height + wrap type)
-- keeping the column for backwards compat but it won't be written to
