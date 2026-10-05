/**
 * Independent Forensic Audit Test Suite
 * Executed independently by Forensic Auditor M1
 */
import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

// Project module imports
import { App } from '../../../src/App';
import {
  AuthProvider,
  useAuth,
  DEMO_CLINICIAN_USER,
  DEMO_CLINICIAN_SESSION,
  STORAGE_KEY_DEMO_SESSION,
} from '../../../src/lib/auth';
import { ProtectedRoute } from '../../../src/components/guards/ProtectedRoute';
import { isSupabaseConfigured } from '../../../src/lib/supabase';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setupDom(url = 'http://localhost:3000/') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url,
    runScripts: 'dangerously',
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.location = dom.window.location;
  global.HTMLElement = dom.window.HTMLElement;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}
  return dom;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

async function runForensicAudit() {
  console.log('====================================================================');
  console.log('     FORENSIC INDEPENDENT AUDIT SUITE — MILESTONE 1                ');
  console.log('====================================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: ProtectedRoute Strict DOM Blocking & Redirection
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: ProtectedRoute Strict DOM Blocking & Redirection ---');
  {
    // 1.1 Unauthenticated direct render of ProtectedRoute with sensitive payload
    const dom = setupDom('http://localhost:3000/dashboard/confidential');
    dom.window.localStorage.clear();

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);

    const SECRET_STRING = 'SUPER_SECRET_PATIENT_SSN_999-00-1111';
    const SensitiveComponent = () => React.createElement('div', { id: 'secret-node' }, SECRET_STRING);

    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard/confidential'] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(ProtectedRoute, null, React.createElement(SensitiveComponent))
        )
      )
    );

    await sleep(80);

    const html = rootElement.innerHTML;
    assert(!html.includes(SECRET_STRING), 'Unauthenticated ProtectedRoute blocks sensitive DOM rendering');
    assert(!dom.window.document.getElementById('secret-node'), 'Secret node does not exist in DOM tree');

    root.unmount();
  }

  {
    // 1.2 Full App route traversal with unauthenticated sessions across protected routes
    const testPaths = [
      '/dashboard',
      '/dashboard/ehr',
      '/dashboard/ehr/records',
      '/dashboard/scribe',
      '/dashboard/scribe?encounter=enc_99214&patient=101',
      '/dashboard/aura',
      '/dashboard/phi-scrubber',
      '/dashboard/calendar',
      '/dashboard/clients',
      '/dashboard/billing',
      '/dashboard/subscription',
      '/dashboard/settings',
    ];

    for (const path of testPaths) {
      const dom = setupDom(`http://localhost:3000${path}`);
      dom.window.localStorage.clear();

      const rootElement = dom.window.document.getElementById('root');
      const root = ReactDOM.createRoot(rootElement);
      root.render(React.createElement(App));

      await sleep(70);

      const currentPath = dom.window.location.pathname;
      const currentSearch = dom.window.location.search;
      const html = rootElement.innerHTML;

      assert(currentPath === '/login', `Route ${path} redirects to /login`, `Actual path: ${currentPath}`);
      assert(currentSearch.includes(`redirect=${encodeURIComponent(path)}`), `Route ${path} preserves redirect query`, `Actual search: ${currentSearch}`);
      assert(!html.includes('Clinical Command Center'), `Route ${path} does NOT leak Command Center`);

      root.unmount();
    }
  }

  {
    // 1.3 Catch-all route verification for unknown routes
    const dom = setupDom('http://localhost:3000/some-completely-unknown-page');
    dom.window.localStorage.clear();

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

    await sleep(70);

    const currentPath = dom.window.location.pathname;
    assert(currentPath === '/', 'Unknown route falls back to landing root /');

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Dual-Engine Auth State Resilience & Anti-Tampering
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Dual-Engine Auth State Resilience & Anti-Tampering ---');
  {
    // 2.1 Corrupted JSON in localStorage
    const dom = setupDom('http://localhost:3000/dashboard');
    dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, '{invalid-json-corrupted-data!!!');

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

    await sleep(70);

    const currentPath = dom.window.location.pathname;
    assert(currentPath === '/login', 'Corrupted localStorage safely recovers and redirects to /login', `Path: ${currentPath}`);
    assert(dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null, 'Corrupted session key was cleaned up');

    root.unmount();
  }

  {
    // 2.2 Tampered empty user object in localStorage
    const dom = setupDom('http://localhost:3000/dashboard');
    dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify({ user: null, session: null }));

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

    await sleep(70);

    const currentPath = dom.window.location.pathname;
    assert(currentPath === '/login', 'Null user object in session storage redirects to /login');

    root.unmount();
  }

  {
    // 2.3 Invalid credentials rejection in sandbox mode & dynamic state transition
    const dom = setupDom('http://localhost:3000/login');
    dom.window.localStorage.clear();

    let hookMethods = null;
    const TestConsumer = () => {
      const auth = useAuth();
      hookMethods = auth;
      return React.createElement(
        'div',
        null,
        React.createElement('div', { id: 'user-email' }, auth.user ? auth.user.email : 'EMPTY'),
        React.createElement('div', { id: 'is-demo' }, auth.isDemoClinician ? 'TRUE' : 'FALSE'),
        React.createElement('div', { id: 'clinician-name' }, auth.profile ? auth.profile.name : 'EMPTY')
      );
    };

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(AuthProvider, null, React.createElement(TestConsumer)));

    await sleep(50);

    assert(hookMethods !== null, 'useAuth hook successfully provides context');
    assert(dom.window.document.getElementById('user-email').textContent === 'EMPTY', 'Initial user is empty');
    assert(dom.window.document.getElementById('is-demo').textContent === 'FALSE', 'Initial isDemoClinician is false');

    // Attempt login with invalid credentials
    const loginResult = await hookMethods.login('hacker@evil.com', 'wrongpassword');
    assert(loginResult.error !== undefined, 'Invalid login rejected with error in sandbox mode');
    assert(dom.window.document.getElementById('user-email').textContent === 'EMPTY', 'User remains empty after failed login');

    // Perform valid demo login
    hookMethods.loginAsDemo();
    await sleep(60);

    assert(dom.window.document.getElementById('user-email').textContent === DEMO_CLINICIAN_USER.email, 'User email matches Dr. Sarah Chen, MD');
    assert(dom.window.document.getElementById('is-demo').textContent === 'TRUE', 'isDemoClinician set to TRUE');
    assert(dom.window.document.getElementById('clinician-name').textContent === 'Dr. Sarah Chen, MD', 'Clinician profile name is Dr. Sarah Chen, MD');

    // Verify localStorage was written
    const stored = dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
    assert(stored && stored.includes('Dr. Sarah Chen, MD'), 'Demo session saved to localStorage');

    // Perform logout
    await hookMethods.logout();
    await sleep(60);

    assert(dom.window.document.getElementById('user-email').textContent === 'EMPTY', 'User is EMPTY after logout');
    assert(dom.window.document.getElementById('is-demo').textContent === 'FALSE', 'isDemoClinician is FALSE after logout');
    assert(dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null, 'Session removed from localStorage after logout');

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Server API Endpoints Forensic Verification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Server API Endpoints Forensic Verification ---');

  const { spawn } = await import('node:child_process');
  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3456', NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  // Wait for server to bind port
  await sleep(2500);

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  };

  try {
    // 3.1 Health endpoint check
    const health = await fetchJson('http://localhost:3456/api/health');
    assert(health.status === 200, 'GET /api/health returns 200 OK');
    assert(health.data.status === 'healthy', 'Health status is "healthy"');
    assert(typeof health.data.uptime === 'number', 'Health includes numeric uptime');

    // 3.2 POST /api/create-checkout-session with valid plan
    const checkoutPro = await fetchJson('http://localhost:3456/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'pro', billingCycle: 'monthly' }),
    });
    assert(checkoutPro.status === 200, 'POST /api/create-checkout-session returns 200 for "pro"');
    assert(checkoutPro.data.sessionId && checkoutPro.data.sessionId.startsWith('cs_test_'), 'Returns valid test sessionId');
    assert(checkoutPro.data.url && checkoutPro.data.url.includes('subscription?status=success'), 'Returns subscription success redirect URL');
    assert(checkoutPro.data.plan.amount === 9900, 'Pro plan amount is 9900 cents ($99)');

    // 3.3 POST /api/create-checkout-session with Starter plan
    const checkoutStarter = await fetchJson('http://localhost:3456/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'starter' }),
    });
    assert(checkoutStarter.status === 200, 'POST /api/create-checkout-session returns 200 for "starter"');
    assert(checkoutStarter.data.plan.amount === 4900, 'Starter plan amount is 4900 cents ($49)');

    // 3.4 POST /api/create-checkout-session with invalid plan
    const checkoutInvalid = await fetchJson('http://localhost:3456/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'fake_tier_123' }),
    });
    assert(checkoutInvalid.status === 400, 'POST /api/create-checkout-session returns 400 Bad Request for invalid plan');
    assert(checkoutInvalid.data.error === 'Invalid planId provided', 'Returns descriptive validation error');

    // 3.5 GET /api/subscription/status
    const subStatus = await fetchJson('http://localhost:3456/api/subscription/status');
    assert(subStatus.status === 200, 'GET /api/subscription/status returns 200');
    assert(subStatus.data.status === 'active', 'Subscription status returns active');

    // 3.6 POST /api/billing/create-checkout
    const billingCheckout = await fetchJson('http://localhost:3456/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-101', amountInCents: 15000 }),
    });
    assert(billingCheckout.status === 200, 'POST /api/billing/create-checkout returns 200');
    assert(billingCheckout.data.sessionId.startsWith('cs_simulated_inv_'), 'Returns invoice session ID');

    // 3.7 Unknown API route returns 404 JSON, NOT HTML
    const unknownApi = await fetchJson('http://localhost:3456/api/nonexistent-endpoint');
    assert(unknownApi.status === 404, 'Unknown /api/* route returns 404');
    assert(unknownApi.data && unknownApi.data.error === 'API endpoint not found', 'Unknown /api/* route returns JSON error, not SPA HTML');

    // 3.8 SPA Fallback serves dist/index.html
    const spaHtmlRes = await fetch('http://localhost:3456/dashboard/arbitrary-spa-route');
    const spaHtml = await spaHtmlRes.text();
    assert(spaHtmlRes.status === 200, 'SPA client route returns 200 HTML');
    assert(spaHtml.includes('<div id="root"></div>'), 'SPA HTML contains root div');
    assert(spaHtml.includes('/assets/index-'), 'SPA HTML references compiled Vite bundle');
  } finally {
    serverProcess.kill('SIGTERM');
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`Forensic Independent Audit Summary: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    console.error(`❌ FORENSIC AUDIT FAILED with ${failedTests} integrity violations.`);
    process.exit(1);
  } else {
    console.log('✓ FORENSIC AUDIT COMPLETE: ALL CHECKS CLEAN.');
    process.exit(0);
  }
}

runForensicAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
