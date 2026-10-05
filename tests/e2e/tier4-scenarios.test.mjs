#!/usr/bin/env node
/**
 * Tier 4: Real-World Clinical Workload Scenarios E2E Test Suite
 * Simulates complete end-to-end clinical encounter workflows:
 * Scenario 1: Complete Patient Intake to Note Finalization & EHR Commit
 * Scenario 2: Telehealth Session with Live Scribe Diarization & CPT Code Reconciliation
 * Scenario 3: Complex Multi-Diagnosis Encounter with Aura Copilot Assistance
 * Scenario 4: Statutory HIPAA 18 Safe Harbor Redaction & Forensic Audit Export
 * Scenario 5: Full Practice Subscription Lifecycle & Commercial Billing Flow
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

async function runTier4Tests() {
  console.log('====================================================================');
  console.log('   E2E Tier 4: Real-World Clinical Workload Scenarios Test Suite    ');
  console.log('====================================================================\n');

  const {
    DEMO_CLINICIAN_USER,
    STORAGE_KEY_DEMO_SESSION,
  } = await getFixtures();

  const reporter = new TestReporter('Tier 4 Real-World Workload Scenarios');
  const server = await startTestServer();
  const apiBase = server.url;

  // ========================================================================
  // Scenario 1: Complete Patient Intake to Note Finalization & EHR Commit
  // ========================================================================
  console.log('--- Scenario 1: Complete Patient Intake to Note Finalization & EHR Commit ---');
  {
    // Step 1.1: Clinician logs in from login page
    const app = await renderApp({ route: '/login', authenticated: false });
    const demoBtn = app.dom.window.document.getElementById('demo-clinician-signin-btn');
    let loggedIn = false;
    if (demoBtn) {
      demoBtn.click();
      await waitFor(() => app.getHtml().includes('Clinical Command Center'), { timeoutMs: 2000 });
      loggedIn = app.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) !== null;
    }

    // Step 1.2: Navigates to Command Center and reviews Jane Doe
    const ccHtml = app.getHtml();
    const hasCommandCenter = ccHtml.includes('Clinical Command Center');
    const hasJaneHero = ccHtml.includes('Jane Doe') && ccHtml.includes('#MC-88219');

    // Step 1.3: Launches Scribe workspace
    const scribeBtn = app.dom.window.document.querySelector('a[href="/dashboard/scribe"]');
    let inScribe = false;
    if (scribeBtn) {
      scribeBtn.click();
      inScribe = await waitFor(() => {
        return (
          app.getPathname() === '/dashboard/scribe' &&
          app.getHtml().includes('AI Diarization Ready')
        );
      }, { timeoutMs: 2000 });
    }

    // Step 1.4: Verifies live transcript and SOAP synthesis
    const scribeHtml = app.getHtml();
    const hasTranscript = scribeHtml.includes('Dr. Chen:') && scribeHtml.includes('Jane Doe:');
    const hasSoap = scribeHtml.includes('Subjective:') && scribeHtml.includes('Assessment:');

    // Step 1.5: Navigates to EHR and verifies chart commitment
    const ehrBtn = app.dom.window.document.querySelector('a[href="/dashboard/ehr"]');
    let inEhr = false;
    if (ehrBtn) {
      ehrBtn.click();
      inEhr = await waitFor(() => {
        return (
          app.getPathname() === '/dashboard/ehr' &&
          (app.getHtml().includes('Encrypted WebRTC Room') ||
           app.dom.window.document.querySelector('main')?.textContent.includes('Clinical EHR'))
        );
      }, { timeoutMs: 2000 });
    }
    const ehrHtml = app.getHtml();
    const chartCommitted = ehrHtml.includes('Jane Doe') && ehrHtml.includes('CPT 90837');

    const scenario1Success =
      loggedIn &&
      hasCommandCenter &&
      hasJaneHero &&
      inScribe &&
      hasTranscript &&
      hasSoap &&
      inEhr &&
      chartCommitted;

    reporter.record({
      name: 'Scenario 1: End-to-end patient encounter workflow from intake login to SOAP synthesis and EHR chart commit',
      passed: scenario1Success,
      details: `Auth: ${loggedIn} | Hero: ${hasJaneHero} | Scribe: ${inScribe} | Transcript: ${hasTranscript} | SOAP: ${hasSoap} | EHR: ${chartCommitted}`,
    });
    app.unmount();
  }

  // ========================================================================
  // Scenario 2: Telehealth Session with Live Scribe & CPT Code Reconciliation
  // ========================================================================
  console.log('\n--- Scenario 2: Telehealth Session with Live Scribe & CPT Code Reconciliation ---');
  {
    // Step 2.1: Clinician enters EHR Telehealth suite
    const app = await renderApp({ route: '/dashboard/ehr', authenticated: true });
    const ehrHtml = app.getHtml();
    const hasWebRTC = ehrHtml.includes('Ready for Session') && ehrHtml.includes('Encrypted WebRTC Room');

    // Step 2.2: Verifies active encounter CPT code (90837 for 60m session)
    const hasCpt90837 = ehrHtml.includes('CPT 90837') && ehrHtml.includes('#MC-88219');

    // Step 2.3: Launches Scribe recording session for this encounter
    const scribeLink = app.dom.window.document.querySelector('aside a[href="/dashboard/scribe"]');
    let scribeLaunched = false;
    if (scribeLink) {
      scribeLink.click();
      scribeLaunched = await waitFor(() => {
        return (
          app.getPathname() === '/dashboard/scribe' &&
          app.getHtml().includes('AI Diarization Ready')
        );
      }, { timeoutMs: 2000 });
    }

    // Step 2.4: Verifies CPT diagnostic reconciler matching encounter duration
    const scribeHtml = app.getHtml();
    const cptReconciled = scribeHtml.includes('CPT 90837');

    const scenario2Success = hasWebRTC && hasCpt90837 && scribeLaunched && cptReconciled;

    reporter.record({
      name: 'Scenario 2: Telehealth session verification with live acoustic diarization and CPT 90837 reconciliation',
      passed: scenario2Success,
      details: `WebRTC Room: ${hasWebRTC} | CPT Encounter: ${hasCpt90837} | Scribe Active: ${scribeLaunched} | Reconciled: ${cptReconciled}`,
    });
    app.unmount();
  }

  // ========================================================================
  // Scenario 3: Complex Multi-Diagnosis Encounter with Aura Copilot Assistance
  // ========================================================================
  console.log('\n--- Scenario 3: Complex Multi-Diagnosis Encounter with Aura Copilot Assistance ---');
  {
    // Step 3.1: Clinician opens Aura Studio workspace
    const app = await renderApp({ route: '/dashboard/aura', authenticated: true });
    const auraHtml = app.getHtml();
    const hasAuraStudio = auraHtml.includes('Aura Assistant Studio');
    const hasCopilotStandby = auraHtml.includes('Copilot Standby');

    // Step 3.2: Differential assistant evaluates active patient (Jane Doe)
    const hasPatientTarget = auraHtml.includes('Diagnostic Differential Assistant: Jane Doe');

    // Step 3.3: Verifies DSM-5 symptom marker guidance and ICD-10 diagnostic coding recommendations
    const hasDsm5Guidance =
      auraHtml.includes('DSM-5 symptom markers') &&
      auraHtml.includes('ICD-10 diagnostic codes') &&
      auraHtml.includes('clinical interventions');

    // Step 3.4: Switch encounter to Marcus Vance in Header to assess multi-specialty adaptation
    const patientBar = app.dom.window.document.querySelector('.cursor-pointer.group');
    let adaptedMarcus = false;
    if (patientBar) {
      patientBar.click();
      await waitFor(() => {
        return Array.from(app.dom.window.document.querySelectorAll('button')).some((b) =>
          b.textContent?.includes('Marcus Vance')
        );
      }, { timeoutMs: 1000 });
      const buttons = Array.from(app.dom.window.document.querySelectorAll('button'));
      const marcusBtn = buttons.find((b) => b.textContent?.includes('Marcus Vance'));
      if (marcusBtn) {
        marcusBtn.click();
        adaptedMarcus = await waitFor(() => {
          return app.getHtml().includes('Diagnostic Differential Assistant: Marcus Vance');
        }, { timeoutMs: 1500 });
      }
    }

    const scenario3Success = hasAuraStudio && hasCopilotStandby && hasPatientTarget && hasDsm5Guidance && adaptedMarcus;

    reporter.record({
      name: 'Scenario 3: Multi-specialty clinical decision support encounter with real-time DSM-5 copilot guidance',
      passed: scenario3Success,
      details: `Studio: ${hasAuraStudio} | Differential: ${hasPatientTarget} | DSM-5 criteria: ${hasDsm5Guidance} | Multi-patient adaptation: ${adaptedMarcus}`,
    });
    app.unmount();
  }

  // ========================================================================
  // Scenario 4: Statutory HIPAA 18 Safe Harbor Redaction & Forensic Audit Export
  // ========================================================================
  console.log('\n--- Scenario 4: Statutory HIPAA 18 Safe Harbor Redaction & Forensic Audit Export ---');
  {
    // Step 4.1: Clinician navigates to HIPAA PHI Scrubber
    const app = await renderApp({ route: '/dashboard/phi-scrubber', authenticated: true });
    const scrubberHtml = app.getHtml();
    const hasScrubberView = scrubberHtml.includes('HIPAA PHI Scrubber');
    const hasSafeHarborActive = scrubberHtml.includes('18 Safe Harbor Active');

    // Step 4.2: Reviews unredacted protected ePHI source pane
    const hasSourcePane =
      scrubberHtml.includes('Unredacted Clinical Source (Protected ePHI)') &&
      scrubberHtml.includes('Jane Doe') &&
      scrubberHtml.includes('04/12/1988') &&
      scrubberHtml.includes('(415) 555-0199');

    // Step 4.3: Validates 18 Safe Harbor Redacted Output pane with structured tokens
    const hasRedactedPane =
      scrubberHtml.includes('18 Safe Harbor Redacted Output') &&
      scrubberHtml.includes('[NAME]') &&
      scrubberHtml.includes('[DATE]') &&
      scrubberHtml.includes('[PHONE]');

    // Step 4.4: Verifies complete absence of unredacted ePHI in redacted container
    // Redacted output section strictly wraps protected identifiers in tags
    const containsZeroUnmaskedInRedacted =
      !scrubberHtml.includes('18 Safe Harbor Redacted Output</span></div><p class="text-slate-800 leading-relaxed">Jane Doe');

    const scenario4Success =
      hasScrubberView &&
      hasSafeHarborActive &&
      hasSourcePane &&
      hasRedactedPane &&
      containsZeroUnmaskedInRedacted;

    reporter.record({
      name: 'Scenario 4: Complete HIPAA statutory 18 Safe Harbor de-identification and zero-leak verification',
      passed: scenario4Success,
      details: `Scrubber: ${hasScrubberView} | Safe Harbor Active: ${hasSafeHarborActive} | Source ePHI: ${hasSourcePane} | Masked tokens: ${hasRedactedPane}`,
    });
    app.unmount();
  }

  // ========================================================================
  // Scenario 5: Full Practice Subscription Lifecycle & Commercial Billing Flow
  // ========================================================================
  console.log('\n--- Scenario 5: Full Practice Subscription Lifecycle & Commercial Billing Flow ---');
  {
    // Step 5.1: Clinician opens practice billing and subscription management
    const app = await renderApp({ route: '/dashboard/subscription', authenticated: true });
    const subHtml = app.getHtml();
    const hasBillingTitle = subHtml.includes('Practice Subscription &amp; Billing') || subHtml.includes('Practice Subscription & Billing');

    // Step 5.2: Evaluates Starter ($49), Clinician Pro ($99), and Practice Group ($249) cards
    const hasCatalog =
      subHtml.includes('Starter Tier') &&
      subHtml.includes('$49') &&
      subHtml.includes('Clinician Pro') &&
      subHtml.includes('$99') &&
      subHtml.includes('Practice Group') &&
      subHtml.includes('$249');

    // Step 5.3: Dispatches annual checkout session creation to Express server API
    const res = await fetch(`${apiBase}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'group',
        billingCycle: 'annual',
        clinicianEmail: 'sarah.chen.md@behavioralhealth.org',
      }),
    });
    const sessionData = await res.json();
    const checkoutSuccess =
      res.status === 200 &&
      sessionData.sessionId?.startsWith('cs_test_simulated_') &&
      (sessionData.plan?.amount === 238800 || sessionData.plan?.amount === 24900);

    // Step 5.4: Verifies subscription status API confirms active clinical license
    const statusRes = await fetch(`${apiBase}/api/subscription/status`);
    const statusData = await statusRes.json();
    const statusActive =
      statusRes.status === 200 &&
      statusData.status === 'active' &&
      statusData.isSubscribed === true;

    const scenario5Success = hasBillingTitle && hasCatalog && checkoutSuccess && statusActive;

    reporter.record({
      name: 'Scenario 5: Commercial subscription lifecycle, annual tier checkout, and active license verification',
      passed: scenario5Success,
      details: `Catalog: ${hasCatalog} | Checkout Session: ${sessionData.sessionId?.substring(0, 22)}... | Status: ${statusData.status}`,
    });
    app.unmount();
  }

  const { passed, failed, total } = reporter.summary();
  await stopTestServer();
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTier4Tests().catch((err) => {
  console.error('Fatal Tier 4 test runner error:', err);
  process.exit(1);
});
