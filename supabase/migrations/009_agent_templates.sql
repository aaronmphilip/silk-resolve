-- Migration 009: Agent Templates
-- Platform-wide templates that tenants can use as starting points when creating agents.
-- Run in Supabase SQL Editor → New Query

CREATE TABLE IF NOT EXISTS agent_templates (
  id              TEXT        PRIMARY KEY DEFAULT 'tmpl-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  name            TEXT        NOT NULL,
  description     TEXT        NOT NULL DEFAULT '',
  industry        TEXT        NOT NULL DEFAULT 'general',
  system_prompt   TEXT        NOT NULL DEFAULT '',
  first_message   TEXT        NOT NULL DEFAULT '',
  llm_model       TEXT        NOT NULL DEFAULT 'grok-4',
  companion_vibe  TEXT        NOT NULL DEFAULT 'professional',
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agent_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER agent_templates_updated_at
    BEFORE UPDATE ON agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_agent_template_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: service role only (admin manages these, tenants read via separate policy)
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;

-- Tenants can read active templates
CREATE POLICY "tenants can read active templates"
  ON agent_templates FOR SELECT
  USING (is_active = true);

-- Only service role writes (no direct client insert/update — goes through API)

-- Seed a few starter templates
INSERT INTO agent_templates (name, description, industry, system_prompt, first_message, companion_vibe, tags)
VALUES
  (
    'Customer Support',
    'Handles general customer queries, returns, and complaints with empathy.',
    'retail',
    'You are a helpful customer support agent. Be empathetic, concise, and solution-focused. Always acknowledge the customer''s frustration before offering a solution. Escalate if tension exceeds threshold.',
    'Hi there! Thanks for calling. How can I help you today?',
    'friendly',
    ARRAY['support', 'retail', 'general']
  ),
  (
    'Debt Collections',
    'Recovers outstanding balances professionally while maintaining compliance.',
    'finance',
    'You are a professional collections agent. Be respectful and firm. Remind customers of their outstanding balance and offer payment plan options. Never threaten or use aggressive language. Follow all compliance guidelines.',
    'Good day! I''m calling regarding your account. Could I please speak with you for a moment?',
    'professional',
    ARRAY['collections', 'finance', 'compliance']
  ),
  (
    'HR Onboarding',
    'Walks new employees through onboarding paperwork and first-day information.',
    'hr',
    'You are an HR onboarding assistant. Be warm, welcoming, and informative. Guide the new employee through each step clearly. Answer questions about benefits, policies, and first-day logistics.',
    'Welcome to the team! I''m here to help you get settled in. Shall we walk through your onboarding?',
    'friendly',
    ARRAY['hr', 'onboarding', 'internal']
  )
ON CONFLICT (id) DO NOTHING;
