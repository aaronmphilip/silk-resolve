-- =============================================================
-- Migration 011: Demo refund workflow persistence
-- Gives the live voice demo a real database-backed refund state
-- and an audit trail of refund actions triggered during calls.
-- =============================================================

CREATE TABLE IF NOT EXISTS demo_refund_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id           TEXT NOT NULL,
  aliases            TEXT[] NOT NULL DEFAULT '{}',
  customer_name      TEXT NOT NULL DEFAULT '',
  phone_last4        TEXT NOT NULL DEFAULT '',
  email              TEXT NOT NULL DEFAULT '',
  item               TEXT NOT NULL DEFAULT '',
  purchased_at       TEXT NOT NULL DEFAULT '',
  delivered_at       TEXT NOT NULL DEFAULT '',
  amount             TEXT NOT NULL DEFAULT '',
  payment_method     TEXT NOT NULL DEFAULT '',
  state              TEXT NOT NULL DEFAULT 'eligible'
    CHECK (state IN ('eligible', 'manual_review', 'already_refunded', 'refund_initiated')),
  refund_window_days INTEGER NOT NULL DEFAULT 7,
  refund_reference   TEXT NOT NULL DEFAULT '',
  refund_reason      TEXT,
  policy_note        TEXT NOT NULL DEFAULT '',
  last_call_sid      TEXT,
  last_action_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, order_id)
);

CREATE TABLE IF NOT EXISTS demo_refund_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id         TEXT NOT NULL,
  call_sid         TEXT,
  action           TEXT NOT NULL,
  resolution       TEXT,
  payload          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demo_refund_orders_tenant_state_idx
  ON demo_refund_orders(tenant_id, state);

CREATE INDEX IF NOT EXISTS demo_refund_events_tenant_created_idx
  ON demo_refund_events(tenant_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER demo_refund_orders_updated_at
    BEFORE UPDATE ON demo_refund_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE demo_refund_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_refund_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON demo_refund_orders;
DROP POLICY IF EXISTS "service role only" ON demo_refund_events;

CREATE POLICY "service role only" ON demo_refund_orders USING (false);
CREATE POLICY "service role only" ON demo_refund_events USING (false);

-- Seed the demo tenant used by testing@example.com.
INSERT INTO demo_refund_orders (
  tenant_id, order_id, aliases, customer_name, phone_last4, email, item,
  purchased_at, delivered_at, amount, payment_method, state, refund_window_days,
  refund_reference, policy_note
) VALUES
  (
    '10000000-0000-0000-0000-000000000002',
    'SR-1001',
    ARRAY['1001', 'MED-1001', 'ORD-1001'],
    'Riya Sharma',
    '4321',
    'riya.sharma@example.com',
    'NoiseBeam Pro headphones',
    'May 18, 2026',
    'May 20, 2026',
    'INR 4,999',
    'UPI ending 1188',
    'eligible',
    7,
    'RF-1001-0524',
    'Unused item inside the 7-day refund window.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'SR-1002',
    ARRAY['1002', 'MED-1002', 'ORD-1002'],
    'Aarav Mehta',
    '7788',
    'aarav.mehta@example.com',
    'TrailStep running shoes',
    'May 4, 2026',
    'May 6, 2026',
    'INR 3,299',
    'Visa ending 2204',
    'manual_review',
    7,
    'RV-1002-0524',
    'Outside the 7-day self-serve refund window, so it needs senior review.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'SR-1003',
    ARRAY['1003', 'MED-1003', 'ORD-1003'],
    'Neha Kapoor',
    '9090',
    'neha.kapoor@example.com',
    'Linen comfort shirt',
    'May 16, 2026',
    'May 18, 2026',
    'INR 1,499',
    'Mastercard ending 5412',
    'already_refunded',
    7,
    'RF-1003-0521',
    'Refund was already issued to the original payment method.'
  )
ON CONFLICT (tenant_id, order_id) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  customer_name = EXCLUDED.customer_name,
  phone_last4 = EXCLUDED.phone_last4,
  email = EXCLUDED.email,
  item = EXCLUDED.item,
  purchased_at = EXCLUDED.purchased_at,
  delivered_at = EXCLUDED.delivered_at,
  amount = EXCLUDED.amount,
  payment_method = EXCLUDED.payment_method,
  refund_window_days = EXCLUDED.refund_window_days,
  refund_reference = EXCLUDED.refund_reference,
  policy_note = EXCLUDED.policy_note;
