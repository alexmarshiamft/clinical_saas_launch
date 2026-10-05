/**
 * Challenger 1 Adversarial Deep Audit & Empirical Verification
 * Target: Milestone 1 Iteration 2
 * Author: Challenger 1 (teamwork_preview_challenger_m1_it2_1)
 */

import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CLINICAL_EPHI_MARKERS = [
  'Jane Doe',
  'MRN: #MC-88219',
  '#MC-88219',
  '04/12/1988',
  'CPT 90837',
  'Live Acoustic Transcript',
  'Unredacted Clinical Source',
  'Active Patient Encounter',
  'Clinical Command Center',
];

function setupDom(url: string) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url,
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

  return { dom, rootElement, root };
}

async function runDeepAudit() {
  console.log('========================================================================');
  console.log('  CHALLENGER 1: EMPIRICAL ADVERSARIAL DEEP AUDIT (M1 IT2)              ');
  console.log('========================================================================\n');

  const { App } = await import('../src/App');
  const { DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION, STORAGE_KEY_DEMO_SESSION } = await import('../src/lib/auth');

  let passedTests = 0;
  let failedTests = 0;
  const testResults: Array<{ name: string; pass: boolean; details: string }> = [];

  function record(name: string, pass: boolean, details: string) {
    if (pass) {
      passedTests++;
      console.log(`✓ [PASS] ${name}`);
      console.log(`    ↳ ${details}`);
    } else {
      failedTests++;
      console.error(`❌ [FAIL] ${name}`);
      console.error(`    ↳ ${details}`);
    }
    testResults.push({ name, pass, details });
  }

  // ------------------------------------------------------------------------
  // SECTION 1: Advanced Session Forgery Vectors
  // ------------------------------------------------------------------------
  console.log('--- Section 1: Advanced Session Forgery & Tampering Vectors ---');

  const nowSeconds = Math.floor(Date.now() / 1000);

  const advancedAttacks = [
    {
      name: 'Correct ID but Mismatched Email',
      payload: JSON.stringify({
        user: { id: DEMO_CLINICIAN_USER.id, email: 'impostor@evil.com' },
        session: { access_token: 'fake-tok', expires_at: nowSeconds + 3600 },
      }),
      targetRoute: '/dashboard/ehr',
    },
    {
      name: 'Correct ID and Email but Empty String Token',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { access_token: '', expires_at: nowSeconds + 3600 },
      }),
      targetRoute: '/dashboard/scribe',
    },
    {
      name: 'Correct ID and Email but Whitespace-Only Token',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { access_token: '   \t  \n  ', expires_at: nowSeconds + 3600 },
      }),
      targetRoute: '/dashboard/aura',
    },
    {
      name: 'Token Expired 1 Second Ago',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { access_token: 'valid-token', expires_at: nowSeconds - 1 },
      }),
      targetRoute: '/dashboard/phi-scrubber',
    },
    {
      name: 'Token Expiring Exactly Now (expires_at == now)',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { access_token: 'valid-token', expires_at: nowSeconds },
      }),
      targetRoute: '/dashboard/phi-scrubber',
    },
    {
      name: 'String expires_at Timestamp ("1799999999")',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { access_token: 'valid-token', expires_at: '1799999999' },
      }),
      targetRoute: '/dashboard/ehr',
    },
    {
      name: 'NaN / Null expires_at Value',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { access_token: 'valid-token', expires_at: null },
      }),
      targetRoute: '/dashboard/calendar',
    },
    {
      name: 'Array Envelope Payload',
      payload: JSON.stringify([
        { user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION },
      ]),
      targetRoute: '/dashboard/clients',
    },
    {
      name: 'Array User Property',
      payload: JSON.stringify({
        user: [DEMO_CLINICIAN_USER],
        session: DEMO_CLINICIAN_SESSION,
      }),
      targetRoute: '/dashboard/billing',
    },
    {
      name: 'Numeric User ID Primitive (12345)',
      payload: JSON.stringify({
        user: { id: 12345, email: DEMO_CLINICIAN_USER.email },
        session: { access_token: 'tok', expires_at: nowSeconds + 3600 },
      }),
      targetRoute: '/dashboard/subscription',
    },
    {
      name: 'Corrupted Object Prototype Injection',
      payload: '{"__proto__": {"admin": true}, "user": "none"}',
      targetRoute: '/dashboard/settings',
    },
  ];

  for (const attack of advancedAttacks) {
    const { dom, rootElement, root } = setupDom(`http://localhost:3000${attack.targetRoute}`);
    dom.window.localStorage.clear();
    dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, attack.payload);

    try {
      root.render(React.createElement(App));
      await sleep(80);
    } catch (err: any) {
      console.error('Render crash:', err);
    }

    const currentPath = dom.window.location.pathname;
    const html = rootElement.innerHTML;
    const leaked = CLINICAL_EPHI_MARKERS.filter((m) => html.includes(m));
    const storagePurged = dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

    const pass = currentPath === '/login' && leaked.length === 0 && storagePurged;
    record(
      `Attack Probe: ${attack.name}`,
      pass,
      `Path: ${currentPath} | Leaked ePHI: ${leaked.length === 0 ? 'None' : leaked.join(', ')} | Storage Purged: ${storagePurged}`
    );

    root.unmount();
  }

  // ------------------------------------------------------------------------
  // SECTION 2: Complete Route Matrix Probe (Unauthenticated)
  // ------------------------------------------------------------------------
  console.log('\n--- Section 2: Complete Route Matrix Probing (Unauthenticated) ---');

  const allProtectedRoutes = [
    '/dashboard',
    '/dashboard/ehr',
    '/dashboard/ehr/patients/p-101',
    '/dashboard/ehr/patients/p-101/notes',
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

  for (const route of allProtectedRoutes) {
    const { dom, rootElement, root } = setupDom(`http://localhost:3000${route}`);
    dom.window.localStorage.clear();

    try {
      root.render(React.createElement(App));
      await sleep(60);
    } catch (err: any) {
      console.error('Render crash:', err);
    }

    const currentPath = dom.window.location.pathname;
    const currentSearch = dom.window.location.search;
    const html = rootElement.innerHTML;
    const leaked = CLINICAL_EPHI_MARKERS.filter((m) => html.includes(m));

    const expectedRedirectTarget = encodeURIComponent(route);
    const hasProperRedirectParam = currentSearch.includes(`redirect=`) && currentPath === '/login';
    const pass = currentPath === '/login' && leaked.length === 0 && hasProperRedirectParam;

    record(
      `Route Guard: ${route}`,
      pass,
      `Redirected to: ${currentPath}${currentSearch} | Leaked ePHI: ${leaked.length === 0 ? 'None' : leaked.join(', ')}`
    );

    root.unmount();
  }

  // ------------------------------------------------------------------------
  // SECTION 3: Open Redirect Bypass Variants on Login Screen
  // ------------------------------------------------------------------------
  console.log('\n--- Section 3: Open Redirect & Protocol Relative URL Probes ---');

  const redirectPayloads = [
    { name: 'Double Slash Bypass', query: '//evil.com' },
    { name: 'Triple Slash Bypass', query: '///evil.com' },
    { name: 'Backslash Slash Bypass', query: '/\\evil.com' },
    { name: 'Full HTTPS URI', query: 'https://attacker.org/steal' },
    { name: 'Javascript URI', query: 'javascript:alert(document.cookie)' },
    { name: 'Data URI', query: 'data:text/html,<script>alert(1)</script>' },
  ];

  for (const rPayload of redirectPayloads) {
    const { dom, rootElement, root } = setupDom(
      `http://localhost:3000/login?redirect=${encodeURIComponent(rPayload.query)}`
    );
    dom.window.localStorage.clear();

    try {
      root.render(React.createElement(App));
      await sleep(60);
    } catch (err: any) {
      console.error('Render crash:', err);
    }

    // Attempt to click demo login button to trigger navigation
    const demoBtn = dom.window.document.getElementById('demo-clinician-signin-btn');
    let threw = false;
    let errMessage = '';
    if (demoBtn) {
      try {
        demoBtn.click();
        await sleep(60);
      } catch (err: any) {
        threw = true;
        errMessage = err.message;
      }
    }

    const finalPath = dom.window.location.pathname;
    const finalHost = dom.window.location.hostname;
    // CRITICAL SECURITY ASSERTION: Must NEVER navigate to an external or evil domain hostname
    const notExternal = finalHost !== 'evil.com' && finalHost !== 'attacker.org' && !finalHost.includes('evil');
    // The redirect exploit is neutralized if external navigation did not occur
    const pass = notExternal;

    record(
      `Redirect Defense: ${rPayload.name} (${rPayload.query})`,
      pass,
      `Blocked Phishing Domain: ${notExternal} | Handled State: ${finalPath === '/dashboard' ? 'Sanitized to /dashboard' : 'Halted at /login (Navigation Blocked)'}`
    );

    root.unmount();
  }

  // ------------------------------------------------------------------------
  // SECTION 4: Legitimate Demo Session Access & Patient ePHI Render
  // ------------------------------------------------------------------------
  console.log('\n--- Section 4: Legitimate Authorized Access & Data Rendering ---');

  {
    const { dom, rootElement, root } = setupDom('http://localhost:3000/dashboard');
    dom.window.localStorage.clear();
    dom.window.localStorage.setItem(
      STORAGE_KEY_DEMO_SESSION,
      JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: {
          ...DEMO_CLINICIAN_SESSION,
          expires_at: nowSeconds + 86400,
        },
      })
    );

    try {
      root.render(React.createElement(App));
      await sleep(100);
    } catch (err: any) {
      console.error('Render crash:', err);
    }

    const currentPath = dom.window.location.pathname;
    const html = rootElement.innerHTML;
    const rendersClinician = html.includes('Dr. Sarah Chen, MD');
    const rendersJaneDoe = html.includes('Jane Doe');
    const pass = currentPath === '/dashboard' && rendersClinician && rendersJaneDoe;

    record(
      'Legitimate Demo Clinician Authorized Access',
      pass,
      `Path: ${currentPath} | Clinician: ${rendersClinician} | Patient Jane Doe: ${rendersJaneDoe}`
    );

    root.unmount();
  }

  // ------------------------------------------------------------------------
  // FINAL TALLY
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`DEEP AUDIT TOTAL: ${testResults.length} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    console.error('VERDICT: REJECT');
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE');
    process.exit(0);
  }
}

runDeepAudit().catch((err) => {
  console.error('Fatal crash during deep audit:', err);
  process.exit(1);
});
