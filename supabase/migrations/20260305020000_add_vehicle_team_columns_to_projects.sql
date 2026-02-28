-- Add structured vehicle columns to projects (vehicle_desc is the legacy freetext field)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS vehicle_year text,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_vin text;

-- Add array team assignment columns to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS sales_rep_ids uuid[],
  ADD COLUMN IF NOT EXISTS installer_ids uuid[],
  ADD COLUMN IF NOT EXISTS designer_ids uuid[],
  ADD COLUMN IF NOT EXISTS production_manager_ids uuid[];
