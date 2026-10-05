# Technical Due Diligence & Acquisition-Readiness Audit
## Asset: TheraFlow Clinical OS / Clinical Telehealth & AI Scribe SaaS
**Audit Date:** October 5, 2026  
**Auditor:** Autonomous Technical Due Diligence Agent (DeepMind / Antigravity Engine)  
**Target Repository:** `github.com/alexmarshiamft/clinical_saas_launch`  
**Production Deployment:** `https://clinicalsaaslaunch.vercel.app`  
**Audited Commit / Version:** `master` (`428a2d7`) / Node.js v24.14.1 / TypeScript 5.8 / Vite 6.4.3  

---

## 1. Executive Verdict

| Due Diligence Dimension | Score (0–10) | Executive Verdict Summary |
|:---|:---:|:---|
| **Technical Completeness** | **6.5 / 10** | High frontend completeness with 4 deeply designed clinical workspaces, extensive client-side logic, and rich interactivity. However, core multi-user persistence, real-time audio ML diarization, live WebRTC media relays, and clearinghouse integrations are either simulated, fallback-driven, or client-side only. |
| **Production Readiness** | **5.0 / 10** | Deploys cleanly to Vercel/Node with zero build errors and strong static performance. However, without external Supabase credentials and a live Stripe key, the system operates purely in simulated local-storage sandbox mode. It cannot safely onboard paying clinical customers until a multi-tenant backend database and HIPAA BAA infrastructure are operational. |
| **Code Quality** | **8.5 / 10** | Extremely clean, modern TypeScript / React 19 codebase. Strict typing throughout, zero `TODO` or `FIXME` debris, strong component modularity, scoped CSS namespaces, robust input sanitization, and extensive defensive programming against prototype pollution and XSS. |
| **Maintainability** | **8.0 / 10** | Well-organized directory architecture (`src/tools/*`, `src/lib/*`, `src/components/*`), clear separation of concerns, comprehensive fixture data, readable variable interpolators, and standard Vite/React conventions. An experienced TypeScript engineer can navigate the codebase immediately. |
| **Security Readiness** | **5.5 / 10** | Commendable client-side security: zero hardcoded live secrets in source control, strict session envelope anti-forgery parsing, input boundary fuzzing, and client-side Safe Harbor regex redaction. However, storing clinical notes, audit logs, and auth state in unencrypted browser `localStorage` violates clinical HIPAA data-at-rest mandates for shared clinician workstations. Nine npm audit vulnerabilities (7 high, 2 moderate) exist in build tooling. |
| **Commercial Readiness** | **4.5 / 10** | Commercial pricing UI, tier calculation (monthly/annual 20% discount), and Stripe checkout endpoints are implemented with fallback simulation. However, recurring webhook subscription fulfillment, invoice PDF generation, automated customer portal, and tax compliance are unintegrated. |
| **Acquisition Readiness** | **6.0 / 10** | Highly valuable as a **Turnkey Clinical Frontend Asset & Behavioral Health Workflow Engine**. An acquirer receives ~22,800 LOC of polished clinical UI, 18-rule Safe Harbor redaction heuristics, DSM-5 diagnostic databases, CMS-1500 layout generators, and 23,000 LOC of rigorous test harnesses. It provides 9–12 months of accelerated frontend development, but requires backend infrastructure attachment before enterprise licensing. |

---

## 2. Exact Product Inventory

| Feature / Subsystem | Implementation Classification | Primary Code Paths | Technical State & Functional Reality |
|:---|:---|:---|:---|
| **Dual-Engine Authentication** | **FUNCTIONAL WITH LIMITATIONS** | `src/lib/auth.tsx`<br>`src/lib/supabase.ts` | Authenticates via live Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided. When unconfigured, seamlessly falls back to a deterministic demo clinician session (`Dr. Sarah Chen, MD`). Session state is persisted in `localStorage` (`clinical_saas_session`). |
| **Access Control & Route Guards** | **FULLY FUNCTIONAL** | `src/components/guards/ProtectedRoute.tsx`<br>`src/components/guards/SubscriptionGate.tsx` | Strictly prevents unauthenticated access to all `/dashboard/*` routes. Blocks lower subscription tiers from accessing Pro features (Aura, Scribe) with an upgrade lock screen and trial bypass. |
| **Clinician Command Center** | **FULLY FUNCTIONAL** | `src/pages/DashboardHome.tsx`<br>`src/components/layout/*` | Active patient context bar, practice selector, schedule overview, metrics cards, and quick navigation into all 4 core clinical tools. Fully interactive in browser memory. |
| **TheraFlow EHR — Client Roster** | **FULLY FUNCTIONAL** | `src/tools/theraflow/ClientsView.tsx`<br>`src/tools/theraflow/data/theraflow-store.ts` | Complete client directory with search, filter by intake status, diagnosis code tags (ICD-10), session counters, and client detail routing. Stored in `localStorage` with Supabase sync hook. |
| **TheraFlow EHR — Client Chart & DAP** | **FULLY FUNCTIONAL** | `src/tools/theraflow/ClientProfileView.tsx`<br>`src/tools/theraflow/DAPNotesView.tsx` | Chronological session note history, formatted DAP (Data, Assessment, Plan) editor, CPT selector (90832, 90834, 90837), and direct integration with active patient context. |
| **TheraFlow EHR — Treatment Plans** | **FULLY FUNCTIONAL** | `src/tools/theraflow/TreatmentPlanView.tsx` | Interactive clinical goal builder, target dates, intervention strategies, and progress status tracking. |
| **TheraFlow EHR — Scheduling Calendar** | **FULLY FUNCTIONAL** | `src/tools/theraflow/CalendarView.tsx` | Multi-view calendar (Day, Week, Month) with appointment status filters, time slot grid, and direct telehealth room launch triggers. |
| **Telehealth Consultation Room** | **DEMO / SIMULATION** | `src/tools/theraflow/TelehealthView.tsx`<br>`server.ts:397-427` | High-fidelity UI simulation of an encrypted WebRTC room. Features camera/microphone toggles, simulated audio level pulse, and session timer with CPT duration alerts. AWS Chime SDK is imported in `package.json`, and `server.ts` returns simulated Chime meeting tokens. Real peer-to-peer audio/video streaming between two remote devices is **not** connected. |
| **Revenue Cycle & Claims Ledger** | **FULLY FUNCTIONAL** | `src/tools/theraflow/BillingView.tsx`<br>`src/tools/theraflow/data/demo-seed.ts` | Itemized invoice table with claim statuses (Paid, Submitted, Pending), insurance payer tracking, copay tracking, and payment simulation. |
| **CMS-1500 Superbill Generator** | **FULLY FUNCTIONAL** | `src/tools/theraflow/SuperbillModal.tsx` | Generates official CMS-1500 reimbursement statements with provider NPI (`1982736450`), Tax ID, taxonomy, diagnosis codes, CPT codes, place of service (`02 Telehealth`), and browser print layout. |
| **Direct EDI 837P Clearinghouse** | **NOT IMPLEMENTED** | N/A (Listed on Roadmap) | No ANSI ASC X12 EDI 837 transaction generator, 835 remittance parser, or clearinghouse API client (Availity / Change Healthcare) exists in the codebase. |
| **HIPAA Immutable Audit Logs** | **FUNCTIONAL WITH LIMITATIONS** | `src/lib/audit.ts`<br>`src/tools/theraflow/AuditLogsView.tsx`<br>`server.ts:430-520` | Real SHA-256 cryptographic hash-chaining algorithm (`entry.prevHash`, `GENESIS_HASH`, canonical verification). However, entries are stored in client `localStorage` and server memory, meaning a user can wipe or tamper with them locally. True immutability requires write-once backend storage. |
| **Multi-Site Practice Switcher** | **UI ONLY** | `src/components/layout/Header.tsx:80-120` | Visual dropdown allowing the clinician to toggle between 3 practice names. It modifies a local React state variable only; it does not partition the database, filter patient rosters, or isolate clinical data across tenants. |
| **Ambient Acoustic Diarization** | **DEMO / SIMULATION** | `src/tools/scribe/DiarizationFeed.tsx`<br>`src/tools/scribe/PreRecordedEncounters.tsx`<br>`src/tools/scribe/AudioRecorder.tsx` | Visual dual-speaker transcript interface with speaker attribution tags (`Dr. Chen:` vs `Jane Doe:`), manual role toggles, and animated SVG audio waveforms. Operates off 4 pre-recorded clinical encounter scripts. No client-side or server-side machine learning acoustic diarization model is executing on live microphone audio. |
| **Clinical Note Generation (Dual-Engine)** | **FULLY FUNCTIONAL** | `src/tools/scribe/ai-template-generator.ts`<br>`src/tools/theraflow/ai-note-expander.ts` | Dual-engine architecture: (1) Connects to live `@google/genai` (Gemini 2.5 Flash) when `GEMINI_API_KEY` is present. (2) Seamlessly falls back to an extensive rule-based heuristic clinical engine that parses clinical transcripts for CBT/PMR/EMDR keywords and generates structured notes across 6 templates in <5ms. |
| **Scribe Template Studio** | **FULLY FUNCTIONAL** | `src/tools/scribe/TemplateStudio.tsx`<br>`src/tools/scribe/variable-interpolator.ts` | Interactive drag-and-drop template editor with 7 clinical variable tokens (`{{patient_name}}`, `{{mrn}}`, `{{cpt_code}}`, etc.), custom section additions, and prototype pollution guards. |
| **Billing & Coding Assistant** | **FULLY FUNCTIONAL** | `src/tools/scribe/BillingCodingAssistant.tsx`<br>`src/tools/scribe/utils/codeSuggestionEngine.ts` | Keyword scoring engine that matches transcripts against ICD-10 psychiatric codes and maps elapsed minutes to standard CPT time brackets (90832, 90834, 90837, 90791). Generates AMA/CMS medical necessity statements. |
| **Multi-EHR Export Adapters** | **FULLY FUNCTIONAL (Formatting)** | `src/tools/scribe/utils/ehrExportAdapters.ts`<br>`src/tools/scribe/MultiEhrExportPanel.tsx` | Formats clinical notes into Epic SmartText dot-phrases, HL7 FHIR R4 `DocumentReference` JSON, Cerner PowerChart Millennium text, AthenaNet XML, and universal Markdown with delimiter sanitization. Generates clipboard/download payloads; does not execute REST API calls to hospital servers. |
| **Aura Diagnostic Copilot** | **FULLY FUNCTIONAL** | `src/tools/aura/AuraStudio.tsx`<br>`src/tools/aura/data/dsm5-database.ts` | Searchable in-memory database of 7 DSM-5 psychiatric diagnoses with full diagnostic criteria checklists, threshold counters, clinical suggestion chips, and evidence-based interventions. |
| **Aura Typewriter SOAP Generator** | **FULLY FUNCTIONAL** | `src/tools/aura/TypewriterSoap.tsx` | Generates standardized clinical SOAP notes based on selected criteria with simulated streaming typewriter animation, copy action, and direct "Insert to EHR" state synchronization. |
| **Aura Floating Action Orb** | **FULLY FUNCTIONAL** | `src/tools/aura/AuraFloatingOrb.tsx`<br>`src/tools/aura/aura-shadow.css` | Persistent floating copilot button accessible across all dashboard pages with keyboard shortcut (`Alt + A`), expandable quick-action panel, and zero-leak scoped styling. |
| **HIPAA PHI Scrubber (18 Rules)** | **FULLY FUNCTIONAL** | `src/tools/phi-scrubber/engine.ts`<br>`src/tools/phi-scrubber/safeHarborRules.ts` | 100% browser-local regex rule engine with patterns covering all 18 statutory Safe Harbor categories (Names, Locations, Dates, Phone, Email, SSN, MRN, Health Plan, URLs, IPs, Biometrics, etc.) with active patient context matching. Zero network transmission. |
| **PHI Scrubber Diff Viewer & Masks** | **FULLY FUNCTIONAL** | `src/tools/phi-scrubber/DiffViewer.tsx`<br>`src/tools/phi-scrubber/AuditTable.tsx` | Side-by-side visual diff viewer with 3 interchangeable masking modes: Tag `[NAME]`, Block `████`, and Asterisk `***`. Renders forensic audit metric cards and exports JSON/CSV audit reports. |
| **Stripe Commercial Subscription** | **FUNCTIONAL WITH LIMITATIONS** | `src/pages/Subscription.tsx`<br>`src/lib/subscription.tsx`<br>`server.ts:155-296` | 3-tier pricing UI ($49, $99, $249) with monthly/annual 20% discount calculation. Express backend initiates Stripe Checkout sessions when `STRIPE_SECRET_KEY` is present, or generates simulated test sessions when absent. Fulfills subscription status in client `localStorage`. Webhook-driven auto-renewals are not connected to a database. |

---

## 3. Claim-Verification Matrix

| Marketing / Investor Material Claim | Verification Status | Implementation Evidence & Technical Reality |
|:---|:---:|:---|
| **"Ambient Multi-Speaker Diarization"** | **SIMULATED** | `DiarizationFeed.tsx` and `PreRecordedEncounters.tsx` render structured arrays of pre-written dialogue turns. The audio recorder (`AudioRecorder.tsx`) activates the microphone or runs an interval timer, but does not execute acoustic speaker-separation ML algorithms. Speaker roles can be manually toggled. |
| **"Real-Time Transcription"** | **SIMULATED** | Pre-scripted dialogues are fed into state or applied via sample encounters. Live browser Web Speech API or Whisper transcription is not wired into the ambient recording pipeline. |
| **"AI SOAP / DAP Note Generation"** | **VERIFIED** | Verified in `ai-template-generator.ts` and `ai-note-expander.ts`. Uses Google Gemini 2.5 Flash via `@google/genai` when an API key is configured. When unconfigured, an extensive deterministic clinical rule engine generates structured notes matching client demographics and clinical keywords in <5ms. |
| **"Local / In-Browser PHI De-Identification"** | **VERIFIED** | Verified in `src/tools/phi-scrubber/engine.ts`. The scrubbing function `scrubText()` runs synchronously in browser JavaScript memory. Zero network calls or external API dispatches occur during redaction. |
| **"Coverage of All 18 Statutory HIPAA Safe Harbor Rules"** | **PARTIALLY VERIFIED** | Verified in `safeHarborRules.ts`. The rule registry defines all 18 statutory categories with explicit 45 CFR citations and regex patterns. However, it relies on pattern heuristics and known context tokens (e.g., regex for addresses, SSNs, phone numbers). Unstructured, atypical patient names that lack title prefixes or context binding can evade regex matching (inherent to non-NER regex engines). |
| **"Zero Cloud / Unmasked PHI Leakage"** | **VERIFIED** | Verified through architectural inspection and automated security tests (`scripts/adversarial-security-audit.mjs` and `tests/tier5-adversarial-coverage.test.ts`). Unredacted text remains in client memory. Note: marketing claims stating that "no PHI touches the cloud" are true in the current demo because all data is 100% synthetic. |
| **"Encrypted WebRTC Telehealth"** | **SIMULATED** | `TelehealthView.tsx:1-10` explicitly states: *"Feature 12: Telehealth Encrypted WebRTC Room Simulation"*. `server.ts` returns mock Chime tokens. There is no active peer-to-peer WebRTC connection streaming live audio/video. |
| **"Enterprise Encryption & Security"** | **PARTIALLY VERIFIED** | HTTPS/TLS is enforced by Vercel on the edge. Local input sanitization protects against XSS, dot-phrase injections, and prototype pollution. However, sensitive clinical records and tokens are stored in plain text in browser `localStorage`, lacking client-side AES-GCM envelope encryption. |
| **"Immutable / Tamper-Evident Audit Logs"** | **PARTIALLY VERIFIED** | Verified in `src/lib/audit.ts`. Implements genuine SHA-256 cryptographic hash chaining (`prevHash -> sha256 -> hash`). Tests confirm that modifying a record payload or altering `prevHash` breaks ledger verification. However, the ledger resides in client `localStorage` and server memory, making it vulnerable to local clearing. True immutability requires write-once cloud storage. |
| **"CMS-1500 / Superbill Generation"** | **VERIFIED** | Verified in `SuperbillModal.tsx`. Generates accurate CMS-1500 health insurance reimbursement claims with clinician NPI, practice EIN, client demographics, ICD-10, CPT, and modifier codes with print/copy formatting. |
| **"ICD-10 & CPT Diagnostic Mapping"** | **VERIFIED** | Verified in `codeSuggestionEngine.ts`. Scans transcripts against clinical keyword indices (e.g., GAD-7, panic, trauma), scores diagnostic confidence, and maps session elapsed minutes to AMA CPT brackets (90832 for 30m, 90834 for 45m, 90837 for 60m, 90791 for intakes). |
| **"Stripe Subscription Billing"** | **PARTIALLY VERIFIED** | Verified in `server.ts:155-365`. Full Stripe SDK integration exists and creates live Stripe Checkout sessions when `STRIPE_SECRET_KEY` is provided. If absent, it provides an automated simulated checkout flow that activates subscription state in `localStorage`. Webhook handling (`stripe.webhooks.constructEvent`) is present in `server.ts:522-580`, but lacks a persistent database to update customer records. |
| **"Epic / Cerner / FHIR Interoperability"** | **PARTIALLY VERIFIED** | Verified in `ehrExportAdapters.ts`. Accurately formats clinical notes into Epic SmartText dot-phrases, HL7 FHIR R4 `DocumentReference` JSON (LOINC 11506-3), Cerner PowerChart numbered text, and AthenaNet XML with collision sanitization. It generates exportable payloads for copy-paste or file transfer, but does not connect to hospital REST APIs. |
| **"Direct EDI 837P Clearinghouse Integration"** | **UNSUPPORTED** | Claimed in roadmap / pitch deck materials for Q1 2027. No EDI 837 generation code or clearinghouse connection exists in the current codebase. |
| **"Multi-Site / Group Practice Isolation"** | **SIMULATED** | The header practice switcher (`Header.tsx`) updates local React state only. It does not partition database records, apply multi-tenant isolation, or enforce role-based clinic permissions. |

---

## 4. External Integrations: Real vs. Simulated

| Integration / Service | Category | Real vs. Simulated Status | Credentials / Requirements for Production Buyer |
|:---|:---:|:---:|:---|
| **Supabase (PostgreSQL & Auth)** | Database & Auth | **DUAL-ENGINE (Configured for Simulation)** | Currently operating in demo mode using `localStorage`. To activate real multi-tenant persistence, a buyer must configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, execute database migrations, and execute a signed HIPAA Business Associate Agreement (BAA) with Supabase (Enterprise tier). |
| **Stripe Payments** | Billing | **DUAL-ENGINE (Configured for Simulation)** | Full SDK code implemented. Currently operates in simulated sandbox mode generating `cs_test_simulated_*` session IDs. To activate real credit card billing, a buyer must provide `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in their production environment. |
| **Google Gemini API (`@google/genai`)** | AI Note Synthesis | **DUAL-ENGINE (Configured for Simulation)** | Full SDK client code implemented in `ai-template-generator.ts` and `ai-note-expander.ts` calling `gemini-2.5-flash`. Currently falling back to the deterministic clinical rule engine because `GEMINI_API_KEY` is omitted. To activate live LLM generation, a buyer must configure `GEMINI_API_KEY` and ensure a signed Google Cloud BAA covers Vertex AI / Gemini endpoints. |
| **Amazon Chime SDK Meetings** | Video Telehealth | **SIMULATED** | `@aws-sdk/client-chime-sdk-meetings` is installed in `package.json`, and an Express route `/api/telehealth/meeting` exists. However, it returns mock Chime session tokens and simulated WebRTC endpoints. To activate live video, a buyer must configure AWS IAM credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) and wire the Chime client SDK into the React video canvas. |
| **Epic Systems (Hyperspace / FHIR)** | EHR Bridge | **PAYLOAD FORMATTER ONLY** | Produces syntactically valid Epic dot-phrase SmartText and HL7 FHIR R4 JSON payloads. No live connection to Epic App Orchard, SMART on FHIR OAuth2, or hospital endpoints exists. To connect live, a buyer must register an Epic on FHIR developer app and implement OAuth2 handshake workflows. |
| **Oracle Health / Cerner (Millennium)** | EHR Bridge | **PAYLOAD FORMATTER ONLY** | Produces formatted Millennium PowerChart text. No network integration. Buyer requires Oracle Health Developer credentials and SMART on FHIR endpoints. |
| **AthenaHealth** | EHR Bridge | **PAYLOAD FORMATTER ONLY** | Produces AthenaNet XML representation. No network API integration. Buyer requires AthenaHealth Partner API credentials. |
| **Insurance Clearinghouses (Availity / Change Healthcare)** | Claims Filing | **UNINTEGRATED** | No EDI 837P batch generator or clearinghouse SFTP/REST connector exists. A buyer must build or license an EDI translation service to submit claims electronically. |

---

## 5. Architectural Blueprint & Data Flow

```
                      ┌────────────────────────────────────────────────────────┐
                      │                   CLIENT BROWSER                       │
                      │                                                        │
                      │   React 19 SPA (Vite 6) • Tailwind CSS • Base UI       │
                      │                                                        │
                      │  ┌──────────────────────────────────────────────────┐  │
                      │  │                   ROUTING                        │  │
                      │  │  /               Landing & Evaluator Guide       │  │
                      │  │  /login          Auth Gateway (Demo 1-Click)     │  │
                      │  │  /investor       14-Slide Widescreen Pitch Deck  │  │
                      │  │  /dashboard/*    Gated Clinical Command Center   │  │
                      │  └──────────────────────────────────────────────────┘  │
                      │                           │                            │
                      │  ┌────────────────────────▼─────────────────────────┐  │
                      │  │          CORE CLINICAL WORKSPACE ENGINES         │  │
                      │  │  1. TheraFlow EHR (Clients, Calendar, Billing)   │  │
                      │  │  2. Clinical AI Scribe v2 (Templates, Diarize)   │  │
                      │  │  3. Aura Diagnostic Assistant (DSM-5 Copilot)    │  │
                      │  │  4. HIPAA PHI Scrubber (18 Safe Harbor Rules)    │  │
                      │  └────────────────────────┬─────────────────────────┘  │
                      │                           │                            │
                      │  ┌────────────────────────▼─────────────────────────┐  │
                      │  │                 STATE & STORAGE                  │  │
                      │  │  • ClinicalContext (Active Patient, Notes, CPT)  │  │
                      │  │  • SubscriptionContext (Tier, Trialing, Active)  │  │
                      │  │  • AuthContext (Dr. Sarah Chen Session)          │  │
                      │  │  • LocalStorage ('clinical_saas_theraflow_v1')   │  │
                      │  └────────────────────────┬─────────────────────────┘  │
                      └───────────────────────────┼────────────────────────────┘
                                                  │
                                                  ▼ HTTP / API
                      ┌────────────────────────────────────────────────────────┐
                      │              BACKEND / MIDDLEWARE RUNTIME              │
                      │                                                        │
                      │  Express 4 on Node.js (server.ts)                      │
                      │  Deployed on Vercel Serverless / Node Container        │
                      │                                                        │
                      │  Endpoints:                                            │
                      │  • GET  /api/health                                    │
                      │  • POST /api/create-checkout-session (Stripe/Sim)      │
                      │  • GET  /api/subscription/session/:id                  │
                      │  • GET  /api/subscription/status                       │
                      │  • POST /api/telehealth/meeting (Chime/Sim)            │
                      │  • GET  /api/audit-logs                                │
                      │  • POST /api/audit-logs                                │
                      └───────┬──────────────────────┬─────────────────────────┘
                              │                      │
                   (When Configured)          (When Configured)
                              │                      │
                              ▼                      ▼
                      ┌───────────────┐      ┌───────────────┐
                      │   Supabase    │      │    Stripe     │
                      │ PostgreSQL &  │      │  Checkout &   │
                      │   GoTrue Auth │      │   Webhooks    │
                      └───────────────┘      └───────────────┘
```

### Key Subsystems:
1. **Frontend**: Single-Page Application (SPA) built with React 19, TypeScript 5.8, Tailwind CSS, Base UI, Lucide icons, and React Router 7.
2. **Local Browser Processing**:
   - **PHI Scrubber Engine**: Executes 18 statutory Safe Harbor regex categories synchronously in browser memory.
   - **Template Variable Interpolation**: Replaces `{{patient_name}}`, `{{cpt_code}}`, etc., with prototype-pollution guards.
   - **Audit Hash-Chaining**: Calculates client-side SHA-256 hashes for each logged event.
3. **Backend Middleware**: Express 4 server (`server.ts`) hosting REST endpoints for Stripe checkout sessions, audit logging, and health preflight checks. Integrated with Vite development middleware for local HMR.
4. **Hosting & Deployment**: Configured via `vercel.json` for Vercel deployment with single-page app rewrite rules and Node.js runtime targeting.

---

## 6. Security and Privacy Audit

### 6.1 Vulnerabilities & Implementation Gaps
1. **Plain-Text Client Storage (`localStorage`)**:
   - *Risk*: Patient charts, consultation transcripts, DAP notes, and audit logs are stored unencrypted in `localStorage` under `clinical_saas_theraflow_store_v1`.
   - *Impact*: In a multi-user clinical environment (e.g., shared hospital workstations or clinic laptops), any local user or browser extension with access to DevTools can read or extract stored records.
2. **Client-Side Non-Authoritative Subscription Gating**:
   - *Risk*: Subscription checks (`useSubscription`) verify tier state in `localStorage` (`clinical_saas_subscription_v1`).
   - *Impact*: A technically competent user can bypass feature paywalls by modifying `localStorage.setItem('clinical_saas_subscription_v1', JSON.stringify({ status: 'active', tier: 'group' }))` in the browser console.
3. **Mock Audit Log Persistence**:
   - *Risk*: While audit logs are cryptographically hash-chained with SHA-256, the ledger is stored in `localStorage` and server memory (`auditLogStore = []`).
   - *Impact*: An attacker or compromised account can clear the audit trail using `localStorage.removeItem()`, defeating the non-repudiation intent of HIPAA § 164.312(b).
4. **Dependency Audit Findings (`npm audit`)**:
   - *Result*: 9 vulnerabilities (7 High, 2 Moderate).
   - *Details*: High-severity ReDoS in `braces` / `micromatch` (via `@shadcn/registry` and `fast-glob`), and moderate buffer bounds vulnerability in `uuid` (via `amazon-chime-sdk-component-library-react`).

### 6.2 Positive Security Controls Implemented
1. **Zero Hardcoded Production Secrets**:
   - Thorough repository scanning confirmed zero active Stripe live keys (`sk_live`), AWS access tokens, or Supabase service keys are checked into Git.
2. **Defensive Input Handling & Prototype Pollution Guards**:
   - All variable interpolators (`variable-interpolator.ts`) explicitly guard against `__proto__`, `constructor`, and `prototype` manipulation.
   - Server endpoints validate `planId` against an explicit whitelist (`Object.prototype.hasOwnProperty.call(VALID_PLANS, planId)`), rejecting SQL injection strings and prototype keys with HTTP 400.
3. **Open Redirect Sanitization**:
   - Login query parameter redirects are strictly sanitized to internal routes, blocking external phishing URLs (e.g., `?redirect=https://evil.com` or `javascript:...`).
4. **EHR Delimiter Sanitization**:
   - Epic SmartText and Cerner export adapters sanitize triple-equals delimiters (`===`), dot-phrases (`.MARSHI`), and forged signature lines before rendering export text, preventing clinical template injection attacks.

> [!CAUTION]
> **HIPAA Legal Compliance Notice:** TheraFlow OS is **not** currently certified by any third-party auditor (e.g., SOC2 Type II, HITRUST CSF, or independent HIPAA audit). While its architectural design enforces client-side de-identification heuristics, it cannot be characterized as legally HIPAA compliant until deployed on BAA-backed infrastructure with encrypted databases, centralized access controls, and formal business policies.

---

## 7. Test Evidence & Verification Results

### 7.1 Automated Suites Executed Live During Audit

| Test Suite / Script | Command Executed | Tests Passed | Tests Failed | Total Asserts | Audit Status | Key Subsystem Verified |
|:---|:---|:---:|:---:|:---:|:---:|:---|
| **Auth Redirection & Session Audit** | `npm run test:auth` | 12 | 0 | 12 | **PASS (100%)** | Route guards, unauthenticated redirects, demo clinician login, session persistence |
| **Adversarial Auth Security** | `npm run test:security` | 26 | 0 | 26 | **PASS (100%)** | Corrupt storage parsing, session forgery, open redirect defense, expired tokens |
| **Stripe Checkout Engine** | `npm run test:stripe` | 15 | 0 | 15 | **PASS (100%)** | Ephemeral server, tier pricing, planId fuzzing, session retrieval registry |
| **Subscription Gate & Tiers** | `npm run test:subscription` | 17 | 0 | 17 | **PASS (100%)** | Route paywalls, trial activation, tier upgrade gating (Starter vs Pro), badge sync |
| **Challenger Milestone 2 Stress** | `npm run test:challenger:m2` | 53 | 0 | 53 | **PASS (100%)** | Server fuzzing (50+ payloads), LRU cache eviction (1,100 sessions), URL parameter tampering |
| **CSS Scoped Bleed Verification** | `npm run test:css` | 1 | 0 | 1 | **PASS (100%)** | Verifies zero global style leakage across scoped tool stylesheets (`.heidi-scribe-theme`, `:host`) |
| **TheraFlow EHR Verification** | `npm run test:ehr` | 30 | 0 | 30 | **PASS (100%)** | Client roster, DAP note editor, treatment plans, calendar scheduler, superbill modal |
| **Clinical AI Scribe v2 Suite** | `npm run test:scribe` | 61 | 0 | 61 | **PASS (100%)** | 6 clinical templates, deterministic synthesis (<50ms), variable interpolation, CPT engine |
| **Challenger Milestone 4 Stress** | `npm run test:challenger:m4` | 44 | 0 | 44 | **PASS (100%)** | 50-cycle section reordering, 50-section templates, ReDoS safety on 50KB transcripts |
| **Aura & PHI Scrubber Suite** | `npm run test:aura` | 85 | 0 | 85 | **PASS (100%)** | 18 Safe Harbor rules, character offset verification, DSM-5 database, typewriter streaming |
| **Tier 5 Adversarial Hardening** | `npx tsx tests/tier5...` | 87 | 0 | 87 | **PASS (100%)** | 17 distinct Safe Harbor category triggers, interval scheduling, Epic/Cerner export sanitization |
| **Comprehensive E2E Harness** | `npm run test:e2e` | 79 | 1 | 80 | **98.8% PASS** | 4-tier opaque-box E2E test harness covering features, boundaries, cross-tool flows, and clinical scenarios |

**Grand Total Live Executions:** **509 passing test assertions, 1 failure.**

### 7.2 Failure Analysis (T1.2.1)
- **Failing Assertion:** `T1.2.1 [Dashboard] AppLayout shell renders Sidebar, Header, and HIPAA banner`
- **Root Cause:** In a recent commit adding legal synthetic data disclaimers, the footer banner text in `AppLayout.tsx:36` was updated from `CONFIDENTIAL & HIPAA PROTECTED` to `LEGAL NOTICE & SYNTHETIC DATA DISCLAIMER`. The legacy E2E test asserted `html.includes('CONFIDENTIAL &amp; HIPAA PROTECTED')`.
- **Severity:** P3 (Trivial test string assertion mismatch; zero runtime defect).

### 7.3 Uncovered Testing Areas (Gaps)
1. **Live Stripe Webhook Ingestion**: Tests verify session creation and verification endpoints, but do not test real-time Stripe HMAC signature parsing (`stripe-signature`) against a live Stripe CLI daemon.
2. **Multi-User Concurrency**: Storage tests use synchronous mock storage; there are no concurrency stress tests for two clinicians writing to the same Supabase database row simultaneously.
3. **Real Audio Hardware**: Scribe audio tests verify DOM visualizers and pre-recorded streams; browser microphone permissions and Web Audio API buffer overflows are not tested on physical hardware.

---

## 8. Codebase Metrics & Statistics

```
====================================================================
                     THERAFLOW OS CODE METRICS                      
====================================================================
Total Production Source Files (src/ + server.ts) : 83 files
Total Production Lines of Code (LOC)             : 22,807 lines
Total Test & Verification Code (tests/ + scripts): 22,962 lines
Total Repository LOC                             : 45,769 lines
Test-to-Production Code Ratio                    : 1.01 : 1.00 (High Test Density)
Total Core Routes Configured                     : 12 routes
Number of Major Tool Workspaces                  : 4 suites
Total TODO / FIXME Comments in Production Code   : 0 comments
Build Compilation Status (`npm run build`)       : CLEAN (0 errors, 4.44s)
TypeScript Static Check (`npm run typecheck`)    : CLEAN (0 errors)
Dependency Audit (`npm audit`)                   : 9 vulnerabilities (7 High, 2 Mod)
====================================================================
```

### Major Production Dependencies:
- **Core Framework**: React `19.0.0`, React DOM `19.0.0`, React Router DOM `7.3.0`
- **Backend**: Express `4.21.2`, Cors `2.8.5`, Dotenv `16.4.7`, UUID `11.1.0`
- **Cloud & AI SDKs**: `@supabase/supabase-js` `2.49.1`, `@google/genai` `0.1.2`, `stripe` `17.7.0`, `@aws-sdk/client-chime-sdk-meetings` `3.1015.0`
- **UI & Styling**: Tailwind CSS `4.0.0`, Lucide React `0.475.0`, Date-fns `4.1.0`, Sonner `2.0.1`
- **Tooling & Build**: Vite `6.4.3`, TypeScript `5.8.2`, TSX `4.19.3`, Playwright `1.57.0`

### Dead & Duplicated Code Audit:
- **Seed Redundancy**: Client fixture definitions are slightly duplicated between `src/tools/theraflow/data/demo-seed.ts` and `src/lib/clinical-context.tsx` (`DEFAULT_PATIENT` vs `SEED_CLIENTS[0]`).
- **Superbill Duplication**: `SuperbillModal.tsx` defines standard CPT and ICD-10 arrays that duplicate entries in `src/tools/scribe/data/codingData.ts`. Consolidating into a unified clinical taxonomy library is recommended.

---

## 9. Buyer Handoff Assessment

### What an Acquirer Receives Tomorrow:
1. **Turnkey Clinical Frontend**: A responsive, modern behavioral health web application with 4 integrated workspaces (EHR, AI Scribe, Aura Copilot, PHI Scrubber).
2. **Instant Demo Readiness**: Zero-configuration evaluator experience. The application runs immediately locally (`npm run dev`) or on Vercel without requiring external API keys.
3. **Statutory 18 Safe Harbor Engine**: An audited, pure JavaScript regex library implementing statutory HIPAA de-identification with three masking styles.
4. **Comprehensive Test Suite**: Over 440 automated tests verifying boundary handling, input fuzzing, prototype pollution resistance, and clinical data flow.
5. **Investor Presentation & Media**: A 14-slide widescreen presentation deck PDF, an 83-second automated video walkthrough, and 15 Retina screenshots.

### What Works Immediately (Day 1):
- Client charting, DAP note drafting, treatment plan authoring, and appointment scheduling in browser memory.
- Instant SOAP note formulation via the deterministic clinical rule engine across 6 templates.
- Complete 18-rule PHI scrubbing with side-by-side diff comparison and audit log export.
- CMS-1500 superbill formatting and browser printing.
- Subscription gating, tier calculations, and simulated Stripe checkout sessions.

### Implicit Knowledge & Gaps:
- **Simulated vs. Real Boundaries**: An acquirer must understand that audio diarization, WebRTC video, and Epic/Cerner export are currently simulated or payload-based.
- **Storage Strategy**: The dual-engine store (`theraflow-store.ts`) requires knowledge of how Supabase tables map to local state to enable PostgreSQL persistence.

### Required Secrets for Production Activation:
```bash
# Required to enable multi-tenant database & cloud authentication
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Required to enable real credit card transactions
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Required to activate live Gemini AI note expansion
GEMINI_API_KEY="AIzaSy..."

# Required to activate live AWS Chime video consultations
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
```

### Onboarding Difficulty:
- **Score: Low to Moderate (2–3 days for a competent senior full-stack engineer).**
- The repository follows standard Vite/React project conventions. Clean scripts, strict typing, and zero native C++ bindings allow rapid onboarding.

---

## 10. Replacement-Cost Analysis

Estimated engineering, design, and clinical informatics hours required to reproduce the current product from scratch to its present level of polish:

| Subsystem | Scope & Complexity | Low Est. (Hours) | Base Est. (Hours) | High Est. (Hours) |
|:---|:---|:---:|:---:|:---:|
| **Foundation, Layout & Auth** | Shell, responsive sidebar, header context, demo 1-click auth, route guards, subscription paywall | 80 | 120 | 160 |
| **TheraFlow Clinical EHR** | Client roster, DAP note editor, treatment plan builder, calendar grid, demo store, audit trail | 180 | 250 | 340 |
| **Clinical AI Scribe v2** | Audio recorder UI, waveform visualizer, diarization feed, 6 clinical templates, deterministic engine, Gemini integration | 160 | 220 | 300 |
| **Template Studio & EHR Adapters** | Drag-drop section builder, variable interpolation, prototype guards, Epic/Cerner/Athena formatting sanitizers | 100 | 140 | 190 |
| **Aura Diagnostic Copilot** | Indexed DSM-5 database, diagnostic differential assistant, typewriter SOAP generator, floating action orb | 110 | 150 | 200 |
| **HIPAA PHI Scrubber** | 18 Safe Harbor regex rules, interval scheduler, Tag/Block/Asterisk masking, side-by-side diff, forensic table | 140 | 190 | 260 |
| **Billing & CMS-1500 Superbills** | Claims ledger, CMS-1500 layout generator, ICD-10/CPT coding engine, print/copy formats | 90 | 130 | 180 |
| **Commercial Stripe & Subscription** | Pricing table, annual 20% discount logic, Express checkout endpoints, session verification | 70 | 100 | 140 |
| **Test Engineering & Hardening** | 25+ test suites, boundary harnesses, input fuzzers, E2E runners, challenger stress suites | 180 | 260 | 360 |
| **DevOps, Video & Documentation** | Automated Playwright recording scripts, PDF generators, Vercel CI/CD configuration | 50 | 80 | 110 |
| **TOTALS** | | **1,160 hrs** | **1,640 hrs** | **2,240 hrs** |

### Financial Valuation of Implemented Codebase:
- At a blended market rate of **$125 / hour** (experienced US full-stack healthcare software engineer):
  - **Low Estimate:** $145,000 (1,160 hours)
  - **Base Estimate:** **$205,000** (1,640 hours)
  - **High Estimate:** $280,000 (2,240 hours)

---

## 11. Technical Debt and Remaining Work

### Priority 0 (P0) — Blocks Real Paying Customers
1. **Unencrypted `localStorage` Clinical Persistence**: Real patient health information must not be stored in unencrypted browser storage. Must be backed by a HIPAA-compliant PostgreSQL database with Row-Level Security (RLS) and encrypted data-at-rest.
2. **Client-Side Enforced Subscriptions**: Subscription status must be validated server-side on API endpoints rather than in client `localStorage` to prevent paywall bypasses.
3. **HIPAA Business Associate Agreements (BAAs)**: Production infrastructure (Vercel, Supabase, Google Cloud) must have executed BAAs prior to ingesting real patient encounters.

### Priority 1 (P1) — Strongly Affects Commercial Asset Value
1. **Simulated Telehealth Video**: Connect real WebRTC signaling via AWS Chime SDK or Daily.co to replace simulated video panes.
2. **Live Acoustic Diarization Integration**: Wire a real speech-to-text and diarization service (e.g., Deepgram Nova-2 Medical or Whisper with speaker clustering) for live microphone audio.
3. **Persistent Server-Side Audit Logs**: Transition audit log entries from memory/localStorage to an append-only, tamper-evident PostgreSQL table with write-only IAM permissions.
4. **Stripe Webhook Database Sync**: Connect Stripe webhook events (`customer.subscription.updated`, `invoice.payment_succeeded`) to a persistent database.

### Priority 2 (P2) — Should Be Improved
1. **Resolve npm Audit Vulnerabilities**: Upgrade `braces` and `shadcn` dependencies to resolve 7 high-severity advisory warnings.
2. **Consolidate Duplicate Taxonomies**: Merge duplicated CPT and ICD-10 constants across `SuperbillModal.tsx` and `codingData.ts` into a single library.
3. **Sync Practice Switcher to Context**: Wire the header practice selector into `ClinicalContext` so selecting a practice filters patient rosters accordingly.

### Priority 3 (P3) — Minor Polish
1. **Fix E2E Test T1.2.1 String Assertion**: Update test assertion in `tier1-features.test.mjs` to match the updated legal banner text.
2. **Consolidate Seed Fixtures**: Unify `DEFAULT_PATIENT` in `clinical-context.tsx` with `SEED_CLIENTS[0]` in `demo-seed.ts`.

---

## 12. The Five Highest-Value Improvements (Next 1–4 Weeks)

| # | Improvement Initiative | Commercial / Valuation Impact | Estimated Effort |
|:---:|:---|:---|:---:|
| **1** | **Activate Live Supabase Database Persistence**<br>Deploy PostgreSQL schema with RLS, connect `theraflow-store.ts`, and migrate clients, notes, and audit logs off `localStorage`. | **Critical Value Driver**: Transforms the asset from a client-side prototype into a multi-tenant cloud SaaS with persistent accounts. | **2 Weeks** (60–80 hrs) |
| **2** | **Integrate Deepgram Medical Audio Diarization**<br>Connect browser microphone streaming over WebSockets to Deepgram Nova-2 Medical for live speaker-separated transcription. | **Core Value Driver**: Converts marketing claim ("Ambient Diarization") into verified live capability, unlocking enterprise clinic demos. | **1.5 Weeks** (45–60 hrs) |
| **3** | **Enforce Server-Side Subscription Verification**<br>Add an Express JWT middleware validating active Stripe subscription status before serving API responses. | **Monetization Security**: Closes client-side paywall bypasses and ensures commercial revenue integrity. | **3 Days** (18–24 hrs) |
| **4** | **Wire Live WebRTC Video via Daily.co / Chime**<br>Replace simulated telehealth video panes with live two-way peer video and integrated hardware selector. | **Feature Completion**: Converts the simulated telehealth room into a functional virtual consultation suite. | **1 Week** (30–40 hrs) |
| **5** | **Deploy Append-Only Server Audit Ledger**<br>Store audit log entries in an append-only PostgreSQL table with cryptographic SHA-256 verification and PDF export. | **Regulatory Asset**: Provides verifiable audit compliance satisfying HIPAA § 164.312(b) for institutional buyers. | **4 Days** (20–25 hrs) |

---

## 13. Asset-Sale Readiness Classification

### Current Classification: **POLISHED PROTOTYPE / PRODUCTION-CAPABLE MVP**

```
[ Concept ] ──> [ Prototype ] ──> [ POLISHED PROTOTYPE / MVP ] ──> [ Commercial SaaS ]
                                             ▲
                                        (Current State)
```

### Defended Classification Rationale:
TheraFlow OS has progressed far beyond a wireframe, proof-of-concept, or standard prototype. It boasts **22,800 production LOC**, **23,000 test LOC**, clean build pipelines, and functional client-side engines (18-rule Safe Harbor redaction, deterministic clinical note synthesis, DSM-5 criteria evaluation, and CMS-1500 superbill formatting). It runs in production on Vercel with zero runtime crashes and includes an automated video and screenshot portfolio.

However, it cannot be classified as a mature **Commercial SaaS** because:
1. It does not yet persist multi-user data to an authoritative cloud database by default.
2. Ambient diarization and WebRTC video consultations operate as high-fidelity simulations.
3. Subscriptions are not validated by server-side authorization middleware.
4. Formal HIPAA certification and BAAs are not yet in place.

**Conclusion for an Acquirer:**  
TheraFlow represents an **exceptionally mature, high-craft frontend foundation**. An acquiring engineering team can bypass 1,600+ hours of clinical UX and workflow development, attaching their existing HIPAA backend infrastructure to launch a commercial product in 30–60 days.

---

## 14. Evidence Appendix

- **Production Deployment Verification**: `https://clinicalsaaslaunch.vercel.app` (Aliased, HTTP 200, Vercel Edge).
- **Source Code Repository**: `https://github.com/alexmarshiamft/clinical_saas_launch` (Branch: `master`, Commit: `428a2d7`).
- **Core Server & API Entry**: [`server.ts`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/server.ts) (594 lines, Stripe SDK, health checks, mock telehealth endpoints).
- **Dual-Engine Store**: [`src/tools/theraflow/data/theraflow-store.ts`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/data/theraflow-store.ts) (Dual Supabase / `localStorage` architecture).
- **Safe Harbor Redaction Rules**: [`src/tools/phi-scrubber/safeHarborRules.ts`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/phi-scrubber/safeHarborRules.ts) (462 lines, 18 statutory rule definitions with CFR citations).
- **Dual-Engine Note Synthesis**: [`src/tools/scribe/ai-template-generator.ts`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/scribe/ai-template-generator.ts) (Gemini 2.5 Flash + deterministic clinical rule engine).
- **EHR Export Adapters**: [`src/tools/scribe/utils/ehrExportAdapters.ts`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/scribe/utils/ehrExportAdapters.ts) (Epic SmartText, FHIR R4 JSON, Cerner PowerChart, Athena XML).
- **Cryptographic Audit Ledger**: [`src/lib/audit.ts`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/lib/audit.ts) (Pure synchronous SHA-256 hash chaining implementation).
- **Automated Video Tour Script**: [`scripts/record-demo-tour.mjs`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/scripts/record-demo-tour.mjs) (Playwright automation, 83-second tour).
- **Investor Deck PDF**: [`clinical_saas_investor_presentation.pdf`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/clinical_saas_investor_presentation.pdf) (14 slides, 16:9 widescreen format).
- **Walkthrough Portfolio PDF**: [`clinical_saas_platform_walkthrough.pdf`](file:///Users/alexandermarshi/teamwork_projects/clinical_saas_launch/clinical_saas_platform_walkthrough.pdf) (16 pages, 15 annotated Retina screenshots).
