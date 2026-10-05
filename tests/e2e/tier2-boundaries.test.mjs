#!/usr/bin/env node
/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Covers:
 * 1. Complete Unauthenticated Route Matrix & Zero ePHI Leakage
 * 2. API Endpoint Input Boundaries, Prototype Keys & Error Handling
 * 3. Session Forgery, Corrupted Storage & Fail-Closed Security
 * 4. Open Redirect & Malicious Query Parameter Sanitization
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

import {
  renderApp,
  startTestServer,
  sleep,
  waitFor,
  TestReporter,
  getFixtures,
} from './test-helpers.mjs';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/ehr',
  '/dashboard/scribe',
  '/dashboard/aura',
  '/dashboard/phi-scrubber',
  '/dashboard/calendar',
  '/dashboard/clients',
  '/dashboard/billing',
  '/dashboard/subscription',
  '/dashboard/scribe?encounter=enc_99214&patient=101',
];

const CLINICAL_EPHI_KEYWORDS = [
  'Jane Doe',
  '#MC-88219',
  'Live Acoustic Transcript',
  'Unredacted Clinical Source',
  'Clinical Command Center',
];

async function runTier2Tests() {
  console.log('====================================================================');
  console.log('   E2E Tier 2: Boundary & Corner Cases Test Suite                   ');
  console.log('====================================================================\n');

  const { DEMO_CLINICIAN_USER, STORAGE_KEY_DEMO_SESSION } = await getFixtures();
  const reporter = new TestReporter('Tier 2 Boundaries & Corners');
  const server = await startTestServer();
  const apiBase = server.url;

  // ========================================================================
  // Category 1: Unauthenticated Route Matrix & Zero ePHI Leakage
  // ========================================================================
  console.log('--- Category 1: Unauthenticated Route Matrix & Zero ePHI Leakage ---');

  for (const route of PROTECTED_ROUTES) {
    const app = await renderApp({ route, authenticated: false });
    const currentPath = app.getPathname();
    const currentSearch = app.getSearch();
    const isAtLogin = currentPath === '/login';
    const hasRedirectParam = currentSearch.includes(`redirect=${encodeURIComponent(route)}`);
    const html = app.getHtml();
    const leakedEphi = CLINICAL_EPHI_KEYWORDS.some((kw) => html.includes(kw));

    reporter.record({
      name: `T2.1 [Route Guard] Unauthenticated probe to ${route} redirects cleanly with 0 ePHI leak`,
      passed: isAtLogin && hasRedirectParam && !leakedEphi,
      details: `Target: /login?${currentSearch} | Blocked: ${isAtLogin} | Leaked ePHI: ${leakedEphi}`,
    });
    app.unmount();
  }

  // ========================================================================
  // Category 2: API Endpoint Input Boundaries, Prototype Keys & Error Handling
  // ========================================================================
  console.log('\n--- Category 2: API Endpoint Input Boundaries & Negative Payloads ---');

  // 2.1 Invalid plan tier string
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'nonexistent_ultra_tier' }),
    });
    const data = await res.json();
    const ok = res.status === 400 && data.error === 'Invalid planId provided' && Array.isArray(data.validPlans);
    reporter.record({
      name: 'T2.2.1 [Stripe API] Invalid plan tier string returns 400 Bad Request with validPlans catalog',
      passed: ok,
      details: `HTTP ${res.status} | error: "${data.error}" | validPlans: ${JSON.stringify(data.validPlans)}`,
    });
  }

  // 2.2 Numeric planId
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 9999 }),
    });
    const ok = res.status === 400;
    reporter.record({
      name: 'T2.2.2 [Stripe API] Numeric planId type mismatch returns 400 Bad Request',
      passed: ok,
      details: `HTTP ${res.status}`,
    });
  }

  // 2.3 Empty string planId defaults safely
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: '' }),
    });
    const data = await res.json();
    const ok = res.status === 200 && data.plan?.name === 'Clinician Pro' && data.sessionId?.startsWith('cs_test_');
    reporter.record({
      name: 'T2.2.3 [Stripe API] Empty string planId safely defaults to Clinician Pro tier',
      passed: ok,
      details: `HTTP ${res.status} | Resolved plan: ${data.plan?.name}`,
    });
  }

  // 2.4 Prototype key: constructor
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'constructor' }),
    });
    const ok = res.status === 200 || res.status === 400;
    reporter.record({
      name: "T2.2.4 [Stripe API] Prototype probe planId='constructor' survives without server crash",
      passed: ok,
      details: `HTTP ${res.status} | Server survived without unhandled rejection`,
    });
  }

  // 2.5 Prototype key: __proto__
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: '__proto__' }),
    });
    const ok = res.status === 200 || res.status === 400;
    reporter.record({
      name: "T2.2.5 [Stripe API] Prototype probe planId='__proto__' survives without pollution",
      passed: ok,
      details: `HTTP ${res.status} | Server survived`,
    });
  }

  // 2.6 Prototype key: toString
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'toString' }),
    });
    const ok = res.status === 200 || res.status === 400;
    reporter.record({
      name: "T2.2.6 [Stripe API] Prototype probe planId='toString' survives safely",
      passed: ok,
      details: `HTTP ${res.status}`,
    });
  }

  // 2.7 Malformed JSON body
  {
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"planId": "pro", "brokenJson',
    });
    const ok = res.status === 400;
    reporter.record({
      name: 'T2.2.7 [API Core] Malformed unclosed JSON in request body returns 400 Bad Request',
      passed: ok,
      details: `HTTP ${res.status} | Syntax error caught by parser`,
    });
  }

  // 2.8 Oversized body boundary (500KB)
  {
    const massiveStr = 'a'.repeat(500 * 1024);
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'pro', padding: massiveStr }),
    });
    const ok = res.status === 413;
    reporter.record({
      name: 'T2.2.8 [API Core] Massive 500KB body payload rejected with 413 Payload Too Large',
      passed: ok,
      details: `HTTP ${res.status} | Enforced size limit`,
    });
  }

  // 2.9 Ancillary invoice creation with empty body defaults
  {
    const res = await fetch(`${apiBase}/api/billing/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    const ok = res.status === 200 && data.amountTotal === 15000 && data.clientName === 'Patient';
    reporter.record({
      name: 'T2.2.9 [Billing API] Empty body in billing checkout safely defaults amount and patient name',
      passed: ok,
      details: `HTTP ${res.status} | amountTotal: $${data.amountTotal / 100} | client: ${data.clientName}`,
    });
  }

  // 2.10 Nonexistent API route returns 404 JSON, not HTML SPA
  {
    const res = await fetch(`${apiBase}/api/nonexistent-clinical-endpoint`);
    const contentType = res.headers.get('content-type') || '';
    const ok = res.status === 404 && (contentType.includes('application/json') || !contentType.includes('text/html'));
    reporter.record({
      name: 'T2.2.10 [Routing] Nonexistent API route returns 404 JSON error without leaking SPA index.html',
      passed: ok,
      details: `HTTP ${res.status} | Content-Type: ${contentType}`,
    });
  }

  // ========================================================================
  // Category 3: Session Forgery, Corrupted Storage & Fail-Closed Security
  // ========================================================================
  console.log('\n--- Category 3: Session Forgery, Corrupted Storage & Fail-Closed Security ---');

  const nowSec = Math.floor(Date.now() / 1000);

  // 3.1 Malformed unclosed JSON in localStorage
  {
    const app = await renderApp({
      route: '/dashboard/ehr',
      extraStorage: { [STORAGE_KEY_DEMO_SESSION]: '{"corrupted": true, unclosed' },
    });
    const purged = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;
    const atLogin = app.getPathname() === '/login';
    reporter.record({
      name: 'T2.3.1 [Storage Security] Corrupted non-JSON localStorage token is purged and user sent to /login',
      passed: purged && atLogin,
      details: `Purged storage: ${purged} | Path: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 3.2 Non-object primitive string in localStorage
  {
    const app = await renderApp({
      route: '/dashboard/scribe',
      extraStorage: { [STORAGE_KEY_DEMO_SESSION]: 'just-a-plain-string-token' },
    });
    const purged = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;
    const atLogin = app.getPathname() === '/login';
    reporter.record({
      name: 'T2.3.2 [Storage Security] Primitive non-object string in session storage fails closed',
      passed: purged && atLogin,
      details: `Purged storage: ${purged} | Path: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 3.3 Forged user ID with attacker identity
  {
    const fakeSession = {
      user: { id: 'unauthorized-intruder-id-1234', email: 'intruder@evil.org' },
      session: { access_token: 'valid-looking-jwt', expires_at: nowSec + 3600 },
    };
    const app = await renderApp({
      route: '/dashboard/aura',
      extraStorage: { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify(fakeSession) },
    });
    const purged = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;
    const atLogin = app.getPathname() === '/login';
    reporter.record({
      name: 'T2.3.3 [Storage Security] Forged unauthorized user ID rejected and session wiped',
      passed: purged && atLogin,
      details: `Purged storage: ${purged} | Path: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 3.4 Valid ID but mismatched email (spoofed email)
  {
    const fakeSession = {
      user: { id: DEMO_CLINICIAN_USER.id, email: 'impostor@phishing.net' },
      session: { access_token: 'valid-looking-jwt', expires_at: nowSec + 3600 },
    };
    const app = await renderApp({
      route: '/dashboard/phi-scrubber',
      extraStorage: { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify(fakeSession) },
    });
    const purged = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;
    const atLogin = app.getPathname() === '/login';
    reporter.record({
      name: 'T2.3.4 [Storage Security] Valid ID with mismatched email fails anti-forgery validation',
      passed: purged && atLogin,
      details: `Purged storage: ${purged} | Path: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 3.5 Expired session token in past
  {
    const expiredSession = {
      user: DEMO_CLINICIAN_USER,
      session: { access_token: 'valid-looking-jwt', expires_at: nowSec - 3600 },
    };
    const app = await renderApp({
      route: '/dashboard',
      extraStorage: { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify(expiredSession) },
    });
    const purged = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;
    const atLogin = app.getPathname() === '/login';
    reporter.record({
      name: 'T2.3.5 [Storage Security] Expired session token (past expires_at) fails closed and purges',
      passed: purged && atLogin,
      details: `Purged storage: ${purged} | Path: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 3.6 Empty string / whitespace access token
  {
    const emptyTokSession = {
      user: DEMO_CLINICIAN_USER,
      session: { access_token: '   ', expires_at: nowSec + 3600 },
    };
    const app = await renderApp({
      route: '/dashboard',
      extraStorage: { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify(emptyTokSession) },
    });
    const purged = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;
    const atLogin = app.getPathname() === '/login';
    reporter.record({
      name: 'T2.3.6 [Storage Security] Whitespace-only access token rejected as invalid envelope',
      passed: purged && atLogin,
      details: `Purged storage: ${purged} | Path: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // ========================================================================
  // Category 4: Query Parameter Injection & Open Redirect Defense
  // ========================================================================
  console.log('\n--- Category 4: Query Parameter Injection & Open Redirect Defense ---');

  // 4.1 External HTTPS phishing domain in ?redirect
  {
    const app = await renderApp({
      route: '/login?redirect=https://attacker-phishing.org/steal',
      authenticated: false,
    });
    const demoBtn = app.dom.window.document.getElementById('demo-clinician-signin-btn');
    let navigatedSafely = false;
    if (demoBtn) {
      demoBtn.click();
      navigatedSafely = await waitFor(() => app.getPathname() === '/dashboard', { timeoutMs: 1500 });
    }
    reporter.record({
      name: 'T2.4.1 [Open Redirect] Full HTTPS external URL in ?redirect sanitized to /dashboard',
      passed: navigatedSafely,
      details: `Path after signin: ${app.getPathname()} | External site blocked: ${navigatedSafely}`,
    });
    app.unmount();
  }

  // 4.2 Protocol-relative URL (//evil.com) in ?redirect
  {
    const app = await renderApp({
      route: '/login?redirect=//evil.com/payload',
      authenticated: false,
    });
    const demoBtn = app.dom.window.document.getElementById('demo-clinician-signin-btn');
    let navigatedSafely = false;
    if (demoBtn) {
      demoBtn.click();
      navigatedSafely = await waitFor(() => app.getPathname() === '/dashboard', { timeoutMs: 1500 });
    }
    reporter.record({
      name: 'T2.4.2 [Open Redirect] Protocol-relative URL (//evil.com) in ?redirect sanitized to /dashboard',
      passed: navigatedSafely,
      details: `Path after signin: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 4.3 JavaScript XSS URI in ?redirect
  {
    const app = await renderApp({
      route: '/login?redirect=javascript:alert(document.cookie)',
      authenticated: false,
    });
    const demoBtn = app.dom.window.document.getElementById('demo-clinician-signin-btn');
    let navigatedSafely = false;
    if (demoBtn) {
      demoBtn.click();
      navigatedSafely = await waitFor(() => app.getPathname() === '/dashboard', { timeoutMs: 1500 });
    }
    reporter.record({
      name: 'T2.4.3 [XSS Defense] JavaScript pseudo-protocol URI (javascript:...) in ?redirect sanitized',
      passed: navigatedSafely,
      details: `Path after signin: ${app.getPathname()}`,
    });
    app.unmount();
  }

  // 4.4 Data URI in ?redirect
  {
    const app = await renderApp({
      route: '/login?redirect=data:text/html,<script>alert(1)</script>',
      authenticated: false,
    });
    const demoBtn = app.dom.window.document.getElementById('demo-clinician-signin-btn');
    let navigatedSafely = false;
    if (demoBtn) {
      demoBtn.click();
      navigatedSafely = await waitFor(() => app.getPathname() === '/dashboard', { timeoutMs: 1500 });
    }
    reporter.record({
      name: 'T2.4.4 [XSS Defense] Data URI in ?redirect sanitized to internal /dashboard',
      passed: navigatedSafely,
      details: `Path after signin: ${app.getPathname()}`,
    });
    app.unmount();
  }

  const { passed, failed, total } = reporter.summary();
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTier2Tests().catch((err) => {
  console.error('Fatal Tier 2 test runner error:', err);
  process.exit(1);
});
