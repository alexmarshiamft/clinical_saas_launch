#!/usr/bin/env node
/**
 * Verification Script: Subscription Access Gating & Tier Privileges Audit
 * Milestone 2 Acceptance Criteria §R2, §AC3 & Features 6, 7
 *
 * Verifies:
 * 1. Unsubscribed clinicians (status: 'none') are strictly locked out of clinical tools
 *    (/dashboard/ehr, /dashboard/scribe, /dashboard/aura, /dashboard/phi-scrubber).
 * 2. Subscription lock overlay renders with "Clinician Pro Subscription Required",
 *    direct "Subscribe Now", and "Activate Free Trial" action buttons. Zero ePHI leak.
 * 3. /dashboard/subscription is UNGATED and accessible to unsubscribed clinicians.
 * 4. 1-click Free Trial activation instantly unlocks the clinical suite and updates tier badge to TRIAL.
 * 5. Tier hierarchy gating: Starter accounts can access EHR & PHI Scrubber, but are
 *    blocked from Aura and full Scribe with Upgrade prompts and badges.
 * 6. Header & Sidebar tier badge display across all statuses (UNSUBSCRIBED, TRIAL, STARTER, PRO CLINICIAN, PRACTICE GROUP).
 * 7. Commercial pricing table renders all 3 tiers with annual billing cycle 20% discount.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Step 0: Ensure running with tsx
if (!process.env.__TSX_SUBSCRIPTION_RUNNER) {
  const result = spawnSync('npx', ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, __TSX_SUBSCRIPTION_RUNNER: '1' },
  });
  process.exit(result.status ?? 0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runSubscriptionGateAudit() {
  const { JSDOM } = await import('jsdom');
  const React = (await import('react')).default;
  const ReactDOM = (await import('react-dom/client')).default;
  const { App } = await import('../src/App');
  const { DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION, STORAGE_KEY_DEMO_SESSION } = await import('../src/lib/auth');
  const { STORAGE_KEY_SUBSCRIPTION } = await import('../src/lib/subscription');

  console.log('====================================================================');
  console.log('   Clinical Telehealth & AI Scribe SaaS — Subscription Gate Audit  ');
  console.log('   Milestone 2 Acceptance Criteria §R2 & §AC3 Verification         ');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function logTest(name, ok, details) {
    if (ok) {
      passed++;
      console.log(`✓ [PASSED] ${name}`);
      if (details) console.log(`    ↳ ${details}`);
    } else {
      failed++;
      console.error(`❌ [FAILED] ${name}`);
      if (details) console.error(`    ↳ ${details}`);
    }
  }

  // Helper to mount App in a fresh JSDOM instance with given session & subscription
  async function renderAppAtRoute(route, subState = null) {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: `http://localhost:3000${route}`,
      runScripts: 'dangerously',
    });

    setupGlobals(dom);
    dom.window.localStorage.clear();

    // Authenticate as Demo Clinician
    dom.window.localStorage.setItem(
      STORAGE_KEY_DEMO_SESSION,
      JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: DEMO_CLINICIAN_SESSION,
      })
    );

    // Set subscription state if provided
    if (subState !== null) {
      dom.window.localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(subState));
    }

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

    await sleep(90);

    return { dom, rootElement, root };
  }

  // -------------------------------------------------------------------------
  // Suite 1: Unsubscribed Clinician Access Blocking (Zero ePHI Leak)
  // -------------------------------------------------------------------------
  console.log('--- Phase 1: Probing Clinical Routes for Unsubscribed Clinicians ---');
  const clinicalRoutes = [
    { path: '/dashboard/ehr', name: 'Clinical EHR & Telehealth' },
    { path: '/dashboard/scribe', name: 'Clinical AI Scribe v2' },
    { path: '/dashboard/aura', name: 'Aura Assistant Copilot' },
    { path: '/dashboard/phi-scrubber', name: 'HIPAA PHI Scrubber' },
  ];

  for (const { path: routePath, name } of clinicalRoutes) {
    const { dom, rootElement, root } = await renderAppAtRoute(routePath, {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    });

    const html = rootElement.innerHTML;
    const hasLockOverlay =
      html.includes('data-testid="subscription-gate-lock"') ||
      Boolean(dom.window.document.querySelector('[data-testid="subscription-gate-lock"]'));
    const hasSubscribeBtn =
      Boolean(dom.window.document.getElementById('subscribe-now-btn')) ||
      html.includes('Subscribe Now');
    const hasActivateTrialBtn =
      Boolean(dom.window.document.getElementById('activate-trial-btn')) ||
      html.includes('Activate Free Trial');

    // Confidential statutory ePHI markers that MUST NOT be exposed
    const leakedMarkers = [
      'Jane Doe',
      '#MC-88219',
      '04/12/1988',
      'Live Acoustic Transcript',
      'Unredacted Clinical Source',
    ].filter((m) => html.includes(m));

    const ok = hasLockOverlay && hasSubscribeBtn && hasActivateTrialBtn && leakedMarkers.length === 0;

    logTest(
      `Gate Lock on ${routePath} (${name})`,
      ok,
      `LockOverlay: ${hasLockOverlay ? 'YES' : 'NO'}, SubscribeBtn: ${hasSubscribeBtn ? 'YES' : 'NO'}, TrialBtn: ${hasActivateTrialBtn ? 'YES' : 'NO'}, Leaked ePHI: ${leakedMarkers.length === 0 ? 'NONE' : leakedMarkers.join(', ')}`
    );

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Suite 2: /dashboard/subscription is UNGATED
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 2: Verifying Commercial Pricing Page is Ungated ---');
  {
    const { dom, rootElement, root } = await renderAppAtRoute('/dashboard/subscription', {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    });

    const html = rootElement.innerHTML;
    const hasStarterCard = html.includes('Starter Tier') && html.includes('$49');
    const hasProCard = html.includes('Clinician Pro') && html.includes('$99');
    const hasGroupCard = html.includes('Practice Group') && html.includes('$249');
    const hasCycleToggle = html.includes('Monthly Billing') && html.includes('Annual Billing');
    const hasSandboxTools = html.includes('Developer &amp; Auditor Sandbox Mode') || html.includes('Developer & Auditor Sandbox Mode');

    const ok = hasStarterCard && hasProCard && hasGroupCard && hasCycleToggle && hasSandboxTools;
    logTest(
      'Ungated Pricing Table Access (/dashboard/subscription)',
      ok,
      `3 Tiers ($49, $99, $249): ${hasStarterCard && hasProCard && hasGroupCard ? 'YES' : 'NO'}, Billing Cycle Toggle: ${hasCycleToggle ? 'YES' : 'NO'}, Sandbox: ${hasSandboxTools ? 'YES' : 'NO'}`
    );

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Suite 3: 1-Click Free Trial Activation via SubscriptionGate
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 3: Instant Free Trial Activation via Gate Bypass ---');
  {
    const { dom, rootElement, root } = await renderAppAtRoute('/dashboard/scribe', {
      status: 'none',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: null,
      trialDaysRemaining: 0,
    });

    const trialBtn = dom.window.document.getElementById('activate-trial-btn');
    if (trialBtn) {
      trialBtn.click();
      await sleep(80);

      const stored = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
      const parsed = stored ? JSON.parse(stored) : null;
      const isTrialing = parsed?.status === 'trialing';

      const updatedHtml = rootElement.innerHTML;
      const gateGone = !updatedHtml.includes('subscription-gate-lock');
      const scribeUnlocked = updatedHtml.includes('Clinical AI Scribe v2');
      const hasTrialBadge = updatedHtml.includes('TRIAL');

      const ok = isTrialing && gateGone && scribeUnlocked && hasTrialBadge;
      logTest(
        '1-Click Free Trial Activation Unlocks Workspace',
        ok,
        `status in localStorage="${parsed?.status}", Gate Dismantled=${gateGone}, Scribe Mounted=${scribeUnlocked}, Badge=TRIAL`
      );
    } else {
      logTest('1-Click Free Trial Activation', false, 'Could not locate #activate-trial-btn');
    }

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Suite 4: Starter Tier Gating vs Pro Clinical Gating
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 4: Starter Tier Gating vs Pro Gating Verification ---');
  {
    // Starter tier clinician accessing EHR (Starter tier should have access)
    const { rootElement: ehrRoot, root: r1 } = await renderAppAtRoute('/dashboard/ehr', {
      status: 'active',
      tier: 'starter',
      billingCycle: 'monthly',
      renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialDaysRemaining: 14,
    });
    const ehrAllowed = !ehrRoot.innerHTML.includes('subscription-gate-lock');
    logTest('Starter Tier: Permitted Access to Clinical EHR (/dashboard/ehr)', ehrAllowed, `Gate locked: ${!ehrAllowed}`);
    r1.unmount();

    // Starter tier clinician accessing PHI Scrubber (Starter tier should have access)
    const { rootElement: phiRoot, root: r2 } = await renderAppAtRoute('/dashboard/phi-scrubber', {
      status: 'active',
      tier: 'starter',
      billingCycle: 'monthly',
      renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialDaysRemaining: 14,
    });
    const phiAllowed = !phiRoot.innerHTML.includes('subscription-gate-lock');
    logTest('Starter Tier: Permitted Access to PHI Scrubber (/dashboard/phi-scrubber)', phiAllowed, `Gate locked: ${!phiAllowed}`);
    r2.unmount();

    // Starter tier clinician accessing Aura Assistant (Pro tier required -> must be gated)
    const { dom: auraDom, rootElement: auraRoot, root: r3 } = await renderAppAtRoute('/dashboard/aura', {
      status: 'active',
      tier: 'starter',
      billingCycle: 'monthly',
      renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialDaysRemaining: 14,
    });
    const auraLocked = auraRoot.innerHTML.includes('subscription-gate-lock');
    const auraBadgeUpgrade = Boolean(auraDom.window.document.querySelector('[data-testid="tool-upgrade-badge-aura"]'));
    logTest(
      'Starter Tier: Strictly Gated from Aura Assistant (Requires Pro Upgrade)',
      auraLocked && auraBadgeUpgrade,
      `Lock Overlay Present: ${auraLocked}, Sidebar Upgrade Badge: ${auraBadgeUpgrade}`
    );
    r3.unmount();

    // Starter tier clinician accessing Clinical AI Scribe v2 (Pro tier required -> must be gated)
    const { dom: scribeDom, rootElement: scribeRoot, root: r4 } = await renderAppAtRoute('/dashboard/scribe', {
      status: 'active',
      tier: 'starter',
      billingCycle: 'monthly',
      renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialDaysRemaining: 14,
    });
    const scribeLocked = scribeRoot.innerHTML.includes('subscription-gate-lock');
    const scribeBadgeUpgrade = Boolean(scribeDom.window.document.querySelector('[data-testid="tool-upgrade-badge-scribe"]'));
    logTest(
      'Starter Tier: Strictly Gated from Clinical AI Scribe v2 (Requires Pro Upgrade)',
      scribeLocked && scribeBadgeUpgrade,
      `Lock Overlay Present: ${scribeLocked}, Sidebar Upgrade Badge: ${scribeBadgeUpgrade}`
    );
    r4.unmount();
  }

  // -------------------------------------------------------------------------
  // Suite 5: Header & Sidebar Tier Badges Display Across All Statuses
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 5: Header & Sidebar Tier Badge State Synchronization ---');
  const badgeTestCases = [
    { status: 'none', tier: 'pro', expected: 'UNSUBSCRIBED' },
    { status: 'trialing', tier: 'pro', expected: 'TRIAL' },
    { status: 'active', tier: 'starter', expected: 'STARTER' },
    { status: 'active', tier: 'pro', expected: 'PRO CLINICIAN' },
    { status: 'active', tier: 'group', expected: 'PRACTICE GROUP' },
  ];

  for (const tc of badgeTestCases) {
    const { dom, rootElement, root } = await renderAppAtRoute('/dashboard', {
      status: tc.status,
      tier: tc.tier,
      billingCycle: 'monthly',
      renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialDaysRemaining: 14,
    });

    const headerBadge = dom.window.document.querySelector('[data-testid="header-tier-badge"]')?.textContent?.trim();
    const sidebarBadge = dom.window.document.querySelector('[data-testid="sidebar-tier-badge"]')?.textContent?.trim();

    const ok = headerBadge?.includes(tc.expected) && sidebarBadge?.includes(tc.expected);
    logTest(
      `Tier Badge Display [${tc.status.toUpperCase()} : ${tc.tier.toUpperCase()}]`,
      ok,
      `Header="${headerBadge}", Sidebar="${sidebarBadge}", Expected="${tc.expected}"`
    );

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Suite 6: Annual Billing Cycle Toggle & 20% Discount Recalculation
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 6: Pricing Table Billing Cycle Toggle & 20% Discount ---');
  {
    const { dom, rootElement, root } = await renderAppAtRoute('/dashboard/subscription', {
      status: 'active',
      tier: 'pro',
      billingCycle: 'monthly',
      renewsOn: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialDaysRemaining: 14,
    });

    const annualToggle = dom.window.document.querySelector('[data-testid="billing-cycle-toggle-annual"]');
    if (annualToggle) {
      annualToggle.click();
      await sleep(80);

      const html = rootElement.innerHTML;
      const starterAnnual = html.includes('$39');
      const proAnnual = html.includes('$79');
      const groupAnnual = html.includes('$199');
      const saveBadge = html.includes('Save 20%');

      const ok = starterAnnual && proAnnual && groupAnnual && saveBadge;
      logTest(
        'Annual Billing Switcher (20% Discount: $39, $79, $199)',
        ok,
        `Starter $39: ${starterAnnual}, Pro $79: ${proAnnual}, Group $199: ${groupAnnual}, Save 20%: ${saveBadge}`
      );
    } else {
      logTest('Annual Billing Switcher', false, 'Could not locate annual toggle');
    }

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Suite 7: Return URL Parameter Activation (?status=success&session_id=...)
  // -------------------------------------------------------------------------
  console.log('\n--- Phase 7: Checkout Return URL Parameter Subscription Activation ---');
  {
    const returnUrl = '/dashboard/subscription?status=success&session_id=cs_test_mock_return_99182&plan=group';
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: `http://localhost:3000${returnUrl}`,
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

    // Initial state: unsubscribed
    dom.window.localStorage.setItem(
      STORAGE_KEY_SUBSCRIPTION,
      JSON.stringify({
        status: 'none',
        tier: 'starter',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      })
    );

    const rootElement = dom.window.document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));

    for (let i = 0; i < 20; i++) {
      await sleep(15);
      const s = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
      if (s && JSON.parse(s).status === 'active') break;
    }

    const stored = dom.window.localStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    const parsed = stored ? JSON.parse(stored) : null;
    const isNowActive = parsed?.status === 'active';
    const tierIsGroup = parsed?.tier === 'group';

    const html = rootElement.innerHTML;
    const hasSuccessBanner = html.includes('Subscription Activated Successfully!');

    const ok = isNowActive && tierIsGroup && hasSuccessBanner;
    logTest(
      'Return URL (?status=success) Activates Subscription',
      ok,
      `localStorage status="${parsed?.status}", tier="${parsed?.tier}", Success Banner Rendered=${hasSuccessBanner}`
    );

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Summary & Certification
  // -------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`Subscription Gate Audit Summary: ${passed} Passed, ${failed} Failed (Total: ${passed + failed})`);
  console.log('====================================================================\n');

  if (failed > 0) {
    console.error('❌ SUBSCRIPTION GATE AUDIT FAILED.');
    process.exit(1);
  } else {
    console.log('✓ [AC3 & §R2 CERTIFIED] Subscription access gating, trial bypass, tier privileges, and billing operational.');
    process.exit(0);
  }
}

runSubscriptionGateAudit().catch((err) => {
  console.error('Fatal unhandled error during subscription gate audit:', err);
  process.exit(1);
});
