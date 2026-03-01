-- Add vehicle + team columns to invoices (matching estimates/sales_orders schema)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS vehicle_year              TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_make              TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model             TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_vin               TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color             TEXT,
  ADD COLUMN IF NOT EXISTS sales_rep_ids             TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installer_ids             TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS designer_ids              TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS production_manager_ids    TEXT[]   DEFAULT '{}';
