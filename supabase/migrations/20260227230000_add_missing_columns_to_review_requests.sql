-- Add missing columns to review_requests (used by review-requests route and cron)
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS message_template text,
  ADD COLUMN IF NOT EXISTS google_review_link text,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS error_message text;
