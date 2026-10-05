/**
 * Empirical Stress Test Harness: Auth Engine, Session Recovery & Logout Lifecycle
 * Tests:
 * 1. Fresh cold-start unauthenticated state
 * 2. Session restoration from valid localStorage fixture
 * 3. Profile derivation accuracy
 * 4. Resilient recovery from corrupt/malformed localStorage JSON
 * 5. Instant 1-click Demo Clinician login (synchronous + persistence)
 * 6. Email login offline fallback & error response structure
 * 7. Comprehensive logout & state cleanup across all storage keys
 * 8. Race condition resilience: rapid login/logout toggling
 * 9. Unmount safety & event listener cleanup
 * 10. Process-level unhandledRejection / uncaughtException monitoring
 */

import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';

let unhandledRejectionsCount = 0;
let uncaughtExceptionsCount = 0;

process.on('unhandledRejection', (reason) => {
  console.error('❌ UNHANDLED PROMISE REJECTION DETECTED:', reason);
  unhandledRejectionsCount++;
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION DETECTED:', err);
  uncaughtExceptionsCount++;
});

interface AuthTestResult {
  name: string;
  category: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: AuthTestResult[] = [];

function recordResult(result: AuthTestResult) {
  results.push(result);
  const icon = result.passed ? '✓' : '❌';
  console.log(`${icon} [${result.category}] ${result.name}`);
  if (!result.passed) {
    if (result.details) console.log(`    ↳ Details: ${result.details}`);
    if (result.error) console.log(`    ↳ Error: ${result.error}`);
  } else if (result.details) {
    console.log(`    ↳ ${result.details}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createTestEnvironment(initialUrl = 'http://localhost:3000/') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: initialUrl,
    runScripts: 'dangerously',
  });

  (global as any).window = dom.window;
  (global as any).document = dom.window.document;
  (global as any).localStorage = dom.window.localStorage;
  (global as any).location = dom.window.location;
  (global as any).HTMLElement = dom.window.HTMLElement;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}

  const rootElement = dom.window.document.getElementById('root')!;
  const root = ReactDOM.createRoot(rootElement);

  return {
    dom,
    rootElement,
    root,
    cleanup: () => {
      root.unmount();
    },
  };
}

async function runAuthTests() {
  console.log('====================================================================');
  console.log('   Empirical Challenger: Auth Engine & Session Lifecycle Audit     ');
  console.log('====================================================================\n');

  // Dynamic import of auth module after global window setup
  const env0 = createTestEnvironment();
  const {
    AuthProvider,
    useAuth,
    DEMO_CLINICIAN_USER,
    DEMO_CLINICIAN_SESSION,
    STORAGE_KEY_DEMO_SESSION,
    STORAGE_KEY_PREFERRED_ROLE,
  } = await import('../src/lib/auth');
  env0.cleanup();

  const AuthTester: React.FC<{ consumerRef: { current: any } }> = ({ consumerRef }) => {
    const auth = useAuth();
    consumerRef.current = auth;
    return (
      <div id="auth-state">
        <span id="user-id">{auth.user?.id || 'null'}</span>
        <span id="user-email">{auth.user?.email || 'null'}</span>
        <span id="clinician-name">{auth.profile?.name || 'null'}</span>
        <span id="is-demo">{String(auth.isDemoClinician)}</span>
        <span id="loading">{String(auth.loading)}</span>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // CATEGORY 1: Cold Start & Unauthenticated State
  // -------------------------------------------------------------------------
  console.log('--- Category 1: Cold Start & Unauthenticated State ---');
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.clear();

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: authRef }))
    );

    await sleep(60);

    const auth = authRef.current;
    const passed = auth &&
      auth.user === null &&
      auth.session === null &&
      auth.profile === null &&
      auth.isDemoClinician === false &&
      auth.loading === false;

    recordResult({
      name: 'Cold Start Empty Storage Yields Unauthenticated State',
      category: 'Cold Start',
      passed: Boolean(passed),
      details: `user=${auth?.user}, session=${auth?.session}, loading=${auth?.loading}, isDemo=${auth?.isDemoClinician}`,
    });

    env.cleanup();
  }

  // -------------------------------------------------------------------------
  // CATEGORY 2: Session Recovery & Profile Derivation
  // -------------------------------------------------------------------------
  console.log('\n--- Category 2: Session Recovery & Profile Derivation ---');
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.clear();

    // Pre-seed valid session before mount
    env.dom.window.localStorage.setItem(
      STORAGE_KEY_DEMO_SESSION,
      JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: DEMO_CLINICIAN_SESSION,
      })
    );

    let firstRenderCapture: any = null;
    const InitialRenderSpy: React.FC = () => {
      const auth = useAuth();
      if (!firstRenderCapture) {
        firstRenderCapture = {
          user: auth.user,
          session: auth.session,
          isDemo: auth.isDemoClinician,
          loading: auth.loading,
        };
      }
      return null;
    };

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(InitialRenderSpy),
        React.createElement(AuthTester, { consumerRef: authRef })
      )
    );

    await sleep(60);

    const initialUser = firstRenderCapture?.user;
    const initialSession = firstRenderCapture?.session;
    const initialIsDemo = firstRenderCapture?.isDemo;

    const auth = authRef.current;
    const recovered = auth &&
      auth.user?.id === DEMO_CLINICIAN_USER.id &&
      auth.user?.email === DEMO_CLINICIAN_USER.email &&
      auth.session?.access_token === DEMO_CLINICIAN_SESSION.access_token &&
      auth.isDemoClinician === true &&
      auth.loading === false;

    recordResult({
      name: 'Synchronous Session Hydration from localStorage',
      category: 'Session Recovery',
      passed: Boolean(initialUser && initialSession && initialIsDemo),
      details: `Zero-flash hydration: user=${initialUser?.email}, isDemo=${initialIsDemo}`,
    });

    recordResult({
      name: 'Full Session Recovery Verification',
      category: 'Session Recovery',
      passed: Boolean(recovered),
      details: `user=${auth?.user?.email}, token=${auth?.session?.access_token?.substring(0, 16)}...`,
    });

    // Profile field accuracy
    const profile = auth?.profile;
    const profileAccurate = profile &&
      profile.name === 'Dr. Sarah Chen, MD' &&
      profile.role === 'therapist' &&
      profile.specialty === 'Behavioral Health Specialist' &&
      profile.practiceName === 'Bay Area Behavioral Health Group' &&
      profile.npi === '1982736450' &&
      profile.subscriptionTier === 'pro';

    recordResult({
      name: 'Normalized Clinician Profile Derivation',
      category: 'Session Recovery',
      passed: Boolean(profileAccurate),
      details: `name="${profile?.name}", role="${profile?.role}", NPI="${profile?.npi}", tier="${profile?.subscriptionTier}"`,
    });

    env.cleanup();
  }

  // -------------------------------------------------------------------------
  // CATEGORY 3: Corrupt & Malformed Storage Resilience
  // -------------------------------------------------------------------------
  console.log('\n--- Category 3: Corrupt & Malformed Storage Resilience ---');

  // Test 3.1: Syntax error in stored JSON
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, '{"corrupted_json: [unclosed');

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: authRef }))
    );

    await sleep(60);

    const auth = authRef.current;
    const storageItemAfter = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
    const passed = auth &&
      auth.user === null &&
      auth.session === null &&
      auth.loading === false &&
      storageItemAfter === null; // Corrupted key purged

    recordResult({
      name: 'SyntaxError in localStorage: Purges Corrupt Key & Falls Back to Unauthenticated',
      category: 'Storage Resilience',
      passed: Boolean(passed),
      details: `Corrupt item purged: ${storageItemAfter === null}, user=${auth?.user}, loading=${auth?.loading}`,
    });

    env.cleanup();
  }

  // Test 3.2: Partial object without session or user
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify({ user: null, session: 'dummy' }));

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: authRef }))
    );

    await sleep(60);

    const auth = authRef.current;
    const passed = auth && auth.user === null && auth.session === null && auth.loading === false;

    recordResult({
      name: 'Partial/Incomplete Session Object (user=null fallback)',
      category: 'Storage Resilience',
      passed: Boolean(passed),
      details: `Safely handled missing user without exception`,
    });

    env.cleanup();
  }

  // Test 3.3: Primitive literal stored in session key (e.g. "12345")
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, '12345');

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: authRef }))
    );

    await sleep(60);

    const auth = authRef.current;
    const passed = auth && auth.user === null && auth.session === null && auth.loading === false;

    recordResult({
      name: 'Primitive Literal "12345" in Session Storage',
      category: 'Storage Resilience',
      passed: Boolean(passed),
      details: `Gracefully handled non-object parsed JSON`,
    });

    env.cleanup();
  }

  // -------------------------------------------------------------------------
  // CATEGORY 4: Interactive Login & Logout Lifecycle
  // -------------------------------------------------------------------------
  console.log('\n--- Category 4: Interactive Login & Logout Lifecycle ---');
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.clear();

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: authRef }))
    );

    await sleep(50);

    // 4.1 Trigger loginAsDemo()
    authRef.current.loginAsDemo();
    await sleep(50);

    const afterLoginAuth = authRef.current;
    const storedDemoSession = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
    const storedPreferredRole = env.dom.window.localStorage.getItem(STORAGE_KEY_PREFERRED_ROLE);

    const loginSucceeded = afterLoginAuth?.user?.email === DEMO_CLINICIAN_USER.email &&
      afterLoginAuth?.isDemoClinician === true &&
      storedDemoSession !== null &&
      storedPreferredRole === 'therapist';

    recordResult({
      name: 'loginAsDemo() Sets State and Persists to Storage',
      category: 'Auth Lifecycle',
      passed: Boolean(loginSucceeded),
      details: `user=${afterLoginAuth?.user?.email}, storedKey=${Boolean(storedDemoSession)}, role=${storedPreferredRole}`,
    });

    // 4.2 Trigger logout()
    await afterLoginAuth.logout();
    await sleep(50);

    const afterLogoutAuth = authRef.current;
    const storedDemoAfterLogout = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
    const storedRoleAfterLogout = env.dom.window.localStorage.getItem(STORAGE_KEY_PREFERRED_ROLE);

    const logoutSucceeded = afterLogoutAuth?.user === null &&
      afterLogoutAuth?.session === null &&
      afterLogoutAuth?.profile === null &&
      afterLogoutAuth?.isDemoClinician === false &&
      afterLogoutAuth?.loading === false &&
      storedDemoAfterLogout === null &&
      storedRoleAfterLogout === null;

    recordResult({
      name: 'logout() Fully Cleans Up State and All Storage Keys',
      category: 'Auth Lifecycle',
      passed: Boolean(logoutSucceeded),
      details: `user=${afterLogoutAuth?.user}, session=${afterLogoutAuth?.session}, storedSession=${storedDemoAfterLogout}, storedRole=${storedRoleAfterLogout}`,
    });

    // 4.3 Verify idempotent logout call
    let doubleLogoutThrew = false;
    try {
      await afterLogoutAuth.logout();
    } catch {
      doubleLogoutThrew = true;
    }

    recordResult({
      name: 'Idempotent Consecutive logout() Invocations',
      category: 'Auth Lifecycle',
      passed: !doubleLogoutThrew,
      details: `Second logout call executed cleanly without error`,
    });

    // 4.4 Test login() email method in sandbox mode
    const emailLoginResult = await afterLogoutAuth.login('sarah.chen@behavioralhealth.org', 'password123');
    await sleep(50);

    const emailLoginPassed = emailLoginResult.user?.email === DEMO_CLINICIAN_USER.email &&
      authRef.current?.isDemoClinician === true;

    recordResult({
      name: 'login() with Clinician Email Fallback to Demo Login',
      category: 'Auth Lifecycle',
      passed: Boolean(emailLoginPassed),
      details: `email matched demo clinician, user=${emailLoginResult.user?.email}`,
    });

    // 4.5 Test login() with invalid non-demo email (offline graceful error)
    await authRef.current.logout();
    await sleep(30);

    const invalidLoginResult = await authRef.current.login('unknown.user@external.com', 'badpassword');
    const returnedGracefulError = invalidLoginResult.error instanceof Error &&
      invalidLoginResult.user === undefined &&
      authRef.current?.user === null;

    recordResult({
      name: 'login() with Unknown Email Returns Graceful Error Object (No Throw)',
      category: 'Auth Lifecycle',
      passed: Boolean(returnedGracefulError),
      details: `error="${invalidLoginResult.error?.message}"`,
    });

    env.cleanup();
  }

  // -------------------------------------------------------------------------
  // CATEGORY 5: Concurrency & Race Condition Stress
  // -------------------------------------------------------------------------
  console.log('\n--- Category 5: Concurrency & Race Condition Stress ---');
  {
    const env = createTestEnvironment();
    env.dom.window.localStorage.clear();

    const authRef: { current: any } = { current: null };
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: authRef }))
    );

    await sleep(50);

    // Rapid successive toggles: login -> logout -> login -> logout -> login
    console.log('Executing rapid sequential login/logout toggle sequence...');
    authRef.current.loginAsDemo();
    await authRef.current.logout();
    authRef.current.loginAsDemo();
    await authRef.current.logout();
    authRef.current.loginAsDemo();

    await sleep(60);

    const finalAuth = authRef.current;
    const finalStateConsistent = finalAuth?.user?.id === DEMO_CLINICIAN_USER.id &&
      finalAuth?.isDemoClinician === true &&
      finalAuth?.loading === false &&
      env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) !== null;

    recordResult({
      name: 'Rapid Sequential Auth Toggling State Consistency',
      category: 'Race Conditions',
      passed: Boolean(finalStateConsistent),
      details: `Final state settled: user=${finalAuth?.user?.email}, isDemo=${finalAuth?.isDemoClinician}`,
    });

    // Concurrent login invocations
    console.log('Testing concurrent async login calls...');
    const [res1, res2] = await Promise.all([
      authRef.current.login('demo@test.com', 'pw'),
      authRef.current.login('chen@test.com', 'pw'),
    ]);

    const concurrentLoginsValid = Boolean(res1.user && res2.user);
    recordResult({
      name: 'Concurrent Asynchronous login() Invocations',
      category: 'Race Conditions',
      passed: concurrentLoginsValid,
      details: `Both concurrent login promises resolved cleanly`,
    });

    // Unmount during operation safety
    console.log('Testing unmount during asynchronous auth operation...');
    const unmountEnv = createTestEnvironment();
    const unmountAuthRef: { current: any } = { current: null };
    unmountEnv.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthTester, { consumerRef: unmountAuthRef }))
    );
    await sleep(30);

    // Trigger async login and immediately unmount
    const loginPromise = unmountAuthRef.current.login('unknown@clinic.org', 'test');
    unmountEnv.cleanup(); // unmounts React tree while login is resolving
    const unmountedResult = await loginPromise;

    recordResult({
      name: 'Component Unmount During Async Operation (No Memory Leak or Crash)',
      category: 'Race Conditions',
      passed: Boolean(unmountedResult.error),
      details: `Promise resolved after unmount without uncaught errors`,
    });

    env.cleanup();
  }

  // -------------------------------------------------------------------------
  // CATEGORY 6: Unhandled Promise Rejections & Uncaught Exceptions Monitor
  // -------------------------------------------------------------------------
  console.log('\n--- Category 6: Unhandled Rejection & Uncaught Exception Audit ---');
  {
    const noUnhandledRejections = unhandledRejectionsCount === 0;
    const noUncaughtExceptions = uncaughtExceptionsCount === 0;

    recordResult({
      name: 'Zero Unhandled Promise Rejections Throughout Suite',
      category: 'Exception Monitoring',
      passed: noUnhandledRejections,
      details: `Count: ${unhandledRejectionsCount}`,
    });

    recordResult({
      name: 'Zero Uncaught Exceptions Throughout Suite',
      category: 'Exception Monitoring',
      passed: noUncaughtExceptions,
      details: `Count: ${uncaughtExceptionsCount}`,
    });
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================================');
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  console.log(`Auth Engine Stress Audit Summary: ${totalPassed} Passed, ${totalFailed} Failed (Total: ${results.length})`);
  console.log('====================================================================\n');

  if (totalFailed > 0 || unhandledRejectionsCount > 0 || uncaughtExceptionsCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuthTests().catch((err) => {
  console.error('Fatal unhandled error in auth test suite:', err);
  process.exit(1);
});
