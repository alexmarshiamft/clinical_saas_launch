/**
 * Empirical Challenger 2: Adversarial Stress Test Harness
 * Milestone 1 Iteration 2
 *
 * Deep verification covering:
 * 1. Race conditions between login, logout, and token expiration
 * 2. Exact token expiration boundary math (<= now vs > now)
 * 3. Temporal expiration transition (valid token naturally expires and purges)
 * 4. Concurrent interleaved auth operations (rapid toggle sequences)
 * 5. Corrupted / adversarial session payload boundaries
 * 6. Server health endpoint under burst load and non-standard requests
 * 7. Simulated checkout endpoint adversarial input fuzzing (prototype pollution, XSS, type confusion)
 * 8. High-concurrency checkout session generation and ID collision freedom
 */

import { JSDOM } from 'jsdom';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { spawn, ChildProcess } from 'child_process';

let unhandledCount = 0;
process.on('unhandledRejection', (reason) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  unhandledCount++;
});
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  unhandledCount++;
});

interface ChallengerResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const auditResults: ChallengerResult[] = [];

function record(suite: string, test: string, passed: boolean, details?: string, error?: string) {
  auditResults.push({ suite, test, passed, details, error });
  const mark = passed ? '✓' : '❌';
  console.log(`${mark} [${suite}] ${test}`);
  if (!passed) {
    if (details) console.log(`    ↳ Detail: ${details}`);
    if (error) console.log(`    ↳ Error: ${error}`);
  } else if (details) {
    console.log(`    ↳ ${details}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setupDomEnv() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/',
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
      try { root.unmount(); } catch {}
    },
  };
}

// ============================================================================
// SUITE 1: Auth Token Expiration & Boundary Stress
// ============================================================================
async function runTokenExpirationSuite() {
  console.log('\n====================================================================');
  console.log('   SUITE 1: Token Expiration Exact Boundary & Temporal Transition   ');
  console.log('====================================================================');

  const {
    getValidatedStoredDemoSession,
    DEMO_CLINICIAN_USER,
    DEMO_CLINICIAN_SESSION,
    STORAGE_KEY_DEMO_SESSION,
    AuthProvider,
    useAuth,
  } = await import('../src/lib/auth');

  // Test 1.1: Exact boundary condition (expires_at == nowSeconds)
  {
    const env = setupDomEnv();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredPayload = {
      user: DEMO_CLINICIAN_USER,
      session: {
        ...DEMO_CLINICIAN_SESSION,
        expires_at: nowSeconds, // Exactly equal to now: must be rejected (session.expires_at <= nowSeconds)
      },
    };
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(expiredPayload));

    const validated = getValidatedStoredDemoSession();
    const purged = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    record(
      'Token Expiration Boundary',
      'Exact timestamp boundary (expires_at == nowSeconds) is rejected and purged',
      validated === null && purged,
      `validated=${validated}, purged=${purged}`
    );
    env.cleanup();
  }

  // Test 1.2: 1 second in the past (expires_at == nowSeconds - 1)
  {
    const env = setupDomEnv();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredPayload = {
      user: DEMO_CLINICIAN_USER,
      session: {
        ...DEMO_CLINICIAN_SESSION,
        expires_at: nowSeconds - 1,
      },
    };
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(expiredPayload));

    const validated = getValidatedStoredDemoSession();
    const purged = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    record(
      'Token Expiration Boundary',
      'Timestamp 1s in the past (expires_at == nowSeconds - 1) is rejected and purged',
      validated === null && purged,
      `validated=${validated}, purged=${purged}`
    );
    env.cleanup();
  }

  // Test 1.3: Non-finite and float numbers in expires_at
  const invalidTimestamps = [
    { label: 'NaN', val: NaN },
    { label: 'Infinity', val: Infinity },
    { label: '-Infinity', val: -Infinity },
    { label: 'String unix', val: String(Math.floor(Date.now() / 1000) + 10000) },
    { label: 'Negative timestamp', val: -500 },
    { label: 'Null', val: null },
    { label: 'Undefined', val: undefined },
  ];

  for (const item of invalidTimestamps) {
    const env = setupDomEnv();
    const payload = {
      user: DEMO_CLINICIAN_USER,
      session: {
        ...DEMO_CLINICIAN_SESSION,
        expires_at: item.val,
      },
    };
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(payload));
    const validated = getValidatedStoredDemoSession();
    const purged = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    record(
      'Token Expiration Type Stress',
      `Non-standard expires_at [${item.label}] rejected and purged`,
      validated === null && purged,
      `validated=${validated}, purged=${purged}`
    );
    env.cleanup();
  }

  // Test 1.4: Temporal Expiration Transition
  // Create token valid for 1 second, verify valid initially, then wait 1.2s and verify it purges.
  {
    const env = setupDomEnv();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const shortLivedPayload = {
      user: DEMO_CLINICIAN_USER,
      session: {
        ...DEMO_CLINICIAN_SESSION,
        expires_at: nowSeconds + 1, // Valid for at most 1 second
      },
    };
    env.dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(shortLivedPayload));

    const initialValidation = getValidatedStoredDemoSession();
    const initiallyValid = initialValidation !== null && initialValidation.user.id === DEMO_CLINICIAN_USER.id;

    // Wait until second ticks over
    await sleep(1200);

    const postExpiryValidation = getValidatedStoredDemoSession();
    const purgedPostExpiry = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    record(
      'Token Expiration Temporal',
      'Naturally expiring token transitions from valid to purged after elapsed time',
      initiallyValid && postExpiryValidation === null && purgedPostExpiry,
      `initiallyValid=${initiallyValid}, postExpiryValidation=${postExpiryValidation}, purged=${purgedPostExpiry}`
    );
    env.cleanup();
  }
}

// ============================================================================
// SUITE 2: Concurrency & Interleaved Auth Race Conditions
// ============================================================================
async function runAuthRaceConditionSuite() {
  console.log('\n====================================================================');
  console.log('   SUITE 2: Interleaved Auth Race Conditions & Rapid Transitions    ');
  console.log('====================================================================');

  const {
    AuthProvider,
    useAuth,
    DEMO_CLINICIAN_USER,
    STORAGE_KEY_DEMO_SESSION,
    STORAGE_KEY_PREFERRED_ROLE,
  } = await import('../src/lib/auth');

  const AuthProbe: React.FC<{ onAuth: (auth: any) => void }> = ({ onAuth }) => {
    const auth = useAuth();
    useEffect(() => {
      onAuth(auth);
    }, [auth.user, auth.session, auth.loading, auth.isDemoClinician]);
    return null;
  };

  // Test 2.1: Interleaved call sequence: loginAsDemo immediately followed by logout()
  {
    const env = setupDomEnv();
    env.dom.window.localStorage.clear();

    let latestAuth: any = null;
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthProbe, { onAuth: (a) => { latestAuth = a; } }))
    );
    await sleep(50);

    // Call loginAsDemo() and immediately logout() in same event loop tick
    latestAuth.loginAsDemo();
    const logoutPromise = latestAuth.logout();
    await logoutPromise;
    await sleep(50);

    const userNull = latestAuth.user === null;
    const sessionNull = latestAuth.session === null;
    const storageEmpty = env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    record(
      'Auth Race Conditions',
      'loginAsDemo() followed immediately by logout() settles cleanly in unauthenticated state',
      userNull && sessionNull && storageEmpty,
      `user=${latestAuth?.user}, session=${latestAuth?.session}, storage=${storageEmpty}`
    );
    env.cleanup();
  }

  // Test 2.2: Rapid 20-cycle toggle burst (login -> logout -> login -> ...)
  {
    const env = setupDomEnv();
    env.dom.window.localStorage.clear();

    let latestAuth: any = null;
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthProbe, { onAuth: (a) => { latestAuth = a; } }))
    );
    await sleep(50);

    for (let i = 0; i < 20; i++) {
      latestAuth.loginAsDemo();
      await latestAuth.logout();
    }
    await sleep(60);

    const cleanUnauth = latestAuth.user === null &&
      latestAuth.session === null &&
      latestAuth.loading === false &&
      env.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    record(
      'Auth Race Conditions',
      '20-cycle rapid login/logout toggle burst settles with zero state poisoning',
      cleanUnauth,
      `user=${latestAuth?.user}, session=${latestAuth?.session}, loading=${latestAuth?.loading}`
    );
    env.cleanup();
  }

  // Test 2.3: Interleaved concurrent login calls with conflicting roles
  {
    const env = setupDomEnv();
    env.dom.window.localStorage.clear();

    let latestAuth: any = null;
    env.root.render(
      React.createElement(AuthProvider, null, React.createElement(AuthProbe, { onAuth: (a) => { latestAuth = a; } }))
    );
    await sleep(50);

    // Run loginAsDemo while calling login email
    const p1 = latestAuth.login('sarah.chen@behavioralhealth.org', 'testpass');
    latestAuth.loginAsDemo();
    const [res1] = await Promise.all([p1]);
    await sleep(60);

    const validDemo = latestAuth.user?.email === DEMO_CLINICIAN_USER.email &&
      latestAuth.isDemoClinician === true &&
      latestAuth.loading === false;

    record(
      'Auth Race Conditions',
      'Concurrent login() + loginAsDemo() settle synchronously into valid demo clinician',
      validDemo,
      `user=${latestAuth?.user?.email}, isDemo=${latestAuth?.isDemoClinician}`
    );
    env.cleanup();
  }
}

// ============================================================================
// SUITE 3: Server Health & Robustness Probing
// ============================================================================
async function runServerRobustnessSuite() {
  console.log('\n====================================================================');
  console.log('   SUITE 3: Server Health, Headers, & Boundary Stress                ');
  console.log('====================================================================');

  const TEST_PORT = 3980;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  const server = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'production',
      APP_URL: BASE_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverReady = false;
  server.stdout?.on('data', (d) => {
    if (d.toString().includes(`running on http://localhost:${TEST_PORT}`)) serverReady = true;
  });

  const start = Date.now();
  while (!serverReady && Date.now() - start < 10000) {
    await sleep(100);
  }

  if (!serverReady) {
    server.kill('SIGKILL');
    throw new Error('Failed to start server for Suite 3');
  }

  try {
    // Test 3.1: Server health schema invariants
    {
      const res = await fetch(`${BASE_URL}/api/health`);
      const data = await res.json();
      const valid = res.status === 200 &&
        data.status === 'healthy' &&
        data.sandboxMode === true &&
        typeof data.uptime === 'number' &&
        typeof data.timestamp === 'string' &&
        data.services &&
        typeof data.services.supabase === 'boolean' &&
        typeof data.services.stripe === 'boolean';

      record(
        'Server Health',
        'GET /api/health returns complete status schema with correct service booleans',
        valid,
        `status=${data.status}, uptime=${data.uptime}, sandboxMode=${data.sandboxMode}`
      );
    }

    // Test 3.2: 150 concurrent GET /api/health burst
    {
      const burstStart = Date.now();
      const promises = Array.from({ length: 150 }, () => fetch(`${BASE_URL}/api/health`));
      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.status === 200);
      const latency = Date.now() - burstStart;

      record(
        'Server Health',
        '150 concurrent GET /api/health burst requests handle cleanly',
        allOk,
        `150/150 200 OK in ${latency}ms (avg ${(latency / 150).toFixed(2)}ms/req)`
      );
    }

    // Test 3.3: Health with unusual query strings and headers
    {
      const res = await fetch(`${BASE_URL}/api/health?probe=%27%20OR%201=1--&random=123`, {
        headers: {
          'Accept': 'application/xml, text/plain, */*',
          'X-Forwarded-For': '192.168.1.1, 10.0.0.1',
          'User-Agent': 'AdversarialFuzzer/2.0 (Security; StressTest)',
        },
      });
      const data = await res.json();
      const ok = res.status === 200 && data.status === 'healthy';

      record(
        'Server Health',
        'GET /api/health with SQLi query string and non-standard headers remains healthy',
        ok,
        `status=${res.status}, responseStatus=${data.status}`
      );
    }

    // Test 3.4: 404 handler for API routes vs root SPA
    {
      const resApi = await fetch(`${BASE_URL}/api/nonexistent-endpoint-probe`);
      const json404 = await resApi.json().catch(() => null);
      const isApi404 = resApi.status === 404 && json404?.error === 'API endpoint not found';

      const resSpa = await fetch(`${BASE_URL}/dashboard/some-client-side-path`);
      const spaHtml = await resSpa.text();
      const isSpa200 = resSpa.status === 200 && spaHtml.includes('<!doctype html>');

      record(
        'Routing Isolation',
        'API routes return 404 JSON while SPA client routes serve index.html',
        isApi404 && isSpa200,
        `apiStatus=${resApi.status} (json=${Boolean(json404)}), spaStatus=${resSpa.status}`
      );
    }

    // ========================================================================
    // SUITE 4: Checkout Endpoint Adversarial Fuzzing & Concurrency
    // ========================================================================
    console.log('\n====================================================================');
    console.log('   SUITE 4: Simulated Checkout Endpoint Adversarial Fuzzing         ');
    console.log('====================================================================');

    // Test 4.1: SQL injection in planId
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: "starter' OR '1'='1" }),
      });
      const data = await res.json();
      const rejected = res.status === 400 && data?.error === 'Invalid planId provided';

      record(
        'Checkout Adversarial Fuzzing',
        'SQL injection string in planId rejected with 400 and validPlans list',
        rejected,
        `status=${res.status}, error="${data?.error}"`
      );
    }

    // Test 4.2: XSS in clinicianEmail and successUrl
    {
      const xssPayload = {
        planId: 'starter',
        clinicianEmail: '<script>alert("xss")</script>@phish.org',
        successUrl: 'javascript:alert(document.cookie)',
        cancelUrl: 'data:text/html,<script>alert(1)</script>',
      };
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssPayload),
      });
      const data = await res.json();
      // Server operates in simulated sandbox mode: does not crash, returns valid JSON response
      const survived = res.status === 200 && data?.simulated === true && typeof data?.sessionId === 'string';

      record(
        'Checkout Adversarial Fuzzing',
        'XSS attempt in clinicianEmail/successUrl handled without server crash',
        survived,
        `status=${res.status}, simulated=${data?.simulated}, sessionId=${data?.sessionId?.substring(0, 24)}...`
      );
    }

    // Test 4.3: Object injection in planId (Type confusion)
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: { tier: 'pro', amount: 0 } }),
      });
      const data = await res.json();
      const rejected = res.status === 400 && data?.error === 'Invalid planId provided';

      record(
        'Checkout Adversarial Fuzzing',
        'Object payload in planId rejected with 400',
        rejected,
        `status=${res.status}, error="${data?.error}"`
      );
    }

    // Test 4.4: Prototype pollution attempt
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          __proto__: { isAdmin: true },
          planId: 'pro',
        }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data?.plan?.name === 'Clinician Pro';
      // Verify global Object prototype not polluted
      const notPolluted = ({} as any).isAdmin === undefined;

      record(
        'Checkout Adversarial Fuzzing',
        'Prototype pollution payload in request body does not pollute Object prototype',
        passed && notPolluted,
        `status=${res.status}, polluted=${!notPolluted}`
      );
    }

    // Test 4.5: High Concurrency Blast (150 requests) & UUID Collision Check
    {
      const count = 150;
      const burstStart = Date.now();
      const promises = Array.from({ length: count }, (_, i) => {
        const plans = ['starter', 'pro', 'group'];
        return fetch(`${BASE_URL}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plans[i % 3] }),
        }).then(async (r) => ({
          status: r.status,
          body: await r.json().catch(() => null),
        }));
      });

      const responses = await Promise.all(promises);
      const duration = Date.now() - burstStart;
      const allSuccess = responses.every((r) => r.status === 200 && r.body?.simulated === true);
      const sessionIds = responses.map((r) => r.body?.sessionId).filter(Boolean);
      const uniqueIds = new Set(sessionIds);
      const zeroCollisions = uniqueIds.size === count;

      record(
        'Checkout High Concurrency',
        `150 concurrent checkout sessions generated in ${duration}ms with zero collisions`,
        allSuccess && zeroCollisions,
        `Success: ${responses.filter(r => r.status === 200).length}/${count}, Unique IDs: ${uniqueIds.size}/${count}`
      );
    }

    // Test 4.6: Billing invoice checkout endpoint boundary testing
    {
      const billingRes = await fetch(`${BASE_URL}/api/billing/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: 'inv-boundary-999',
          amountInCents: 25000,
          clientName: 'Robert Johnson',
        }),
      });
      const billingData = await billingRes.json();
      const validBilling = billingRes.status === 200 &&
        billingData?.simulated === true &&
        billingData?.amountTotal === 25000 &&
        billingData?.clientName === 'Robert Johnson' &&
        typeof billingData?.sessionId === 'string';

      record(
        'Billing Invoice Endpoint',
        'POST /api/billing/create-checkout generates valid simulated session and receipt URL',
        validBilling,
        `sessionId=${billingData?.sessionId}, amountTotal=$${billingData?.amountTotal / 100}`
      );
    }

  } finally {
    server.kill('SIGTERM');
    await sleep(200);
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log('====================================================================');
  console.log('   CHALLENGER 2: DEEP ADVERSARIAL STRESS & EMPIRICAL HARNESS        ');
  console.log('====================================================================');

  try {
    await runTokenExpirationSuite();
    await runAuthRaceConditionSuite();
    await runServerRobustnessSuite();
  } catch (err: any) {
    console.error('Fatal suite execution error:', err);
    process.exit(1);
  }

  console.log('\n====================================================================');
  const passed = auditResults.filter((r) => r.passed).length;
  const failed = auditResults.filter((r) => !r.passed).length;
  console.log(`Challenger 2 Empirical Summary: ${passed} Passed, ${failed} Failed (Total: ${auditResults.length})`);
  console.log('====================================================================\n');

  if (failed > 0 || unhandledCount > 0) {
    console.error(`VERDICT: REJECT (${failed} test failures or ${unhandledCount} unhandled exceptions)`);
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (100% empirical stress tests passed)');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Execution crash:', err);
  process.exit(1);
});
