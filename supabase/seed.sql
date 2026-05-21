-- ============================================================
-- Silk Resolver — Demo Seed Data
-- Run AFTER schema.sql. Creates a demo tenant + all mock data.
-- Usage: paste in Supabase SQL Editor
-- ============================================================

-- 1. Create demo tenant
INSERT INTO tenants (id, name, slug, plan, calls_this_month, call_limit, timezone, language, escalation_email, industry)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Apollo Healthcare',
  'apollo',
  'enterprise',
  12847,
  50000,
  'Asia/Kolkata',
  'Hinglish (hi-IN / en-IN)',
  'ops@apollo.com',
  'Healthcare'
) ON CONFLICT (id) DO NOTHING;

-- NOTE: profiles must reference a real auth.users row.
-- After you register via /register, run this to seed agent + call data under your account:
-- UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE id = auth.uid();

-- 2. Agents
INSERT INTO agents (id, tenant_id, name, client, status, node_count, pillars, description, webhook_url, total_calls, calls_today, empathy_score, avg_handle_time, resolved_rate, last_active) VALUES
('agt-001', '00000000-0000-0000-0000-000000000001', 'MedCore Billing', 'Apollo Healthcare', 'live', 7, ARRAY['PEEK','MESH','SILK','ACTION'], 'Handles billing disputes, report delays, and payment queries for Apollo patients.', 'https://apollo.internal/silk/billing-callback', 4821, 234, 93.2, '2m 41s', 94.7, '2 min ago'),
('agt-002', '00000000-0000-0000-0000-000000000001', 'FlightCare Resolution', 'AirIndia Express', 'live', 9, ARRAY['PEEK','MESH','SILK','ACTION'], 'Manages rebooking, refunds, and compensation for AirIndia Express routes.', 'https://airindiaexpress.in/silk/resolve', 8102, 412, 89.7, '3m 02s', 91.3, '5 min ago'),
('agt-003', '00000000-0000-0000-0000-000000000001', 'BankResolve Premier', 'Kotak Mahindra', 'live', 6, ARRAY['PEEK','MESH','SILK','ACTION'], 'Automates dispute resolution and fee waivers for Kotak Premier customers.', 'https://kotak.com/api/silk', 3201, 201, 94.1, '2m 18s', 96.2, '12 min ago'),
('agt-004', '00000000-0000-0000-0000-000000000001', 'RetailCare Returns', 'Myntra Enterprise', 'paused', 5, ARRAY['PEEK','SILK','ACTION'], 'Handles return requests, refund status, and exchange workflows for Myntra.', NULL, 1089, 0, 87.3, '2m 05s', 89.4, '2 days ago'),
('agt-005', '00000000-0000-0000-0000-000000000001', 'EduSupport Admissions', 'IIM Ahmedabad', 'draft', 4, ARRAY['PEEK','SILK'], 'Admission enquiry resolution for IIMA PGP applicants. In development.', NULL, 0, 0, 0, '—', 0, 'never')
ON CONFLICT (id) DO NOTHING;

-- 3. Calls (15 records)
INSERT INTO calls (id, tenant_id, agent_id, agent_name, client, duration, duration_seconds, empathy_score, outcome, tags, timestamp) VALUES
('SR-2841','00000000-0000-0000-0000-000000000001','agt-001','MedCore Billing','Apollo Healthcare','3m 12s',192,96,'resolved',ARRAY['<apologetic_whisper>','queue_skip'],'2026-05-21 14:32:10+05:30'),
('SR-2840','00000000-0000-0000-0000-000000000001','agt-003','BankResolve Premier','Kotak Mahindra','1m 47s',107,88,'resolved',ARRAY['mesh_recall','<warm>'],'2026-05-21 14:29:44+05:30'),
('SR-2839','00000000-0000-0000-0000-000000000001','agt-002','FlightCare Resolution','AirIndia Express','4m 01s',241,94,'resolved',ARRAY['peek_escalation','rebook'],'2026-05-21 14:27:02+05:30'),
('SR-2838','00000000-0000-0000-0000-000000000001','agt-001','MedCore Billing','Apollo Healthcare','2m 58s',178,79,'escalated',ARRAY['<frustrated>','human_handoff'],'2026-05-21 14:21:18+05:30'),
('SR-2837','00000000-0000-0000-0000-000000000001','agt-004','RetailCare Returns','Myntra Enterprise','2m 05s',125,91,'resolved',ARRAY['refund_triggered'],'2026-05-21 14:15:33+05:30'),
('SR-2836','00000000-0000-0000-0000-000000000001','agt-003','BankResolve Premier','Kotak Mahindra','1m 22s',82,97,'resolved',ARRAY['<warm>','balance_check'],'2026-05-21 14:10:55+05:30'),
('SR-2835','00000000-0000-0000-0000-000000000001','agt-002','FlightCare Resolution','AirIndia Express','5m 44s',344,72,'escalated',ARRAY['peak_frustration','human_handoff','<distressed>'],'2026-05-21 14:04:11+05:30'),
('SR-2834','00000000-0000-0000-0000-000000000001','agt-001','MedCore Billing','Apollo Healthcare','2m 31s',151,93,'resolved',ARRAY['mesh_recall','<empathetic>'],'2026-05-21 13:58:47+05:30'),
('SR-2833','00000000-0000-0000-0000-000000000001','agt-003','BankResolve Premier','Kotak Mahindra','3m 17s',197,89,'resolved',ARRAY['fraud_check','<calm>'],'2026-05-21 13:51:22+05:30'),
('SR-2832','00000000-0000-0000-0000-000000000001','agt-002','FlightCare Resolution','AirIndia Express','1m 58s',118,95,'resolved',ARRAY['<warm_closing>','upgrade_offered'],'2026-05-21 13:44:09+05:30'),
('SR-2831','00000000-0000-0000-0000-000000000001','agt-001','MedCore Billing','Apollo Healthcare','0m 47s',47,0,'abandoned',ARRAY['early_disconnect'],'2026-05-21 13:39:55+05:30'),
('SR-2830','00000000-0000-0000-0000-000000000001','agt-003','BankResolve Premier','Kotak Mahindra','2m 44s',164,98,'resolved',ARRAY['mesh_recall','<apologetic_whisper>','fee_waived'],'2026-05-21 13:32:18+05:30'),
('SR-2829','00000000-0000-0000-0000-000000000001','agt-002','FlightCare Resolution','AirIndia Express','3m 33s',213,87,'resolved',ARRAY['peek_detect','compensation_issued'],'2026-05-21 13:25:41+05:30'),
('SR-2828','00000000-0000-0000-0000-000000000001','agt-001','MedCore Billing','Apollo Healthcare','1m 19s',79,92,'resolved',ARRAY['<warm>','report_dispatched'],'2026-05-21 13:18:07+05:30'),
('SR-2827','00000000-0000-0000-0000-000000000001','agt-003','BankResolve Premier','Kotak Mahindra','4m 02s',242,83,'escalated',ARRAY['complex_dispute','human_handoff'],'2026-05-21 13:11:50+05:30')
ON CONFLICT (id) DO NOTHING;

-- 4. Call Analyses
INSERT INTO call_analyses (call_id, heatmap, ingress_analysis, mesh_context) VALUES
('SR-2841',
  '[{"t":0,"tension":38,"empathy":0},{"t":4,"tension":82,"empathy":14,"event":"PEEK","eventLabel":"tension 6.2/10"},{"t":8,"tension":85,"empathy":28,"event":"MESH","eventLabel":"delay_march_2026"},{"t":13,"tension":88,"empathy":38,"event":"PEEK","eventLabel":"URGENT 8.5/10"},{"t":16,"tension":72,"empathy":54,"event":"SILK","eventLabel":"<apologetic_whisper>"},{"t":19,"tension":58,"empathy":67,"event":"MESH","eventLabel":"empathy_boost +15%"},{"t":23,"tension":42,"empathy":78,"event":"ACTION","eventLabel":"queue: 47→1"},{"t":27,"tension":30,"empathy":87,"event":"SILK","eventLabel":"<warm>"},{"t":32,"tension":20,"empathy":93},{"t":38,"tension":14,"empathy":96,"event":"SILK","eventLabel":"<warm_closing>"},{"t":45,"tension":10,"empathy":96}]',
  '{"pitch":187,"jitter":4.2,"noise_level":28,"environment":"hospital","language":"Hinglish (hi-IN / en-IN)","confidence":0.94}',
  '{"interactions_retrieved":3,"emotional_debt":"Report delayed 3 months ago. High sensitivity flag active.","preferred_address":"Sir","last_outcome":"escalated","last_timestamp":"2026-03-14 11:22:05"}'
),
('SR-2839',
  '[{"t":0,"tension":42,"empathy":0},{"t":6,"tension":76,"empathy":20,"event":"PEEK","eventLabel":"tension 7.1/10"},{"t":11,"tension":80,"empathy":34,"event":"MESH","eventLabel":"prev_flight_delay"},{"t":18,"tension":65,"empathy":52,"event":"SILK","eventLabel":"<empathetic>"},{"t":24,"tension":48,"empathy":68,"event":"ACTION","eventLabel":"rebook_initiated"},{"t":31,"tension":30,"empathy":84},{"t":38,"tension":18,"empathy":93,"event":"SILK","eventLabel":"<warm_closing>"},{"t":45,"tension":12,"empathy":94}]',
  '{"pitch":204,"jitter":6.1,"noise_level":52,"environment":"noisy_market","language":"Hindi (hi-IN)","confidence":0.88}',
  '{"interactions_retrieved":5,"emotional_debt":"Two prior flight cancellations. Priority tier: Gold.","preferred_address":"Bhaiya","last_outcome":"escalated","last_timestamp":"2026-04-02 08:41:18"}'
),
('SR-2835',
  '[{"t":0,"tension":55,"empathy":0},{"t":3,"tension":90,"empathy":8,"event":"PEEK","eventLabel":"tension 9.1/10"},{"t":9,"tension":92,"empathy":20,"event":"MESH","eventLabel":"3 prior escalations"},{"t":15,"tension":88,"empathy":30,"event":"SILK","eventLabel":"<apologetic_whisper>"},{"t":22,"tension":85,"empathy":42},{"t":30,"tension":80,"empathy":52},{"t":38,"tension":75,"empathy":58,"event":"ACTION","eventLabel":"human_handoff"},{"t":45,"tension":72,"empathy":60}]',
  '{"pitch":228,"jitter":11.4,"noise_level":61,"environment":"vehicle","language":"English (en-IN)","confidence":0.79}',
  '{"interactions_retrieved":7,"emotional_debt":"Critical: 3 unresolved escalations. Human priority flag.","preferred_address":"Sir","last_outcome":"escalated","last_timestamp":"2026-05-19 14:02:44"}'
)
ON CONFLICT (call_id) DO NOTHING;
