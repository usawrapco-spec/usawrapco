-- Ensure stage_checklist column exists on projects table.
-- This column was added in v5 but may be missing in some environments.
-- Stores the race-track checkpoint state per job.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stage_checklist JSONB NOT NULL DEFAULT '{}';

-- Index for querying checklist state efficiently
CREATE INDEX IF NOT EXISTS idx_projects_stage_checklist
  ON projects USING gin(stage_checklist);

-- Auto-populate stage_checklist when pipe_stage advances.
-- Only seeds checkpoints that weren't already manually set.
CREATE OR REPLACE FUNCTION sync_stage_checklist()
RETURNS TRIGGER AS $$
DECLARE
  existing   JSONB;
  new_entries JSONB := '{}';
  auto_done  TEXT[];
  cp         TEXT;
BEGIN
  -- Only fire when pipe_stage actually changes
  IF OLD.pipe_stage IS NOT DISTINCT FROM NEW.pipe_stage THEN
    RETURN NEW;
  END IF;

  existing := COALESCE(NEW.stage_checklist, '{}');

  -- Determine which checkpoints to auto-complete for each stage
  CASE NEW.pipe_stage
    WHEN 'production' THEN
      auto_done := ARRAY[
        'lead_created','estimate_sent','proposal_accepted','deposit_paid',
        'contract_sent','contract_signed','brief_received'
      ];
    WHEN 'install' THEN
      auto_done := ARRAY[
        'lead_created','estimate_sent','proposal_accepted','deposit_paid',
        'contract_sent','contract_signed','brief_received','design_in_progress',
        'proof_sent','design_approved','print_queued','printing',
        'print_complete','laminated_ready'
      ];
    WHEN 'prod_review' THEN
      auto_done := ARRAY[
        'lead_created','estimate_sent','proposal_accepted','deposit_paid',
        'contract_sent','contract_signed','brief_received','design_in_progress',
        'proof_sent','design_approved','print_queued','printing',
        'print_complete','laminated_ready','install_scheduled','contract_verified',
        'install_started','install_complete'
      ];
    WHEN 'sales_close' THEN
      auto_done := ARRAY[
        'lead_created','estimate_sent','proposal_accepted','deposit_paid',
        'contract_sent','contract_signed','brief_received','design_in_progress',
        'proof_sent','design_approved','print_queued','printing',
        'print_complete','laminated_ready','install_scheduled','contract_verified',
        'install_started','install_complete','qc_passed','invoice_sent'
      ];
    WHEN 'done' THEN
      auto_done := ARRAY[
        'lead_created','estimate_sent','proposal_accepted','deposit_paid',
        'contract_sent','contract_signed','brief_received','design_in_progress',
        'proof_sent','design_approved','print_queued','printing',
        'print_complete','laminated_ready','install_scheduled','contract_verified',
        'install_started','install_complete','qc_passed','invoice_sent',
        'payment_received','job_complete'
      ];
    ELSE
      -- sales_in: just lead_created
      auto_done := ARRAY['lead_created'];
  END CASE;

  -- For each auto-done checkpoint, only set it if not already explicitly set
  FOREACH cp IN ARRAY auto_done LOOP
    IF NOT (existing ? cp) THEN
      new_entries := new_entries || jsonb_build_object(
        cp,
        jsonb_build_object(
          'done', true,
          'auto', true,
          'at', NOW()::TEXT
        )
      );
    END IF;
  END LOOP;

  NEW.stage_checklist := existing || new_entries;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS trg_sync_stage_checklist ON projects;
CREATE TRIGGER trg_sync_stage_checklist
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_stage_checklist();
