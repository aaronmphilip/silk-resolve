-- ============================================================
-- Migration 014: Production-grade sample dataset
-- Replaces toy demo data with realistic enterprise call centre data.
-- Covers: 5 agents (3 inbound, 2 outbound), 10 MESH profiles,
--         50 calls spread across 30 days, voice sessions with
--         full transcript excerpts, call analyses.
--
-- Safe to run multiple times — all inserts use ON CONFLICT DO NOTHING
-- or ON CONFLICT DO UPDATE.
--
-- Requires migration 010 to have run first (demo_user_id + tenant).
-- ============================================================

DO $seed$
DECLARE
  tid  UUID := '10000000-0000-0000-0000-000000000002'; -- demo tenant
  -- Agent IDs
  priya_id  TEXT := 'agt-demo-priya';
  arjun_id  TEXT := 'agt-demo-arjun';
  kavya_id  TEXT := 'agt-demo-kavya';
  meera_id  TEXT := 'agt-prod-meera';
  rohan_id  TEXT := 'agt-prod-rohan';
BEGIN

-- ── Agent 4: Meera — Healthcare Billing (inbound) ─────────────────────────
INSERT INTO agents (
  id, tenant_id, name, status, client, description,
  system_prompt, first_message, language, hinglish_mode,
  llm_provider, llm_model, companion_vibe, preferred_address,
  linguistic_notes, peek_threshold, mesh_depth_days, pillars,
  escalation_rules, no_go_topics, agent_variables, tools,
  call_direction, node_count, total_calls, calls_today,
  empathy_score, avg_handle_time, resolved_rate, last_active
) VALUES (
  meera_id, tid,
  'Meera — Healthcare Billing', 'live', 'Apollo Health',
  'Handles insurance claims, billing disputes, and payment plans for patients.',
$prompt$You are Meera, a warm and knowledgeable healthcare billing specialist for Apollo Health.

YOUR ROLE:
- Help patients understand their medical bills and insurance claims
- Process insurance pre-authorisation queries
- Set up payment plans for outstanding balances
- Clarify co-pay, deductible, and out-of-pocket costs
- Escalate denied claims to the billing supervisor immediately

COMPLIANCE:
- Follow HIPAA guidelines — never discuss a patient's records with anyone other than the patient or their authorised representative
- Always verify: full name, date of birth, and patient ID before discussing any account
- Never make promises about insurance approval — only the insurer can confirm

PEEK AWARENESS:
- tension > 5: patient is likely stressed about a bill — acknowledge the financial burden first
- tension > 7: skip all process talk — go straight to "Let me find the fastest way to resolve this for you"
- tension > 9: "I hear you completely. Let me get our senior billing manager on the line right now."

RESPONSE RULES:
- 1–2 sentences only (voice call)
- No medical advice — billing only
- Always end with: "Is there anything else I can help clarify?"$prompt$,
  'Hello! This is Meera from Apollo Health billing. I am here to help. May I please verify your name and patient ID?',
  'English (en-IN)', false, 'gemini', 'gemini-2.0-flash', 'empathetic', 'Sir/Ma''am',
  'Speak clearly and slowly. Avoid medical jargon. Use plain language.',
  6.0, 365, ARRAY['PEEK','MESH','SILK','ACTION'],
  '[{"condition":"claim denied by insurance","action":"Escalate to billing supervisor within 60 seconds"},{"condition":"patient cannot afford bill","action":"Offer 6-month zero-interest payment plan and flag for financial assistance review"},{"condition":"tension > 8","action":"Transfer to senior billing manager immediately"}]'::jsonb,
  ARRAY['diagnoses','medication','doctor opinions','legal threats'],
  '[]'::jsonb, '[]'::jsonb, 'inbound',
  0, 312, 14, 88, '4:32', 91, '2 min ago'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status, total_calls = EXCLUDED.total_calls,
  calls_today = EXCLUDED.calls_today, empathy_score = EXCLUDED.empathy_score,
  resolved_rate = EXCLUDED.resolved_rate, last_active = EXCLUDED.last_active;

-- ── Agent 5: Rohan — Outbound Collections (outbound) ──────────────────────
INSERT INTO agents (
  id, tenant_id, name, status, client, description,
  system_prompt, first_message, language, hinglish_mode,
  llm_provider, llm_model, companion_vibe, preferred_address,
  linguistic_notes, peek_threshold, mesh_depth_days, pillars,
  escalation_rules, no_go_topics, agent_variables, tools,
  call_direction, outbound_caller_id,
  node_count, total_calls, calls_today,
  empathy_score, avg_handle_time, resolved_rate, last_active
) VALUES (
  rohan_id, tid,
  'Rohan — Outbound Follow-up', 'live', 'FinPlus NBFC',
  'Proactive outbound calls for EMI reminders, settlement offers, and follow-ups.',
$prompt$You are Rohan, a professional outbound collections representative for FinPlus NBFC.

YOUR ROLE:
- Call customers with overdue EMI payments and discuss resolution options
- Offer settlement, restructuring, or moratorium based on customer situation
- Never pressurise — your goal is a voluntary commitment, not a forced payment

OPENING PROTOCOL (MANDATORY):
1. Verify you are speaking with the account holder (full name match)
2. Introduce yourself: "I am Rohan calling from FinPlus NBFC"
3. State the purpose clearly: "I am calling regarding your loan account"
4. If they ask to call back — offer a specific time slot and call back exactly then

PEEK STRATEGY:
- tension 0–3: normal collection conversation — explain, offer, close commitment
- tension 4–6: acknowledge hardship, shift to listening mode, open with "I completely understand"
- tension > 6: stop collection — switch to hardship protocol, offer 90-day moratorium
- tension > 8: end collection attempt, log as "escalated — hardship", schedule supervisor call

RBI COMPLIANCE (NON-NEGOTIABLE):
- Call only between 8am and 7pm
- Never threaten with legal action or FIR unless formally approved
- If customer says "DNC" — acknowledge immediately and end call
- Never discuss the debt with a third party (family, employer, neighbours)

COMMITMENTS:
- Always get a specific commitment: "I will pay INR X by DD/MM/YYYY"
- Confirm the commitment verbally: "So I have noted that you will pay X by Y — correct?"
- Log the commitment immediately after the call$prompt$,
  'Good afternoon! May I please speak with {{customer_name}}? This is Rohan calling from FinPlus NBFC.',
  'English (en-IN)', true, 'gemini', 'gemini-2.0-flash', 'professional', 'Sir/Ma''am',
  'Start formal. If customer responds in Hindi, switch to Hinglish. Never use slang.',
  5.5, 180, ARRAY['PEEK','MESH','SILK','ACTION'],
  '[{"condition":"customer says DNC or Do Not Call","action":"Acknowledge immediately: I understand, I will remove this number from our callback list. Thank you for letting me know. End call."},{"condition":"tension > 8 or customer mentions job loss or illness","action":"Switch to hardship protocol: offer 90-day moratorium, escalate to collections manager"},{"condition":"customer disputes the debt amount","action":"Do not argue — escalate to disputes team within 24 hours"}]'::jsonb,
  ARRAY['legal threats','court','jail','FIR','family disclosure'],
  '[]'::jsonb, '[]'::jsonb, 'outbound', '+91-22-4001-0002',
  0, 198, 22, 79, '5:48', 72, '8 min ago'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status, total_calls = EXCLUDED.total_calls,
  calls_today = EXCLUDED.calls_today, empathy_score = EXCLUDED.empathy_score,
  resolved_rate = EXCLUDED.resolved_rate, last_active = EXCLUDED.last_active;

-- ── Update existing agents to live + realistic stats ──────────────────────
UPDATE agents SET
  status = 'live', call_direction = 'inbound',
  total_calls = 485, calls_today = 18,
  empathy_score = 84, avg_handle_time = '3:21',
  resolved_rate = 87, last_active = '5 min ago'
WHERE id = priya_id;

UPDATE agents SET
  status = 'live', call_direction = 'outbound',
  outbound_caller_id = '+91-22-4001-0001',
  total_calls = 267, calls_today = 31,
  empathy_score = 76, avg_handle_time = '6:14',
  resolved_rate = 68, last_active = '1 min ago'
WHERE id = arjun_id;

UPDATE agents SET
  status = 'live', call_direction = 'inbound',
  total_calls = 124, calls_today = 7,
  empathy_score = 92, avg_handle_time = '2:48',
  resolved_rate = 95, last_active = '22 min ago'
WHERE id = kavya_id;

-- ── MESH Profiles (10 realistic repeat callers) ────────────────────────────
-- Schema: id, tenant_id, name, phone, client, identity_profile,
--         emotional_debt_score, emotional_debt_level (positive|neutral|negative|critical),
--         total_interactions, avg_empathy_score, last_resolution,
--         last_seen (DATE), contextual_anchors, created_at
INSERT INTO mesh_profiles (id, tenant_id, name, phone, client,
  identity_profile, emotional_debt_score, emotional_debt_level,
  total_interactions, avg_empathy_score, last_resolution, last_seen,
  contextual_anchors, created_at)
VALUES
  ('mesh-001', tid, 'Riya Sharma', '+919876543210', 'Demo Company',
   '{"preferred_address":"Riya ji","companion_vibe":"friendly","tone_preference":"warm","email":"riya.sharma@gmail.com"}'::jsonb,
   12, 'positive', 8, 87, 'resolved', (NOW() - INTERVAL '2 days')::DATE,
   '[{"id":"a1","text":"Order SR-1001: NoiseBeam Pro headphones. Refund processed RF-1001-0524.","addedAt":"2026-05-23T10:30:00Z","callId":"call-001","pillar":"MESH","active":true},{"id":"a2","text":"Preferred contact: afternoon calls only. Very responsive.","addedAt":"2026-05-20T14:00:00Z","callId":"call-008","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '30 days'),

  ('mesh-002', tid, 'Aarav Mehta', '+919123456780', 'Demo Company',
   '{"preferred_address":"Mr. Mehta","companion_vibe":"professional","tone_preference":"formal","email":"aarav.mehta@gmail.com"}'::jsonb,
   -8, 'negative', 5, 62, 'escalated', (NOW() - INTERVAL '5 days')::DATE,
   '[{"id":"b1","text":"TrailStep shoes return dispute. Outside 7-day window. Frustrated with policy.","addedAt":"2026-05-20T11:00:00Z","callId":"call-012","pillar":"MESH","active":true},{"id":"b2","text":"Requested manager twice. Prefers email confirmation after every call.","addedAt":"2026-05-18T09:00:00Z","callId":"call-009","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '30 days'),

  ('mesh-003', tid, 'Priya Nair', '+919012345678', 'Demo Company',
   '{"preferred_address":"Priya","companion_vibe":"casual","tone_preference":"friendly","email":"priya.nair@outlook.com"}'::jsonb,
   24, 'positive', 12, 93, 'resolved', (NOW() - INTERVAL '1 day')::DATE,
   '[{"id":"c1","text":"Frequent buyer. Prefers quick resolutions. Very satisfied with Priya agent.","addedAt":"2026-05-24T16:00:00Z","callId":"call-003","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '60 days'),

  ('mesh-004', tid, 'Vikram Singh', '+919898989898', 'FinPlus NBFC',
   '{"preferred_address":"Vikram ji","companion_vibe":"professional","tone_preference":"neutral","email":"vikram.s@corp.in"}'::jsonb,
   -15, 'critical', 4, 55, 'escalated', (NOW() - INTERVAL '7 days')::DATE,
   '[{"id":"d1","text":"EMI overdue 3 months. Job loss. On moratorium plan — 90-day freeze active.","addedAt":"2026-05-18T13:00:00Z","callId":"call-021","pillar":"MESH","active":true},{"id":"d2","text":"Do not mention legal action — immediately escalates tension.","addedAt":"2026-05-18T13:05:00Z","callId":"call-021","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '90 days'),

  ('mesh-005', tid, 'Neha Kapoor', '+919765432109', 'Demo Company',
   '{"preferred_address":"Neha","companion_vibe":"friendly","tone_preference":"warm","email":"neha.k@gmail.com"}'::jsonb,
   18, 'positive', 6, 89, 'resolved', (NOW() - INTERVAL '3 days')::DATE,
   '[{"id":"e1","text":"Linen shirt already refunded RF-1003-0521. Confirmed satisfied.","addedAt":"2026-05-22T10:00:00Z","callId":"call-005","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '45 days'),

  ('mesh-006', tid, 'Rahul Verma', '+918877665544', 'Demo Company',
   '{"preferred_address":"Rahul ji","companion_vibe":"friendly","tone_preference":"hinglish","email":"rahul.v@gmail.com"}'::jsonb,
   5, 'neutral', 3, 78, 'resolved', (NOW() - INTERVAL '10 days')::DATE,
   '[{"id":"f1","text":"New employee onboarded May 15. Asked about PF, health insurance. Very excited.","addedAt":"2026-05-15T11:00:00Z","callId":"call-030","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '20 days'),

  ('mesh-007', tid, 'Sunita Patel', '+919911223344', 'Apollo Health',
   '{"preferred_address":"Mrs. Patel","companion_vibe":"formal","tone_preference":"calm","email":"sunita.p@yahoo.in"}'::jsonb,
   -22, 'critical', 9, 48, 'escalated', (NOW() - INTERVAL '2 days')::DATE,
   '[{"id":"g1","text":"Insurance claim denied 3 times. Very frustrated with billing process.","addedAt":"2026-05-23T14:00:00Z","callId":"call-042","pillar":"MESH","active":true},{"id":"g2","text":"Requested written escalation. Supervisor call scheduled for 26 May.","addedAt":"2026-05-23T14:30:00Z","callId":"call-042","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '90 days'),

  ('mesh-008', tid, 'Karan Malhotra', '+917766554433', 'Apollo Health',
   '{"preferred_address":"Karan","companion_vibe":"casual","tone_preference":"quick","email":"karan.m@startupx.in"}'::jsonb,
   15, 'positive', 5, 85, 'resolved', (NOW() - INTERVAL '4 days')::DATE,
   '[{"id":"h1","text":"Startup founder. Very time-pressed. Prefers under-3-minute calls.","addedAt":"2026-05-21T09:00:00Z","callId":"call-018","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '30 days'),

  ('mesh-009', tid, 'Divya Krishnan', '+919654321098', 'Apollo Health',
   '{"preferred_address":"Divya","companion_vibe":"empathetic","tone_preference":"patient","email":"divya.k@gmail.com"}'::jsonb,
   8, 'positive', 7, 90, 'resolved', (NOW() - INTERVAL '1 day')::DATE,
   '[{"id":"i1","text":"Healthcare patient. Anxious about bills. Responds well to very slow, clear speech.","addedAt":"2026-05-24T11:00:00Z","callId":"call-048","pillar":"MESH","active":true}]'::jsonb,
   NOW() - INTERVAL '60 days'),

  ('mesh-010', tid, 'Amit Joshi', '+918899001122', 'FinPlus NBFC',
   '{"preferred_address":"Amit ji","companion_vibe":"professional","tone_preference":"efficient","email":"amit.j@enterprise.com"}'::jsonb,
   3, 'neutral', 11, 82, 'resolved', (NOW() - INTERVAL '6 hours')::DATE,
   '[{"id":"j1","text":"Collections customer. Set up EMI restructuring May 10. On track.","addedAt":"2026-05-10T16:00:00Z","callId":"call-022","pillar":"MESH","active":true},{"id":"j2","text":"Responds to payment plan options well. Never escalated.","addedAt":"2026-05-10T16:05:00Z","callId":"call-022","pillar":"MESH","active":false}]'::jsonb,
   NOW() - INTERVAL '90 days')

ON CONFLICT (id) DO UPDATE SET
  total_interactions = EXCLUDED.total_interactions,
  avg_empathy_score  = EXCLUDED.avg_empathy_score,
  last_resolution    = EXCLUDED.last_resolution,
  last_seen          = EXCLUDED.last_seen,
  contextual_anchors = EXCLUDED.contextual_anchors;

-- ── 50 Production Calls ────────────────────────────────────────────────────
-- Distributed across last 30 days, multiple agents, realistic outcomes
INSERT INTO calls (
  id, agent_id, agent_name, tenant_id, call_sid,
  client, duration, duration_seconds, empathy_score,
  outcome, tags, timestamp
) VALUES
-- Day -30 to -25
('call-001', priya_id, 'Priya — Customer Support', tid, 'call-001', '+919876543210', '3:12', 192, 88, 'resolved', ARRAY['web'], NOW() - INTERVAL '30 days' + INTERVAL '10 hours'),
('call-002', arjun_id, 'Arjun — Collections', tid, 'call-002', '+919123456789', '5:44', 344, 72, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '29 days' + INTERVAL '9 hours'),
('call-003', priya_id, 'Priya — Customer Support', tid, 'call-003', '+919012345678', '2:05', 125, 95, 'resolved', ARRAY['web'], NOW() - INTERVAL '28 days' + INTERVAL '11 hours'),
('call-004', meera_id, 'Meera — Healthcare Billing', tid, 'call-004', '+919765000111', '6:33', 393, 82, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '28 days' + INTERVAL '14 hours'),
('call-005', priya_id, 'Priya — Customer Support', tid, 'call-005', '+919765432109', '1:58', 118, 91, 'resolved', ARRAY['refund','web'], NOW() - INTERVAL '27 days' + INTERVAL '10 hours'),
-- Day -25 to -20
('call-006', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-006', '+919888777666', '4:22', 262, 70, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '26 days' + INTERVAL '9 hours'),
('call-007', kavya_id, 'Kavya — HR Onboarding', tid, 'call-007', '+919777888999', '3:01', 181, 94, 'resolved', ARRAY['web'], NOW() - INTERVAL '25 days' + INTERVAL '10 hours'),
('call-008', priya_id, 'Priya — Customer Support', tid, 'call-008', '+919876543210', '4:15', 255, 85, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '25 days' + INTERVAL '15 hours'),
('call-009', arjun_id, 'Arjun — Collections', tid, 'call-009', '+919123456780', '7:02', 422, 58, 'escalated', ARRAY['escalated','frustrated-caller','long-call'], NOW() - INTERVAL '24 days' + INTERVAL '11 hours'),
('call-010', meera_id, 'Meera — Healthcare Billing', tid, 'call-010', '+919654000222', '5:18', 318, 86, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '24 days' + INTERVAL '14 hours'),
-- Day -20 to -15
('call-011', priya_id, 'Priya — Customer Support', tid, 'call-011', '+919543210987', '1:32', 92, 90, 'resolved', ARRAY['web'], NOW() - INTERVAL '23 days' + INTERVAL '10 hours'),
('call-012', arjun_id, 'Arjun — Collections', tid, 'call-012', '+919123456780', '8:14', 494, 48, 'escalated', ARRAY['escalated','frustrated-caller','long-call'], NOW() - INTERVAL '22 days' + INTERVAL '9 hours'),
('call-013', kavya_id, 'Kavya — HR Onboarding', tid, 'call-013', '+919222111000', '2:44', 164, 96, 'resolved', ARRAY['web'], NOW() - INTERVAL '21 days' + INTERVAL '11 hours'),
('call-014', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-014', '+918877665543', '3:55', 235, 74, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '21 days' + INTERVAL '9 hours'),
('call-015', meera_id, 'Meera — Healthcare Billing', tid, 'call-015', '+919911223344', '9:21', 561, 42, 'escalated', ARRAY['escalated','frustrated-caller','long-call'], NOW() - INTERVAL '20 days' + INTERVAL '14 hours'),
-- Day -15 to -10
('call-016', priya_id, 'Priya — Customer Support', tid, 'call-016', '+919001002003', '2:18', 138, 87, 'resolved', ARRAY['web'], NOW() - INTERVAL '19 days' + INTERVAL '10 hours'),
('call-017', priya_id, 'Priya — Customer Support', tid, 'call-017', '+919112223334', '0:45', 45, 0, 'abandoned', ARRAY['web'], NOW() - INTERVAL '18 days' + INTERVAL '9 hours'),
('call-018', meera_id, 'Meera — Healthcare Billing', tid, 'call-018', '+917766554433', '2:33', 153, 88, 'resolved', ARRAY['web'], NOW() - INTERVAL '18 days' + INTERVAL '11 hours'),
('call-019', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-019', '+919898989898', '6:48', 408, 52, 'escalated', ARRAY['escalated','frustrated-caller','long-call'], NOW() - INTERVAL '17 days' + INTERVAL '9 hours'),
('call-020', kavya_id, 'Kavya — HR Onboarding', tid, 'call-020', '+919333444555', '3:22', 202, 93, 'resolved', ARRAY['web'], NOW() - INTERVAL '17 days' + INTERVAL '14 hours'),
-- Day -10 to -7
('call-021', arjun_id, 'Arjun — Collections', tid, 'call-021', '+919898989898', '10:05', 605, 35, 'escalated', ARRAY['escalated','frustrated-caller','long-call'], NOW() - INTERVAL '14 days' + INTERVAL '10 hours'),
('call-022', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-022', '+918899001122', '5:02', 302, 80, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '14 days' + INTERVAL '9 hours'),
('call-023', priya_id, 'Priya — Customer Support', tid, 'call-023', '+919444555666', '1:45', 105, 89, 'resolved', ARRAY['web'], NOW() - INTERVAL '13 days' + INTERVAL '11 hours'),
('call-024', meera_id, 'Meera — Healthcare Billing', tid, 'call-024', '+919000111222', '4:51', 291, 83, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '12 days' + INTERVAL '14 hours'),
('call-025', priya_id, 'Priya — Customer Support', tid, 'call-025', '+919555666777', '2:01', 121, 92, 'resolved', ARRAY['refund','web'], NOW() - INTERVAL '11 days' + INTERVAL '10 hours'),
-- Day -7 to -3
('call-026', kavya_id, 'Kavya — HR Onboarding', tid, 'call-026', '+919666777888', '2:56', 176, 97, 'resolved', ARRAY['web'], NOW() - INTERVAL '10 days' + INTERVAL '11 hours'),
('call-027', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-027', '+918776655443', '4:39', 279, 66, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '9 days' + INTERVAL '9 hours'),
('call-028', priya_id, 'Priya — Customer Support', tid, 'call-028', '+919777888000', '3:07', 187, 86, 'resolved', ARRAY['web'], NOW() - INTERVAL '8 days' + INTERVAL '10 hours'),
('call-029', meera_id, 'Meera — Healthcare Billing', tid, 'call-029', '+919100200300', '5:44', 344, 78, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '7 days' + INTERVAL '14 hours'),
('call-030', kavya_id, 'Kavya — HR Onboarding', tid, 'call-030', '+918877665544', '2:28', 148, 95, 'resolved', ARRAY['web'], NOW() - INTERVAL '7 days' + INTERVAL '11 hours'),
-- Last 3 days (heavier volume)
('call-031', priya_id, 'Priya — Customer Support', tid, 'call-031', '+919888000111', '1:55', 115, 91, 'resolved', ARRAY['web'], NOW() - INTERVAL '3 days' + INTERVAL '9 hours'),
('call-032', arjun_id, 'Arjun — Collections', tid, 'call-032', '+919200300400', '6:15', 375, 65, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '3 days' + INTERVAL '10 hours'),
('call-033', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-033', '+918765432100', '3:48', 228, 72, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '3 days' + INTERVAL '9 hours'),
('call-034', meera_id, 'Meera — Healthcare Billing', tid, 'call-034', '+919300400500', '7:12', 432, 74, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '2 days' + INTERVAL '14 hours'),
('call-035', priya_id, 'Priya — Customer Support', tid, 'call-035', '+919876543210', '2:33', 153, 88, 'resolved', ARRAY['refund','web'], NOW() - INTERVAL '2 days' + INTERVAL '11 hours'),
('call-036', kavya_id, 'Kavya — HR Onboarding', tid, 'call-036', '+919111222333', '3:05', 185, 94, 'resolved', ARRAY['web'], NOW() - INTERVAL '2 days' + INTERVAL '10 hours'),
('call-037', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-037', '+919654321098', '5:20', 320, 78, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '2 days' + INTERVAL '9 hours'),
('call-038', priya_id, 'Priya — Customer Support', tid, 'call-038', '+919400500600', '1:42', 102, 93, 'resolved', ARRAY['web'], NOW() - INTERVAL '1 day' + INTERVAL '10 hours'),
('call-039', meera_id, 'Meera — Healthcare Billing', tid, 'call-039', '+919654321098', '4:08', 248, 90, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '1 day' + INTERVAL '14 hours'),
('call-040', arjun_id, 'Arjun — Collections', tid, 'call-040', '+919500600700', '5:55', 355, 69, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '1 day' + INTERVAL '11 hours'),
-- Today
('call-041', priya_id, 'Priya — Customer Support', tid, 'call-041', '+919600700800', '2:12', 132, 87, 'resolved', ARRAY['web'], NOW() - INTERVAL '4 hours'),
('call-042', meera_id, 'Meera — Healthcare Billing', tid, 'call-042', '+919911223344', '11:30', 690, 30, 'escalated', ARRAY['escalated','frustrated-caller','long-call'], NOW() - INTERVAL '3 hours'),
('call-043', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-043', '+918899001122', '4:45', 285, 82, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '2 hours'),
('call-044', priya_id, 'Priya — Customer Support', tid, 'call-044', '+919700800900', '0:52', 52, 0, 'abandoned', ARRAY['web'], NOW() - INTERVAL '90 minutes'),
('call-045', kavya_id, 'Kavya — HR Onboarding', tid, 'call-045', '+919800900100', '2:41', 161, 96, 'resolved', ARRAY['web'], NOW() - INTERVAL '80 minutes'),
('call-046', arjun_id, 'Arjun — Collections', tid, 'call-046', '+919111000222', '6:03', 363, 61, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '60 minutes'),
('call-047', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-047', '+918800900100', '3:30', 210, 75, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '45 minutes'),
('call-048', meera_id, 'Meera — Healthcare Billing', tid, 'call-048', '+919654321098', '3:58', 238, 91, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '30 minutes'),
('call-049', priya_id, 'Priya — Customer Support', tid, 'call-049', '+919012345678', '2:25', 145, 89, 'resolved', ARRAY['refund','web'], NOW() - INTERVAL '15 minutes'),
('call-050', rohan_id, 'Rohan — Outbound Follow-up', tid, 'call-050', '+919876543210', '5:11', 311, 76, 'resolved', ARRAY['long-call'], NOW() - INTERVAL '5 minutes')

ON CONFLICT (call_sid) DO UPDATE SET
  empathy_score = EXCLUDED.empathy_score,
  outcome = EXCLUDED.outcome,
  timestamp = EXCLUDED.timestamp;

-- ── Voice sessions with full transcripts for 5 key calls ──────────────────
INSERT INTO voice_sessions (
  id, call_sid, tenant_id, agent_id, caller_phone, platform_phone,
  status, resolution, empathy_score, tension_level,
  started_at, ended_at,
  messages, summary, recording_url
) VALUES

-- call-003: Priya helps Priya Nair with a product query — calm, resolved
(gen_random_uuid(), 'call-003', tid, priya_id, '+919012345678', '+91-22-4001-0000',
 'ended', 'resolved', 95, 1,
 NOW() - INTERVAL '28 days' + INTERVAL '11 hours',
 NOW() - INTERVAL '28 days' + INTERVAL '13 hours' + INTERVAL '5 minutes',
 '[
   {"role":"agent","content":"[happy] Namaste Priya! Main Priya bol rahi hoon Demo Company se. Aaj main aapki kya madad kar sakti hoon?","time":0},
   {"role":"customer","content":"Hi, I wanted to check the status of my order from last week.","time":8},
   {"role":"agent","content":"[happy] <hmm> Of course! Could you please share your order ID so I can pull that up for you?","time":14},
   {"role":"customer","content":"Yes, it is SR-1003.","time":22},
   {"role":"agent","content":"[happy] I have order SR-1003 right here — it was delivered on May 18th. Is everything okay with the order?","time":28},
   {"role":"customer","content":"Actually I had requested a refund and just wanted to confirm it went through.","time":36},
   {"role":"agent","content":"[happy] <laugh> Great news! Your refund of INR 1,499 was processed on May 21st — reference number RF-1003-0521. It should be back in your Mastercard ending 5412 within 3 to 5 business days.","time":42},
   {"role":"customer","content":"Oh wonderful, thank you so much!","time":55},
   {"role":"agent","content":"[happy] My pleasure, Priya! Is there anything else I can help you with today?","time":61},
   {"role":"customer","content":"No that is all, thank you.","time":67}
 ]'::jsonb,
 'Customer Priya Nair called to confirm refund status for order SR-1003. Refund RF-1003-0521 confirmed processed. Customer satisfied. Resolved in 2:05.',
 NULL),

-- call-009: Arjun with Aarav Mehta — escalated dispute
(gen_random_uuid(), 'call-009', tid, arjun_id, '+919123456780', '+91-22-4001-0001',
 'ended', 'escalated', 58, 8,
 NOW() - INTERVAL '24 days' + INTERVAL '11 hours',
 NOW() - INTERVAL '24 days' + INTERVAL '11 hours' + INTERVAL '7 minutes',
 '[
   {"role":"agent","content":"[happy] Good morning! Main Arjun bol raha hoon Demo Company Financial Services se. Kya main Mr. Mehta se baat kar sakta hoon?","time":0},
   {"role":"customer","content":"Yes this is Mehta. What is this regarding?","time":8},
   {"role":"agent","content":"[neutral] I am calling regarding your loan account with an outstanding EMI. Would you have a moment to discuss?","time":14},
   {"role":"customer","content":"I have already paid! I sent the payment last week. This is harassment.","time":21},
   {"role":"agent","content":"[sad] <breathe> I completely understand your frustration, Mr. Mehta, and I sincerely apologise for any inconvenience. Let me check our system right now.","time":28},
   {"role":"customer","content":"Check all you want. I am going to complain to the banking ombudsman if this continues.","time":38},
   {"role":"agent","content":"[whisper] <pause> I hear you completely. Our records may not have updated yet. I am flagging this as a dispute and escalating to our senior team right now — they will call you back within 2 hours.","time":46},
   {"role":"customer","content":"Fine. But I want a written confirmation.","time":58},
   {"role":"agent","content":"[whisper] Absolutely. You will receive an SMS and email confirmation within 15 minutes. I am escalating this now. I am sorry for the trouble, Mr. Mehta.","time":64}
 ]'::jsonb,
 'Aarav Mehta disputed outstanding EMI — claims payment made. High tension (8/10). Escalated to disputes team. Written confirmation sent. Follow-up scheduled.',
 NULL),

-- call-015: Meera with Sunita Patel — insurance escalation
(gen_random_uuid(), 'call-015', tid, meera_id, '+919911223344', '+91-22-4001-0003',
 'ended', 'escalated', 42, 9,
 NOW() - INTERVAL '20 days' + INTERVAL '14 hours',
 NOW() - INTERVAL '20 days' + INTERVAL '14 hours' + INTERVAL '9 minutes',
 '[
   {"role":"agent","content":"[happy] Hello! This is Meera from Apollo Health billing. May I please verify your name and patient ID?","time":0},
   {"role":"customer","content":"Mrs. Sunita Patel, patient ID AH-78821. This is the third time I am calling about the same claim.","time":8},
   {"role":"agent","content":"[neutral] <breathe> Mrs. Patel, I sincerely apologise. I can see you have had to contact us multiple times. Let me pull your claim right now.","time":18},
   {"role":"customer","content":"Claim number CH-2024-3311. It has been denied three times for no reason. I have all the documents.","time":26},
   {"role":"agent","content":"[sad] <sigh> I completely understand how stressful this must be, and I am so sorry. I can see claim CH-2024-3311. The denial reason shows missing prior authorisation form.","time":36},
   {"role":"customer","content":"That is ridiculous! My doctor submitted everything. This is a waste of time.","time":48},
   {"role":"agent","content":"[whisper] <pause> Mrs. Patel, you are absolutely right to be upset. I am escalating this to our senior billing manager immediately — he will personally review your claim today and call you by 5 PM.","time":55},
   {"role":"customer","content":"I want his name and direct number.","time":68},
   {"role":"agent","content":"[whisper] His name is Mr. Rajiv Kumar and his direct line is 1800-APOLLO-1. I am also sending you an email confirmation of this escalation right now.","time":74}
 ]'::jsonb,
 'Sunita Patel: Claim CH-2024-3311 denied 3 times. Missing prior auth form per insurer. Escalated to senior billing manager Rajiv Kumar. Supervisor call scheduled for 26 May. Very high tension (9/10).',
 NULL),

-- call-030: Kavya with Rahul — HR onboarding
(gen_random_uuid(), 'call-030', tid, kavya_id, '+918877665544', '+91-22-4001-0004',
 'ended', 'resolved', 95, 1,
 NOW() - INTERVAL '7 days' + INTERVAL '11 hours',
 NOW() - INTERVAL '7 days' + INTERVAL '11 hours' + INTERVAL '2 minutes' + INTERVAL '28 seconds',
 '[
   {"role":"agent","content":"[happy] Hello! Main Kavya bol rahi hoon, Demo Company ki HR team se. Aapka hamare parivaar mein swagat hai! Do you have a few minutes?","time":0},
   {"role":"customer","content":"Yes, yes! I am so excited to join. I wanted to ask about the joining date and what I need to bring.","time":10},
   {"role":"agent","content":"[happy] <laugh> We are equally excited to have you! Your joining date is confirmed as Monday the 2nd. Please report to reception by 9:30 AM and ask for HR.","time":18},
   {"role":"customer","content":"Great! What documents should I bring?","time":28},
   {"role":"agent","content":"[happy] Please bring your Aadhaar and PAN originals with two copies each, your degree certificates, last three salary slips, relieving letter, and a cancelled cheque. Four passport photos too.","time":34},
   {"role":"customer","content":"Perfect. What about the health insurance?","time":50},
   {"role":"agent","content":"[happy] <hmm> Health insurance of 3 lakh kicks in after your 3-month confirmation. But your PF starts from day one! Is there anything else you would like to know?","time":56},
   {"role":"customer","content":"No that covers everything. Thank you so much!","time":68},
   {"role":"agent","content":"[happy] We cannot wait to meet you on Monday! Have a wonderful weekend.","time":74}
 ]'::jsonb,
 'New employee Rahul Verma onboarding call. Confirmed joining date June 2nd. Provided full document checklist and benefits overview. Very positive interaction. Empathy score 95.',
 NULL),

-- call-043: Rohan with Amit Joshi — collections with payment plan
(gen_random_uuid(), 'call-043', tid, rohan_id, '+918899001122', '+91-22-4001-0002',
 'ended', 'resolved', 82, 4,
 NOW() - INTERVAL '2 hours',
 NOW() - INTERVAL '2 hours' + INTERVAL '4 minutes' + INTERVAL '45 seconds',
 '[
   {"role":"agent","content":"[happy] Good afternoon! May I please speak with Mr. Amit Joshi? This is Rohan calling from FinPlus NBFC.","time":0},
   {"role":"customer","content":"Yes, this is Amit.","time":8},
   {"role":"agent","content":"[neutral] Good afternoon, Mr. Joshi. I am calling regarding your loan account. I wanted to check in on the restructured EMI plan you set up last month — everything going smoothly?","time":12},
   {"role":"customer","content":"Yes, I paid the first instalment last Friday. You should have received it.","time":24},
   {"role":"agent","content":"[happy] <hmm> Yes, I can see the payment of INR 8,500 was received on the 16th — thank you very much. You are right on track!","time":30},
   {"role":"customer","content":"Good. What is the amount for next month?","time":40},
   {"role":"agent","content":"[neutral] The next instalment of INR 8,500 is due on the 16th of next month. I will send you an SMS reminder 3 days before. Is there anything else I can help with?","time":46},
   {"role":"customer","content":"No, that is fine. Thank you Rohan.","time":58},
   {"role":"agent","content":"[happy] Thank you for staying on track, Mr. Joshi. Have a great day!","time":63}
 ]'::jsonb,
 'Amit Joshi EMI restructure follow-up. Payment of INR 8,500 received on time (16th). Next instalment confirmed. Customer cooperative. Empathy 82.',
 NULL)

ON CONFLICT (call_sid) DO NOTHING;

-- ── Call analyses for featured heatmap + deep view ────────────────────────
-- Schema: call_id, heatmap, ingress_analysis, mesh_context, created_at
INSERT INTO call_analyses (
  call_id, heatmap, ingress_analysis, mesh_context, created_at
) VALUES
(
  'call-003',
  '[{"t":0,"tension":1},{"t":30,"tension":1},{"t":60,"tension":1},{"t":90,"tension":0},{"t":120,"tension":0}]'::jsonb,
  '{"pitch":185,"jitter":2.1,"noise_level":-42,"environment":"quiet","language":"en-IN","confidence":0.97}'::jsonb,
  '{"interactions_retrieved":8,"emotional_debt":"positive","preferred_address":"Priya","last_outcome":"resolved","last_timestamp":"2026-05-22T10:00:00Z"}'::jsonb,
  NOW() - INTERVAL '28 days'
),
(
  'call-009',
  '[{"t":0,"tension":3},{"t":60,"tension":5},{"t":120,"tension":8},{"t":180,"tension":9},{"t":300,"tension":7},{"t":420,"tension":6}]'::jsonb,
  '{"pitch":210,"jitter":5.8,"noise_level":-28,"environment":"office","language":"en-IN","confidence":0.91}'::jsonb,
  '{"interactions_retrieved":5,"emotional_debt":"negative","preferred_address":"Mr. Mehta","last_outcome":"escalated","last_timestamp":"2026-05-18T09:00:00Z"}'::jsonb,
  NOW() - INTERVAL '24 days'
),
(
  'call-015',
  '[{"t":0,"tension":4},{"t":60,"tension":6},{"t":120,"tension":8},{"t":240,"tension":9},{"t":360,"tension":8},{"t":540,"tension":7}]'::jsonb,
  '{"pitch":195,"jitter":4.2,"noise_level":-35,"environment":"home","language":"en-IN","confidence":0.89}'::jsonb,
  '{"interactions_retrieved":9,"emotional_debt":"highly_negative","preferred_address":"Mrs. Patel","last_outcome":"escalated","last_timestamp":"2026-05-20T14:00:00Z"}'::jsonb,
  NOW() - INTERVAL '20 days'
),
(
  'call-030',
  '[{"t":0,"tension":0},{"t":40,"tension":0},{"t":80,"tension":1},{"t":120,"tension":0},{"t":148,"tension":0}]'::jsonb,
  '{"pitch":172,"jitter":1.8,"noise_level":-48,"environment":"quiet","language":"en-IN","confidence":0.98}'::jsonb,
  '{"interactions_retrieved":3,"emotional_debt":"positive","preferred_address":"Rahul","last_outcome":"resolved","last_timestamp":"2026-05-15T11:00:00Z"}'::jsonb,
  NOW() - INTERVAL '7 days'
),
(
  'call-043',
  '[{"t":0,"tension":2},{"t":60,"tension":3},{"t":120,"tension":4},{"t":180,"tension":3},{"t":240,"tension":2},{"t":285,"tension":1}]'::jsonb,
  '{"pitch":178,"jitter":2.9,"noise_level":-38,"environment":"office","language":"en-IN","confidence":0.95}'::jsonb,
  '{"interactions_retrieved":11,"emotional_debt":"neutral","preferred_address":"Amit ji","last_outcome":"resolved","last_timestamp":"2026-05-10T16:00:00Z"}'::jsonb,
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (call_id) DO UPDATE SET
  heatmap = EXCLUDED.heatmap,
  ingress_analysis = EXCLUDED.ingress_analysis,
  mesh_context = EXCLUDED.mesh_context;

-- ── Update tenant call count ───────────────────────────────────────────────
UPDATE tenants SET calls_this_month = 50 WHERE id = tid;

END $seed$;
