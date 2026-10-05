# Milestone 2 Iteration 2 Technical Investigation Report
## Airtight ePHI Protection & Route Gating Blueprint

**Author**: Explorer 1 (`teamwork_preview_explorer_m2_it2_1`)  
**Parent Conversation ID**: `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`  
**Milestone**: Milestone 2 Iteration 2 (Stripe Subscription Billing & Clinical Access Gating)  
**Date**: 2026-10-05  
**Working Directory**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m2_it2_1`

---

## Executive Summary

Milestone 2 Gate failed on Challenger 1 REJECT due to statutory ePHI leakage on `/dashboard` and ungated practice operations routes (`/dashboard/clients`, `/dashboard/calendar`, `/dashboard/billing`, `/dashboard/settings`). While the 4 primary clinical tool endpoints (`/dashboard/ehr`, `/dashboard/scribe`, `/dashboard/aura`, `/dashboard/phi-scrubber`) were guarded, an unsubscribed clinician logging into TheraFlow was immediately presented with:
1. Active patient identity (`Jane Doe`), Medical Record Number (`#MC-88219`), Date of Birth (`04/12/1988`), psychiatric diagnosis (`F41.1 Generalized Anxiety`), and CPT billing codes (`90837`) in the hero section of `/dashboard` (`DashboardHome.tsx`).
2. Today's clinical appointment schedule roster revealing full patient identities (`Jane Doe`, `Marcus Vance`, `Elena Rostova`, `Samuel Green`).
3. Complete ungated access to `<EhrWorkspace />` via `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings` without any `<SubscriptionGate>`, also lacking lock/upgrade indicators in `Sidebar.tsx`.

This report provides the architectural root-cause analysis, threat boundary specifications, and a concrete, line-by-line patch blueprint for `DashboardHome.tsx`, `App.tsx`, and `Sidebar.tsx`.

---

## 1. Vulnerability Analysis & Empirical Trace

### 1.1 Root Cause 1: `DashboardHome.tsx` Unconditional ePHI Rendering
- **Source File**: `src/pages/DashboardHome.tsx` (lines 18–68, 149–212, 270–332)
- **Defect Mechanism**:
  `DashboardHome` does not consume `useSubscription()`. It imports `useClinicalContext()` and immediately extracts `activePatient = clinical.activePatient`. It defines `todayAppointments` as a static array containing real names (`Jane Doe`, `Marcus Vance`, `Elena Rostova`, `Samuel Green`).
  When an unsubscribed clinician signs in (`status: 'none'`), the application routes them to `/dashboard`. While `Header.tsx` correctly suppresses the top patient context bar, `DashboardHome.tsx` unconditionally displays:
  - Line 164: `MRN: {activePatient.mrn}` -> `#MC-88219`
  - Line 171: `{activePatient.name}` -> `Jane Doe`
  - Line 174: `DOB: {activePatient.dob}` -> `04/12/1988`
  - Line 175: `CPT {activePatient.cptCode}` -> `90837`
  - Line 179: `Diagnosis: F41.1 Generalized Anxiety`
  - Line 296: `apt.patient` -> `Jane Doe`, `Marcus Vance`, `Elena Rostova`, `Samuel Green`
- **Impact**: Violates HIPAA Safe Harbor statutory de-identification standards (§164.514) and project acceptance criteria §R2 / §AC3.

### 1.2 Root Cause 2: Ungated Practice Operations Routes in `src/App.tsx`
- **Source File**: `src/App.tsx` (lines 101–107)
  ```tsx
  {/* Practice Operations Aliases */}
  <Route path="calendar" element={<EhrWorkspace />} />
  <Route path="clients" element={<EhrWorkspace />} />
  <Route path="billing" element={<EhrWorkspace />} />
  <Route path="subscription" element={<Subscription />} />
  <Route path="settings" element={<EhrWorkspace />} />
  ```
- **Defect Mechanism**:
  While `/dashboard/ehr/*` was wrapped in `<SubscriptionGate requiredTier="starter">`, the alias routes `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings` were mapped directly to `<EhrWorkspace />` with zero subscription check.
  Navigating to `/dashboard/clients` renders `EhrWorkspace.tsx` lines 30–35:
  ```tsx
  <div className="text-sm font-bold text-slate-900">{activePatient.name}</div>
  <div className="text-xs text-slate-500 font-mono mt-0.5">{activePatient.mrn} • CPT {activePatient.cptCode}</div>
  ```
- **Impact**: Trivially bypasses the `<SubscriptionGate>` on `/dashboard/ehr`. Any unsubscribed clinician can view patient chart data by opening `/dashboard/clients` or `/dashboard/calendar`.

### 1.3 Root Cause 3: Missing Upgrade / Lock Badges in `src/components/layout/Sidebar.tsx`
- **Source File**: `src/components/layout/Sidebar.tsx` (lines 86–91, 192–219)
- **Defect Mechanism**:
  `Sidebar.tsx` defines `practiceOps` separately from `coreTools`. While `coreTools` evaluates `isToolLocked(tool.path)` and renders `<span data-testid="tool-upgrade-badge-...">Upgrade</span>`, `practiceOps` links never checked `isSubscribed`. Unsubscribed users were presented with active, clickable navigation links showing no lock or tier gating.

---

## 2. Design Specification & Architectural Invariants

### Invariant 1: Fail-Closed ePHI Masking on `/dashboard`
1. When `!isSubscribed || status === 'none' || status === 'canceled'`:
   - The Active Patient Encounter Hero Card MUST be replaced with a dedicated **Clinical Encounter Lock Card**.
   - The lock card displays:
     - Header badge: `Patient Encounter Context: Inactive` (matching `Header.tsx`)
     - Vault badge: `[CONFIDENTIAL ePHI - Active Subscription Required]`
     - Title: `Active Clinical Charting Protected`
     - Description detailing HIPAA statutory protection and requiring Clinician Pro / 14-day trial
     - CTAs: "View Subscription Plans" (routes to `/dashboard/subscription`) and "Activate 14-Day Free Trial" (button calling `startTrial('pro')`)
     - **Strict Elimination**: Zero occurrences of `Jane Doe`, `#MC-88219`, `04/12/1988`, `F41.1`, or diagnostic plans in the DOM.
   - The Today's Schedule Roster MUST mask all 4 scheduled appointments:
     - Patient name is replaced with `[CONFIDENTIAL ePHI - Active Subscription Required]`.
     - Displays session metadata (Time, Duration, Type, CPT Code) alongside a "Locked" status badge.
     - Replaces clinical session action links with an "Unlock Roster" link to `/dashboard/subscription`.
     - **Strict Elimination**: Zero occurrences of `Marcus Vance`, `Elena Rostova`, `Samuel Green`, or `Jane Doe`.
2. When `isSubscribed` is true (`status === 'active'` or `status === 'trialing'`):
   - Full active patient encounter hero card renders seamlessly with clinical badges, CPT codes, and action links.
   - Full today's schedule roster renders with patient names, appointment badges, and clinical action buttons (`Scribe`, `Join Room`).

### Invariant 2: Complete Route Gating in `src/App.tsx`
1. All 4 practice operations routes (`/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, `/dashboard/settings`) MUST be wrapped in `<SubscriptionGate requiredTier="starter">`.
2. Setting `requiredTier="starter"` ensures:
   - Unsubscribed clinicians (`status: 'none'`) see the `<SubscriptionGate>` lock overlay with `#subscribe-now-btn` and `#activate-trial-btn`, with ZERO ePHI rendered.
   - Starter tier clinicians ($49/mo) have full access to TheraFlow Practice Management.
   - Clinician Pro ($99/mo) and Practice Group ($249/mo) clinicians, as well as 14-day trialists, have full access.
3. `/dashboard/subscription` MUST remain UNGATED to allow unsubscribed clinicians to view pricing and subscribe.

### Invariant 3: Synchronized Upgrade Badges in `src/components/layout/Sidebar.tsx`
1. When `!isSubscribed`:
   - Every practice operations link in `Sidebar.tsx` renders a distinct "Upgrade" badge with a Crown icon:
     ```tsx
     <span
       data-testid={`practice-op-upgrade-badge-${op.path.replace('/dashboard/', '')}`}
       className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-300 shadow-2xs shrink-0 ml-2"
     >
       <Crown className="h-3 w-3 text-amber-600" />
       Upgrade
     </span>
     ```
2. When `isSubscribed`:
   - No upgrade badge is displayed on practice operations links.

---

## 3. Concrete Line-by-Line Patch Blueprint

### Blueprint 1: `src/pages/DashboardHome.tsx`

#### Target: `src/pages/DashboardHome.tsx`
- **Imports Modification** (lines 14–17):
  Add `Lock`, `Crown`, `Zap` from `'lucide-react'`.
  Add `useSubscription` from `'@/lib/subscription'`.

```diff
--- a/src/pages/DashboardHome.tsx
+++ b/src/pages/DashboardHome.tsx
@@ -14,6 +14,10 @@ import {
   Activity,
+  Lock,
+  Crown,
+  Zap,
 } from 'lucide-react';
 import { useAuth } from '@/lib/auth';
 import { useClinicalContext } from '@/lib/clinical-context';
+import { useSubscription } from '@/lib/subscription';
```

- **Component Hook Initialization** (lines 18–22):
  Consume `useSubscription()`.

```diff
@@ -18,6 +22,7 @@ export const DashboardHome: React.FC = () => {
   const { profile } = useAuth();
   const clinical = useClinicalContext();
+  const { isSubscribed, status, startTrial } = useSubscription();
 
   const activePatient = clinical.activePatient;
```

- **Hero Card ePHI Masking** (lines 149–212):
  Wrap hero card in conditional check: `!isSubscribed || status === 'none'`.

```diff
@@ -149,6 +154,65 @@ export const DashboardHome: React.FC = () => {
-      {/* Active Patient Encounter Hero Card */}
-      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
+      {/* Active Patient Encounter Hero Card (Protected against ePHI leakage) */}
+      {!isSubscribed || status === 'none' ? (
+        <div
+          data-testid="dashboard-hero-locked"
+          className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-500/20"
+        >
+          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
+            <Activity className="h-64 w-64 text-white" />
+          </div>
+
+          <div className="relative z-10">
+            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
+              <div className="flex items-center gap-2">
+                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
+                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
+                  Patient Encounter Context: Inactive
+                </span>
+              </div>
+              <span className="text-xs font-mono bg-amber-950/80 px-2.5 py-1 rounded-md text-amber-300 border border-amber-800">
+                [CONFIDENTIAL ePHI - Active Subscription Required]
+              </span>
+            </div>
+
+            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
+              <div className="md:col-span-2">
+                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-slate-100">
+                  Active Clinical Charting Protected
+                </h2>
+                <p className="text-slate-300 text-sm leading-relaxed mb-4">
+                  Statutory patient identification, clinical diagnoses, and active encounter records are protected under HIPAA Safe Harbor rules. Activate your trial or subscribe to Clinician Pro to unlock live patient encounters.
+                </p>
+                <div className="flex flex-wrap items-center gap-2 text-xs">
+                  <span className="bg-white/10 px-3 py-1 rounded-full text-slate-300 flex items-center gap-1.5">
+                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
+                    100% HIPAA Statutory Protection
+                  </span>
+                  <span className="bg-white/10 px-3 py-1 rounded-full text-slate-300 flex items-center gap-1.5">
+                    <Lock className="h-3.5 w-3.5 text-amber-400" />
+                    Encrypted Safe Harbor Vault
+                  </span>
+                </div>
+              </div>
+
+              <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-end">
+                <NavLink
+                  to="/dashboard/subscription"
+                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
+                >
+                  <Crown className="h-4 w-4 text-amber-300" />
+                  <span>View Subscription Plans</span>
+                </NavLink>
+                <button
+                  type="button"
+                  id="dashboard-activate-trial-btn"
+                  onClick={() => startTrial('pro')}
+                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
+                >
+                  <Zap className="h-4 w-4 text-slate-950" />
+                  <span>Activate 14-Day Free Trial</span>
+                </button>
+              </div>
+            </div>
+          </div>
+        </div>
+      ) : (
+        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
+          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
+            <Activity className="h-64 w-64 text-white" />
+          </div>
+
+          <div className="relative z-10">
+            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
+              <div className="flex items-center gap-2">
+                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
+                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
+                  Active Patient Encounter
+                </span>
+              </div>
+              <span className="text-xs font-mono bg-indigo-800/80 px-2.5 py-1 rounded-md text-indigo-200 border border-indigo-700">
+                MRN: {activePatient.mrn}
+              </span>
+            </div>
+
+            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
+              <div className="md:col-span-2">
+                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
+                  {activePatient.name}
+                </h2>
+                <p className="text-indigo-200 text-sm leading-relaxed mb-4">
+                  DOB: <strong>{activePatient.dob}</strong> (Age {activePatient.age || 38}) • Current Session:{' '}
+                  <strong>CPT {activePatient.cptCode}</strong> ({activePatient.cptDesc || 'Psychotherapy, 60m'}).
+                </p>
+                <div className="flex flex-wrap items-center gap-2 text-xs">
+                  <span className="bg-white/10 px-3 py-1 rounded-full text-indigo-100">
+                    Diagnosis: F41.1 Generalized Anxiety
+                  </span>
+                  <span className="bg-white/10 px-3 py-1 rounded-full text-indigo-100">
+                    Treatment Plan: Cognitive Behavioral Therapy (CBT)
+                  </span>
+                </div>
+              </div>
+
+              <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-end">
+                <NavLink
+                  to="/dashboard/scribe"
+                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
+                >
+                  <Mic className="h-4 w-4" />
+                  <span>Ambient Scribe Feed</span>
+                </NavLink>
+                <NavLink
+                  to="/dashboard/ehr"
+                  className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/20"
+                >
+                  <FileText className="h-4 w-4" />
+                  <span>Open EHR Chart</span>
+                </NavLink>
+                <NavLink
+                  to="/dashboard/phi-scrubber"
+                  className="px-4 py-2.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
+                >
+                  <ShieldCheck className="h-4 w-4" />
+                  <span>Scrub Patient PHI</span>
+                </NavLink>
+              </div>
+            </div>
+          </div>
+        </div>
+      )}
```

- **Schedule Roster ePHI Masking** (lines 270–332):
  Render masked appointment slots with `[CONFIDENTIAL ePHI - Active Subscription Required]` when unsubscribed.

```diff
@@ -270,11 +334,13 @@ export const DashboardHome: React.FC = () => {
         <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
           <div className="flex items-center justify-between mb-5">
             <div>
               <h3 className="text-base font-extrabold text-slate-900">Today's Encounter Schedule</h3>
-              <p className="text-xs text-slate-600">4 appointments scheduled for today</p>
+              <p className="text-xs text-slate-600">
+                {isSubscribed && status !== 'none'
+                  ? '4 appointments scheduled for today'
+                  : 'Patient roster masked — active subscription required'}
+              </p>
             </div>
             <NavLink
               to="/dashboard/calendar"
               className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
             >
               Full Calendar →
             </NavLink>
           </div>
 
           <div className="space-y-3">
+            {!isSubscribed || status === 'none' ? (
+              [
+                { id: 'mask-1', time: '10:00 AM', duration: '60 min', type: 'Telehealth', cpt: '90837' },
+                { id: 'mask-2', time: '11:30 AM', duration: '45 min', type: 'In-Person', cpt: '90834' },
+                { id: 'mask-3', time: '02:00 PM', duration: '60 min', type: 'Telehealth', cpt: '90837' },
+                { id: 'mask-4', time: '03:30 PM', duration: '90 min', type: 'Intake Evaluation', cpt: '90791' },
+              ].map((apt) => (
+                <div
+                  key={apt.id}
+                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
+                >
+                  <div className="flex items-center gap-3">
+                    <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
+                      <Lock className="h-4 w-4 text-slate-500" />
+                    </div>
+                    <div>
+                      <div className="flex items-center gap-2">
+                        <span className="font-mono text-xs text-slate-600 font-semibold bg-slate-200/80 px-2 py-0.5 rounded">
+                          [CONFIDENTIAL ePHI - Active Subscription Required]
+                        </span>
+                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
+                          Locked
+                        </span>
+                      </div>
+                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
+                        <span>{apt.time} ({apt.duration})</span>
+                        <span>•</span>
+                        <span>{apt.type}</span>
+                        <span>•</span>
+                        <span className="font-mono text-slate-600">CPT {apt.cpt}</span>
+                      </div>
+                    </div>
+                  </div>
+
+                  <NavLink
+                    to="/dashboard/subscription"
+                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 self-end sm:self-auto"
+                  >
+                    <Crown className="h-3 w-3" />
+                    <span>Unlock Roster</span>
+                  </NavLink>
+                </div>
+              ))
+            ) : (
               todayAppointments.map((apt) => (
                 <div
                   key={apt.id}
                   className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                 >
                   <div className="flex items-center gap-3">
                     <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0">
                       <Clock className="h-4 w-4 text-indigo-600" />
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         <span className="font-bold text-sm text-slate-900">{apt.patient}</span>
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${apt.statusClass}`}>
                           {apt.status}
                         </span>
                       </div>
                       <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                         <span>{apt.time} ({apt.duration})</span>
                         <span>•</span>
                         <span>{apt.type}</span>
                         <span>•</span>
                         <span className="font-mono text-indigo-700 font-semibold">CPT {apt.cpt}</span>
                       </div>
                     </div>
                   </div>
 
                   <div className="flex items-center gap-2 self-end sm:self-auto">
                     <NavLink
                       to="/dashboard/scribe"
                       className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1"
                     >
                       <Mic className="h-3 w-3" />
                       <span>Scribe</span>
                     </NavLink>
                     {apt.type === 'Telehealth' && (
                       <NavLink
                         to="/dashboard/ehr"
                         className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1"
                       >
                         <Video className="h-3 w-3" />
                         <span>Join Room</span>
                       </NavLink>
                     )}
                   </div>
                 </div>
               ))
+            )}
           </div>
         </div>
```

---

### Blueprint 2: `src/App.tsx`

#### Target: `src/App.tsx`
- **Route Tree Modification** (lines 101–107):
  Wrap `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings` with `<SubscriptionGate requiredTier="starter">`.
  Preserve `/dashboard/subscription` as ungated.

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -101,11 +101,47 @@ export const App: React.FC = () => {
-                {/* Practice Operations Aliases */}
-                <Route path="calendar" element={<EhrWorkspace />} />
-                <Route path="clients" element={<EhrWorkspace />} />
-                <Route path="billing" element={<EhrWorkspace />} />
+                {/* Practice Operations Routes (Gated by Subscription) */}
+                <Route
+                  path="calendar"
+                  element={
+                    <SubscriptionGate
+                      requiredTier="starter"
+                      featureName="Calendar & Appointment Scheduling"
+                      headline="Calendar & Practice Management Required"
+                    >
+                      <EhrWorkspace />
+                    </SubscriptionGate>
+                  }
+                />
+                <Route
+                  path="clients"
+                  element={
+                    <SubscriptionGate
+                      requiredTier="starter"
+                      featureName="Client Clinical Roster"
+                      headline="Client Roster Subscription Required"
+                    >
+                      <EhrWorkspace />
+                    </SubscriptionGate>
+                  }
+                />
+                <Route
+                  path="billing"
+                  element={
+                    <SubscriptionGate
+                      requiredTier="starter"
+                      featureName="Practice Billing & Superbills"
+                      headline="Practice Billing Subscription Required"
+                    >
+                      <EhrWorkspace />
+                    </SubscriptionGate>
+                  }
+                />
                 <Route path="subscription" element={<Subscription />} />
-                <Route path="settings" element={<EhrWorkspace />} />
+                <Route
+                  path="settings"
+                  element={
+                    <SubscriptionGate
+                      requiredTier="starter"
+                      featureName="Practice Settings & Security"
+                      headline="Practice Settings Subscription Required"
+                    >
+                      <EhrWorkspace />
+                    </SubscriptionGate>
+                  }
+                />
               </Route>
```

---

### Blueprint 3: `src/components/layout/Sidebar.tsx`

#### Target: `src/components/layout/Sidebar.tsx`
- **Practice Operations Link Badges** (lines 198–219):
  Display upgrade badges when `!isSubscribed`.

```diff
--- a/src/components/layout/Sidebar.tsx
+++ b/src/components/layout/Sidebar.tsx
@@ -198,18 +198,31 @@ export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMob
           <div className="space-y-1">
             {practiceOps.map((op) => {
               const Icon = op.icon;
               const isActive = location.pathname === op.path;
+              const isLocked = !isSubscribed;
               return (
                 <NavLink
                   key={op.path}
                   to={op.path}
                   onClick={onCloseMobile}
-                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
+                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                     isActive
                       ? 'bg-slate-100 text-slate-900 font-semibold'
                       : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                   }`}
                 >
-                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`} />
-                  <span>{op.name}</span>
+                  <div className="flex items-center gap-2.5 truncate">
+                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`} />
+                    <span className="truncate">{op.name}</span>
+                  </div>
+                  {isLocked && (
+                    <span
+                      data-testid={`practice-op-upgrade-badge-${op.path.replace('/dashboard/', '')}`}
+                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-300 shadow-2xs shrink-0 ml-2"
+                    >
+                      <Crown className="h-3 w-3 text-amber-600" />
+                      Upgrade
+                    </span>
+                  )}
                 </NavLink>
               );
             })}
```

---

## 4. Verification & Blast Radius Matrix

| Test Suite / Route | Before Fix | After Blueprint Fix | Expected Result |
|---|---|---|---|
| `tests/challenger-m2-empirical-audit.ts` Part 2.1 (`/dashboard` ePHI leak) | ❌ Failed (6 ePHI strings leaked) | Passed (0 ePHI strings leaked, masked hero & roster rendered) | **PASS** |
| `tests/challenger-m2-empirical-audit.ts` Part 2.2 (`/dashboard/clients`, etc.) | ❌ Failed (Ungated EhrWorkspace exposed) | Passed (Lock overlay mounted, zero patient chart leak) | **PASS** |
| `scripts/verify-subscription-gate.mjs` Phase 1–5 | Passed | Continues to pass cleanly (badge display and core tool gates intact) | **PASS (17/17)** |
| `scripts/verify-auth-redirect.mjs` | Passed | Continues to pass cleanly (all routes redirect unauthenticated users to `/login`) | **PASS (12/12)** |
| `scripts/adversarial-security-audit.mjs` | Passed | Continues to pass cleanly | **PASS (26/26)** |
| `scripts/verify-stripe-checkout.mjs` | Passed | Untouched, continues to pass | **PASS (15/15)** |
| `tests/empirical-server-stress.ts` | Passed | Untouched, continues to pass | **PASS (27/27)** |
| `tests/forensic-m2-audit.ts` | Passed | Untouched, continues to pass | **PASS (22/22)** |
| `npm run build` | Passed | Full TypeScript compilation (`tsc --noEmit && vite build`) clean | **PASS (0 errors)** |

---

## 5. Implementation Sequence for Worker M2

1. **Apply Blueprint 1 to `src/pages/DashboardHome.tsx`**:
   - Add imports for `useSubscription` and icons `Lock`, `Crown`, `Zap`.
   - Conditionally render the locked hero card and masked schedule rows when `!isSubscribed || status === 'none'`.
2. **Apply Blueprint 2 to `src/App.tsx`**:
   - Wrap `calendar`, `clients`, `billing`, and `settings` routes in `<SubscriptionGate requiredTier="starter">`.
3. **Apply Blueprint 3 to `src/components/layout/Sidebar.tsx`**:
   - Render `data-testid="practice-op-upgrade-badge-{op}"` with Crown icon when `!isSubscribed`.
4. **Coordinate with Explorer 2 & 3 Changes**:
   - Incorporate Explorer 2's session verification in `server.ts` and return parameter defense in `subscription.tsx`.
   - Run `npx tsx tests/challenger-m2-empirical-audit.ts` and verify 53/53 tests pass with 0 failures and exit code 0.
