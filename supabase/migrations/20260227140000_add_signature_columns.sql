-- Add signature tracking columns to estimates
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signature_data text;

-- Add signature tracking columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signature_data text;
