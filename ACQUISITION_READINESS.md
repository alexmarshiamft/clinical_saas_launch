# TheraFlow OS — Strategic Acquisition Readiness Memo

> **Asset Name:** TheraFlow Behavioral Health OS & Clinical Workflow Engine  
> **Release Version:** `v1.1.0-security-remediated`  
> **Verified Commit SHA:** `4113573e982e6176ea8c71c3deb2862f44a6f11e` (current documentation branch head: `9518a84`)  
> **Automated CI Status:** 100% Green across 11 stages in GitHub Actions (Master Run ID: `37511948228` · Branch Run ID: `37511959898`)  
> **Security Audit State:** Remediated & Verified (SEC-01, SEC-02, SEC-03 closed; pure fixed-point basis-point math; RLS locked)  
> **Evaluation Mode:** Synthetic Data Mode (Zero Real-Patient PHI Ingestion)  

---

## 1. What You Are Acquiring

TheraFlow OS is a specialized, enterprise-grade clinical frontend, workflow engine, and practice management suite designed specifically for behavioral health practices, psychiatry clinics, and multi-provider group practices.

Acquiring this asset eliminates **6 to 12 months** of specialized clinical product design, clinical informatics modeling, and frontend engineering. An acquirer receives:
- **~28,400 LOC of Production TypeScript/React 19 code**: Covering 4 core clinical applications, 6 unified practice management modules, and standard clinical billing workflows.
- **27 PostgreSQL Relational Tables & 58 Row-Level Security (RLS) Policies**: Production schemas ready for Supabase / PostgreSQL 15 deployment.
- **Fail-Closed Privacy Subsystems**: 18-rule HIPAA Safe Harbor regex redaction engine and an outbound LLM privacy gateway.
- **Pure Fixed-Point Financial Math**: Money engine operating entirely in integer cents and basis points with zero IEEE-754 floating-point drift.
- **~25,200 LOC of Automated Test Suites**: Comprehensive test coverage with 100% green verification in GitHub Actions CI.

---

## 2. Architecture Overview

```
                      ┌────────────────────────────────────────────────────────┐
                      │                   CLIENT BROWSER                       │
                      │                                                        │
                      │   React 19 SPA (Vite 6) • Tailwind CSS • Base UI       │
                      │                                                        │
                      │  ┌──────────────────────────────────────────────────┐  │
                      │  │                 ROUTED MODULES                   │  │
                      │  │  • Clinical Command Center (/dashboard)          │  │
                      │  │  • TheraFlow EHR & DAP Charting (/ehr)           │  │
                      │  │  • Clinical AI Scribe v2 (/scribe)               │  │
                      │  │  • Aura Diagnostic Copilot (/aura)               │  │
                      │  │  • HIPAA PHI Scrubber (/scrubber)                │  │
                      │  │  • Practice OS Management (/practice-os)         │  │
                      │  └──────────────────────────────────────────────────┘  │
                      │                           │                            │
                      │  ┌────────────────────────▼─────────────────────────┐  │
                      │  │                 STATE & STORAGE                  │  │
                      │  │  • ClinicalContext (Active Client, Chart State)  │  │
                      │  │  • AuthContext (Session JWT & Tenant Scope)      │  │
                      │  │  • PracticeOS Context (Ledger, Treasury, Payroll)│  │
                      │  └────────────────────────┬─────────────────────────┘  │
                      └───────────────────────────┼────────────────────────────┘
                                                  │
                                                  ▼ HTTP / JSON (Bearer JWT + RBAC)
                      ┌────────────────────────────────────────────────────────┐
                      │              BACKEND / MIDDLEWARE RUNTIME              │
                      │                                                        │
                      │  Express 4 on Node.js 22 LTS (server.ts)               │
                      │                                                        │
                      │  Security Middleware:                                  │
                      │  • checkAuth (JWT Bearer Token Validation)             │
                      │  • Tenant Isolation (Clamped practiceId Checks)        │
                      │  • RBAC Permissions (Biller, Admin, Clinician)         │
                      │                                                        │
                      │  Core Endpoints:                                       │
                      │  • /api/practice-os/* (State, Ledger, Cascade)         │
                      │  • /api/billing/* (Stripe Checkout & Tier Gates)       │
                      │  • /api/telehealth/* (Protected Room Tokens)           │
                      │  • /api/audit-logs/* (HMAC-SHA256 Append-Only Ledger)  │
                      └───────┬──────────────────────┬─────────────────────────┘
                              │                      │
                   (PostgreSQL Migrations)    (When Configured)
                              │                      │
                              ▼                      ▼
                      ┌───────────────┐      ┌───────────────┐
                      │   Supabase    │      │    Stripe     │
                      │ 27 Tables &   │      │  Checkout &   │
                      │ 58 RLS Rules  │      │   Webhooks    │
                      └───────────────┘      └───────────────┘
```

---

## 3. Functional Modules Breakdown

### A. Core Clinical Suite
1. **TheraFlow EHR**: Client directory, intake workflows, chronological chart history, DAP (Data, Assessment, Plan) clinical note editor, DSM-5 problem list, and appointment scheduling calendar.
2. **Clinical AI Scribe v2**: Dual-speaker transcript interface, 6 clinical note templates (SOAP, DAP, Intake, Progress, EMDR, Discharge), prompt template studio with variable interpolation (`{{patient_name}}`, `{{cpt_code}}`), and automated CPT code bracket suggestion (90832, 90834, 90837, 90791).
3. **Aura Diagnostic Assistant**: Searchable DSM-5 criteria database for 7 major psychiatric disorders, symptom checklist scoring, typewriter streaming SOAP generator, and floating action orb.
4. **HIPAA PHI Scrubber**: 18 Safe Harbor statutory regex categories, Tag `[NAME]`, Block `████`, and Asterisk `***` masking styles, side-by-side visual diff viewer, and forensic audit report export.

### B. Unified Practice OS Suite
1. **Workforce Roster & Credentialing**: Practitioner management, NPI/CAQH tracking, supervisor links, and multi-location assignments.
2. **Clinician Compensation Rules Engine**: Tiered volume splits (50%–60%), flat-fee CPT rates, late cancellation fees, and documentation bonuses calculated via integer basis points.
3. **TheraFlow Payroll Orchestrator**: Automated pay-period batch calculation, wage breakdown reporting, and export adapters for Gusto and ADP.
4. **TheraFlow Money Embedded Treasury**: Triple-subaccount allocation (Operating Checking, 25% Tax Vault, Payroll Escrow), ACH disbursement scheduling, and pure fixed-point basis-point arithmetic.
5. **Double-Entry General Ledger**: Enforces exact balance invariance (\(\sum \text{Debits} = \sum \text{Credits}\)) across all financial events.
6. **Start-a-Practice & Migration Wizards**: Self-serve onboarding wizards for solo practitioners and CSV import/export tools for group practices.

---

## 4. Operational Classification: Real vs. Sandbox vs. Unimplemented

To ensure full transparency during technical evaluation, all features are categorized into three distinct operational tiers:

### Tier 1: Working Product & Implemented Code (100% Real Engine Logic)
These systems execute genuine clinical and mathematical logic without external mock dependencies:
- **Compensation Rules Engine**: Tiered volume splits, CPT flat fees, and bonus calculations.
- **TheraFlow Money Basis-Point Math**: Pure fixed-point arithmetic (`calculateBasisPointsCents`, `parseBasisPoints`) operating in integer cents with zero float drift.
- **Double-Entry General Ledger**: Strict balance validation and automated tax set-aside journal entries.
- **18-Rule Safe Harbor PHI Scrubber**: In-browser regex engine for all 18 statutory HIPAA identifiers.
- **Outbound LLM Privacy Gateway**: Intercepts AI payloads, aborting outbound LLM calls if direct identifiers are detected.
- **Multi-Tenant PostgreSQL Schemas & RLS**: 27 tables, 58 RLS policies, trigger locks on signed notes, and draft note author permissions.
- **Express API Security & Multi-Tenant Isolation**: Bearer JWT validation, strict RBAC, and practice tenant clamping.
- **CMS-1500 & 837P EDI Generation**: Official 33-box CMS-1500 form editor and ASC X12 837P EDI file formatter.

### Tier 2: Synthetic / Sandbox Capabilities (Interactive Simulation)
These components provide interactive user experiences using simulated or browser-standard engines, deliberately avoiding external paid vendor dependencies during evaluation:
- **Embedded Treasury Sandbox**: Simulates BaaS bank accounts (Operating, Tax Vault, Payroll) and ACH disbursements with ledger tracking. Real funds are never moved.
- **Ambient Scribe Speech Recognition**: Uses standard browser `webkitSpeechRecognition` with acoustic waveforms. Operates on pre-recorded clinical scripts or local microphone.
- **Telehealth Room Simulation**: WebRTC local media stream capture, camera/microphone muting, session timer, and billing crosswalk. Loopback room runs without an external paid WebRTC relay.
- **Stripe Subscription Checkout**: Operates in simulated test checkout mode when `STRIPE_SECRET_KEY` is omitted.
- **Clearinghouse Claims**: Simulates Change Healthcare / Availity 277CA acceptance reports from generated 837P payloads. Real claims are not dispatched.
- **EHR Export Formatting**: Produces valid Epic SmartText dot-phrases, Cerner Millennium text, and HL7 FHIR R4 JSON for clipboard/download. Does not invoke live hospital REST APIs.

### Tier 3: Vendor Integrations Not Yet Implemented (Production Requirements)
These integrations represent production external services an acquirer must wire using their own commercial partner credentials:
- **Live Payroll Tax Filing (Gusto / ADP)**: Adapters generate compliant payroll batch payloads and CSV exports. Live automated federal/state tax filing requires Gusto Developer Partner OAuth2 or ADP Marketplace mTLS API credentials.
- **Live Regulated BaaS Banking Rails**: Requires partnership onboarding with an authorized BaaS provider (e.g., Unit, Column, Stripe Treasury) to issue real routing/account numbers and initiate live Fedwire/ACH transactions.
- **Live Clearinghouse SFTP**: Requires commercial clearinghouse credentials (e.g., Availity, Change Healthcare, Claim.MD) to transmit live 837P batches and ingest 835 ERA remittance files.
- **Live Cloud Ambient Diarization**: Requires streaming API keys (e.g., Deepgram Nova-2 or OpenAI Whisper) for server-side multi-speaker acoustic diarization.
- **Production Infrastructure BAAs**: Requires executing Business Associate Agreements (BAAs) with hosting and database vendors (Supabase, Google Cloud, AWS) before ingesting real patient ePHI.

---

## 5. Security Remediations Completed

Following independent re-audits on commit `7403e77`, all identified security vulnerabilities and architectural gaps were fully remediated and verified in automated CI suites:

1. **SEC-01 (API Authentication & Tenant Boundary Enforcement)**:
   - Added `checkAuth` middleware to previously unprotected routes: `POST /api/telehealth/meeting` and `POST /api/billing/create-checkout`.
   - Enforced RBAC on billing checkout (requiring `biller`, `owner`, `admin`, or `clinician`).
   - Strictly enforced caller tenant ownership on `GET /api/practice-os/ledger/balance-check`: overriding `practiceId` via query parameter is rejected with HTTP 403.
   - Removed owner/admin cross-tenant escape hatch from `GET /api/practice-os/state`, strictly confining all roles to their own practice.
   - Guarded financial mutations (`POST /payment-event`, `/journal/entry`, `/journal/reverse`, `/cascade-simulation`): cross-tenant body tampering is rejected with HTTP 403.
2. **SEC-02 (Audit Log Multi-Tenancy & Legacy Bleed Prevention)**:
   - Removed `!l.practiceId` leak fallback from `GET /api/audit-logs` and `/api/audit-logs/export`.
   - Normalized legacy records lacking `practiceId` to the genesis demo practice ID upon startup, preventing them from leaking into other tenant query results.
   - Added boundary check on `POST /api/audit-logs` rejecting attempts to attribute logs to other practice IDs.
   - Audit logs are persisted to an append-only JSONL file (`data/audit_ledger.jsonl`) with HMAC-SHA256 signatures.
3. **SEC-03 (PostgreSQL RLS & Unsigned Clinical Notes Protection)**:
   - Updated `lock_signed_clinical_notes` trigger: unsigned notes can only be modified by the author clinician or practice administrator/owner (roles: `'owner'`, `'admin'`, `'practice_admin'`). Reassigning the note author is blocked.
   - Updated `prevent_delete_signed_clinical_notes` trigger: colleagues in the same practice cannot delete another clinician's unsigned note.
   - Replaced generic practice-wide RLS policy on `clinical_notes` with granular SELECT, INSERT, UPDATE, and DELETE policies restricting write operations strictly to note authors or practice administrators.
4. **Fixed-Point Basis-Point Math Eradication of Floating-Point Calculations**:
   - Replaced all JS `(pct / 100) * amount` and `* 0.25` floating-point calculations with pure fixed-point arithmetic (`calculateBasisPointsCents`).
   - Added `parseBasisPoints` utilizing exact integer digit string extraction (0 float operations) and supported direct BigInt basis points (`6550n`).

---

## 6. Test Evidence & Automated CI Matrix

Every release is validated by an automated 11-step GitHub Actions CI workflow running on Node 22 LTS:
- **Master Branch Run ID:** `37511948228` (Success ✓)
- **Remediation Branch Run ID:** `37511959898` (Success ✓)

| CI Pipeline Stage | Executed Command | Results | Audit Status | Key Subsystem Verified |
|:---|:---|:---:|:---:|:---|
| **1. TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | 0 Errors | **PASS** | Strict TypeScript static validation across all modules |
| **2. Production Build** | `npm run build` (`vite build`) | 0 Errors | **PASS** | Production Vite bundle optimization (4.4s) |
| **3. Client Route Guard & Security** | `node scripts/adversarial-security-audit.mjs` | 26 / 26 | **PASS (100%)** | Corrupt storage parsing, session forgery, open redirect defense, expired tokens |
| **4. Server Security & Isolation** | `npx tsx tests/server-security-and-tenant-isolation.test.ts` | 29 / 29 | **PASS (100%)** | SEC-01 auth, SEC-02 audit isolation, SEC-03 RLS, RBAC on checkout, parameter tampering |
| **5. Empirical Server Stress** | `npx tsx tests/empirical-server-stress.ts` | 28 / 28 | **PASS (100%)** | Server fuzzing, LRU cache eviction, URL parameter tampering, process lifecycle |
| **6. Milestone 3 TheraFlow EHR** | `npx tsx tests/m3-theraflow-ehr.test.ts` | 30 / 30 | **PASS (100%)** | Client roster, DAP note editor, treatment plans, calendar scheduler, superbill modal |
| **7. Milestone 4 Clinical Scribe** | `npx tsx tests/m4-clinical-scribe.test.ts` | 61 / 61 | **PASS (100%)** | 6 clinical templates, deterministic synthesis, variable interpolation, CPT engine |
| **8. Milestone 5 Aura & Scrubber** | `npx tsx tests/m5-aura-scrubber.test.ts` | 85 / 85 | **PASS (100%)** | 18 Safe Harbor rules, character offset verification, DSM-5 database, typewriter streaming |
| **9. Adversarial Financial Invariants** | `npx tsx tests/adversarial-financial-and-security.test.ts` | All Pass | **PASS (100%)** | Pure basis-point integer math, cent conservation, debits=credits balance check |
| **10. PostgreSQL Migration Pipeline** | `npx tsx tests/migration-pipeline.test.ts` | All Pass | **PASS (100%)** | 27 tables, 58 RLS policies, trigger integrity, unsigned note permission rules |

---

## 7. Known Limitations & Operational Realities

1. **No Real Patient Ingestion Without BAA Deployment**: The application is configured by default for synthetic evaluation. Deploying for live patients requires deploying migrations to managed PostgreSQL, configuring environment variables, and signing BAAs.
2. **Local WebRTC Loopback Video**: Video consultations operate as local loopback media streams; production multi-device video requires plugging in an external SFU relay service (Daily.co, AWS Chime, or LiveKit).
3. **Browser WebSpeech Speech-to-Text**: Speech transcription uses the client's browser WebSpeech engine; server-side diarization requires attaching an external acoustic API (e.g., Deepgram Nova-2).
4. **Third-Party Regulatory Disclaimer**: TheraFlow OS has not been submitted for official third-party compliance certification (e.g., SOC 2 Type II, HITRUST CSF). It provides the architectural and software controls, but legal HIPAA compliance depends on buyer deployment infrastructure and business associate agreements.

---

## 8. Deployment & Staging Requirements

To activate TheraFlow OS in a live commercial staging environment, an acquirer must provide the following vendor credentials:

```env
# 1. Multi-Tenant PostgreSQL Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_ANON_KEY=eyJh...

# 2. Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Clinical AI & LLM Inference (Google Cloud / Vertex AI)
GEMINI_API_KEY=AIzaSy...

# 4. Live Clinical Telehealth & STT
DEEPGRAM_API_KEY=...
DAILY_API_KEY=... # or AWS Chime credentials
```

### Staging Engineering Tasks (Estimated 3–4 Weeks):
1. Execute `supabase/migrations/` against the buyer's managed PostgreSQL instance.
2. Wire `theraflow-store.ts` to sync state with the PostgreSQL client SDK.
3. Configure domain DNS and SSL certificates on Vercel or cloud container hosting.
4. Execute Business Associate Agreements (BAAs) with Supabase and Google Cloud.

---

## 9. Integration & Expansion Opportunities

1. **Direct Clearinghouse SFTP (Availity / Change Healthcare / Claim.MD)**: Connect the ASC X12 837P EDI generator to live clearinghouse SFTP endpoints for automated claim adjudication and 835 remittance ingestion.
2. **Chartered BaaS Partnership (Unit / Column / Stripe Treasury)**: Transition the TheraFlow Money embedded treasury engine from double-entry simulation to live FDIC-insured business checking accounts and automated ACH disbursements.
3. **Gusto Partner API Integration**: Convert the generated payroll batch CSV exports into automated Gusto Partner API mutations for zero-touch federal and state payroll tax filing.
4. **SMART on FHIR Hospital Bridges**: Extend the existing FHIR R4 `DocumentReference` payload formatters into full OAuth2 SMART on FHIR integrations with Epic App Orchard and Oracle Health Cerner.

---

## 10. Repository, Release & Verification Reference

- **Git Repository:** `https://github.com/alexmarshiamft/clinical_saas_launch`
- **Release Tag:** `v1.1.0-security-remediated`
- **Verified Commit SHA:** `4113573e982e6176ea8c71c3deb2862f44a6f11e` (latest docs commit: `9518a84`)
- **Branches:** `master` · `remediation-pass-2`
- **GitHub Actions Runs:**
  - Master: [Run 37511948228](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37511948228) (100% Green ✓)
  - Remediation Branch: [Run 37511959898](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37511959898) (100% Green ✓)
- **Primary Due Diligence Artifacts:**
  - [`BUYER_HANDOFF.md`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/BUYER_HANDOFF.md) — Comprehensive technical handoff and replacement analysis
  - [`THERAFLOW_ACQUISITION_DUE_DILIGENCE.md`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/THERAFLOW_ACQUISITION_DUE_DILIGENCE.md) — Exhaustive technical audit report
  - [`clinical_saas_investor_presentation.pdf`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/clinical_saas_investor_presentation.pdf) — 14-slide widescreen presentation deck
  - [`clinical_saas_platform_walkthrough.pdf`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/clinical_saas_platform_walkthrough.pdf) — 16-page visual walkthrough document
