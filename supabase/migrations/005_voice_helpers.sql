-- ============================================================
-- Migration 005: Voice Helper Functions
-- Run AFTER 004_voice_sessions.sql
-- ============================================================

-- ── RPC: increment MESH emotional debt score ─────────────────────────────────
-- mesh_profiles.id is TEXT
CREATE OR REPLACE FUNCTION increment_mesh_debt(profile_id TEXT, delta INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE mesh_profiles
  SET
    emotional_debt_score = GREATEST(-100, LEAST(100, emotional_debt_score + delta)),
    emotional_debt_level = CASE
      WHEN emotional_debt_score + delta >= 30   THEN 'positive'
      WHEN emotional_debt_score + delta >= -10  THEN 'neutral'
      WHEN emotional_debt_score + delta >= -40  THEN 'negative'
      ELSE 'critical'
    END
  WHERE id = profile_id;
END;
$$;

-- ── RPC: increment MESH interaction count ────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_mesh_interactions(profile_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE mesh_profiles
  SET
    total_interactions = total_interactions + 1,
    last_seen          = NOW()
  WHERE id = profile_id;
END;
$$;

-- ── RPC: increment tenant calls_this_month ───────────────────────────────────
-- tenants.id is UUID
CREATE OR REPLACE FUNCTION increment_tenant_calls(tenant_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE tenants
  SET calls_this_month = calls_this_month + 1
  WHERE id = tenant_id;
END;
$$;

-- ── Auto-create MESH profile on first call from unknown number ───────────────
-- Uses gen_random_uuid()::text for TEXT primary key
CREATE OR REPLACE FUNCTION create_mesh_profile_if_missing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_profile_id TEXT;
BEGIN
  IF NEW.mesh_profile_id IS NULL AND NEW.caller_phone IS NOT NULL THEN
    -- Check if profile already exists for this phone + tenant
    SELECT id INTO new_profile_id
    FROM mesh_profiles
    WHERE phone = NEW.caller_phone
      AND tenant_id = NEW.tenant_id
    LIMIT 1;

    -- Create if not found
    IF new_profile_id IS NULL THEN
      new_profile_id := gen_random_uuid()::text;
      INSERT INTO mesh_profiles (
        id, tenant_id, phone, name, client,
        emotional_debt_score, emotional_debt_level,
        total_interactions, first_seen, last_seen,
        identity_profile, contextual_anchors, emotional_debt_history
      ) VALUES (
        new_profile_id,
        NEW.tenant_id,
        NEW.caller_phone,
        'Unknown Caller',
        NEW.caller_phone,
        0, 'neutral',
        0,
        NOW()::date, NOW()::date,
        '{"companion_vibe": "professional", "preferred_address": "ji", "language": "en-IN", "linguistic_notes": ""}'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb
      );
    END IF;

    -- Link profile to session
    UPDATE voice_sessions
    SET mesh_profile_id = new_profile_id
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_mesh_profile ON voice_sessions;
CREATE TRIGGER auto_mesh_profile
  AFTER INSERT ON voice_sessions
  FOR EACH ROW EXECUTE FUNCTION create_mesh_profile_if_missing();

-- ── Extra indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS mesh_profiles_phone_tenant_idx
  ON mesh_profiles(phone, tenant_id);

CREATE INDEX IF NOT EXISTS calls_tenant_timestamp_idx
  ON calls(tenant_id, timestamp DESC);
