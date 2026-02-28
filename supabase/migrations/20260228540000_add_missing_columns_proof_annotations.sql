-- proof_annotations: add columns used by proof submission code
ALTER TABLE public.proof_annotations
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS page INTEGER DEFAULT 1;
