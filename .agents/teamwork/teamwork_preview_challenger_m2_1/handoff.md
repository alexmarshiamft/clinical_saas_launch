# Milestone 2 Challenger Report: Empirical Stress-Testing & Access Gating Audit

**Author**: Challenger 1 (`teamwork_preview_challenger_m2_1`)  
**Parent Conversation ID**: `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`  
**Milestone**: Milestone 2 (Stripe Subscription Billing & Access Gating)  
**Date**: 2026-10-05  
**Directory**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_challenger_m2_1`  
**Test Harness**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/tests/challenger-m2-empirical-audit.ts`  

---

## 1. Observation

### 1.1 Empirical Audit Summary
An empirical test harness (`tests/challenger-m2-empirical-audit.ts`) containing 53 automated test cases was executed against the live Express server (`server.ts`) and React client components.

```
Total Checks Run: 53
Passed: 40
Critical Vulnerabilities: 7
High Vulnerabilities: 2
Medium Warnings: 4
Verdict: REJECT
```

### 1.2 Exact Observations & Verbatim Code References

#### Finding 1: Full ePHI Exposure on `/dashboard` (DashboardHome) for Unsubscribed Users (CRITICAL)
- **File**: `src/App.tsx`, lines 48–50:
  ```tsx
  {/* Command Center Index */}
  <Route index element={<DashboardHome />} />
  ```
- **File**: `src/pages/DashboardHome.tsx`, lines 27–68, lines 149–185:
  ```tsx
  // Today's Clinical Schedule
  const todayAppointments = [
    { id: 'apt-1', time: '10:00 AM', duration: '60 min', patient: 'Jane Doe', type: 'Telehealth', cpt: '90837', status: 'Active', ... },
    { id: 'apt-2', time: '11:30 AM', duration: '45 min', patient: 'Marcus Vance', type: 'In-Person', cpt: '90834', ... },
    { id: 'apt-3', time: '02:00 PM', duration: '60 min', patient: 'Elena Rostova', type: 'Telehealth', cpt: '90837', ... },
    { id: 'apt-4', time: '03:30 PM', duration: '90 min', patient: 'Samuel Green', type: 'Intake Evaluation', cpt: '90791', ... },
  ];
  ...
  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
    {activePatient.name}
  </h2>
  <p className="text-indigo-200 text-sm leading-relaxed mb-4">
    DOB: <strong>{activePatient.dob}</strong> (Age {activePatient.age || 38}) • Current Session:{' '}
    <strong>CPT {activePatient.cptCode}</strong> ({activePatient.cptDesc || 'Psychotherapy, 60m'}).
  </p>
  ```
- **Observed Behavior**:
  When an unsubscribed user logs in (`status: 'none'`), the index route `/dashboard` renders `DashboardHome`.
  While `Header.tsx` hides the top patient context, the body of `/dashboard` renders the entire active patient hero card (`Jane Doe`, `#MC-88219`, `04/12/1988`, `Diagnosis: F41.1 Generalized Anxiety`) and all 4 scheduled appointments (`Jane Doe`, `Marcus Vance`, `Elena Rostova`, `Samuel Green`). Zero subscription check is performed on this route.

#### Finding 2: Practice Operations Routes (`/dashboard/clients`, `/dashboard/calendar`, `/dashboard/billing`, `/dashboard/settings`) Ungated (CRITICAL)
- **File**: `src/App.tsx`, lines 101–107:
  ```tsx
  {/* Practice Operations Aliases */}
  <Route path="calendar" element={<EhrWorkspace />} />
  <Route path="clients" element={<EhrWorkspace />} />
  <Route path="billing" element={<EhrWorkspace />} />
  <Route path="subscription" element={<Subscription />} />
  <Route path="settings" element={<EhrWorkspace />} />
  ```
- **File**: `src/tools/theraflow/EhrWorkspace.tsx`, lines 30–35:
  ```tsx
  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
    <div className="text-xs text-slate-500 font-semibold mb-1">Active Patient Chart</div>
    <div className="text-sm font-bold text-slate-900">{activePatient.name}</div>
    <div className="text-xs text-slate-500 font-mono mt-0.5">{activePatient.mrn} • CPT {activePatient.cptCode}</div>
  </div>
  ```
- **File**: `src/components/layout/Sidebar.tsx`, lines 86–91, lines 192–219:
  ```tsx
  const practiceOps = [
    { name: 'Calendar & Sessions', path: '/dashboard/calendar', icon: Calendar },
    { name: 'Client Roster', path: '/dashboard/clients', icon: Users },
    { name: 'Billing & Claims', path: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings & Security', path: '/dashboard/settings', icon: Settings },
  ];
  ```
- **Observed Behavior**:
  While `/dashboard/ehr/*` is wrapped in `<SubscriptionGate>`, the routes `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, and `/dashboard/settings` are directly mapped to `<EhrWorkspace />` without any gate.
  In `Sidebar.tsx`, `isToolLocked` is only applied to `coreTools`, while `practiceOps` links contain no locks or upgrade badges.
  An unsubscribed user clicking "Client Roster" or "Calendar & Sessions" can view `EhrWorkspace` and active patient chart ePHI (`Jane Doe`, `#MC-88219`, `CPT 90837`) with zero restrictions.

#### Finding 3: URL Query Parameter Lock Screen Bypass Without Backend Verification (CRITICAL)
- **File**: `src/lib/subscription.tsx`, lines 242–268:
  ```tsx
  // Return URL parameter interceptor for Stripe redirects (?status=success&session_id=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutStatus = urlParams.get('status');
      const sessionId = urlParams.get('session_id');
      const planParam = urlParams.get('plan') as SubscriptionTier | null;

      if (checkoutStatus === 'success' && (sessionId || planParam)) {
        const validPlan = planParam && SUBSCRIPTION_PLANS[planParam] ? planParam : tier;
        const nextRenewal = new Date(
          Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString();

        setTier(validPlan);
        setStatus('active');
        setRenewsOn(nextRenewal);
        if (sessionId) setLastSessionId(sessionId);
        persistState(validPlan, 'active', billingCycle, nextRenewal, 14, sessionId);
        console.log(`[Subscription] Checkout confirmed: tier=${validPlan}, session=${sessionId}`);
      }
    } catch (e) {
      console.warn('[Subscription] Error parsing return URL params:', e);
    }
  }, []);
  ```
- **Observed Behavior**:
  `SubscriptionProvider` mounts globally in `App.tsx` and executes on EVERY route.
  When an unsubscribed user visits `/dashboard/aura?status=success&plan=pro` or `/dashboard/ehr?status=success&session_id=cs_unverified_mock_123&plan=starter`, the `useEffect` intercepts the query parameters, sets `status = 'active'`, updates `tier = 'pro'`, and persists it to `localStorage`.
  The client NEVER calls `GET /api/subscription/session/:sessionId` to verify whether the session exists or was paid. The lock screen is immediately dismantled, granting full access to clinical tools.

#### Finding 4: Server Blindly Affirms Fabricated Sessions with `cs_test_` Prefix (HIGH)
- **File**: `server.ts`, lines 356–370:
  ```ts
  // 3. Fallback for simulated test session IDs
  if (sessionId.startsWith("cs_test_")) {
    return res.json({
      sessionId,
      status: "complete",
      paymentStatus: "paid",
      subscriptionStatus: "active",
      tier: "pro",
      planName: "Clinician Pro",
      billingCycle: "monthly",
      customerEmail: "sarah.chen.md@behavioralhealth.org",
      isSubscribed: true,
      simulated: true,
    });
  }
  ```
- **Observed Behavior**:
  Executing `GET /api/subscription/session/cs_test_attacker_completely_fabricated_never_paid_session`:
  Returns HTTP 200 with `status: "complete"`, `paymentStatus: "paid"`, `subscriptionStatus: "active"`, `isSubscribed: true`.
  Any string beginning with `cs_test_` is affirmed as an active, paid session, even if it was never created or processed through checkout.

#### Finding 5: Permanent Clinical Suite Access for Expired Free Trials (HIGH)
- **File**: `src/components/guards/SubscriptionGate.tsx`, lines 52–55:
  ```tsx
  // Access evaluation: active or trialing, with sufficient tier hierarchy
  const hasAccess =
    isSubscribed &&
    (status === 'trialing' || tierWeight[tier] >= tierWeight[requiredTier]);
  ```
- **File**: `src/lib/subscription.tsx`, line 270:
  ```tsx
  const isSubscribed = status === 'active' || status === 'trialing';
  ```
- **Observed Behavior**:
  When a user's subscription state in `localStorage` has `status: 'trialing'`, `trialDaysRemaining: 0`, and `renewsOn: '2024-01-01T00:00:00Z'` (a date 2 years in the past), `<SubscriptionGate>` evaluates `status === 'trialing'` as true and grants unrestricted access.
  Neither `SubscriptionGate` nor `SubscriptionProvider` verifies whether `renewsOn` has passed or `trialDaysRemaining <= 0`. Expired trials never expire in practice.

#### Finding 6: Missing User-Facing Cancellation CTA in UI (MEDIUM)
- **File**: `src/pages/Subscription.tsx`, lines 335–384
- **Observed Behavior**:
  `SubscriptionContext` exposes `cancelSubscription()`, but `Subscription.tsx` only offers `#simulate-unsubscribed-btn` in Developer Sandbox mode. There is no user-facing "Cancel Subscription" button or confirmation dialog for active subscribers.

#### Finding 7: Cross-Session Subscription State Persistence Across Logout (MEDIUM)
- **File**: `src/lib/auth.tsx`, lines 375–384
- **Observed Behavior**:
  Calling `logout()` clears `clinical_saas_session` and `preferredRole`, but leaves `clinical_saas_subscription` untouched in `localStorage`. If Clinician A subscribes to Practice Group ($249) and logs out, Clinician B logging in on the same browser inherits Clinician A's subscription tier.

---

## 2. Logic Chain

1. **Requirement §R2 and AC3 Mandate Strict Access Gating**:
   - ORIGINAL_REQUEST §R2 states: "Restrict access to the core clinical tools until an active subscription is confirmed."
   - Dispatch Scope Item 2 requires: "Stress-test `<SubscriptionGate>`: verify that an unsubscribed user cannot bypass the lock screen or leak ePHI under any query parameter or storage condition."
2. **ePHI Leakage on Ungated Pages (Observations 1 & 2)**:
   - Observation 1 shows that `/dashboard` (the landing page after login) contains active patient details (`Jane Doe`, `#MC-88219`, `04/12/1988`, diagnosis, and schedule). Because `/dashboard` is ungated, an unsubscribed clinician sees statutory ePHI immediately upon signing in.
   - Observation 2 shows that `/dashboard/clients`, `/dashboard/calendar`, `/dashboard/billing`, and `/dashboard/settings` render `<EhrWorkspace />` without `<SubscriptionGate>`. An unsubscribed user navigating through the sidebar accesses patient charts.
   - Deduction: Access to clinical tools and ePHI is not restricted for unsubscribed users on `/dashboard` and practice operations routes.
3. **Client-Side Parameter Tampering (Observation 3)**:
   - In `src/lib/subscription.tsx`, any URL containing `?status=success&session_id=...` or `?status=success&plan=...` immediately activates the subscription in `localStorage` without backend verification.
   - Empirical test confirmed that an unsubscribed user visiting `/dashboard/aura?status=success&plan=pro` or `/dashboard/ehr?status=success&session_id=fake&plan=starter` dismantles `<SubscriptionGate>` and gains full access.
   - Deduction: The lock screen can be trivially bypassed via URL query parameters without paying or completing checkout.
4. **Backend Session Forgery (Observation 4)**:
   - In `server.ts`, `GET /api/subscription/session/:sessionId` treats any string starting with `cs_test_` as valid and paid. Even if client-side verification were added, the server would confirm fabricated session IDs.
   - Deduction: The session verification endpoint does not provide integrity against forged session IDs.
5. **Trial Expiration Bypass (Observation 5)**:
   - Neither `SubscriptionGate` nor `useSubscription` evaluates trial expiration dates. Users with expired trials (`trialDaysRemaining: 0`) retain permanent access.
   - Deduction: Trial access control fails closed; instead, it remains permanently open.

---

## 3. Caveats

- **Express Input Validation Robustness**: Under `POST /api/create-checkout-session`, `server.ts` demonstrated good resistance to input fuzzing: 23 boundary test cases (null, whitespace, boolean, numbers, SQL injection, XSS, prototype pollution keys) were cleanly handled with HTTP 400, and oversized payloads were capped by Express's 100KB body parser returning HTTP 413.
- **Header Patient Context Guard**: `Header.tsx` successfully masks the active patient encounter bar when unsubscribed (`Patient Encounter Context: Inactive (Subscription Required)`). The ePHI leak occurs in the main page body (`DashboardHome.tsx` and `EhrWorkspace.tsx`), not the header.
- **Simulated Test Mode Scope**: In a production environment with live Stripe webhooks, session verification would typically be driven by server-side webhook events (`checkout.session.completed`) updating a database rather than client-driven URL parameters.

---

## 4. Conclusion

### Explicit Verdict: REJECT

Milestone 2 cannot be approved in its current state due to critical security and access gating vulnerabilities:
1. **Critical ePHI Leakage**: Unsubscribed clinicians can view full patient identities (`Jane Doe`, `#MC-88219`, `04/12/1988`, psychiatric diagnoses, and clinical schedules) on `/dashboard` and through ungated routes (`/dashboard/clients`, `/dashboard/calendar`, `/dashboard/billing`, `/dashboard/settings`).
2. **Trivial Lock Screen Bypass**: Any unsubscribed user can bypass `<SubscriptionGate>` on clinical tools by appending `?status=success&plan=pro` to the URL.
3. **Session Verification Integrity Flaw**: `server.ts` blindly returns `status: "complete"`, `isSubscribed: true` for any fabricated session ID prefixed with `cs_test_`.
4. **Permanent Expired Trial Access**: Free trials never expire because `<SubscriptionGate>` does not check renewal timestamps or days remaining.

### Remediation Guidance for Worker M2:
1. Wrap `/dashboard/clients`, `/dashboard/calendar`, `/dashboard/billing`, and `/dashboard/settings` in `<SubscriptionGate requiredTier="starter">` in `App.tsx`, and add lock badges in `Sidebar.tsx`.
2. In `DashboardHome.tsx`, conditionally mask or lock patient cards and today's schedule when `!isSubscribed`.
3. In `src/lib/subscription.tsx`, only accept `?status=success` on `/dashboard/subscription`, and asynchronously verify `session_id` against `GET /api/subscription/session/:sessionId` before activating `status = 'active'`.
4. In `server.ts`, remove the unconditional fallback for `cs_test_` in `GET /api/subscription/session/:sessionId`; only return `complete` if the session actually exists in `sessionStore`.
5. In `SubscriptionGate.tsx`, check whether `status === 'trialing'` is still valid by verifying `trialDaysRemaining > 0` and `new Date(renewsOn) > new Date()`.

---

## 5. Verification Method

To independently reproduce all empirical findings:

1. **Run the Challenger Empirical Audit Suite**:
   ```bash
   npx tsx tests/challenger-m2-empirical-audit.ts
   ```
   **Expected Result**:
   - Total Checks: 53
   - Fails with exit code 2 and explicit `VERDICT: REJECT` output.
   - Highlights 7 Critical and 2 High findings with exact reproducible traces.

2. **Verify URL Parameter Bypass**:
   Mount the application at `http://localhost:3000/dashboard/aura?status=success&plan=pro` with `localStorage` set to `{ status: 'none' }`.
   Observe that `<SubscriptionGate>` dismantles and grants access to Aura Assistant Copilot.

3. **Verify ePHI Leakage on Ungated Routes**:
   Mount the application at `http://localhost:3000/dashboard` and `http://localhost:3000/dashboard/clients` with `status: 'none'`.
   Inspect the DOM to observe `Jane Doe`, `#MC-88219`, and appointment schedules.

4. **Verify Blind Session Affirmation**:
   ```bash
   curl -s http://127.0.0.1:3000/api/subscription/session/cs_test_attacker_fake_session_123
   ```
   Observe HTTP 200 response returning `"isSubscribed": true`.
