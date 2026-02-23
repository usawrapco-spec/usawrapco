-- Add is_owner column to profiles table
-- Run this in Supabase SQL Editor if column doesn't exist

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- Set is_owner=true for Chance Wallace (owner account)
-- Update the email to match the actual owner's email
UPDATE public.profiles
SET is_owner = true
WHERE email = 'chance@usawrapco.com'
OR email = 'owner@usawrapco.com'
OR role = 'owner';

-- Update RLS policies to include is_owner checks
DROP POLICY IF EXISTS "orgs_update" ON public.orgs;
CREATE POLICY "orgs_update" ON public.orgs FOR UPDATE USING (
  id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND (is_owner = true OR role = 'admin'))
);

-- Allow is_owner to update any profile in their org
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (
  id = auth.uid()  -- Can always update own profile
  OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND (is_owner = true OR role = 'admin'))
);
