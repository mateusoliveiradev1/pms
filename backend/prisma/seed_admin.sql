
-- Seed for SYSTEM_ADMIN
-- Usage: Execute this in Supabase SQL Editor or via psql

-- 1. Create User in auth.users (Supabase)
-- Replace 'AdminPassword123!' with a secure hashed password if inserting directly, 
-- BUT for Supabase it's better to sign up via API and then UPDATE the role via SQL.
-- However, since SYSTEM_ADMIN creation via API is blocked, we assume the user 'admin@pms.com'
-- is manually created in Supabase Auth Dashboard first.

-- 2. Insert/Update into public.User
-- Assumes auth.users entry exists with email 'admin@pms.com'

DO $$
DECLARE
  v_user_id uuid;
  v_account_id uuid;
BEGIN
  -- Get ID from Supabase Auth (Ensure user exists first!)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@pms.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User admin@pms.com not found in auth.users. Create it manually in Supabase Dashboard first.';
  END IF;

  -- Create System Account if not exists
  INSERT INTO "Account" (id, name, type, "planId", "onboardingStatus")
  VALUES (gen_random_uuid(), 'System Admin Account', 'BUSINESS', 'enterprise', 'COMPLETED')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_account_id;

  -- If account already existed, get its ID
  IF v_account_id IS NULL THEN
    SELECT id INTO v_account_id FROM "Account" WHERE name = 'System Admin Account';
  END IF;

  -- Insert or Update User with SYSTEM_ADMIN role
  INSERT INTO "User" (id, email, name, role, status, "accountId", "createdAt", "updatedAt")
  VALUES (
    v_user_id, 
    'admin@pms.com', 
    'System Administrator', 
    'SYSTEM_ADMIN', 
    'ACTIVE', 
    v_account_id,
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET 
    role = 'SYSTEM_ADMIN',
    "accountId" = v_account_id;

  RAISE NOTICE 'SYSTEM_ADMIN seeded successfully for %', v_user_id;
END $$;
