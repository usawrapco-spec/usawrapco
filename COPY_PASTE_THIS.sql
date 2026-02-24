-- ════════════════════════════════════════════════════════════════════════════
-- COPY THIS ENTIRE FILE AND PASTE IN SUPABASE SQL EDITOR
-- Go to: https://uqfqkvslxoucxmxxrobt.supabase.co/project/_/sql
-- ════════════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════════
-- CORE TRANSACTION FLOW — Database Migration
-- Estimate (QT) → Sales Order (SO) → Invoice (IN) → Payment
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ESTIMATES TABLE (already exists, but ensure all fields present)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  estimate_number text,
  customer_id uuid,
  contact_id uuid,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','void')),
  sales_rep_id uuid REFERENCES profiles(id),
  production_manager_id uuid REFERENCES profiles(id),
  project_manager_id uuid REFERENCES profiles(id),

  -- Line items stored as JSONB for flexibility
  line_items jsonb DEFAULT '[]'::jsonb,

  -- Financials
  subtotal decimal(10,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  tax_percent decimal(5,2) DEFAULT 8.25,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,

  -- Content
  notes text,
  internal_notes text,
  tags text[] DEFAULT '{}',

  -- Dates
  quote_date date DEFAULT CURRENT_DATE,
  due_date date,
  expires_at date,

  -- Conversion tracking
  ordered boolean DEFAULT false,
  invoiced boolean DEFAULT false,
  converted_to_so_id uuid,

  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SALES ORDERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  so_number text,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id uuid,
  contact_id uuid,
  invoice_contact_id uuid,

  status text DEFAULT 'new' CHECK (status IN ('new','in_progress','completed','cancelled')),

  sales_rep_id uuid REFERENCES profiles(id),
  production_manager_id uuid REFERENCES profiles(id),
  project_manager_id uuid REFERENCES profiles(id),

  -- Line items stored as JSONB
  line_items jsonb DEFAULT '[]'::jsonb,

  -- Financials
  subtotal decimal(10,2) DEFAULT 0,
  discount_percent decimal(5,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  tax_percent decimal(5,2) DEFAULT 8.25,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,

  -- Content
  notes text,
  internal_notes text,
  tags text[] DEFAULT '{}',

  -- Dates
  so_date date DEFAULT CURRENT_DATE,
  due_date date,

  -- Conversion tracking
  invoiced boolean DEFAULT false,
  converted_to_invoice_id uuid,

  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INVOICES TABLE (update existing or create)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  invoice_number text,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  so_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  customer_id uuid,
  contact_id uuid,
  invoice_contact_id uuid,

  status text DEFAULT 'open' CHECK (status IN ('open','partial','paid','overdue','void')),

  sales_rep_id uuid REFERENCES profiles(id),

  -- Line items stored as JSONB
  line_items jsonb DEFAULT '[]'::jsonb,

  -- Financials
  subtotal decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  tax_percent decimal(5,2) DEFAULT 8.25,
  tax_amount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  amount_paid decimal(10,2) DEFAULT 0,
  balance decimal(10,2) DEFAULT 0,

  -- Content
  notes text,
  payment_terms text DEFAULT 'net30',

  -- Dates
  invoice_date date DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,

  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS TABLE
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
-- AUTO-NUMBER GENERATION FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_doc_number(prefix text, table_name text, org uuid)
RETURNS text AS $$
DECLARE
  next_num int;
  col_name text;
BEGIN
  col_name := prefix || '_number';

  EXECUTE format(
    'SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''[0-9]+'') AS int)), 999) + 1 FROM %I WHERE org_id = $1',
    col_name, table_name
  )
  INTO next_num
  USING org;

  RETURN prefix || ' #' || next_num::text;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for auto-numbering estimates
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

-- Trigger function for auto-numbering sales orders
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

-- Trigger function for auto-numbering invoices
CREATE OR REPLACE FUNCTION auto_number_invoice()
RETURNS trigger AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_doc_number('IN', 'invoices', NEW.org_id);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_number_estimate_trigger ON estimates;
DROP TRIGGER IF EXISTS auto_number_sales_order_trigger ON sales_orders;
DROP TRIGGER IF EXISTS auto_number_invoice_trigger ON invoices;

-- Create triggers
CREATE TRIGGER auto_number_estimate_trigger
  BEFORE INSERT ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_estimate();

CREATE TRIGGER auto_number_sales_order_trigger
  BEFORE INSERT ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_sales_order();

CREATE TRIGGER auto_number_invoice_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_number_invoice();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "org_access" ON estimates;
DROP POLICY IF EXISTS "org_access" ON sales_orders;
DROP POLICY IF EXISTS "org_access" ON invoices;
DROP POLICY IF EXISTS "org_access" ON payments;

-- Create policies
CREATE POLICY "org_access" ON estimates
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON sales_orders
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON invoices
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON payments
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES FOR PERFORMANCE
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
CREATE INDEX IF NOT EXISTS idx_invoices_estimate ON invoices(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA (Starting numbers)
-- ─────────────────────────────────────────────────────────────────────────────
-- Insert starting records so numbering begins at 1000
-- Only if no records exist for org

DO $$
DECLARE
  v_org_id uuid := 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f';
BEGIN
  -- Seed estimate if none exist
  IF NOT EXISTS (SELECT 1 FROM estimates WHERE org_id = v_org_id) THEN
    INSERT INTO estimates (org_id, estimate_number, status, total, created_at)
    VALUES (v_org_id, 'QT #999', 'void', 0, now() - interval '1 year');
  END IF;

  -- Seed sales order if none exist
  IF NOT EXISTS (SELECT 1 FROM sales_orders WHERE org_id = v_org_id) THEN
    INSERT INTO sales_orders (org_id, so_number, status, total, created_at)
    VALUES (v_org_id, 'SO #999', 'cancelled', 0, now() - interval '1 year');
  END IF;

  -- Seed invoice if none exist
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
-- ════════════════════════════════════════════════════════════════════════════
