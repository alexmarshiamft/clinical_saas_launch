# Investigation & Remediation Blueprint Report: Auth Security & Navigation Resilience

**Investigator:** Explorer 2 (`teamwork_preview_explorer_m1_it2_2`)  
**Target Files:** `src/lib/auth.tsx` & `src/pages/Login.tsx`  
**Working Directory:** `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_it2_2`  
**Reference Handoff:** Challenger 1 Report (`teamwork_preview_challenger_m1_1/handoff.md`)  
**Date:** 2026-10-05  

---

## 1. Executive Summary

During Milestone 1 gate verification, Challenger 1 issued a **REJECT** verdict based on empirical security failures in the test harness `scripts/adversarial-security-audit.mjs`:
1. **Adversarial Route Bypass via Session Forgery (`S3-attack-string-user`, `S3-attack-arbitrary-object`, `S3-attack-expired-token`):** Malicious payloads in `localStorage.setItem('clinical_saas_session', ...)` allowed unauthenticated visitors to bypass `<ProtectedRoute>` guards and view protected clinical ePHI (patient Jane Doe, MRN #MC-88219, clinical notes, live audio transcripts).
2. **Unhandled React Router Navigation Crash on External Redirects (`src/pages/Login.tsx:30`):** When query parameter `?redirect=https://evil-phishing.com` was supplied, React Router v7 threw `Error: External navigation is not allowed`, crashing the `<Login>` component because `redirectTarget` was unsanitized.

This report delivers the comprehensive root-cause investigation and line-by-line engineering blueprints for resolving both vulnerabilities.

---

## 2. Root Cause Analysis

### 2.1 Issue 1: Permissive Session Hydration & Expired Token Acceptance in `src/lib/auth.tsx`

#### The Vulnerability Mechanism
In `src/lib/auth.tsx` (lines 95–132 and 167–187):
1. **Unvalidated State Hydration:** The initial `useState` initializers for `user`, `session`, and `isDemoClinician` ran synchronously during component instantiation:
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
   If `parsed.user` was a string `"attacker"`, an arbitrary object `{ id: "unauthorized-intruder" }`, or an expired session `{ user: { id: "expired-user" }, session: { expires_at: 100 } }`, `user` was immediately set to that truthy value.
2. **Synchronous Guard Bypass:** `<ProtectedRoute>` evaluates:
   ```tsx
   if (!user) {
     return <Navigate to={`/login?redirect=...`} replace />;
   }
   return children ? <>{children}</> : <Outlet />;
   ```
   Because `user` was non-null, `<ProtectedRoute>` rendered `<AppLayout>` and the protected clinical workspace (`EhrWorkspace`, `ScribeWorkspace`, `PhiScrubberView`) on the very first frame.
3. **No Expiration Check:** Neither the `useState` initializer nor the `restoreSession` in `useEffect` verified `parsed.session.expires_at`. Tokens from year 1970 (`expires_at: 100`) were accepted as valid active sessions.
4. **No Storage Wipe on Tampering:** When malformed or forged objects were encountered, the invalid item remained in `localStorage` unless JSON syntax failed.

#### The Required Fix
1. Centralize demo session retrieval into a single fail-closed helper function `getValidStoredDemoSession()`.
2. Inspect `parsed.session.expires_at`. If `expires_at <= Math.floor(Date.now() / 1000)`, or if `expires_at` is missing, not a number, or NaN, immediately purge `localStorage.removeItem(STORAGE_KEY_DEMO_SESSION)` and return `null`.
3. Verify that `parsed.user` is a structured object matching `user.id === DEMO_CLINICIAN_USER.id`.
4. Verify that `parsed.session` is an object with a non-empty string `access_token`.
5. Call `getValidStoredDemoSession()` synchronously in `useState` and in `restoreSession()`.

---

### 2.2 Issue 2: External Navigation Crash & Open Redirect in `src/pages/Login.tsx`

#### The Vulnerability Mechanism
In `src/pages/Login.tsx` (lines 22–32, 47, 62):
```tsx
const [searchParams] = useSearchParams();
const redirectTarget = searchParams.get('redirect') || '/dashboard';

// Redirect if already authenticated
useEffect(() => {
  if (user) {
    navigate(redirectTarget, { replace: true });
  }
}, [user, navigate, redirectTarget]);
```
1. **React Router v7 External Navigation Restriction:** React Router v7 explicitly prohibits external navigation via `navigate('https://...')`. Calling `navigate()` with an external URL or URI scheme throws:
   ```
   Error: External navigation is not allowed
       at validateNavigationTarget (chunk-OB3PAWPO.mjs:1389:13)
       at src/pages/Login.tsx:30:7
   ```
2. **Missing Boundary & Uncaught Exception:** `<Login>` has no local try/catch in `useEffect` and no error boundary. The error is thrown during effect execution, causing the component to unmount and crash.
3. **Open Redirect Hazard:** In standard web navigation, unvalidated query parameter redirects expose users to phishing landing pages (`/login?redirect=https://evil-phishing.com` or `javascript:...`).

#### The Required Fix
1. Sanitize `redirectTarget` to ensure only safe relative paths are accepted:
   - Must be a non-empty string.
   - Must start with a single `/`.
   - Must NOT start with `//` (protocol-relative URL).
   - Must NOT start with `/\` (Windows backslash separator / open redirect evasion).
   - Fall back safely to `/dashboard` for any invalid, external, or malicious input.
2. Defensively wrap `navigate()` calls in try/catch blocks with fallback to `/dashboard` so unexpected router states cannot crash the application.

---

## 3. Line-by-Line Blueprint: `src/lib/auth.tsx`

### Blueprint Overview
- **Insert Helper:** Introduce `getValidStoredDemoSession()` after `DEMO_CLINICIAN_SESSION` fixture (around line 80).
- **Update Lazy State Initializers:** Refactor `useState` for `user`, `session`, `isDemoClinician`, and `loading` (lines 95–144) to utilize `getValidStoredDemoSession()`.
- **Update Session Restoration:** Refactor `restoreSession` in `useEffect` (lines 170–189) to utilize `getValidStoredDemoSession()`.
- **Add Expired Supabase Session Handling:** In `restoreSession` Supabase branch (lines 198–208), ensure expired Supabase sessions are wiped.
- **Update State Listener:** Refactor `onAuthStateChange` (lines 234–240) to check `getValidStoredDemoSession() !== null`.
- **Update `loginAsDemo`:** Recalculate `freshSession.expires_at = Math.floor(Date.now() / 1000) + (3600 * 24 * 30)` on each invocation.

---

### Block 1: Helper Function Addition (`src/lib/auth.tsx`, Lines 79–80)

#### Before:
```tsx
export const DEMO_CLINICIAN_SESSION: Session = {
  access_token: 'demo-token-sarah-chen-jwt-valid',
  token_type: 'bearer',
  expires_in: 3600 * 24 * 30, // 30-day sandbox token
  expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
  refresh_token: 'demo-refresh-token-valid-permanent',
  user: DEMO_CLINICIAN_USER,
};

const AuthContext = createContext<AuthContextType>({
```

#### After:
```tsx
export const DEMO_CLINICIAN_SESSION: Session = {
  access_token: 'demo-token-sarah-chen-jwt-valid',
  token_type: 'bearer',
  expires_in: 3600 * 24 * 30, // 30-day sandbox token
  expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
  refresh_token: 'demo-refresh-token-valid-permanent',
  user: DEMO_CLINICIAN_USER,
};

/**
 * Safely parses and validates a stored demo session from localStorage.
 * Enforces fail-closed security:
 * 1. Must be valid JSON object with both `user` and `session` objects.
 * 2. User ID must strictly match DEMO_CLINICIAN_USER.id.
 * 3. Session must have non-empty access_token and numeric expires_at strictly in the future.
 * If any check fails or is missing/invalid, immediately removes the key from localStorage and returns null.
 */
export function getValidStoredDemoSession(): { user: User; session: Session } | null {
  if (typeof window === 'undefined') return null;

  const storedDemo = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
  if (!storedDemo) return null;

  try {
    const parsed = JSON.parse(storedDemo);
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
      return null;
    }

    const { user, session } = parsed;

    // Validate user: must be a valid object matching DEMO_CLINICIAN_USER.id
    if (!user || typeof user !== 'object' || user.id !== DEMO_CLINICIAN_USER.id) {
      localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
      return null;
    }

    // Validate session: must be an object with non-empty access_token and unexpired expires_at
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = session?.expires_at;

    if (
      !session ||
      typeof session !== 'object' ||
      typeof session.access_token !== 'string' ||
      !session.access_token.trim() ||
      typeof expiresAt !== 'number' ||
      isNaN(expiresAt) ||
      expiresAt <= nowSeconds
    ) {
      localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
      return null;
    }

    return { user, session };
  } catch {
    localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
    return null;
  }
}

const AuthContext = createContext<AuthContextType>({
```

#### Rationale:
Encapsulates all validation criteria into a single function. If any condition fails (forged user ID, missing/corrupted session, expired `expires_at`, or JSON syntax error), it wipes `localStorage` and fails closed by returning `null`.

---

### Block 2: `AuthProvider` State Initialization (`src/lib/auth.tsx`, Lines 95–144)

#### Before:
```tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window !== 'undefined') {
      const storedDemo = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
      if (storedDemo) {
        try {
          const parsed = JSON.parse(storedDemo);
          if (parsed && parsed.session) return parsed.session;
        } catch {}
      }
    }
    return null;
  });

  const [isDemoClinician, setIsDemoClinician] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedDemo = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
      if (storedDemo) {
        try {
          const parsed = JSON.parse(storedDemo);
          if (parsed && parsed.user) return true;
        } catch {}
      }
    }
    return false;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (isSupabaseConfigured) {
      if (typeof window !== 'undefined') {
        const storedDemo = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
        if (storedDemo) return false;
      }
      return true;
    }
    return false;
  });
```

#### After:
```tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const valid = getValidStoredDemoSession();
    return valid ? valid.user : null;
  });

  const [session, setSession] = useState<Session | null>(() => {
    const valid = getValidStoredDemoSession();
    return valid ? valid.session : null;
  });

  const [isDemoClinician, setIsDemoClinician] = useState<boolean>(() => {
    const valid = getValidStoredDemoSession();
    return valid !== null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (isSupabaseConfigured) {
      const valid = getValidStoredDemoSession();
      if (valid) return false;
      return true;
    }
    return false;
  });
```

#### Rationale:
Ensures synchronous hydration is strictly gated by the validation helper. If an attacker injects `{ user: "attacker" }` or an expired session, `user` is initialized to `null`. `<ProtectedRoute>` intercepts immediately, preventing even a single frame of ePHI disclosure.

---

### Block 3: `restoreSession` in `useEffect` (`src/lib/auth.tsx`, Lines 167–226)

#### Before:
```tsx
    const restoreSession = async () => {
      try {
        // 1. Check for persisted Demo Clinician session
        if (typeof window !== 'undefined') {
          const storedDemo = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
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
        }

        // 2. Check Supabase Auth if configured
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[Auth] Supabase getSession error:', error.message);
          }
          if (isMounted) {
            if (data?.session) {
              setSession(data.session);
              setUser(data.session.user);
              setIsDemoClinician(false);
            } else {
              setSession(null);
              setUser(null);
              setIsDemoClinician(false);
            }
            setLoading(false);
          }
        } else {
          // Neither demo nor live Supabase available; unauthenticated state
          if (isMounted) {
            setUser(null);
            setSession(null);
            setIsDemoClinician(false);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[Auth] Session restoration error:', err);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };
```

#### After:
```tsx
    const restoreSession = async () => {
      try {
        // 1. Check for persisted Demo Clinician session
        const validDemo = getValidStoredDemoSession();
        if (validDemo) {
          if (isMounted) {
            setUser(validDemo.user);
            setSession(validDemo.session);
            setIsDemoClinician(true);
            setLoading(false);
          }
          return;
        }

        // 2. Check Supabase Auth if configured
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[Auth] Supabase getSession error:', error.message);
          }
          if (isMounted) {
            if (data?.session) {
              const nowSeconds = Math.floor(Date.now() / 1000);
              if (data.session.expires_at && data.session.expires_at <= nowSeconds) {
                console.warn('[Auth] Expired Supabase session detected; clearing.');
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setIsDemoClinician(false);
              } else {
                setSession(data.session);
                setUser(data.session.user);
                setIsDemoClinician(false);
              }
            } else {
              setSession(null);
              setUser(null);
              setIsDemoClinician(false);
            }
            setLoading(false);
          }
        } else {
          // Neither demo nor live Supabase available; unauthenticated state
          if (isMounted) {
            setUser(null);
            setSession(null);
            setIsDemoClinician(false);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[Auth] Session restoration error:', err);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setIsDemoClinician(false);
          setLoading(false);
        }
      }
    };
```

#### Rationale:
Removes redundant and flawed parsing logic. Adds Supabase expired session validation (`expires_at <= nowSeconds`), signing out and zeroing user state if an expired token is encountered.

---

### Block 4: `onAuthStateChange` & `loginAsDemo` (`src/lib/auth.tsx`, Lines 231–270)

#### Before:
```tsx
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        const hasDemoStored = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
        if (!hasDemoStored && isMounted) {
          setSession(supabaseSession);
          setUser(supabaseSession?.user ?? null);
          setIsDemoClinician(false);
          setLoading(false);
        }
      });
      subscription = data.subscription;
    }
...
  const loginAsDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_DEMO_SESSION,
        JSON.stringify({ user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION })
      );
      localStorage.setItem(STORAGE_KEY_PREFERRED_ROLE, 'therapist');
    }
    setUser(DEMO_CLINICIAN_USER);
    setSession(DEMO_CLINICIAN_SESSION);
    setIsDemoClinician(true);
    setLoading(false);
  };
```

#### After:
```tsx
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        const hasValidDemoStored = typeof window !== 'undefined' && getValidStoredDemoSession() !== null;
        if (!hasValidDemoStored && isMounted) {
          setSession(supabaseSession);
          setUser(supabaseSession?.user ?? null);
          setIsDemoClinician(false);
          setLoading(false);
        }
      });
      subscription = data.subscription;
    }
...
  const loginAsDemo = () => {
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

#### Rationale:
- In `onAuthStateChange`, checks `hasValidDemoStored` instead of merely checking key existence, so corrupt or deleted demo sessions do not block Supabase auth listener updates.
- In `loginAsDemo`, dynamically calculates `freshSession.expires_at` based on current time to prevent token expiration issues during long running processes.

---

## 4. Line-by-Line Blueprint: `src/pages/Login.tsx`

### Blueprint Overview
- **Import `useMemo`:** Add `useMemo` to React imports (line 1).
- **Sanitize `redirectTarget`:** Replace unvalidated `searchParams.get('redirect') || '/dashboard'` with a sanitized memoized selector (lines 22–30).
- **Add Navigation Crash Protection:** Wrap `navigate()` calls in `useEffect`, `handleAuthSubmit`, and `handleDemoClinicianClick` with try/catch fallback to `/dashboard`.

---

### Block 1: React Import (`src/pages/Login.tsx`, Line 1)

#### Before:
```tsx
import React, { useState, useEffect } from 'react';
```

#### After:
```tsx
import React, { useState, useEffect, useMemo } from 'react';
```

#### Rationale:
Allows memoizing the sanitized redirect target calculation.

---

### Block 2: Redirect Parameter Sanitization & Authenticated Redirection (`src/pages/Login.tsx`, Lines 21–33)

#### Before:
```tsx
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const { user, login, loginAsDemo } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [user, navigate, redirectTarget]);
```

#### After:
```tsx
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect');

  // Sanitize redirect target: enforce safe relative paths starting with single '/'
  // Fall back to /dashboard for external URLs, protocol-relative '//', or malicious URI schemes
  const redirectTarget = useMemo(() => {
    if (!rawRedirect || typeof rawRedirect !== 'string') return '/dashboard';
    const trimmed = rawRedirect.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
      return trimmed;
    }
    return '/dashboard';
  }, [rawRedirect]);

  const { user, login, loginAsDemo } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      try {
        navigate(redirectTarget, { replace: true });
      } catch (err) {
        console.warn('[Login] Navigation failed; falling back to /dashboard:', err);
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, redirectTarget]);
```

#### Rationale:
- Enforces that `redirectTarget` must start with `/` (relative path) and forbids `//` (protocol-relative) and `/\` (backslash escape).
- Defensively guards the `useEffect` call with try/catch to ensure React Router never throws uncaught `External navigation is not allowed` exceptions.

---

### Block 3: Navigation Fallback in Handlers (`src/pages/Login.tsx`, Lines 45–65)

#### Before:
```tsx
      localStorage.setItem('preferredRole', loginRole);
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
...
      loginAsDemo();
      localStorage.setItem('preferredRole', 'therapist');
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
```

#### After:
```tsx
      localStorage.setItem('preferredRole', loginRole);
      try {
        navigate(redirectTarget, { replace: true });
      } catch {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
...
      loginAsDemo();
      localStorage.setItem('preferredRole', 'therapist');
      try {
        navigate(redirectTarget, { replace: true });
      } catch {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
```

#### Rationale:
Guarantees that programmatic navigation after credential or demo login never throws an unhandled exception or traps the clinician on the login screen.

---

## 5. Verification Evidence & Test Results

### 5.1 Verification Test Execution
The test script `blueprint-verifier.mjs` was executed:
```bash
node .agents/teamwork/teamwork_preview_explorer_m1_it2_2/blueprint-verifier.mjs
```

**Verbatim Execution Output:**
```
=== BLUEPRINT VERIFIER: AUTH & REDIRECT SECURITY ===
1. Forged string user rejected: true
2. Forged arbitrary object rejected: true
3. Expired token rejected: true
4. Missing expires_at rejected: true
5. Valid unexpired session accepted: true
6. Open redirect https://evil-phishing.com -> true
7. Protocol-relative //evil.com -> true
8. Javascript URI javascript:alert(1) -> true
9. Backslash bypass /\evil.com -> true
10. Valid relative route /dashboard/scribe?patient=101 -> true
```

### 5.2 Test Vector Coverage Matrix

| Test ID | Input / Scenario | Baseline Behavior | Blueprint Behavior | Result |
|---|---|---|---|---|
| `S3-attack-string-user` | `{"user": "attacker", "session": "dummy"}` | Guard bypassed; Jane Doe leaked | Wiped from storage; redirects to `/login` | **FIXED** |
| `S3-attack-arbitrary-object` | `{"user": {"id": "unauthorized-intruder"}, "session": {"access_token": "fake"}}` | Guard bypassed; Jane Doe leaked | Wiped from storage; redirects to `/login` | **FIXED** |
| `S3-attack-expired-token` | `{"user": {...}, "session": {"expires_at": 100}}` | Guard bypassed; Jane Doe leaked | Wiped from storage; redirects to `/login` | **FIXED** |
| `S4-open-redirect-crash` | `?redirect=https://evil-phishing.com` | React Router crashes (`External navigation not allowed`) | Sanitized to `/dashboard`; no crash | **FIXED** |
| `S4-javascript-uri` | `?redirect=javascript:alert(1)` | Threat of unhandled URI navigation | Sanitized to `/dashboard`; no crash | **FIXED** |
| `S5-legitimate-demo` | Dr. Sarah Chen, MD valid session | Authenticated | Unchanged; fully authenticated | **PRESERVED** |

### 5.3 Build Verification
The application build was verified with zero errors:
```bash
npm run build
```
Exit code: 0 (`tsc --noEmit && vite build` built in 2.23s).

---

## 6. Generated Artifacts Reference

The following ready-to-apply artifacts are saved in the working directory:
1. `proposed_auth.tsx`: Full replacement file for `src/lib/auth.tsx`.
2. `proposed_Login.tsx`: Full replacement file for `src/pages/Login.tsx`.
3. `auth_and_login_fixes.patch`: Machine-applicable unified diff patch for both files.
4. `blueprint-verifier.mjs`: Standalone test suite verifying all 10 edge cases.
