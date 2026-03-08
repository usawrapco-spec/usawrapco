-- Fix handle_new_user trigger that causes "Database error saving new user"
-- The trigger must NEVER raise an exception, or auth.users INSERT rolls back.
-- Re-deploy the crash-safe version with explicit search_path.

-- Ensure org exists first
INSERT INTO public.orgs (id, name)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'USA Wrap Co')
ON CONFLICT (id) DO NOTHING;

-- Ensure profiles table has all required columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id      UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active      BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB   DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Re-create crash-safe trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
      email      = COALESCE(EXCLUDED.email, public.profiles.email),
      name       = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Log but never re-raise — auth.users INSERT must always succeed
    RAISE WARNING '[handle_new_user] profile insert failed for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
