-- 3D configurator sessions
CREATE TABLE IF NOT EXISTS configurator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  project_id uuid REFERENCES projects(id),
  customer_id uuid REFERENCES customers(id),
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_category text,
  model_id text,
  panel_config jsonb DEFAULT '[]'::jsonb,
  global_material jsonb,
  screenshot_url text,
  public_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Material catalog (Inozetek + Pure PPF + custom)
CREATE TABLE IF NOT EXISTS wrap_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  brand text NOT NULL,
  product_line text,
  name text NOT NULL,
  sku text,
  category text NOT NULL,
  hex_color text,
  hex_color_2 text,
  roughness numeric DEFAULT 0.1,
  metalness numeric DEFAULT 0.0,
  clearcoat numeric DEFAULT 0.0,
  clearcoat_roughness numeric DEFAULT 0.0,
  env_map_intensity numeric DEFAULT 1.0,
  is_ppf boolean DEFAULT false,
  ppf_opacity numeric DEFAULT 1.0,
  thumbnail_url text,
  info_url text,
  in_stock boolean DEFAULT true,
  cost_per_sqft numeric,
  enabled boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE configurator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON configurator_sessions;
CREATE POLICY "org_access" ON configurator_sessions
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid OR public_token IS NOT NULL);

DROP POLICY IF EXISTS "public_read_materials" ON wrap_materials;
CREATE POLICY "public_read_materials" ON wrap_materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "org_write_materials" ON wrap_materials;
CREATE POLICY "org_write_materials" ON wrap_materials FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid OR org_id IS NULL);

-- ══ INOZETEK S-SERIES GLOSS ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, sort_order) VALUES
('Inozetek', 'S-Series Gloss', 'Gloss Black',           'IS-S-BLK-001', 'gloss', '#0D0D0D', 0.05, 0.0, 1.0, 0.05, 1.8, 1),
('Inozetek', 'S-Series Gloss', 'Gloss White',           'IS-S-WHT-001', 'gloss', '#F5F5F5', 0.05, 0.0, 1.0, 0.05, 1.8, 2),
('Inozetek', 'S-Series Gloss', 'Gloss Silver',          'IS-S-SLV-001', 'gloss', '#C0C0C0', 0.08, 0.3, 1.0, 0.05, 2.0, 3),
('Inozetek', 'S-Series Gloss', 'Gloss Metallic Silver', 'IS-S-SLV-002', 'gloss', '#A8A9AD', 0.06, 0.5, 1.0, 0.05, 2.2, 4),
('Inozetek', 'S-Series Gloss', 'Gloss Pearl White',     'IS-S-PRL-001', 'gloss', '#F0EEE8', 0.05, 0.1, 1.0, 0.05, 2.0, 5),
('Inozetek', 'S-Series Gloss', 'Gloss Red',             'IS-S-RED-001', 'gloss', '#CC0000', 0.05, 0.0, 1.0, 0.05, 1.8, 6),
('Inozetek', 'S-Series Gloss', 'Gloss Dark Red',        'IS-S-RED-002', 'gloss', '#8B0000', 0.05, 0.0, 1.0, 0.05, 1.8, 7),
('Inozetek', 'S-Series Gloss', 'Gloss Blue',            'IS-S-BLU-001', 'gloss', '#1E3A8A', 0.05, 0.0, 1.0, 0.05, 1.8, 8),
('Inozetek', 'S-Series Gloss', 'Gloss Ice Blue',        'IS-S-BLU-002', 'gloss', '#5B9BD5', 0.05, 0.1, 1.0, 0.05, 2.0, 9),
('Inozetek', 'S-Series Gloss', 'Gloss Navy Blue',       'IS-S-BLU-003', 'gloss', '#1B2A4A', 0.05, 0.0, 1.0, 0.05, 1.8, 10),
('Inozetek', 'S-Series Gloss', 'Gloss Green',           'IS-S-GRN-001', 'gloss', '#2D6A2D', 0.05, 0.0, 1.0, 0.05, 1.8, 11),
('Inozetek', 'S-Series Gloss', 'Gloss Military Green',  'IS-S-GRN-002', 'gloss', '#4B5320', 0.05, 0.0, 1.0, 0.05, 1.8, 12),
('Inozetek', 'S-Series Gloss', 'Gloss Yellow',          'IS-S-YLW-001', 'gloss', '#FFD700', 0.05, 0.0, 1.0, 0.05, 1.8, 13),
('Inozetek', 'S-Series Gloss', 'Gloss Orange',          'IS-S-ORG-001', 'gloss', '#FF6600', 0.05, 0.0, 1.0, 0.05, 1.8, 14),
('Inozetek', 'S-Series Gloss', 'Gloss Purple',          'IS-S-PRP-001', 'gloss', '#6B21A8', 0.05, 0.0, 1.0, 0.05, 1.8, 15),
('Inozetek', 'S-Series Gloss', 'Gloss Hot Pink',        'IS-S-PNK-001', 'gloss', '#FF1493', 0.05, 0.0, 1.0, 0.05, 1.8, 16),
('Inozetek', 'S-Series Gloss', 'Gloss Brown',           'IS-S-BRN-001', 'gloss', '#6B3A2A', 0.05, 0.0, 1.0, 0.05, 1.8, 17),
('Inozetek', 'S-Series Gloss', 'Gloss Gold',            'IS-S-GLD-001', 'gloss', '#CFB53B', 0.05, 0.4, 1.0, 0.05, 2.2, 18),
('Inozetek', 'S-Series Gloss', 'Gloss Gunmetal',        'IS-S-GMT-001', 'gloss', '#2C3539', 0.06, 0.3, 1.0, 0.05, 2.0, 19),
('Inozetek', 'S-Series Gloss', 'Gloss Rose Gold',       'IS-S-RGD-001', 'gloss', '#B76E79', 0.05, 0.3, 1.0, 0.05, 2.0, 20)
ON CONFLICT DO NOTHING;

-- ══ INOZETEK S-SERIES MATTE ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, sort_order) VALUES
('Inozetek', 'S-Series Matte', 'Matte Black',           'IS-M-BLK-001', 'matte', '#1A1A1A', 0.92, 0.0, 0.0, 0.0, 0.2, 1),
('Inozetek', 'S-Series Matte', 'Matte White',           'IS-M-WHT-001', 'matte', '#EFEFEF', 0.92, 0.0, 0.0, 0.0, 0.2, 2),
('Inozetek', 'S-Series Matte', 'Matte Silver',          'IS-M-SLV-001', 'matte', '#A8A9AD', 0.88, 0.2, 0.0, 0.0, 0.4, 3),
('Inozetek', 'S-Series Matte', 'Matte Red',             'IS-M-RED-001', 'matte', '#B00000', 0.92, 0.0, 0.0, 0.0, 0.2, 4),
('Inozetek', 'S-Series Matte', 'Matte Blue',            'IS-M-BLU-001', 'matte', '#1C2E5E', 0.92, 0.0, 0.0, 0.0, 0.2, 5),
('Inozetek', 'S-Series Matte', 'Matte Military Green',  'IS-M-GRN-001', 'matte', '#3C4A1E', 0.92, 0.0, 0.0, 0.0, 0.2, 6),
('Inozetek', 'S-Series Matte', 'Matte Dark Gray',       'IS-M-GRY-001', 'matte', '#404040', 0.92, 0.0, 0.0, 0.0, 0.2, 7),
('Inozetek', 'S-Series Matte', 'Matte Medium Gray',     'IS-M-GRY-002', 'matte', '#6B6B6B', 0.92, 0.0, 0.0, 0.0, 0.2, 8),
('Inozetek', 'S-Series Matte', 'Matte Gunmetal',        'IS-M-GMT-001', 'matte', '#2A3035', 0.88, 0.1, 0.0, 0.0, 0.3, 9),
('Inozetek', 'S-Series Matte', 'Matte Yellow',          'IS-M-YLW-001', 'matte', '#E6C000', 0.92, 0.0, 0.0, 0.0, 0.2, 10),
('Inozetek', 'S-Series Matte', 'Matte Orange',          'IS-M-ORG-001', 'matte', '#E05500', 0.92, 0.0, 0.0, 0.0, 0.2, 11),
('Inozetek', 'S-Series Matte', 'Matte Purple',          'IS-M-PRP-001', 'matte', '#5B1A8A', 0.92, 0.0, 0.0, 0.0, 0.2, 12),
('Inozetek', 'S-Series Matte', 'Matte Gold',            'IS-M-GLD-001', 'matte', '#B8960C', 0.88, 0.2, 0.0, 0.0, 0.3, 13),
('Inozetek', 'S-Series Matte', 'Matte Rose Gold',       'IS-M-RGD-001', 'matte', '#A85D65', 0.88, 0.15, 0.0, 0.0, 0.3, 14)
ON CONFLICT DO NOTHING;

-- ══ INOZETEK SATIN ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, sort_order) VALUES
('Inozetek', 'S-Series Satin', 'Satin Black',     'IS-SA-BLK-001', 'satin', '#1E1E1E', 0.45, 0.0, 0.8, 0.3, 0.9, 1),
('Inozetek', 'S-Series Satin', 'Satin White',     'IS-SA-WHT-001', 'satin', '#F0F0EE', 0.45, 0.0, 0.8, 0.3, 0.9, 2),
('Inozetek', 'S-Series Satin', 'Satin Silver',    'IS-SA-SLV-001', 'satin', '#B8B9BC', 0.4,  0.3, 0.8, 0.3, 1.2, 3),
('Inozetek', 'S-Series Satin', 'Satin Red',       'IS-SA-RED-001', 'satin', '#C00000', 0.45, 0.0, 0.8, 0.3, 0.9, 4),
('Inozetek', 'S-Series Satin', 'Satin Blue',      'IS-SA-BLU-001', 'satin', '#1A2D70', 0.45, 0.0, 0.8, 0.3, 0.9, 5),
('Inozetek', 'S-Series Satin', 'Satin Gray',      'IS-SA-GRY-001', 'satin', '#606060', 0.45, 0.0, 0.8, 0.3, 0.9, 6),
('Inozetek', 'S-Series Satin', 'Satin Gold',      'IS-SA-GLD-001', 'satin', '#C4A840', 0.4,  0.35, 0.8, 0.3, 1.2, 7),
('Inozetek', 'S-Series Satin', 'Satin Rose Gold', 'IS-SA-RGD-001', 'satin', '#B87080', 0.4,  0.25, 0.8, 0.3, 1.1, 8)
ON CONFLICT DO NOTHING;

-- ══ INOZETEK CHROME ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, sort_order) VALUES
('Inozetek', 'Chrome Series', 'Chrome Silver', 'IS-CH-SLV-001', 'chrome', '#E8E8E8', 0.02, 1.0, 0.0, 0.0, 3.0, 1),
('Inozetek', 'Chrome Series', 'Chrome Black',  'IS-CH-BLK-001', 'chrome', '#1C1C1C', 0.02, 1.0, 0.0, 0.0, 3.0, 2),
('Inozetek', 'Chrome Series', 'Chrome Gold',   'IS-CH-GLD-001', 'chrome', '#D4AF37', 0.02, 1.0, 0.0, 0.0, 3.0, 3),
('Inozetek', 'Chrome Series', 'Chrome Blue',   'IS-CH-BLU-001', 'chrome', '#4169E1', 0.02, 1.0, 0.0, 0.0, 3.0, 4),
('Inozetek', 'Chrome Series', 'Chrome Red',    'IS-CH-RED-001', 'chrome', '#CC2200', 0.02, 1.0, 0.0, 0.0, 3.0, 5),
('Inozetek', 'Chrome Series', 'Chrome Rose',   'IS-CH-RSE-001', 'chrome', '#C97080', 0.02, 1.0, 0.0, 0.0, 3.0, 6)
ON CONFLICT DO NOTHING;

-- ══ INOZETEK COLOR SHIFT ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, hex_color_2, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, sort_order) VALUES
('Inozetek', 'Color Shift', 'Color Shift Acid Green→Yellow', 'IS-CS-GY-001',  'color_shift', '#39FF14', '#FFD700', 0.15, 0.5, 0.0, 0.0, 2.5, 1),
('Inozetek', 'Color Shift', 'Color Shift Purple→Blue',        'IS-CS-PB-001',  'color_shift', '#8B00FF', '#0066FF', 0.15, 0.5, 0.0, 0.0, 2.5, 2),
('Inozetek', 'Color Shift', 'Color Shift Red→Gold',           'IS-CS-RG-001',  'color_shift', '#CC0000', '#FFD700', 0.15, 0.5, 0.0, 0.0, 2.5, 3),
('Inozetek', 'Color Shift', 'Color Shift Blue→Purple',        'IS-CS-BP-001',  'color_shift', '#0055FF', '#9933FF', 0.15, 0.5, 0.0, 0.0, 2.5, 4),
('Inozetek', 'Color Shift', 'Color Shift Green→Blue',         'IS-CS-GB-001',  'color_shift', '#00CC44', '#0044FF', 0.15, 0.5, 0.0, 0.0, 2.5, 5),
('Inozetek', 'Color Shift', 'Color Shift Black→Purple',       'IS-CS-BKP-001', 'color_shift', '#1A0A2E', '#6B00CC', 0.15, 0.5, 0.0, 0.0, 2.5, 6)
ON CONFLICT DO NOTHING;

-- ══ INOZETEK CARBON FIBER ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, sort_order) VALUES
('Inozetek', 'Carbon Fiber', 'Carbon Fiber Black', 'IS-CF-BLK-001', 'carbon', '#1A1A1A', 0.4, 0.0, 0.0, 0.0, 0.5, 1),
('Inozetek', 'Carbon Fiber', 'Carbon Fiber Gray',  'IS-CF-GRY-001', 'carbon', '#3A3A3A', 0.4, 0.0, 0.0, 0.0, 0.5, 2),
('Inozetek', 'Carbon Fiber', 'Carbon Fiber Blue',  'IS-CF-BLU-001', 'carbon', '#1A2040', 0.4, 0.0, 0.0, 0.0, 0.5, 3),
('Inozetek', 'Carbon Fiber', 'Carbon Fiber Red',   'IS-CF-RED-001', 'carbon', '#3A0A0A', 0.4, 0.0, 0.0, 0.0, 0.5, 4)
ON CONFLICT DO NOTHING;

-- ══ INOZETEK PPF ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, is_ppf, ppf_opacity, sort_order) VALUES
('Inozetek', 'PPF', 'PPF Crystal Clear',     'IZ-PPF-CLR-001', 'ppf_clear',  '#FFFFFF', 0.05, 0.0, 1.0, 0.05, 1.5, true, 0.05, 1),
('Inozetek', 'PPF', 'PPF Matte',             'IZ-PPF-MAT-001', 'ppf_matte',  '#FFFFFF', 0.85, 0.0, 0.0, 0.0,  0.2, true, 0.12, 2),
('Inozetek', 'PPF', 'PPF Gloss Enhancement', 'IZ-PPF-GLS-001', 'ppf_gloss',  '#FFFFFF', 0.03, 0.0, 1.0, 0.02, 2.0, true, 0.06, 3),
('Inozetek', 'PPF', 'PPF Satin',             'IZ-PPF-SAT-001', 'ppf_clear',  '#FFFFFF', 0.45, 0.0, 0.6, 0.2,  0.8, true, 0.08, 4)
ON CONFLICT DO NOTHING;

-- ══ PURE PPF ══
INSERT INTO wrap_materials (brand, product_line, name, sku, category, hex_color, roughness, metalness, clearcoat, clearcoat_roughness, env_map_intensity, is_ppf, ppf_opacity, sort_order) VALUES
('Pure PPF', 'Pure Series', 'Pure PPF Crystal Clear',   'PP-CLR-001', 'ppf_clear',  '#FFFFFF', 0.04, 0.0, 1.0, 0.04, 1.5, true, 0.04, 1),
('Pure PPF', 'Pure Series', 'Pure PPF Matte',           'PP-MAT-001', 'ppf_matte',  '#FFFFFF', 0.88, 0.0, 0.0, 0.0,  0.2, true, 0.10, 2),
('Pure PPF', 'Pure Series', 'Pure PPF Gloss',           'PP-GLS-001', 'ppf_gloss',  '#FFFFFF', 0.03, 0.0, 1.0, 0.02, 2.0, true, 0.05, 3),
('Pure PPF', 'Pure Series', 'Pure PPF Satin',           'PP-SAT-001', 'ppf_clear',  '#FFFFFF', 0.42, 0.0, 0.6, 0.2,  0.8, true, 0.07, 4),
('Pure PPF', 'Pure Series', 'Pure PPF Stealth (Matte)', 'PP-STL-001', 'ppf_matte',  '#F8F8F8', 0.90, 0.0, 0.0, 0.0,  0.2, true, 0.15, 5),
('Pure PPF', 'Tinted', 'Pure PPF Tinted Black',         'PP-TNT-BK',  'ppf_tinted', '#1A1A1A', 0.06, 0.0, 0.0, 0.0,  0.5, true, 0.60, 6),
('Pure PPF', 'Tinted', 'Pure PPF Tinted Smoke',         'PP-TNT-SM',  'ppf_tinted', '#3D3D3D', 0.06, 0.0, 0.0, 0.0,  0.5, true, 0.45, 7),
('Pure PPF', 'Tinted', 'Pure PPF Tinted Charcoal',      'PP-TNT-CH',  'ppf_tinted', '#2A2A2A', 0.06, 0.0, 0.0, 0.0,  0.5, true, 0.55, 8)
ON CONFLICT DO NOTHING;
