-- Add missing FK constraints to estimates and sales_orders
-- These were causing PostgREST 400 errors on all join queries
-- (customer:customer_id, sales_rep:sales_rep_id, etc.)

-- estimates
ALTER TABLE estimates
  ADD CONSTRAINT estimates_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  ADD CONSTRAINT estimates_sales_rep_id_fkey
    FOREIGN KEY (sales_rep_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT estimates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- sales_orders
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_orders_sales_rep_id_fkey
    FOREIGN KEY (sales_rep_id) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_orders_estimate_id_fkey
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_orders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
