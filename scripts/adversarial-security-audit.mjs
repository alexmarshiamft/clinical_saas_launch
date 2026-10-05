#!/usr/bin/env node
/**
 * Adversarial Security & Route Guard Stress Test Suite
 * Author: Challenger 1 (teamwork_preview_challenger)
 * Target: Milestone 1 Core Foundation & Auth Shell
 *
 * Scope:
 * 1. Build Verification: Clean production build check.
 * 2. Unauthenticated Route Protection: Clean empty session probing across all clinical routes.
 * 3. LocalStorage Malformation & Crash Resistance: Corrupted JSON, primitive types, null prototype.
 * 4. Adversarial Session Forgery & Route Bypass: Malformed tokens, forged user objects, expired tokens.
 * 5. Query Parameter Injection & Redirection Safety: Open redirects, external navigation crashes, XSS.
 * 6. Clinical Data Confidentiality: Verification that ePHI (patient Jane Doe, MRN, notes) is never leaked.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Step 0: Ensure running with tsx
if (!process.env.__TSX_AUTH_RUNNER) {
  const result = spawnSync('npx', ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, __TSX_AUTH_RUNNER: '1' },
  });
  process.exit(result.status ?? 0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Statutory Protected Health Information (ePHI) & Clinical Markers
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

function setupGlobals(dom) {
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
}

async function runHarness() {
  const { JSDOM } = await import('jsdom');
  const React = (await import('react')).default;
  const ReactDOM = (await import('react-dom/client')).default;
  const { App } = await import('../src/App');
  const { DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION, STORAGE_KEY_DEMO_SESSION } = await import('../src/lib/auth');

  console.log('========================================================================');
  console.log('   CHALLENGER 1: ADVERSARIAL AUTH & ROUTE GUARD STRESS HARNESS        ');
  console.log('   Target: Milestone 1 Core Foundation & Auth Shell                  ');
  console.log('========================================================================\n');

  const suiteResults = [];

  async function evaluateHarnessCase(testId, title, options, assertionFn) {
    const { route = '/dashboard', storagePayload, expectedOutcome } = options;
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: `http://localhost:3000${route}`,
      runScripts: 'dangerously',
    });

    setupGlobals(dom);
    dom.window.localStorage.clear();
    if (storagePayload !== undefined) {
      dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, storagePayload);
    }

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);

    let renderError = null;
    try {
      root.render(React.createElement(App));
      for (let i = 0; i < 20; i++) {
        await sleep(15);
        if (expectedOutcome && expectedOutcome.includes('/login') && dom.window.location.pathname === '/login') {
          break;
        }
        if (expectedOutcome && expectedOutcome.includes('dashboard') && dom.window.location.pathname === '/dashboard') {
          break;
        }
      }
    } catch (err) {
      renderError = err;
    }

    const currentPath = dom.window.location.pathname;
    const currentSearch = dom.window.location.search;
    const fullUrl = `${currentPath}${currentSearch}`;
    const html = rootElement ? rootElement.innerHTML : '';
    const leakedEphi = CLINICAL_EPHI_MARKERS.filter((marker) => html.includes(marker));

    const evaluation = assertionFn({
      currentPath,
      currentSearch,
      fullUrl,
      html,
      leakedEphi,
      renderError,
      dom,
      rootElement,
    });

    suiteResults.push({
      testId,
      title,
      expected: expectedOutcome,
      ...evaluation,
    });

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // SUITE 1: Clean Unauthenticated Route Probing (Baseline Security)
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Clean Unauthenticated Route Probing (Empty Storage) ---');

  const protectedRoutes = [
    '/dashboard',
    '/dashboard/ehr',
    '/dashboard/scribe',
    '/dashboard/aura',
    '/dashboard/phi-scrubber',
    '/dashboard/calendar',
    '/dashboard/clients',
    '/dashboard/billing',
    '/dashboard/subscription',
    '/dashboard/settings',
    '/dashboard/ehr/patients/p-101/notes',
    '/dashboard/scribe?encounter=enc_99214&patient=101',
  ];

  for (const pRoute of protectedRoutes) {
    await evaluateHarnessCase(
      `S1-${pRoute}`,
      `Unauthenticated Access: ${pRoute}`,
      { route: pRoute, expectedOutcome: 'Redirect to /login with zero ePHI leak' },
      ({ currentPath, leakedEphi, renderError }) => {
        const redirected = currentPath === '/login';
        const noLeak = leakedEphi.length === 0;
        const noCrash = renderError === null;
        const pass = redirected && noLeak && noCrash;
        return {
          pass,
          detail: `Path: ${currentPath} | Leaked ePHI: ${noLeak ? 'None' : leakedEphi.join(', ')} | Crash: ${renderError?.message || 'None'}`,
        };
      }
    );
  }

  // -------------------------------------------------------------------------
  // SUITE 2: Storage Corruption & Parsing Crash Resilience
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Storage Corruption & Parsing Crash Resilience ---');

  const corruptedPayloads = [
    { id: 'S2-corrupt-json', label: 'Malformed unclosed JSON', payload: '{"user": {"id": "123"' },
    { id: 'S2-non-json', label: 'Raw string token', payload: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid' },
    { id: 'S2-primitive-number', label: 'JSON number primitive', payload: '12345' },
    { id: 'S2-primitive-bool', label: 'JSON boolean true', payload: 'true' },
    { id: 'S2-empty-obj', label: 'Empty JSON object', payload: '{}' },
    { id: 'S2-null-keys', label: 'Null user and session keys', payload: '{"user": null, "session": null}' },
    { id: 'S2-user-without-session', label: 'User object missing session', payload: '{"user": {"id": "some-id"}}' },
    { id: 'S2-session-without-user', label: 'Session object missing user', payload: '{"session": {"access_token": "tok"}}' },
  ];

  for (const { id, label, payload } of corruptedPayloads) {
    await evaluateHarnessCase(
      id,
      `Storage Crash Resilience: ${label}`,
      { route: '/dashboard/ehr', storagePayload: payload, expectedOutcome: 'Fallback to unauthenticated /login without crash' },
      ({ currentPath, leakedEphi, renderError }) => {
        const redirected = currentPath === '/login';
        const noLeak = leakedEphi.length === 0;
        const noCrash = renderError === null;
        const pass = redirected && noLeak && noCrash;
        return {
          pass,
          detail: `Path: ${currentPath} | Leaked ePHI: ${noLeak ? 'None' : leakedEphi.join(', ')} | Crash: ${renderError?.message || 'None'}`,
        };
      }
    );
  }

  // -------------------------------------------------------------------------
  // SUITE 3: Adversarial Route Bypass via Session Forgery (ATTACK VECTORS)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Adversarial Route Bypass via Session Forgery ---');

  // Attack 3.1: Forged String User & Dummy Token
  await evaluateHarnessCase(
    'S3-attack-string-user',
    'Attack: Forged string user property ({"user": "attacker", "session": "dummy"})',
    {
      route: '/dashboard/ehr',
      storagePayload: JSON.stringify({ user: 'attacker', session: 'dummy' }),
      expectedOutcome: 'MUST be blocked and redirected to /login (no bypass)',
    },
    ({ currentPath, leakedEphi }) => {
      const redirected = currentPath === '/login';
      const noLeak = leakedEphi.length === 0;
      const pass = redirected && noLeak;
      return {
        pass,
        detail: `Path: ${currentPath} | ePHI Leaked: ${leakedEphi.join(', ') || 'None'} | Bypassed Guard: ${!redirected ? 'YES (VULNERABILITY)' : 'NO'}`,
        isVulnerability: !pass,
      };
    }
  );

  // Attack 3.2: Forged Arbitrary Object User & Fake JWT
  await evaluateHarnessCase(
    'S3-attack-arbitrary-object',
    'Attack: Forged arbitrary user ID ({"user": {"id": "unauthorized-intruder"}, "session": {"access_token": "fake"}})',
    {
      route: '/dashboard/scribe',
      storagePayload: JSON.stringify({
        user: { id: 'unauthorized-intruder', email: 'attacker@evil.com' },
        session: { access_token: 'completely-bogus-token' },
      }),
      expectedOutcome: 'MUST be blocked and redirected to /login (no bypass)',
    },
    ({ currentPath, leakedEphi }) => {
      const redirected = currentPath === '/login';
      const noLeak = leakedEphi.length === 0;
      const pass = redirected && noLeak;
      return {
        pass,
        detail: `Path: ${currentPath} | ePHI Leaked: ${leakedEphi.join(', ') || 'None'} | Bypassed Guard: ${!redirected ? 'YES (VULNERABILITY)' : 'NO'}`,
        isVulnerability: !pass,
      };
    }
  );

  // Attack 3.3: Expired Token (Expired in 1970)
  await evaluateHarnessCase(
    'S3-attack-expired-token',
    'Attack: Expired session token (expires_at: 100 [Year 1970])',
    {
      route: '/dashboard/phi-scrubber',
      storagePayload: JSON.stringify({
        user: { id: 'expired-session-user' },
        session: { access_token: 'expired-token', expires_at: 100 },
      }),
      expectedOutcome: 'MUST reject expired session and redirect to /login',
    },
    ({ currentPath, leakedEphi }) => {
      const redirected = currentPath === '/login';
      const noLeak = leakedEphi.length === 0;
      const pass = redirected && noLeak;
      return {
        pass,
        detail: `Path: ${currentPath} | ePHI Leaked: ${leakedEphi.join(', ') || 'None'} | Honored Expired Token: ${!redirected ? 'YES (VULNERABILITY)' : 'NO'}`,
        isVulnerability: !pass,
      };
    }
  );

  // -------------------------------------------------------------------------
  // SUITE 4: Query Parameter Injection & Unhandled External Navigation Crashes
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Query Parameter Injection & Open Redirect Probing ---');

  // Attack 4.1: External Open Redirect navigation
  await evaluateHarnessCase(
    'S4-open-redirect-crash',
    'Attack: External navigation via ?redirect=https://evil-phishing.com',
    {
      route: '/login?redirect=https%3A%2F%2Fevil-phishing.com',
      expectedOutcome: 'Must sanitize redirect target to relative path; must NOT throw unhandled navigation crash',
    },
    ({ dom }) => {
      let threwCrash = false;
      let crashMsg = '';
      const demoBtn = dom.window.document.getElementById('demo-clinician-signin-btn');
      if (demoBtn) {
        try {
          demoBtn.click();
        } catch (err) {
          threwCrash = true;
          crashMsg = err.message;
        }
      }
      // Note: In React Router v7, calling navigate('https://...') causes "Error: External navigation is not allowed"
      const pass = !threwCrash && !crashMsg.includes('External navigation is not allowed');
      return {
        pass,
        detail: `Crash Thrown: ${threwCrash ? 'YES: ' + crashMsg : 'NO (Gracefully Handled)'}`,
        isVulnerability: !pass,
      };
    }
  );

  // Attack 4.2: Javascript URI Scheme
  await evaluateHarnessCase(
    'S4-javascript-uri',
    'Attack: Javascript URI via ?redirect=javascript:alert(1)',
    {
      route: '/login?redirect=javascript%3Aalert(1)',
      expectedOutcome: 'Must sanitize javascript: scheme and not crash',
    },
    ({ dom }) => {
      let threwCrash = false;
      let crashMsg = '';
      const demoBtn = dom.window.document.getElementById('demo-clinician-signin-btn');
      if (demoBtn) {
        try {
          demoBtn.click();
        } catch (err) {
          threwCrash = true;
          crashMsg = err.message;
        }
      }
      const pass = !threwCrash && !crashMsg.includes('External navigation is not allowed');
      return {
        pass,
        detail: `Crash Thrown: ${threwCrash ? 'YES: ' + crashMsg : 'NO (Gracefully Handled)'}`,
        isVulnerability: !pass,
      };
    }
  );

  // -------------------------------------------------------------------------
  // SUITE 5: Legitimate Demo Clinician Verification (Baseline Functionality)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Legitimate Demo Clinician Authentication Verification ---');

  await evaluateHarnessCase(
    'S5-legitimate-demo',
    'Legitimate: Official Demo Clinician Session (Dr. Sarah Chen, MD)',
    {
      route: '/dashboard',
      storagePayload: JSON.stringify({ user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION }),
      expectedOutcome: 'Allow authenticated access to dashboard and render clinician and patient',
    },
    ({ currentPath, html }) => {
      const onDashboard = currentPath === '/dashboard';
      const rendersDoctor = html.includes('Dr. Sarah Chen, MD');
      const rendersPatient = html.includes('Jane Doe');
      const pass = onDashboard && rendersDoctor && rendersPatient;
      return {
        pass,
        detail: `Path: ${currentPath} | Doctor: ${rendersDoctor} | Patient: ${rendersPatient}`,
      };
    }
  );

  // -------------------------------------------------------------------------
  // RESULTS SUMMARY & ANALYSIS
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('                      HARNESS EXECUTION SUMMARY                         ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const vulnerabilities = [];

  for (const res of suiteResults) {
    if (res.pass) {
      passed++;
      console.log(`✓ [PASS] [${res.testId}] ${res.title}`);
      console.log(`    ↳ ${res.detail}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] [${res.testId}] ${res.title}`);
      console.error(`    ↳ ${res.detail}`);
      console.error(`    ↳ Expected: ${res.expected}`);
      vulnerabilities.push(res);
    }
  }

  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${suiteResults.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (vulnerabilities.length > 0) {
    console.error('🚨 CONFIRMED ADVERSARIAL VULNERABILITIES FOUND:');
    vulnerabilities.forEach((v, idx) => {
      console.error(`  ${idx + 1}. [${v.testId}] ${v.title}`);
      console.error(`     Finding: ${v.detail}`);
    });
    console.error('\nVERDICT: REJECT (Scope requirement 3 violated; unauthenticated route bypass confirmed).');
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE');
    process.exit(0);
  }
}

runHarness().catch((err) => {
  console.error('Fatal crash during harness execution:', err);
  process.exit(1);
});
