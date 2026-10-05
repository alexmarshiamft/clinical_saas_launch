# Unified Test Verification Strategy Report: Milestone 1 Iteration 2

**Author:** Explorer 3 (`teamwork_preview_explorer_m1_it2_3`)  
**Target:** Milestone 1 Core Foundation & Auth Shell (`clinical_saas_launch`)  
**Parent Task ID:** `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`  
**Date:** 2026-10-05  

---

## 1. Executive Summary

Milestone 1 Gate failed on **Challenger 1 REJECT** due to 3 adversarial vulnerabilities in route security and session handling. When subjected to hostile localStorage tampering (forged string user, arbitrary intruder user object, or expired token), `src/lib/auth.tsx` accepted the malformed session payloads, allowing unauthenticated visitors to bypass `<ProtectedRoute>` and render protected clinical ePHI (patient Jane Doe, MRN #MC-88219, clinical notes).

This report delivers a **Unified Test Verification Strategy** for Milestone 1 Iteration 2 designed to:
1. Guarantee `node scripts/adversarial-security-audit.mjs` transitions from **23/26 (Exit Code 1)** to **26/26 (Exit Code 0, APPROVE)**.
2. Guarantee `node scripts/verify-auth-redirect.mjs` maintains **12/12 (Exit Code 0)** with zero regressions.
3. Guarantee `npm run build` and `scripts/verify-build.sh` continue to pass cleanly with **0 TypeScript errors (Exit Code 0)**.
4. Integrate `npm run test:security` into `package.json` as a standardized CI/audit command.
5. Provide a rigorous 6-phase verification checklist for Worker, Reviewer 1, Reviewer 2, and Challenger.

---

## 2. Test Suite Anatomy & Test Inventory

### 2.1 Adversarial Security Audit (`scripts/adversarial-security-audit.mjs`)
The adversarial audit executes **26 programmatic assertions across 5 distinct test suites**:

| Suite | Test ID | Description / Probe Payload | Current Status | Expected Iteration 2 Status |
|---|---|---|---|---|
| **Suite 1: Clean Unauthenticated Probing** | `S1-/dashboard` | Empty storage access to `/dashboard` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/ehr` | Empty storage access to `/dashboard/ehr` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/scribe` | Empty storage access to `/dashboard/scribe` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/aura` | Empty storage access to `/dashboard/aura` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/phi-scrubber` | Empty storage access to `/dashboard/phi-scrubber` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/calendar` | Empty storage access to `/dashboard/calendar` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/clients` | Empty storage access to `/dashboard/clients` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/billing` | Empty storage access to `/dashboard/billing` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/subscription` | Empty storage access to `/dashboard/subscription` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/settings` | Empty storage access to `/dashboard/settings` | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/ehr/patients/p-101/notes` | Deep EHR route access | ✓ PASS | ✓ PASS |
| | `S1-/dashboard/scribe?encounter=enc_99214&patient=101` | Parameterized clinical encounter route | ✓ PASS | ✓ PASS |
| **Suite 2: Storage Crash Resilience** | `S2-corrupt-json` | Malformed unclosed JSON string `{"user": {"id": "123"` | ✓ PASS | ✓ PASS |
| | `S2-non-json` | Raw unparsed JWT string | ✓ PASS | ✓ PASS |
| | `S2-primitive-number` | JSON number primitive `12345` | ✓ PASS | ✓ PASS |
| | `S2-primitive-bool` | JSON boolean `true` | ✓ PASS | ✓ PASS |
| | `S2-empty-obj` | Empty JSON object `{}` | ✓ PASS | ✓ PASS |
| | `S2-null-keys` | Null user and session keys `{"user": null, "session": null}` | ✓ PASS | ✓ PASS |
| | `S2-user-without-session` | User object without session `{"user": {"id": "some-id"}}` | ✓ PASS | ✓ PASS |
| | `S2-session-without-user` | Session without user `{"session": {"access_token": "tok"}}` | ✓ PASS | ✓ PASS |
| **Suite 3: Adversarial Route Bypass (Failure Point)** | `S3-attack-string-user` | Forged string user `{"user": "attacker", "session": "dummy"}` | ❌ **FAIL** | ✓ **PASS** |
| | `S3-attack-arbitrary-object` | Arbitrary user object `{"user": {"id": "unauthorized-intruder"}, ...}` | ❌ **FAIL** | ✓ **PASS** |
| | `S3-attack-expired-token` | Expired session token `expires_at: 100` (Epoch 1970) | ❌ **FAIL** | ✓ **PASS** |
| **Suite 4: Navigation & Injection Safety** | `S4-open-redirect-crash` | Navigation via `?redirect=https://evil-phishing.com` | ✓ PASS | ✓ PASS |
| | `S4-javascript-uri` | Navigation via `?redirect=javascript:alert(1)` | ✓ PASS | ✓ PASS |
| **Suite 5: Legitimate Demo Clinician** | `S5-legitimate-demo` | Official Demo Clinician Session (`Dr. Sarah Chen, MD`) | ✓ PASS | ✓ PASS |

### 2.2 Baseline Auth Redirection Suite (`scripts/verify-auth-redirect.mjs`)
The baseline suite executes **12 end-to-end assertions across 3 operational phases**:

1. **Phase 1: Unauthenticated Protected Route Probing (10 Assertions):**
   - Probes: `/dashboard`, `/dashboard/ehr`, `/dashboard/scribe`, `/dashboard/aura`, `/dashboard/phi-scrubber`, `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, `/dashboard/subscription`, `/dashboard/scribe?encounter=enc_99214&patient=101`.
   - Criteria: Redirected to `/login?redirect=...`, zero clinical content rendered. Currently: **10/10 PASS**.
2. **Phase 2: 1-Click Demo Clinician Sign-In Flow (1 Assertion):**
   - Criteria: Clicking `#demo-clinician-signin-btn` stores session, redirects back to `/dashboard/scribe?patient=101`, renders `Dr. Sarah Chen, MD` and unlocked workspace. Currently: **1/1 PASS**.
3. **Phase 3: Direct Authenticated Access (1 Assertion):**
   - Criteria: Pre-existing valid session enters `/dashboard` without redirection, renders `Clinical Command Center` and `Jane Doe`. Currently: **1/1 PASS**.
- Total: **12/12 PASS (Exit Code: 0)**.

### 2.3 Empirical Stress Suites
1. **Auth Engine Lifecycle & Concurrency (`tests/empirical-auth-stress.tsx`):**
   - 17 test cases across 6 categories (cold start, session hydration, profile derivation, corrupt storage recovery, rapid toggle race conditions, exception monitoring).
   - Current status: **17/17 PASS (Exit Code: 0)**.
2. **Express API Server & Stripe Simulator (`tests/empirical-server-stress.ts`):**
   - 27 test cases across 5 categories (`/api/health` schema, valid checkout sessions, prototype pollution defense, 100-request concurrency burst, UUID collision freedom).
   - Current status: **27/27 PASS (Exit Code: 0)**.

### 2.4 Production Build & Type Verification (`scripts/verify-build.sh` / `npm run build`)
- Executes `tsc --noEmit` followed by `vite build`.
- Current status: **1744 modules transformed, 0 TypeScript errors, bundle generated in `dist/` (Exit Code: 0)**.

---

## 3. Root Cause Analysis (RCA)

### 3.1 Failure 1: String User Forgery (`S3-attack-string-user`)
- **Code Location:** `src/lib/auth.tsx:101`, `127`, `175`.
- **Mechanism:** The code checked `if (parsed && parsed.user) return parsed.user`. When `parsed.user` is a raw string `"attacker"`, JavaScript evaluates it as truthy. As a result:
  - `user` state was set to `"attacker"`.
  - `isDemoClinician` state was set to `true`.
  - In `src/components/guards/ProtectedRoute.tsx:40`, `if (!user)` evaluated to `false`.
  - The guard rendered the protected route (`/dashboard/ehr`), revealing patient Jane Doe's ePHI.

### 3.2 Failure 2: Arbitrary Object User Forgery (`S3-attack-arbitrary-object`)
- **Code Location:** `src/lib/auth.tsx:168-175`.
- **Mechanism:** The code checked `if (parsed && parsed.user && parsed.session)`. Any arbitrary object with an untrusted `id` (e.g. `{ id: 'unauthorized-intruder' }`) was accepted as a valid demo clinician. The guard treated the session as authenticated.

### 3.3 Failure 3: Expired Token Reuse (`S3-attack-expired-token`)
- **Code Location:** `src/lib/auth.tsx:168-175`.
- **Mechanism:** The demo session parser never checked `session.expires_at`. An expired session payload with `expires_at: 100` (timestamp from January 1970) was treated as active, granting unauthorized access to `/dashboard/phi-scrubber`.

### 3.4 Open Redirect & Navigation Crash Vulnerability
- **Code Location:** `src/pages/Login.tsx:23, 30, 47, 62`.
- **Mechanism:** `redirectTarget = searchParams.get('redirect') || '/dashboard'`. When `redirect` is an external URL (`https://evil-phishing.com`) or pseudo-protocol (`javascript:alert(1)`), React Router v7's `navigate()` throws `Error: External navigation is not allowed`. Furthermore, unvalidated redirect targets expose users to open redirect phishing attacks upon authentication.

---

## 4. Remediation Blueprint & Exact Code Patches

### Patch 1: Strict Session Validation & Anti-Forgery in `src/lib/auth.tsx`

Add the pure validator `validateDemoSession` and helper `parseStoredDemoSession`. Update `useState` initializers and `restoreSession` to fail closed and immediately purge any invalid payloads.

```tsx
/**
 * Strict validator for persisted demo clinician session.
 * Protects against adversarial localStorage token injection, user tampering,
 * and expired session reuse.
 */
export function validateDemoSession(raw: unknown): { user: User; session: Session } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as { user?: unknown; session?: unknown };
  
  // 1. User structure & deterministic ID verification
  if (!candidate.user || typeof candidate.user !== 'object' || Array.isArray(candidate.user)) {
    return null;
  }
  const candidateUser = candidate.user as Record<string, any>;
  if (candidateUser.id !== DEMO_CLINICIAN_USER.id) {
    return null;
  }

  // 2. Session structure & access token verification
  if (!candidate.session || typeof candidate.session !== 'object' || Array.isArray(candidate.session)) {
    return null;
  }
  const candidateSession = candidate.session as Record<string, any>;
  if (typeof candidateSession.access_token !== 'string' || candidateSession.access_token.length === 0) {
    return null;
  }

  // 3. Expiration verification (must be future timestamp in seconds)
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof candidateSession.expires_at !== 'number' || candidateSession.expires_at <= nowSec) {
    return null;
  }

  return {
    user: candidate.user as User,
    session: candidate.session as Session,
  };
}

/**
 * Safely reads and validates the demo session from localStorage.
 * Automatically purges corrupted, tampered, or expired tokens.
 */
export function parseStoredDemoSession(storageKey = STORAGE_KEY_DEMO_SESSION): { user: User; session: Session } | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    const validated = validateDemoSession(parsed);
    if (!validated) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return validated;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}
```

Update `AuthProvider` state initializers:
```tsx
  const [user, setUser] = useState<User | null>(() => {
    return parseStoredDemoSession()?.user ?? null;
  });

  const [session, setSession] = useState<Session | null>(() => {
    return parseStoredDemoSession()?.session ?? null;
  });

  const [isDemoClinician, setIsDemoClinician] = useState<boolean>(() => {
    return Boolean(parseStoredDemoSession());
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (isSupabaseConfigured) {
      if (parseStoredDemoSession()) return false;
      return true;
    }
    return false;
  });
```

Update `restoreSession` in `useEffect`:
```tsx
        // 1. Check for persisted Demo Clinician session
        if (typeof window !== 'undefined') {
          const restored = parseStoredDemoSession();
          if (restored) {
            if (isMounted) {
              setUser(restored.user);
              setSession(restored.session);
              setIsDemoClinician(true);
              setLoading(false);
            }
            return;
          }
        }
```

Update `loginAsDemo`:
```tsx
  const loginAsDemo = () => {
    // Generate fresh session with current expiration
    const freshSession: Session = {
      ...DEMO_CLINICIAN_SESSION,
      expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_DEMO_SESSION,
        JSON.stringify({ user: DEMO_CLINICIAN_USER, session: freshSession })
      );
      localStorage.setItem(STORAGE_KEY_PREFERRED_ROLE, 'therapist');
    }
    setUser(DEMO_CLINICIAN_USER);
    setSession(freshSession);
    setIsDemoClinician(true);
    setLoading(false);
  };
```

---

### Patch 2: Safe Redirect Sanitization in `src/pages/Login.tsx`

Replace unvalidated `redirectTarget` with a strict relative-path sanitizer:

```tsx
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Sanitize redirect target: must be a relative URL starting with single '/'
  const rawRedirect = searchParams.get('redirect');
  const redirectTarget = (
    rawRedirect &&
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.includes(':\\')
  ) ? rawRedirect : '/dashboard';
```

---

### Patch 3: Standardized NPM Scripts in `package.json`

Add `"test:security"` to `scripts` in `package.json`:

```json
  "scripts": {
    "dev": "tsx server.ts",
    "build": "tsc --noEmit && vite build",
    "start": "tsx server.ts",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "clean": "rm -rf dist",
    "seed:demo": "tsx scripts/seed-demo.ts",
    "test:auth": "node scripts/verify-auth-redirect.mjs",
    "test:security": "node scripts/adversarial-security-audit.mjs",
    "test:stripe": "node scripts/verify-stripe-checkout.mjs",
    "test:css": "node scripts/verify-css-bleed.mjs"
  },
```

---

## 5. Comprehensive Verification Checklist

This checklist provides the exact commands, expected outputs, and acceptance criteria for the Worker during implementation, the Reviewers during code review, and the Challenger during gate verification.

### Phase 1: Pre-Implementation Baseline Verification
- [ ] Run `npm run build` — Verify 0 TypeScript errors and exit code 0.
- [ ] Run `npm run test:auth` — Verify 12/12 assertions pass and exit code 0.
- [ ] Run `node scripts/adversarial-security-audit.mjs` — Confirm failure on `S3-attack-string-user`, `S3-attack-arbitrary-object`, and `S3-attack-expired-token` (exit code 1).

### Phase 2: Implementation of Patches
- [ ] Apply Patch 1 to `src/lib/auth.tsx` (`validateDemoSession`, `parseStoredDemoSession`, updated initializers and `loginAsDemo`).
- [ ] Apply Patch 2 to `src/pages/Login.tsx` (redirect URL sanitization).
- [ ] Apply Patch 3 to `package.json` (add `"test:security": "node scripts/adversarial-security-audit.mjs"`).

### Phase 3: Targeted Verification of Adversarial Security Audit
- [ ] Run `npm run test:security` (or `node scripts/adversarial-security-audit.mjs`).
  - **Required Result:**
    - `TOTAL TESTS: 26 | PASSED: 26 | FAILED: 0`
    - `VERDICT: APPROVE`
    - Exit code: `0`
  - **Key Individual Checks:**
    - `S3-attack-string-user` -> ✓ [PASS] Path: /login | ePHI Leaked: None | Bypassed Guard: NO
    - `S3-attack-arbitrary-object` -> ✓ [PASS] Path: /login | ePHI Leaked: None | Bypassed Guard: NO
    - `S3-attack-expired-token` -> ✓ [PASS] Path: /login | ePHI Leaked: None | Honored Expired Token: NO
    - `S4-open-redirect-crash` -> ✓ [PASS] Crash Thrown: NO (Gracefully Handled)
    - `S4-javascript-uri` -> ✓ [PASS] Crash Thrown: NO (Gracefully Handled)
    - `S5-legitimate-demo` -> ✓ [PASS] Path: /dashboard | Doctor: true | Patient: true

### Phase 4: Baseline Auth Redirection Non-Regression
- [ ] Run `npm run test:auth` (or `node scripts/verify-auth-redirect.mjs`).
  - **Required Result:**
    - `Audit Summary: 12 Passed, 0 Failed`
    - `ALL AUTHENTICATION AND ROUTE GUARD CHECKS PASSED WITH 100% SUCCESS.`
    - Exit code: `0`
  - **Key Checks:**
    - 10 protected routes probed with empty storage -> strictly redirected to `/login?redirect=...`.
    - 1-click Demo Clinician sign-in round-trip -> successful login as Dr. Sarah Chen, MD, redirects back to `/dashboard/scribe?patient=101`.
    - Direct access with pre-seeded demo session -> directly opens `/dashboard`, renders Command Center and Jane Doe.

### Phase 5: Deep Stress & Concurrency Regression Verification
- [ ] Run `npx tsx tests/empirical-auth-stress.tsx`.
  - **Required Result:** `Auth Engine Stress Audit Summary: 17 Passed, 0 Failed (Total: 17)`, Exit code: `0`.
- [ ] Run `npx tsx tests/empirical-server-stress.ts`.
  - **Required Result:** `Server Stress Audit Summary: 27 Passed, 0 Failed (Total: 27)`, Exit code: `0`.

### Phase 6: Production Build & Bundle Verification
- [ ] Run `npm run build`.
  - **Required Result:**
    - `tsc --noEmit`: 0 type errors.
    - `vite build`: Modules transformed cleanly, chunks generated in `dist/`.
    - Exit code: `0`.
- [ ] Run `bash scripts/verify-build.sh`.
  - **Required Result:**
    - `dist/index.html verified.`
    - `ALL CHECKS PASSED: Application built cleanly with 0 errors!`
    - Exit code: `0`.

### Phase 7: Challenger Sign-Off & Gate Approval Criteria
The Challenger must approve Milestone 1 Iteration 2 if and only if:
1. `npm run test:security` exits 0 with 26/26 tests passed and explicit verdict `APPROVE`.
2. `npm run test:auth` exits 0 with 12/12 tests passed.
3. `npm run build` exits 0 with 0 TypeScript errors.
4. Single-line probe confirms that hostile localStorage tampering cannot bypass `<ProtectedRoute>` or leak Jane Doe ePHI.

---

## 6. Summary of Test Commands Matrix

| Command | Target Scope | Pass Criteria | Importance |
|---|---|---|---|
| `npm run test:security` | Adversarial Security & Anti-Forgery Suite | 26/26 Passed, Exit 0 | **GATE BLOCKING** |
| `npm run test:auth` | Auth Route Guard & Redirection Suite | 12/12 Passed, Exit 0 | **GATE BLOCKING** |
| `npm run build` | TypeScript Compiler & Vite Bundle | 0 TS errors, Exit 0 | **GATE BLOCKING** |
| `bash scripts/verify-build.sh` | Shell Build & Artifact Presence | dist/index.html exists, Exit 0 | High |
| `npx tsx tests/empirical-auth-stress.tsx` | Deep Auth Lifecycle & Race Conditions | 17/17 Passed, Exit 0 | Medium-High |
| `npx tsx tests/empirical-server-stress.ts` | Express API, CORS & Concurrency | 27/27 Passed, Exit 0 | Medium-High |

All code proposals have been validated in dry-run tests and are ready for implementation by the Worker.
