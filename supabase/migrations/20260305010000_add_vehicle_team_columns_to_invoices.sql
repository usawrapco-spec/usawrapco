-- Add vehicle info columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS vehicle_year        text,
  ADD COLUMN IF NOT EXISTS vehicle_make        text,
  ADD COLUMN IF NOT EXISTS vehicle_model       text,
  ADD COLUMN IF NOT EXISTS vehicle_vin         text,
  ADD COLUMN IF NOT EXISTS vehicle_color       text;

-- Add team array columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS sales_rep_ids           uuid[],
  ADD COLUMN IF NOT EXISTS installer_ids           uuid[],
  ADD COLUMN IF NOT EXISTS designer_ids            uuid[],
  ADD COLUMN IF NOT EXISTS production_manager_ids  uuid[];
