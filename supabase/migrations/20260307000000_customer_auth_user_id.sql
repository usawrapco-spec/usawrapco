-- Link customers to Supabase Auth users so portal sign-in persists across sessions
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_auth_user_id_idx ON customers(auth_user_id);

-- Track free AI mockup generations for unauthenticated users (per session/device)
-- Authenticated users are tracked by auth_user_id on design_mockups
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
