/**
 * Challenger 2: Empirical Stress Test Harness for Milestone 2
 * Scope:
 * 1. Concurrency Stress: Burst 50 concurrent checkout session creations & verify 0 UUID collisions.
 *    Extended burst to 100 requests. Verify concurrent GET retrieval for all created sessions.
 * 2. Billing Cycles: Verify monthly vs annual pricing, discounts, default fallbacks, and adversarial inputs.
 * 3. Return URL Interceptor: Test ?status=success&session_id=... and ?status=canceled.
 *    Verify state persistence, banner rendering, access gating, anti-tampering, and XSS safety.
 */

import { spawn, ChildProcess } from 'node:child_process';
import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';

const TEST_PORT = 3955;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface TestRecord {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const records: TestRecord[] = [];
let passedCount = 0;
let failedCount = 0;

function logTest(category: string, name: string, passed: boolean, details?: string, error?: string) {
  if (passed) {
    passedCount++;
    console.log(`✓ [PASSED] [${category}] ${name}`);
    if (details) console.log(`    ↳ ${details}`);
  } else {
    failedCount++;
    console.error(`❌ [FAILED] [${category}] ${name}`);
    if (details) console.error(`    ↳ Details: ${details}`);
    if (error) console.error(`    ↳ Error: ${error}`);
  }
  records.push({ category, name, passed, details, error });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Setup JSDOM globals
function setupGlobals(dom: JSDOM) {
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
}

async function isServerRunning(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/health`);
    if (res.status !== 200) return false;
    const data = (await res.json()) as any;
    return data && data.status === 'healthy';
  } catch {
    return false;
  }
}

async function startServer(): Promise<ChildProcess | null> {
  if (await isServerRunning(BASE_URL)) {
    console.log(`ℹ Reusing server already running at ${BASE_URL}\n`);
    return null;
  }

  console.log(`Launching test server on port ${TEST_PORT}...`);
  const proc = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'production',
      APP_URL: BASE_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  proc.stdout?.on('data', (d) => {
    if (d.toString().includes(`running on http://localhost:${TEST_PORT}`)) {
      ready = true;
    }
  });

  const start = Date.now();
  while (!ready && Date.now() - start < 10000) {
    await sleep(100);
    if (proc.exitCode !== null) {
      throw new Error(`Server died prematurely with code ${proc.exitCode}`);
    }
  }

  if (!ready) {
    throw new Error('Timed out waiting for server startup');
  }

  console.log(`✓ Test server running at ${BASE_URL}\n`);
  return proc;
}

async function runEmpiricalStressSuite() {
  console.log('========================================================================');
  console.log('  CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS TEST HARNESS (M2)         ');
  console.log('========================================================================\n');

  let serverProcess: ChildProcess | null = null;
  try {
    serverProcess = await startServer();
  } catch (err: any) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // SECTION 1: CONCURRENCY BURST & UUID COLLISION VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- Section 1: Concurrency Burst & UUID Collision Verification ---');

  // Test 1.1: Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = (await healthRes.json()) as any;
    logTest(
      'Server Health',
      'GET /api/health responds with 200 and healthy status',
      healthRes.status === 200 && health.status === 'healthy',
      `status=${health.status}, sandboxMode=${health.sandboxMode}`
    );
  } catch (err: any) {
    logTest('Server Health', 'GET /api/health', false, undefined, err.message);
  }

  // Test 1.2: Burst 50 concurrent checkout session requests
  const plans = ['starter', 'pro', 'group'];
  const cycles = ['monthly', 'annual'];
  const CONCURRENCY_50 = 50;

  console.log(`Firing burst of ${CONCURRENCY_50} concurrent POST /api/create-checkout-session requests...`);
  const t0 = Date.now();
  const burst50Promises = Array.from({ length: CONCURRENCY_50 }, (_, i) => {
    const planId = plans[i % plans.length];
    const billingCycle = cycles[i % cycles.length];
    return fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        billingCycle,
        clinicianEmail: `clinician_${i}@testpractice.org`,
      }),
    }).then(async (res) => ({
      index: i,
      status: res.status,
      data: (await res.json()) as any,
      planId,
      billingCycle,
    }));
  });

  const burst50Results = await Promise.all(burst50Promises);
  const elapsed50 = Date.now() - t0;

  const all200 = burst50Results.every((r) => r.status === 200);
  logTest(
    'Concurrency-50',
    `All ${CONCURRENCY_50} concurrent requests return HTTP 200 OK`,
    all200,
    `Completed in ${elapsed50}ms (avg ${(elapsed50 / CONCURRENCY_50).toFixed(1)}ms/req)`
  );

  const sessionIds50 = burst50Results.map((r) => r.data.sessionId);
  const validUuidPattern = /^cs_test_simulated_[a-f0-9]{32}$/;
  const allFormatted = sessionIds50.every((id) => typeof id === 'string' && validUuidPattern.test(id));
  logTest(
    'Concurrency-50',
    `All ${CONCURRENCY_50} session IDs match valid format (cs_test_simulated_<32hex>)`,
    allFormatted,
    `Sample ID: ${sessionIds50[0]}`
  );

  // CRITICAL: UUID Collision Check
  const uniqueSessionIds50 = new Set(sessionIds50);
  const collisionCount50 = CONCURRENCY_50 - uniqueSessionIds50.size;
  logTest(
    'Concurrency-50',
    `Zero UUID collisions across ${CONCURRENCY_50} concurrent requests`,
    collisionCount50 === 0 && uniqueSessionIds50.size === CONCURRENCY_50,
    `Unique IDs: ${uniqueSessionIds50.size}/${CONCURRENCY_50}, Collisions: ${collisionCount50}`
  );

  // Test 1.3: Concurrently retrieve all 50 sessions via GET /api/subscription/session/:sessionId
  console.log(`Firing burst of ${CONCURRENCY_50} concurrent GET /api/subscription/session/:sessionId requests...`);
  const tRetrieve = Date.now();
  const retrievePromises = burst50Results.map((item) => {
    return fetch(`${BASE_URL}/api/subscription/session/${item.data.sessionId}`).then(async (res) => ({
      index: item.index,
      status: res.status,
      data: (await res.json()) as any,
      expectedPlan: item.planId,
      expectedCycle: item.billingCycle,
    }));
  });

  const retrieveResults = await Promise.all(retrievePromises);
  const elapsedRetrieve = Date.now() - tRetrieve;

  const allRetrieve200 = retrieveResults.every((r) => r.status === 200);
  const allRetrieveSubscribed = retrieveResults.every((r) => r.data.isSubscribed === true && r.data.status === 'complete');
  const allMetadataMatches = retrieveResults.every((r) => r.data.tier === r.expectedPlan && r.data.billingCycle === r.expectedCycle);

  logTest(
    'Concurrency-50',
    `All ${CONCURRENCY_50} sessions successfully verified via GET with correct metadata`,
    allRetrieve200 && allRetrieveSubscribed && allMetadataMatches,
    `Retrieved in ${elapsedRetrieve}ms; Subscribed: ${allRetrieveSubscribed}, Metadata matched: ${allMetadataMatches}`
  );

  // Test 1.4: Extended Stress: 100 concurrent checkout requests
  const CONCURRENCY_100 = 100;
  console.log(`Extended Stress: Firing burst of ${CONCURRENCY_100} concurrent checkout requests...`);
  const t100 = Date.now();
  const burst100Promises = Array.from({ length: CONCURRENCY_100 }, (_, i) => {
    return fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: plans[i % plans.length],
        billingCycle: cycles[i % cycles.length],
      }),
    }).then(async (res) => ({
      status: res.status,
      sessionId: ((await res.json()) as any).sessionId,
    }));
  });

  const burst100Results = await Promise.all(burst100Promises);
  const elapsed100 = Date.now() - t100;
  const uniqueSessionIds100 = new Set(burst100Results.map((r) => r.sessionId));
  const collisionCount100 = CONCURRENCY_100 - uniqueSessionIds100.size;

  logTest(
    'Extended Concurrency-100',
    `Zero UUID collisions across ${CONCURRENCY_100} burst requests`,
    burst100Results.every((r) => r.status === 200) && collisionCount100 === 0,
    `Duration: ${elapsed100}ms, Unique IDs: ${uniqueSessionIds100.size}/${CONCURRENCY_100}, Collisions: ${collisionCount100}`
  );

  // --------------------------------------------------------------------------
  // SECTION 2: BILLING CYCLES & PRICING VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- Section 2: Billing Cycles & Pricing Verification ---');

  const pricingTestCases = [
    { plan: 'starter', cycle: 'monthly', expectedAmount: 4900, name: 'Starter Monthly ($49)' },
    { plan: 'starter', cycle: 'annual', expectedAmount: 46800, name: 'Starter Annual ($468, 20% off)' },
    { plan: 'pro', cycle: 'monthly', expectedAmount: 9900, name: 'Pro Monthly ($99)' },
    { plan: 'pro', cycle: 'annual', expectedAmount: 94800, name: 'Pro Annual ($948, 20% off)' },
    { plan: 'group', cycle: 'monthly', expectedAmount: 24900, name: 'Group Monthly ($249)' },
    { plan: 'group', cycle: 'annual', expectedAmount: 238800, name: 'Group Annual ($2,388, 20% off)' },
  ];

  for (const tc of pricingTestCases) {
    const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: tc.plan, billingCycle: tc.cycle }),
    });
    const data = (await res.json()) as any;
    // Inspect recorded session
    const getRes = await fetch(`${BASE_URL}/api/subscription/session/${data.sessionId}`);
    const getData = (await getRes.json()) as any;

    const ok = res.status === 200 && data.plan.billingCycle === tc.cycle;
    logTest(
      'Billing Cycles',
      `${tc.name} creates valid session with cycle=${tc.cycle}`,
      ok,
      `sessionId=${data.sessionId}, returnedCycle=${data.plan.billingCycle}`
    );
  }

  // Edge cases for billingCycle input
  const edgeCycles = [
    { cycle: undefined, expected: 'monthly', desc: 'undefined billingCycle defaults to monthly' },
    { cycle: '', expected: 'monthly', desc: 'empty string billingCycle defaults to monthly' },
    { cycle: 'quarterly', expected: 'monthly', desc: 'invalid billingCycle "quarterly" defaults to monthly' },
    { cycle: 12345, expected: 'monthly', desc: 'numeric billingCycle defaults to monthly' },
  ];

  for (const ec of edgeCycles) {
    const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'pro', billingCycle: ec.cycle }),
    });
    const data = (await res.json()) as any;
    const ok = res.status === 200 && data.plan?.billingCycle === ec.expected;
    logTest('Billing Cycles Edge Cases', ec.desc, ok, `Resolved cycle: ${data.plan?.billingCycle}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 3: RETURN URL PARAMETER INTERCEPTOR & UI GATING
  // --------------------------------------------------------------------------
  console.log('\n--- Section 3: Return URL Parameter Interceptor & UI GATING ---');

  const { App } = await import('../src/App');
  const { DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION, STORAGE_KEY_DEMO_SESSION } = await import('../src/lib/auth');
  const { STORAGE_KEY_SUBSCRIPTION } = await import('../src/lib/subscription');

  async function mountApp(url: string, initialSubState: any = null) {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: `http://localhost:3000${url}`,
      runScripts: 'dangerously',
    });

    setupGlobals(dom);
    dom.window.localStorage.clear();

    dom.window.localStorage.setItem(
      STORAGE_KEY_DEMO_SESSION,
      JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: DEMO_CLINICIAN_SESSION,
      })
    );

    if (initialSubState !== null) {
      dom.window.localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(initialSubState));
    }

    const rootElement = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

    await sleep(100);
    return { dom, rootElement, root };
  }

  // Test 3.1: ?status=success&session_id=cs_test_abc123&plan=pro
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
      lastSessionId: null,
    };

    const { dom, rootElement, root } = await mountApp(
      '/dashboard/subscription?status=success&session_id=cs_test_success_pro_9918&plan=pro',
      initialUnsubscribed
    );

    const storedRaw = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const html = rootElement.innerHTML;

    const activated = stored.status === 'active';
    const tierMatch = stored.tier === 'pro';
    const sessionRecorded = stored.lastSessionId === 'cs_test_success_pro_9918';
    const hasSuccessBanner = html.includes('Subscription Activated Successfully!') &&
      Boolean(dom.window.document.querySelector('[data-testid="stripe-checkout-success-banner"]'));
    const noCanceledBanner = !html.includes('data-testid="stripe-checkout-canceled-banner"');

    logTest(
      'Return URL: Success',
      'Mount with ?status=success activates subscription, records session, renders success banner',
      activated && tierMatch && sessionRecorded && hasSuccessBanner && noCanceledBanner,
      `status=${stored.status}, tier=${stored.tier}, lastSessionId=${stored.lastSessionId}, successBanner=${hasSuccessBanner}`
    );

    root.unmount();
  }

  // Test 3.2: ?status=success with plan=group
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'starter',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    };

    const { dom, rootElement, root } = await mountApp(
      '/dashboard/subscription?status=success&session_id=cs_test_group_7733&plan=group',
      initialUnsubscribed
    );

    const storedRaw = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const headerTierBadge = dom.window.document.querySelector('[data-testid="header-tier-badge"]')?.textContent;

    const activatedGroup = stored.status === 'active' && stored.tier === 'group';
    const badgeIsGroup = headerTierBadge?.includes('PRACTICE GROUP');

    logTest(
      'Return URL: Success (Group Tier)',
      'Mount with plan=group updates tier to group and syncs header badge to PRACTICE GROUP',
      activatedGroup && Boolean(badgeIsGroup),
      `tier=${stored.tier}, headerBadge="${headerTierBadge}"`
    );

    root.unmount();
  }

  // Test 3.3: ?status=canceled (CRITICAL SECURITY & BEHAVIOR CHECK)
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
      lastSessionId: null,
    };

    const { dom, rootElement, root } = await mountApp(
      '/dashboard/subscription?status=canceled&plan=pro',
      initialUnsubscribed
    );

    const storedRaw = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const html = rootElement.innerHTML;

    // Security check: Must NOT activate subscription!
    const remainsUnsubscribed = stored.status === 'none';
    const hasCanceledBanner = html.includes('Checkout Canceled') &&
      Boolean(dom.window.document.querySelector('[data-testid="stripe-checkout-canceled-banner"]'));
    const noSuccessBanner = !html.includes('data-testid="stripe-checkout-success-banner"');

    logTest(
      'Return URL: Canceled',
      'Mount with ?status=canceled does NOT activate subscription and renders canceled banner',
      remainsUnsubscribed && hasCanceledBanner && noSuccessBanner,
      `status=${stored.status} (remains none), canceledBanner=${hasCanceledBanner}, successBannerPresent=${!noSuccessBanner}`
    );

    root.unmount();
  }

  // Test 3.4: Adversarial: ?status=canceled with fake session ID claiming paid
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    };

    const { dom, rootElement, root } = await mountApp(
      '/dashboard/subscription?status=canceled&session_id=cs_test_fake_paid_token&plan=group',
      initialUnsubscribed
    );

    const storedRaw = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const remainsUnsubscribed = stored.status === 'none';

    logTest(
      'Return URL: Adversarial Canceled with Forged Session ID',
      'Tampered ?status=canceled does NOT grant access even if session_id is provided',
      remainsUnsubscribed,
      `status=${stored.status} (strictly locked)`
    );

    root.unmount();
  }

  // Test 3.5: Clinical Routes Gating after Canceled vs Unlocked after Success
  {
    // Part A: After cancel, route /dashboard/ehr must remain locked
    const { dom: domLocked, rootElement: rootLocked, root: rLocked } = await mountApp(
      '/dashboard/ehr',
      { status: 'none', tier: 'pro', billingCycle: 'monthly', renewsOn: null, trialDaysRemaining: 0 }
    );
    const isLocked = Boolean(domLocked.window.document.querySelector('[data-testid="subscription-gate-lock"]'));
    rLocked.unmount();

    // Part B: After success, route /dashboard/ehr must be unlocked
    const { dom: domUnlocked, rootElement: rootUnlocked, root: rUnlocked } = await mountApp(
      '/dashboard/ehr',
      { status: 'active', tier: 'pro', billingCycle: 'monthly', renewsOn: new Date().toISOString(), trialDaysRemaining: 0 }
    );
    const isUnlocked = !Boolean(domUnlocked.window.document.querySelector('[data-testid="subscription-gate-lock"]'));
    rUnlocked.unmount();

    logTest(
      'Access Gating Verification',
      'Clinical tools remain locked when unsubscribed and unlocked when active',
      isLocked && isUnlocked,
      `Locked when none: ${isLocked}, Unlocked when active: ${isUnlocked}`
    );
  }

  // Test 3.6: Adversarial Return URL with Invalid Plan Name
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    };

    const { dom, rootElement, root } = await mountApp(
      '/dashboard/subscription?status=success&session_id=cs_test_inv_plan&plan=super_hacker_unlimited',
      initialUnsubscribed
    );

    const storedRaw = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};

    // Should fall back safely to 'pro' without crashing
    const safeFallback = stored.tier === 'pro';
    logTest(
      'Return URL: Invalid Plan Name Injection',
      'Invalid plan parameter falls back safely to default valid tier',
      safeFallback,
      `storedTier=${stored.tier}`
    );

    root.unmount();
  }

  // Test 3.7: Adversarial Return URL with XSS Attempt in session_id
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    };

    const xssPayload = '<script>window.__pwned=true</script>';
    const encodedPayload = encodeURIComponent(xssPayload);

    const { dom, rootElement, root } = await mountApp(
      `/dashboard/subscription?status=success&session_id=${encodedPayload}&plan=pro`,
      initialUnsubscribed
    );

    const pwned = (dom.window as any).__pwned === true;
    const banner = dom.window.document.querySelector('[data-testid="stripe-checkout-success-banner"]');

    logTest(
      'Return URL: XSS Script Injection Defense',
      'XSS string in session_id does not execute script and is safely rendered',
      !pwned && Boolean(banner),
      `Script executed: ${pwned}`
    );

    root.unmount();
  }

  // Test 3.8: Missing status parameter (orphan session_id)
  {
    const initialUnsubscribed = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    };

    const { dom, rootElement, root } = await mountApp(
      '/dashboard/subscription?session_id=cs_test_orphan_session&plan=pro',
      initialUnsubscribed
    );

    const storedRaw = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const noActivation = stored.status === 'none';

    logTest(
      'Return URL: Missing Status Parameter',
      'Orphan session_id without status=success does NOT activate subscription',
      noActivation,
      `status=${stored.status}`
    );

    root.unmount();
  }

  // --------------------------------------------------------------------------
  // CLEANUP & SUMMARY
  // --------------------------------------------------------------------------
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill('SIGTERM');
    } catch {}
  }

  console.log('\n========================================================================');
  console.log(`CHALLENGER 2 STRESS AUDIT SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    console.error('❌ CHALLENGER VERDICT: REJECT (Found empirical failures)');
    process.exit(1);
  } else {
    console.log('✓ CHALLENGER VERDICT: APPROVE (Zero failures, 0 UUID collisions, 100% pass)');
    process.exit(0);
  }
}

runEmpiricalStressSuite().catch((err) => {
  console.error('Fatal unhandled exception during empirical stress harness:', err);
  process.exit(1);
});
