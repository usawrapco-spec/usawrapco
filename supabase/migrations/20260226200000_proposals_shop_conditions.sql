-- ═══════════════════════════════════════════════════════════════════════════
-- Proposals, Virtual Shop, Condition Reports, Job Photos, Maintenance Reminders
-- Migration: 20260226200000
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PROPOSALS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid REFERENCES estimates(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id),
  org_id uuid NOT NULL DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  title text NOT NULL DEFAULT 'Your Custom Wrap Proposal',
  message text,
  expiration_date timestamptz,
  status text NOT NULL DEFAULT 'draft', -- 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired'
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  accepted_package_id uuid,
  customer_signature text,
  public_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  deposit_amount numeric DEFAULT 250,
  subtotal numeric,
  notes text,
  show_line_items boolean DEFAULT true,
  require_deposit boolean DEFAULT true,
  allow_customer_scheduling boolean DEFAULT true,
  selected_add_ons jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  name text NOT NULL,
  badge text,
  description text,
  price numeric NOT NULL DEFAULT 0,
  includes jsonb DEFAULT '[]'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  video_url text,
  sort_order int DEFAULT 0,
  is_recommended boolean DEFAULT false,
  deposit_required numeric,
  install_time_hours numeric,
  warranty_years int,
  material_brand text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_upsells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  photo_url text,
  badge text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  package_id uuid REFERENCES proposal_packages(id),
  upsell_ids jsonb DEFAULT '[]'::jsonb,
  total_amount numeric,
  deposit_amount numeric DEFAULT 250,
  stripe_payment_intent_id text,
  deposit_paid_at timestamptz,
  scheduled_date date,
  customer_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_manage_proposals" ON proposals FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "public_view_proposals" ON proposals FOR SELECT
  USING (public_token IS NOT NULL);

CREATE POLICY "org_manage_packages" ON proposal_packages FOR ALL
  USING (proposal_id IN (SELECT id FROM proposals WHERE org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));
CREATE POLICY "public_view_packages" ON proposal_packages FOR SELECT
  USING (true);

CREATE POLICY "org_manage_upsells" ON proposal_upsells FOR ALL
  USING (proposal_id IN (SELECT id FROM proposals WHERE org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));
CREATE POLICY "public_view_upsells" ON proposal_upsells FOR SELECT
  USING (true);

CREATE POLICY "org_manage_selections" ON proposal_selections FOR ALL
  USING (proposal_id IN (SELECT id FROM proposals WHERE org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid));
CREATE POLICY "public_insert_selections" ON proposal_selections FOR INSERT
  WITH CHECK (true);


-- ─── VIRTUAL SHOP PRODUCTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  name text NOT NULL,
  tagline text,
  description text,
  category text NOT NULL, -- 'wrap' | 'ppf' | 'decking' | 'add_on' | 'bundle'
  service_type text,
  pricing_type text DEFAULT 'fixed', -- 'fixed' | 'starting_at' | 'per_sqft' | 'vehicle_based'
  base_price numeric,
  price_label text,
  images jsonb DEFAULT '[]'::jsonb,
  video_url text,
  features jsonb DEFAULT '[]'::jsonb,
  badge text,
  badge_color text DEFAULT 'blue',
  vehicle_types jsonb DEFAULT '[]'::jsonb,
  frequently_bought_with jsonb DEFAULT '[]'::jsonb,
  deposit_amount numeric DEFAULT 250,
  deposit_label text DEFAULT '$250 Design Deposit',
  enabled boolean DEFAULT true,
  sort_order int DEFAULT 0,
  click_count int DEFAULT 0,
  conversion_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ─── VIRTUAL SHOP SESSIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  session_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_category text,
  selected_products jsonb DEFAULT '[]'::jsonb,
  add_ons jsonb DEFAULT '[]'::jsonb,
  total_estimate numeric,
  utm_source text,
  affiliate_slug text,
  status text DEFAULT 'browsing', -- 'browsing' | 'quote_built' | 'deposit_paid' | 'converted'
  customer_name text,
  customer_email text,
  customer_phone text,
  converted_to_project_id uuid REFERENCES projects(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_shop" ON shop_products FOR SELECT USING (enabled = true);
CREATE POLICY "org_write_shop" ON shop_products FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "public_shop_sessions" ON shop_sessions FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid OR session_token IS NOT NULL);
CREATE POLICY "insert_shop_sessions" ON shop_sessions FOR INSERT
  WITH CHECK (true);


-- ─── CONDITION REPORTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  project_id uuid REFERENCES projects(id),
  report_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vin text,
  mileage int,
  fuel_level text, -- 'empty' | '1/4' | '1/2' | '3/4' | 'full'
  damage_zones jsonb DEFAULT '[]'::jsonb,
  interior_notes text,
  exterior_notes text,
  pre_existing_damage boolean DEFAULT false,
  installer_id uuid REFERENCES profiles(id),
  installer_notes text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_acknowledged boolean DEFAULT false,
  customer_signature text,
  customer_signed_at timestamptz,
  customer_ip text,
  photos jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft', -- 'draft' | 'sent' | 'signed' | 'declined'
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_manage_condition_reports" ON condition_reports FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "public_view_condition_reports" ON condition_reports FOR SELECT
  USING (report_token IS NOT NULL);
CREATE POLICY "public_sign_condition_reports" ON condition_reports FOR UPDATE
  USING (report_token IS NOT NULL);


-- ─── JOB PHOTOS (Before/After Gallery) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  project_id uuid REFERENCES projects(id),
  photo_type text NOT NULL, -- 'before' | 'after' | 'progress' | 'detail'
  url text NOT NULL,
  thumbnail_url text,
  caption text,
  zone text, -- 'front' | 'rear' | 'driver_side' | 'passenger_side' | 'roof' | 'interior' | 'full'
  sort_order int DEFAULT 0,
  uploaded_by uuid REFERENCES profiles(id),
  is_featured boolean DEFAULT false,
  is_portfolio boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_photos_project_idx ON job_photos(project_id);
CREATE INDEX IF NOT EXISTS job_photos_type_idx ON job_photos(photo_type);
CREATE INDEX IF NOT EXISTS job_photos_portfolio_idx ON job_photos(is_portfolio) WHERE is_portfolio = true;

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_manage_job_photos" ON job_photos FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "public_view_portfolio_photos" ON job_photos FOR SELECT
  USING (is_portfolio = true OR is_featured = true);


-- ─── MAINTENANCE REMINDERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  customer_id uuid,
  project_id uuid REFERENCES projects(id),
  reminder_type text NOT NULL, -- 'ppf_refresh' | 'wrap_refresh' | 'ceramic_reapply' | 'annual_checkup' | 'custom'
  title text NOT NULL,
  message text,
  due_date date NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending', -- 'pending' | 'sent' | 'converted' | 'dismissed' | 'snoozed'
  snooze_until date,
  converted_to_project_id uuid REFERENCES projects(id),
  customer_name text,
  customer_email text,
  customer_phone text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_reminders_due_idx ON maintenance_reminders(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS maintenance_reminders_project_idx ON maintenance_reminders(project_id);

ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_manage_reminders" ON maintenance_reminders FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);


-- ─── SEED SHOP PRODUCTS ───────────────────────────────────────────────────────
INSERT INTO shop_products (org_id, name, tagline, description, category, service_type, pricing_type, base_price, price_label, features, badge, badge_color, vehicle_types, deposit_amount, sort_order)
SELECT
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  v.name, v.tagline, v.description, v.category, v.service_type,
  v.pricing_type, v.base_price, v.price_label,
  v.features::jsonb, v.badge, v.badge_color, v.vehicle_types::jsonb,
  v.deposit_amount, v.sort_order
FROM (VALUES
  ('Full Vehicle Wrap','Complete transformation. Every panel.','Our most popular service. Full coverage vinyl wrap using premium film. Includes hood, roof, all doors, bumpers, mirrors, and pillars. Choose from 200+ colors and finishes.','wrap','full_wrap','vehicle_based',2400,'Starting at $2,400','["Premium vinyl", "200+ colors & finishes", "Gloss, matte, satin, chrome, color-shift", "5-year manufacturer warranty", "Full panel coverage", "Design consultation included"]','Most Popular','blue','["sedan","suv","pickup","van","sprinter"]',250,1),
  ('Partial Wrap','Maximum impact. Strategic coverage.','Hood, roof, and rear panel wrap. The most visible areas — perfect for commercial branding or a two-tone look without the full investment.','wrap','partial_wrap','vehicle_based',1200,'Starting at $1,200','["Hood + roof + rear panels", "Premium vinyl", "Color matched or contrasting", "3-year warranty", "Design included"]',NULL,'blue','["sedan","suv","pickup","van"]',250,2),
  ('Commercial Fleet Wrap','Your brand on every road.','Turn your work vehicles into rolling billboards. Full design, print, and install for vans, box trucks, trailers, and fleets. Volume pricing available.','wrap','fleet_wrap','starting_at',1800,'Starting at $1,800/vehicle','["Full design included", "Print + install", "Fleet volume discounts", "Consistent branding", "Rush available"]','Best Value','green','["van","sprinter","box_truck","trailer"]',500,3),
  ('Boat / Marine Wrap','Make waves. Literally.','Full hull wraps and DekWave marine decking for boats, yachts, and watercraft. Marine-grade vinyl rated for UV, saltwater, and constant sun exposure.','wrap','marine_wrap','starting_at',3500,'Starting at $3,500','["Marine-grade vinyl", "UV + saltwater resistant", "Hull + deck options", "DekWave non-slip decking available", "Full design included"]',NULL,'blue','[]',500,4),
  ('Full Front PPF','The most hit areas. Fully protected.','Full hood, front fenders, mirrors, and full front bumper. Stops rock chips, road debris, and scratches before they happen. Invisible protection with self-healing technology.','ppf','ppf_front','vehicle_based',1400,'Starting at $1,400','["Self-healing technology", "Hydrophobic top coat", "Invisible protection", "10-year warranty", "Full hood + fenders + bumper + mirrors"]',NULL,'blue','["sedan","suv","pickup"]',250,5),
  ('Full Vehicle PPF','Every inch. Zero compromise.','Complete paint protection film coverage for the entire vehicle. The ultimate protection package for new cars and luxury vehicles.','ppf','ppf_full','vehicle_based',4500,'Starting at $4,500','["100% full-body coverage", "Self-healing + hydrophobic", "10-year warranty", "Invisible or matte finish options", "Pre-cut precision patterns"]','Premium','gold','["sedan","suv","pickup"]',500,6),
  ('PPF Rocker Panels','Stop door dings and road salt.','Targeted protection for the most vulnerable lower panels. Stops rock chips, road debris, salt, and scrapes exactly where they happen first.','ppf','ppf_rockers','fixed',400,'$400','["Both rocker panels", "Precise cut to vehicle spec", "Invisible film", "5-year warranty"]',NULL,'blue','["sedan","suv","pickup"]',0,7),
  ('Chrome Delete','Clean it up. Black it out.','Replace all chrome trim, door handles, pillars, and grille accents with gloss or matte black vinyl. Transforms the look of any vehicle instantly.','add_on','chrome_delete','starting_at',350,'Starting at $350','["All chrome trim wrapped", "Gloss or matte black", "Satin, gunmetal options", "Reversible"]',NULL,'blue','["sedan","suv","pickup","van"]',0,8),
  ('DekWave Marine Decking','Premium non-slip. Zero maintenance.','Replace your worn boat deck with DekWave synthetic teak — the most realistic-looking, non-slip marine decking on the market.','decking','dekwave','per_sqft',28,'$28/sq ft installed','["DekWave synthetic teak", "UV + mold resistant", "Non-slip texture", "No maintenance required", "Available in 6 colors"]',NULL,'blue','[]',250,9),
  ('Roof Wrap','Two-tone. Zero regrets.','Wrap the roof only in a contrasting color or finish. One of the most popular accent upgrades.','add_on','roof_wrap','fixed',450,'Starting at $450','["Full roof coverage", "Any color or finish", "Gloss black most popular", "Carbon fiber, matte options"]',NULL,'blue','["sedan","suv","pickup"]',0,10)
) AS v(name,tagline,description,category,service_type,pricing_type,base_price,price_label,features,badge,badge_color,vehicle_types,deposit_amount,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM shop_products WHERE org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid LIMIT 1);
