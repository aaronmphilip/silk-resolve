-- Migration 006: Agent Builder columns
-- Adds all the fields needed for the full agent editor

ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt     TEXT    NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS first_message     TEXT    NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS language          TEXT    NOT NULL DEFAULT 'English (en-IN)';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS hinglish_mode     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS llm_provider      TEXT    NOT NULL DEFAULT 'anthropic';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS llm_model         TEXT    NOT NULL DEFAULT 'claude-sonnet-4-5';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS companion_vibe    TEXT    NOT NULL DEFAULT 'professional';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS preferred_address TEXT    NOT NULL DEFAULT 'Sir/Ma''am';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS linguistic_notes  TEXT    NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS peek_threshold    FLOAT   NOT NULL DEFAULT 6.5;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS mesh_depth_days   INT     NOT NULL DEFAULT 180;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS silk_voice_id     TEXT    NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_variables   JSONB   NOT NULL DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tools             JSONB   NOT NULL DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS escalation_rules  JSONB   NOT NULL DEFAULT '[]';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS no_go_topics      TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twilio_phone      TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Auto-update updated_at
DO $$ BEGIN
  CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill pillars to always include PEEK+MESH+SILK+ACTION for existing agents
UPDATE agents SET pillars = ARRAY['PEEK','MESH','SILK','ACTION']
WHERE pillars IS NULL OR array_length(pillars, 1) IS NULL;
