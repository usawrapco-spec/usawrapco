-- ─────────────────────────────────────────────────────────────────────────────
-- Affirm Financing Integration
-- Adds provider tracking and Affirm-specific columns to financing_applications
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add provider column and Affirm-specific fields
ALTER TABLE financing_applications
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'affirm'
    CHECK (provider IN ('affirm', 'wisetack', 'other')),
  ADD COLUMN IF NOT EXISTS affirm_checkout_token text,
  ADD COLUMN IF NOT EXISTS affirm_charge_id text,
  ADD COLUMN IF NOT EXISTS affirm_loan_id text;

-- 2. Mark all existing records as wisetack
UPDATE financing_applications SET provider = 'wisetack' WHERE affirm_charge_id IS NULL;

-- 3. Index for Affirm charge lookups
CREATE INDEX IF NOT EXISTS financing_applications_affirm_charge_idx
  ON financing_applications(affirm_charge_id) WHERE affirm_charge_id IS NOT NULL;

-- 4. Allow service-role (webhooks) to update financing status
CREATE POLICY "financing_applications_service_update"
  ON financing_applications FOR UPDATE
  USING (true)
  WITH CHECK (true);
