-- v6.3 Products & Templates Migration
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- Products Catalog
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'wrap',
  description text,
  default_price numeric DEFAULT 0,
  default_hours numeric DEFAULT 0,
  calculator_type text NOT NULL DEFAULT 'simple',
  taxable boolean DEFAULT true,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  specs jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_org_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_org_write" ON products FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- Estimate Templates
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS estimate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  name text NOT NULL,
  description text,
  category text,
  line_items jsonb DEFAULT '[]',
  form_data jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  use_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_org_read" ON estimate_templates FOR SELECT USING (true);
CREATE POLICY "templates_org_write" ON estimate_templates FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- Add rollup fields to line_items
-- ═══════════════════════════════════════════════════════════

ALTER TABLE line_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS rolled_up boolean DEFAULT false;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS parent_line_item_id uuid REFERENCES line_items(id);
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS reference_photos text[] DEFAULT '{}';
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS design_project_id uuid;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS parent_type text DEFAULT 'estimate';

-- Update parent_type constraint to support 'project'
-- (drop old constraint if exists, add new one)
ALTER TABLE line_items DROP CONSTRAINT IF EXISTS line_items_parent_type_check;

-- ═══════════════════════════════════════════════════════════
-- Insert default products for org
-- ═══════════════════════════════════════════════════════════

INSERT INTO products (org_id, name, category, description, default_price, default_hours, calculator_type, sort_order) VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Full Vehicle Wrap', 'wrap', 'Full wrap for car, truck, SUV, or van', 0, 0, 'vehicle', 1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Box Truck Wrap', 'wrap', 'Commercial box truck wrap', 0, 0, 'box-truck', 2),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Trailer Wrap', 'wrap', 'Commercial trailer wrap', 0, 0, 'trailer', 3),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Marine/Boat Wrap', 'wrap', 'Marine vessel wrap or decking', 0, 0, 'marine', 4),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'PPF (Paint Protection Film)', 'ppf', 'Paint protection film packages', 0, 0, 'ppf', 5),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Partial Wrap', 'wrap', 'Partial vehicle wrap coverage', 0, 0, 'vehicle', 6),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Hood Wrap', 'wrap', 'Hood-only wrap', 500, 3, 'simple', 7),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Roof Wrap', 'wrap', 'Roof-only wrap', 400, 3, 'simple', 8),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Window Tint', 'tint', 'Automotive window tint', 250, 2, 'simple', 9),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Decking/Marine Flooring', 'decking', 'Marine flooring installation', 0, 0, 'marine', 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Design Fee', 'service', 'Custom design work', 150, 4, 'simple', 11),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Rush Fee', 'service', 'Priority rush processing', 200, 0, 'simple', 12),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Removal Fee', 'service', 'Old wrap removal', 300, 4, 'simple', 13),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Custom', 'other', 'Custom freeform product', 0, 0, 'simple', 14)
ON CONFLICT DO NOTHING;
