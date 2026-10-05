# TheraFlow OS — Strategic Acquirer Handoff Guide

> **Asset Status:** Turnkey Behavioral Health Frontend & Clinical Workflow Engine  
> **Environment:** Evaluation / Synthetic Data Mode (Zero Real-Patient PHI Ingestion)  
> **Target Buyer:** Behavioral Health EHR, Practice Management, Clinical Scribe, or Healthtech Acquirer  

---

## 1. Executive Summary & Asset Deliverables

When an acquirer licenses or buys TheraFlow OS, they receive an enterprise-grade, high-polish clinical frontend and workflow engine that eliminates **6 to 12 months** of specialized behavioral health product design, clinical workflow engineering, and UI architecture.

### What the Buyer Receives:
1. **Complete Clean TypeScript/React 19 Codebase**:
   - 4 interlocking clinical applications (TheraFlow EHR, Clinical AI Scribe v2, Aura Clinical Copilot, HIPAA PHI Scrubber).
   - Full billing suite (CMS-1500 interactive editor, 837P EDI generator, 277CA claim scrubber, Superbill generator).
   - Telehealth suite with WebRTC media controls, session timer, and CPT 90834/90837 billing crosswalk.
2. **Production Database & Persistence Assets**:
   - Multi-tenant PostgreSQL 15 / Supabase migration schema (`supabase/migrations/20261005_init_schema.sql`).
   - Strict Row-Level Security (RLS) policies enforcing multi-site group practice data isolation.
   - Durable append-only cryptographic audit logger (`server.ts` + `data/audit_ledger.jsonl`).
3. **Clinical AI & Privacy Subsystems**:
   - Client-side 18-rule HIPAA Safe Harbor de-identification engine (`src/tools/phi-scrubber/`).
   - Fail-closed PHI Privacy Gateway (`phi-privacy-gateway.ts`) intercepting outbound LLM payloads.
   - Dual-channel ambient speech diarization abstraction with live WebSpeech API provider and Deepgram WebSocket contracts.
4. **Validation Corpora & Test Suites**:
   - 12 automated test suites encompassing **510 unit/integration tests**.
   - 87/87 adversarial Tier 5 security test cases.
   - Independent 610-snippet / 3,410-entity Safe Harbor holdout validation benchmark.
5. **Interactive Demonstration Framework**:
   - Integrated buyer demo guide tour (`DemoGuideModal.tsx`) populated with 100% realistic synthetic clinical scenarios.

---

## 2. What Works Immediately (Out of the Box)

Without configuring any third-party paid accounts or external vendor APIs, an acquirer's engineering team can clone, run `npm install`, `npm run dev`, and immediately evaluate:

| Subsystem | Immediate Out-of-the-Box Capability |
| :--- | :--- |
| **TheraFlow EHR** | Complete client chart navigation, vitals graphs, treatment plans, DSM-5 problem list, and appointment scheduling. |
| **Clinical AI Scribe v2** | Live microphone recording via browser SpeechRecognition with acoustic waveform visualization, speaker turn alternation, and local deterministic SOAP/DAP note generation. |
| **Telehealth Studio** | WebRTC local camera/mic stream capture, peer loopback simulation, hardware track muting, session timer, and CPT 90834/90837 duration tracker. |
| **PHI Scrubber** | Complete 18-rule Safe Harbor de-identification running 100% locally in-browser with Tag, Block, and Asterisk masking options and cryptographic event logging. |
| **Aura Clinical Copilot** | Draggable in-workflow drawer, contextual note suggestions, and DSM-5 differential diagnostic queries. |
| **CMS-1500 & Billing** | Interactive 33-box CMS-1500 claim editor, instant Superbill generator, and raw X12 837P EDI transmission generator. |
| **Cryptographic Audit Ledger** | SHA-256 chained tamper-evident logging persisting append-only to disk at `data/audit_ledger.jsonl` with CSV/JSON export. |
| **Multi-Tenancy** | Practice switching between solo practice and group practice layouts. |

---

## 3. What is Synthetic / Demo-Only

TheraFlow OS has been intentionally preserved in a **synthetic demo posture** to eliminate legal and operational liability for the seller:

- **Patient Charts & MRNs**: All patients (e.g., Jane Doe `#MC-88219`, Alex Morgan `#MC-44021`, Robert Chen `#MC-11094`) are synthetic test fixtures.
- **Encounter Recordings**: Sample audio sessions are pre-recorded synthetic clinical roleplays; real patient sessions have never been processed.
- **Insurance Payers & Claims**: Clearinghouse EDI transmissions simulate Change Healthcare / Availity formats; no live claims have been dispatched to insurance carriers.
- **Stripe Checkout**: Operates in simulated sandbox checkout mode if `STRIPE_SECRET_KEY` is not provided.
- **External EHRs**: Epic and Cerner exports use standardized SmartText dot-phrases and HL7 FHIR R4 `DocumentReference` JSON formatting; no live Epic FHIR App Orchard credentials are wired.

---

## 4. External Credentials Required for Production Activation

To transition TheraFlow OS from evaluation demo mode to live clinical SaaS operations, an acquirer must provide their own enterprise vendor credentials in `.env`:

```env
# 1. Multi-Tenant Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_ANON_KEY=eyJh...

# 2. Payment Gateway
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Clinical AI & LLM Inference
GEMINI_API_KEY=AIzaSy...

# 4. Live Clinical Telehealth & STT
DEEPGRAM_API_KEY=...
DAILY_API_KEY=... # or AWS Chime credentials
```

---

## 5. What Must Be Replaced or Hardened for Real Clinical Deployment

If the acquirer intends to operate TheraFlow as a direct-to-clinician BAA-backed SaaS, the following engineering steps must be completed:

1. **Database Migration Deployment**:
   - Run `supabase/migrations/20261005_init_schema.sql` against the acquirer's production PostgreSQL/Supabase cluster.
   - Wire application persistence state from in-memory/localStorage cache to PostgreSQL via Supabase client SDK.
2. **Business Associate Agreements (BAAs)**:
   - Execute BAAs with infrastructure vendors (Supabase, Google Cloud, Deepgram, Daily/AWS).
3. **Production Telehealth Infrastructure**:
   - Replace the local WebRTC loopback provider with the buyer's Daily.co domain or AWS Chime SDK meeting service.
4. **Clearinghouse SFTP / API Connection**:
   - Connect the output of the ASC X12 837P EDI generator to an authorized clearinghouse SFTP endpoint (e.g., Availity, Change Healthcare, Claim.MD).
5. **Session Management & Identity**:
   - Connect user registration and login to the buyer's enterprise SSO (Okta, Auth0, or Supabase Auth with MFA).

---

## 6. Estimated Onboarding Timeline for Buyer Engineering Team

Because TheraFlow OS was engineered with clean abstractions, modular TypeScript, and zero legacy bloat, buyer onboarding is rapid:

| Phase | Duration | Scope of Work |
| :--- | :--- | :--- |
| **Week 1: Codebase Review & Discovery** | 2–3 Days | Run automated test suites (`npm test`), review `ARCHITECTURE.md` and `SECURITY_MODEL.md`, verify sandbox flows. |
| **Week 2: Database Schema & Auth Hookup** | 3–5 Days | Apply `20261005_init_schema.sql` to buyer PostgreSQL database, configure RLS claims, wire Supabase Auth SDK. |
| **Week 3: External Vendor Integration** | 3–5 Days | Input production Deepgram API keys, configure Daily/AWS Chime WebRTC rooms, wire Stripe live keys. |
| **Week 4: Clearinghouse & EHR Export Test** | 3–5 Days | Validate 837P EDI output against buyer's clearinghouse sandbox; test Epic FHIR export in buyer's sandbox. |
| **Total Estimated Time to Market:** | **3–4 Weeks** | **Saves 6–12 months of net-new engineering from scratch.** |
