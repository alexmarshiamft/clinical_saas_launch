## 2026-10-05T05:08:52Z
You are Explorer 3 for Milestone 4 (teamwork_preview_explorer).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m4_3
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md
The E2E test certification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/TEST_READY.md
The E2E test suite is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/tests/e2e/

Scope:
Milestone 4: Clinical AI Scribe v2 Integration — Feature 16 (Billing & Coding Assistant) & Feature 17 (Multi-EHR Export Adapters) & Unified Route Integration & E2E Test Alignment.
Canonical source portfolio:
Examine `/Users/alexandermarshi/Downloads/heidi-clone/` (or related repository in portfolio):
- Inspect CPT/ICD coding reconciliation, export dialogs (Epic, Cerner, Athena), and container components.

Investigate and produce a detailed blueprint for:
1. Feature 16: Scribe Billing & Coding Assistant:
   - Real-time diagnostic code suggestion engine: ICD-10 (e.g. F41.1 GAD, F32.9 MDD, F43.10 PTSD, F90.2 ADHD) and CPT procedure codes (90832, 90834, 90837, 90791, 99213/99214).
   - Medical necessity justification builder based on encounter duration and complexity.
   - Code acceptance: one-click sync to active patient billing chart.
2. Feature 17: Scribe Multi-EHR Export Adapters:
   - Formatted export adapters with syntax matching statutory EHR specifications:
     - Epic Systems: Epic SmartText / FHIR DocumentReference format.
     - Oracle Health / Cerner: PowerChart Clinical Note / Millennium format.
     - Athenahealth: AthenaNet Clinical Encounter format.
     - Rich text / Markdown clipboard copy with visual notification.
3. Container & Routing Integration:
   - `src/tools/scribe/ScribeWorkspace.tsx`: Main tabbed container with persistent invariant layout.
   - Route registration: `/dashboard/scribe` in `src/App.tsx` protected by `<SubscriptionGate requiredTier="starter">`.
   - Sidebar link in `src/components/layout/Sidebar.tsx`.
4. E2E Test Suite Preservation:
   - Examine how existing E2E tests (Tier 1, Tier 2, Tier 3, Tier 4) interact with Scribe (check exact string requirements, e.g. "Clinical AI Scribe", "Ambient Acoustic Diarization", template names).
   - Ensure 100% backward compatibility with zero regressions on `npm run test:e2e`.
5. Automated Test Strategy for Milestone 4 (`tests/m4-clinical-scribe.test.ts` & `package.json`).

Write your findings to report.md and a 5-component handoff report to handoff.md.
When complete, notify parent via send_message.
