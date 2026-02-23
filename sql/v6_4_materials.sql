-- v6.4 Materials Catalog Migration
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- Materials Catalog (wrap, ppf, decking materials with pricing)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'wrap',  -- 'wrap' | 'ppf' | 'decking' | 'other'
  cost_per_sqft numeric DEFAULT 0,
  supplier text,
  sku text,
  description text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  specs jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_org_read" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_org_write" ON materials FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- Seed default materials for USA Wrap Co
-- ═══════════════════════════════════════════════════════════

INSERT INTO materials (org_id, name, category, cost_per_sqft, sort_order) VALUES
  -- Wrap Materials
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Avery MPI 1105 EZ RS',    'wrap',    2.10,  1),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Avery MPI 1005 EZ RS',    'wrap',    1.85,  2),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', '3M 2080 Series',          'wrap',    2.50,  3),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', '3M IJ180',                'wrap',    2.30,  4),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Avery Supreme Wrapping Film', 'wrap', 2.75, 5),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Arlon SLX',               'wrap',    2.20,  6),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Hexis Skintac',           'wrap',    2.00,  7),

  -- PPF Materials
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'XPEL Ultimate Plus',      'ppf',     8.00,  8),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'XPEL Stealth',            'ppf',     9.00,  9),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', '3M Pro Series',           'ppf',     7.50, 10),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'SunTek Ultra',            'ppf',     7.00, 11),

  -- Decking Materials
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'SeaDek 6mm Standard',     'decking', 8.50, 12),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'SeaDek 10mm Premium',     'decking', 11.00, 13),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Hydro-Turf',              'decking', 7.50, 14),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'MarineMat',               'decking', 9.00, 15),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Custom/Generic Non-Slip', 'decking', 6.00, 16)
ON CONFLICT DO NOTHING;
