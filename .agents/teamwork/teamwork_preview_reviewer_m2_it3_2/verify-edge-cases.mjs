import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../../../src/App.tsx';
import { STORAGE_KEY_DEMO_SESSION, DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION } from '../../../src/lib/auth.tsx';
import { STORAGE_KEY_SUBSCRIPTION } from '../../../src/lib/subscription.tsx';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setupDom(url, { authenticated = true, subscription = null } = {}) {
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

  dom.window.localStorage.clear();

  if (authenticated) {
    dom.window.localStorage.setItem(
      STORAGE_KEY_DEMO_SESSION,
      JSON.stringify({ user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION })
    );
  }

  if (subscription) {
    dom.window.localStorage.setItem(
      STORAGE_KEY_SUBSCRIPTION,
      JSON.stringify(subscription)
    );
  }

  return dom;
}

async function renderRoute(url, options = {}) {
  const dom = setupDom(url, options);
  const rootEl = dom.window.document.getElementById('root');
  const root = ReactDOM.createRoot(rootEl);
  root.render(React.createElement(App));
  await sleep(150);
  return {
    dom,
    html: rootEl.innerHTML,
    getStorage: (key) => dom.window.localStorage.getItem(key),
    unmount: () => {
      try { root.unmount(); } catch {}
    }
  };
}

async function testSuite() {
  console.log('=== Independent Reviewer 2 Verification: Edge Cases & Gating ===');
  let failures = 0;

  // Test 1: /dashboard/subscription?status=success without session_id does NOT activate
  {
    const unsubscribedState = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
      lastSessionId: null
    };
    const res = await renderRoute('http://localhost:3000/dashboard/subscription?status=success', {
      authenticated: true,
      subscription: unsubscribedState
    });

    const storedRaw = res.getStorage(STORAGE_KEY_SUBSCRIPTION);
    const stored = JSON.parse(storedRaw || '{}');
    const activated = stored.status === 'active';

    if (!activated && stored.status === 'none') {
      console.log('✓ [PASS] /dashboard/subscription?status=success WITHOUT session_id does NOT activate (status remains "none")');
    } else {
      console.error('❌ [FAIL] Status was activated without session_id! Stored:', stored);
      failures++;
    }
    res.unmount();
  }

  // Test 1b: /dashboard/subscription?status=success&session_id=cs_valid DOES activate in test harness
  {
    const unsubscribedState = {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
      lastSessionId: null
    };
    const res = await renderRoute('http://localhost:3000/dashboard/subscription?status=success&session_id=cs_valid_123&plan=group', {
      authenticated: true,
      subscription: unsubscribedState
    });

    const storedRaw = res.getStorage(STORAGE_KEY_SUBSCRIPTION);
    const stored = JSON.parse(storedRaw || '{}');
    if (stored.status === 'active' && stored.tier === 'group' && stored.lastSessionId === 'cs_valid_123') {
      console.log('✓ [PASS] /dashboard/subscription?status=success WITH session_id activates correctly to group tier');
    } else {
      console.error('❌ [FAIL] Status was not activated with valid session_id! Stored:', stored);
      failures++;
    }
    res.unmount();
  }

  // Test 2: Practice operations routes remain locked when unsubscribed
  const practiceRoutes = [
    { path: '/dashboard/calendar', name: 'Appointment Calendar' },
    { path: '/dashboard/clients', name: 'Client Roster' },
    { path: '/dashboard/billing', name: 'Billing & Claims' },
    { path: '/dashboard/settings', name: 'Practice Settings' },
  ];

  for (const route of practiceRoutes) {
    const res = await renderRoute(`http://localhost:3000${route.path}`, {
      authenticated: true,
      subscription: { status: 'none', tier: 'pro', billingCycle: 'monthly', renewsOn: null, trialDaysRemaining: 0 }
    });

    const hasLockOverlay = res.html.includes('subscription-gate-lock') || res.html.includes('Subscription Required');
    const hasPricingCTA = res.html.includes('subscribe-now-btn') || res.html.includes('start-free-trial-btn');

    if (hasLockOverlay && hasPricingCTA) {
      console.log(`✓ [PASS] Unsubscribed route locked: ${route.path} (${route.name})`);
    } else {
      console.error(`❌ [FAIL] Route ${route.path} was not properly locked!`);
      failures++;
    }
    res.unmount();
  }

  // Test 3: Active subscriptions render all clinical tools seamlessly
  const clinicalRoutes = [
    { path: '/dashboard/ehr', name: 'TheraFlow EHR', check: 'Clinical EHR' },
    { path: '/dashboard/scribe', name: 'Clinical AI Scribe v2', check: 'Clinical AI Scribe v2' },
    { path: '/dashboard/aura', name: 'Aura Assistant', check: 'Aura Assistant' },
    { path: '/dashboard/phi-scrubber', name: 'HIPAA PHI Scrubber', check: 'HIPAA PHI Scrubber' },
  ];

  for (const route of clinicalRoutes) {
    const res = await renderRoute(`http://localhost:3000${route.path}`, {
      authenticated: true,
      subscription: { status: 'active', tier: 'pro', billingCycle: 'monthly', renewsOn: new Date(Date.now() + 864000000).toISOString(), trialDaysRemaining: 14 }
    });

    const hasLockOverlay = res.html.includes('subscription-gate-lock');
    const hasExpectedContent = res.html.includes(route.check);

    if (!hasLockOverlay && hasExpectedContent) {
      console.log(`✓ [PASS] Active subscription seamlessly renders: ${route.path} (${route.name})`);
    } else {
      console.error(`❌ [FAIL] Route ${route.path} failed seamless rendering! Lock: ${hasLockOverlay}, Content: ${hasExpectedContent}`);
      failures++;
    }
    res.unmount();
  }

  // Test 4: Starter tier access boundary
  {
    // Starter on EHR -> Allowed
    const resEhr = await renderRoute('http://localhost:3000/dashboard/ehr', {
      authenticated: true,
      subscription: { status: 'active', tier: 'starter', billingCycle: 'monthly', renewsOn: new Date(Date.now() + 864000000).toISOString(), trialDaysRemaining: 14 }
    });
    const ehrLocked = resEhr.html.includes('subscription-gate-lock');

    // Starter on Scribe -> Blocked with upgrade required
    const resScribe = await renderRoute('http://localhost:3000/dashboard/scribe', {
      authenticated: true,
      subscription: { status: 'active', tier: 'starter', billingCycle: 'monthly', renewsOn: new Date(Date.now() + 864000000).toISOString(), trialDaysRemaining: 14 }
    });
    const scribeUpgradeRequired = resScribe.html.includes('Tier Upgrade Required') || resScribe.html.includes('Clinician Pro Subscription Required');

    if (!ehrLocked && scribeUpgradeRequired) {
      console.log('✓ [PASS] Starter tier correctly allows EHR and gates Scribe with Tier Upgrade prompt');
    } else {
      console.error(`❌ [FAIL] Starter tier hierarchy failed! EHR locked: ${ehrLocked}, Scribe upgrade required: ${scribeUpgradeRequired}`);
      failures++;
    }
    resEhr.unmount();
    resScribe.unmount();
  }

  console.log(`\n=== Verification Finished. Total Failures: ${failures} ===`);
  if (failures > 0) process.exit(1);
}

testSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
