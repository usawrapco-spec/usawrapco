-- ── referral_clicks: track landing page visits ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_clicks(referral_code);
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_clicks_insert" ON public.referral_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "referral_clicks_select" ON public.referral_clicks FOR SELECT USING (true);

-- ── customer_referrals: customer-to-customer referral records ─────────────────
CREATE TABLE IF NOT EXISTS public.customer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  referrer_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  referred_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  referral_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deposit_paid', 'job_complete', 'paid')),
  credit_amount DECIMAL(10,2) DEFAULT 150,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referrer ON public.customer_referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referred  ON public.customer_referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_code      ON public.customer_referrals(referral_code);
ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_referrals_select" ON public.customer_referrals FOR SELECT USING (true);
CREATE POLICY "customer_referrals_insert" ON public.customer_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "customer_referrals_update" ON public.customer_referrals FOR UPDATE USING (true);

-- ── loyalty_redemptions: add discount_code + project link ─────────────────────
ALTER TABLE public.loyalty_redemptions
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS applied_to_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
