-- Stripe payment fields for payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS payments_stripe_session_idx
  ON payments(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_stripe_intent_idx
  ON payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
