-- ============================================================
-- Migration 007: Multi-tenant RLS + Platform Settings Security
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- ── 1. Helper function: get current user's tenant_id ─────────────────────────
-- Used in RLS policies. Falls back to NULL if no profile exists.
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── 2. platform_settings — service role ONLY, zero public access ─────────────
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Drop any old policies
DROP POLICY IF EXISTS "service role only" ON platform_settings;
DROP POLICY IF EXISTS "admins can read" ON platform_settings;
DROP POLICY IF EXISTS "admins can write" ON platform_settings;

-- Block ALL authenticated + anon access. Only service_role bypasses RLS.
CREATE POLICY "no public access" ON platform_settings
  USING (false)
  WITH CHECK (false);

-- ── 3. tenants — users can only see their own tenant ─────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant isolation read" ON tenants;
DROP POLICY IF EXISTS "tenant isolation write" ON tenants;

CREATE POLICY "tenant isolation read" ON tenants
  FOR SELECT USING (id = get_my_tenant_id());

CREATE POLICY "tenant isolation write" ON tenants
  FOR UPDATE USING (id = get_my_tenant_id());

-- ── 4. profiles — users can only see their own profile ───────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own profile only" ON profiles;

CREATE POLICY "own profile only" ON profiles
  FOR ALL USING (id = auth.uid());

-- ── 5. agents — scoped to tenant ─────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents tenant isolation" ON agents;

CREATE POLICY "agents tenant isolation" ON agents
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- ── 6. calls — scoped to tenant ──────────────────────────────────────────────
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calls tenant isolation" ON calls;

CREATE POLICY "calls tenant isolation" ON calls
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- ── 7. voice_sessions — service role only (webhooks write, dashboard reads via service role) ──
-- Already has a blocking policy from 004, but let's make it explicit
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON voice_sessions;

CREATE POLICY "service role only" ON voice_sessions
  USING (false)
  WITH CHECK (false);

-- ── 8. mesh_profiles — scoped to tenant ──────────────────────────────────────
ALTER TABLE mesh_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mesh tenant isolation" ON mesh_profiles;

CREATE POLICY "mesh tenant isolation" ON mesh_profiles
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- ── 9. scripts — scoped to tenant ────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scripts') THEN
    ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "scripts tenant isolation" ON scripts;
    EXECUTE $policy$
      CREATE POLICY "scripts tenant isolation" ON scripts
        FOR ALL USING (tenant_id = get_my_tenant_id())
    $policy$;
  END IF;
END $$;

-- ── 10. Indexes for RLS performance ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS agents_tenant_id_idx       ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS calls_tenant_id_idx        ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS mesh_profiles_tenant_id_idx ON mesh_profiles(tenant_id);

-- ── 11. Make yourself platform admin (run once after first sign-up) ───────────
-- Replace with your actual email:
-- UPDATE profiles SET is_platform_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'roniron121999@gmail.com');

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running this migration:
-- 1. Each tenant's users ONLY see their own agents, calls, and mesh profiles
-- 2. platform_settings are invisible to all browser clients (service role only)
-- 3. Run the UPDATE above to give yourself platform admin access
