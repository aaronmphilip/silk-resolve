-- Run this in Supabase SQL Editor → New Query

-- Add AI provider config to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'anthropic';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_api_key  TEXT;

-- Add escalation email if missing
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS escalation_email TEXT;

-- Index for quick tenant lookup by slug
CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);
