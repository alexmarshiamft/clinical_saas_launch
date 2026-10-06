# TheraFlow OS — Strategic Acquirer Handoff Guide

> **Asset Status:** Turnkey Behavioral Health Frontend & Clinical Workflow Engine  
> **Release Version:** `v1.1.0-security-remediated`  
> **Verified Commit SHA:** `4113573e982e6176ea8c71c3deb2862f44a6f11e` (latest: `9518a84`)  
> **GitHub Actions CI Status:** Passing (Master Run ID: `37511948228` · Remediation Branch Run ID: `37511959898`)  
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
     - TheraFlow Money Embedded Treasury (`src/modules/money/banking-provider.ts`, `src/pages/BankingMoneyView.tsx`) – *Pure fixed-point integer basis-point arithmetic (`calculateBasisPointsCents`), eradicating all floating-point math.*
     - Start-a-Practice Onboarding Wizard (`src/pages/OnboardingWizard.tsx`)
     - Group Practice Migration Suite (`src/pages/MigrationWizard.tsx`)
   - Full billing suite (CMS-1500 interactive editor, 837P EDI generator, 277CA claim scrubber, Superbill generator).
   - Telehealth suite with WebRTC media controls, session timer, and CPT 90834/90837 billing crosswalk.
2. **Database & Persistence Assets (Security-Remediated)**:
   - Multi-tenant PostgreSQL 15 / Supabase migration schemas (27 tables):
     - `supabase/migrations/20261005_init_schema.sql` (Core clinical & EHR tables)
     - `supabase/migrations/20261005_unified_practice_os.sql` (Practice OS entities: workers, locations, compensation plans, rules, earnings, payroll runs, bank accounts, transactions, reconciliations, journal entries).
   - 58 Row-Level Security (RLS) policies enforcing multi-tenant isolation, RBAC role-level permissions (clinician vs billing/payroll admin vs owner), and append-only immutability.
   - Granular unsigned clinical-note protection: only the author clinician or practice administrator/owner (roles: `'owner'`, `'admin'`, `'practice_admin'`) can modify or delete draft notes (`lock_signed_clinical_notes`, `prevent_delete_signed_clinical_notes`).
   - Durable append-only cryptographic audit logger (`server.ts` + `data/audit_ledger.jsonl`) with HMAC-SHA256 signature verification and strict tenant filtering.
3. **Clinical AI & Privacy Subsystems**:
   - Client-side 18-rule HIPAA Safe Harbor de-identification engine (`src/tools/phi-scrubber/`).
   - Outbound LLM Privacy Gateway (`phi-privacy-gateway.ts`) acting as a fail-closed chokepoint: intercepts AI payloads and aborts LLM sequence if direct identifiers (like names or MRNs) slip through, falling back to a deterministic clinical engine.
   - Verified holdout benchmark: 81.64% overall recall (92.18% structured, 71.17% unstructured) with 97.1% precision across 3,410 entities.
   - Dual-channel ambient speech diarization abstraction with WebSpeech API provider and Deepgram WebSocket contracts.
4. **Validation Corpora & Test Suites (100% Passing in GitHub CI)**:
   - Automated test suites executed and verified in GitHub Actions (Node 22 LTS):
     - **29/29** Server Security & Multi-Tenant Isolation tests (`tests/server-security-and-tenant-isolation.test.ts`)
     - **26/26** Client Route Guard & Storage Security tests (`scripts/adversarial-security-audit.mjs`)
     - **28/28** Empirical Server Stress & Endpoint tests (`tests/empirical-server-stress.ts`)
     - **30/30** Milestone 3 TheraFlow EHR tests (`tests/m3-theraflow-ehr.test.ts`)
     - **61/61** Milestone 4 Clinical Scribe tests (`tests/m4-clinical-scribe.test.ts`)
     - **85/85** Milestone 5 Aura Assistant & PHI Scrubber tests (`tests/m5-aura-scrubber.test.ts`)
     - **100%** Adversarial Financial & Security Invariants tests (`tests/adversarial-financial-and-security.test.ts`)
     - **100%** PostgreSQL Migration & RLS Pipeline tests (`tests/migration-pipeline.test.ts`)
     - **100%** Clean TypeScript typecheck (`tsc --noEmit`) and Vite production build (`vite build`)
5. **Interactive Demonstration Framework**:
   - Integrated buyer demo guide tour (`DemoGuideModal.tsx`) populated with 100% realistic synthetic clinical scenarios.
   - One-click downstream cascade trigger executing encounter -> payment -> compensation -> payroll batch ripple using double-entry ledger.

---

## 2. Functional Architecture: Real vs. Sandbox vs. Vendor Integrations

To ensure transparency during acquisition due diligence, the codebase is categorized across three distinct architectural tiers:

### Tier 1: Working Product & Implemented Code (100% Real Engine Logic)
These systems execute real clinical and mathematical logic without external mock dependencies:
- **Clinician Compensation Rules Engine (`src/modules/compensation/`)**: Tiered volume splits (50%–60%), flat CPT rates, late cancellation fees, and documentation bonuses calculated via integer basis points.
- **TheraFlow Money Pure Basis-Point Math (`src/modules/money/banking-provider.ts`)**: Pure fixed-point arithmetic (`calculateBasisPointsCents`, `parseBasisPoints`) operating in integer cents with zero IEEE-754 float drift. Cent conservation is exact.
- **Double-Entry General Ledger (`src/modules/ledger/`)**: Complete debits/credits balance validation, automated tax-reserve set-aside entries, and append-only audit trail.
- **Client-Side HIPAA 18-Rule Safe Harbor PHI Scrubber (`src/tools/phi-scrubber/`)**: In-browser regex engine for all 18 statutory HIPAA identifiers with Tag, Block, and Asterisk masking modes.
- **Outbound LLM Privacy Gateway (`phi-privacy-gateway.ts`)**: Fail-closed chokepoint scanning AI payloads for identifiers, aborting outbound LLM transmission on detection with fallback.
- **Multi-Tenant PostgreSQL Migration & RLS Policies (`supabase/migrations/`)**: 27 relational tables, 58 RLS policies, trigger locks on signed notes, and author ownership guards on unsigned notes.
- **Express API Security & Multi-Tenant Isolation (`server.ts`)**: Session JWT validation (`checkAuth`), RBAC enforcement, strict tenant clamping (`practiceId === authUser.practiceId`), and isolated cryptographic audit exports.
- **Clinical EHR & Treatment Plan Workspaces (`src/tools/theraflow/`)**: Full client directory, appointment scheduling, structured DAP progress notes, and DSM-5 problem list management.
- **CMS-1500 & 837P EDI Generation (`src/tools/theraflow/`)**: Interactive 33-box CMS-1500 form editor, Superbill generator, and standards-compliant ASC X12 837P EDI file formatter.

### Tier 2: Synthetic / Sandbox Implemented Capabilities
These components provide fully interactive user experiences using simulated or browser-standard engines, deliberately avoiding external paid vendor dependencies during evaluation:
- **TheraFlow Embedded Treasury Sandbox**: Simulates BaaS bank accounts (Operating Checking, 25% Tax Vault, Payroll Escrow) and ACH disbursements with double-entry ledger tracking. Real funds are never moved.
- **Ambient Scribe Speech Recognition**: Uses standard browser `webkitSpeechRecognition` / WebSpeech API with acoustic waveform visualization. Operates on pre-recorded clinical scripts or local microphone.
- **Telehealth Room Simulation**: WebRTC local media stream capture, camera/microphone muting, session timer, and CPT billing crosswalk. Loopback video room runs without an external paid WebRTC relay.
- **Stripe Subscription Checkout**: Operates in simulated test checkout mode when `STRIPE_SECRET_KEY` is not configured, generating test checkout session tokens.
- **Clearinghouse Claims**: Simulates Change Healthcare / Availity 277CA acceptance reports from generated 837P payloads. Real clearinghouse claims are not dispatched.
- **EHR Export Formatting**: Produces valid Epic SmartText dot-phrases, Cerner Millennium text, and HL7 FHIR R4 `DocumentReference` JSON for clipboard/download. Does not invoke live hospital EHR REST APIs.

### Tier 3: Vendor Integrations Not Yet Implemented (Production Requirements)
These integrations represent production external services an acquirer must wire using their own commercial partner credentials:
- **Live Payroll Tax Filing (Gusto / ADP)**: Adapters generate compliant payroll batch payloads and CSV exports. Live automated federal/state tax filing requires Gusto Developer Partner OAuth2 or ADP Marketplace mTLS API credentials.
- **Live Regulated BaaS Banking Rails**: Requires partnership onboarding with an authorized BaaS provider (e.g., Unit, Column, Stripe Treasury) to issue real routing/account numbers and initiate live Fedwire/ACH transactions.
- **Live Clearinghouse SFTP**: Requires commercial clearinghouse credentials (e.g., Availity, Change Healthcare, Claim.MD) to transmit live 837P batches and ingest 835 ERA remittance files.
- **Live Cloud Ambient Diarization**: Requires streaming API keys (e.g., Deepgram Nova-2 or OpenAI Whisper) for server-side multi-speaker acoustic diarization.
- **Production Infrastructure BAAs**: Requires executing Business Associate Agreements (BAAs) with hosting and database vendors (Supabase, Google Cloud, AWS) before ingesting real patient ePHI.

---

## 3. Codex Security Re-Audit Remediation Summary

Following independent re-audits on commit `7403e77`, all identified security vulnerabilities and architectural gaps were remediated and verified in the automated CI test suite:

1. **SEC-01 (API Authentication & Tenant Boundary Enforcement)**:
   - Added `checkAuth` to previously unprotected endpoints: `POST /api/telehealth/meeting` and `POST /api/billing/create-checkout`.
   - Implemented RBAC on billing checkout (requiring `biller`, `owner`, `admin`, or `clinician`).
   - Strictly enforced caller tenant ownership on `GET /api/practice-os/ledger/balance-check`: overriding `practiceId` via query parameter is rejected with HTTP 403.
   - Removed owner/admin cross-tenant escape hatch from `GET /api/practice-os/state`, strictly confining all roles to their own practice.
   - Guarded financial mutations (`POST /payment-event`, `/journal/entry`, `/journal/reverse`, `/cascade-simulation`): cross-tenant body tampering is rejected with HTTP 403.
2. **SEC-02 (Audit Log Multi-Tenancy & Legacy Bleed Prevention)**:
   - Removed `!l.practiceId` leak fallback from `GET /api/audit-logs` and `/api/audit-logs/export`.
   - Normalized legacy records lacking `practiceId` to the genesis demo practice ID upon startup, preventing them from leaking into other tenant query results.
   - Added boundary check on `POST /api/audit-logs` rejecting attempts to attribute logs to other practice IDs.
3. **SEC-03 (PostgreSQL RLS & Unsigned Clinical Notes Protection)**:
   - Updated `lock_signed_clinical_notes` trigger: unsigned notes can only be modified by the author clinician or practice administrator/owner (roles: `'owner'`, `'admin'`, `'practice_admin'`). Reassigning the note author is blocked.
   - Updated `prevent_delete_signed_clinical_notes` trigger: colleagues in the same practice cannot delete another clinician's unsigned note.
   - Replaced generic practice-wide RLS policy on `clinical_notes` with granular SELECT, INSERT, UPDATE, and DELETE policies restricting write operations strictly to note authors or practice administrators.
4. **Fixed-Point Basis-Point Math Eradication of Floating-Point Calculations**:
   - Replaced all JS `(pct / 100) * amount` and `* 0.25` floating-point calculations with pure fixed-point arithmetic (`calculateBasisPointsCents`).
   - Added `parseBasisPoints` utilizing exact integer digit string extraction (0 float operations) and supported direct BigInt basis points (`6550n`).
5. **Headless CI & Automated Test Runner Termination**:
   - Added headless WebSocket polyfills in `src/lib/supabase.ts` and test harnesses, guaranteeing clean execution across Node.js and JSDOM environments.
   - Updated GitHub Actions CI workflow to Node 22 LTS, achieving a 100% green pass across all 11 test stages.

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
