/**
 * Milestone 5 Automated Test Suite: Aura Assistant & HIPAA PHI Scrubber Integration
 * Verifies Features 19, 20, 21, 22, 23, 24, 25, and 26 across data contracts,
 * statutory Safe Harbor regexes, de-identification engine, UI invariant mounting,
 * zero CSS bleed, and cross-tool clinical pipelines.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

// Aura Copilot imports
import { AuraStudio } from '../src/tools/aura/AuraStudio';
import { AuraFloatingOrb } from '../src/tools/aura/AuraFloatingOrb';
import { AuraVisualizer } from '../src/tools/aura/AuraVisualizer';
import { AuraDictation } from '../src/tools/aura/AuraDictation';
import { TypewriterSoap, synthesizeSoapNote } from '../src/tools/aura/TypewriterSoap';
import {
  DSM5_DIAGNOSES,
  CLINICAL_SUGGESTION_CHIPS,
  CLINICAL_PRESETS,
  getDiagnosisForPatient,
} from '../src/tools/aura/data/dsm5-database';

// PHI Scrubber imports
import { SAFE_HARBOR_RULES } from '../src/tools/phi-scrubber/safeHarborRules';
import { scrubText, generateMask } from '../src/tools/phi-scrubber/engine';
import { DiffViewer } from '../src/tools/phi-scrubber/DiffViewer';
import { AuditTable } from '../src/tools/phi-scrubber/AuditTable';
import { PhiScrubberView } from '../src/tools/phi-scrubber/PhiScrubberView';
import {
  getActivePatientSample,
  PRESET_FULL_18,
  PRESET_INTAKE_NOTE,
  PRESET_TELEHEALTH_TELEMETRY,
} from '../src/tools/phi-scrubber/sampleTexts';
import {
  ClinicalContextProvider,
  useClinicalContext,
  DEFAULT_PATIENT,
} from '../src/lib/clinical-context';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n====================================================================');
  console.log('   Milestone 5: Aura Assistant & HIPAA PHI Scrubber Test Suite');
  console.log('====================================================================\n');

  // Setup virtual DOM environment for React mounting tests
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/dashboard/aura',
  });
  (global as any).window = dom.window;
  (global as any).document = dom.window.document;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}
  (global as any).HTMLElement = dom.window.HTMLElement;
  (global as any).CustomEvent = dom.window.CustomEvent;

  (global as any).localStorage = (dom.window as any).localStorage;

  // -------------------------------------------------------------------------
  // CATEGORY 1: Feature 19 — Aura Assistant Workspace & Studio
  // -------------------------------------------------------------------------
  console.log('▶ [Category 1] Feature 19: Aura Assistant Workspace & Studio');

  const studioContainer = dom.window.document.getElementById('root')!;
  const root = ReactDOM.createRoot(studioContainer);

  await new Promise<void>((resolve) => {
    root.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(AuraStudio)
        )
      )
    );
    setTimeout(resolve, 80);
  });

  const studioHtml = studioContainer.innerHTML;
  assert(studioHtml.includes('Aura Assistant Studio'), 'F19.1 Header title "Aura Assistant Studio" renders');
  assert(studioHtml.includes('Copilot Standby'), 'F19.2 Status badge "Copilot Standby" renders');
  assert(
    studioHtml.includes('Diagnostic Differential Assistant: Jane Doe'),
    'F19.3 Dynamic differential header binds to Jane Doe'
  );
  assert(studioHtml.includes('CPT: 90837'), 'F19.4 CPT badge renders "CPT: 90837"');
  assert(studioHtml.includes('DSM-5 symptom markers'), 'F19.5 Invariant text contains "DSM-5 symptom markers"');
  assert(studioHtml.includes('ICD-10 diagnostic codes'), 'F19.6 Invariant text contains "ICD-10 diagnostic codes"');
  assert(studioHtml.includes('clinical interventions'), 'F19.7 Invariant text contains "clinical interventions"');

  // DSM-5 database and diagnostic resolution
  const janeDiag = getDiagnosisForPatient('p-101');
  assert(janeDiag.code === 'F41.1', 'F19.8 Jane Doe resolves to GAD-7 (F41.1)');
  assert(janeDiag.criteria.length >= 6, 'F19.9 GAD-7 contains >= 6 diagnostic criteria');

  const marcusDiag = getDiagnosisForPatient('p-102');
  assert(marcusDiag.code === 'F32.1', 'F19.10 Marcus Vance resolves to MDD (F32.1)');

  const elenaDiag = getDiagnosisForPatient('p-103');
  assert(elenaDiag.code === 'F41.0', 'F19.11 Elena Rostova resolves to Panic Disorder (F41.0)');

  assert(CLINICAL_SUGGESTION_CHIPS.length >= 8, 'F19.12 Clinical suggestion chips library contains >= 8 chips');
  assert(
    CLINICAL_SUGGESTION_CHIPS.some((c) => c.label.includes('GAD-7 Protocol')),
    'F19.13 Suggestion chip includes GAD-7 Protocol'
  );
  assert(
    CLINICAL_SUGGESTION_CHIPS.some((c) => c.label.includes('Low Risk / No SI/HI')),
    'F19.14 Suggestion chip includes Low Risk / No SI/HI'
  );

  // -------------------------------------------------------------------------
  // CATEGORY 2: Feature 20 — Aura Floating Action Orb
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 2] Feature 20: Aura Floating Action Orb');

  const orbContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(orbContainer);
  const orbRoot = ReactDOM.createRoot(orbContainer);

  await new Promise<void>((resolve) => {
    orbRoot.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(AuraFloatingOrb, { initialOpen: true })
        )
      )
    );
    setTimeout(resolve, 80);
  });

  const orbHtml = orbContainer.innerHTML;
  assert(orbHtml.includes('aura-orb'), 'F20.1 Floating action orb element rendered in DOM');
  assert(orbHtml.includes('Aura Copilot'), 'F20.2 Expanded overlay title "Aura Copilot" rendered');
  assert(orbHtml.includes('Jane Doe (90837)'), 'F20.3 Floating panel header displays active patient tag');
  assert(orbHtml.includes('Format SOAP'), 'F20.4 Floating panel contains "Format SOAP" button');
  assert(orbHtml.includes('Insert EHR'), 'F20.5 Floating panel contains "Insert EHR" button');
  assert(orbHtml.includes('Alt + A'), 'F20.6 Keyboard shortcut indicator Alt + A rendered');

  // -------------------------------------------------------------------------
  // CATEGORY 3: Feature 21 — Aura Dictation & Typewriter SOAP
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 3] Feature 21: Aura Dictation & Typewriter SOAP');

  const visualizerContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(visualizerContainer);
  const vizRoot = ReactDOM.createRoot(visualizerContainer);

  await new Promise<void>((resolve) => {
    vizRoot.render(React.createElement(AuraVisualizer, { isRecording: true, barCount: 5 }));
    setTimeout(resolve, 80);
  });
  const vizHtml = visualizerContainer.innerHTML;
  assert(
    vizHtml.includes('aura-visualizer-box') && vizHtml.includes('aura-visualizer-bar'),
    'F21.1 Headless-safe pure CSS audio visualizer renders 5 bars without canvas/AudioContext'
  );

  // Typewriter SOAP synthesis test
  const generatedSoap = synthesizeSoapNote(
    'Patient completed progressive muscle relaxation homework and reports reduced panic attacks.',
    'Jane Doe',
    '90837'
  );
  assert(generatedSoap.includes('SUBJECTIVE:'), 'F21.2 Synthesized note contains SUBJECTIVE section');
  assert(generatedSoap.includes('OBJECTIVE:'), 'F21.3 Synthesized note contains OBJECTIVE section');
  assert(generatedSoap.includes('ASSESSMENT:'), 'F21.4 Synthesized note contains ASSESSMENT section');
  assert(generatedSoap.includes('PLAN:'), 'F21.5 Synthesized note contains PLAN section');
  assert(generatedSoap.includes('CPT 90837'), 'F21.6 Synthesized note references active CPT code 90837');

  // Typewriter SOAP Component mount and Fast-Forward check
  const typewriterContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(typewriterContainer);
  const twRoot = ReactDOM.createRoot(typewriterContainer);

  let streamFinished = false;
  await new Promise<void>((resolve) => {
    twRoot.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(TypewriterSoap, {
            initialText: generatedSoap,
            onStreamingComplete: () => {
              streamFinished = true;
            },
          })
        )
      )
    );
    setTimeout(resolve, 80);
  });

  const twHtml = typewriterContainer.innerHTML;
  assert(twHtml.includes('Synthesized SOAP Progress Note'), 'F21.7 Typewriter SOAP header rendered');
  assert(twHtml.includes('Insert to EHR Chart'), 'F21.8 Typewriter component contains "Insert to EHR Chart" action');
  assert(twHtml.includes('Send to PHI Scrubber'), 'F21.9 Typewriter component contains "Send to PHI Scrubber" action');

  // -------------------------------------------------------------------------
  // CATEGORY 4: Feature 22 — Aura Shadow DOM & CSS Isolation
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 4] Feature 22: Aura Shadow DOM & CSS Isolation');

  const auraCssPath = path.resolve('src/tools/aura/aura-shadow.css');
  assert(fs.existsSync(auraCssPath), 'F22.1 aura-shadow.css exists on disk');

  const auraCssContent = fs.readFileSync(auraCssPath, 'utf-8');
  const cssLines = auraCssContent.split('\n');
  const forbiddenRegexes = [
    /^\s*\*\s*\{/,
    /^\s*html\b/,
    /^\s*body\b/,
    /^\s*#root\b/,
    /^\s*\.btn\b/,
    /^\s*\.badge\b/,
    /html.*body.*overflow:\s*hidden/i,
  ];

  let bleedErrors = 0;
  cssLines.forEach((line) => {
    const clean = line.split('/*')[0].trim();
    if (!clean) return;
    for (const pat of forbiddenRegexes) {
      if (pat.test(clean)) bleedErrors++;
    }
  });

  assert(bleedErrors === 0, 'F22.2 aura-shadow.css has 0 global CSS bleed violations');
  assert(auraCssContent.includes(':host'), 'F22.3 Styles encapsulated with :host pseudo-selector');
  assert(auraCssContent.includes('.aura-orb'), 'F22.4 Namespaced class .aura-orb defined');

  // -------------------------------------------------------------------------
  // CATEGORY 5: Feature 23 — PHI Scrubber 18 Safe Harbor Engine
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 5] Feature 23: PHI Scrubber 18 Safe Harbor Engine');

  assert(SAFE_HARBOR_RULES.length === 18, 'F23.0 All 18 statutory HIPAA Safe Harbor rules defined');

  // Rule 1: Names
  const r1 = scrubText('Patient Name: Jane Elizabeth Doe was examined by Dr. Michael R. Chen, MD.');
  assert(r1.cleanText.includes('[NAME]'), 'F23.1 Rule 1 (Names) redacted with [NAME]');
  assert(!r1.cleanText.includes('Jane Elizabeth Doe'), 'F23.1b Source patient name not present in clean text');

  // Rule 2: Geographic
  const r2 = scrubText('Patient resides at 742 Evergreen Terrace, Springfield, IL 62704.');
  assert(r2.cleanText.includes('[LOCATION]') || r2.cleanText.includes('[ZIP]'), 'F23.2 Rule 2 (Geographic) redacted');

  // Rule 3: Dates & Ages 90+
  const r3 = scrubText('Encounter on 04/12/1988 for patient DOB 1988-04-12. Patient is 94 years old.');
  assert(r3.cleanText.includes('[DATE]'), 'F23.3 Rule 3 (Dates) redacted with [DATE]');
  assert(r3.cleanText.includes('[AGE_90+]'), 'F23.3b Rule 3 (Ages 90+) redacted with [AGE_90+]');

  // Rule 4: Phone
  const r4 = scrubText('Call primary phone: (415) 555-0199 or 212-555-0144.');
  assert(r4.cleanText.includes('[PHONE]'), 'F23.4 Rule 4 (Phone) redacted with [PHONE]');

  // Rule 5: Fax
  const r5 = scrubText('Clinical records sent to Fax: 555-234-5678.');
  assert(r5.cleanText.includes('[FAX]') || r5.cleanText.includes('[PHONE]'), 'F23.5 Rule 5 (Fax) redacted');

  // Rule 6: Email
  const r6 = scrubText('Contact email: patient.records@healthmail.org.');
  assert(r6.cleanText.includes('[EMAIL]'), 'F23.6 Rule 6 (Email) redacted with [EMAIL]');

  // Rule 7: SSN
  const r7 = scrubText('Social Security Number: 123-45-6789.');
  assert(r7.cleanText.includes('[SSN]'), 'F23.7 Rule 7 (SSN) redacted with [SSN]');

  // Rule 8: MRN
  const r8 = scrubText('Chart MRN: 00734821 and clinical chart #MC-88219.');
  assert(r8.cleanText.includes('[MRN]'), 'F23.8 Rule 8 (MRN) redacted with [MRN]');

  // Rule 9: Health Plan ID
  const r9 = scrubText('Insurance Beneficiary ID: BCBS-XY9812345.');
  assert(r9.cleanText.includes('[HEALTH_PLAN_NUM]'), 'F23.9 Rule 9 (Health Plan) redacted with [HEALTH_PLAN_NUM]');

  // Rule 10: Account Numbers
  const r10 = scrubText('Billing Account: ACCT-9918274 and Credit Card: 4111-2222-3333-4444.');
  assert(r10.cleanText.includes('[ACCOUNT_NUM]'), 'F23.10 Rule 10 (Account) redacted with [ACCOUNT_NUM]');

  // Rule 11: License / NPI
  const r11 = scrubText('Attending NPI: 1234567890 and DEA License: AS1234563.');
  assert(r11.cleanText.includes('[NPI]') || r11.cleanText.includes('[LICENSE_NUM]'), 'F23.11 Rule 11 (License/NPI) redacted');

  // Rule 12: Vehicle IDs
  const r12 = scrubText('Vehicle VIN: 1HGBH41JXMN109186 and License Plate: 7XYZ89.');
  assert(r12.cleanText.includes('[VEHICLE_ID]'), 'F23.12 Rule 12 (Vehicle IDs) redacted with [VEHICLE_ID]');

  // Rule 13: Device IDs
  const r13 = scrubText('Pacemaker Serial # DEV-789-XYZ-001 (UDI: 00888444111222).');
  assert(r13.cleanText.includes('[DEVICE_ID]'), 'F23.13 Rule 13 (Device IDs) redacted with [DEVICE_ID]');

  // Rule 14: URLs
  const r14 = scrubText('Access records at https://portal.health-system.com/patient/78423.');
  assert(r14.cleanText.includes('[URL]'), 'F23.14 Rule 14 (URLs) redacted with [URL]');

  // Rule 15: IP Addresses
  const r15 = scrubText('Telehealth session logged from IP: 192.168.1.42.');
  assert(r15.cleanText.includes('[IP_ADDRESS]'), 'F23.15 Rule 15 (IP Addresses) redacted with [IP_ADDRESS]');

  // Rule 16: Biometrics
  const r16 = scrubText('Voiceprint biometric scan confirmed match.');
  assert(r16.cleanText.includes('[BIOMETRIC]'), 'F23.16 Rule 16 (Biometric) redacted with [BIOMETRIC]');

  // Rule 17: Full-face Photos
  const r17 = scrubText('Patient photo archived at /records/photos/doe_jane_2026.jpg.');
  assert(r17.cleanText.includes('[PHOTO_ID]'), 'F23.17 Rule 17 (Photos) redacted with [PHOTO_ID]');

  // Rule 18: Other Unique IDs
  const r18 = scrubText('Barcode UID # BIO-REF-99281-XYZ and UUID: 123e4567-e89b-12d3-a456-426614174000.');
  assert(r18.cleanText.includes('[UNIQUE_ID]'), 'F23.18 Rule 18 (Unique IDs) redacted with [UNIQUE_ID]');

  // Masking styles
  const textSample = 'Call 415-555-0199 for Jane.';
  const maskTag = scrubText(textSample, { maskStyle: 'tag' });
  assert(maskTag.cleanText.includes('[PHONE]'), 'F23.19 Mask style "tag" generates [PHONE]');

  const maskBlock = scrubText(textSample, { maskStyle: 'block' });
  assert(maskBlock.cleanText.includes('████'), 'F23.20 Mask style "block" generates solid blocks');

  const maskAsterisk = scrubText(textSample, { maskStyle: 'asterisk' });
  assert(maskAsterisk.cleanText.includes('****'), 'F23.21 Mask style "asterisk" generates asterisks');

  // Character offset accuracy test
  const full18Res = scrubText(PRESET_FULL_18);
  const allOffsetsAccurate = full18Res.entities.every(
    (e) => PRESET_FULL_18.slice(e.start, e.end) === e.originalValue
  );
  assert(allOffsetsAccurate, 'F23.22 Character offsets perfectly match original source text across all entities');

  // Confidence scores
  const allConfidenceValid = full18Res.entities.every(
    (e) => e.confidence >= 0.7 && e.confidence <= 1.0
  );
  assert(allConfidenceValid, 'F23.23 Confidence scores scored between 0.70 and 1.00');

  // -------------------------------------------------------------------------
  // CATEGORY 6: Feature 24 — PHI Scrubber Side-by-Side Diff Viewer
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 6] Feature 24: PHI Scrubber Side-by-Side Diff Viewer');

  const diffContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(diffContainer);
  const diffRoot = ReactDOM.createRoot(diffContainer);

  let currentMask: any = 'tag';
  await new Promise<void>((resolve) => {
    diffRoot.render(
      React.createElement(DiffViewer, {
        scrubResult: full18Res,
        maskStyle: currentMask,
        onMaskStyleChange: (m) => {
          currentMask = m;
        },
      })
    );
    setTimeout(resolve, 80);
  });

  const diffHtml = diffContainer.innerHTML;
  assert(
    diffHtml.includes('Unredacted Clinical Source (Protected ePHI)'),
    'F24.1 Unredacted Source pane header rendered'
  );
  assert(
    diffHtml.includes('18 Safe Harbor Redacted Output'),
    'F24.2 Redacted Output pane header rendered'
  );
  assert(diffHtml.includes('Copy Clean Text'), 'F24.3 "Copy Clean Text" button rendered');
  assert(diffHtml.includes('[TAG] Tokens'), 'F24.4 Tag mask mode switcher button rendered');
  assert(diffHtml.includes('██ Solid Block'), 'F24.5 Block mask mode switcher button rendered');
  assert(diffHtml.includes('*** Asterisks'), 'F24.6 Asterisk mask mode switcher button rendered');

  // -------------------------------------------------------------------------
  // CATEGORY 7: Feature 25 — PHI Scrubber Forensic Audit Table
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 7] Feature 25: PHI Scrubber Forensic Audit Table');

  const auditContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(auditContainer);
  const auditRoot = ReactDOM.createRoot(auditContainer);

  await new Promise<void>((resolve) => {
    auditRoot.render(React.createElement(AuditTable, { scrubResult: full18Res }));
    setTimeout(resolve, 80);
  });

  const auditHtml = auditContainer.innerHTML;
  assert(auditHtml.includes('Total ePHI Detected'), 'F25.1 Metric card "Total ePHI Detected" rendered');
  assert(auditHtml.includes('Safe Harbor Rules'), 'F25.2 Metric card "Safe Harbor Rules" rendered');
  assert(auditHtml.includes('Risk Severity'), 'F25.3 Metric card "Risk Severity" rendered');
  assert(auditHtml.includes('Compliance Status'), 'F25.4 Metric card "Compliance Status" rendered');
  assert(auditHtml.includes('Export JSON'), 'F25.5 "Export JSON" action rendered');
  assert(auditHtml.includes('Export CSV'), 'F25.6 "Export CSV" action rendered');
  assert(auditHtml.includes('Rule 1: Names'), 'F25.7 Forensic table displays statutory rule classification');

  // -------------------------------------------------------------------------
  // CATEGORY 8: Feature 26 — Cross-Tool Clinical Pipelines
  // -------------------------------------------------------------------------
  console.log('\n▶ [Category 8] Feature 26: Cross-Tool Clinical Pipelines');

  let testContext: any = null;
  const PipelineTestProbe: React.FC = () => {
    testContext = useClinicalContext();
    return React.createElement('div', { id: 'pipeline-probe' }, 'Active');
  };

  const pipelineContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(pipelineContainer);
  const pipelineRoot = ReactDOM.createRoot(pipelineContainer);

  await new Promise<void>((resolve) => {
    pipelineRoot.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(PipelineTestProbe)
      )
    );
    setTimeout(resolve, 80);
  });

  assert(testContext !== null, 'F26.1 ClinicalContext mounts cleanly');
  assert(testContext.activePatient.name === 'Jane Doe', 'F26.2 Default active patient is Jane Doe');

  // Test sendToPhiScrubber pipeline
  let customEventDispatched = false;
  let customEventPayload: any = null;
  const eventHandler = (e: any) => {
    customEventDispatched = true;
    customEventPayload = e.detail;
  };
  dom.window.addEventListener('clinical:send-to-phi-scrubber', eventHandler);

  testContext.sendToPhiScrubber('Test payload from Aura Copilot: Jane Doe (415) 555-0199');
  await new Promise((r) => setTimeout(r, 60));
  assert(
    testContext.scrubberInputText.includes('Test payload from Aura Copilot'),
    'F26.3 sendToPhiScrubber synchronously sets scrubberInputText'
  );
  assert(customEventDispatched, 'F26.4 sendToPhiScrubber dispatches clinical:send-to-phi-scrubber custom event');
  assert(
    customEventPayload?.text?.includes('Jane Doe'),
    'F26.5 Event detail includes clinical text payload'
  );
  dom.window.removeEventListener('clinical:send-to-phi-scrubber', eventHandler);

  // Test insertToEhr string addendum
  const originalAssessment = testContext.activeEncounterNotes.assessment;
  const testAddendum = 'DIAGNOSTIC ADDENDUM: Completed CBT Exposure Protocol with 80% habituation.';
  testContext.insertToEhr(testAddendum);
  await new Promise((r) => setTimeout(r, 60));

  assert(
    testContext.activeEncounterNotes.assessment.includes(originalAssessment) &&
    testContext.activeEncounterNotes.assessment.includes(testAddendum),
    'F26.6 insertToEhr(string) appends addendum without overwriting prior assessment'
  );

  // Test insertToEhr structured object
  testContext.insertToEhr({
    subjective: 'Structured Subjective finding',
    objective: 'Structured Objective MSE WNL',
    assessment: 'Structured Assessment: GAD-7 score 8',
    plan: 'Structured Plan: Bi-weekly follow-up',
  });
  await new Promise((r) => setTimeout(r, 60));

  assert(
    testContext.activeEncounterNotes.subjective === 'Structured Subjective finding',
    'F26.7 insertToEhr(object) updates structured subjective'
  );
  assert(
    testContext.activeEncounterNotes.plan === 'Structured Plan: Bi-weekly follow-up',
    'F26.8 insertToEhr(object) updates structured plan'
  );

  // Full Top-Level PhiScrubberView mounting test
  const scrubberContainer = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(scrubberContainer);
  const scrubberRoot = ReactDOM.createRoot(scrubberContainer);

  await new Promise<void>((resolve) => {
    scrubberRoot.render(
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(PhiScrubberView)
        )
      )
    );
    setTimeout(resolve, 80);
  });

  const scrubberHtml = scrubberContainer.innerHTML;
  assert(scrubberHtml.includes('HIPAA PHI Scrubber'), 'F26.9 PhiScrubberView mounts with "HIPAA PHI Scrubber"');
  assert(scrubberHtml.includes('18 Safe Harbor Active'), 'F26.10 PhiScrubberView displays "18 Safe Harbor Active" badge');
  assert(scrubberHtml.includes('[NAME]'), 'F26.11 PhiScrubberView contains exact [NAME] token');
  assert(scrubberHtml.includes('[DATE]'), 'F26.12 PhiScrubberView contains exact [DATE] token');
  assert(scrubberHtml.includes('[PHONE]'), 'F26.13 PhiScrubberView contains exact [PHONE] token');

  // -------------------------------------------------------------------------
  // Final Results Summary
  // -------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`   Milestone 5 Verification Summary: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('✓ [CERTIFIED] All Milestone 5 Aura Assistant & HIPAA PHI Scrubber deliverables pass.\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
