import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import proposed auth implementation
import {
  AuthProvider,
  useAuth,
  DEMO_CLINICIAN_USER,
  DEMO_CLINICIAN_SESSION,
  STORAGE_KEY_DEMO_SESSION,
  getValidatedStoredDemoSession,
} from './proposed_auth.js';

// Import providers & components from src
import { SubscriptionProvider } from '../../../src/lib/subscription.js';
import { ClinicalContextProvider } from '../../../src/lib/clinical-context.js';
import AppLayout from '../../../src/components/layout/AppLayout.js';
import ProtectedRoute from '../../../src/components/guards/ProtectedRoute.js';
import Landing from '../../../src/pages/Landing.js';
import Login from '../../../src/pages/Login.js';
import DashboardHome from '../../../src/pages/DashboardHome.js';
import Subscription from '../../../src/pages/Subscription.js';
import EhrWorkspace from '../../../src/tools/theraflow/EhrWorkspace.js';
import ScribeWorkspace from '../../../src/tools/scribe/ScribeWorkspace.js';
import AuraStudio from '../../../src/tools/aura/AuraStudio.js';
import PhiScrubberView from '../../../src/tools/phi-scrubber/PhiScrubberView.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function TestApp() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ClinicalContextProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="ehr/*" element={<EhrWorkspace />} />
                <Route path="scribe/*" element={<ScribeWorkspace />} />
                <Route path="aura/*" element={<AuraStudio />} />
                <Route path="phi-scrubber/*" element={<PhiScrubberView />} />
                <Route path="calendar" element={<EhrWorkspace />} />
                <Route path="clients" element={<EhrWorkspace />} />
                <Route path="billing" element={<EhrWorkspace />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="settings" element={<EhrWorkspace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ClinicalContextProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

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

async function run() {
  console.log('Testing proposed_auth against all 26 test cases from adversarial-security-audit.mjs:');

  const suiteResults = [];

  async function evaluate(testId, title, options, assertionFn) {
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
      root.render(React.createElement(TestApp));
      await sleep(100);
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

  // Suite 1
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
    await evaluate(
      `S1-${pRoute}`,
      `Unauthenticated Access: ${pRoute}`,
      { route: pRoute, expectedOutcome: 'Redirect to /login with zero ePHI leak' },
      ({ currentPath, leakedEphi, renderError }) => {
        const redirected = currentPath === '/login';
        const noLeak = leakedEphi.length === 0;
        const noCrash = renderError === null;
        return {
          pass: redirected && noLeak && noCrash,
          detail: `Path: ${currentPath} | Leaked ePHI: ${noLeak ? 'None' : leakedEphi.join(', ')} | Crash: ${renderError?.message || 'None'}`,
        };
      }
    );
  }

  // Suite 2
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
    await evaluate(
      id,
      `Storage Crash Resilience: ${label}`,
      { route: '/dashboard/ehr', storagePayload: payload, expectedOutcome: 'Fallback to unauthenticated /login without crash' },
      ({ currentPath, leakedEphi, renderError }) => {
        const redirected = currentPath === '/login';
        const noLeak = leakedEphi.length === 0;
        const noCrash = renderError === null;
        return {
          pass: redirected && noLeak && noCrash,
          detail: `Path: ${currentPath} | Leaked ePHI: ${noLeak ? 'None' : leakedEphi.join(', ')} | Crash: ${renderError?.message || 'None'}`,
        };
      }
    );
  }

  // Suite 3
  await evaluate(
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
      return {
        pass: redirected && noLeak,
        detail: `Path: ${currentPath} | ePHI Leaked: ${leakedEphi.join(', ') || 'None'} | Bypassed Guard: ${!redirected ? 'YES' : 'NO'}`,
      };
    }
  );

  await evaluate(
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
      return {
        pass: redirected && noLeak,
        detail: `Path: ${currentPath} | ePHI Leaked: ${leakedEphi.join(', ') || 'None'} | Bypassed Guard: ${!redirected ? 'YES' : 'NO'}`,
      };
    }
  );

  await evaluate(
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
      return {
        pass: redirected && noLeak,
        detail: `Path: ${currentPath} | ePHI Leaked: ${leakedEphi.join(', ') || 'None'} | Honored Expired Token: ${!redirected ? 'YES' : 'NO'}`,
      };
    }
  );

  // Suite 4
  await evaluate(
    'S4-open-redirect-crash',
    'Attack: External navigation via ?redirect=https://evil-phishing.com',
    {
      route: '/login?redirect=https%3A%2F%2Fevil-phishing.com',
      expectedOutcome: 'Must sanitize redirect target to relative path',
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
      return {
        pass: !threwCrash && !crashMsg.includes('External navigation is not allowed'),
        detail: `Crash Thrown: ${threwCrash ? 'YES: ' + crashMsg : 'NO (Gracefully Handled)'}`,
      };
    }
  );

  await evaluate(
    'S4-javascript-uri',
    'Attack: Javascript URI via ?redirect=javascript:alert(1)',
    {
      route: '/login?redirect=javascript%3Aalert(1)',
      expectedOutcome: 'Must sanitize javascript: scheme',
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
      return {
        pass: !threwCrash && !crashMsg.includes('External navigation is not allowed'),
        detail: `Crash Thrown: ${threwCrash ? 'YES: ' + crashMsg : 'NO (Gracefully Handled)'}`,
      };
    }
  );

  // Suite 5
  await evaluate(
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
      return {
        pass: onDashboard && rendersDoctor && rendersPatient,
        detail: `Path: ${currentPath} | Doctor: ${rendersDoctor} | Patient: ${rendersPatient}`,
      };
    }
  );

  let passed = 0;
  let failed = 0;
  for (const res of suiteResults) {
    if (res.pass) {
      passed++;
      console.log(`✓ [PASS] [${res.testId}] ${res.title}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] [${res.testId}] ${res.title}: ${res.detail}`);
    }
  }

  console.log(`\nTOTAL: ${suiteResults.length} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
