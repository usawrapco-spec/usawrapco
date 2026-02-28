-- Add missing outreach/sequence columns to campaigns table
-- CampaignsClient uses these for email drip campaign management

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS industry_target text,
  ADD COLUMN IF NOT EXISTS email_sequence  jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_reply      boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS stats           jsonb    DEFAULT '{"sent":0,"opened":0,"replied":0,"bounced":0,"conversions":0}'::jsonb;
