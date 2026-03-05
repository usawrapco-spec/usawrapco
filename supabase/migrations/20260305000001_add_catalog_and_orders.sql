-- Product catalog for portal e-commerce
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  source TEXT,
  price_cents INTEGER,
  price_type TEXT DEFAULT 'fixed',
  image_url TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_org ON public.catalog_products(org_id, active);
CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON public.catalog_products(category);

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_products_select" ON public.catalog_products
  FOR SELECT USING (true);

CREATE POLICY "catalog_products_manage" ON public.catalog_products
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Portal orders from customer catalog purchases
CREATE TABLE IF NOT EXISTS public.portal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  org_id UUID REFERENCES public.orgs(id),
  status TEXT DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  items JSONB NOT NULL,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_orders_customer ON public.portal_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_orders_org ON public.portal_orders(org_id, status);

ALTER TABLE public.portal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_orders_select" ON public.portal_orders
  FOR SELECT USING (true);

CREATE POLICY "portal_orders_insert" ON public.portal_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "portal_orders_manage" ON public.portal_orders
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Seed some common products (using NULL org_id for global defaults)
INSERT INTO public.catalog_products (name, description, category, source, price_cents, price_type, sort_order) VALUES
  ('Full Vehicle Wrap', 'Complete color change or custom graphic wrap for your entire vehicle.', 'vehicle_wraps', 'in_house', 350000, 'starting_at', 1),
  ('Partial Wrap', 'Custom wrap covering specific panels or areas of your vehicle.', 'vehicle_wraps', 'in_house', 150000, 'starting_at', 2),
  ('Commercial Fleet Wrap', 'Branded wraps for commercial vehicles with logo and contact info.', 'vehicle_wraps', 'in_house', 250000, 'starting_at', 3),
  ('Color Change Wrap', 'Transform your vehicle with a new color using premium vinyl.', 'vehicle_wraps', 'in_house', 300000, 'starting_at', 4),
  ('Vinyl Banner', 'Durable indoor/outdoor vinyl banners in any size.', 'signs_banners', 'b2sign', 4500, 'starting_at', 5),
  ('Yard Sign (18x24)', 'Corrugated plastic yard signs with H-stake.', 'signs_banners', 'signs365', 1500, 'fixed', 6),
  ('A-Frame Sign', 'Double-sided folding sidewalk sign.', 'signs_banners', 'signs365', 7500, 'starting_at', 7),
  ('Retractable Banner Stand', 'Portable pull-up banner with carrying case.', 'signs_banners', 'b2sign', 8900, 'fixed', 8),
  ('Vehicle Magnets (pair)', 'Removable magnetic signs for car doors.', 'signs_banners', 'signs365', 4900, 'fixed', 9),
  ('Wall Mural', 'Custom printed wall graphics for offices, retail, or events.', 'wall_graphics', 'b2sign', 1200, 'per_sqft', 10),
  ('Wall Decal / Logo', 'Cut vinyl wall decals for branding.', 'wall_graphics', 'b2sign', 7500, 'starting_at', 11),
  ('Window Decal (perforated)', 'See-through window graphics for storefronts.', 'wall_graphics', 'signs365', 800, 'per_sqft', 12),
  ('Floor Graphics', 'Durable laminated floor decals for retail or events.', 'wall_graphics', 'b2sign', 1500, 'per_sqft', 13),
  ('Automotive Window Tint', 'Professional ceramic window tint for cars and trucks.', 'window_tint', 'in_house', 25000, 'starting_at', 14),
  ('Architectural Window Film', 'Commercial & residential window tinting.', 'window_tint', 'in_house', 800, 'per_sqft', 15),
  ('Paint Protection Film (PPF)', 'Clear bra protection for high-impact areas.', 'ppf', 'in_house', 80000, 'starting_at', 16),
  ('Full Front PPF Package', 'Hood, fenders, bumper, and mirrors protection.', 'ppf', 'in_house', 200000, 'starting_at', 17),
  ('Ceramic Coating', 'Professional ceramic coating for long-lasting paint protection.', 'ppf', 'in_house', 60000, 'starting_at', 18)
ON CONFLICT DO NOTHING;
