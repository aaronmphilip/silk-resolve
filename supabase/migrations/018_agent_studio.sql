-- Agent Studio: publish keys, knowledge base, voice mode

ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_mode TEXT NOT NULL DEFAULT 'silk-mulberry'
  CHECK (voice_mode IN ('silk', 'silk-stream', 'silk-mulberry', 'vapi'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS knowledge_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS agent_publish_keys (
  id          TEXT PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Default',
  prefix      TEXT NOT NULL,
  key_hash    TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'live' CHECK (kind IN ('live', 'test')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_publish_keys_agent ON agent_publish_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_publish_keys_hash ON agent_publish_keys(key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_publish_keys_prefix ON agent_publish_keys(prefix);

CREATE TABLE IF NOT EXISTS agent_documents (
  id          TEXT PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'upload', 'url')),
  status      TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'error')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_documents_agent ON agent_documents(agent_id);

CREATE TABLE IF NOT EXISTS agent_knowledge_chunks (
  id          TEXT PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES agent_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content     TEXT NOT NULL,
  token_estimate INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_chunks_agent ON agent_knowledge_chunks(agent_id);

ALTER TABLE agent_publish_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tenant_iso ON agent_publish_keys FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON agent_documents FOR ALL USING (tenant_id = get_my_tenant_id());
  CREATE POLICY tenant_iso ON agent_knowledge_chunks FOR ALL USING (tenant_id = get_my_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;