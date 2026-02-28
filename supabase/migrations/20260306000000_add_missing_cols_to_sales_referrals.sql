-- Add missing columns to sales_referrals used by ReferralsClient.tsx
ALTER TABLE public.sales_referrals
  ADD COLUMN IF NOT EXISTS division_from text,
  ADD COLUMN IF NOT EXISTS division_to text,
  ADD COLUMN IF NOT EXISTS referral_type text,
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS commission_amount numeric;
