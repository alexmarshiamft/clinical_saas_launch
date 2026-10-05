# Worker M3 Dispatch

## Mission
Implement Milestone 3: TheraFlow EHR & Telehealth across Features 8, 9, 10, 11, and 12.

## Inputs
- Explorer 1 Report (Clients & Calendar): `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m3_1/report.md`
- Explorer 2 Report (DAP Notes & Superbills): `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m3_2/report.md`
- Explorer 3 Report (Telehealth & Audit Logs): `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m3_3/report.md`
- Canonical Source: `/Users/alexandermarshi/Downloads/theraflow/`
- Original Request: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Spec: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md`

## 2026-10-05T04:13:22Z
You are Worker M3 (teamwork_preview_worker).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m3
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md

Scope & Task:
Implement Milestone 3: TheraFlow EHR & Telehealth across Features 8, 9, 10, 11, and 12.
Read the comprehensive blueprints prepared by the 3 Explorers:
- Explorer 1 (Clients & Calendar): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m3_1/report.md
- Explorer 2 (DAP Notes, Treatment Plans, Billing & Superbills): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m3_2/report.md
- Explorer 3 (Telehealth, Audit Logs, Route Integration & E2E Alignment): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m3_3/report.md
- Canonical source: /Users/alexandermarshi/Downloads/theraflow/

Implement the following:
1. `src/tools/theraflow/data/`:
   - `demo-seed.ts` & `theraflow-store.ts`: 11 clinical patients (Jane Doe + 10 canonical patients), appointments, notes, treatment plans, invoices, and audit logs. Resilient dual-engine (queries Supabase when configured, localStorage demo sandbox when unconfigured).
2. `src/components/ui/`:
   - Provide clean UI primitives (`button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `badge.tsx`) using `@base-ui/react` and Tailwind v4.
3. Feature 8: Client & Patient Roster (`src/tools/theraflow/ClientsView.tsx`, `ClientProfileView.tsx`):
   - Client list with search, status filter (Active, On Hold, Discharged), Add Client modal, "Set Active" syncing with `ClinicalContext` (`src/lib/clinical-context.tsx`).
   - Client profile with tabs (Demographics, Encounters, Treatment Plans, Notes History).
4. Feature 9: Appointment Calendar (`src/tools/theraflow/CalendarView.tsx`):
   - Interactive scheduler using `react-big-calendar` with Month, Week, Day views, appointment booking modal, status color coding.
5. Feature 10: DAP Notes & Treatment Plans (`src/tools/theraflow/DAPNotesView.tsx`, `TreatmentPlanView.tsx`):
   - DAP editor with clinical prompt headers, quick symptom/intervention chips, dual-mode AI note expander (with offline deterministic fallback), digital sign/lock.
   - Treatment plan builder with Problem statement, Long-term goal, Short-term objectives with target completion dates, Interventions, evidence-based presets (GAD, MDD, PTSD).
6. Feature 11: Invoicing & CMS-1500 Superbills (`src/tools/theraflow/BillingView.tsx`, `SuperbillModal.tsx`):
   - Invoicing view with financial KPIs (Total, Paid, Pending, Overdue), invoice list, Overdue calculation for unpaid past-due invoices.
   - CMS-1500 Superbill generator with provider NPI `1982736450`, Tax ID, patient demographics, ICD-10 & CPT pickers, printable layout (`#superbill-print-area`).
7. Feature 12: Telehealth & HIPAA Audit Logs (`src/tools/theraflow/TelehealthView.tsx`, `AuditLogsView.tsx`, `server.ts`):
   - Telehealth WebRTC room simulation with dual video tiles, mic/cam toggles, screen share placeholder, session timer with CPT duration markers (90832, 90834, 90837).
   - HIPAA Immutable Audit Log viewer with SHA-256 hash chaining, action filters, MRN search, CSV/JSON export. Backend `/api/audit-logs` endpoint.
8. Container & Routing (`src/tools/theraflow/EhrWorkspace.tsx`, `src/App.tsx`):
   - `EhrWorkspace.tsx`: Tabbed container (Patients, Calendar, Notes, Treatment Plans, Billing, Telehealth, Audit Logs) retaining all required text strings (`Clinical EHR & Telehealth`, `TheraFlow Practice Management`, `EHR Active`, `Ready for Session`, `Encrypted WebRTC Room`, `Jane Doe`, `CPT 90837`, `DAP / SOAP Formats`, `Auto-synced with Scribe`).
   - `src/App.tsx`: Routes `/dashboard/ehr`, `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/clients/:id`, `/dashboard/billing`, `/dashboard/telehealth`, `/dashboard/audit-logs` protected by `<SubscriptionGate>`.
9. Test Harness:
   - Create `tests/m3-theraflow-ehr.test.ts` (or `scripts/verify-theraflow-ehr.mjs`) verifying all 5 TheraFlow features.
   - Add `"test:ehr": "tsx tests/m3-theraflow-ehr.test.ts"` in `package.json`.

Verification Requirements:
1. `npm run test:ehr` (all feature checks pass, Exit 0)
2. `npm run test:e2e` (80/80 PASS, Exit 0)
3. `node tests/e2e/tier4-scenarios.test.mjs` (5/5 PASS, Exit 0)
4. `npm run test:challenger:m2` (53/53 PASS, Exit 0)
5. `npm run test:stripe` (15/15 PASS, Exit 0)
6. `npm run test:subscription` (17/17 PASS, Exit 0)
7. `npm run test:security` (26/26 PASS, Exit 0)
8. `npm run test:auth` (12/12 PASS, Exit 0)
9. `npx tsx tests/forensic-m2-audit.ts` (22/22 PASS, Exit 0)
10. `npm run build` (clean build, 0 TS compiler errors, Exit 0)
