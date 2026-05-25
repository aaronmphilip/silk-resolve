-- ============================================================
-- Migration 013: Call direction (inbound / outbound) on agents
-- + outbound phone number
-- Safe to run multiple times (IF NOT EXISTS guards)
-- ============================================================

-- Direction: inbound = customer calls the number, outbound = agent dials out
ALTER TABLE agents ADD COLUMN IF NOT EXISTS call_direction TEXT NOT NULL DEFAULT 'inbound'
  CHECK (call_direction IN ('inbound', 'outbound', 'both'));

-- The Vapi phone number attached to this agent for inbound routing
ALTER TABLE agents ADD COLUMN IF NOT EXISTS vapi_phone_number TEXT;

-- For outbound: caller ID phone to present when dialling
ALTER TABLE agents ADD COLUMN IF NOT EXISTS outbound_caller_id TEXT;

-- For outbound: the list endpoint or CRM contact list URL
ALTER TABLE agents ADD COLUMN IF NOT EXISTS outbound_list_url TEXT;

-- Index for querying by direction
CREATE INDEX IF NOT EXISTS agents_direction_tenant_idx ON agents(call_direction, tenant_id);

-- Update existing agents to mark them as inbound (default behaviour)
UPDATE agents SET call_direction = 'inbound' WHERE call_direction IS NULL;
