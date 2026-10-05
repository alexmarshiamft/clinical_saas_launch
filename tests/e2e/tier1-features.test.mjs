#!/usr/bin/env node
/**
 * Tier 1: Comprehensive Feature Coverage E2E Test Suite
 * Minimum 5 test cases per core feature across:
 * 1. Dual-Engine Authentication
 * 2. Unified Command Center & Dashboard Layout
 * 3. Stripe Subscription Billing Engine
 * 4. TheraFlow Clinical EHR & Telehealth
 * 5. Clinical AI Scribe v2 Diarization
 * 6. Aura Assistant Studio & Copilot
 * 7. HIPAA PHI Scrubber 18 Safe Harbor Engine
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
  stopTestServer,
  sleep,
  waitFor,
  TestReporter,
  getFixtures,
} from './test-helpers.mjs';

async function runTier1Tests() {
  console.log('====================================================================');
  console.log('   E2E Tier 1: Full Feature Coverage Test Suite (7 Features)        ');
  console.log('====================================================================\n');

  const { STORAGE_KEY_DEMO_SESSION, DEMO_CLINICIAN_USER } = await getFixtures();
  const reporter = new TestReporter('Tier 1 Feature Coverage');
  const server = await startTestServer();
  const apiBase = server.url;

  try {
    // ========================================================================
    // Feature 1: Dual-Engine Authentication
    // ========================================================================
    console.log('--- Feature 1: Dual-Engine Authentication ---');

    // 1.1 Unauthenticated route guard probe
    {
      const app = await renderApp({ route: '/dashboard', authenticated: false });
      const path = app.getPathname();
      const search = app.getSearch();
      const blocked = path === '/login' && search.includes('redirect=%2Fdashboard');
      const html = app.getHtml();
      const noLeak = !html.includes('Clinical Command Center') && !html.includes('Jane Doe');
      reporter.record({
        name: 'T1.1.1 [Auth] Unauthenticated route access blocked and redirected to /login',
        passed: blocked && noLeak,
        details: `Redirected to: ${path}${search} | ePHI Leaked: ${!noLeak}`,
      });
      app.unmount();
    }

    // 1.2 1-Click Demo Clinician Login flow
    {
      const app = await renderApp({ route: '/login?redirect=%2Fdashboard%2Fehr', authenticated: false });
      const demoBtn = app.dom.window.document.getElementById('demo-clinician-signin-btn');
      let loginSuccess = false;
      if (demoBtn) {
        demoBtn.click();
        loginSuccess = await waitFor(() => {
          const stored = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
          const hasSession = Boolean(stored && stored.includes('Sarah Chen'));
          const redirected = app.getPathname() === '/dashboard/ehr';
          return hasSession && redirected;
        }, { timeoutMs: 1500 });
      }
      reporter.record({
        name: 'T1.1.2 [Auth] 1-Click Demo Clinician button authenticates and routes to target',
        passed: loginSuccess,
        details: `Final route: ${app.getPathname()} | Session hydrated: ${loginSuccess}`,
      });
      app.unmount();
    }

    // 1.3 Session envelope integrity in localStorage
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const raw = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
      let validEnvelope = false;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          validEnvelope =
            parsed.user?.id === DEMO_CLINICIAN_USER.id &&
            parsed.user?.email === 'sarah.chen.md@behavioralhealth.org' &&
            Boolean(parsed.session?.access_token) &&
            parsed.session?.expires_at > Math.floor(Date.now() / 1000);
        } catch {}
      }
      reporter.record({
        name: 'T1.1.3 [Auth] Session envelope persists valid Supabase User and Session fixtures',
        passed: validEnvelope,
        details: `User ID: ${DEMO_CLINICIAN_USER.id} | Token valid: ${validEnvelope}`,
      });
      app.unmount();
    }

    // 1.4 Clinician identity rendered in Header & Profile
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const html = app.getHtml();
      const hasDoctorName = html.includes('Dr. Sarah Chen, MD');
      const hasPracticeName = html.includes('Bay Area Behavioral Health');
      reporter.record({
        name: 'T1.1.4 [Auth] Authenticated session renders clinician and practice profile identity',
        passed: hasDoctorName && hasPracticeName,
        details: `Clinician name present: ${hasDoctorName} | Practice name present: ${hasPracticeName}`,
      });
      app.unmount();
    }

    // 1.5 Secure Sign-Out clears credentials
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      // Find signout button in sidebar (title="Sign Out")
      const logoutBtn = app.dom.window.document.querySelector('button[title="Sign Out"]');
      let signoutClean = false;
      if (logoutBtn) {
        logoutBtn.click();
        signoutClean = await waitFor(() => {
          const stored = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
          const isAtLogin = app.getPathname() === '/login';
          return stored === null && isAtLogin;
        }, { timeoutMs: 1500 });
      }
      reporter.record({
        name: 'T1.1.5 [Auth] Sign-out clears localStorage session and redirects to /login',
        passed: signoutClean,
        details: `Session cleared: ${signoutClean} | Pathname: ${app.getPathname()}`,
      });
      app.unmount();
    }

    // ========================================================================
    // Feature 2: Unified Command Center & Dashboard Layout
    // ========================================================================
    console.log('\n--- Feature 2: Unified Command Center & Dashboard Layout ---');

    // 2.1 AppLayout shell components
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const html = app.getHtml();
      const hasSidebar = html.includes('TheraFlow') && html.includes('Core Clinical Tools');
      const hasHeader = html.includes('Bay Area Behavioral Health');
      const hasBanner = html.includes('CONFIDENTIAL &amp; HIPAA PROTECTED') || html.includes('HIPAA PROTECTED');
      reporter.record({
        name: 'T1.2.1 [Dashboard] AppLayout shell renders Sidebar, Header, and HIPAA banner',
        passed: hasSidebar && hasHeader && hasBanner,
        details: `Sidebar: ${hasSidebar} | Header: ${hasHeader} | Banner: ${hasBanner}`,
      });
      app.unmount();
    }

    // 2.2 DashboardHome welcome card
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const html = app.getHtml();
      const hasCommandCenter = html.includes('Clinical Command Center');
      const hasDoctorWelcome = html.includes('Dr. Sarah Chen, MD');
      reporter.record({
        name: 'T1.2.2 [Dashboard] DashboardHome renders Clinical Command Center welcome banner',
        passed: hasCommandCenter && hasDoctorWelcome,
        details: `Command Center title: ${hasCommandCenter} | Welcome: ${hasDoctorWelcome}`,
      });
      app.unmount();
    }

    // 2.3 Active Patient Hero Card
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const html = app.getHtml();
      const hasPatientName = html.includes('Jane Doe');
      const hasMRN = html.includes('#MC-88219');
      const hasDOB = html.includes('04/12/1988');
      const hasCPT = html.includes('90837');
      reporter.record({
        name: 'T1.2.3 [Dashboard] Active Patient Hero Card renders patient Jane Doe with MRN and CPT',
        passed: hasPatientName && hasMRN && hasDOB && hasCPT,
        details: `Name: ${hasPatientName} | MRN: ${hasMRN} | DOB: ${hasDOB} | CPT: ${hasCPT}`,
      });
      app.unmount();
    }

    // 2.4 Today's appointment schedule
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const html = app.getHtml();
      const hasScheduleTitle = html.includes("Today's Encounter Schedule");
      const hasJaneAppt = html.includes('Jane Doe') && html.includes('10:00 AM');
      const hasMarcusAppt = html.includes('Marcus Vance') && html.includes('11:30 AM');
      reporter.record({
        name: 'T1.2.4 [Dashboard] Clinical schedule displays today appointments with timestamps and CPT',
        passed: hasScheduleTitle && hasJaneAppt && hasMarcusAppt,
        details: `Schedule header: ${hasScheduleTitle} | Jane: ${hasJaneAppt} | Marcus: ${hasMarcusAppt}`,
      });
      app.unmount();
    }

    // 2.5 Header Patient Selector interaction
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const patientBar = app.dom.window.document.querySelector('.cursor-pointer.group');
      let patientSwitched = false;
      if (patientBar) {
        patientBar.click();
        await sleep(50);
        // Find Marcus Vance button
        const buttons = Array.from(app.dom.window.document.querySelectorAll('button'));
        const marcusBtn = buttons.find((b) => b.textContent?.includes('Marcus Vance'));
        if (marcusBtn) {
          marcusBtn.click();
          await sleep(50);
          patientSwitched = app.getHtml().includes('Marcus Vance');
        }
      }
      reporter.record({
        name: 'T1.2.5 [Dashboard] Header Patient Selector allows switching active encounter context',
        passed: patientSwitched,
        details: `Switched active patient: ${patientSwitched}`,
      });
      app.unmount();
    }

    // ========================================================================
    // Feature 3: Stripe Subscription Billing Engine
    // ========================================================================
    console.log('\n--- Feature 3: Stripe Subscription Billing Engine ---');

    // 3.1 POST /api/create-checkout-session starter plan
    {
      const res = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'starter' }),
      });
      const data = await res.json();
      const ok = res.status === 200 && data.sessionId?.startsWith('cs_test_') && data.plan?.amount === 4900;
      reporter.record({
        name: 'T1.3.1 [Stripe] POST /api/create-checkout-session creates session for Starter plan ($49)',
        passed: ok,
        details: `HTTP ${res.status} | Session: ${data.sessionId?.substring(0, 20)}... | Amount: $${data.plan?.amount / 100}`,
      });
    }

    // 3.2 POST /api/create-checkout-session pro plan
    {
      const res = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro' }),
      });
      const data = await res.json();
      const ok = res.status === 200 && data.sessionId?.startsWith('cs_test_') && data.plan?.amount === 9900;
      reporter.record({
        name: 'T1.3.2 [Stripe] POST /api/create-checkout-session creates session for Clinician Pro plan ($99)',
        passed: ok,
        details: `HTTP ${res.status} | Session: ${data.sessionId?.substring(0, 20)}... | Amount: $${data.plan?.amount / 100}`,
      });
    }

    // 3.3 POST /api/create-checkout-session group plan
    {
      const res = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'group' }),
      });
      const data = await res.json();
      const ok = res.status === 200 && data.sessionId?.startsWith('cs_test_') && data.plan?.amount === 24900;
      reporter.record({
        name: 'T1.3.3 [Stripe] POST /api/create-checkout-session creates session for Practice Group plan ($249)',
        passed: ok,
        details: `HTTP ${res.status} | Session: ${data.sessionId?.substring(0, 20)}... | Amount: $${data.plan?.amount / 100}`,
      });
    }

    // 3.4 Commercial Pricing & Subscription Page UI
    {
      const app = await renderApp({ route: '/dashboard/subscription', authenticated: true });
      const html = app.getHtml();
      const hasStarter = html.includes('Starter Tier') && html.includes('$49');
      const hasPro = html.includes('Clinician Pro') && html.includes('$99');
      const hasGroup = html.includes('Practice Group') && html.includes('$249');
      const hasAnnualToggle = html.includes('Save 20%');
      reporter.record({
        name: 'T1.3.4 [Stripe] Subscription UI renders 3-tier pricing cards and annual billing toggle',
        passed: hasStarter && hasPro && hasGroup && hasAnnualToggle,
        details: `Starter: ${hasStarter} | Pro: ${hasPro} | Group: ${hasGroup} | 20% discount toggle: ${hasAnnualToggle}`,
      });
      app.unmount();
    }

    // 3.5 GET /api/subscription/status endpoint
    {
      const res = await fetch(`${apiBase}/api/subscription/status`);
      const data = await res.json();
      const ok = res.status === 200 && data.status === 'active' && data.tier === 'pro' && data.isSubscribed === true;
      reporter.record({
        name: 'T1.3.5 [Stripe] GET /api/subscription/status returns active Pro subscription metadata',
        passed: ok,
        details: `HTTP ${res.status} | status: ${data.status} | tier: ${data.tier} | isSubscribed: ${data.isSubscribed}`,
      });
    }

    // ========================================================================
    // Feature 4: TheraFlow Clinical EHR & Telehealth
    // ========================================================================
    console.log('\n--- Feature 4: TheraFlow Clinical EHR & Telehealth ---');

    // 4.1 EHR Workspace mounting and active indicator
    {
      const app = await renderApp({ route: '/dashboard/ehr', authenticated: true });
      const html = app.getHtml();
      const hasTitle = html.includes('Clinical EHR &amp; Telehealth') || html.includes('Clinical EHR & Telehealth');
      const hasPill = html.includes('EHR Active');
      reporter.record({
        name: 'T1.4.1 [EHR] EhrWorkspace mounts at /dashboard/ehr with EHR Active status pill',
        passed: hasTitle && hasPill,
        details: `Title present: ${hasTitle} | Badge present: ${hasPill}`,
      });
      app.unmount();
    }

    // 4.2 EHR patient charting binding
    {
      const app = await renderApp({ route: '/dashboard/ehr', authenticated: true });
      const html = app.getHtml();
      const bindsPatient = html.includes('Jane Doe') && html.includes('#MC-88219') && html.includes('CPT 90837');
      reporter.record({
        name: 'T1.4.2 [EHR] EhrWorkspace binds to active patient chart (Jane Doe, MRN, CPT)',
        passed: bindsPatient,
        details: `Active patient charting data bound: ${bindsPatient}`,
      });
      app.unmount();
    }

    // 4.3 WebRTC Telehealth Session state
    {
      const app = await renderApp({ route: '/dashboard/ehr', authenticated: true });
      const html = app.getHtml();
      const hasTelehealth = html.includes('Ready for Session') && html.includes('Encrypted WebRTC Room');
      reporter.record({
        name: 'T1.4.3 [EHR] Telehealth module renders encrypted WebRTC room status indicator',
        passed: hasTelehealth,
        details: `Telehealth status: ${hasTelehealth}`,
      });
      app.unmount();
    }

    // 4.4 Clinical notes DAP & SOAP formats
    {
      const app = await renderApp({ route: '/dashboard/ehr', authenticated: true });
      const html = app.getHtml();
      const hasNotes = html.includes('DAP / SOAP Formats') && html.includes('Auto-synced with Scribe');
      reporter.record({
        name: 'T1.4.4 [EHR] Clinical notes section displays DAP / SOAP format synchronization',
        passed: hasNotes,
        details: `Clinical notes formats rendered: ${hasNotes}`,
      });
      app.unmount();
    }

    // 4.5 Practice operations aliases route to EHR
    {
      const app1 = await renderApp({ route: '/dashboard/calendar', authenticated: true });
      const app2 = await renderApp({ route: '/dashboard/clients', authenticated: true });
      const app3 = await renderApp({ route: '/dashboard/billing', authenticated: true });
      const ok1 = app1.getHtml().includes('TheraFlow Practice Management');
      const ok2 = app2.getHtml().includes('TheraFlow Practice Management');
      const ok3 = app3.getHtml().includes('TheraFlow Practice Management');
      reporter.record({
        name: 'T1.4.5 [EHR] Operations routes (/calendar, /clients, /billing) route to EHR workspace',
        passed: ok1 && ok2 && ok3,
        details: `Calendar: ${ok1} | Clients: ${ok2} | Billing: ${ok3}`,
      });
      app1.unmount();
      app2.unmount();
      app3.unmount();
    }

    // ========================================================================
    // Feature 5: Clinical AI Scribe v2 Diarization Workspace
    // ========================================================================
    console.log('\n--- Feature 5: Clinical AI Scribe v2 Diarization Workspace ---');

    // 5.1 Scribe Workspace mounting & live acoustic badge
    {
      const app = await renderApp({ route: '/dashboard/scribe', authenticated: true });
      const html = app.getHtml();
      const hasTitle = html.includes('Clinical AI Scribe v2');
      const hasPulse = html.includes('AI Diarization Ready');
      reporter.record({
        name: 'T1.5.1 [Scribe] ScribeWorkspace mounts at /dashboard/scribe with AI Diarization Ready badge',
        passed: hasTitle && hasPulse,
        details: `Title: ${hasTitle} | Acoustic badge: ${hasPulse}`,
      });
      app.unmount();
    }

    // 5.2 Live dual-speaker acoustic transcript
    {
      const app = await renderApp({ route: '/dashboard/scribe', authenticated: true });
      const html = app.getHtml();
      const hasTranscript =
        html.includes('Live Acoustic Transcript') &&
        html.includes('Dr. Chen:') &&
        html.includes('Jane Doe:');
      reporter.record({
        name: 'T1.5.2 [Scribe] Renders live acoustic diarization transcript separating clinician & patient',
        passed: hasTranscript,
        details: `Dual-speaker diarization text rendered: ${hasTranscript}`,
      });
      app.unmount();
    }

    // 5.3 Automated SOAP preview synthesis
    {
      const app = await renderApp({ route: '/dashboard/scribe', authenticated: true });
      const html = app.getHtml();
      const hasSoapPreview =
        html.includes('Generated SOAP Preview') &&
        html.includes('Subjective:') &&
        html.includes('Assessment:');
      reporter.record({
        name: 'T1.5.3 [Scribe] Automatically synthesizes SOAP preview for active encounter',
        passed: hasSoapPreview,
        details: `SOAP preview rendered: ${hasSoapPreview}`,
      });
      app.unmount();
    }

    // 5.4 CPT code synchronization in Scribe preview
    {
      const app = await renderApp({ route: '/dashboard/scribe', authenticated: true });
      const html = app.getHtml();
      const hasCpt = html.includes('Generated SOAP Preview (CPT 90837)');
      reporter.record({
        name: 'T1.5.4 [Scribe] Scribe workspace preview synchronizes with active patient CPT 90837 code',
        passed: hasCpt,
        details: `CPT 90837 bound: ${hasCpt}`,
      });
      app.unmount();
    }

    // 5.5 Scribe launch CTA from Command Center
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const links = Array.from(app.dom.window.document.querySelectorAll('a'));
      const scribeLink = links.find((l) => l.getAttribute('href') === '/dashboard/scribe');
      reporter.record({
        name: 'T1.5.5 [Scribe] Command Center contains direct launcher linking to Scribe recording feed',
        passed: Boolean(scribeLink),
        details: `Scribe launcher anchor present: ${Boolean(scribeLink)}`,
      });
      app.unmount();
    }

    // ========================================================================
    // Feature 6: Aura Assistant Studio & Clinical Copilot
    // ========================================================================
    console.log('\n--- Feature 6: Aura Assistant Studio & Clinical Copilot ---');

    // 6.1 Aura Studio workspace mounting
    {
      const app = await renderApp({ route: '/dashboard/aura', authenticated: true });
      const html = app.getHtml();
      const hasTitle = html.includes('Aura Assistant Studio');
      const hasBadge = html.includes('Copilot Standby');
      reporter.record({
        name: 'T1.6.1 [Aura] AuraStudio mounts at /dashboard/aura with Copilot Standby status',
        passed: hasTitle && hasBadge,
        details: `Title: ${hasTitle} | Standby status: ${hasBadge}`,
      });
      app.unmount();
    }

    // 6.2 Diagnostic differential assistant bound to patient
    {
      const app = await renderApp({ route: '/dashboard/aura', authenticated: true });
      const html = app.getHtml();
      const hasDifferential =
        html.includes('Diagnostic Differential Assistant: Jane Doe') &&
        html.includes('CPT: 90837');
      reporter.record({
        name: 'T1.6.2 [Aura] Diagnostic Differential Assistant binds to Jane Doe and CPT 90837',
        passed: hasDifferential,
        details: `Patient binding: ${hasDifferential}`,
      });
      app.unmount();
    }

    // 6.3 DSM-5 clinical criteria guidance text
    {
      const app = await renderApp({ route: '/dashboard/aura', authenticated: true });
      const html = app.getHtml();
      const hasDsm5 =
        html.includes('DSM-5 symptom markers') &&
        html.includes('ICD-10 diagnostic codes') &&
        html.includes('clinical interventions');
      reporter.record({
        name: 'T1.6.3 [Aura] Studio provides real-time DSM-5 criteria and ICD-10 intervention guidance',
        passed: hasDsm5,
        details: `DSM-5 guidance text rendered: ${hasDsm5}`,
      });
      app.unmount();
    }

    // 6.4 Aura Quick Toggle Orb in Header
    {
      const app = await renderApp({ route: '/dashboard', authenticated: true });
      const auraHeaderLink = app.dom.window.document.querySelector('header a[href="/dashboard/aura"]');
      const hasCopilotText = auraHeaderLink?.textContent?.includes('Aura Copilot');
      reporter.record({
        name: 'T1.6.4 [Aura] Header contains Aura Copilot quick launcher accessible across all views',
        passed: Boolean(auraHeaderLink && hasCopilotText),
        details: `Aura link found in Header: ${Boolean(auraHeaderLink)} | Has text: ${hasCopilotText}`,
      });
      app.unmount();
    }

    // 6.5 Dynamic differential update on context change
    {
      const app = await renderApp({ route: '/dashboard/aura', authenticated: true });
      // Click patient selector in Header to switch to Marcus Vance
      const patientBar = app.dom.window.document.querySelector('.cursor-pointer.group');
      let updatedAura = false;
      if (patientBar) {
        patientBar.click();
        await sleep(50);
        const buttons = Array.from(app.dom.window.document.querySelectorAll('button'));
        const marcusBtn = buttons.find((b) => b.textContent?.includes('Marcus Vance'));
        if (marcusBtn) {
          marcusBtn.click();
          await sleep(50);
          updatedAura = app.getHtml().includes('Diagnostic Differential Assistant: Marcus Vance');
        }
      }
      reporter.record({
        name: 'T1.6.5 [Aura] Aura Studio updates diagnostic target when active patient context switches',
        passed: updatedAura,
        details: `Aura updated to Marcus Vance: ${updatedAura}`,
      });
      app.unmount();
    }

    // ========================================================================
    // Feature 7: HIPAA PHI Scrubber 18 Safe Harbor Engine
    // ========================================================================
    console.log('\n--- Feature 7: HIPAA PHI Scrubber 18 Safe Harbor Engine ---');

    // 7.1 PHI Scrubber View mounting
    {
      const app = await renderApp({ route: '/dashboard/phi-scrubber', authenticated: true });
      const html = app.getHtml();
      const hasTitle = html.includes('HIPAA PHI Scrubber');
      const hasSafeHarbor = html.includes('18 Safe Harbor Active');
      reporter.record({
        name: 'T1.7.1 [PHI Scrubber] PhiScrubberView mounts at /dashboard/phi-scrubber with 18 Safe Harbor Active badge',
        passed: hasTitle && hasSafeHarbor,
        details: `Title: ${hasTitle} | 18 Safe Harbor badge: ${hasSafeHarbor}`,
      });
      app.unmount();
    }

    // 7.2 Unredacted Clinical Source pane identifies ePHI
    {
      const app = await renderApp({ route: '/dashboard/phi-scrubber', authenticated: true });
      const html = app.getHtml();
      const hasSourcePane =
        html.includes('Unredacted Clinical Source (Protected ePHI)') &&
        html.includes('Jane Doe') &&
        html.includes('04/12/1988') &&
        html.includes('(415) 555-0199');
      reporter.record({
        name: 'T1.7.2 [PHI Scrubber] Unredacted source pane displays patient clinical ePHI for review',
        passed: hasSourcePane,
        details: `ePHI source text identified: ${hasSourcePane}`,
      });
      app.unmount();
    }

    // 7.3 Safe Harbor entity redaction: [NAME] token
    {
      const app = await renderApp({ route: '/dashboard/phi-scrubber', authenticated: true });
      const html = app.getHtml();
      const hasNameTag = html.includes('[NAME]') && html.includes('18 Safe Harbor Redacted Output');
      reporter.record({
        name: 'T1.7.3 [PHI Scrubber] 18 Safe Harbor engine masks patient identity with [NAME] token',
        passed: hasNameTag,
        details: `[NAME] token present: ${hasNameTag}`,
      });
      app.unmount();
    }

    // 7.4 Safe Harbor entity redaction: [DATE] token
    {
      const app = await renderApp({ route: '/dashboard/phi-scrubber', authenticated: true });
      const html = app.getHtml();
      const hasDateTag = html.includes('[DATE]');
      reporter.record({
        name: 'T1.7.4 [PHI Scrubber] 18 Safe Harbor engine masks date of birth with [DATE] token',
        passed: hasDateTag,
        details: `[DATE] token present: ${hasDateTag}`,
      });
      app.unmount();
    }

    // 7.5 Safe Harbor entity redaction: [PHONE] token
    {
      const app = await renderApp({ route: '/dashboard/phi-scrubber', authenticated: true });
      const html = app.getHtml();
      const hasPhoneTag = html.includes('[PHONE]');
      reporter.record({
        name: 'T1.7.5 [PHI Scrubber] 18 Safe Harbor engine masks telephone contact info with [PHONE] token',
        passed: hasPhoneTag,
        details: `[PHONE] token present: ${hasPhoneTag}`,
      });
      app.unmount();
    }
  } finally {
    // If running standalone, leave server cleanup to process exit
  }

  const { passed, failed, total } = reporter.summary();
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTier1Tests().catch((err) => {
  console.error('Fatal Tier 1 test runner error:', err);
  process.exit(1);
});
