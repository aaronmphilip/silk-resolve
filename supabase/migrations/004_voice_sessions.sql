-- ============================================================
-- Migration 004: Voice Sessions
-- Run in Supabase SQL Editor
-- ============================================================

-- Add Vapi phone number column to agents (TEXT id matches schema)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twilio_phone TEXT;

-- Add call_sid + tenant_id to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_sid TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Unique index on call_sid for idempotent upserts
CREATE UNIQUE INDEX IF NOT EXISTS calls_call_sid_idx ON calls(call_sid) WHERE call_sid IS NOT NULL;

-- Voice sessions table
-- Note: agent_id and script_id are TEXT (matching agents.id / scripts.id)
--       mesh_profile_id is TEXT (matching mesh_profiles.id)
--       tenant_id is UUID (matching tenants.id)
CREATE TABLE IF NOT EXISTS voice_sessions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid        TEXT    UNIQUE NOT NULL,
  tenant_id       UUID    REFERENCES tenants(id),
  agent_id        TEXT    REFERENCES agents(id),
  script_id       TEXT,
  caller_phone    TEXT    NOT NULL,
  platform_phone  TEXT    NOT NULL,
  mesh_profile_id TEXT,
  messages        JSONB   NOT NULL DEFAULT '[]',
  tension_level   INTEGER NOT NULL DEFAULT 0,
  turn_count      INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'active',
  resolution      TEXT,
  empathy_score   INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS voice_sessions_call_sid_idx    ON voice_sessions(call_sid);
CREATE INDEX IF NOT EXISTS voice_sessions_tenant_idx      ON voice_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS voice_sessions_caller_idx      ON voice_sessions(caller_phone, tenant_id);

-- RLS: webhooks use service role which bypasses RLS — block anon access
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON voice_sessions USING (false);
