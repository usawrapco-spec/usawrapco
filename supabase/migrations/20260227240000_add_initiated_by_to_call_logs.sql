-- Add initiated_by column to call_logs (used by twilio/make-call route)
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS initiated_by uuid REFERENCES profiles(id);
