-- Rename item_name to name to match LineItem TypeScript type
-- Also add missing columns used by EstimateDetailClient/SalesOrderDetailClient
ALTER TABLE line_items RENAME COLUMN item_name TO name;

ALTER TABLE line_items
  ADD COLUMN IF NOT EXISTS product_type  text,
  ADD COLUMN IF NOT EXISTS unit_discount numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specs         jsonb    DEFAULT '{}'::jsonb;
