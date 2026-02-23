-- Estimate Templates System
-- Pre-built templates for common estimate types

CREATE TABLE IF NOT EXISTS public.estimate_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  line_items  JSONB NOT NULL DEFAULT '[]',
  category    TEXT DEFAULT 'custom',
  is_default  BOOLEAN DEFAULT false,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_templates_org ON public.estimate_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_category ON public.estimate_templates(category);

ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimate_templates_select" ON public.estimate_templates;
CREATE POLICY "estimate_templates_select" ON public.estimate_templates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  OR is_default = true
);

DROP POLICY IF EXISTS "estimate_templates_insert" ON public.estimate_templates;
CREATE POLICY "estimate_templates_insert" ON public.estimate_templates FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','sales_agent'))
);

DROP POLICY IF EXISTS "estimate_templates_update" ON public.estimate_templates;
CREATE POLICY "estimate_templates_update" ON public.estimate_templates FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- Seed default templates (system-wide, org_id NULL for global access)
-- These will be available to all orgs

-- Full Vehicle Wrap Template
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Full Vehicle Wrap',
  'Complete vehicle wrap with design',
  'wraps',
  true,
  '[
    {
      "product": "Full Car Wrap",
      "calculator_type": "vehicle",
      "qty": 1,
      "sqft": 280,
      "basePrice": 565,
      "installHours": 16,
      "notes": "Full wrap coverage"
    },
    {
      "product": "Design Fee",
      "calculator_type": "simple",
      "qty": 1,
      "price": 150,
      "notes": "Custom design and mockup"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Fleet Vehicle Package
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Fleet Vehicle Package (3 vehicles)',
  '3-vehicle fleet wrap package',
  'wraps',
  true,
  '[
    {
      "product": "Full Van Wrap",
      "calculator_type": "vehicle",
      "qty": 3,
      "sqft": 400,
      "basePrice": 650,
      "installHours": 19,
      "notes": "Transit 250 full wrap x3"
    },
    {
      "product": "Fleet Design Fee",
      "calculator_type": "simple",
      "qty": 1,
      "price": 300,
      "notes": "Single design applied to 3 vehicles"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Box Truck Full Wrap
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Box Truck Full Wrap',
  'Complete box truck wrap with cab',
  'wraps',
  true,
  '[
    {
      "product": "Box Truck Full Wrap",
      "calculator_type": "box-truck",
      "qty": 1,
      "length": 16,
      "height": 8,
      "cab_addon": true,
      "notes": "16ft box truck with cab wrap"
    },
    {
      "product": "Design Fee",
      "calculator_type": "simple",
      "qty": 1,
      "price": 200,
      "notes": "Custom box truck design"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Trailer Wrap
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Trailer Wrap',
  'Full trailer wrap',
  'wraps',
  true,
  '[
    {
      "product": "Trailer Wrap",
      "calculator_type": "trailer",
      "qty": 1,
      "notes": "Full coverage trailer wrap"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Marine Package
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Marine Wrap Package',
  'Boat hull wrap with prep',
  'wraps',
  true,
  '[
    {
      "product": "Boat Hull Wrap",
      "calculator_type": "marine",
      "qty": 1,
      "notes": "Hull both sides + transom"
    },
    {
      "product": "Surface Prep Fee",
      "calculator_type": "simple",
      "qty": 1,
      "price": 300,
      "notes": "Marine surface prep and cleaning"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Full Boat Decking Package
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Full Boat Decking Package',
  'Complete boat decking installation',
  'decking',
  true,
  '[
    {
      "product": "Full Deck Package",
      "calculator_type": "decking",
      "qty": 1,
      "notes": "Cockpit, bow, helm, swim platform"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Wrap + Decking Combo
INSERT INTO public.estimate_templates (org_id, name, description, category, is_default, line_items)
VALUES (
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  'Wrap + Decking Combo',
  'Boat wrap and decking combo package',
  'combo',
  true,
  '[
    {
      "product": "Boat Hull Wrap",
      "calculator_type": "marine",
      "qty": 1,
      "notes": "Hull wrap both sides"
    },
    {
      "product": "Full Deck Package",
      "calculator_type": "decking",
      "qty": 1,
      "notes": "Full deck coverage"
    },
    {
      "product": "Design Fee",
      "calculator_type": "simple",
      "qty": 1,
      "price": 250,
      "notes": "Custom marine design"
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;
