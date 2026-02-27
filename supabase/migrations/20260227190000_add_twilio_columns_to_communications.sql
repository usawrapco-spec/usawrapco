-- Add Twilio/call columns to communications table
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS twilio_sid text,
  ADD COLUMN IF NOT EXISTS call_duration_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS call_recording_url text,
  ADD COLUMN IF NOT EXISTS to_number text,
  ADD COLUMN IF NOT EXISTS from_number text,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES profiles(id);
