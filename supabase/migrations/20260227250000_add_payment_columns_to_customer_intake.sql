-- Add Stripe payment tracking to customer_intake (used by payments/webhook route)
ALTER TABLE customer_intake
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS stripe_session_id text;
