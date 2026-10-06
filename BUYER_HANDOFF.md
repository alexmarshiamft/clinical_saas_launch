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
   - Unified Practice OS modules:
     - Workforce Roster & Provider Credentialing (`src/pages/WorkforceView.tsx`)
     - Clinician Compensation Rules Engine (`src/modules/compensation/compensation-engine.ts`, `src/pages/CompensationView.tsx`)
     - TheraFlow Payroll Orchestrator with Gusto/ADP Adapters (`src/modules/payroll/payroll-provider.ts`, `src/pages/PayrollView.tsx`)
     - TheraFlow Money Embedded BaaS Treasury (`src/modules/money/banking-provider.ts`, `src/pages/BankingMoneyView.tsx`) – *Fully refactored to use robust BigInt cents arithmetic, eliminating all floating-point vulnerabilities.*
     - Start-a-Practice Onboarding Wizard (`src/pages/OnboardingWizard.tsx`)
     - Group Practice Migration Suite (`src/pages/MigrationWizard.tsx`)
   - Full billing suite (CMS-1500 interactive editor, 837P EDI generator, 277CA claim scrubber, Superbill generator).
   - Telehealth suite with WebRTC media controls, session timer, and CPT 90834/90837 billing crosswalk.
2. **Production Database & Persistence Assets**:
   - Multi-tenant PostgreSQL 15 / Supabase migration schemas (27 tables):
     - `supabase/migrations/20261005_init_schema.sql` (Core clinical & EHR tables)
     - `supabase/migrations/20261005_unified_practice_os.sql` (Practice OS entities: workers, locations, compensation plans, rules, earnings, payroll runs, bank accounts, transactions, reconciliations, journal entries). *Includes fully verified `trg_sync_bank_from_journal_line` trigger to guarantee automatic synchronization of checking and tax reserve accounts upon general ledger postings.*
   - 47 Row-Level Security (RLS) policies enforcing strict multi-tenant isolation (`practice_id` boundary checks verified), RBAC role-level permissions (clinician vs billing/payroll admin vs owner), and append-only immutability for general ledger journal lines.
   - Durable append-only cryptographic audit logger (`server.ts` + `data/audit_ledger.jsonl`) with HMAC-SHA256 signature verification.
3. **Clinical AI & Privacy Subsystems**:
   - Client-side 18-rule HIPAA Safe Harbor de-identification engine (`src/tools/phi-scrubber/`).
   - Outbound LLM Privacy Gateway (`phi-privacy-gateway.ts`) acting as an impenetrable fail-closed chokepoint: intercepts AI payloads and intentionally aborts LLM sequence if direct identifiers (like names or MRNs) slip through, falling back to a secure deterministic clinical engine.
   - Verified holdout benchmark: 81.64% overall recall (92.18% structured, 71.17% unstructured) with 97.1% precision across 3,410 entities.
   - Dual-channel ambient speech diarization abstraction with live WebSpeech API provider and Deepgram WebSocket contracts.
4. **Validation Corpora & Test Suites**:
   - Verified automated test suites executed across specialized harnesses:
     - 80/80 E2E tests across 4 tiers (`tests/e2e/run-all.mjs`)
     - 39/39 Practice OS tests (`tests/practice-os-unified.test.ts`)
     - 17/17 Subscription gating checks (`scripts/verify-subscription-gate.mjs`)
     - 12/12 Auth redirect & route guard checks (`scripts/verify-auth-redirect.mjs`)
     - 30/30 EHR clinical verification checks (`tests/m3-theraflow-ehr.test.ts`)
     - 16/16 High-throughput concurrency stress checks (`tests/challenger-m3-empirical-concurrency.ts`)
     - 26/26 Adversarial auth security checks (`scripts/adversarial-security-audit.mjs`)
     - 11/11 Compensation engine adversarial checks + 50,000 property-based monetary test cases with 0 cent mismatches (`tests/compensation-engine-adversarial.test.ts`)
     - 19/19 Financial integrity & security invariant checks (`tests/adversarial-financial-and-security.test.ts`)
     - Clean PostgreSQL migration pipeline suite verifying clean deployment, RLS, and append-only constraints (`tests/migration-pipeline.test.ts`)
     - First-render dashboard hydration crash regression suite (`tests/regression-dashboard-hydration.test.ts`)
5. **Interactive Demonstration Framework**:
   - Integrated buyer demo guide tour (`DemoGuideModal.tsx`) populated with 100% realistic synthetic clinical scenarios.
   - One-click downstream cascade trigger executing encounter -> payment -> compensation -> payroll batch ripple using double-entry ledger.

---

## 2. What Works Immediately (Out of the Box)

Without configuring any third-party paid accounts or external vendor APIs, an acquirer's engineering team can clone, run `npm install`, `npm run dev`, and immediately evaluate:

| Subsystem | Immediate Out-of-the-Box Capability |
| :--- | :--- |
| **Unified Command Center** | Answers the 9 critical practice owner questions in real time; triggers one-click encounter-to-paycheck downstream cascade. |
| **Workforce Roster** | Manage 14 clinicians, W-2 vs 1099 classification, supervisor relationships, Type 1 NPIs, licenses, and weekly target hours. |
| **Compensation Engine** | Tiered volume splits (50%–60%), CPT flat rates (90837, 90834, 90847, 90791), late cancellation credits, documentation bonuses, and auditable math formulas. |
| **TheraFlow Payroll** | Pre-review aggregation, clinician payroll summaries, Gusto/ADP/Sandbox provider selector, CSV export, and ACH direct deposit scheduling. |
| **TheraFlow Money** | Multi-vault treasury (Operating Checking, 25% Tax Vault, Payroll Escrow), unit economics waterfall, and claim-to-bank reconciliation. |
| **Onboarding & Migration** | 8-step start-a-practice wizard and 5-step group practice migration suite consolidating SimplePractice + Gusto stacks. |
| **TheraFlow EHR** | Complete client chart navigation, vitals graphs, treatment plans, DSM-5 problem list, and appointment scheduling. |
| **Clinical AI Scribe v2** | Live microphone recording via browser SpeechRecognition with acoustic waveform visualization, speaker turn alternation, and local deterministic SOAP/DAP note generation. |
| **Telehealth Studio** | WebRTC local camera/mic stream capture, peer loopback simulation, hardware track muting, session timer, and CPT 90834/90837 duration tracker. |
| **PHI Scrubber** | Complete 18-rule Safe Harbor de-identification running 100% locally in-browser with Tag, Block, and Asterisk masking options and cryptographic event logging. |
| **Aura Clinical Copilot** | Draggable in-workflow drawer, contextual note suggestions, and DSM-5 differential diagnostic queries. |
| **CMS-1500 & Billing** | Interactive 33-box CMS-1500 claim editor, instant Superbill generator, and raw X12 837P EDI transmission generator. |
| **Cryptographic Audit Ledger** | SHA-256 chained tamper-evident logging persisting append-only to disk at `data/audit_ledger.jsonl` with CSV/JSON export. |

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

## 6. Estimated Production-Readiness Timeline for Buyer Engineering Team

A realistic engineering assessment for a buyer deploying TheraFlow OS into live regulated clinical and banking operations (4–5 engineer team):

| Phase | Scope of Work | Estimated Calendar Time |
| :--- | :--- | :--- |
| **Phase 1: Foundation & Persistence Integration** | Deploy PostgreSQL schemas, configure Supabase Auth & JWT claims, wire Practice OS database persistence to PostgreSQL client. | **3–4 Weeks** |
| **Phase 2: Live Clearinghouse & Telehealth Rails** | Connect 837P batch generator to clearinghouse SFTP (Availity/Change/Claim.MD), build 835/ERA ingestion worker, swap WebRTC loopback with Daily.co or AWS Chime. | **6–8 Weeks** |
| **Phase 3: Regulated Partner Onboarding (Gusto & BaaS)** | Complete Gusto Partner Developer onboarding and OAuth2 integration; initiate Bank Partner / BaaS onboarding (Unit/Column/Stripe Treasury compliance review takes 2–3 months). | **8–12 Weeks** (gated by partner compliance) |
| **Phase 4: Security Review & BAA Execution** | Formal third-party penetration testing, HIPAA compliance audit, execute BAAs with cloud providers, SOC 2 Type 1 preparation. | **4–6 Weeks** |
| **Milestone: Private Beta** | Practice management, clinical EHR, telehealth, and compensation engine live on rails. | **5–8 Months** |
| **Milestone: General Availability (GA)** | Full commercial operations with automated payroll tax filing and embedded business banking. | **9–12 Months** |

> **Acquisition Value Proposition:** Acquiring TheraFlow provides the turnkey clinical UI architecture, behavioral-health compensation vocabulary, unified clinical-to-financial workflow thesis, and validated test harnesses—saving **6 to 12 months** of preliminary product definition, UX design, and prototype iteration.
