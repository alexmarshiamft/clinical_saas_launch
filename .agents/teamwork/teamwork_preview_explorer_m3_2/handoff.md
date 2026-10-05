# Milestone 3 Handoff Report: DAP Notes, Treatment Plans, Invoicing & Superbills (Features 10 & 11)

**Agent**: Explorer 2 (`teamwork_preview_explorer_m3_2`)  
**Parent / Recipient**: `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`  
**Milestone**: Milestone 3 (TheraFlow EHR & Telehealth — Features 10 & 11)  
**Date**: October 5, 2026  

---

## 1. Observation

1. **Canonical Implementation**:
   - `/Users/alexandermarshi/Downloads/theraflow/pages/NoteEditor.tsx`:
     - Lines 31–37 define note state with `date_of_service`, `d_text`, `a_text`, `p_text`, `is_locked`.
     - Lines 99–154 handle saving draft or locking note (`is_locked: lock`) and log audit events.
     - Lines 160–180 handle AI note generation using `generateDAPNote(shorthand)` from `lib/gemini.ts`.
     - Lines 278–316 render textareas for Data (D), Assessment (A), and Plan (P).
     - **Observed Gap**: The canonical implementation lacks guided clinical prompt headings, quick symptom/intervention chips, and fails gracefully to an offline engine if `GEMINI_API_KEY` is not present.
   - `/Users/alexandermarshi/Downloads/theraflow/pages/TreatmentPlanEditor.tsx`:
     - Lines 23–29 define state with `diagnosis`, `goals`, `objectives`, `interventions`, `status`.
     - **Observed Gap**: Missing `problem_statement`, structured milestone objectives with individual `target_date`, overall `target_completion_date`, and evidence-based presets (e.g. GAD, MDD, PTSD).
   - `/Users/alexandermarshi/Downloads/theraflow/pages/Billing.tsx`:
     - Lines 19–33 manage invoices, client list, and creation modal.
     - Lines 152–158 calculate `totalOutstanding` and `totalPaid`.
     - Lines 339–347 render status badges for `paid`, `unpaid`, `void`.
     - **Observed Gap**: Lacks distinction between `pending` and `overdue` (unpaid invoices past their due date); lacks session fee breakdown.
   - `/Users/alexandermarshi/Downloads/theraflow/components/SuperbillDialog.tsx`:
     - Lines 14–19 hold manual inputs for `cptCode`, `icdCode`, `providerNpi`, `providerTaxId`.
     - Lines 63–131 render `#superbill-print-area` triggered by `window.print()`.
     - **Observed Gap**: Provider credentials require manual typing instead of auto-populating from `useAuth()` clinician profile; CPT and ICD-10 codes are unvalidated free text rather than selectable clinical codes.
   - `/Users/alexandermarshi/Downloads/theraflow/src/data/demo_seed.json` & `/Users/alexandermarshi/Downloads/theraflow/supabase/demo_seed.sql`:
     - Defines 10 canonical clinical patients (Elena Reyes, Marcus Chen, Sarah Jenkins, etc.) with provider ID `a0000000-0000-4000-8000-000000000001` matching `DEMO_CLINICIAN_USER` in `clinical_saas_launch/src/lib/auth.tsx`.

2. **Target Codebase (`clinical_saas_launch`)**:
   - `src/tools/theraflow/EhrWorkspace.tsx`:
     - Lines 17–24 render title `Clinical EHR &amp; Telehealth` and badge `EHR Active`.
     - Lines 31–48 render active patient `Jane Doe` (`#MC-88219`, `CPT 90837`), Telehealth indicator (`Ready for Session`, `Encrypted WebRTC Room`), and Clinical Notes indicator (`DAP / SOAP Formats`, `Auto-synced with Scribe`).
   - `tests/e2e/tier1-features.test.mjs`:
     - Lines 324–332 assert `Clinical EHR &amp; Telehealth` (or `Clinical EHR & Telehealth`) and `EHR Active`.
     - Lines 338–345 assert active patient binding (`Jane Doe`, `#MC-88219`, `CPT 90837`).
     - Lines 351–358 assert `Ready for Session` and `Encrypted WebRTC Room`.
     - Lines 364–371 assert `DAP / SOAP Formats` and `Auto-synced with Scribe`.
     - Lines 377–386 assert `/dashboard/calendar`, `/dashboard/clients`, and `/dashboard/billing` contain `'TheraFlow Practice Management'`.
   - `tests/e2e/tier3-interactions.test.mjs` (Lines 91–140, 287–304) and `tests/e2e/tier4-scenarios.test.mjs` (Lines 88–100, 124–131):
     - Assert cross-tool context propagation and note ingestion via `insertToEhr`.

---

## 2. Logic Chain

1. **Documentation Rigor (Feature 10)**:
   - Observation: Canonical `NoteEditor.tsx` provides basic textareas without clinical prompting, chips, or offline-safe AI generation.
   - In clinical documentation, therapists need guidance to meet CMS reimbursement criteria (objective observations, interventions, response, risk assessment).
   - Providing categorized chips (Mental Status, Interventions, Risk, Plan) and a dual-engine AI expander (Gemini when API key is present, deterministic clinical synthesis when offline/in tests) guarantees 100% test reliability and instant documentation.
   - Committing signed notes (`is_locked: true`) with clinician credentials (`Dr. Sarah Chen, MD`) satisfies HIPAA immutability and syncs with `ClinicalContext`.

2. **Treatment Plan Completeness (Feature 10)**:
   - Observation: Canonical `TreatmentPlanEditor.tsx` lacked problem statements and target completion dates.
   - The user specification explicitly mandates: "Problem statement, Long-term goal, Short-term objectives, Interventions, Target completion dates."
   - Adding structured objective items with target dates and evidence-based presets (GAD, MDD, PTSD) fulfills the specification and aligns with clinical standards.

3. **Invoicing & CMS-1500 Compliance (Feature 11)**:
   - Observation: Canonical `Billing.tsx` only classifies invoices as `unpaid` vs `paid`.
   - In healthcare practice management, unpaid invoices past their due date must be categorized as `overdue` to track receivables aging.
   - Computing `status = 'overdue'` dynamically when `due_date < today` and status is not `paid` or `void` delivers the required KPI cards (Total Invoiced, Total Collected, Pending, Overdue).
   - In `SuperbillDialog.tsx`, auto-populating provider NPI (`1982736450`), Tax ID, practice name, patient demographics, and offering standard CPT (90837, 90834, 90791) and ICD-10 (F41.1, F33.0, F43.10) pickers eliminates manual data entry and formats the claim for printing and export.

4. **Preservation of Existing Test Contracts**:
   - Observation: Existing tests check specific strings in `EhrWorkspace.tsx`.
   - By structuring `EhrWorkspace.tsx` to host tabbed views (Overview, DAP Notes, Treatment Plans, Billing & Superbills, Calendar, Telehealth, Audit Logs) while keeping the original header and patient card visible, all existing Tier 1, 3, and 4 tests will pass without regressions.

---

## 3. Caveats

1. **Network Independence**: The AI note expansion must never fail when `GEMINI_API_KEY` is absent (such as in automated test environments). The implementation must use the dual-mode architecture specified in `report.md` (`generateDeterministicDAP` fallback).
2. **Supabase Demo Mode**: In the sandbox environment, `isSupabaseConfigured` is `false`. All new features must read/write to the unified demo/localStorage store (`mock-ehr-data.ts`) while executing Supabase queries when live credentials are provided.
3. **Co-Worker Scopes**: Client Roster and Calendar are assigned to Explorer 1 (`teamwork_preview_explorer_m3_1`); Telehealth WebRTC and Audit Logs are assigned to Explorer 3 (`teamwork_preview_explorer_m3_3`). Explorer 2's blueprint focuses exclusively on Features 10 & 11 and coordinates clean integration interfaces for all.

---

## 4. Conclusion

Features 10 & 11 are thoroughly investigated, fully specified, and ready for immediate implementation by the Worker. The architectural blueprint in `report.md` provides:
1. Complete TypeScript contracts (`DAPNote`, `TreatmentPlan`, `Invoice`, `InvoiceItem`).
2. DAP Note Editor architecture with clinical prompt guidance, categorized symptom/intervention chips, and dual-mode AI note expansion.
3. Treatment Plan Builder architecture with Problem Statement, Long-term Goals, Short-term Objectives with Target Completion Dates, Interventions, and evidence-based clinical presets.
4. Billing View with financial KPI summary metrics (Invoiced, Collected, Pending, Overdue), invoice list, and Overdue status calculation.
5. CMS-1500 Superbill Generator modal with auto-populated provider NPI/tax ID, patient demographics, ICD-10/CPT selectors, and printable layout.
6. Integration plan into `src/tools/theraflow/` and `src/App.tsx` guaranteeing zero regressions across existing E2E tests.

---

## 5. Verification Method

1. **Build & Typecheck**:
   ```bash
   npm run build
   npm run typecheck
   ```
   *Expected*: Clean build with zero TypeScript or Vite bundle errors.

2. **Existing E2E Test Suite Regression Verification**:
   ```bash
   npm run test:e2e
   ```
   *Expected*: 100% of Tier 1 (35 tests), Tier 3 (10 tests), and Tier 4 (5 tests) pass cleanly.

3. **Dedicated Features 10 & 11 Empirical Verification**:
   Inspect or execute test verification script covering:
   - NoteEditor loads DAP sections with clinical prompt tooltips/headers.
   - Clicking a clinical chip appends the phrase to the target section.
   - Clicking "Generate with AI" opens the shorthand modal; submittal populates Data, Assessment, and Plan fields.
   - Signing and locking a note sets `is_locked: true`, shows the clinician signature banner, and locks fields against further edits.
   - TreatmentPlanEditor correctly populates Problem Statement, Goals, Objectives with target dates, and Interventions from clinical presets.
   - BillingView calculates Total Invoiced, Collected, Pending, and Overdue KPIs; invoices past due date display the Overdue badge.
   - SuperbillModal auto-populates Provider NPI (`1982736450`) and Tax ID, and renders the printable `#superbill-print-container`.

4. **Invalidation Conditions**:
   - If `npm run build` fails with type errors.
   - If any existing Tier 1 test (such as T1.4.1 through T1.4.5) fails due to missing DOM text anchors.
   - If AI note expansion throws an unhandled exception when `GEMINI_API_KEY` is not present.
