# Milestone 1 Iteration 2 Explorer 3 Handoff: Unified Test Verification Strategy

**Working Directory:** `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_it2_3`  
**Target Project:** `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch`  
**Date:** 2026-10-05  
**Explorer:** Explorer 3 (`teamwork_preview_explorer_m1_it2_3`)  
**Parent Conversation ID:** `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`  

---

## 1. Observation

### 1.1 Baseline Test Suite Execution

1. **Adversarial Security Audit (`node scripts/adversarial-security-audit.mjs`):**
   - Command: `node scripts/adversarial-security-audit.mjs`
   - Result: Exited with **Code 1**.
   - Total Tests: 26. Passed: 23. Failed: 3.
   - Verbatim Failures:
     ```
     ❌ [FAIL] [S3-attack-string-user] Attack: Forged string user property ({"user": "attacker", "session": "dummy"})
         ↳ Path: /dashboard/ehr | ePHI Leaked: Jane Doe, #MC-88219, 04/12/1988, CPT 90837 | Bypassed Guard: YES (VULNERABILITY)
         ↳ Expected: MUST be blocked and redirected to /login (no bypass)
     ❌ [FAIL] [S3-attack-arbitrary-object] Attack: Forged arbitrary user ID ({"user": {"id": "unauthorized-intruder"}, "session": {"access_token": "fake"}})
         ↳ Path: /dashboard/scribe | ePHI Leaked: Jane Doe, #MC-88219, 04/12/1988, CPT 90837, Live Acoustic Transcript | Bypassed Guard: YES (VULNERABILITY)
         ↳ Expected: MUST be blocked and redirected to /login (no bypass)
     ❌ [FAIL] [S3-attack-expired-token] Attack: Expired session token (expires_at: 100 [Year 1970])
         ↳ Path: /dashboard/phi-scrubber | ePHI Leaked: Jane Doe, #MC-88219, 04/12/1988, CPT 90837, Unredacted Clinical Source | Honored Expired Token: YES (VULNERABILITY)
         ↳ Expected: MUST reject expired session and redirect to /login
     VERDICT: REJECT (Scope requirement 3 violated; unauthenticated route bypass confirmed).
     ```

2. **Baseline Auth Redirection Suite (`node scripts/verify-auth-redirect.mjs`):**
   - Command: `node scripts/verify-auth-redirect.mjs`
   - Result: Exited with **Code 0**.
   - Output: `Audit Summary: 12 Passed, 0 Failed`.
   - All 10 protected routes blocked unauthenticated users and redirected to `/login?redirect=...`.
   - 1-Click Demo Clinician Sign-In round-trip successfully redirected and authenticated.
   - Direct access with valid demo credentials successfully accessed `/dashboard`.

3. **Production Build (`npm run build` & `bash scripts/verify-build.sh`):**
   - Command: `npm run build`
   - Output:
     ```
     > tsc --noEmit && vite build
     vite v6.4.3 building for production...
     ✓ 1744 modules transformed.
     ✓ built in 2.36s
     ```
   - Result: Exited with **Code 0**, zero TypeScript errors.

4. **Deep Auth Stress Suite (`npx tsx tests/empirical-auth-stress.tsx`):**
   - Result: Exited with **Code 0**, 17/17 passed.

5. **Express API Server Stress Suite (`npx tsx tests/empirical-server-stress.ts`):**
   - Result: Exited with **Code 0**, 27/27 passed.

### 1.2 Inspection of Vulnerable Code

1. **`src/lib/auth.tsx` (Lines 95–132 and 165–182):**
   ```tsx
   const [user, setUser] = useState<User | null>(() => {
     if (typeof window !== 'undefined') {
       const storedDemo = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
       if (storedDemo) {
         try {
           const parsed = JSON.parse(storedDemo);
           if (parsed && parsed.user) return parsed.user;
         } catch {}
       }
     }
     return null;
   });
   ```
   ```tsx
   if (storedDemo) {
     try {
       const parsed = JSON.parse(storedDemo);
       if (parsed && parsed.user && parsed.session) {
         if (isMounted) {
           setUser(parsed.user);
           setSession(parsed.session);
           setIsDemoClinician(true);
           setLoading(false);
         }
         return;
       }
     } catch (err) {
       console.warn('[Auth] Failed to parse stored demo session:', err);
       localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
     }
   }
   ```
   Observed that:
   - Any parsed truthy `.user` (string `"attacker"`) is assigned to `user`.
   - Any object `.user` (even with intruder id) is accepted.
   - `parsed.session.expires_at` is never evaluated against the current timestamp.

2. **`src/pages/Login.tsx` (Lines 22–32):**
   ```tsx
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const redirectTarget = searchParams.get('redirect') || '/dashboard';
   ```
   Observed that:
   - External URLs (e.g. `https://evil-phishing.com`) or javascript schemes (`javascript:alert(1)`) are not filtered.

3. **`package.json` (Lines 15–18):**
   ```json
   "test:auth": "node scripts/verify-auth-redirect.mjs",
   "test:stripe": "node scripts/verify-stripe-checkout.mjs",
   "test:css": "node scripts/verify-css-bleed.mjs"
   ```
   Observed that:
   - There is no npm script to execute `scripts/adversarial-security-audit.mjs`.

---

## 2. Logic Chain

1. **Premise 1:** The Milestone 1 Gate requires that unauthenticated users cannot view protected clinical routes under any scenario, and that `node scripts/adversarial-security-audit.mjs` passes all 26 assertions with exit code 0.
2. **Premise 2:** In `src/lib/auth.tsx`, checking only `parsed.user && parsed.session` allows forged string users, arbitrary intruder objects, and expired tokens to hydrate `user` state, directly bypassing `<ProtectedRoute>` and leaking Jane Doe ePHI.
3. **Premise 3:** Adding a pure validation function `validateDemoSession` that enforces:
   - `parsed.user` is an object with `id === DEMO_CLINICIAN_USER.id`,
   - `parsed.session` is an object with valid `access_token`,
   - `parsed.session.expires_at` is a number strictly greater than `Math.floor(Date.now() / 1000)`,
   and purging the stored item on any failure, deterministically blocks all 3 attack vectors and returns user state to null.
4. **Premise 4:** In `src/pages/Login.tsx`, sanitizing `redirectTarget` to ensure it starts with `/`, does not start with `//`, and does not include `:\` prevents open redirect phishing attacks and React Router v7 navigation crashes.
5. **Premise 5:** In `package.json`, adding `"test:security": "node scripts/adversarial-security-audit.mjs"` provides a unified command for running the adversarial audit.
6. **Deductive Conclusion:** Implementing these targeted patches will bring `scripts/adversarial-security-audit.mjs` to 26/26 PASS (Exit Code 0), preserve 12/12 PASS on `scripts/verify-auth-redirect.mjs`, preserve 0 errors on `npm run build`, and provide an airtight verification path for Gate approval.

---

## 3. Caveats

- **Supabase Production Mode:** In an environment with active Supabase production keys, session validation is handled via Supabase JWT verification (`supabase.auth.getSession()`). The `STORAGE_KEY_DEMO_SESSION` is strictly for the sandbox/demo clinician mode.
- **Unimplemented Future Scripts in `package.json`:** `package.json` currently references `verify-stripe-checkout.mjs` and `verify-css-bleed.mjs`, which are scheduled for Milestones 2 and 4. They are not part of Milestone 1 scope.
- **Local Storage Removal Timing:** In dry-run testing, removing corrupt keys on mount is safe and idempotent in React 19 + JSDOM.

---

## 4. Conclusion & Required Worker Remediation

### Required Code Changes

1. **`src/lib/auth.tsx`:**
   - Add `validateDemoSession` and `parseStoredDemoSession`.
   - Update `user`, `session`, `isDemoClinician`, and `loading` `useState` initializers to use `parseStoredDemoSession()`.
   - Update `restoreSession` in `useEffect` to use `parseStoredDemoSession()`.
   - Update `loginAsDemo()` to assign a fresh `expires_at` (`Math.floor(Date.now() / 1000) + 3600 * 24 * 30`).

2. **`src/pages/Login.tsx`:**
   - Sanitize `redirectTarget`:
     ```tsx
     const rawRedirect = searchParams.get('redirect');
     const redirectTarget = (
       rawRedirect &&
       rawRedirect.startsWith('/') &&
       !rawRedirect.startsWith('//') &&
       !rawRedirect.includes(':\\')
     ) ? rawRedirect : '/dashboard';
     ```

3. **`package.json`:**
   - Add `"test:security": "node scripts/adversarial-security-audit.mjs"` under `scripts`.

---

## 5. Verification Method

To independently verify the complete test suite and gate readiness:

1. **Execute Adversarial Security Suite:**
   ```bash
   npm run test:security
   ```
   *Expected Outcome:* Exits with code `0`.
   *Verbatim Match:*
   `TOTAL TESTS: 26 | PASSED: 26 | FAILED: 0`  
   `VERDICT: APPROVE`

2. **Execute Auth Redirection Suite:**
   ```bash
   npm run test:auth
   ```
   *Expected Outcome:* Exits with code `0`.
   *Verbatim Match:*
   `Audit Summary: 12 Passed, 0 Failed`  
   `ALL AUTHENTICATION AND ROUTE GUARD CHECKS PASSED WITH 100% SUCCESS.`

3. **Verify Build & Compilation:**
   ```bash
   npm run build
   ```
   *Expected Outcome:* Exits with code `0`, 0 TypeScript errors.

4. **Verify Build Shell Harness:**
   ```bash
   bash scripts/verify-build.sh
   ```
   *Expected Outcome:* Exits with code `0`.

5. **Regression Verification:**
   ```bash
   npx tsx tests/empirical-auth-stress.tsx
   npx tsx tests/empirical-server-stress.ts
   ```
   *Expected Outcome:* Both exit with code `0`.

### Invalidation Conditions
- If any of the 26 adversarial security assertions fail or exit non-zero.
- If any of the 12 auth redirection assertions fail.
- If TypeScript compilation emits any error during `npm run build`.
- If an unauthenticated probe leaks `Jane Doe`, `#MC-88219`, or any ePHI marker.
