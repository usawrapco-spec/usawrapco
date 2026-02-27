-- XP Ledger Enhancements: org_id + metadata columns
-- Migration: 20260302200000

ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id);
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

CREATE INDEX IF NOT EXISTS xp_ledger_org_idx      ON xp_ledger(org_id);
CREATE INDEX IF NOT EXISTS xp_ledger_user_action  ON xp_ledger(user_id, reason);
CREATE INDEX IF NOT EXISTS xp_ledger_created_desc ON xp_ledger(created_at DESC);
