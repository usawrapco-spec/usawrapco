-- Add customer loyalty tracking columns
-- Run this in Supabase SQL Editor

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS lifetime_spend DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze'
  CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Function to calculate loyalty tier based on lifetime spend
CREATE OR REPLACE FUNCTION calculate_loyalty_tier(spend DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF spend >= 30000 THEN RETURN 'platinum';
  ELSIF spend >= 15000 THEN RETURN 'gold';
  ELSIF spend >= 5000 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update customer loyalty when project is marked paid
CREATE OR REPLACE FUNCTION update_customer_loyalty()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update when project moves to 'closed' or 'paid' status
  IF NEW.status IN ('closed') AND OLD.status != 'closed' AND NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET
      lifetime_spend = COALESCE(lifetime_spend, 0) + COALESCE(NEW.revenue, 0),
      jobs_completed = COALESCE(jobs_completed, 0) + 1,
      loyalty_tier = calculate_loyalty_tier(COALESCE(lifetime_spend, 0) + COALESCE(NEW.revenue, 0))
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on projects table
DROP TRIGGER IF EXISTS trigger_update_customer_loyalty ON public.projects;
CREATE TRIGGER trigger_update_customer_loyalty
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_loyalty();

-- Backfill existing customer data (optional - run once)
-- This calculates lifetime spend and jobs for all existing customers
UPDATE public.customers c
SET
  lifetime_spend = (
    SELECT COALESCE(SUM(p.revenue), 0)
    FROM public.projects p
    WHERE p.customer_id = c.id
    AND p.status = 'closed'
  ),
  jobs_completed = (
    SELECT COUNT(*)
    FROM public.projects p
    WHERE p.customer_id = c.id
    AND p.status = 'closed'
  ),
  loyalty_tier = calculate_loyalty_tier((
    SELECT COALESCE(SUM(p.revenue), 0)
    FROM public.projects p
    WHERE p.customer_id = c.id
    AND p.status = 'closed'
  ));
