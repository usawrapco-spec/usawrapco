-- Add missing columns to estimates table
-- EstimateDetailClient saves these but they didn't exist in DB
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS tax_rate          numeric          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_note     text,
  ADD COLUMN IF NOT EXISTS production_manager_id uuid,
  ADD COLUMN IF NOT EXISTS project_manager_id    uuid,
  ADD COLUMN IF NOT EXISTS form_data         jsonb            DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS division          text,
  ADD COLUMN IF NOT EXISTS vehicle_desc      text,
  ADD COLUMN IF NOT EXISTS project_id        uuid;

-- Add FK constraints for estimates new columns
ALTER TABLE estimates
  ADD CONSTRAINT estimates_production_manager_id_fkey
    FOREIGN KEY (production_manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT estimates_project_manager_id_fkey
    FOREIGN KEY (project_manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT estimates_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Add missing columns to sales_orders table
-- SalesOrderDetailClient saves these but they didn't exist in DB
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS title                 text,
  ADD COLUMN IF NOT EXISTS tax_rate              numeric          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS install_date          date,
  ADD COLUMN IF NOT EXISTS payment_terms         text,
  ADD COLUMN IF NOT EXISTS down_payment_pct      numeric          DEFAULT 50,
  ADD COLUMN IF NOT EXISTS production_manager_id uuid,
  ADD COLUMN IF NOT EXISTS project_manager_id    uuid,
  ADD COLUMN IF NOT EXISTS designer_id           uuid,
  ADD COLUMN IF NOT EXISTS form_data             jsonb            DEFAULT '{}'::jsonb;

-- Add FK constraints for sales_orders new columns
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_production_manager_id_fkey
    FOREIGN KEY (production_manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_orders_project_manager_id_fkey
    FOREIGN KEY (project_manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_orders_designer_id_fkey
    FOREIGN KEY (designer_id) REFERENCES profiles(id) ON DELETE SET NULL;
