# Strategic Acquisition Brief — TheraFlow OS
## Unified Behavioral-Health Practice Operating System

> **Asset Headline:** An integrated behavioral-health practice operating system connecting clinical care, revenue cycle, workforce compensation, payroll orchestration, and practice finances through a unified data model.  
> **Core Value Proposition:** Run your entire therapy practice in one place. One system from session to paycheck.  
> **Deal Type:** Strategic Asset Acquisition / Technology IP Transfer / White-Label Licensing  
> **Operational Stance:** Clean Synthetic Architecture • Zero Live PHI Ingestion • Zero Operational Liability  

---

## 1. Executive Summary & Strategic Value Proposition

TheraFlow OS solves the fundamental structural problem in the behavioral health software market: **the multi-app fragmentation tax**.

Today, a clinician starting a private practice—or an established group practice managing 10 to 50 therapists—is forced to stitch together a disconnected tech stack:
- SimplePractice or TherapyNotes for EHR and scheduling
- An external billing agency or clearinghouse for claims
- Custom Excel spreadsheets to calculate clinician split compensation
- Gusto or ADP for payroll
- Separate WebRTC software for telehealth
- Heidi Health or Freed for AI transcription
- Chase Business Online or QuickBooks for banking and cash management

This fragmentation forces double data entry, creates audit vulnerabilities, causes frequent compensation errors, and obscures practice margins.

### The Unified Product Thesis:
> **“A clinician starting a private practice — or an established group practice replacing its software stack — should not have to choose between SimplePractice + Gusto, TherapyNotes + ADP, an external biller, separate telehealth, separate AI scribe, spreadsheets, and banking tools. They should be able to choose TheraFlow.”**

The central architectural principle is:
### **Enter clinical activity once. Everything downstream derives from it.**

```
Appointment 
  ↓ 
Clinical Encounter 
  ↓ 
Clinical Note (SOAP) 
  ↓ 
CPT / Service Info 
  ↓ 
Claim / Patient Charge 
  ↓ 
Payment / ERA / Deposit 
  ↓ 
Clinician Compensation Engine 
  ↓ 
Payroll Earnings Ledger 
  ↓ 
ACH Payroll Funding / Practice Financial Reports
```

---

## 2. Core Subsystems & Technical Assets Delivered

| Subsystem | Strategic Capability | Technical Value to Acquirer |
| :--- | :--- | :--- |
| **TheraFlow Workforce** | Provider roster, W-2 vs 1099 classification, supervisor relationships, Type 1 NPIs, licenses, weekly target hours, and utilization tracking. | Full behavioral health workforce data model ready for multi-location group practices. |
| **Clinician Compensation Engine** | Tiered volume splits (50%–60%), collections splits, CPT flat rates (90837, 90834, 90847, 90791), late cancellation fees, and documentation promptness bonuses (<24h). | Eliminates custom spreadsheets; deterministic rules produce auditable formulas for every cent earned. |
| **TheraFlow Payroll Orchestrator** | Pre-review aggregation, clinician payroll summaries, provider abstraction (`PayrollProvider`), and adapters for Gusto, ADP, and Sandbox ACH direct deposit. | Bridges healthcare clinical activity directly into mainstream payroll processors with zero duplicate data entry. |
| **TheraFlow Money (Embedded BaaS)** | Multi-vault treasury (Operating Checking, Automated 25% Tax Reserve Vault, Payroll Escrow), real-time unit economics waterfall, and claim-to-bank reconciliation. | Unlocks embedded finance ARR (interchange, deposit float, BaaS subscriptions) for the software acquirer. |
| **Clinical AI Scribe v2** | Ambient dual-channel acoustic transcription, speaker turn diarization, template studio (SOAP, DAP, BIRP, Intake), and multi-EHR export adapters. | Eliminates third-party scribe vendor costs; provides proprietary acoustic recording and note synthesis. |
| **TheraFlow EHR & Telehealth** | Patient charts, psychiatric timelines, treatment goals, WebRTC two-party video suite, session timer, and CPT billing crosswalks. | Modern, responsive React 19 clinical interface built for high clinician retention. |
| **HIPAA Safe Harbor PHI Scrubber** | Client-side 18-rule statutory Safe Harbor de-identification engine with Tag, Block, and Asterisk masking plus cryptographic audit trails. | Enables safe cloud/LLM utilization by pre-sanitizing clinical payloads before external transmission. |
| **Fail-Closed Privacy Gateway** | Intercepts outbound AI requests, checks for direct identifier leakage, and falls back to deterministic rule-based clinical templates. | Mitigates AI hallucination and PHI breach liability for the platform operator. |
| **CMS-1500 & 837P EDI Engine** | Interactive 33-box HCFA editor, instant Superbill generator, and raw ASC X12 837P electronic claim file generator. | Instantly bridges clinical documentation into insurance reimbursement pipelines. |
| **Multi-Tenant Persistence Schema** | Complete PostgreSQL 15 / Supabase migration schema (24 tables) with Row-Level Security (RLS) enforcing strict tenant and group practice isolation. | Ready to deploy into AWS RDS, Supabase, or Google Cloud SQL with zero architecture redesign. |

---

## 3. Replacement Cost & Build vs. Buy Analysis

| Cost Component | In-House Build (9–15 Months) | TheraFlow OS Acquisition | Acquirer Advantage |
| :--- | :---: | :---: | :--- |
| **Senior Full-Stack Architect (React 19 / TS)** | $220,000 – $260,000 | Included | Immediate access to clean, modern React 19 / TypeScript code. |
| **Healthcare FinTech & Compensation Engineer** | $200,000 – $240,000 | Included | Pre-built compensation engine, Gusto/ADP adapters, and BaaS ledger. |
| **Healthcare / EHR Integration Engineer** | $170,000 – $210,000 | Included | Pre-built Epic SmartText, FHIR R4, and 837P EDI claim generators. |
| **Clinical UX & Behavioral Health SME** | $100,000 – $140,000 | Included | Workflows pre-aligned to DSM-5 criteria, CPT splits, and group practices. |
| **Security, PHI Scrubber & Audit R&D** | $110,000 – $150,000 | Included | Statutory 18-rule engine with 81.6% holdout recall and SHA-256 chain. |
| **Opportunity Cost / Time-to-Market Delay** | 9 to 15 Months | **3 to 4 Weeks** | Immediate product launch or feature release to existing customers. |
| **Total Estimated Replacement Cost:** | **$800,000 – $1,000,000** | **Asking: $325,000 – $450,000** | **60% to 68% Cost Savings + 12 Months Time Saved** |

---

## 4. Strategic Buyer Strategic Alignment Matrix

### 1. Behavioral-Health Specialized EHRs (SimplePractice, TherapyNotes, Valant, Osmind)
- **Strategic Threat**: Clinicians are defecting to vertical platforms that include native AI scribes and automated payroll calculations.
- **Acquisition Value**: Instantly integrate native AI acoustic diarization, clinician compensation rules, and Gusto/ADP payroll orchestration to eliminate churn and capture $49–$99/clinician/mo in expansion ARR.

### 2. Practice Management & Medical Billing Platforms (Kareo/Tebra, AdvancedMD)
- **Strategic Need**: Expanding beyond administrative scheduling and claims into clinical care and practice banking.
- **Acquisition Value**: Acquire turnkey clinical charting, telehealth, and claim-to-bank deposit reconciliation.

### 3. Payroll & Workforce Management Companies (Gusto, ADP, Rippling, Paychex)
- **Strategic Intent**: Vertical SaaS expansion into high-margin healthcare verticals.
- **Acquisition Value**: Deploy a dedicated "Gusto for Therapy Practices" or "ADP Behavioral Health" vertical operating system that feeds gross compensation directly into their core payroll tax engines.

### 4. Vertical SaaS & Embedded-Finance Platforms (Toast/Mindbody equivalents for Healthcare)
- **Strategic Intent**: Becoming the operating system of therapy practices to monetize payments, banking float, and interchange.
- **Acquisition Value**: TheraFlow's embedded treasury and BaaS multi-vault architecture allows financial platforms to instantly launch practice checking, automated tax reserve vaults, and claim factoring.

### 5. Revenue Cycle Management (RCM) & Clearinghouse Providers (Waystar, Availity)
- **Strategic Value**: Upstream integration directly into the clinician encounter and SOAP note, capturing clean 837P claims and closing the remittance-to-payroll loop.

### 6. Telehealth Platforms & Provider Networks (Talkspace, Lyra Health, Amwell)
- **Strategic Value**: Custom in-house clinician tooling to reduce documentation burnout, manage associate clinician supervision, and automate biweekly 1099/W-2 contractor disbursements.

### 7. Clinical AI & Scribe Companies (Freed, Heidi Health, Abridge)
- **Strategic Need**: Expanding from a single-point transcription utility into a complete practice operating system to prevent being commoditized by EHR vendors.
- **Acquisition Value**: Acquire an instant EHR, billing suite, workforce module, and embedded banking layer to become a full-suite platform.

---

## 5. Transaction Structure & Buyer Next Steps

The asset is packaged for an immediate, clean transaction:
- **Asset Purchase Agreement (APA)** transferring all source code, git history, documentation, tests, and IP.
- **Clean Synthetic Separation**: Zero real patients, zero real PHI on disk, zero active clinician support liabilities, and zero money transmitter entanglements.
- **Production-Grade Documentation**: Complete with `ARCHITECTURE.md`, `WORKFORCE_AND_COMPENSATION_ARCHITECTURE.md`, `PAYROLL_INTEGRATION_ARCHITECTURE.md`, `EMBEDDED_BANKING_ARCHITECTURE.md`, and `UNIFIED_PRACTICE_LEDGER.md`.
