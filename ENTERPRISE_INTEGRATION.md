# Enterprise Database Integration Guide
**Silk Resolver — How to connect your company's data so the AI can do real work**

---

## The Core Idea

Standard voice bots read from a static knowledge base — FAQs, scripts, pre-written responses. When the customer asks something that requires looking at their actual account, the bot breaks.

Silk Resolver works differently. Your agent calls your live database mid-conversation, in real time. When a patient says "I've been waiting for my report for 4 days," the agent doesn't guess — it calls `get_report_status("APL-2847")`, gets the real status, and speaks the truth.

This is done through **tool calling** — a standard feature of modern LLMs where the AI can invoke a defined function, receive the result, and continue the conversation.

---

## How It Works — The Full Cycle

```
Customer speaks
      ↓
Silk hears: "I need the status of my refund for booking PNR-8821"
      ↓
LLM decides: I should call lookup_booking("PNR-8821")
      ↓
Silk calls your API: GET https://api.yourcompany.com/bookings/PNR-8821
      ↓
Your system returns:
  {
    "pnr": "PNR-8821",
    "passenger": "Priya Venkataraman",
    "status": "refund_processing",
    "estimated_credit": "2026-05-24",
    "amount": 4200
  }
      ↓
LLM receives result, continues conversation:
  "Your refund of ₹4,200 is being processed and should
   reflect by 24th May. I've also sent a confirmation SMS."
      ↓
Customer hears a real, accurate answer in <500ms
```

---

## Integration Types

### 1. REST API (Most Common)

**What it is:** You expose HTTP endpoints that Silk can call.

**Requirements:**
- HTTPS endpoint
- Bearer token or API key auth
- Response in JSON
- P99 latency under 300ms (to keep the conversation flowing)

**Setup:**
```
Base URL:     https://api.yourcompany.com/silk/v1
Auth type:    Bearer
Token:        sk_live_xxxxxxxxxxxxxxxx

Endpoints:
  GET  /customers/{phone}           → lookup_customer
  GET  /orders/{order_id}           → get_order_status
  POST /orders/{order_id}/refund    → process_refund
  POST /queue/escalate              → escalate_priority
```

**What Silk does:** Maps each endpoint to a named tool. The LLM sees `lookup_customer(phone)` — not your URL. If your API changes, just update the mapping — the agent prompt stays the same.

---

### 2. Database (Read-Only Replica)

**What it is:** You give Silk a read-only connection to a replica of your database.

**Recommended setup:**
- PostgreSQL or MySQL read replica (never point to primary)
- VPN tunnel or private IP — never expose to public internet
- Scoped user with SELECT-only permissions on specific tables
- Row-level security if multi-tenant

**Connection string format:**
```
postgresql://silk_readonly:password@replica.internal:5432/yourdb
```

**Example queries Silk will run:**
```sql
-- lookup_customer
SELECT id, name, email, account_status, tier
FROM customers WHERE phone = $1 LIMIT 1;

-- get_recent_orders
SELECT id, status, amount, created_at
FROM orders WHERE customer_id = $1
ORDER BY created_at DESC LIMIT 5;
```

**Security:** We run parameterised queries only. No dynamic SQL. We log every query with timestamp, customer_id, and agent_id. You get a full audit trail.

---

### 3. CRM Integration (Salesforce / Zoho / HubSpot)

**What it is:** We connect to your CRM via their official API or OAuth2.

**Salesforce example:**
```
Auth:      OAuth2 (Connected App)
Scopes:    api, refresh_token
Objects:   Contact, Case, Order (read + specified write)
```

**What maps to what:**
```
Salesforce Contact.lookup()  →  lookup_customer(phone)
Salesforce Case.create()     →  log_complaint(customer_id, description)
Salesforce Order.query()     →  get_order_status(order_id)
```

We use Salesforce's standard REST API — no custom Apex required.

---

### 4. Webhook Push (Real-Time Context)

**What it is:** Before a call connects, your system pushes customer context to Silk.

**When to use:** When your data isn't easily queryable mid-call but you can push it at call-start. Example: IVR identifies the customer by phone number before routing to Silk.

**Payload format:**
```json
{
  "phone": "+91 98201 44382",
  "customer": {
    "id": "CUST-4421",
    "name": "Rajesh Iyer",
    "tier": "premium",
    "account_status": "active"
  },
  "context": {
    "last_interaction": "2026-03-14",
    "open_issues": ["RPT-8821 - report delayed"],
    "preferred_language": "hi-IN",
    "notes": "High sensitivity. Has escalated before."
  }
}
```

Silk loads this context into MESH before the first word is spoken. The agent already knows who they're talking to.

---

## What Actions the AI Can Take (Write Operations)

Read-only integrations are safe by default. For write operations — refunds, fee waivers, rebooking — you explicitly whitelist each action in your agent script.

**Whitelist example in script:**
```
TOOLS ENABLED:
✓ lookup_customer      (read)
✓ get_order_status     (read)
✓ process_refund       (WRITE — max ₹10,000 per call, requires customer OTP)
✓ escalate_to_human    (built-in)
✗ delete_account       (not whitelisted)
✗ modify_personal_data (not whitelisted)
```

**Every write action logs:**
- Timestamp
- Agent ID
- Customer ID
- What was changed
- Call recording reference

You get a full audit trail of every action your AI took.

---

## Security Architecture

```
Your Database / CRM
        ↑  (private network / VPN)
   Silk Integration Layer
        ↑  (encrypted, auth-gated)
   Agent Tool Call
        ↑  (LLM function calling)
   Silk LLM Core
```

**Key principles:**

| What | How |
|------|-----|
| Credentials storage | AES-256 encrypted at rest, never in prompts |
| Data in transit | TLS 1.3 minimum |
| Data retention | Call context cleared after call ends. Not stored in training data. |
| Multi-tenancy | Each tenant's integration runs in isolated execution context. No cross-tenant access. |
| Audit logging | Every tool call logged with full trace. Available via dashboard or API. |
| IP allowlisting | You can restrict Silk's outbound IPs to a known range for firewall rules |

---

## Latency Targets

The AI can't pause mid-sentence to wait 3 seconds for your API. Here's what we need:

| Operation | Max latency (P95) |
|-----------|-------------------|
| Customer lookup | 150ms |
| Order/record status | 200ms |
| Write action (refund, etc.) | 500ms |
| Queue/priority update | 300ms |

If your system can't meet these, we'll discuss caching strategies or pre-fetching at call-start.

---

## Step-by-Step: Connect Your First Integration

**Step 1 — Map your endpoints**

Answer these questions:
- What does the agent need to look up? (customer record, order status, account balance)
- What actions should it be allowed to take? (refund, reschedule, waive fee)
- What should it never touch? (payment info, personal data, other customers)

**Step 2 — Build or expose the endpoints**

If you have an existing API: check if it meets the latency and auth requirements.
If not: build a thin facade layer — 3-4 endpoints that return exactly what Silk needs. Don't expose your entire internal API.

**Minimal facade example:**
```typescript
// What Silk actually calls — not your entire API
GET  /silk/customer?phone={phone}     → { id, name, tier, last_issue }
GET  /silk/order?id={order_id}        → { status, eta, amount }
POST /silk/refund                     → { success, reference_id }
POST /silk/escalate                   → { ticket_id, assigned_to }
```

**Step 3 — Add to Silk dashboard**

Go to Integrations → Add Integration → paste your base URL and auth token → map each endpoint to a tool name → Test Connection.

**Step 4 — Enable tools in your script**

Go to Scripts → your agent → Tools tab → toggle on the tools from your integration.

**Step 5 — Activate and test**

Use Observer to watch a live test call. You'll see exactly which tools fired, what they returned, and how the agent used the data.

---

## FAQ

**Q: Can Silk access our production database directly?**
No. We recommend a read-only replica. For writes, use explicit API endpoints that go through your own business logic layer — so your rules, validations, and rate limits apply.

**Q: What if our API is slow?**
We'll pre-fetch critical data at call-start (when we know who's calling) and cache it for the duration of the call. This covers 80% of lookups. Only edge-case queries happen mid-conversation.

**Q: What data does Silk store?**
Call metadata (duration, outcome, empathy score) is stored in your Silk dashboard. Customer data retrieved from your APIs is used for the duration of the call and not persisted on our servers. You own your data.

**Q: Can we see every tool call the AI made?**
Yes. Every tool call — what was called, when, what it returned — is logged and visible in the call detail page on your dashboard.

**Q: What if our integration goes down?**
If a tool call fails, the agent gracefully falls back: "Let me pull that up for you — there seems to be a brief delay in our system. Could you hold for just a moment?" It retries once, then escalates to human if needed.

---

## Contact

For integration support, architecture review, or to discuss a non-standard data source:

**Technical Integration:** integrations@silkresolver.com
**Security Review:** security@silkresolver.com
**Enterprise Onboarding:** enterprise@silkresolver.com

---

*Silk Resolver — Level 3 Autonomous Voice Infrastructure*
*This document is confidential and intended for enterprise integration teams.*
