-- Migration 008: Grant platform admin to first owner
-- Run in Supabase SQL Editor → New Query

-- Make the account owner a platform admin.
-- This uses the auth.users table to find the user by email,
-- then updates their profile.
UPDATE profiles
SET is_platform_admin = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'roniron121999@gmail.com'
  LIMIT 1
);

-- Confirm it worked:
SELECT p.id, u.email, p.is_platform_admin
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'roniron121999@gmail.com';
