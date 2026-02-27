-- ============================================================
-- Fix auth_rls_initplan: replace auth.uid() with (select auth.uid())
-- in all RLS policies across the public schema.
--
-- When auth.uid() is called bare inside a subquery, Postgres may
-- re-evaluate it once per row instead of caching it for the query.
-- Wrapping it in (select auth.uid()) forces a single evaluation.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0013_auth_rls_initplan
-- ============================================================

DO $$
DECLARE
  pol          RECORD;
  new_qual     text;
  new_check    text;
  role_clause  text;
  perm_clause  text;
  fixed        int := 0;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  (
        qual::text       LIKE '%auth.uid()%'
        OR with_check::text LIKE '%auth.uid()%'
      )
    ORDER BY tablename, policyname
  LOOP
    -- Patch the expressions
    new_qual  := replace(pol.qual,       'auth.uid()', '(select auth.uid())');
    new_check := replace(pol.with_check, 'auth.uid()', '(select auth.uid())');

    -- Build TO <roles> clause (omit for empty / public)
    IF pol.roles IS NOT NULL
       AND cardinality(pol.roles) > 0
       AND pol.roles <> ARRAY['public']::name[]
    THEN
      role_clause := ' TO ' || array_to_string(pol.roles, ', ');
    ELSE
      role_clause := '';
    END IF;

    -- Build AS RESTRICTIVE clause if needed
    IF pol.permissive = 'RESTRICTIVE' THEN
      perm_clause := ' AS RESTRICTIVE';
    ELSE
      perm_clause := '';
    END IF;

    -- Drop then recreate with patched expressions
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   pol.policyname, pol.tablename);

    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s) WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause,
        pol.cmd, role_clause, new_qual, new_check
      );
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s)',
        pol.policyname, pol.tablename, perm_clause,
        pol.cmd, role_clause, new_qual
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause,
        pol.cmd, role_clause, new_check
      );
    END IF;

    fixed := fixed + 1;
  END LOOP;

  RAISE NOTICE 'auth_rls_initplan: patched % policies', fixed;
END $$;

-- Second pass: same fix for auth.role() which has the identical initplan problem
DO $$
DECLARE
  pol          RECORD;
  new_qual     text;
  new_check    text;
  role_clause  text;
  perm_clause  text;
  fixed        int := 0;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  (
        qual::text       LIKE '%auth.role()%'
        OR with_check::text LIKE '%auth.role()%'
      )
    ORDER BY tablename, policyname
  LOOP
    new_qual  := replace(pol.qual,       'auth.role()', '(select auth.role())');
    new_check := replace(pol.with_check, 'auth.role()', '(select auth.role())');

    IF pol.roles IS NOT NULL
       AND cardinality(pol.roles) > 0
       AND pol.roles <> ARRAY['public']::name[]
    THEN
      role_clause := ' TO ' || array_to_string(pol.roles, ', ');
    ELSE
      role_clause := '';
    END IF;

    IF pol.permissive = 'RESTRICTIVE' THEN
      perm_clause := ' AS RESTRICTIVE';
    ELSE
      perm_clause := '';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   pol.policyname, pol.tablename);

    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s) WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause,
        pol.cmd, role_clause, new_qual, new_check
      );
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s)',
        pol.policyname, pol.tablename, perm_clause,
        pol.cmd, role_clause, new_qual
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause,
        pol.cmd, role_clause, new_check
      );
    END IF;

    fixed := fixed + 1;
  END LOOP;

  RAISE NOTICE 'auth_role_initplan: patched % policies', fixed;
END $$;
