-- ============================================================
-- USA WRAP CO — Role Migration + Team Invites
-- Run in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- ─── STEP 1: Migrate old role values to new enum ─────────────
UPDATE profiles SET role = 'sales_agent' WHERE role = 'sales';
UPDATE profiles SET role = 'viewer'      WHERE role = 'customer';
-- 'admin', 'production', 'installer', 'designer' stay the same

-- ─── STEP 2: Fix the role check constraint ───────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner','admin','sales_agent','designer','production','installer','viewer'));

-- Update default
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- ─── STEP 3: Fix handle_new_user trigger ─────────────────────
-- Auto-creates a profiles row for ANY new auth user (Google OAuth, email, invite)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID := 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f';
BEGIN
  INSERT INTO public.profiles (id, org_id, email, name, avatar_url, role, active, permissions)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(COALESCE(NEW.email, 'user@'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    'viewer',
    true,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = COALESCE(EXCLUDED.email, profiles.email),
    name       = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── STEP 4: Create team_invites table ───────────────────────
CREATE TABLE IF NOT EXISTS team_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('owner','admin','sales_agent','designer','production','installer','viewer')),
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','expired','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(email, org_id)
);

CREATE INDEX IF NOT EXISTS team_invites_email_idx  ON team_invites(email);
CREATE INDEX IF NOT EXISTS team_invites_org_idx    ON team_invites(org_id, status);

-- ─── STEP 5: RLS policies for team_invites ───────────────────
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Admins/owners can read all invites for their org
DROP POLICY IF EXISTS "team_invites_select" ON team_invites;
CREATE POLICY "team_invites_select" ON team_invites
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE org_id = team_invites.org_id
        AND role IN ('owner','admin')
    )
  );

-- Admins/owners can insert invites
DROP POLICY IF EXISTS "team_invites_insert" ON team_invites;
CREATE POLICY "team_invites_insert" ON team_invites
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE org_id = team_invites.org_id
        AND role IN ('owner','admin')
    )
  );

-- Admins/owners can update (cancel, etc.)
DROP POLICY IF EXISTS "team_invites_update" ON team_invites;
CREATE POLICY "team_invites_update" ON team_invites
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE org_id = team_invites.org_id
        AND role IN ('owner','admin')
    )
  );

-- ─── STEP 6: Add last_active_date to profiles (if missing) ───
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'both'
  CHECK (division IN ('wraps','decking','both'));

-- ─── STEP 7: Promote owner accounts ──────────────────────────
-- These emails should always have the owner role
UPDATE profiles
  SET role = 'owner', updated_at = now()
  WHERE email IN ('fleet@usawrapco.com', 'usawrapco@gmail.com');
