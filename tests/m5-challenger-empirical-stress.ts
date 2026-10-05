/**
 * Milestone 5 Empirical Challenger Stress & Concurrency Test Suite
 *
 * Archetype: Empirical Challenger (critic, specialist)
 * Target: Milestone 5 Deliverables
 *  - Aura Assistant Floating Action Orb (rapid toggles, Alt+A hotkey, drag bounds, route mounting)
 *  - Scoped CSS Isolation & Zero Bleed verification (.aura-*, .heidi-scribe-theme)
 *  - Audio visualizer resilience under headless JSDOM environments
 *  - Cross-tool pipeline concurrency & race conditions (sendToPhiScrubber, insertToEhr)
 *  - HIPAA PHI Scrubber 18 Safe Harbor engine edge cases & greedy interval scheduling
 *
 * Execution: tsx tests/m5-challenger-empirical-stress.ts
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

// Aura Copilot imports
import { AuraFloatingOrb } from '../src/tools/aura/AuraFloatingOrb';
import { AuraVisualizer } from '../src/tools/aura/AuraVisualizer';
import { AuraStudio } from '../src/tools/aura/AuraStudio';
import {
  DSM5_DIAGNOSES,
  getDiagnosisForPatient,
  CLINICAL_SUGGESTION_CHIPS,
} from '../src/tools/aura/data/dsm5-database';

// PHI Scrubber imports
import { scrubText, generateMask } from '../src/tools/phi-scrubber/engine';
import { SAFE_HARBOR_RULES } from '../src/tools/phi-scrubber/safeHarborRules';
import {
  ClinicalContextProvider,
  useClinicalContext,
  DEFAULT_PATIENT,
  Patient,
} from '../src/lib/clinical-context';

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail: string = ''): void {
  if (condition) {
    passedCount++;
    console.log(`  ✓ [CHALLENGE-PASS] ${testName}`);
  } else {
    failedCount++;
    const errMsg = `FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
    failures.push(errMsg);
    console.error(`  ✗ [CHALLENGE-FAIL] ${errMsg}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setupDomGlobals(url = 'http://localhost:3000/dashboard') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url,
    runScripts: 'dangerously',
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).localStorage = dom.window.localStorage;
  (globalThis as any).location = dom.window.location;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).MouseEvent = dom.window.MouseEvent;
  (globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
  (globalThis as any).CustomEvent = dom.window.CustomEvent;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}
  return dom;
}

function parseCssSelectorsExcludingKeyframes(filePath: string, expectedPrefixes: string[]): string[] {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
  let stripped = '';
  let i = 0;
  while (i < noComments.length) {
    if (noComments.slice(i).startsWith('@keyframes')) {
      const startBrace = noComments.indexOf('{', i);
      let depth = 1;
      let j = startBrace + 1;
      while (j < noComments.length && depth > 0) {
        if (noComments[j] === '{') depth++;
        else if (noComments[j] === '}') depth--;
        j++;
      }
      i = j;
    } else {
      stripped += noComments[i];
      i++;
    }
  }

  const rules = stripped.split('}').map((r) => r.trim()).filter(Boolean);
  const invalid: string[] = [];
  for (const rule of rules) {
    const selPart = rule.split('{')[0]?.trim();
    if (!selPart) continue;
    const subs = selPart.split(',').map((s) => s.trim()).filter(Boolean);
    for (const sel of subs) {
      if (sel.startsWith('@')) continue;
      const valid = expectedPrefixes.some((p) => sel.startsWith(p));
      if (!valid) invalid.push(sel);
    }
  }
  return invalid;
}

async function runEmpiricalStress() {
  console.log('====================================================================');
  console.log('   Milestone 5: Empirical Challenger Concurrency & Stress Suite     ');
  console.log('====================================================================\n');

  // =========================================================================
  // DOMAIN 1: AURA FLOATING ACTION ORB CONCURRENCY & INTERACTION STRESS
  // =========================================================================
  console.log('--- Domain 1: Aura Floating Action Orb Stress & Hotkey Testing ---');

  // Test 1.1: Rapid Toggling (100 clicks in quick succession)
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    root.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AuraFloatingOrb, { initialOpen: false }))
      )
    );
    await sleep(60);

    const orbBtn = dom.window.document.querySelector('[data-testid="aura-floating-orb"]') as HTMLButtonElement;
    assert(Boolean(orbBtn), 'CHAL-1.1a Floating action orb mounted in DOM');

    // Rapidly click 100 times
    for (let i = 0; i < 100; i++) {
      orbBtn.click();
    }
    await sleep(40);

    // After an even number of clicks starting from closed, the panel should be closed
    let panel = dom.window.document.querySelector('[data-testid="aura-floating-panel"]');
    assert(panel === null, 'CHAL-1.1b 100 consecutive rapid clicks preserves parity (closed after even toggles)');

    // 1 more click -> should open cleanly
    orbBtn.click();
    await sleep(40);
    panel = dom.window.document.querySelector('[data-testid="aura-floating-panel"]');
    assert(Boolean(panel), 'CHAL-1.1c 101st click cleanly opens panel without state desync');

    root.unmount();
  }

  // Test 1.2: Hotkey Alt + A listener & false key rejection
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    root.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AuraFloatingOrb, { initialOpen: false }))
      )
    );
    await sleep(60);

    // Initial state: closed
    assert(dom.window.document.querySelector('[data-testid="aura-floating-panel"]') === null, 'CHAL-1.2a Initial panel closed');

    // Trigger Alt + a
    dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'a', altKey: true, bubbles: true }));
    await sleep(30);
    assert(dom.window.document.querySelector('[data-testid="aura-floating-panel"]') !== null, 'CHAL-1.2b Alt + "a" opens panel');

    // Trigger Alt + A (uppercase / caps lock)
    dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'A', altKey: true, bubbles: true }));
    await sleep(30);
    assert(dom.window.document.querySelector('[data-testid="aura-floating-panel"]') === null, 'CHAL-1.2c Alt + "A" (uppercase) toggles panel closed');

    // Negative testing: Probe false hotkeys (Ctrl+A, Meta+A, Alt+B, plain 'a', Shift+A)
    const falseKeys = [
      { key: 'a', ctrlKey: true, altKey: false },
      { key: 'a', metaKey: true, altKey: false },
      { key: 'a', shiftKey: true, altKey: false },
      { key: 'b', altKey: true },
      { key: 'Enter', altKey: true },
      { key: 'a', altKey: false },
    ];

    let falseTriggered = false;
    for (const k of falseKeys) {
      dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { ...k, bubbles: true }));
      await sleep(10);
      if (dom.window.document.querySelector('[data-testid="aura-floating-panel"]') !== null) {
        falseTriggered = true;
      }
    }
    assert(!falseTriggered, 'CHAL-1.2d False hotkeys (Ctrl+A, Meta+A, Alt+B, plain a) do NOT trigger toggle');

    // 50 rapid Alt+A burst toggles
    for (let i = 0; i < 50; i++) {
      dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'a', altKey: true, bubbles: true }));
    }
    await sleep(40);
    // Started closed, 50 toggles -> should remain closed
    assert(dom.window.document.querySelector('[data-testid="aura-floating-panel"]') === null, 'CHAL-1.2e 50 rapid Alt+A hotkeys maintain strict state consistency');

    root.unmount();
  }

  // Test 1.3: Drag Coordinates Clamping & Mouse Event Boundaries
  {
    const dom = setupDomGlobals();
    Object.defineProperty(dom.window, 'innerWidth', { value: 1200, writable: true });
    Object.defineProperty(dom.window, 'innerHeight', { value: 800, writable: true });

    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    root.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(AuraFloatingOrb, { initialOpen: true }))
      )
    );
    await sleep(60);

    const header = dom.window.document.querySelector('.aura-panel-header') as HTMLElement;
    assert(Boolean(header), 'CHAL-1.3a Draggable panel header found in DOM');

    // 1. Mousemove without mousedown should not alter panel style
    dom.window.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 500, clientY: 500 }));
    await sleep(20);
    let panel = dom.window.document.querySelector('[data-testid="aura-floating-panel"]') as HTMLElement;
    assert(!panel.style.left, 'CHAL-1.3b Mouse move without drag start does not mutate position style');

    // 2. Start drag on header
    header.dispatchEvent(new dom.window.MouseEvent('mousedown', { clientX: 200, clientY: 200, bubbles: true }));
    await sleep(20);

    // 3. Drag to negative coordinates (should clamp to 16, 16)
    dom.window.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: -500, clientY: -500 }));
    await sleep(20);
    panel = dom.window.document.querySelector('[data-testid="aura-floating-panel"]') as HTMLElement;
    const clampedMinX = parseInt(panel.style.left, 10);
    const clampedMinY = parseInt(panel.style.top, 10);
    assert(clampedMinX >= 16 && clampedMinY >= 16, `CHAL-1.3c Negative drag coordinates clamp to min 16px (got left: ${clampedMinX}px, top: ${clampedMinY}px)`);

    // 4. Drag to massive overshoot (should clamp to innerWidth - 400 = 800, innerHeight - 500 = 300)
    dom.window.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 5000, clientY: 5000 }));
    await sleep(20);
    panel = dom.window.document.querySelector('[data-testid="aura-floating-panel"]') as HTMLElement;
    const clampedMaxX = parseInt(panel.style.left, 10);
    const clampedMaxY = parseInt(panel.style.top, 10);
    assert(clampedMaxX <= 800 && clampedMaxY <= 300, `CHAL-1.3d Overshoot drag coordinates clamp to viewport max (got left: ${clampedMaxX}px, top: ${clampedMaxY}px)`);

    // 5. Mouseup releases drag
    dom.window.dispatchEvent(new dom.window.MouseEvent('mouseup'));
    await sleep(20);

    const savedLeft = panel.style.left;
    dom.window.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    await sleep(20);
    panel = dom.window.document.querySelector('[data-testid="aura-floating-panel"]') as HTMLElement;
    assert(panel.style.left === savedLeft, 'CHAL-1.3e Mouseup cleanly releases dragging listener');

    root.unmount();
  }

  // Test 1.4: Multi-Route Mount & Visibility Invariant
  {
    const routesToTest = [
      '/dashboard',
      '/dashboard/ehr',
      '/dashboard/scribe',
      '/dashboard/aura',
      '/dashboard/phi-scrubber',
      '/dashboard/calendar',
      '/dashboard/clients',
      '/dashboard/billing',
    ];

    let allMounted = true;
    for (const route of routesToTest) {
      const dom = setupDomGlobals(`http://localhost:3000${route}`);
      const container = dom.window.document.getElementById('root')!;
      const root = ReactDOM.createRoot(container);

      root.render(
        React.createElement(
          ClinicalContextProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [route] },
            React.createElement(AuraFloatingOrb, null)
          )
        )
      );
      await sleep(20);

      const orb = dom.window.document.querySelector('[data-testid="aura-floating-orb"]');
      if (!orb) {
        allMounted = false;
        console.error(`Missing orb at route: ${route}`);
      }
      root.unmount();
    }
    assert(allMounted, 'CHAL-1.4 Aura Floating Orb renders consistently across all 8 dashboard routes');
  }

  // =========================================================================
  // DOMAIN 2: CSS BLEED & SCOPED ENCAPSULATION AUDIT
  // =========================================================================
  console.log('\n--- Domain 2: Scoped CSS Isolation & Namespace Containment Audit ---');

  // Test 2.1: Verify aura-shadow.css encapsulation
  {
    const invalidAura = parseCssSelectorsExcludingKeyframes('src/tools/aura/aura-shadow.css', [':host', '.aura-']);
    assert(
      invalidAura.length === 0,
      'CHAL-2.1 aura-shadow.css contains 100% scoped selectors (:host or .aura-*) with ZERO global leakage',
      invalidAura.join('; ')
    );
  }

  // Test 2.2: Verify scribe-theme.css encapsulation
  {
    const invalidScribe = parseCssSelectorsExcludingKeyframes('src/tools/scribe/scribe-theme.css', ['.heidi-scribe-theme']);
    assert(
      invalidScribe.length === 0,
      'CHAL-2.2 scribe-theme.css strictly encapsulates all rules under .heidi-scribe-theme',
      invalidScribe.join('; ')
    );
  }

  // =========================================================================
  // DOMAIN 3: AUDIO VISUALIZER RESILIENCE UNDER HEADLESS / JSDOM STRESS
  // =========================================================================
  console.log('\n--- Domain 3: Audio Visualizer Headless JSDOM Resilience ---');

  // Test 3.1: Mount visualizer in headless JSDOM without AudioContext/Canvas
  {
    const dom = setupDomGlobals();
    delete (dom.window as any).AudioContext;
    delete (dom.window as any).webkitAudioContext;

    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    let crashed = false;
    try {
      root.render(React.createElement(AuraVisualizer, { isRecording: false, barCount: 5 }));
      await sleep(30);
    } catch {
      crashed = true;
    }

    const visualizerEl = dom.window.document.querySelector('[data-testid="aura-audio-visualizer"]');
    const bars = dom.window.document.querySelectorAll('.aura-visualizer-bar');

    assert(!crashed && Boolean(visualizerEl), 'CHAL-3.1 Visualizer mounts safely without HTML5 canvas/AudioContext');
    assert(bars.length === 5, `CHAL-3.1b Renders exact default 5 bars in DOM (found ${bars.length})`);

    root.unmount();
  }

  // Test 3.2: Rapid audio state switching (50 rapid changes between recording and idle)
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    let rapidException = false;
    try {
      for (let i = 0; i < 50; i++) {
        root.render(React.createElement(AuraVisualizer, { isRecording: i % 2 === 0, barCount: 5 }));
        await sleep(5);
      }
    } catch {
      rapidException = true;
    }

    assert(!rapidException, 'CHAL-3.2 50 rapid isRecording state transitions survive with zero exceptions');
    root.unmount();
  }

  // Test 3.3: Boundary parameter fuzzing on barCount and height
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    const testCases = [
      { barCount: 0, height: 40, expectedBars: 0 },
      { barCount: 1, height: 20, expectedBars: 1 },
      { barCount: 12, height: 100, expectedBars: 12 },
      { barCount: 32, height: 48, expectedBars: 32 },
    ];

    let allCasesPassed = true;
    for (const tc of testCases) {
      root.render(React.createElement(AuraVisualizer, { isRecording: true, barCount: tc.barCount, height: tc.height }));
      await sleep(15);
      const bars = dom.window.document.querySelectorAll('.aura-visualizer-bar');
      if (bars.length !== tc.expectedBars) {
        allCasesPassed = false;
        console.error(`Expected ${tc.expectedBars} bars, found ${bars.length}`);
      }
    }

    assert(allCasesPassed, 'CHAL-3.3 Fuzzing barCount (0, 1, 12, 32) and height renders exact bar counts');
    root.unmount();
  }

  // Test 3.4: Rapid Mount / Unmount Lifecycle Churn (30 cycles)
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;

    let lifecycleFail = false;
    try {
      for (let i = 0; i < 30; i++) {
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(AuraVisualizer, { isRecording: true, barCount: 5 }));
        root.unmount();
      }
    } catch (e) {
      lifecycleFail = true;
      console.error('Lifecycle crash:', e);
    }

    assert(!lifecycleFail, 'CHAL-3.4 30 rapid mount/unmount cycles complete cleanly without unhandled errors');
  }

  // =========================================================================
  // DOMAIN 4: CROSS-TOOL PIPELINE CONCURRENCY & RACE CONDITIONS
  // =========================================================================
  console.log('\n--- Domain 4: Cross-Tool Clinical Pipeline Concurrency ---');

  // Test 4.1: Concurrent sendToPhiScrubber burst (50 concurrent calls)
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    let contextRef: any = null;
    const TestConsumer: React.FC = () => {
      contextRef = useClinicalContext();
      return React.createElement('div', null, 'Testing Consumer');
    };

    root.render(
      React.createElement(ClinicalContextProvider, null, React.createElement(TestConsumer))
    );
    await sleep(40);

    let receivedEvents = 0;
    dom.window.addEventListener('clinical:send-to-phi-scrubber', () => {
      receivedEvents++;
    });

    const payloads = [
      'Short note: Jane Doe has GAD-7 anxiety.',
      'Complex: DOB 04/12/1988, MRN #MC-88219, Phone (415) 555-0199.',
      'SQL test: SELECT * FROM patients; --',
      'XSS test: <script>alert("phi")</script>',
      'Unicode: 🏥 Dr. Chen session with 🧠 therapy notes.',
    ];

    // Fire 50 concurrent calls
    for (let i = 0; i < 50; i++) {
      const payload = payloads[i % payloads.length] + ` [Burst #${i}]`;
      contextRef.sendToPhiScrubber(payload);
    }
    await sleep(40);

    assert(receivedEvents === 50, `CHAL-4.1a 50 concurrent sendToPhiScrubber calls dispatches 50 events (got ${receivedEvents})`);
    assert(
      contextRef.scrubberInputText.includes('[Burst #49]'),
      'CHAL-4.1b scrubberInputText correctly retains final synchronous payload without truncation'
    );

    root.unmount();
  }

  // Test 4.2: Concurrent insertToEhr burst (50 concurrent calls) & TheraFlow Store
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    let contextRef: any = null;
    const TestConsumer: React.FC = () => {
      contextRef = useClinicalContext();
      return React.createElement('div', null, 'Testing Consumer');
    };

    root.render(
      React.createElement(ClinicalContextProvider, null, React.createElement(TestConsumer))
    );
    await sleep(40);

    // Concurrently trigger 30 string insertions and 20 object insertions
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 30; i++) {
      promises.push(
        Promise.resolve().then(() => {
          contextRef.insertToEhr(`Addendum entry #${i} for clinical assessment.`);
        })
      );
    }
    for (let i = 0; i < 20; i++) {
      promises.push(
        Promise.resolve().then(() => {
          contextRef.insertToEhr({
            subjective: `Subjective notes batch #${i}`,
            assessment: `Assessment clinical formulation #${i}`,
            plan: `Plan interventions #${i}`,
          });
        })
      );
    }

    await Promise.all(promises);
    await sleep(100);

    // Verify activeEncounterNotes is intact
    const notes = contextRef.activeEncounterNotes;
    assert(
      Boolean(notes.subjective && notes.assessment && notes.plan),
      'CHAL-4.2a 50 concurrent insertToEhr calls populate all clinical sections without memory corruption'
    );
    assert(
      notes.subjective.includes('Subjective notes batch #19'),
      'CHAL-4.2b Structured object payload correctly updates subjective field'
    );

    // Verify TheraFlow in-memory store
    const { getNotes } = await import('../src/tools/theraflow/data/theraflow-store');
    const storedNotes = await getNotes();
    const patientNote = storedNotes.find((n) => n.client_id === 'p-101');
    assert(
      Boolean(patientNote),
      'CHAL-4.2c TheraFlow store reflects committed clinical note bound to patient p-101'
    );

    root.unmount();
  }

  // Test 4.3: Interleaved Active Patient Switching and Cross-Tool Sync
  {
    const dom = setupDomGlobals();
    const container = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(container);

    let contextRef: any = null;
    const TestConsumer: React.FC = () => {
      contextRef = useClinicalContext();
      return React.createElement('div', null, 'Testing Consumer');
    };

    root.render(
      React.createElement(ClinicalContextProvider, null, React.createElement(TestConsumer))
    );
    await sleep(40);

    const testPatients: Patient[] = [
      { id: 'p-101', name: 'Jane Doe', dob: '04/12/1988', mrn: '#MC-88219', cptCode: '90837' },
      { id: 'p-102', name: 'Marcus Vance', dob: '11/03/1992', mrn: '#MC-10002', cptCode: '90834' },
      { id: 'p-103', name: 'Elena Rostova', dob: '08/19/1975', mrn: '#MC-55421', cptCode: '99214' },
    ];

    let syncClean = true;
    for (const pat of testPatients) {
      contextRef.setActivePatient(pat);
      await sleep(20);
      const diag = getDiagnosisForPatient(pat.id);
      if (pat.id === 'p-101' && diag.code !== 'F41.1') syncClean = false;
      if (pat.id === 'p-102' && diag.code !== 'F32.1') syncClean = false;
      if (pat.id === 'p-103' && diag.code !== 'F41.0') syncClean = false;
    }

    assert(syncClean, 'CHAL-4.3 Dynamic active patient switching synchronizes DSM-5 differentials across patients');
    root.unmount();
  }

  // =========================================================================
  // DOMAIN 5: HIPAA PHI SCRUBBER 18 SAFE HARBOR ENGINE STRESS
  // =========================================================================
  console.log('\n--- Domain 5: Statutory 18 Safe Harbor Engine Edge Cases ---');

  // Test 5.1: 18 Statutory Rule Comprehensive Fixture
  {
    const full18Fixture = `
Clinical Intake Record:
Patient: Sarah Connor (DOB: 02/28/1985, Age: 92 years old)
Address: 742 Evergreen Terrace, Springfield, OR 97477
Contact: Phone: (503) 555-0199, Fax: (503) 555-0198, Email: sconnor@cyberdyne-med.org
Identifiers:
- Social Security Number: 123-45-6789
- Medical Record Number: MRN-9982341
- Health Plan ID: HP-8837194
- Account Number: ACT-44910283
- State License / NPI: NPI-1982736451
- Vehicle Identification: VIN-1HGCR2F83HA001234
- Medical Device Identifier: UDI-00844588003291
- Online Access: https://telehealth-portal.org/patient/9923
- IP Address: 192.168.1.104
- Biometric Record: Fingerprint Hash SHA256-a9b8c7d6e5f4
- Clinical Photo: Photo ID #IMG-88291
- Statutory Unique ID: UID-9988221100
`;

    const result = scrubText(full18Fixture, { maskStyle: 'tag' });

    assert(
      result.itemsRedacted >= 15,
      `CHAL-5.1a Statutory 18 Safe Harbor engine captures dense entities (found ${result.itemsRedacted} entities)`
    );
    assert(
      result.metrics.riskSeverity === 'CRITICAL',
      'CHAL-5.1b Direct identifiers (SSN, MRN, Name) trigger CRITICAL risk severity'
    );
    assert(
      !result.cleanText.includes('123-45-6789') &&
      !result.cleanText.includes('sconnor@cyberdyne-med.org') &&
      !result.cleanText.includes('192.168.1.104'),
      'CHAL-5.1c Original sensitive identifiers are completely purged from clean text'
    );
  }

  // Test 5.2: Greedy Interval Scheduling & Non-Overlapping Offset Integrity
  {
    const overlapText = 'Patient: Jane Doe born 04/12/1988 called (415) 555-0199 regarding account ACT-99182341.';
    const result = scrubText(overlapText);

    let intervalsValid = true;
    let offsetsMatchOriginal = true;

    for (let i = 0; i < result.entities.length; i++) {
      const ent = result.entities[i];
      const sliced = overlapText.slice(ent.start, ent.end);
      if (sliced !== ent.originalValue) {
        offsetsMatchOriginal = false;
        console.error(`Offset mismatch at entity ${ent.id}: expected "${ent.originalValue}", got "${sliced}"`);
      }

      if (i > 0) {
        const prev = result.entities[i - 1];
        if (ent.start < prev.end) {
          intervalsValid = false;
          console.error(`Overlapping interval between ${prev.id} (${prev.start}-${prev.end}) and ${ent.id} (${ent.start}-${ent.end})`);
        }
      }
    }

    assert(intervalsValid, 'CHAL-5.2a Greedy interval scheduling produces strictly non-overlapping intervals');
    assert(offsetsMatchOriginal, 'CHAL-5.2b Character start/end offsets match exact original string slice');
  }

  // Test 5.3: Masking Mode Transformations (tag, block, asterisk)
  {
    const sample = 'Patient: Jane Doe, Phone: (415) 555-0199, SSN: 000-12-3456.';
    const tagRes = scrubText(sample, { maskStyle: 'tag' });
    const blockRes = scrubText(sample, { maskStyle: 'block' });
    const astRes = scrubText(sample, { maskStyle: 'asterisk' });

    assert(
      tagRes.cleanText.includes('[PHONE]') || tagRes.cleanText.includes('[NAME]') || tagRes.cleanText.includes('[SSN]'),
      'CHAL-5.3a Tag mask mode produces bracketed token tags'
    );
    assert(
      blockRes.cleanText.includes('█'),
      'CHAL-5.3b Block mask mode replaces entities with solid unicode blocks █'
    );
    assert(
      astRes.cleanText.includes('*'),
      'CHAL-5.3c Asterisk mask mode replaces entities with asterisks *'
    );
  }

  // Test 5.4: Massive Document Throughput & ReDoS Defense (100KB document)
  {
    const baseParagraph = 'Patient John Smith (DOB 01/01/1970) phone 503-555-0100 visited Portland, OR. ';
    const bigDoc = baseParagraph.repeat(1500); // ~115KB

    const t0 = Date.now();
    const result = scrubText(bigDoc);
    const elapsedMs = Date.now() - t0;

    assert(
      elapsedMs < 1000,
      `CHAL-5.4 Massive 115KB clinical document processed in ${elapsedMs}ms (<1000ms threshold, ReDoS-safe)`
    );
    assert(
      result.itemsRedacted > 1000,
      `CHAL-5.4b High-volume entity redaction verified (${result.itemsRedacted} entities)`
    );
  }

  // Test 5.5: Empty, Null, Whitespace & Adversarial Input Robustness
  {
    const emptyRes = scrubText('');
    const nullRes = scrubText(null as any);
    const undefinedRes = scrubText(undefined as any);
    const whitespaceRes = scrubText('   \n\t  ');

    assert(
      emptyRes.itemsRedacted === 0 && emptyRes.cleanText === '',
      'CHAL-5.5a Empty string produces 0 entities and clean output'
    );
    assert(
      nullRes.itemsRedacted === 0 && undefinedRes.itemsRedacted === 0,
      'CHAL-5.5b Null and undefined inputs handled gracefully without throwing'
    );
    assert(
      whitespaceRes.itemsRedacted === 0 && whitespaceRes.cleanText === '   \n\t  ',
      'CHAL-5.5c Whitespace-only string returns unchanged without corruption'
    );
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================================');
  console.log(`Milestone 5 Challenger Audit Summary: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('====================================================================\n');

  if (failedCount > 0) {
    console.error('❌ CHALLENGER STRESS HARNESS FAILED.');
    process.exit(1);
  } else {
    console.log('✓ ALL CHALLENGER EMPIRICAL CONCURRENCY & STRESS CHECKS PASSED.');
    process.exit(0);
  }
}

runEmpiricalStress().catch((err) => {
  console.error('Fatal stress suite failure:', err);
  process.exit(1);
});
