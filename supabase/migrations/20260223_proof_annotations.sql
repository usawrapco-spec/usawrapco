-- ============================================================
-- Design Proofing & Annotation System
-- Adds columns to design_proofs + creates proof_annotations
-- ============================================================

-- Add new columns to design_proofs (safe: IF NOT EXISTS via DO block)
DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN public_token UUID DEFAULT gen_random_uuid();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN status TEXT DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN expires_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN decided_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN customer_decision TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN customer_overall_note TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN revision_note TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN viewed_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN title TEXT DEFAULT 'Your Design Proof';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.design_proofs ADD COLUMN note_to_customer TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index for fast public_token lookups
CREATE INDEX IF NOT EXISTS idx_design_proofs_public_token ON public.design_proofs(public_token);

-- ============================================================
-- proof_annotations table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proof_annotations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id    UUID NOT NULL REFERENCES public.design_proofs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('draw','arrow','text','stamp','rect','circle')),
  color       TEXT NOT NULL DEFAULT '#f25a5a',
  data        JSONB NOT NULL DEFAULT '{}',
  page        INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_annotations_proof ON public.proof_annotations(proof_id);

-- RLS
ALTER TABLE public.proof_annotations ENABLE ROW LEVEL SECURITY;

-- Public can read/insert annotations (gated by knowing the proof token)
CREATE POLICY "proof_annotations_public_read"  ON public.proof_annotations FOR SELECT USING (true);
CREATE POLICY "proof_annotations_public_insert" ON public.proof_annotations FOR INSERT WITH CHECK (true);
CREATE POLICY "proof_annotations_public_delete" ON public.proof_annotations FOR DELETE USING (true);
