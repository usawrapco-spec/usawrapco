-- Add s.terr6059@gmail.com as admin
-- If they already have a profile, promote to admin
-- If they don't have a profile yet (trigger failed), create one on next login via callback

UPDATE profiles
SET role = 'admin'
WHERE email = 's.terr6059@gmail.com'
  AND org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f';

-- Also ensure the auth.users entry gets a profile if one doesn't exist
INSERT INTO profiles (id, org_id, email, name, role, active)
SELECT
  au.id,
  'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  'admin',
  true
FROM auth.users au
WHERE au.email = 's.terr6059@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
