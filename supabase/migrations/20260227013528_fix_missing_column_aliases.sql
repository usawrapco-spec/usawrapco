-- ============================================================
-- FIX MISSING COLUMN ALIASES
-- Adds columns that app code expects but DB schema is missing
-- ============================================================

-- ── 1. customers: company_name + lifetime_spend ───────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_spend NUMERIC DEFAULT 0;

-- Populate from existing columns
UPDATE customers
SET
  company_name  = COALESCE(business_name, business),
  lifetime_spend = COALESCE(total_revenue, 0)
WHERE company_name IS NULL OR lifetime_spend = 0;

-- Sync trigger: keep company_name / lifetime_spend aligned with source columns
CREATE OR REPLACE FUNCTION sync_customers_aliases()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- company_name: prefer business_name, fall back to business or incoming company_name
  NEW.company_name    := COALESCE(NEW.business_name, NEW.business, NEW.company_name);
  -- also back-fill business_name if it was missing
  IF NEW.business_name IS NULL THEN
    NEW.business_name := NEW.company_name;
  END IF;
  -- lifetime_spend always mirrors total_revenue
  NEW.lifetime_spend  := COALESCE(NEW.total_revenue, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customers_aliases ON customers;
CREATE TRIGGER trg_sync_customers_aliases
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION sync_customers_aliases();

-- ── 2. sales_referrals: referrer_id + referee_id ─────────────────────────────
ALTER TABLE sales_referrals ADD COLUMN IF NOT EXISTS referrer_id UUID;
ALTER TABLE sales_referrals ADD COLUMN IF NOT EXISTS referee_id  UUID;

-- Populate from existing columns
UPDATE sales_referrals
SET
  referrer_id = referring_user_id,
  referee_id  = receiving_user_id
WHERE referrer_id IS NULL OR referee_id IS NULL;

-- Sync trigger
CREATE OR REPLACE FUNCTION sync_sales_referrals_aliases()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.referrer_id        := COALESCE(NEW.referring_user_id, NEW.referrer_id);
  NEW.referring_user_id  := COALESCE(NEW.referring_user_id, NEW.referrer_id);
  NEW.referee_id         := COALESCE(NEW.receiving_user_id, NEW.referee_id);
  NEW.receiving_user_id  := COALESCE(NEW.receiving_user_id, NEW.referee_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sales_referrals_aliases ON sales_referrals;
CREATE TRIGGER trg_sync_sales_referrals_aliases
  BEFORE INSERT OR UPDATE ON sales_referrals
  FOR EACH ROW EXECUTE FUNCTION sync_sales_referrals_aliases();

-- ── 3. xp_ledger: amount + reason + source_type + source_id ──────────────────
-- App code inserts with amount/reason/source_type/source_id
-- DB was created with points/action/description/project_id
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS amount      INTEGER;
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS reason      TEXT;
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS source_id   TEXT;

-- Populate from existing columns
UPDATE xp_ledger
SET
  amount = points,
  reason = action
WHERE amount IS NULL OR reason IS NULL;

-- Sync trigger
CREATE OR REPLACE FUNCTION sync_xp_ledger_aliases()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.amount := COALESCE(NEW.amount, NEW.points);
  NEW.points := COALESCE(NEW.points, NEW.amount);
  NEW.reason := COALESCE(NEW.reason, NEW.action);
  NEW.action := COALESCE(NEW.action, NEW.reason);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_xp_ledger_aliases ON xp_ledger;
CREATE TRIGGER trg_sync_xp_ledger_aliases
  BEFORE INSERT OR UPDATE ON xp_ledger
  FOR EACH ROW EXECUTE FUNCTION sync_xp_ledger_aliases();
