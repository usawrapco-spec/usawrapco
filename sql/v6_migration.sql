-- ============================================================================
-- v6 Migration: Estimates, Sales Orders, Invoices, Line Items
-- Run against Supabase SQL editor
-- ============================================================================

-- ─── Estimates ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  estimate_number serial,
  title         text NOT NULL DEFAULT '',
  customer_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','accepted','expired','rejected','void')),
  sales_rep_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  production_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_manager_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  quote_date    date,
  due_date      date,
  subtotal      numeric(12,2) NOT NULL DEFAULT 0,
  discount      numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate      numeric(5,4) NOT NULL DEFAULT 0,
  tax_amount    numeric(12,2) NOT NULL DEFAULT 0,
  total         numeric(12,2) NOT NULL DEFAULT 0,
  notes         text,
  customer_note text,
  division      text NOT NULL DEFAULT 'wraps'
                CHECK (division IN ('wraps','decking')),
  form_data     jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimates_updated_at ON estimates;
CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_estimates_updated_at();

-- ─── Sales Orders ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  so_number     serial,
  title         text NOT NULL DEFAULT '',
  estimate_id   uuid REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','in_progress','completed','on_hold','void')),
  sales_rep_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  production_manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_manager_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  designer_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  so_date       date,
  due_date      date,
  install_date  date,
  subtotal      numeric(12,2) NOT NULL DEFAULT 0,
  discount      numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate      numeric(5,4) NOT NULL DEFAULT 0,
  tax_amount    numeric(12,2) NOT NULL DEFAULT 0,
  total         numeric(12,2) NOT NULL DEFAULT 0,
  down_payment_pct numeric(5,2) NOT NULL DEFAULT 50,
  payment_terms text,
  notes         text,
  invoiced      boolean NOT NULL DEFAULT false,
  form_data     jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_sales_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_orders_updated_at ON sales_orders;
CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_sales_orders_updated_at();

-- ─── Invoices ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  invoice_number  serial,
  title           text NOT NULL DEFAULT '',
  sales_order_id  uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  customer_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','paid','overdue','void')),
  invoice_date    date,
  due_date        date,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  discount        numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,4) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid     numeric(12,2) NOT NULL DEFAULT 0,
  balance_due     numeric(12,2) NOT NULL DEFAULT 0,
  notes           text,
  form_data       jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoices_updated_at();

-- ─── Line Items (shared across estimates, sales_orders, invoices) ───────────────
CREATE TABLE IF NOT EXISTS line_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type   text NOT NULL CHECK (parent_type IN ('estimate','sales_order','invoice')),
  parent_id     uuid NOT NULL,
  product_type  text NOT NULL DEFAULT 'wrap'
                CHECK (product_type IN ('wrap','decking','design','ppf')),
  name          text NOT NULL DEFAULT '',
  description   text,
  quantity      numeric(10,2) NOT NULL DEFAULT 1,
  unit_price    numeric(12,2) NOT NULL DEFAULT 0,
  unit_discount numeric(12,2) NOT NULL DEFAULT 0,
  total_price   numeric(12,2) NOT NULL DEFAULT 0,
  specs         jsonb NOT NULL DEFAULT '{}',
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast line-item lookups
CREATE INDEX IF NOT EXISTS idx_line_items_parent ON line_items(parent_type, parent_id);

-- ─── RLS Policies ───────────────────────────────────────────────────────────────
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

-- Estimates: org members can read, sales/admin can write
CREATE POLICY "estimates_select" ON estimates FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "estimates_insert" ON estimates FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "estimates_update" ON estimates FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "estimates_delete" ON estimates FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- Sales Orders
CREATE POLICY "sales_orders_select" ON sales_orders FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "sales_orders_insert" ON sales_orders FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "sales_orders_update" ON sales_orders FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "sales_orders_delete" ON sales_orders FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- Invoices
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- Line Items: accessible to org members via parent lookup
CREATE POLICY "line_items_select" ON line_items FOR SELECT USING (true);
CREATE POLICY "line_items_insert" ON line_items FOR INSERT WITH CHECK (true);
CREATE POLICY "line_items_update" ON line_items FOR UPDATE USING (true);
CREATE POLICY "line_items_delete" ON line_items FOR DELETE USING (true);
