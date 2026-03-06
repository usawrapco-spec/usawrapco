-- Add video_urls array to proposal_packages for multiple video support
ALTER TABLE proposal_packages
  ADD COLUMN IF NOT EXISTS video_urls jsonb DEFAULT '[]'::jsonb;

-- Add link_url and video_url to proposal_upsells for richer upsell cards
ALTER TABLE proposal_upsells
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS video_url text;

-- Add deposit_type to proposals for preset deposit options
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS deposit_type text DEFAULT 'fixed' CHECK (deposit_type IN ('fixed', 'percent_50', 'percent_100'));
