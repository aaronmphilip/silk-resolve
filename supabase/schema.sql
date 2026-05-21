-- ============================================================
-- Silk Resolver — Production Schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT    NOT NULL,
  slug            TEXT    UNIQUE NOT NULL,
  plan            TEXT    NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
  calls_this_month INT    NOT NULL DEFAULT 0,
  call_limit      INT     NOT NULL DEFAULT 5000,
  timezone        TEXT    NOT NULL DEFAULT 'Asia/Kolkata',
  language        TEXT    NOT NULL DEFAULT 'Hinglish (hi-IN / en-IN)',
  escalation_email TEXT,
  industry        TEXT,
  website         TEXT,
  about           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name  TEXT    NOT NULL DEFAULT '',
  last_name   TEXT    NOT NULL DEFAULT '',
  role        TEXT    NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id              TEXT    PRIMARY KEY,
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  client          TEXT    NOT NULL DEFAULT '',
  status          TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('live', 'paused', 'draft', 'error')),
  node_count      INT     NOT NULL DEFAULT 0,
  pillars         TEXT[]  NOT NULL DEFAULT '{}',
  description     TEXT,
  webhook_url     TEXT,
  total_calls     INT     NOT NULL DEFAULT 0,
  calls_today     INT     NOT NULL DEFAULT 0,
  empathy_score   FLOAT   NOT NULL DEFAULT 0,
  avg_handle_time TEXT    NOT NULL DEFAULT '—',
  resolved_rate   FLOAT   NOT NULL DEFAULT 0,
  last_active     TEXT    NOT NULL DEFAULT 'never',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id               TEXT  PRIMARY KEY,
  tenant_id        UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id         TEXT  NOT NULL REFERENCES agents(id),
  agent_name       TEXT  NOT NULL,
  client           TEXT  NOT NULL DEFAULT '',
  duration         TEXT  NOT NULL,
  duration_seconds INT   NOT NULL DEFAULT 0,
  empathy_score    INT   NOT NULL DEFAULT 0,
  outcome          TEXT  NOT NULL CHECK (outcome IN ('resolved', 'escalated', 'abandoned')),
  tags             TEXT[] NOT NULL DEFAULT '{}',
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_analyses (
  call_id          TEXT  PRIMARY KEY REFERENCES calls(id) ON DELETE CASCADE,
  heatmap          JSONB NOT NULL DEFAULT '[]',
  ingress_analysis JSONB NOT NULL DEFAULT '{}',
  mesh_context     JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scripts (
  id               TEXT  PRIMARY KEY,
  tenant_id        UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id         TEXT  NOT NULL REFERENCES agents(id),
  agent_name       TEXT  NOT NULL,
  name             TEXT  NOT NULL,
  version          INT   NOT NULL DEFAULT 1,
  status           TEXT  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  system_prompt    TEXT  NOT NULL DEFAULT '',
  companion_vibe   TEXT  NOT NULL DEFAULT 'professional',
  language         TEXT  NOT NULL DEFAULT 'English (en-IN)',
  preferred_address TEXT NOT NULL DEFAULT 'Sir/Ma''am',
  linguistic_notes TEXT  NOT NULL DEFAULT '',
  tools            JSONB NOT NULL DEFAULT '[]',
  escalation_rules JSONB NOT NULL DEFAULT '[]',
  no_go_topics     TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  id          TEXT  PRIMARY KEY,
  tenant_id   UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT  NOT NULL,
  type        TEXT  NOT NULL CHECK (type IN ('rest_api', 'database', 'crm', 'webhook')),
  status      TEXT  NOT NULL DEFAULT 'untested' CHECK (status IN ('connected', 'error', 'pending', 'untested')),
  base_url    TEXT,
  auth_type   TEXT,
  endpoints   JSONB NOT NULL DEFAULT '[]',
  last_tested TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mesh_profiles (
  id                     TEXT  PRIMARY KEY,
  tenant_id              UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                   TEXT  NOT NULL,
  phone                  TEXT  NOT NULL,
  client                 TEXT,
  total_interactions     INT   NOT NULL DEFAULT 0,
  first_seen             DATE,
  last_seen              DATE,
  emotional_debt_level   TEXT  NOT NULL DEFAULT 'neutral' CHECK (emotional_debt_level IN ('positive', 'neutral', 'negative', 'critical')),
  emotional_debt_score   INT   NOT NULL DEFAULT 0,
  avg_empathy_score      INT   NOT NULL DEFAULT 0,
  last_resolution        TEXT,
  emotional_debt_history JSONB NOT NULL DEFAULT '[]',
  identity_profile       JSONB NOT NULL DEFAULT '{}',
  contextual_anchors     JSONB NOT NULL DEFAULT '[]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_tests (
  id          TEXT  PRIMARY KEY,
  tenant_id   UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT  NOT NULL,
  agent_id    TEXT  REFERENCES agents(id),
  agent_name  TEXT,
  status      TEXT  NOT NULL DEFAULT 'draft' CHECK (status IN ('running', 'completed', 'draft')),
  start_date  DATE,
  end_date    DATE,
  hypothesis  TEXT,
  path_a      JSONB,
  path_b      JSONB,
  winner      TEXT,
  confidence  FLOAT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          TEXT  PRIMARY KEY,
  tenant_id   UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT  NOT NULL,
  prefix      TEXT  NOT NULL,
  key_hash    TEXT  NOT NULL,
  status      TEXT  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id               TEXT  PRIMARY KEY,
  tenant_id        UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url              TEXT  NOT NULL,
  events           TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_delivery    TIMESTAMPTZ,
  delivery_success FLOAT NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agents_tenant     ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_tenant      ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent       ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_timestamp   ON calls(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calls_outcome     ON calls(outcome);
CREATE INDEX IF NOT EXISTS idx_scripts_tenant    ON scripts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scripts_agent     ON scripts(agent_id);
CREATE INDEX IF NOT EXISTS idx_mesh_tenant       ON mesh_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant   ON ab_tests(tenant_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER tenants_updated_at      BEFORE UPDATE ON tenants      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER scripts_updated_at      BEFORE UPDATE ON scripts      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER mesh_profiles_updated_at BEFORE UPDATE ON mesh_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks        ENABLE ROW LEVEL SECURITY;

-- Helper: get the calling user's tenant
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- One policy per table — all ops scoped to caller's tenant
DO $$ BEGIN
  CREATE POLICY tenant_iso ON tenants       FOR ALL USING (id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON profiles      FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON agents        FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON calls         FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON call_analyses FOR ALL USING (EXISTS (SELECT 1 FROM calls WHERE calls.id = call_analyses.call_id AND calls.tenant_id = get_my_tenant_id()));
  CREATE POLICY tenant_iso ON scripts       FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON integrations  FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON mesh_profiles FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON ab_tests      FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON api_keys      FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON webhooks      FOR ALL USING (tenant_id = get_my_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
