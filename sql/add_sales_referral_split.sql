-- Sales Referral Split System
-- Tracks cross-department referrals between agents

CREATE TABLE IF NOT EXISTS public.sales_referrals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  referring_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  closing_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  split_pct          DECIMAL(5,4) DEFAULT 0.025,  -- Default 2.5%
  gross_profit       DECIMAL(10,2) DEFAULT 0,
  amount_earned      DECIMAL(10,2) DEFAULT 0,
  status             TEXT DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'paid')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)  -- One referral split per project
);

CREATE INDEX IF NOT EXISTS idx_sales_referrals_org ON public.sales_referrals(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_referring ON public.sales_referrals(referring_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_closing ON public.sales_referrals(closing_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_project ON public.sales_referrals(project_id);

ALTER TABLE public.sales_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_referrals_select" ON public.sales_referrals;
CREATE POLICY "sales_referrals_select" ON public.sales_referrals FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "sales_referrals_insert" ON public.sales_referrals;
CREATE POLICY "sales_referrals_insert" ON public.sales_referrals FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'sales_agent'))
);

DROP POLICY IF EXISTS "sales_referrals_update" ON public.sales_referrals;
CREATE POLICY "sales_referrals_update" ON public.sales_referrals FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Function to calculate referral split amount
CREATE OR REPLACE FUNCTION calculate_referral_split()
RETURNS TRIGGER AS $$
DECLARE
  gp DECIMAL(10,2);
BEGIN
  -- Calculate gross profit from project
  SELECT COALESCE(profit, 0) INTO gp
  FROM public.projects
  WHERE id = NEW.project_id;

  -- Update referral split amounts
  NEW.gross_profit := gp;
  NEW.amount_earned := gp * NEW.split_pct;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate referral amounts
DROP TRIGGER IF EXISTS trigger_calculate_referral_split ON public.sales_referrals;
CREATE TRIGGER trigger_calculate_referral_split
  BEFORE INSERT OR UPDATE ON public.sales_referrals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_referral_split();

-- Add referral fields to projects table if they don't exist
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS referring_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_split_pct DECIMAL(5,4) DEFAULT 0;

COMMENT ON COLUMN public.projects.referring_agent_id IS 'Agent who referred this deal (cross-department)';
COMMENT ON COLUMN public.projects.referral_split_pct IS 'Percentage of GP split with referring agent';
