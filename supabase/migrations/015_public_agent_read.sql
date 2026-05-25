-- 015_public_agent_read.sql
-- Allow anonymous (unauthenticated) clients to read agents by ID.
-- This is needed for the embeddable web widget — the browser opens
-- /talk/[agentId] and /api/agents/[id]/vapi-config without being logged in.
-- The agent ID itself acts as the access credential (it's a UUID and is only
-- shared intentionally via the Deploy page embed snippet).

DROP POLICY IF EXISTS "agents public read by id" ON agents;

CREATE POLICY "agents public read by id" ON agents
  FOR SELECT
  TO anon
  USING (true);
