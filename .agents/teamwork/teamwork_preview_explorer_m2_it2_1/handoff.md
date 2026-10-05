# Handoff Report: Airtight ePHI Protection & Route Gating Blueprint

**Agent**: Explorer 1 (`teamwork_preview_explorer_m2_it2_1`)  
**Parent Conversation ID**: `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`  
**Recipient**: Parent Orchestrator & Worker M2  
**Milestone**: Milestone 2 Iteration 2  
**Date**: 2026-10-05  

---

## 1. Observation

1. **`src/pages/DashboardHome.tsx` ePHI Exposure**:
   - Lines 27–68: `todayAppointments` static array defines patients: `Jane Doe` (apt-1), `Marcus Vance` (apt-2), `Elena Rostova` (apt-3), `Samuel Green` (apt-4).
   - Lines 164–179: Renders active patient ePHI without any subscription check:
     - Line 164: `MRN: {activePatient.mrn}` (`#MC-88219`)
     - Line 171: `{activePatient.name}` (`Jane Doe`)
     - Line 174: `DOB: {activePatient.dob}` (`04/12/1988`)
     - Line 175: `CPT {activePatient.cptCode}` (`90837`)
     - Line 179: `Diagnosis: F41.1 Generalized Anxiety`
   - Lines 285–331: Maps over `todayAppointments` and renders `apt.patient` directly in DOM (`Jane Doe`, `Marcus Vance`, `Elena Rostova`, `Samuel Green`).
   - Line 18: `DashboardHome` does NOT import or consume `useSubscription()`.

2. **`src/App.tsx` Ungated Practice Operations Routes**:
   - Lines 101–107:
     ```tsx
     {/* Practice Operations Aliases */}
     <Route path="calendar" element={<EhrWorkspace />} />
     <Route path="clients" element={<EhrWorkspace />} />
     <Route path="billing" element={<EhrWorkspace />} />
     <Route path="subscription" element={<Subscription />} />
     <Route path="settings" element={<EhrWorkspace />} />
     ```
   - Routes `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings` render `<EhrWorkspace />` directly without `<SubscriptionGate>`.
   - `src/tools/theraflow/EhrWorkspace.tsx` lines 30–35 renders active patient chart (`Jane Doe`, `#MC-88219`, `CPT 90837`) immediately upon load.

3. **`src/components/layout/Sidebar.tsx` Ungated Practice Operations Links**:
   - Lines 86–91: Defines `practiceOps = [...]`.
   - Lines 199–218: Renders `practiceOps` NavLinks without checking `isSubscribed` or `isToolLocked`. Unlike `coreTools` (lines 166–174), no upgrade or lock badges are rendered when unsubscribed.

4. **Empirical Test Failure Trace in `tests/challenger-m2-empirical-audit.ts`**:
   - Part 2.1: Fails with `VULNERABILITY: /dashboard is UNGATED and renders full ePHI to unsubscribed users: Patient Name "Jane Doe", Patient MRN "#MC-88219", Patient DOB "04/12/1988", Diagnosis "F41.1 Generalized Anxiety", Schedule Patient "Marcus Vance", Schedule Patient "Elena Rostova"`.
   - Part 2.2: Fails with `VULNERABILITY: Route '/dashboard/clients' lacks <SubscriptionGate>! An unsubscribed clinician can view EhrWorkspace and ePHI ('Jane Doe', '#MC-88219') without a subscription`. Same failure across `/dashboard/calendar`, `/dashboard/billing`, `/dashboard/settings`.

---

## 2. Logic Chain

1. **Statutory ePHI Leakage (Observation 1 & 4)**:
   - HIPAA Safe Harbor (§164.514) requires that all 18 identifiers (including name, MRN, DOB, appointment dates) and diagnoses be concealed from unauthorized or unsubscribed entities.
   - Because `DashboardHome.tsx` renders `activePatient` and `todayAppointments` unconditionally, unsubscribed users visiting `/dashboard` immediately see patient names, MRN, DOB, and diagnoses in the DOM.
   - Therefore, `DashboardHome.tsx` must consume `useSubscription()` and conditionally mask or replace both the hero card and the appointment schedule when `!isSubscribed || status === 'none'`.

2. **Route Gating Bypass (Observation 2 & 4)**:
   - `<SubscriptionGate>` was applied to `/dashboard/ehr/*`, but omitted from the practice management routes `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings`.
   - Because all 4 routes mount `<EhrWorkspace />`, an unsubscribed clinician clicking "Client Roster" in the sidebar bypasses the EHR lock and accesses patient data.
   - Wrapping `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings` in `<SubscriptionGate requiredTier="starter">` guarantees that unsubscribed users are presented with the lock overlay and zero ePHI is mounted.

3. **Visual Hierarchy and UX Consistency (Observation 3)**:
   - In `Sidebar.tsx`, `coreTools` correctly displays `data-testid="tool-upgrade-badge-..."` when locked.
   - Applying `isLocked = !isSubscribed` to `practiceOps` and displaying an "Upgrade" badge with the Crown icon and `data-testid="practice-op-upgrade-badge-{op}"` informs unsubscribed clinicians that practice management features require a subscription before they navigate.

---

## 3. Caveats

- **Scope Boundary**: This report focuses on client-side ePHI masking on `/dashboard`, route gating in `App.tsx`, and sidebar badge synchronization in `Sidebar.tsx`. Backend session verification in `server.ts` and return URL parameter validation in `subscription.tsx` are handled in parallel by Explorer 2 (`teamwork_preview_explorer_m2_it2_2`).
- **Starter Tier Privilege**: Practice operations routes (`calendar`, `clients`, `billing`, `settings`) are gated at `requiredTier="starter"`. Clinicians on the Starter tier ($49/mo) retain full access to these tools, while unsubscribed users are locked.
- **Commercial Pricing Page**: `/dashboard/subscription` must remain explicitly ungated so clinicians can select and purchase a tier.

---

## 4. Conclusion

The ePHI vulnerabilities identified by Challenger 1 have been fully analyzed and resolved via a concrete blueprint:
1. `DashboardHome.tsx` is updated to consume `useSubscription()`, replacing the hero card with a HIPAA-protected Clinical Encounter Lock card and masking schedule appointments with `[CONFIDENTIAL ePHI - Active Subscription Required]` when unsubscribed. Full clinical features render when subscribed or trialing.
2. `App.tsx` is updated to wrap all 4 practice operations routes (`/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, `/dashboard/settings`) in `<SubscriptionGate requiredTier="starter">`.
3. `Sidebar.tsx` is updated to render dynamic "Upgrade" badges on practice operations links when unsubscribed.
4. The detailed line-by-line patch blueprint is documented in `report.md`.

---

## 5. Verification Method

To independently verify the blueprint once implemented by Worker M2:

1. **Run Challenger 1 Empirical Test Suite**:
   ```bash
   npx tsx tests/challenger-m2-empirical-audit.ts
   ```
   *Expected Result*: Parts 2.1 (ePHI on `/dashboard`) and 2.2 (Practice operations routes) pass with 100% success.

2. **Verify All Milestone 2 Regression Suites**:
   ```bash
   npm run test:stripe
   npm run test:subscription
   npm run test:auth
   npm run test:security
   npx tsx tests/empirical-server-stress.ts
   npx tsx tests/forensic-m2-audit.ts
   npm run build
   ```
   *Expected Result*: All test suites pass with 0 errors and exit code 0.

3. **Verify DOM ePHI Suppression via JSDOM / Curl**:
   - Inspect `/dashboard` with `status: 'none'`: Verify zero occurrences of `Jane Doe`, `#MC-88219`, `04/12/1988`, `F41.1`, `Marcus Vance`, `Elena Rostova`, or `Samuel Green`. Verify presence of `[CONFIDENTIAL ePHI - Active Subscription Required]`.
   - Inspect `/dashboard/clients` with `status: 'none'`: Verify presence of `data-testid="subscription-gate-lock"` and zero occurrences of `Jane Doe`.
