-- ============================================================
-- USA WRAP CO — Crash-safe handle_new_user trigger
-- Run in Supabase SQL Editor to fix unexpected_failure on signup
-- Safe to re-run at any time.
-- ============================================================

-- ─── STEP 1: Ensure profiles table has all required columns ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id      UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active      BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB   DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- ─── STEP 2: Replace trigger with crash-safe version ─────────
-- The EXCEPTION block ensures auth.users INSERT never rolls back
-- even if the profile insert fails (wrong columns, FK missing, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID := 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f';
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but do NOT re-raise — auth.users INSERT must succeed
    RAISE WARNING '[handle_new_user] profile insert failed for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── STEP 3: Re-attach trigger ────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── STEP 4: Verify org row exists (required for FK on profiles.org_id) ──
-- This is a no-op if the org already exists.
INSERT INTO public.orgs (id, name)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'USA Wrap Co')
ON CONFLICT (id) DO NOTHING;
