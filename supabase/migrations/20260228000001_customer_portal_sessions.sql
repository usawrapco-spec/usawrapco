-- Customer portal session tracking
CREATE TABLE IF NOT EXISTS customer_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  email TEXT,
  magic_link_sent_at TIMESTAMP,
  password_set_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE customer_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal sessions: service role only"
  ON customer_portal_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
