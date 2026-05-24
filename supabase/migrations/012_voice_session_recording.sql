-- ============================================================
-- Migration 012: Add recording_url to voice_sessions
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- Recording URL from Vapi end-of-call-report
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Summary text from Vapi analysis
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
