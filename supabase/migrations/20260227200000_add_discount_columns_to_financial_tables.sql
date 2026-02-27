-- Add discount columns to estimates, sales_orders, and invoices (used by coupon system)
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
