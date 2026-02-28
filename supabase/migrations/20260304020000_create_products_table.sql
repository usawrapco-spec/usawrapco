-- Products/catalog table used by ProductsCatalog settings and EstimateDetailClient quick-add
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text NOT NULL DEFAULT 'wrap',
  description     text,
  default_price   numeric(10,2) NOT NULL DEFAULT 0,
  default_hours   numeric(8,2) NOT NULL DEFAULT 0,
  calculator_type text NOT NULL DEFAULT 'simple',
  taxable         boolean NOT NULL DEFAULT true,
  active          boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  specs           jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_org        ON public.products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_active     ON public.products(org_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(org_id, sort_order);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (org_id = get_my_org_id());

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (org_id = get_my_org_id());
