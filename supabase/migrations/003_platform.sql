-- Run in Supabase SQL Editor → New Query
-- Platform-level settings table (service-role only — no RLS row policy for public access)

CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Platform admins flag on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- Seed defaults (won't overwrite existing)
INSERT INTO platform_settings (key, value) VALUES
  ('ai_provider',          'anthropic'),
  ('voice_provider',       'twilio'),
  ('elevenlabs_voice_id',  'EXAVITQu4vr4xnSDxMaL')
ON CONFLICT (key) DO NOTHING;

-- Make the first registered owner a platform admin (run once after first sign-up)
-- UPDATE profiles SET is_platform_admin = true WHERE role = 'owner' LIMIT 1;
