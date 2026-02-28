-- ─────────────────────────────────────────────────────────────────────────────
-- Wisetack Financing Integration
-- Adds financing_applications table and pay_link_token to invoices
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create financing_applications table FIRST (no circular dep yet)
CREATE TABLE IF NOT EXISTS financing_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid REFERENCES orgs(id) ON DELETE CASCADE,
  invoice_id          uuid REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id         uuid,
  customer_phone      text,
  customer_email      text,
  invoice_number      text,
  amount_requested    numeric(10,2),
  amount_approved     numeric(10,2),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','prequalified','applying','approved',
                                          'declined','loan_accepted','funded','expired','cancelled')),
  term_months         integer,
  apr_percent         numeric(5,2),
  monthly_payment     numeric(10,2),
  merchant_ref        text,
  sent_at             timestamptz,
  approved_at         timestamptz,
  funded_at           timestamptz,
  webhook_payload     jsonb,
  created_by          uuid REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. Add columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pay_link_token          uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS financing_application_id uuid,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text
    CHECK (preferred_payment_method IN ('card','financing','cash','check'));

-- Backfill existing invoices that don't have a pay_link_token
UPDATE invoices SET pay_link_token = gen_random_uuid() WHERE pay_link_token IS NULL;

-- 3. Now add the FK from invoices → financing_applications
ALTER TABLE invoices
  ADD CONSTRAINT invoices_financing_application_id_fkey
  FOREIGN KEY (financing_application_id)
  REFERENCES financing_applications(id)
  ON DELETE SET NULL;

-- 4. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS invoices_pay_link_token_idx
  ON invoices(pay_link_token);

CREATE INDEX IF NOT EXISTS financing_applications_invoice_idx
  ON financing_applications(invoice_id);

CREATE INDEX IF NOT EXISTS financing_applications_org_idx
  ON financing_applications(org_id);

CREATE INDEX IF NOT EXISTS financing_applications_status_idx
  ON financing_applications(status);

-- 5. RLS
ALTER TABLE financing_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financing_applications_org_select"
  ON financing_applications FOR SELECT
  USING (org_id = (SELECT get_my_org_id()));

CREATE POLICY "financing_applications_org_insert"
  ON financing_applications FOR INSERT
  WITH CHECK (org_id = (SELECT get_my_org_id()));

CREATE POLICY "financing_applications_org_update"
  ON financing_applications FOR UPDATE
  USING (org_id = (SELECT get_my_org_id()));

CREATE POLICY "financing_applications_org_delete"
  ON financing_applications FOR DELETE
  USING (org_id = (SELECT get_my_org_id()));
