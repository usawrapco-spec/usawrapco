-- BidsClient uses offered_rate/target_rate/passive_margin/sent_at/response_at
-- which were missing from installer_bids
ALTER TABLE public.installer_bids
  ADD COLUMN IF NOT EXISTS offered_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS target_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS passive_margin numeric(10,2),
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_at timestamptz;
