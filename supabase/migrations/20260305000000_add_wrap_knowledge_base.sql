CREATE TABLE IF NOT EXISTS public.wrap_knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  metadata   JSONB DEFAULT '{}',
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.wrap_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_org      ON public.wrap_knowledge_base(org_id);

ALTER TABLE public.wrap_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wrap_knowledge_base_all" ON public.wrap_knowledge_base;
CREATE POLICY "wrap_knowledge_base_all" ON public.wrap_knowledge_base
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
