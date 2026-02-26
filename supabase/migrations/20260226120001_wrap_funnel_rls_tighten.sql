-- Tighten RLS on wrap_funnel_sessions:
-- API routes use the service-role key (bypasses RLS) so anonymous clients
-- should never be able to SELECT or UPDATE this table directly.

-- Drop any overly-permissive public policies that may have been created
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'wrap_funnel_sessions'
      AND (qual IS NULL OR qual = 'true')  -- public/all-rows policies
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON wrap_funnel_sessions', pol.policyname);
  END LOOP;
END;
$$;

-- Ensure RLS is enabled
ALTER TABLE wrap_funnel_sessions ENABLE ROW LEVEL SECURITY;

-- No anonymous SELECT — service role handles all reads
-- No anonymous INSERT/UPDATE — service role handles all writes
-- Authenticated staff can read all sessions (for CRM review)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'wrap_funnel_sessions'
      AND policyname = 'staff_select_wrap_funnel_sessions'
  ) THEN
    CREATE POLICY staff_select_wrap_funnel_sessions
      ON wrap_funnel_sessions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END;
$$;
