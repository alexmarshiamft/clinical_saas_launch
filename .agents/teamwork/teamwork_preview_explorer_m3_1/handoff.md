# Handoff Report: Milestone 3 Explorer 1 (Features 8 & 9 Blueprint)

## 1. Observation

1. **Target Project Baseline**:
   - `clinical_saas_launch/package.json` contains:
     - React 19: `"react": "^19.0.0"`, `"react-dom": "^19.0.0"`
     - Calendar: `"react-big-calendar": "^1.19.4"`, `"@types/react-big-calendar": "^1.16.3"`
     - Date math: `"date-fns": "^4.1.0"`
     - UI primitives: `"@base-ui/react": "^1.3.0"`, `"class-variance-authority": "^0.7.1"`, `"clsx": "^2.1.1"`, `"tailwind-merge": "^3.5.0"`
     - Notifications: `"sonner": "^2.0.7"`
     - Styling: `"tailwindcss": "^4.1.14"`, `"@tailwindcss/vite": "^4.1.14"`
   - `src/index.css` line 5 already contains `@import "react-big-calendar/lib/css/react-big-calendar.css";`.
   - Running `npm run build` (`tsc --noEmit && vite build`) succeeded with code 0 in 5.07s.
   - Running `npm run test:e2e` (`node tests/e2e/run-all.mjs`) succeeded with code 0 (all 4 Tiers, 50/50 tests passing in 17.84s).
   - In `src/tools/theraflow/`, only a placeholder `EhrWorkspace.tsx` exists (55 lines).
   - `src/components/ui` does not exist yet in `clinical_saas_launch`.

2. **Canonical TheraFlow Implementation (`/Users/alexandermarshi/Downloads/theraflow/`)**:
   - `pages/Clients.tsx` (236 lines): Queries `supabase.from('clients')`, renders table with search, status filter (`active`, `inactive`, `discharged`), and an "Add Client" dialog.
   - `pages/ClientProfile.tsx` (458 lines): Queries `clients`, `appointments`, `progress_notes`, `treatment_plans`, `intake_forms`. Renders details and tabs (`appointments`, `notes`, `treatment_plans`, `intake_forms`).
   - `pages/Calendar.tsx` (656 lines): Uses `BigCalendar` from `react-big-calendar` with `dateFnsLocalizer`. Configured with `Views.MONTH`, `Views.WEEK`, `Views.DAY`, `step={15}`, `timeslots={4}`, booking modal (`newApt.is_ooo` toggle, client select, date/times, CPT code, status, location), and edit modal.
   - `src/data/demo_seed.json` & `scripts/seed-demo.ts`: Contains 10 realistic clinical patients (Elena Reyes, Marcus Chen, Sarah Jenkins, David O'Connor, Priya Patel, James Wilson, Chloe Alvarez, Robert Kim, Maya Taylor, Samuel Brooks) and appointments with therapist ID `a0000000-0000-4000-8000-000000000001` (identical to `DEMO_CLINICIAN_USER.id` in `clinical_saas_launch/src/lib/auth.tsx`).
   - `components/ui/`: Contains Base UI adaptations for `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `table.tsx`, and `tabs.tsx`.

3. **E2E Test Constraint (`tests/e2e/tier1-features.test.mjs`)**:
   - Lines 320–391 test `EhrWorkspace` for:
     - `"Clinical EHR & Telehealth"` and `"EHR Active"`
     - Active patient binding: `"Jane Doe"`, `"#MC-88219"`, `"CPT 90837"`
     - Telehealth status: `"Ready for Session"`, `"Encrypted WebRTC Room"`
     - Clinical notes: `"DAP / SOAP Formats"`, `"Auto-synced with Scribe"`
     - Route aliases: `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing` must all render `"TheraFlow Practice Management"`.

---

## 2. Logic Chain

1. **Dual-Engine Store Necessity**:
   - Directly copying canonical `Clients.tsx` or `Calendar.tsx` without an abstraction would cause runtime network errors in sandbox/test mode (`!isSupabaseConfigured`), because dummy Supabase URL `placeholder-sandbox.supabase.co` fails to connect.
   - Introducing `src/tools/theraflow/data/theraflow-store.ts` that checks `isSupabaseConfigured` allows live Supabase queries when configured and falls back to `demo-seed.ts` (persisted in `localStorage`) in sandbox mode. This preserves 100% test pass rate while delivering full interactive CRUD.

2. **Context Synchronization**:
   - `ClinicalContext` in `src/lib/clinical-context.tsx` defines `activePatient` (`id`, `name`, `dob`, `mrn`, `cptCode`, etc.).
   - Providing a "Set Active" action in the `Clients` table and a "Set as Active Patient" button in `ClientProfile` allows clinicians to switch active patients from the EHR, propagating the selection into Scribe, Aura, and PHI Scrubber.
   - Including `Jane Doe` (`p-101`) alongside the 10 TheraFlow patients in `demo-seed.ts` guarantees continuity between the initial dashboard state and the roster.

3. **Calendar Sizing & Compatibility**:
   - `react-big-calendar` CSS is already imported in `src/index.css`.
   - To prevent flex container height collapse in Tailwind v4, the calendar wrapper must specify explicit height (`min-h-[650px] h-[calc(100vh-230px)]`).
   - The views (Month, Week, Day), slot selection (`onSelectSlot`), appointment modal, and status colors (`eventPropGetter`) can be directly ported from canonical `Calendar.tsx`.

4. **Backward Compatibility Preservation**:
   - Updating `EhrWorkspace.tsx` to retain its top header ("Clinical EHR & Telehealth", "TheraFlow Practice Management & Patient Charting", "EHR Active", summary cards) satisfies tests `T1.4.1` through `T1.4.5`.
   - Embedding sub-tabs and sub-routes within `EhrWorkspace` (Patients & Roster, Calendar & Sessions) and routing `/dashboard/clients`, `/dashboard/clients/:id`, and `/dashboard/calendar` directly to `EhrWorkspace` with default view props ensures every URL resolves seamlessly.

---

## 3. Caveats

1. **Features 10, 11, 12**:
   - This blueprint focuses strictly on Feature 8 (Client Roster) and Feature 9 (Appointment Calendar).
   - Features 10 (DAP Notes & Treatment Plan Editor), 11 (Invoicing & Superbills), and 12 (Telehealth WebRTC & Audit Viewer) are scheduled for subsequent Milestone 3 implementations. In this phase, `EhrWorkspace` provides preview/scaffold tabs and navigation stubs for them.
2. **Supabase In-Memory vs. Remote**:
   - In environments without active Supabase credentials, data changes (e.g. adding a new client or scheduling an appointment) persist in the browser's `localStorage` via `theraflow-store.ts`. When live credentials are provided, it interacts directly with PostgreSQL tables.

---

## 4. Conclusion

1. The canonical TheraFlow implementations of `Clients.tsx`, `ClientProfile.tsx`, and `Calendar.tsx` are fully compatible with `clinical_saas_launch`'s React 19 + Tailwind v4 stack with zero third-party dependency additions.
2. The UI component primitives (`button`, `card`, `dialog`, `input`, `label`, `select`, `table`, `tabs`) can be created in `src/components/ui/` using `@base-ui/react` and `class-variance-authority`.
3. A dual-engine store (`theraflow-store.ts`) paired with canonical seed fixtures (`demo-seed.ts`) delivers resilient, crash-free operation in both production and deterministic CI environments.
4. Integrating `Clients` and `Calendar` into `src/tools/theraflow/` while preserving the existing `EhrWorkspace` header maintains 100% test pass rate across Tiers 1–4.
5. A comprehensive implementation blueprint and automated test plan is documented in `report.md`.

---

## 5. Verification Method

1. **Build Verification**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc --noEmit && vite build` completes with exit code 0.

2. **Existing E2E Test Suite Regression**:
   ```bash
   npm run test:e2e
   ```
   *Expected*: All 4 tiers (50 tests) pass with 100% success.

3. **M3 Automated Test Suite**:
   ```bash
   npx tsx tests/m3-theraflow-roster-calendar.test.ts
   ```
   *Expected*: All 16 targeted tests for Features 8 & 9 pass:
   - Roster table rendering with 11 patients.
   - Full-text search and status filter (`Active`, `On Hold`, `Discharged`).
   - Add client modal creation and local persistence.
   - Client profile 4-tab rendering (Demographics, Encounters, Treatment Plans, Notes History).
   - ClinicalContext active patient synchronization.
   - Interactive calendar scheduler with Month, Week, Day views.
   - Appointment booking and Out of Office creation with status color coding.
