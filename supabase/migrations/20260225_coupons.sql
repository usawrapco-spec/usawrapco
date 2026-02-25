-- ─── Coupons table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  code          text NOT NULL,
  title         text NOT NULL DEFAULT '',
  description   text DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric DEFAULT NULL,
  valid_from    timestamptz DEFAULT now(),
  valid_until   timestamptz DEFAULT NULL,
  usage_limit   int DEFAULT NULL,
  times_used    int NOT NULL DEFAULT 0,
  is_template   boolean NOT NULL DEFAULT false,
  active        boolean NOT NULL DEFAULT true,
  customer_id   uuid DEFAULT NULL REFERENCES customers(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, code)
);

-- ─── Coupon redemptions table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  coupon_id        uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id      uuid DEFAULT NULL REFERENCES customers(id) ON DELETE SET NULL,
  document_type    text NOT NULL CHECK (document_type IN ('estimate', 'sales_order', 'invoice')),
  document_id      uuid NOT NULL,
  discount_applied numeric NOT NULL DEFAULT 0,
  redeemed_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS for coupons ────────────────────────────────────────────────────────
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org staff full access on coupons"
  ON coupons FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Public read active coupons"
  ON coupons FOR SELECT
  USING (active = true);

-- ─── RLS for coupon_redemptions ─────────────────────────────────────────────
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org staff full access on coupon_redemptions"
  ON coupon_redemptions FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Public read coupon_redemptions"
  ON coupon_redemptions FOR SELECT
  USING (true);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_coupons_org_active ON coupons(org_id, active);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(org_id, code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer ON coupon_redemptions(customer_id);
