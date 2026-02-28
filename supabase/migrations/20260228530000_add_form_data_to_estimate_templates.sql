ALTER TABLE public.estimate_templates
  ADD COLUMN IF NOT EXISTS form_data JSONB;
