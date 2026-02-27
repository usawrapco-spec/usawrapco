-- Extend prospects.status constraint to include hot/warm/cold (used by ProspectsClient CRM view)
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
ALTER TABLE prospects ADD CONSTRAINT prospects_status_check
  CHECK (status = ANY (ARRAY[
    'uncontacted','contacted','interested','not_interested','converted','dead',
    'hot','warm','cold'
  ]));

-- Add missing columns to affiliates table
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'dealer',
  ADD COLUMN IF NOT EXISTS commission_structure jsonb DEFAULT '{"type":"percent_gp","rate":10}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_code text,
  ADD COLUMN IF NOT EXISTS unique_link text,
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE affiliates SET unique_code = code WHERE unique_code IS NULL AND code IS NOT NULL;
