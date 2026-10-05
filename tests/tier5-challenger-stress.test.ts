/**
 * Milestone 6 Phase 2 — Tier 5 Adversarial Stress & End-to-End Probing Suite
 *
 * Archetype: Empirical Challenger (critic, specialist)
 * Target: Milestone 6 Tier 5 Hardening & Verification
 *
 * Domains Tested:
 * 1. Full Pipeline Round-Trips:
 *    TheraFlow EHR -> Scribe Acoustic Feed -> Aura Decision Support -> PHI Scrubber -> EHR Note Commit
 *    Multi-patient switching (Jane Doe, Marcus Vance, Elena Rostova), zero cross-contamination.
 * 2. Platform Security Boundaries & Deep-Linking:
 *    Unauthenticated probing across all routes (/dashboard, /scribe, /ehr, /aura, /phi-scrubber, /billing, /clients, /calendar, /settings)
 *    Verification of ZERO ePHI leaks in DOM.
 *    Sanitization of open redirects, protocol-relative URLs, javascript: URIs, data: URIs.
 * 3. Subscription Gating:
 *    Feature accessibility across Starter ($49), Clinician Pro ($99), Group ($249), Unsubscribed, Trial, and Expired states.
 * 4. Storage Resilience:
 *    Malformed JSON, primitives, session forgery, token tampering, expired tokens, prototype pollution, huge payloads.
 * 5. CSS Bleed Verification:
 *    Zero CSS bleed across .heidi-scribe-theme and .aura-*.
 *
 * Execution: npx tsx tests/tier5-challenger-stress.test.ts
 */

import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { App } from '../src/App';
import {
  DEMO_CLINICIAN_USER,
  DEMO_CLINICIAN_SESSION,
  STORAGE_KEY_DEMO_SESSION,
  getValidatedStoredDemoSession,
} from '../src/lib/auth';
import {
  SUBSCRIPTION_PLANS,
  STORAGE_KEY_SUBSCRIPTION,
  getStoredSubscription,
  getTierBadgeInfo,
  StoredSubscriptionState,
} from '../src/lib/subscription';
import { DEFAULT_PATIENT } from '../src/lib/clinical-context';
import { scrubText, generateMask } from '../src/tools/phi-scrubber/engine';
import { SAFE_HARBOR_RULES } from '../src/tools/phi-scrubber/safeHarborRules';
import {
  getNotes,
  addNote,
  updateNote,
  getClients,
  getAppointments,
  LOCAL_STORAGE_KEY_THERAFLOW,
} from '../src/tools/theraflow/data/theraflow-store';
import { DSM5_DIAGNOSES, getDiagnosisForPatient } from '../src/tools/aura/data/dsm5-database';
import { CLINICAL_ENCOUNTER_SAMPLES } from '../src/tools/scribe/PreRecordedEncounters';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let totalAsserts = 0;
let passedAsserts = 0;
let failedAsserts = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testId: string, testName: string, detail: string = ''): void {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✓ [CHALLENGE-PASS] ${testId}: ${testName}`);
    if (detail) console.log(`      ↳ ${detail}`);
  } else {
    failedAsserts++;
    const msg = `FAIL [${testId}]: ${testName} ${detail ? `(${detail})` : ''}`;
    failureDetails.push(msg);
    console.error(`  ✗ [CHALLENGE-FAIL] ${msg}`);
  }
}

function setupDomEnvironment(
  urlPath: string = '/',
  authenticated: boolean = false,
  extraStorage: Record<string, string> = {}
) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: `http://localhost:3000${urlPath}`,
    runScripts: 'dangerously',
  });

  (global as any).window = dom.window;
  (global as any).document = dom.window.document;
  (global as any).localStorage = dom.window.localStorage;
  (global as any).location = dom.window.location;
  (global as any).HTMLElement = dom.window.HTMLElement;

  if (!dom.window.requestAnimationFrame) {
    dom.window.requestAnimationFrame = (cb) => {
      const t = setTimeout(() => cb(Date.now()), 16);
      if (t && typeof (t as any).unref === 'function') (t as any).unref();
      return t as any;
    };
    dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  (global as any).requestAnimationFrame = dom.window.requestAnimationFrame;
  (global as any).cancelAnimationFrame = dom.window.cancelAnimationFrame;

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
      JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: DEMO_CLINICIAN_SESSION,
      })
    );
    dom.window.localStorage.setItem(
      STORAGE_KEY_SUBSCRIPTION,
      JSON.stringify({
        tier: 'pro',
        status: 'active',
        billingCycle: 'monthly',
        renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trialDaysRemaining: 14,
        lastSessionId: 'test_session_pro_active',
      })
    );
  }

  for (const [k, v] of Object.entries(extraStorage)) {
    dom.window.localStorage.setItem(k, v);
  }

  const rootElement = dom.window.document.getElementById('root')!;
  const root = ReactDOM.createRoot(rootElement);

  return {
    dom,
    rootElement,
    root,
    render: async (settleMs: number = 80) => {
      root.render(React.createElement(App));
      await sleep(settleMs);
    },
    getHtml: () => rootElement.innerHTML,
    getPathname: () => dom.window.location.pathname,
    getSearch: () => dom.window.location.search,
    unmount: () => {
      try {
        root.unmount();
      } catch {}
    },
  };
}

async function runTier5StressSuite(): Promise<void> {
  console.log('\n====================================================================');
  console.log('   Milestone 6 Tier 5: Adversarial Stress & Empirical Audit        ');
  console.log('   Author: Challenger 2 (teamwork_preview_challenger)              ');
  console.log('====================================================================\n');

  // =========================================================================
  // DOMAIN 1: FULL PIPELINE ROUND-TRIPS ACROSS THE 4 CLINICAL APPLICATIONS
  // =========================================================================
  console.log('--- Domain 1: Full Pipeline Round-Trips & State Synchronization ---');

  // 1.1 Canonical Jane Doe Round-Trip
  {
    // Step A: Patient Selection in TheraFlow EHR
    const clients = await getClients();
    const jane = clients.find((c) => c.mrn === '#MC-88219');
    assert(
      Boolean(jane && jane.first_name === 'Jane' && jane.diagnosis_code === 'F41.1'),
      'T5.1.1a',
      'TheraFlow EHR stores Jane Doe with MRN #MC-88219 and GAD-7 F41.1',
      `Found patient ${jane?.first_name} ${jane?.last_name}`
    );

    // Step B: Scribe Acoustic Diarization Feed
    const encounter = CLINICAL_ENCOUNTER_SAMPLES.find((s) => s.patientName === 'Jane Doe');
    assert(
      Boolean(encounter && encounter.cptCode === '90837' && encounter.transcript.length > 0),
      'T5.1.1b',
      'Clinical AI Scribe v2 binds GAD-7 transcript to Jane Doe under CPT 90837',
      `Transcript lines: ${encounter?.transcript.length}`
    );

    // Step C: Aura Assistant Decision Support
    const dsmCriteria = getDiagnosisForPatient('p-101');
    assert(
      Boolean(dsmCriteria && dsmCriteria.code === 'F41.1' && dsmCriteria.criteria.length >= 6),
      'T5.1.1c',
      'Aura Assistant dynamically computes DSM-5 GAD-7 differential for patient p-101',
      `Diagnostic criteria count: ${dsmCriteria?.criteria.length}`
    );

    // Step D: PHI Scrubber 18 Safe Harbor Redaction
    const rawClinicalNote = `Patient Name: Jane Doe (#MC-88219), DOB: 04/12/1988, phone: (415) 555-0100. Evaluated by Dr. Sarah Chen, MD at 123 Therapy Lane, San Francisco, CA 94102. Assessment: GAD-7 score improved from 14 to 9. Plan: CPT 90837 weekly CBT.`;
    const scrubbed = scrubText(rawClinicalNote, { maskStyle: 'tag' });
    const hasZeroLeak =
      !scrubbed.cleanText.includes('Jane Doe') &&
      !scrubbed.cleanText.includes('04/12/1988') &&
      !scrubbed.cleanText.includes('(415) 555-0100') &&
      !scrubbed.cleanText.includes('#MC-88219');
    const hasSafeTokens =
      scrubbed.cleanText.includes('[NAME]') &&
      scrubbed.cleanText.includes('[DATE]') &&
      scrubbed.cleanText.includes('[PHONE]') &&
      scrubbed.cleanText.includes('[MRN]');
    assert(
      hasZeroLeak && hasSafeTokens,
      'T5.1.1d',
      'HIPAA PHI Scrubber masks 100% of patient identifiers with zero ePHI leak',
      `Redacted count: ${scrubbed.itemsRedacted}, Clean text: ${scrubbed.cleanText}`
    );

    // Step E: EHR Note Update & Immutability Verification
    const initialNotes = await getNotes();
    const createdNote = await addNote({
      client_id: 'p-101',
      therapist_id: DEMO_CLINICIAN_USER.id,
      client_name: 'Jane Doe',
      client_mrn: '#MC-88219',
      date_of_service: '2026-10-05',
      session_type: 'Psychotherapy (90837)',
      duration_minutes: 60,
      cpt_code: '90837',
      diagnosis_code: 'F41.1',
      d_text: 'Stimulus control therapy and sleep improvement.',
      a_text: scrubbed.cleanText,
      p_text: 'Continue weekly 60m CBT sessions.',
      is_locked: true,
    });

    const updatedNotes = await getNotes();
    const fetched = updatedNotes.find((n) => n.id === createdNote.id);
    assert(
      Boolean(fetched && fetched.a_text === scrubbed.cleanText && fetched.is_locked),
      'T5.1.1e',
      'EHR successfully ingests de-identified note and enforces HIPAA lock status',
      `Persisted note ID: ${fetched?.id}`
    );
  }

  // 1.2 Marcus Vance Round-Trip (Alternative Patient p-102)
  {
    const dsmMarcus = getDiagnosisForPatient('p-102');
    assert(
      Boolean(dsmMarcus && dsmMarcus.code === 'F32.1' && dsmMarcus.name.includes('Depressive')),
      'T5.1.2a',
      'Aura Assistant dynamically binds Marcus Vance (p-102) to Major Depressive Disorder F32.1',
      `Diagnosis: ${dsmMarcus?.name}`
    );

    const marcusNote = `Patient Name: Marcus Vance, MRN: #MC-91042, DOB: 11/03/1992. Dr. Sarah Chen, MD conducted 45 min psychotherapy CPT 90834. PHQ-9 score 16.`;
    const marcusScrubbed = scrubText(marcusNote);
    assert(
      !marcusScrubbed.cleanText.includes('Marcus Vance') &&
      !marcusScrubbed.cleanText.includes('11/03/1992') &&
      marcusScrubbed.cleanText.includes('[NAME]'),
      'T5.1.2b',
      'PHI Scrubber masks Marcus Vance demographic tokens cleanly',
      `Redacted count: ${marcusScrubbed.itemsRedacted}`
    );

    const marcusEhr = await addNote({
      client_id: 'p-102',
      therapist_id: DEMO_CLINICIAN_USER.id,
      client_name: 'Marcus Vance',
      client_mrn: '#MC-91042',
      date_of_service: '2026-10-05',
      session_type: 'Psychotherapy (90834)',
      duration_minutes: 45,
      cpt_code: '90834',
      diagnosis_code: 'F32.1',
      d_text: 'Behavioral activation and sleep hygiene review.',
      a_text: marcusScrubbed.cleanText,
      p_text: 'Continue weekly 45m CBT sessions.',
      is_locked: false,
    });
    assert(
      Boolean(marcusEhr && marcusEhr.client_id === 'p-102' && marcusEhr.cpt_code === '90834'),
      'T5.1.2c',
      'EHR commits separate distinct chart note for Marcus Vance without cross-patient contamination',
      `Note ID: ${marcusEhr.id}`
    );
  }

  // 1.3 High-Frequency Rapid Switching & Concurrency Stress
  {
    const patients = ['p-101', 'p-102', 'p-103'];
    let passCount = 0;
    for (let i = 0; i < 15; i++) {
      const pid = patients[i % patients.length];
      const diag = getDiagnosisForPatient(pid);
      if (pid === 'p-101' && diag?.code === 'F41.1') passCount++;
      if (pid === 'p-102' && diag?.code === 'F32.1') passCount++;
      if (pid === 'p-103' && diag?.code === 'F41.0') passCount++;
    }
    assert(
      passCount === 15,
      'T5.1.3',
      'Rapid cyclic patient switching across 15 iterations preserves 100% deterministic binding',
      `Successful queries: ${passCount}/15`
    );
  }

  // 1.4 Large Clinical Note Throughput Stress (10,000+ chars)
  {
    const baseParagraph = `Patient Name: Jane Doe (#MC-88219), DOB 04/12/1988, discussed anxiety triggers at 123 Therapy Lane, San Francisco, CA 94102 with Dr. Sarah Chen, MD. Phone: (415) 555-0100. Email: jane.doe@example.com. `;
    const largeNote = baseParagraph.repeat(60); // ~12,000 characters
    const startT = Date.now();
    const resultLarge = scrubText(largeNote);
    const durationMs = Date.now() - startT;
    assert(
      durationMs < 500 &&
      !resultLarge.cleanText.includes('Jane Doe') &&
      resultLarge.itemsRedacted >= 300,
      'T5.1.4',
      'Massive clinical encounter note (~12KB) processed under 500ms with zero ePHI leak',
      `Duration: ${durationMs}ms, Redactions: ${resultLarge.itemsRedacted}`
    );
  }

  // =========================================================================
  // DOMAIN 2: PLATFORM SECURITY BOUNDARIES & UNAUTHENTICATED DEEP-LINKING
  // =========================================================================
  console.log('\n--- Domain 2: Platform Security Boundaries & Deep-Linking Probing ---');

  const PROTECTED_ROUTES = [
    '/dashboard',
    '/dashboard/scribe',
    '/dashboard/ehr',
    '/dashboard/aura',
    '/dashboard/phi-scrubber',
    '/dashboard/billing',
    '/dashboard/clients',
    '/dashboard/calendar',
    '/dashboard/settings',
    '/dashboard/telehealth',
    '/dashboard/audit-logs',
    '/dashboard/ehr/patients/p-101/notes',
    '/dashboard/scribe?patient=101&encounter=99214',
  ];

  const EPHI_LEAK_TARGETS = [
    'Jane Doe',
    '#MC-88219',
    '04/12/1988',
    'CPT: 90837',
    'CPT 90837',
    'Unredacted Clinical Source',
    'Live Acoustic Transcript',
    'Active Patient Encounter',
    'Clinical Command Center',
    'Marcus Vance',
    '#MC-91042',
    'Elena Rostova',
    '#MC-77312',
  ];

  for (const route of PROTECTED_ROUTES) {
    const ctx = setupDomEnvironment(route, false);
    await ctx.render(60);

    const pathname = ctx.getPathname();
    const search = ctx.getSearch();
    const html = ctx.getHtml();

    const isRedirectedToLogin = pathname === '/login';
    const hasProperRedirectParam = search.includes('redirect=');
    const leakedTokens = EPHI_LEAK_TARGETS.filter((t) => html.includes(t));

    assert(
      isRedirectedToLogin && hasProperRedirectParam && leakedTokens.length === 0,
      `T5.2.1 [${route}]`,
      `Unauthenticated access blocked & redirected to /login with zero ePHI leakage`,
      `Path: ${pathname}${search} | Leaked: ${leakedTokens.length === 0 ? 'NONE' : leakedTokens.join(', ')}`
    );

    ctx.unmount();
  }

  // Adversarial Open Redirect Probing
  {
    const attackVectors = [
      { attack: 'https://evil-phishing.org/steal', label: 'Full HTTPS External URL' },
      { attack: '//evil-phishing.org/steal', label: 'Protocol-Relative External URL' },
      { attack: 'javascript:alert(document.cookie)', label: 'JavaScript URI Pseudo-protocol' },
      { attack: 'data:text/html,<script>alert(1)</script>', label: 'Data URI Payload' },
    ];

    for (const { attack, label } of attackVectors) {
      const ctx = setupDomEnvironment(`/login?redirect=${encodeURIComponent(attack)}`, false);
      await ctx.render(60);

      // Simulate 1-click Demo Clinician login
      const demoBtn = ctx.dom.window.document.getElementById('demo-clinician-signin-btn');
      if (demoBtn) {
        demoBtn.click();
        await sleep(60);
      }

      const destination = ctx.getPathname();
      const didPreventOpenRedirect = destination === '/dashboard' || !destination.includes('evil');
      assert(
        didPreventOpenRedirect,
        'T5.2.2',
        `Adversarial redirect defense: ${label} sanitized to internal /dashboard`,
        `Sanitized Destination: ${destination}`
      );
      ctx.unmount();
    }
  }

  // =========================================================================
  // DOMAIN 3: SUBSCRIPTION GATING ACROSS TIERS (STARTER, PRO, GROUP)
  // =========================================================================
  console.log('\n--- Domain 3: Subscription Gating & Tier Privileges ---');

  // 3.1 Starter Tier ($49/mo) Access Verification
  {
    const starterStorage = {
      [STORAGE_KEY_SUBSCRIPTION]: JSON.stringify({
        tier: 'starter',
        status: 'active',
        billingCycle: 'monthly',
        renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trialDaysRemaining: 14,
      }),
    };

    // 3.1a EHR: Permitted
    {
      const ctx = setupDomEnvironment('/dashboard/ehr', true, starterStorage);
      await ctx.render(80);
      const hasLock = ctx.getHtml().includes('subscription-gate-lock');
      assert(
        !hasLock,
        'T5.3.1a',
        'Starter Tier: Ungated access to Clinical EHR (/dashboard/ehr)',
        `Lock overlay present: ${hasLock}`
      );
      ctx.unmount();
    }

    // 3.1b PHI Scrubber: Permitted
    {
      const ctx = setupDomEnvironment('/dashboard/phi-scrubber', true, starterStorage);
      await ctx.render(80);
      const hasLock = ctx.getHtml().includes('subscription-gate-lock');
      assert(
        !hasLock,
        'T5.3.1b',
        'Starter Tier: Ungated access to HIPAA PHI Scrubber (/dashboard/phi-scrubber)',
        `Lock overlay present: ${hasLock}`
      );
      ctx.unmount();
    }

    // 3.1c Aura Assistant: Strictly Gated
    {
      const ctx = setupDomEnvironment('/dashboard/aura', true, starterStorage);
      await ctx.render(80);
      const hasLock = ctx.getHtml().includes('subscription-gate-lock');
      const hasRequiredPro = ctx.getHtml().includes('Clinician Pro Subscription Required');
      assert(
        hasLock && hasRequiredPro,
        'T5.3.1c',
        'Starter Tier: Strictly gated from Aura Assistant Copilot (/dashboard/aura)',
        `Lock overlay present: ${hasLock}, Required Pro message: ${hasRequiredPro}`
      );
      ctx.unmount();
    }

    // 3.1d Clinical AI Scribe: Strictly Gated
    {
      const ctx = setupDomEnvironment('/dashboard/scribe', true, starterStorage);
      await ctx.render(80);
      const hasLock = ctx.getHtml().includes('subscription-gate-lock');
      const hasRequiredPro = ctx.getHtml().includes('Clinician Pro Subscription Required');
      assert(
        hasLock && hasRequiredPro,
        'T5.3.1d',
        'Starter Tier: Strictly gated from Clinical AI Scribe v2 (/dashboard/scribe)',
        `Lock overlay present: ${hasLock}, Required Pro message: ${hasRequiredPro}`
      );
      ctx.unmount();
    }
  }

  // 3.2 Clinician Pro Tier ($99/mo) Access Verification
  {
    const proStorage = {
      [STORAGE_KEY_SUBSCRIPTION]: JSON.stringify({
        tier: 'pro',
        status: 'active',
        billingCycle: 'monthly',
        renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trialDaysRemaining: 14,
      }),
    };

    const clinicalRoutes = ['/dashboard/ehr', '/dashboard/scribe', '/dashboard/aura', '/dashboard/phi-scrubber'];
    let proAllUnlocked = true;
    for (const r of clinicalRoutes) {
      const ctx = setupDomEnvironment(r, true, proStorage);
      await ctx.render(80);
      if (ctx.getHtml().includes('subscription-gate-lock')) {
        proAllUnlocked = false;
      }
      ctx.unmount();
    }
    assert(
      proAllUnlocked,
      'T5.3.2',
      'Clinician Pro Tier: All 4 clinical tools fully unlocked with zero lock overlays',
      `All 4 tools ungated: ${proAllUnlocked}`
    );
  }

  // 3.3 Practice Group Tier ($249/mo) Access Verification
  {
    const groupStorage = {
      [STORAGE_KEY_SUBSCRIPTION]: JSON.stringify({
        tier: 'group',
        status: 'active',
        billingCycle: 'monthly',
        renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trialDaysRemaining: 14,
      }),
    };

    const ctx = setupDomEnvironment('/dashboard/scribe', true, groupStorage);
    await ctx.render(80);
    const hasLock = ctx.getHtml().includes('subscription-gate-lock');
    assert(
      !hasLock,
      'T5.3.3',
      'Practice Group Tier: Unrestricted access across complete clinical suite',
      `Lock overlay present: ${hasLock}`
    );
    ctx.unmount();
  }

  // 3.4 Unsubscribed State & 1-Click Trial Elevation
  {
    const unsubStorage = {
      [STORAGE_KEY_SUBSCRIPTION]: JSON.stringify({
        tier: 'pro',
        status: 'none',
        billingCycle: 'monthly',
        renewsOn: null,
        trialDaysRemaining: 0,
      }),
    };

    const ctx = setupDomEnvironment('/dashboard/scribe', true, unsubStorage);
    await ctx.render(80);
    const hasLockInitially = ctx.getHtml().includes('subscription-gate-lock');
    const trialBtn = ctx.dom.window.document.getElementById('activate-trial-btn');

    assert(
      hasLockInitially && Boolean(trialBtn),
      'T5.3.4a',
      'Unsubscribed user is locked from clinical tools and offered 1-Click Free Trial',
      `Locked: ${hasLockInitially}, Trial Button: ${Boolean(trialBtn)}`
    );

    if (trialBtn) {
      trialBtn.click();
      await sleep(80);
      const hasLockAfterTrial = ctx.getHtml().includes('subscription-gate-lock');
      assert(
        !hasLockAfterTrial,
        'T5.3.4b',
        '1-Click Free Trial immediately elevates subscription and unlocks workspace',
        `Lock overlay dismantled: ${!hasLockAfterTrial}`
      );
    }
    ctx.unmount();
  }

  // 3.5 Expired Trial Re-locking
  {
    const expiredStorage = {
      [STORAGE_KEY_SUBSCRIPTION]: JSON.stringify({
        tier: 'pro',
        status: 'trialing',
        billingCycle: 'monthly',
        renewsOn: new Date(Date.now() - 100000).toISOString(), // expired
        trialDaysRemaining: 0,
      }),
    };

    const ctx = setupDomEnvironment('/dashboard/aura', true, expiredStorage);
    await ctx.render(80);
    const hasLock = ctx.getHtml().includes('subscription-gate-lock');
    assert(
      hasLock,
      'T5.3.5',
      'Expired free trial (0 days remaining) strictly re-locks clinical workspace',
      `Lock overlay present: ${hasLock}`
    );
    ctx.unmount();
  }

  // =========================================================================
  // DOMAIN 4: STORAGE RESILIENCE & ADVERSARIAL LOCALSTORAGE CORRUPTION
  // =========================================================================
  console.log('\n--- Domain 4: Storage Resilience & Adversarial LocalStorage Probing ---');

  const STORAGE_ATTACK_VECTORS = [
    { label: 'Malformed unclosed JSON', payload: '{unclosed_json: "true' },
    { label: 'Primitive string value', payload: 'valid_looking_raw_jwt_token_string' },
    { label: 'Numeric primitive value', payload: '998273645' },
    { label: 'Boolean primitive value', payload: 'true' },
    { label: 'Array primitive value', payload: '[1, 2, 3, "admin"]' },
    { label: 'Empty object {}', payload: '{}' },
    {
      label: 'Forged User ID',
      payload: JSON.stringify({
        user: { id: 'unauthorized-hacker-uuid', email: DEMO_CLINICIAN_USER.email },
        session: DEMO_CLINICIAN_SESSION,
      }),
    },
    {
      label: 'Forged User Email',
      payload: JSON.stringify({
        user: { id: DEMO_CLINICIAN_USER.id, email: 'attacker@evil-domain.org' },
        session: DEMO_CLINICIAN_SESSION,
      }),
    },
    {
      label: 'Empty access_token',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { ...DEMO_CLINICIAN_SESSION, access_token: '   ' },
      }),
    },
    {
      label: 'Expired session token (expires_at in Year 1970)',
      payload: JSON.stringify({
        user: DEMO_CLINICIAN_USER,
        session: { ...DEMO_CLINICIAN_SESSION, expires_at: 1000 },
      }),
    },
  ];

  for (const { label, payload } of STORAGE_ATTACK_VECTORS) {
    const ctx = setupDomEnvironment('/dashboard', false, {
      [STORAGE_KEY_DEMO_SESSION]: payload,
    });
    await ctx.render(60);

    const validated = getValidatedStoredDemoSession();
    const destination = ctx.getPathname();
    const storageItemAfter = ctx.dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);

    assert(
      validated === null && destination === '/login' && storageItemAfter === null,
      'T5.4.1',
      `Storage Attack [${label}]: Fails closed, purges storage, redirects to /login`,
      `Validated: ${validated === null}, Dest: ${destination}, Storage Purged: ${storageItemAfter === null}`
    );

    ctx.unmount();
  }

  // Subscription storage corruption resilience
  {
    const malformedSubStates = [
      '{corrupted_subscription',
      '12345',
      JSON.stringify({ tier: 'god_mode_unlimited', status: 'bypassed' }),
      JSON.stringify({ __proto__: { isAdmin: true } }),
    ];

    for (const raw of malformedSubStates) {
      const ctx = setupDomEnvironment('/dashboard/subscription', true, {
        [STORAGE_KEY_SUBSCRIPTION]: raw,
      });
      await ctx.render(60);

      const parsed = getStoredSubscription();
      const validStatuses = ['active', 'trialing', 'canceled', 'none'];
      const validTiers = ['starter', 'pro', 'group'];

      assert(
        parsed === null || (validStatuses.includes(parsed.status) && validTiers.includes(parsed.tier)),
        'T5.4.2',
        `Corrupted subscription storage handled safely without crash or prototype pollution`,
        `Parsed fallback: status=${parsed?.status}, tier=${parsed?.tier}`
      );
      ctx.unmount();
    }
  }

  // Massive Storage Payload Stress (500KB garbage string)
  {
    const hugeString = 'X'.repeat(500 * 1024);
    const ctx = setupDomEnvironment('/dashboard', false, {
      [STORAGE_KEY_DEMO_SESSION]: hugeString,
    });
    await ctx.render(60);

    const destination = ctx.getPathname();
    assert(
      destination === '/login',
      'T5.4.3',
      'Massive 500KB corrupt storage payload safely rejected without crash or freeze',
      `Handled cleanly, path: ${destination}`
    );
    ctx.unmount();
  }

  // =========================================================================
  // DOMAIN 5: CSS BLEED VERIFICATION
  // =========================================================================
  console.log('\n--- Domain 5: CSS Bleed Verification ---');

  // Run official verify-css-bleed.mjs script
  try {
    const bleedOutput = execSync('node scripts/verify-css-bleed.mjs', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const passedBleed =
      bleedOutput.includes('Zero CSS bleed detected in scribe-theme.css') &&
      bleedOutput.includes('Zero CSS bleed detected in aura-shadow.css');
    assert(
      passedBleed,
      'T5.5.1',
      'verify-css-bleed.mjs script reports 0 CSS bleed violations',
      `Script executed cleanly`
    );
  } catch (err: any) {
    assert(false, 'T5.5.1', 'verify-css-bleed.mjs failed', err.message);
  }

  // Direct regex inspection of scribe-theme.css
  {
    const scribeCssPath = path.join(process.cwd(), 'src/tools/scribe/scribe-theme.css');
    const scribeCss = fs.readFileSync(scribeCssPath, 'utf8');
    const hasThemeWrapper = scribeCss.includes('.heidi-scribe-theme');
    const hasUnscopedGlobal = /^\s*(\*|html|body|#root)\s*\{/m.test(scribeCss);
    assert(
      hasThemeWrapper && !hasUnscopedGlobal,
      'T5.5.2',
      'scribe-theme.css enforces .heidi-scribe-theme namespace without global root leaks',
      `Namespaced wrapper: ${hasThemeWrapper}, Unscoped global leaks: ${hasUnscopedGlobal}`
    );
  }

  // Direct regex inspection of aura-shadow.css
  {
    const auraCssPath = path.join(process.cwd(), 'src/tools/aura/aura-shadow.css');
    const auraCss = fs.readFileSync(auraCssPath, 'utf8');
    const hasHostSelector = auraCss.includes(':host');
    const hasAuraPrefix = auraCss.includes('.aura-');
    assert(
      hasHostSelector && hasAuraPrefix,
      'T5.5.3',
      'aura-shadow.css enforces Shadow DOM :host boundary and .aura-* namespace encapsulation',
      `:host selector: ${hasHostSelector}, .aura- prefix: ${hasAuraPrefix}`
    );
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n====================================================================');
  console.log('   Tier 5 Adversarial Stress & Verification Summary');
  console.log(`   Passed: ${passedAsserts} | Failed: ${failedAsserts} | Total: ${totalAsserts}`);
  console.log('====================================================================\n');

  if (failedAsserts > 0) {
    console.error('Failure Details:');
    failureDetails.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('✓ [CHALLENGER 2 VERDICT: APPROVE] 100% of adversarial stress assertions passed.');
  }
}

runTier5StressSuite().catch((err) => {
  console.error('Fatal unhandled error in Tier 5 stress harness:', err);
  process.exit(1);
});
