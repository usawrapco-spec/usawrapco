-- Add missing columns to design_proofs (used by proof/create and proof/public/[token]/submit routes)
ALTER TABLE design_proofs
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS note_to_customer text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_decision text,
  ADD COLUMN IF NOT EXISTS customer_overall_note text,
  ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid();

-- Add missing columns to job_renders (used by renders/generate route)
ALTER TABLE job_renders
  ADD COLUMN IF NOT EXISTS prediction_id text,
  ADD COLUMN IF NOT EXISTS original_photo_url text,
  ADD COLUMN IF NOT EXISTS prompt text,
  ADD COLUMN IF NOT EXISTS lighting text,
  ADD COLUMN IF NOT EXISTS background text,
  ADD COLUMN IF NOT EXISTS angle text,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_multi_angle boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS angle_set_id text,
  ADD COLUMN IF NOT EXISTS wrap_description text,
  ADD COLUMN IF NOT EXISTS cost_credits numeric(10,4),
  ADD COLUMN IF NOT EXISTS render_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);
