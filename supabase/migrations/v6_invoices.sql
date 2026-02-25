-- ════════════════════════════════════════════════════════════════════════════
-- V6 INVOICES MIGRATION — Complete Transaction Flow
-- Estimate (QT) → Sales Order (SO) → Invoice (IN) → Payment
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ESTIMATES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  estimate_number text,
  title text,
  customer_id uuid,
  contact_id uuid,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','void')),
  sales_rep_id uuid REFERENCES profiles(id),
  production_manager_id uuid REFERENCES profiles(id),
  project_manager_id uuid REFERENCES profiles(id),
  line_items jsonb DEFAULT '[]'::jsonb,
  subtotal decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  tax_rate decimal(5,4) DEFAULT 0.0825,
  tax_percent decimal(5,2) DEFAULT 8.25,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  notes text,
  internal_notes text,
  tags text[] DEFAULT '{}',
  quote_date date DEFAULT CURRENT_DATE,
  due_date date,
  expires_at date,
  ordered boolean DEFAULT false,
  invoiced boolean DEFAULT false,
  converted_to_so_id uuid,
  form_data jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns if table already exists (idempotent)
DO $$ BEGIN
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount decimal(10,2) DEFAULT 0;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tax_rate decimal(5,4) DEFAULT 0.0825;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_percent decimal(5,2) DEFAULT 0;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2) DEFAULT 0;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tax_percent decimal(5,2) DEFAULT 8.25;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS production_manager_id uuid;
  ALTER TABLE estimates ADD COLUMN IF NOT EXISTS project_manager_id uuid;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SALES ORDERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  so_number text,
  title text,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id uuid,
  contact_id uuid,
  invoice_contact_id uuid,
  status text DEFAULT 'new' CHECK (status IN ('new','in_progress','completed','cancelled')),
  sales_rep_id uuid REFERENCES profiles(id),
  production_manager_id uuid REFERENCES profiles(id),
  project_manager_id uuid REFERENCES profiles(id),
  designer_id uuid REFERENCES profiles(id),
  line_items jsonb DEFAULT '[]'::jsonb,
  subtotal decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  tax_rate decimal(5,4) DEFAULT 0.0825,
  tax_percent decimal(5,2) DEFAULT 8.25,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  down_payment_pct decimal(5,2) DEFAULT 50,
  payment_terms text DEFAULT 'net_30',
  notes text,
  internal_notes text,
  tags text[] DEFAULT '{}',
  so_date date DEFAULT CURRENT_DATE,
  due_date date,
  install_date date,
  invoiced boolean DEFAULT false,
  converted_to_invoice_id uuid,
  form_data jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns if table already exists
DO $$ BEGIN
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount decimal(10,2) DEFAULT 0;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tax_rate decimal(5,4) DEFAULT 0.0825;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS down_payment_pct decimal(5,2) DEFAULT 50;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'net_30';
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS install_date date;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS designer_id uuid;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_percent decimal(5,2) DEFAULT 0;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2) DEFAULT 0;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tax_percent decimal(5,2) DEFAULT 8.25;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS production_manager_id uuid;
  ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS project_manager_id uuid;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INVOICES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  invoice_number text,
  title text,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  so_id uuid,
  sales_order_id uuid,
  customer_id uuid,
  contact_id uuid,
  invoice_contact_id uuid,
  project_id uuid,
  status text DEFAULT 'draft',
  sales_rep_id uuid REFERENCES profiles(id),
  line_items jsonb DEFAULT '[]'::jsonb,
  subtotal decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  tax_rate decimal(5,4) DEFAULT 0.0825,
  tax_percent decimal(5,2) DEFAULT 8.25,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  amount_paid decimal(10,2) DEFAULT 0,
  balance decimal(10,2) DEFAULT 0,
  balance_due decimal(10,2) DEFAULT 0,
  notes text,
  form_data jsonb DEFAULT '{}'::jsonb,
  payment_terms text DEFAULT 'net30',
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns if table already exists (idempotent)
DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_order_id uuid;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS so_id uuid;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due decimal(10,2) DEFAULT 0;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount decimal(10,2) DEFAULT 0;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percent decimal(5,2) DEFAULT 0;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate decimal(5,4) DEFAULT 0.0825;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_id uuid;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance decimal(10,2) DEFAULT 0;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2) DEFAULT 0;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_percent decimal(5,2) DEFAULT 8.25;
END $$;

-- Fix status constraint to include draft/sent (drop old, add new)
DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft','open','sent','partial','paid','overdue','void'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Add FK for sales_order_id → sales_orders if not exists
DO $$ BEGIN
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_sales_order_id_fkey
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add FK for so_id → sales_orders if not exists
DO $$ BEGIN
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_so_id_fkey
    FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LINE ITEMS TABLE (shared across estimates, sales_orders, invoices)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type text NOT NULL CHECK (parent_type IN ('estimate','sales_order','invoice','project')),
  parent_id uuid NOT NULL,
  product_type text DEFAULT 'custom',
  name text NOT NULL DEFAULT 'Line Item',
  description text,
  quantity decimal(10,2) DEFAULT 1,
  unit_price decimal(10,2) DEFAULT 0,
  unit_discount decimal(10,2) DEFAULT 0,
  total_price decimal(10,2) DEFAULT 0,
  specs jsonb DEFAULT '{}'::jsonb,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE line_items ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'custom';
  ALTER TABLE line_items ADD COLUMN IF NOT EXISTS unit_discount decimal(10,2) DEFAULT 0;
  ALTER TABLE line_items ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE line_items ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
  ALTER TABLE line_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PAYMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id uuid,
  amount decimal(10,2) NOT NULL,
  method text CHECK (method IN ('cash','check','card','stripe','zelle','venmo','ach','wire','other')),
  reference_number text,
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  payment_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AUTO-NUMBER GENERATION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_doc_number(prefix text, table_name text, org uuid)
RETURNS text AS $$
DECLARE
  next_num int;
  col_name text;
BEGIN
  col_name := CASE
    WHEN prefix = 'QT' THEN 'estimate_number'
    WHEN prefix = 'SO' THEN 'so_number'
    WHEN prefix = 'IN' THEN 'invoice_number'
    ELSE prefix || '_number'
  END;

  EXECUTE format(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''[0-9]+'') AS int)), 999) + 1 FROM %I WHERE org_id = $1',
    col_name, table_name
  )
  INTO next_num
  USING org;

  RETURN prefix || ' #' || next_num::text;
END;
$$ LANGUAGE plpgsql;

-- Estimate auto-number trigger
CREATE OR REPLACE FUNCTION auto_number_estimate()
RETURNS trigger AS $$
BEGIN
  IF NEW.estimate_number IS NULL THEN
    NEW.estimate_number := generate_doc_number('QT', 'estimates', NEW.org_id);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sales order auto-number trigger
CREATE OR REPLACE FUNCTION auto_number_sales_order()
RETURNS trigger AS $$
BEGIN
  IF NEW.so_number IS NULL THEN
    NEW.so_number := generate_doc_number('SO', 'sales_orders', NEW.org_id);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Invoice auto-number trigger
CREATE OR REPLACE FUNCTION auto_number_invoice()
RETURNS trigger AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_doc_number('IN', 'invoices', NEW.org_id);
  END IF;
  -- Sync balance_due from balance or vice versa
  IF NEW.balance_due IS NULL AND NEW.balance IS NOT NULL THEN
    NEW.balance_due := NEW.balance;
  END IF;
  IF NEW.balance IS NULL AND NEW.balance_due IS NOT NULL THEN
    NEW.balance := NEW.balance_due;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS auto_number_estimate_trigger ON estimates;
DROP TRIGGER IF EXISTS auto_number_sales_order_trigger ON sales_orders;
DROP TRIGGER IF EXISTS auto_number_invoice_trigger ON invoices;

CREATE TRIGGER auto_number_estimate_trigger
  BEFORE INSERT ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_estimate();

CREATE TRIGGER auto_number_sales_order_trigger
  BEFORE INSERT ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_sales_order();

CREATE TRIGGER auto_number_invoice_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_invoice();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON estimates;
DROP POLICY IF EXISTS "org_access" ON sales_orders;
DROP POLICY IF EXISTS "org_access" ON invoices;
DROP POLICY IF EXISTS "org_access" ON payments;
DROP POLICY IF EXISTS "org_access" ON line_items;

CREATE POLICY "org_access" ON estimates
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON sales_orders
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON invoices
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON payments
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- line_items uses parent_id, not org_id — allow all authenticated users
CREATE POLICY "authenticated_access" ON line_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_estimates_org ON estimates(org_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created ON estimates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_orders_org ON sales_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_estimate ON sales_orders(estimate_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_so ON invoices(so_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_estimate ON invoices(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_line_items_parent ON line_items(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_line_items_parent_id ON line_items(parent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SEED — Auto-numbering starts at 1000
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_org_id uuid := 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM estimates WHERE org_id = v_org_id) THEN
    INSERT INTO estimates (org_id, estimate_number, status, total, created_at)
    VALUES (v_org_id, 'QT #999', 'void', 0, now() - interval '1 year');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM sales_orders WHERE org_id = v_org_id) THEN
    INSERT INTO sales_orders (org_id, so_number, status, total, created_at)
    VALUES (v_org_id, 'SO #999', 'cancelled', 0, now() - interval '1 year');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM invoices WHERE org_id = v_org_id) THEN
    INSERT INTO invoices (org_id, invoice_number, status, total, created_at)
    VALUES (v_org_id, 'IN #999', 'void', 0, now() - interval '1 year');
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
COMMENT ON TABLE estimates IS 'Quotes sent to customers before work begins';
COMMENT ON TABLE sales_orders IS 'Accepted quotes converted to work orders';
COMMENT ON TABLE invoices IS 'Bills sent to customers for payment';
COMMENT ON TABLE payments IS 'Payment records applied to invoices';
COMMENT ON TABLE line_items IS 'Shared line items for estimates, sales orders, invoices, and projects';
-- ════════════════════════════════════════════════════════════════════════════
