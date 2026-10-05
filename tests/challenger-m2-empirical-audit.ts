/**
 * Challenger Milestone 2 Empirical Stress Test Harness
 * 
 * Verifies:
 * 1. Express API Stripe Checkout endpoints under adversarial fuzzing, planId injection, oversized payloads, and session probing.
 * 2. Subscription access gating, URL query parameter bypass vulnerability, and ePHI leakage under all routes and storage states.
 * 3. Trial activation and cancellation lifecycles, expired trial boundary conditions, and cross-session isolation.
 */

import { spawn, ChildProcess } from 'node:child_process';
import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';

const TEST_PORT = 3988;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface AuditResult {
  category: string;
  name: string;
  passed: boolean;
  severity: 'PASS' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  evidence?: any;
}

const auditResults: AuditResult[] = [];

function recordFinding(result: AuditResult) {
  auditResults.push(result);
  const icon = result.passed ? '✓' : `❌ [${result.severity}]`;
  console.log(`${icon} [${result.category}] ${result.name}`);
  if (result.details) {
    console.log(`    ↳ ${result.details}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Setup globals for JSDOM
function setupDomGlobals(dom: JSDOM) {
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).localStorage = dom.window.localStorage;
  (globalThis as any).location = dom.window.location;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}
}

async function startServer(): Promise<ChildProcess> {
  console.log(`Starting test server on port ${TEST_PORT}...`);
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
      throw new Error(`Server exited with code ${proc.exitCode}`);
    }
  }

  if (!ready) {
    proc.kill('SIGKILL');
    throw new Error('Server failed to start within 10s');
  }

  console.log(`Server online at ${BASE_URL}\n`);
  return proc;
}

async function runEmpiricalAudit() {
  console.log('====================================================================');
  console.log('   EMPIRICAL CHALLENGER: Milestone 2 Adversarial Stress Suite      ');
  console.log('====================================================================\n');

  let server: ChildProcess;
  try {
    server = await startServer();
  } catch (err: any) {
    console.error('Fatal failure launching test server:', err.message);
    process.exit(1);
  }

  try {
    // =========================================================================
    // PART 1: Express Server API Stress & Fuzzing
    // =========================================================================
    console.log('--- PART 1: POST /api/create-checkout-session Fuzzing & Boundaries ---');

    // 1.1 Fuzzing planId inputs
    const planFuzzCases = [
      { label: 'null planId', body: { planId: null }, expectedStatus: 400 },
      { label: 'undefined planId (defaults to pro)', body: {}, expectedStatus: 200, expectPlan: 'Clinician Pro' },
      { label: 'empty string planId (defaults to pro)', body: { planId: '' }, expectedStatus: 200, expectPlan: 'Clinician Pro' },
      { label: 'whitespace only ("   ")', body: { planId: '   ' }, expectedStatus: 400 },
      { label: 'padded planId ("  starter  ")', body: { planId: '  starter  ' }, expectedStatus: 200, expectPlan: 'Starter Tier' },
      { label: 'uppercase planId ("PRO")', body: { planId: 'PRO' }, expectedStatus: 400 },
      { label: 'array of strings (["pro"])', body: { planId: ['pro'] }, expectedStatus: 400 },
      { label: 'array of objects', body: { planId: [{ tier: 'pro' }] }, expectedStatus: 400 },
      { label: 'object { id: "pro" }', body: { planId: { id: 'pro' } }, expectedStatus: 400 },
      { label: 'boolean true', body: { planId: true }, expectedStatus: 400 },
      { label: 'boolean false', body: { planId: false }, expectedStatus: 400 },
      { label: 'number 0', body: { planId: 0 }, expectedStatus: 400 },
      { label: 'number 99', body: { planId: 99 }, expectedStatus: 400 },
      { label: 'SQL injection "starter\' OR 1=1--"', body: { planId: "starter' OR 1=1--" }, expectedStatus: 400 },
      { label: 'XSS payload "<script>alert(1)</script>"', body: { planId: "<script>alert(1)</script>" }, expectedStatus: 400 },
      { label: 'Path traversal "../../../../etc/passwd"', body: { planId: "../../../../etc/passwd" }, expectedStatus: 400 },
      { label: 'Null byte injection "starter\\0"', body: { planId: "starter\0" }, expectedStatus: 400 },
      { label: 'Unicode emoji "🏥"', body: { planId: "🏥" }, expectedStatus: 400 },
      { label: 'Prototype property "toString"', body: { planId: "toString" }, expectedStatus: 400 },
      { label: 'Prototype property "valueOf"', body: { planId: "valueOf" }, expectedStatus: 400 },
      { label: 'Prototype property "constructor"', body: { planId: "constructor" }, expectedStatus: 400 },
      { label: 'Prototype property "__proto__"', body: { planId: "__proto__" }, expectedStatus: 400 },
      { label: 'Massive string (10,000 chars)', body: { planId: 'a'.repeat(10000) }, expectedStatus: 400 },
    ];

    for (const tc of planFuzzCases) {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tc.body),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === tc.expectedStatus && (!tc.expectPlan || data?.plan?.name === tc.expectPlan);
      recordFinding({
        category: 'API Fuzzing (planId)',
        name: tc.label,
        passed,
        severity: passed ? 'PASS' : 'HIGH',
        details: `HTTP ${res.status} (Expected ${tc.expectedStatus}). Body: ${JSON.stringify(data)?.substring(0, 70)}`,
      });
    }

    // 1.2 Fuzzing billingCycle
    console.log('\n--- PART 1.2: billingCycle Fuzzing ---');
    const cycleCases = [
      { label: 'valid "monthly"', cycle: 'monthly', expectedAmount: 9900 },
      { label: 'valid "annual" (20% discount applied: $948/yr)', cycle: 'annual', expectedAmount: 94800 },
      { label: 'invalid "weekly" (should fallback to monthly)', cycle: 'weekly', expectedAmount: 9900 },
      { label: 'invalid "lifetime" (should fallback to monthly)', cycle: 'lifetime', expectedAmount: 9900 },
      { label: 'numeric cycle (12)', cycle: 12, expectedAmount: 9900 },
      { label: 'boolean cycle (true)', cycle: true, expectedAmount: 9900 },
      { label: 'null cycle', cycle: null, expectedAmount: 9900 },
    ];

    for (const tc of cycleCases) {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro', billingCycle: tc.cycle }),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 && data?.plan?.amount === tc.expectedAmount;
      recordFinding({
        category: 'API Fuzzing (billingCycle)',
        name: tc.label,
        passed,
        severity: passed ? 'PASS' : 'MEDIUM',
        details: `Amount: $${(data?.plan?.amount || 0) / 100} (Expected $${tc.expectedAmount / 100})`,
      });
    }

    // 1.3 Oversized Payloads & Body Parser Stress
    console.log('\n--- PART 1.3: Oversized Payloads & Body Parser Stress ---');
    {
      // 50KB payload (under 100KB limit -> 200)
      const res50k = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro', pad: 'x'.repeat(50 * 1024) }),
      });
      recordFinding({
        category: 'Payload Size Stress',
        name: '50KB Payload (under default limit)',
        passed: res50k.status === 200,
        severity: res50k.status === 200 ? 'PASS' : 'MEDIUM',
        details: `HTTP ${res50k.status}`,
      });

      // 500KB payload (exceeds default 100KB limit -> 413 Payload Too Large)
      const res500k = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro', pad: 'x'.repeat(500 * 1024) }),
      });
      recordFinding({
        category: 'Payload Size Stress',
        name: '500KB Payload (exceeds default limit, returns 413)',
        passed: res500k.status === 413,
        severity: res500k.status === 413 ? 'PASS' : 'MEDIUM',
        details: `HTTP ${res500k.status} (Expected 413)`,
      });

      // 5MB payload
      try {
        const res5M = await fetch(`${BASE_URL}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'pro', pad: 'x'.repeat(5 * 1024 * 1024) }),
        });
        recordFinding({
          category: 'Payload Size Stress',
          name: '5MB Payload Boundary Rejection',
          passed: res5M.status === 413,
          severity: res5M.status === 413 ? 'PASS' : 'MEDIUM',
          details: `HTTP ${res5M.status}`,
        });
      } catch (err: any) {
        recordFinding({
          category: 'Payload Size Stress',
          name: '5MB Payload Boundary Rejection',
          passed: true,
          severity: 'PASS',
          details: `Connection terminated/rejected cleanly: ${err.message}`,
        });
      }
    }

    // 1.4 Probing GET /api/subscription/session/:sessionId Vulnerabilities
    console.log('\n--- PART 1.4: Probing Session Verification Endpoint ---');
    {
      // Create a valid session first
      const createRes = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'starter', billingCycle: 'monthly' }),
      });
      const createData = await createRes.json();
      const validSessionId = createData.sessionId;

      // Check legitimate session retrieval
      const getValid = await fetch(`${BASE_URL}/api/subscription/session/${validSessionId}`);
      const validData = await getValid.json();
      const validOk = getValid.status === 200 && validData.tier === 'starter' && validData.isSubscribed === true;
      recordFinding({
        category: 'Session Verification',
        name: 'Valid Session Retrieval from Registry',
        passed: validOk,
        severity: validOk ? 'PASS' : 'CRITICAL',
        details: `status=${getValid.status}, tier=${validData?.tier}, isSubscribed=${validData?.isSubscribed}`,
      });

      // ADVERSARIAL PROBE: Arbitrary uncreated session starting with 'cs_test_'
      // Investigating whether server falsely affirms non-existent sessions as active/paid
      const fakeSessionId = 'cs_test_attacker_completely_fabricated_never_paid_session';
      const getFake = await fetch(`${BASE_URL}/api/subscription/session/${fakeSessionId}`);
      const fakeData = await getFake.json();

      // If fake session returns isSubscribed === true, this is a security flaw in simulated fallback logic
      const isFalselyAffirmed = getFake.status === 200 && fakeData.isSubscribed === true;
      recordFinding({
        category: 'Session Verification',
        name: 'Uncreated Session with "cs_test_" Prefix Probing',
        passed: !isFalselyAffirmed, // Fails if server claims a fake session is active
        severity: isFalselyAffirmed ? 'HIGH' : 'PASS',
        details: isFalselyAffirmed
          ? `SECURITY FINDING: Server blindly affirms arbitrary fake session '${fakeSessionId}' as status: complete, isSubscribed: true!`
          : `Server safely rejected uncreated session with status ${getFake.status}`,
        evidence: fakeData,
      });

      // Non-existent session WITHOUT 'cs_test_' prefix must return 404
      const getNonexistent = await fetch(`${BASE_URL}/api/subscription/session/sub_fake_live_session_12345`);
      recordFinding({
        category: 'Session Verification',
        name: 'Nonexistent Session (without test prefix) returns 404',
        passed: getNonexistent.status === 404,
        severity: getNonexistent.status === 404 ? 'PASS' : 'HIGH',
        details: `HTTP ${getNonexistent.status} (Expected 404)`,
      });

      // Path traversal probe in sessionId
      const getTraversal = await fetch(`${BASE_URL}/api/subscription/session/..%2F..%2Fetc%2Fpasswd`);
      recordFinding({
        category: 'Session Verification',
        name: 'Path Traversal Probe in sessionId',
        passed: getTraversal.status === 404 || getTraversal.status === 400,
        severity: 'PASS',
        details: `HTTP ${getTraversal.status}`,
      });
    }

    // 1.5 SessionStore Eviction & Map Bounds Stress
    console.log('\n--- PART 1.5: SessionStore LRU Eviction & Bound Stress ---');
    {
      console.log('Flooding 1,100 sessions to test 1,000 capacity eviction...');
      const sessionIds: string[] = [];
      for (let i = 0; i < 1100; i++) {
        const r = await fetch(`${BASE_URL}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'starter' }),
        });
        const d = await r.json();
        sessionIds.push(d.sessionId);
      }

      // Check oldest session (index 0) — should have been evicted from the 1000-cap Map
      const oldestId = sessionIds[0];
      const getOldest = await fetch(`${BASE_URL}/api/subscription/session/${oldestId}`);
      const oldestData = await getOldest.json();

      // Check newest session (index 1099) — must still be in cache with original tier 'starter'
      const newestId = sessionIds[1099];
      const getNewest = await fetch(`${BASE_URL}/api/subscription/session/${newestId}`);
      const newestData = await getNewest.json();

      recordFinding({
        category: 'Session Registry Capacity',
        name: 'Recent Session Retention After 1,100 Insertions',
        passed: getNewest.status === 200 && newestData.tier === 'starter',
        severity: 'PASS',
        details: `Newest session retained with tier='starter'`,
      });

      // What happened to the oldest session?
      // Since it starts with 'cs_test_', in server.ts step 3, it hits the fallback which returns tier='pro'!
      // The original tier was 'starter', but fallback returns 'pro'.
      const degradedToPro = getOldest.status === 200 && oldestData.tier === 'pro';
      recordFinding({
        category: 'Session Registry Capacity',
        name: 'Evicted Session Fallback Behavior',
        passed: !degradedToPro, // Warn if evicted starter session morphs into pro
        severity: degradedToPro ? 'MEDIUM' : 'PASS',
        details: degradedToPro
          ? `NOTE: Evicted session '${oldestId}' fell through to generic cs_test fallback and morphed from starter -> pro.`
          : `Oldest session state preserved or handled gracefully.`,
      });
    }

    // =========================================================================
    // PART 2: Client Access Gating & ePHI Leakage Empirical Tests
    // =========================================================================
    console.log('\n====================================================================');
    console.log('--- PART 2: Client Subscription Gate, URL Bypass & ePHI Leakage ---');
    console.log('====================================================================\n');

    const { App } = await import('../src/App');
    const { DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION, STORAGE_KEY_DEMO_SESSION } = await import('../src/lib/auth');
    const { STORAGE_KEY_SUBSCRIPTION, getStoredSubscription } = await import('../src/lib/subscription');

    // Helper to render App at a given path and initial state
    async function renderAppInstance(route: string, subState: any = null) {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
        url: `http://localhost:3000${route}`,
        runScripts: 'dangerously',
      });

      setupDomGlobals(dom);
      dom.window.localStorage.clear();

      // Login as demo clinician
      dom.window.localStorage.setItem(
        STORAGE_KEY_DEMO_SESSION,
        JSON.stringify({ user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION })
      );

      if (subState !== null) {
        dom.window.localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(subState));
      }

      const rootEl = dom.window.document.getElementById('root')!;
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
      await sleep(100);

      return { dom, rootEl, root };
    }

    // 2.1 ePHI Exposure on /dashboard (DashboardHome) for Unsubscribed User
    console.log('--- PART 2.1: ePHI Leakage on /dashboard for Unsubscribed Users ---');
    {
      const { dom, rootEl, root } = await renderAppInstance('/dashboard', {
        status: 'none',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      });

      const html = rootEl.innerHTML;
      const leaks = [
        { label: 'Patient Name "Jane Doe"', found: html.includes('Jane Doe') },
        { label: 'Patient MRN "#MC-88219"', found: html.includes('#MC-88219') },
        { label: 'Patient DOB "04/12/1988"', found: html.includes('04/12/1988') },
        { label: 'Diagnosis "F41.1 Generalized Anxiety"', found: html.includes('F41.1') },
        { label: 'Schedule Patient "Marcus Vance"', found: html.includes('Marcus Vance') },
        { label: 'Schedule Patient "Elena Rostova"', found: html.includes('Elena Rostova') },
      ];

      const leakedItems = leaks.filter((l) => l.found).map((l) => l.label);
      const hasLeak = leakedItems.length > 0;

      recordFinding({
        category: 'ePHI Protection',
        name: 'Unsubscribed Clinician on /dashboard (DashboardHome)',
        passed: !hasLeak,
        severity: hasLeak ? 'CRITICAL' : 'PASS',
        details: hasLeak
          ? `VULNERABILITY: /dashboard is UNGATED and renders full ePHI to unsubscribed users: ${leakedItems.join(', ')}`
          : 'Zero ePHI exposed on /dashboard for unsubscribed users.',
      });

      root.unmount();
    }

    // 2.2 Practice Operations Routes Bypass Audit (/dashboard/clients, /dashboard/calendar, etc.)
    console.log('\n--- PART 2.2: Practice Operations Routes Gating & ePHI Leakage ---');
    const practiceRoutes = [
      { path: '/dashboard/clients', name: 'Client Roster (/dashboard/clients)' },
      { path: '/dashboard/calendar', name: 'Appointment Calendar (/dashboard/calendar)' },
      { path: '/dashboard/billing', name: 'Billing & Invoicing (/dashboard/billing)' },
      { path: '/dashboard/settings', name: 'Practice Settings (/dashboard/settings)' },
    ];

    for (const pr of practiceRoutes) {
      const { dom, rootEl, root } = await renderAppInstance(pr.path, {
        status: 'none',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      });

      const html = rootEl.innerHTML;
      const hasLockOverlay = html.includes('data-testid="subscription-gate-lock"') ||
        Boolean(dom.window.document.querySelector('[data-testid="subscription-gate-lock"]'));
      const containsPatientName = html.includes('Jane Doe');
      const containsMRN = html.includes('#MC-88219');

      const isVulnerable = !hasLockOverlay && (containsPatientName || containsMRN);

      recordFinding({
        category: 'Access Gating & ePHI',
        name: pr.name,
        passed: hasLockOverlay && !containsPatientName,
        severity: isVulnerable ? 'CRITICAL' : 'PASS',
        details: isVulnerable
          ? `VULNERABILITY: Route '${pr.path}' lacks <SubscriptionGate>! An unsubscribed clinician can view EhrWorkspace and ePHI ('Jane Doe', '#MC-88219') without a subscription.`
          : hasLockOverlay
          ? 'Properly locked behind SubscriptionGate'
          : 'Ungated but no immediate patient markers found',
      });

      root.unmount();
    }

    // 2.3 URL Query Parameter Gate Bypass Probe (?status=success&session_id=fake)
    console.log('\n--- PART 2.3: URL Query Parameter Lock Screen Bypass Probing ---');
    const bypassRoutes = [
      {
        path: '/dashboard/scribe?status=success&session_id=cs_fake_bypass_session_9999',
        target: 'Clinical AI Scribe v2',
        gatedTier: 'pro',
      },
      {
        path: '/dashboard/aura?status=success&plan=pro',
        target: 'Aura Assistant Copilot',
        gatedTier: 'pro',
      },
      {
        path: '/dashboard/ehr?status=success&session_id=cs_unverified_mock_123&plan=starter',
        target: 'Clinical EHR & Telehealth',
        gatedTier: 'starter',
      },
    ];

    for (const br of bypassRoutes) {
      // User starts unsubscribed, visits the gated route with spoofed success query parameters
      const { dom, rootEl, root } = await renderAppInstance(br.path, {
        status: 'none',
        tier: 'starter',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      });

      const html = rootEl.innerHTML;
      const hasLockOverlay = html.includes('subscription-gate-lock');
      const stored = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
      const parsedStored = stored ? JSON.parse(stored) : null;
      const activatedInStorage = parsedStored?.status === 'active';

      // If lock overlay is absent AND storage is now 'active', the gate was bypassed via URL tampering!
      const bypassed = !hasLockOverlay && activatedInStorage;

      recordFinding({
        category: 'URL Parameter Tampering',
        name: `Bypass on ${br.target} via URL Params (${br.path.split('?')[1]})`,
        passed: !bypassed,
        severity: bypassed ? 'CRITICAL' : 'PASS',
        details: bypassed
          ? `VULNERABILITY: An unsubscribed user successfully dismantled <SubscriptionGate> and gained access to ${br.target} by appending query parameters! LocalStorage status mutated to 'active'. No server session verification occurred.`
          : 'Gate resisted query parameter tampering.',
        evidence: { storedStatus: parsedStored?.status, lockPresent: hasLockOverlay },
      });

      root.unmount();
    }

    // 2.4 Storage Boundary Conditions & Default Status Evaluation
    console.log('\n--- PART 2.4: Storage Corruption & Default Status Boundaries ---');
    {
      // Test unhandled status 'expired' in localStorage
      const { dom: d1 } = await renderAppInstance('/dashboard/scribe', {
        status: 'expired',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: '2025-01-01T00:00:00Z',
        trialDaysRemaining: 0,
      });
      const parsed1 = JSON.parse(d1.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION) || '{}');
      // In subscription.tsx line 150:
      // status: validStatuses.includes(parsed.status) ? parsed.status : 'active'
      // If status is 'expired', does getStoredSubscription default it to 'active'?
      const defaultedToActive = parsed1.status === 'active';
      recordFinding({
        category: 'Storage Parsing Logic',
        name: 'Unhandled status ("expired") defaults to "active" in getStoredSubscription',
        passed: !defaultedToActive,
        severity: defaultedToActive ? 'HIGH' : 'PASS',
        details: defaultedToActive
          ? `VULNERABILITY: An expired subscription (status: "expired") was parsed and defaulted to 'active' due to fallback logic in getStoredSubscription(), granting full access!`
          : `Expired status parsed safely.`,
      });

      // Test unhandled status 'unpaid' in localStorage
      const { dom: d2 } = await renderAppInstance('/dashboard/scribe', {
        status: 'unpaid',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      });
      const parsed2 = JSON.parse(d2.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION) || '{}');
      const unpaidToActive = parsed2.status === 'active';
      recordFinding({
        category: 'Storage Parsing Logic',
        name: 'Unhandled status ("unpaid") defaults to "active" in getStoredSubscription',
        passed: !unpaidToActive,
        severity: unpaidToActive ? 'HIGH' : 'PASS',
        details: unpaidToActive
          ? `VULNERABILITY: An unpaid subscription (status: "unpaid") was parsed and defaulted to 'active', granting full access!`
          : `Unpaid status parsed safely.`,
      });

      // Test trial expiration boundary: status='trialing' but renewsOn is in the PAST and trialDaysRemaining=0
      const { dom: d3, rootEl: r3El, root: r3 } = await renderAppInstance('/dashboard/scribe', {
        status: 'trialing',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: '2024-01-01T00:00:00.000Z', // 2+ years ago
        trialDaysRemaining: 0,
      });
      const html3 = r3El.innerHTML;
      const trialGatePresent = html3.includes('subscription-gate-lock');
      // If status === 'trialing', SubscriptionGate evaluates:
      // hasAccess = isSubscribed && (status === 'trialing' || ...)
      // It never checks renewsOn expiration!
      const expiredTrialHasAccess = !trialGatePresent;
      recordFinding({
        category: 'Trial Expiration Gating',
        name: 'Expired Free Trial Gating (trialDaysRemaining: 0, past renewal date)',
        passed: !expiredTrialHasAccess,
        severity: expiredTrialHasAccess ? 'HIGH' : 'PASS',
        details: expiredTrialHasAccess
          ? `VULNERABILITY: SubscriptionGate grants permanent access to users with status: 'trialing' even when renewsOn date has passed and trialDaysRemaining is 0! No expiration check is evaluated.`
          : 'Expired trial was locked appropriately.',
      });
      r3.unmount();
    }

    // 2.5 Trial Activation & Cancellation Lifecycle
    console.log('\n--- PART 2.5: Trial Activation & Cancellation Lifecycles ---');
    {
      // 1. Initial unsubscribed state
      const { dom, rootEl, root } = await renderAppInstance('/dashboard/scribe', {
        status: 'none',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      });

      // Gate should be present initially
      const gateInitiallyPresent = rootEl.innerHTML.includes('subscription-gate-lock');

      // Click #activate-trial-btn
      const activateBtn = dom.window.document.getElementById('activate-trial-btn');
      if (activateBtn) {
        activateBtn.click();
        await sleep(80);

        const storedAfterTrial = JSON.parse(dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION) || '{}');
        const trialActive = storedAfterTrial.status === 'trialing';
        const gateGone = !rootEl.innerHTML.includes('subscription-gate-lock');

        recordFinding({
          category: 'Trial Lifecycle',
          name: '1-Click Trial Activation Flow',
          passed: gateInitiallyPresent && trialActive && gateGone,
          severity: 'PASS',
          details: `Gate locked initially: ${gateInitiallyPresent}, status mutated to 'trialing', gate dismantled: ${gateGone}`,
        });
      }

      root.unmount();

      // 2. Cancellation verification
      const { dom: dCancel, rootEl: cancelEl, root: rCancel } = await renderAppInstance('/dashboard/subscription', {
        status: 'active',
        tier: 'pro',
        billingCycle: 'monthly',
        renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
        trialDaysRemaining: 14,
      });

      // Is there a user-facing cancellation CTA in Subscription.tsx?
      const htmlSub = cancelEl.innerHTML;
      const hasCancelBtn = htmlSub.toLowerCase().includes('cancel subscription');

      recordFinding({
        category: 'Cancellation Lifecycle',
        name: 'User-Facing Subscription Cancellation CTA in Pricing/Subscription UI',
        passed: hasCancelBtn,
        severity: hasCancelBtn ? 'PASS' : 'MEDIUM',
        details: hasCancelBtn
          ? 'Found user-facing cancellation button in Subscription page.'
          : 'Subscription.tsx provides "Simulate Unsubscribed" sandbox button, but lacks a standard production "Cancel Subscription" user action.',
      });

      rCancel.unmount();
    }

    // 2.6 Cross-Session Subscription Isolation on Sign Out
    console.log('\n--- PART 2.6: Sign-Out Isolation & Session Clearing ---');
    {
      const { dom, root } = await renderAppInstance('/dashboard', {
        status: 'active',
        tier: 'group',
        billingCycle: 'annual',
        renewsOn: new Date(Date.now() + 365 * 86400000).toISOString(),
        trialDaysRemaining: 14,
      });

      const { logout } = await import('../src/lib/auth');
      // Simulate logout action
      const rawSubBefore = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
      if (typeof logout === 'function') {
        await logout();
      } else {
        dom.window.localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
        dom.window.localStorage.removeItem('preferredRole');
        dom.window.localStorage.removeItem(STORAGE_KEY_SUBSCRIPTION);
      }

      const subRemainsAfterLogout = Boolean(dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION));

      recordFinding({
        category: 'Session Isolation',
        name: 'Subscription State Clearing on Clinician Logout',
        passed: !subRemainsAfterLogout,
        severity: subRemainsAfterLogout ? 'MEDIUM' : 'PASS',
        details: subRemainsAfterLogout
          ? `NOTE: 'clinical_saas_subscription' persists across logout in localStorage. If a new clinician logs in on the same browser, they inherit the prior user's subscription tier (${JSON.parse(rawSubBefore || '{}').tier}).`
          : 'Subscription state cleared cleanly on logout.',
      });

      root.unmount();
    }

  } finally {
    console.log('\nTerminating test server...');
    server.kill('SIGTERM');
    await sleep(200);
  }

  // =========================================================================
  // PART 3: Summary & Empirical Verdict
  // =========================================================================
  console.log('\n====================================================================');
  console.log('   EMPIRICAL CHALLENGER AUDIT SUMMARY                             ');
  console.log('====================================================================\n');

  const criticals = auditResults.filter((r) => !r.passed && r.severity === 'CRITICAL');
  const highs = auditResults.filter((r) => !r.passed && r.severity === 'HIGH');
  const mediums = auditResults.filter((r) => !r.passed && r.severity === 'MEDIUM');
  const passed = auditResults.filter((r) => r.passed);

  console.log(`Total Checks Run: ${auditResults.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Critical Vulnerabilities: ${criticals.length}`);
  console.log(`High Vulnerabilities: ${highs.length}`);
  console.log(`Medium Warnings: ${mediums.length}`);
  console.log('--------------------------------------------------------------------');

  if (criticals.length > 0) {
    console.log('VERDICT: REJECT (Critical Security / ePHI / Access Gating Violations)');
    for (const c of criticals) {
      console.log(`  ❌ [CRITICAL] ${c.name}: ${c.details}`);
    }
    process.exit(2);
  } else if (highs.length > 0) {
    console.log('VERDICT: REJECT (High Severity Gating Flaws)');
    for (const h of highs) {
      console.log(`  ❌ [HIGH] ${h.name}: ${h.details}`);
    }
    process.exit(2);
  } else {
    console.log('VERDICT: APPROVE');
    process.exit(0);
  }
}

runEmpiricalAudit().catch((err) => {
  console.error('Fatal unhandled error during empirical audit:', err);
  process.exit(1);
});
