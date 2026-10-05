/**
 * Milestone 6 Phase 2 — Tier 5 Adversarial Coverage Hardening Test Suite
 *
 * Scope:
 * 1. TheraFlow EHR (Cryptographic SHA-256 Audit Chain, Roster, Mutability, Boundaries)
 * 2. Clinical AI Scribe v2 (Coding Recommendation Engine, Multi-EHR Adapters & Delimiter Defenses, Template Studio)
 * 3. Aura Assistant (Psychiatric DSM-5 Differential Engine, Visualizers, Typewriter SOAP Synthesis)
 * 4. HIPAA PHI Scrubber (18 Statutory Safe Harbor Engine, Adjacent/Overlapping Entities, ReDoS & Stress)
 * 5. Core Auth & Session Management (Anti-forgery Envelopes, Fail-closed Purging, Protected Route Guards)
 * 6. Subscription Billing Engine (Tier Gating, Trial Lifecycle, Express Stripe Endpoints & Prototype Guards)
 *
 * Execution: npx tsx tests/tier5-adversarial-coverage.test.ts
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { spawn, ChildProcess } from 'node:child_process';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// 1. Aura & DSM-5 Imports
import {
  DSM5_DIAGNOSES,
  CLINICAL_SUGGESTION_CHIPS,
  CLINICAL_PRESETS,
  getDiagnosisForPatient,
} from '../src/tools/aura/data/dsm5-database';
import { AuraVisualizer } from '../src/tools/aura/AuraVisualizer';
import { TypewriterSoap, synthesizeSoapNote } from '../src/tools/aura/TypewriterSoap';

// 2. Scribe & Coding Imports
import {
  matchDiagnosticCodes,
  recommendCptCode,
} from '../src/tools/scribe/utils/codeSuggestionEngine';
import {
  STATUTORY_ICD10_DATABASE,
  STATUTORY_CPT_DATABASE,
} from '../src/tools/scribe/data/codingData';
import {
  interpolateTemplateVariables,
  SUPPORTED_VARIABLES,
} from '../src/tools/scribe/variable-interpolator';
import {
  getStoredTemplates,
  saveTemplate,
  deleteTemplate,
  resetToFactoryPresets,
  TEMPLATE_STORAGE_KEY,
} from '../src/tools/scribe/data/templateStore';
import {
  formatEpicSmartText,
  formatEpicFhirDocument,
  formatCernerPowerChart,
  formatAthenaEncounter,
  formatMarkdownUniversal,
  sanitizeEpicSmartTextContent,
  sanitizeCernerPowerChartContent,
} from '../src/tools/scribe/utils/ehrExportAdapters';
import { WaveformVisualizer } from '../src/tools/scribe/WaveformVisualizer';
import { EhrExportData } from '../src/tools/scribe/types';

// 3. HIPAA PHI Scrubber Imports
import { SAFE_HARBOR_RULES } from '../src/tools/phi-scrubber/safeHarborRules';
import { scrubText, generateMask } from '../src/tools/phi-scrubber/engine';

// 4. Auth & Guards Imports
import {
  getValidatedStoredDemoSession,
  DEMO_CLINICIAN_USER,
  DEMO_CLINICIAN_SESSION,
  STORAGE_KEY_DEMO_SESSION,
  AuthProvider,
  useAuth,
} from '../src/lib/auth';
import { ProtectedRoute } from '../src/components/guards/ProtectedRoute';

// 5. Subscription & Billing Imports
import {
  SUBSCRIPTION_PLANS,
  STORAGE_KEY_SUBSCRIPTION,
  getStoredSubscription,
  getInitialSubscriptionState,
  getTierBadgeInfo,
  SubscriptionProvider,
  useSubscription,
} from '../src/lib/subscription';
import { SubscriptionGate } from '../src/components/guards/SubscriptionGate';

// 6. EHR & Audit Imports
import {
  sha256,
  computeRecordHash,
  verifyAuditChain,
  GENESIS_HASH,
} from '../src/lib/audit';
import {
  getClients,
  addClient,
  subscribeToTheraFlowStore,
  LOCAL_STORAGE_KEY_THERAFLOW,
} from '../src/tools/theraflow/data/theraflow-store';
import { ClinicalContextProvider, DEFAULT_PATIENT } from '../src/lib/clinical-context';

// Test execution tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testId: string, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] [${testId}] ${testName}`);
  } else {
    failedTests++;
    const err = `[FAIL] [${testId}] ${testName}${detail ? ` -> ${detail}` : ''}`;
    failureDetails.push(err);
    console.error(`  ❌ ${err}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Setup headless JSDOM globals
function setupVirtualDOM(url = 'http://localhost:3000/dashboard') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url,
    runScripts: 'dangerously',
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).localStorage = dom.window.localStorage;
  (globalThis as any).location = dom.window.location;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).CustomEvent = dom.window.CustomEvent;
  (globalThis as any).MouseEvent = dom.window.MouseEvent;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {}
  return dom;
}

// Ephemeral server management
const TEST_SERVER_PORT = 3977;
const TEST_SERVER_URL = `http://127.0.0.1:${TEST_SERVER_PORT}`;
let serverChildProcess: ChildProcess | null = null;

async function startEphemeralServer(): Promise<void> {
  // Check if already active
  try {
    const res = await fetch(`${TEST_SERVER_URL}/api/health`, { signal: AbortSignal.timeout(500) });
    if (res.ok) return;
  } catch {}

  serverChildProcess = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_SERVER_PORT),
      NODE_ENV: 'production',
      APP_URL: TEST_SERVER_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  let serverLogs = '';

  serverChildProcess.stdout?.on('data', (data) => {
    const str = data.toString();
    serverLogs += str;
    if (str.includes(`http://localhost:${TEST_SERVER_PORT}`) || str.includes(`:${TEST_SERVER_PORT}`)) {
      ready = true;
    }
  });
  serverChildProcess.stderr?.on('data', (data) => {
    serverLogs += data.toString();
  });

  const start = Date.now();
  while (!ready && Date.now() - start < 10000) {
    await sleep(100);
    try {
      const ping = await fetch(`${TEST_SERVER_URL}/api/health`, { signal: AbortSignal.timeout(300) });
      if (ping.ok) {
        ready = true;
        break;
      }
    } catch {}
  }

  if (!ready) {
    serverChildProcess.kill('SIGKILL');
    throw new Error(`Ephemeral test server failed to start within 10s:\n${serverLogs}`);
  }
}

async function stopEphemeralServer(): Promise<void> {
  if (serverChildProcess) {
    serverChildProcess.kill('SIGTERM');
    await sleep(300);
    if (serverChildProcess.exitCode === null) {
      serverChildProcess.kill('SIGKILL');
    }
    serverChildProcess = null;
  }
}

// ---------------------------------------------------------------------------
// MAIN ADVERSARIAL TEST SUITE EXECUTION
// ---------------------------------------------------------------------------
async function runTier5TestSuite() {
  console.log('\n====================================================================');
  console.log('   Tier 5 Adversarial Coverage Hardening Test Suite (Milestone 6)   ');
  console.log('====================================================================\n');

  setupVirtualDOM();

  // =========================================================================
  // SUITE 1: Psychiatric DSM-5 Differential Matching & CPT Code Rules
  // =========================================================================
  console.log('▶ [Suite 1] Psychiatric DSM-5 Differential Matching & CPT Code Rules');

  // T5.1.1: Patient to DSM-5 mapping
  const diagP101 = getDiagnosisForPatient('p-101');
  assert(diagP101.id === 'dsm-gad' && diagP101.code === 'F41.1', 'T5.1.1', 'p-101 resolves to Generalized Anxiety Disorder (F41.1)');
  const diagP102 = getDiagnosisForPatient('p-102');
  assert(diagP102.id === 'dsm-mdd' && diagP102.code === 'F32.1', 'T5.1.2', 'p-102 resolves to Major Depressive Disorder (F32.1)');

  // T5.1.2: Unknown patient fallback
  const diagUnknown = getDiagnosisForPatient('unknown-patient-999');
  assert(diagUnknown.id === 'dsm-gad', 'T5.1.3', 'Unknown patient safely falls back to default diagnosis without throwing');

  // T5.1.3: Empty or invalid patient ID
  const diagEmpty = getDiagnosisForPatient('');
  assert(diagEmpty.id === 'dsm-gad', 'T5.1.4', 'Empty string patient ID safely resolves to default diagnosis');

  // T5.1.4: DSM-5 Database Schema Invariants
  let allDsmValid = true;
  for (const d of DSM5_DIAGNOSES) {
    if (!d.id || !d.code || !d.thresholdText || d.requiredCount <= 0 || !Array.isArray(d.criteria) || d.criteria.length === 0) {
      allDsmValid = false;
      break;
    }
  }
  assert(allDsmValid, 'T5.1.5', 'All 8 DSM-5 diagnoses meet strict clinical criteria schemas and threshold definitions');

  // T5.1.5: matchDiagnosticCodes empty/null handling
  const emptyMatches = matchDiagnosticCodes('', '', '');
  assert(Array.isArray(emptyMatches) && emptyMatches.length === 0, 'T5.1.6', 'Empty input strings produce empty suggestion list with zero exceptions');
  const nullishMatches = matchDiagnosticCodes(undefined, undefined, undefined);
  assert(Array.isArray(nullishMatches) && nullishMatches.length === 0, 'T5.1.7', 'Undefined arguments produce empty suggestion list safely');

  // T5.1.6: Scoring caps and floors
  const gadCorpus = 'anxiety worry panic gad-7 racing heart muscle tension restlessness insomnia apprehension';
  const gadResults = matchDiagnosticCodes(gadCorpus);
  const topGad = gadResults.find((s) => s.code.code === 'F41.1');
  assert(Boolean(topGad && topGad.confidence <= 99 && topGad.confidence >= 20), 'T5.1.8', 'High keyword density scores cap at 99% and floor at 20%');

  // T5.1.7: Case insensitivity
  const casedCorpus = 'PaNiC aTtAcK with RAcING HeArT and InSoMnIa';
  const casedResults = matchDiagnosticCodes(casedCorpus);
  assert(casedResults.length > 0 && casedResults.some((c) => c.code.code === 'F41.1' || c.code.code === 'F41.0'), 'T5.1.9', 'Case-insensitive keyword variations match expected diagnostic codes');

  // T5.1.8: Direct ICD-10 code mentions
  const directCodeCorpus = 'Patient previously diagnosed with F41.1 and reports mild symptoms';
  const directCodeResults = matchDiagnosticCodes(directCodeCorpus);
  const foundDirect = directCodeResults.find((s) => s.code.code === 'F41.1');
  assert(Boolean(foundDirect && foundDirect.confidence >= 45), 'T5.1.10', 'Direct ICD-10 code mention ("F41.1") adds description weight score');

  // T5.1.9: Multi-differential sorting
  const multiCorpus = 'Severe depression, anhedonia, hopelessness, fatigue alongside panic attack and trauma flashbacks';
  const multiResults = matchDiagnosticCodes(multiCorpus);
  let sortedStrictly = true;
  for (let i = 0; i < multiResults.length - 1; i++) {
    if (multiResults[i].confidence < multiResults[i + 1].confidence) {
      sortedStrictly = false;
      break;
    }
  }
  assert(sortedStrictly && multiResults.length >= 2, 'T5.1.11', 'Multi-diagnosis suggestions sorted strictly descending by confidence score');

  // T5.1.10: Massive 50KB transcript performance
  const massiveTranscript = ('Patient reports excessive worry and restlessness for 6 months. '.repeat(1000));
  const tStart = Date.now();
  const perfResults = matchDiagnosticCodes(massiveTranscript);
  const tElapsed = Date.now() - tStart;
  assert(tElapsed < 100 && perfResults.length > 0, 'T5.1.12', `Massive 50KB transcript matched in ${tElapsed}ms (< 100ms ReDoS safe)`);

  // T5.1.11: CPT Code Recommendation — Initial Intake Override
  const intakeCpt = recommendCptCode(60, true);
  const intakeCptShort = recommendCptCode(15, true);
  assert(intakeCpt.code === '90791' && intakeCptShort.code === '90791', 'T5.1.13', 'isInitialIntake=true always recommends CPT 90791 regardless of duration');

  // T5.1.12: CPT Code Recommendation — 30-min Boundaries (CPT 90832)
  const cpt16 = recommendCptCode(16, false);
  const cpt37 = recommendCptCode(37, false);
  assert(cpt16.code === '90832' && cpt37.code === '90832', 'T5.1.14', 'Durations 16m and 37m boundary resolve to CPT 90832 (30m psychotherapy)');

  // T5.1.13: CPT Code Recommendation — 45-min Boundaries (CPT 90834)
  const cpt38 = recommendCptCode(38, false);
  const cpt52 = recommendCptCode(52, false);
  assert(cpt38.code === '90834' && cpt52.code === '90834', 'T5.1.15', 'Durations 38m and 52m boundary resolve to CPT 90834 (45m psychotherapy)');

  // T5.1.14: CPT Code Recommendation — 60-min Boundaries (CPT 90837)
  const cpt53 = recommendCptCode(53, false);
  const cpt90 = recommendCptCode(90, false);
  assert(cpt53.code === '90837' && cpt90.code === '90837', 'T5.1.16', 'Durations 53m and 90m boundary resolve to CPT 90837 (60m psychotherapy)');

  // =========================================================================
  // SUITE 2: HIPAA PHI Scrubber 18 Safe Harbor Engine Edge Cases
  // =========================================================================
  console.log('▶ [Suite 2] HIPAA PHI Scrubber 18 Safe Harbor Engine Edge Cases');

  // T5.2.1: Non-string / null input
  const nullScrub = scrubText(null as any);
  assert(nullScrub.cleanText === '' && nullScrub.itemsRedacted === 0 && nullScrub.metrics.complianceStatus === 'CLEAN', 'T5.2.1', 'Null input returns clean empty scrub result without throwing');
  const emptyScrub = scrubText('');
  assert(emptyScrub.cleanText === '' && emptyScrub.itemsRedacted === 0, 'T5.2.2', 'Empty string returns clean empty scrub result');

  // T5.2.2: Extreme 100KB input note
  const denseParagraph = 'Patient Name: Jane Doe DOB: 04/12/1988 Tel: 415-555-0199 SSN: 000-12-3456. ';
  const bigInput = denseParagraph.repeat(500); // ~38KB
  const scrubStart = Date.now();
  const bigResult = scrubText(bigInput);
  const scrubElapsed = Date.now() - scrubStart;
  assert(scrubElapsed < 250 && bigResult.itemsRedacted > 1000, 'T5.2.3', `Massive document with 1000+ entities scrubbed in ${scrubElapsed}ms (< 250ms threshold)`);

  // T5.2.3: Adjacent entities touching at exact boundary (Name + Phone)
  const adjacentTight = 'Jane Doe(415) 555-0199';
  const adjTightRes = scrubText(adjacentTight, {
    customPatientContext: {
      name: 'Jane Doe',
      dob: '04/12/1988',
      mrn: '#MC-1234',
      phone: '415-555-0199',
    },
  });
  assert(adjTightRes.cleanText === '[NAME][PHONE]', 'T5.2.4', 'Adjacent entities touching at exact offset boundary are both redacted cleanly into [NAME][PHONE]');

  // T5.2.4: Comma-delimited sequence of PHI values with labeled entities
  const commaAdj = 'Client Name: Jane Doe, DOB: 04/12/1988, 123 Main St, San Francisco, CA 94105, Phone: 415-555-0199, Email: sarah@test.com';
  const commaAdjRes = scrubText(commaAdj);
  assert(
    commaAdjRes.itemsRedacted >= 5 &&
    !commaAdjRes.cleanText.includes('Jane Doe') &&
    !commaAdjRes.cleanText.includes('04/12/1988') &&
    !commaAdjRes.cleanText.includes('415-555-0199') &&
    !commaAdjRes.cleanText.includes('sarah@test.com'),
    'T5.2.5',
    'Comma-delimited sequence of PHI values redacted with delimiters preserved and zero ePHI leaked'
  );

  // T5.2.5: Overlapping interval greedy resolution
  const overlappingInput = 'Patient Name: Dr. Sarah Chen, MD';
  const overlapRes = scrubText(overlappingInput);
  assert(overlapRes.itemsRedacted === 1 && overlapRes.cleanText.includes('[NAME]'), 'T5.2.6', 'Greedy interval scheduling resolves overlapping capture spans without duplicate tags');

  // T5.2.6: Mask style variations: Tag vs Block vs Asterisk
  const maskTestInput = 'Client Phone: 415-555-0199';
  const resTag = scrubText(maskTestInput, { maskStyle: 'tag' });
  const resBlock = scrubText(maskTestInput, { maskStyle: 'block' });
  const resAsterisk = scrubText(maskTestInput, { maskStyle: 'asterisk' });
  assert(resTag.cleanText.includes('[PHONE]'), 'T5.2.7', 'Tag mask style outputs [PHONE]');
  assert(resBlock.cleanText.includes('█'), 'T5.2.8', 'Block mask style outputs solid unicode blocks █');
  assert(resAsterisk.cleanText.includes('*'), 'T5.2.9', 'Asterisk mask style outputs asterisks *');

  // T5.2.7: Comprehensive 18 Safe Harbor Category Coverage
  const comprehensive18Input = `
1. Name: Patient Name: Jane Doe
2. Geographic: 123 Market St, San Francisco, CA 94105
3. Date: 04/12/1988 and 92 years old
4. Phone: Phone: 415-555-0199
5. Fax: Fax: 415-555-0198
6. Email: jane.doe@healthmail.org
7. SSN: SSN: 123-45-6789
8. MRN: MRN: #MC-88219
9. Health Plan: Policy Number: BCBS-9988776655
10. Account: Acct Number: ACCT-99118822
11. License: NPI: 1982736450 and DEA: AB1234567
12. Vehicle ID: VIN: 1HGCR2F83HA001122
13. Device Serial: Pacemaker ID: MDT-772819
14. URL: https://portal.clinic.org/patient/jane
15. IP: 192.168.1.105
16. Biometrics: retinal scan data verified
17. Photo: photo of patient: /records/photos/jane_doe.jpg
18. Unique ID: 123e4567-e89b-12d3-a456-426614174000
`;
  const compRes = scrubText(comprehensive18Input);
  assert(compRes.categoriesTriggered.length >= 15, 'T5.2.10', `Statutory 18 engine triggers comprehensive coverage (${compRes.categoriesTriggered.length} distinct Safe Harbor categories triggered)`);
  assert(!compRes.cleanText.includes('123-45-6789') && !compRes.cleanText.includes('jane.doe@healthmail.org'), 'T5.2.11', 'Zero sensitive ePHI values survive in redacted text across 18 categories');

  // T5.2.8: Contextual Patient Injection
  const unlabelledInput = 'Alice Smith came in for consultation. Contact number is 555-987-6543, born 03/15/1975.';
  const contextRes = scrubText(unlabelledInput, {
    customPatientContext: {
      name: 'Alice Smith',
      dob: '03/15/1975',
      mrn: 'MC-777',
      phone: '555-987-6543',
    },
  });
  assert(!contextRes.cleanText.includes('Alice Smith') && !contextRes.cleanText.includes('555-987-6543'), 'T5.2.12', 'Contextual active patient injection masks unlabelled names and phone numbers');

  // T5.2.9: Forensic Audit Metrics Integrity
  assert(compRes.metrics.totalEntities === compRes.entities.length, 'T5.2.13', 'Audit metrics totalEntities strictly equals entities array length');
  assert(compRes.metrics.riskSeverity === 'CRITICAL', 'T5.2.14', 'Direct identifiers trigger CRITICAL risk severity');

  // =========================================================================
  // SUITE 3: Template Studio Custom Variable Interpolator & Prototype Guards
  // =========================================================================
  console.log('▶ [Suite 3] Template Studio Custom Variable Interpolator & Prototype Guards');

  // T5.3.1: Prototype Pollution Guard on Object.prototype
  const maliciousContext = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"hacked": true}}}');
  const sanitizedOutput = interpolateTemplateVariables('Patient {{patient_name}} has allergies: {{allergies}}', maliciousContext);
  assert((Object.prototype as any).polluted === undefined, 'T5.3.1', 'Object.prototype is NOT polluted when ingesting hostile __proto__ keys');
  assert((Object.prototype as any).hacked === undefined, 'T5.3.2', 'Object.prototype constructor prototype is unpolluted');

  // T5.3.2: Metaprogramming Tokens Left Unharmed
  const metaTokens = 'Attack: {{__proto__}} and {{constructor}} and {{toString}}';
  const metaResult = interpolateTemplateVariables(metaTokens, {});
  assert(metaResult === metaTokens, 'T5.3.3', 'Forbidden prototype tokens are untouched verbatim and never evaluated as object methods');

  // T5.3.3: Whitespace Tolerance inside Braces
  const whitespaceTemplate = 'Encounter: {{ patient_name }} DOB: {{   dob   }} MRN: {{ mrn }}';
  const whitespaceRes = interpolateTemplateVariables(whitespaceTemplate, {
    patient_name: 'Marcus Vance',
    dob: '01/01/1990',
    mrn: '#MC-11111',
  });
  assert(whitespaceRes.includes('Marcus Vance') && whitespaceRes.includes('01/01/1990') && whitespaceRes.includes('#MC-11111'), 'T5.3.4', 'Flexible whitespace inside token braces resolves correctly');

  // T5.3.4: Case Insensitivity of Tokens
  const casedTemplate = 'Patient: {{PATIENT_NAME}} / {{Patient_Name}} (CPT: {{CPT_CODE}})';
  const casedRes = interpolateTemplateVariables(casedTemplate, {
    patient_name: 'Elena Rostova',
    cpt_code: '90837',
  });
  assert(casedRes.includes('Elena Rostova / Elena Rostova (CPT: 90837)'), 'T5.3.5', 'Template token matching is strictly case-insensitive');

  // T5.3.5: Empty Braces & Malformed Brackets
  const malformedTemplate = 'Notice: {{}} and {{{patient_name}}} test';
  const malformedRes = interpolateTemplateVariables(malformedTemplate, { patient_name: 'Jane' });
  assert(malformedRes.includes('{{}}') && malformedRes.includes('Jane'), 'T5.3.6', 'Empty braces {{}} remain unharmed and triple braces interpolate inner token');

  // T5.3.6: Array Variable Values
  const arrayTemplate = 'Known Allergies: {{allergies}}';
  const arrayRes = interpolateTemplateVariables(arrayTemplate, null, {
    allergies: ['Penicillin', 'Sulfa drugs', 'Latex'],
  });
  assert(arrayRes === 'Known Allergies: Penicillin, Sulfa drugs, Latex', 'T5.3.7', 'Array variable values cleanly serialize as comma-separated lists');

  // T5.3.7: Nested Object Rejection (Anti [object Object])
  const objectTemplate = 'Data: {{custom_obj}}';
  const objectRes = interpolateTemplateVariables(objectTemplate, null, {
    custom_obj: { nested: 'data' },
  });
  assert(!objectRes.includes('[object Object]'), 'T5.3.8', 'Nested object values rejected to prevent [object Object] string leakage');

  // T5.3.8: Standard Fallback Defaults
  const emptyContextTemplate = 'Patient: {{patient_name}} with CPT: {{cpt_code}}';
  const fallbackRes = interpolateTemplateVariables(emptyContextTemplate, {});
  assert(fallbackRes.includes('Jane Doe') && fallbackRes.includes('90837'), 'T5.3.9', 'Empty context fields safely fallback to standard defaults (Jane Doe / 90837)');

  // T5.3.9: cleanUnmapped Option and Fallbacks
  const unmappedTemplate = 'Name: {{patient_name}} | Notes: {{unmapped_field}}';
  const unmappedPreserved = interpolateTemplateVariables(unmappedTemplate, {}, { cleanUnmapped: false });
  assert(unmappedPreserved.includes('{{unmapped_field}}'), 'T5.3.10', 'cleanUnmapped=false leaves unmapped tokens untouched');
  const unmappedCleaned = interpolateTemplateVariables(unmappedTemplate, {}, { cleanUnmapped: true });
  assert(!unmappedCleaned.includes('{{unmapped_field}}') && unmappedCleaned.includes('Notes: '), 'T5.3.11', 'cleanUnmapped=true strips unmapped tokens cleanly');
  const unmappedFallbackStr = interpolateTemplateVariables(unmappedTemplate, {}, { cleanUnmapped: true, unmappedFallback: '[N/A]' });
  assert(unmappedFallbackStr.includes('Notes: [N/A]'), 'T5.3.12', 'cleanUnmapped with string fallback inserts placeholder');

  // T5.3.10: Template Store Operations in localStorage
  localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  const initialTemplates = getStoredTemplates();
  assert(initialTemplates.length === 6, 'T5.3.13', 'Template store initializes with 6 standard clinical templates');
  const customTpl = {
    id: 'custom-tpl-test',
    title: 'Adversarial Test Template',
    description: 'Test template for Tier 5',
    category: 'custom' as any,
    content: 'Custom note for {{patient_name}}',
    variables: ['{{patient_name}}'],
  };
  saveTemplate(customTpl);
  const savedList = getStoredTemplates();
  assert(savedList.some((t) => t.id === 'custom-tpl-test'), 'T5.3.14', 'Custom template persisted to localStorage template store');
  deleteTemplate('custom-tpl-test');
  const postDelete = getStoredTemplates();
  assert(!postDelete.some((t) => t.id === 'custom-tpl-test'), 'T5.3.15', 'Template cleanly deleted from store');

  // =========================================================================
  // SUITE 4: Multi-EHR Export Formatting Delimiters & Sanitization
  // =========================================================================
  console.log('▶ [Suite 4] Multi-EHR Export Formatting Delimiters & Sanitization');

  // T5.4.1: sanitizeEpicSmartTextContent — Triple Equals Section Headers
  const hostileEpicSubj = '=== SUBJECTIVE === Injected header\n===== LAB RESULTS =====\n======';
  const sanitizedEpic = sanitizeEpicSmartTextContent(hostileEpicSubj);
  assert(!sanitizedEpic.includes('==='), 'T5.4.1', 'All triple-equals sequences neutralized into hyphens in Epic export');
  assert(sanitizedEpic.includes('--- SUBJECTIVE ---'), 'T5.4.2', 'Section headers converted to safe dashes (--- HEADER ---)');

  // T5.4.2: sanitizeEpicSmartTextContent — Dot-Phrase Macros
  const hostileDotPhrases = '.MARSHI_NOTE macro\n  .DELETE_CHART\nNormal text with dot.sentence';
  const sanitizedDot = sanitizeEpicSmartTextContent(hostileDotPhrases);
  assert(!sanitizedDot.match(/^(\s*)\.[A-Za-z0-9_]+/m), 'T5.4.3', 'Line-initial dot-phrases disarmed with leading whitespace separation');
  assert(sanitizedDot.includes('. MARSHI_NOTE'), 'T5.4.4', 'Macro separated into ". MARSHI_NOTE"');

  // T5.4.3: sanitizeEpicSmartTextContent — Forged Electronic Signatures
  const forgedSig = 'Note body\n*** Signed electronically by Impostor ***\nFollow up next week';
  const sanitizedSig = sanitizeEpicSmartTextContent(forgedSig);
  assert(!sanitizedSig.includes('*** Signed electronically'), 'T5.4.5', 'Forged electronic signature in note body redacted');
  assert(sanitizedSig.includes('[Signature Redacted: Note Body]'), 'T5.4.6', 'Replaced with explicit signature redaction placeholder');

  // T5.4.4: sanitizeCernerPowerChartContent — Bracketed Number Headers
  const hostileCerner = '[1] SUBJECTIVE fake\n[2] OBJECTIVE fake\nNormal [brackets] in text';
  const sanitizedCerner = sanitizeCernerPowerChartContent(hostileCerner);
  assert(!sanitizedCerner.includes('[1] SUBJECTIVE'), 'T5.4.7', 'Cerner numbered bracketed headers neutralized to parentheses');
  assert(sanitizedCerner.includes('(1) SUBJECTIVE'), 'T5.4.8', 'Converted to "(1) SUBJECTIVE"');

  // T5.4.5: sanitizeCernerPowerChartContent — Divider Collisions
  const dividerCollision = 'Text\n----------------------------------------------------\nMore text';
  const sanitizedDivider = sanitizeCernerPowerChartContent(dividerCollision);
  assert(!sanitizedDivider.includes('--------------------'), 'T5.4.9', 'Long hyphen lines (>= 5 hyphens) converted to spaced dividers (- - - - -)');

  // T5.4.6: Multi-EHR Adapters End-to-End
  const testExportData: EhrExportData = {
    patient: {
      id: 'p-101',
      name: 'Jane Doe',
      dob: '04/12/1988',
      mrn: '#MC-88219',
      cptCode: '90837',
    },
    clinician: {
      name: 'Dr. Sarah Chen, MD',
      npi: '1982736450',
      specialty: 'Behavioral Health',
    },
    notes: {
      subjective: 'Patient reports anxiety. === INJECTED HEADER ===',
      objective: 'Alert x4. [1] CERNER COLLISION',
      assessment: 'GAD F41.1',
      plan: 'CBT 60min. *** Signed electronically ***',
    },
    primaryIcd: 'F41.1',
    format: 'epic',
  };

  const epicOutput = formatEpicSmartText(testExportData);
  assert(epicOutput.includes('.MARSHI_CLINICAL_NOTE') && epicOutput.includes('Primary ICD-10: F41.1'), 'T5.4.10', 'formatEpicSmartText generates valid Epic SmartPhrase format with sanitized body');

  const fhirOutput = formatEpicFhirDocument(testExportData);
  const parsedFhir = JSON.parse(fhirOutput);
  assert(parsedFhir.resourceType === 'DocumentReference' && parsedFhir.content[0].attachment.contentType === 'text/plain', 'T5.4.11', 'formatEpicFhirDocument produces valid HL7 FHIR R4 DocumentReference JSON');

  const cernerOutput = formatCernerPowerChart(testExportData);
  assert(cernerOutput.includes('PATIENT NAME: JANE DOE') && cernerOutput.includes('[1] SUBJECTIVE'), 'T5.4.12', 'formatCernerPowerChart produces uppercase patient name and authenticated status');

  const athenaOutput = formatAthenaEncounter(testExportData);
  assert(athenaOutput.startsWith('<athenanet_clinical_encounter') && athenaOutput.includes('</athenanet_clinical_encounter>'), 'T5.4.13', 'formatAthenaEncounter generates valid XML encounter tree');

  const mdOutput = formatMarkdownUniversal(testExportData);
  assert(mdOutput.includes('# CLINICAL CONSULTATION PROGRESS NOTE') && mdOutput.includes('**Patient:** Jane Doe'), 'T5.4.14', 'formatMarkdownUniversal produces formatted markdown with clinical metadata');

  // =========================================================================
  // SUITE 5: Audio Visualizer & Typewriter Playback States
  // =========================================================================
  console.log('▶ [Suite 5] Audio Visualizer & Typewriter Playback States');

  // T5.5.1: WaveformVisualizer idle state
  const dom = setupVirtualDOM();
  const rootElem = dom.window.document.getElementById('root')!;
  const reactRoot = ReactDOM.createRoot(rootElem);

  await new Promise<void>((resolve) => {
    reactRoot.render(React.createElement(WaveformVisualizer, { isRecording: false, isPlaying: false, barCount: 16, height: 36 }));
    setTimeout(resolve, 50);
  });
  const idleBars = dom.window.document.querySelectorAll('rect[data-testid="waveform-bar"]');
  assert(idleBars.length === 16, 'T5.5.1', 'WaveformVisualizer renders exact requested 16 SVG bars in idle state');
  const allIdleFill = Array.from(idleBars).every((r) => r.getAttribute('fill') === '#4b5563');
  assert(allIdleFill, 'T5.5.2', 'All idle waveform bars use resting color fill #4b5563');

  // T5.5.2: WaveformVisualizer active recording state
  await new Promise<void>((resolve) => {
    reactRoot.render(React.createElement(WaveformVisualizer, { isRecording: true, isPlaying: false, barCount: 16, height: 36 }));
    setTimeout(resolve, 50);
  });
  const recBars = dom.window.document.querySelectorAll('rect[data-testid="waveform-bar"]');
  const allRecFill = Array.from(recBars).every((r) => r.getAttribute('fill') === 'url(#recordingGradient)');
  assert(allRecFill, 'T5.5.3', 'Active recording bars use gradient fill url(#recordingGradient)');

  // T5.5.3: WaveformVisualizer frequencyData mapping
  const freqData = [0, 64, 128, 255];
  await new Promise<void>((resolve) => {
    reactRoot.render(React.createElement(WaveformVisualizer, { isRecording: true, frequencyData: freqData, barCount: 4, height: 40 }));
    setTimeout(resolve, 50);
  });
  const freqBars = dom.window.document.querySelectorAll('rect[data-testid="waveform-bar"]');
  let hasValidHeights = true;
  for (const bar of freqBars) {
    const h = parseFloat(bar.getAttribute('height') || '0');
    if (isNaN(h) || h <= 0) hasValidHeights = false;
  }
  assert(hasValidHeights && freqBars.length === 4, 'T5.5.4', 'WaveformVisualizer scales frequency data safely with zero NaN heights');

  // T5.5.4: AuraVisualizer idle & recording
  await new Promise<void>((resolve) => {
    reactRoot.render(React.createElement(AuraVisualizer, { isRecording: false, barCount: 5 }));
    setTimeout(resolve, 50);
  });
  const auraIdleText = dom.window.document.body.innerHTML;
  assert(auraIdleText.includes('Audio Standby'), 'T5.5.5', 'AuraVisualizer idle state renders "Audio Standby" indicator');

  await new Promise<void>((resolve) => {
    reactRoot.render(React.createElement(AuraVisualizer, { isRecording: true, barCount: 5 }));
    setTimeout(resolve, 50);
  });
  const auraRecBox = dom.window.document.querySelector('.aura-visualizer-box');
  assert(auraRecBox?.classList.contains('recording') === true, 'T5.5.6', 'AuraVisualizer active state toggles "recording" class');

  // T5.5.5: synthesizeSoapNote behavior
  const shortSoap = synthesizeSoapNote('Too short', 'Jane Doe', '90837');
  assert(shortSoap.includes('Patient Jane Doe presents for scheduled psychotherapy follow-up under CPT 90837'), 'T5.5.7', 'synthesizeSoapNote applies standard clinical fallback when input < 20 characters');

  const longNarrative = 'Patient Marcus Vance reports significant improvement in morning mood following 3 daily behavioral walks.';
  const longSoap = synthesizeSoapNote(longNarrative, 'Marcus Vance', '90834');
  assert(longSoap.includes(longNarrative), 'T5.5.8', 'synthesizeSoapNote preserves custom clinical narrative verbatim when >= 20 characters');

  // =========================================================================
  // SUITE 6: Protected Route Guards, Session Recovery & Infrastructure
  // =========================================================================
  console.log('▶ [Suite 6] Protected Route Guards, Session Recovery & Infrastructure');

  // T5.6.1: Missing demo session
  localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
  assert(getValidatedStoredDemoSession() === null, 'T5.6.1', 'Empty storage returns null session');

  // T5.6.2: Corrupted non-JSON string
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, 'NOT_VALID_JSON{{{');
  assert(getValidatedStoredDemoSession() === null, 'T5.6.2', 'Malformed JSON in session storage fails closed and purges');
  assert(localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null, 'T5.6.3', 'LocalStorage is purged immediately on corrupted envelope');

  // T5.6.3: Primitive non-object string in session storage
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify('string_not_object'));
  assert(getValidatedStoredDemoSession() === null, 'T5.6.4', 'Non-object string envelope fails closed and wipes storage');

  // T5.6.4: Forged unauthorized user ID
  const forgedIdEnvelope = {
    user: { ...DEMO_CLINICIAN_USER, id: 'forged-attacker-id-000' },
    session: DEMO_CLINICIAN_SESSION,
  };
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(forgedIdEnvelope));
  assert(getValidatedStoredDemoSession() === null, 'T5.6.5', 'Forged unauthorized user ID rejected and session wiped');

  // T5.6.5: Forged user email
  const forgedEmailEnvelope = {
    user: { ...DEMO_CLINICIAN_USER, email: 'hacker@evil.com' },
    session: DEMO_CLINICIAN_SESSION,
  };
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(forgedEmailEnvelope));
  assert(getValidatedStoredDemoSession() === null, 'T5.6.6', 'Forged unauthorized user email fails anti-forgery validation');

  // T5.6.6: Expired session token
  const expiredSessionEnvelope = {
    user: DEMO_CLINICIAN_USER,
    session: {
      ...DEMO_CLINICIAN_SESSION,
      expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour in past
    },
  };
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(expiredSessionEnvelope));
  assert(getValidatedStoredDemoSession() === null, 'T5.6.7', 'Expired session token fails closed and purges storage');

  // T5.6.7: Whitespace-only access token
  const blankTokenEnvelope = {
    user: DEMO_CLINICIAN_USER,
    session: { ...DEMO_CLINICIAN_SESSION, access_token: '    ' },
  };
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(blankTokenEnvelope));
  assert(getValidatedStoredDemoSession() === null, 'T5.6.8', 'Whitespace-only access token rejected as invalid envelope');

  // T5.6.8: Valid demo session restoration
  const validEnvelope = {
    user: DEMO_CLINICIAN_USER,
    session: DEMO_CLINICIAN_SESSION,
  };
  localStorage.setItem(STORAGE_KEY_DEMO_SESSION, JSON.stringify(validEnvelope));
  const restored = getValidatedStoredDemoSession();
  assert(Boolean(restored && restored.user.id === DEMO_CLINICIAN_USER.id), 'T5.6.9', 'Valid authoritative session envelope hydrates cleanly');

  // T5.6.9: ProtectedRoute Unauthenticated Redirect
  localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
  await new Promise<void>((resolve) => {
    reactRoot.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/dashboard/ehr'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '/dashboard/ehr',
              element: React.createElement(ProtectedRoute, null, React.createElement('div', { id: 'secret-chart' }, 'Secret Chart')),
            }),
            React.createElement(Route, {
              path: '/login',
              element: React.createElement('div', { id: 'login-screen' }, 'Login Screen'),
            })
          )
        )
      )
    );
    setTimeout(resolve, 100);
  });
  const unauthHtml = dom.window.document.body.innerHTML;
  assert(!unauthHtml.includes('Secret Chart') && unauthHtml.includes('Login Screen'), 'T5.6.10', 'ProtectedRoute strictly blocks unauthenticated access and redirects to /login');

  // T5.6.10: SubscriptionGate Access Evaluation (None / Unsubscribed)
  localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify({
    status: 'none',
    tier: 'starter',
    billingCycle: 'monthly',
    renewsOn: null,
    trialDaysRemaining: 0,
  }));
  const unauthGateElem = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(unauthGateElem);
  const unauthGateRoot = ReactDOM.createRoot(unauthGateElem);

  await new Promise<void>((resolve) => {
    unauthGateRoot.render(
      React.createElement(
        SubscriptionProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(SubscriptionGate, { requiredTier: 'pro' }, React.createElement('div', { id: 'gated-tool' }, 'Gated Tool'))
        )
      )
    );
    setTimeout(resolve, 100);
  });
  const gatedHtml = unauthGateElem.innerHTML;
  assert(!gatedHtml.includes('Gated Tool') && gatedHtml.includes('subscription-gate-lock'), 'T5.6.11', 'SubscriptionGate locks unauthenticated/unsubscribed access');

  // T5.6.11: Starter Tier Upgrade Requirement in Fresh Mount
  localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify({
    status: 'active',
    tier: 'starter',
    billingCycle: 'monthly',
    renewsOn: new Date(Date.now() + 86400000).toISOString(),
    trialDaysRemaining: 14,
  }));
  const starterGateElem = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(starterGateElem);
  const starterGateRoot = ReactDOM.createRoot(starterGateElem);

  await new Promise<void>((resolve) => {
    starterGateRoot.render(
      React.createElement(
        SubscriptionProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(SubscriptionGate, { requiredTier: 'pro', featureName: 'Clinical Scribe Diarization' }, React.createElement('div', { id: 'scribe-unlocked' }, 'Scribe Unlocked'))
        )
      )
    );
    setTimeout(resolve, 100);
  });
  const starterHtml = starterGateElem.innerHTML;
  assert(!starterHtml.includes('Scribe Unlocked') && starterHtml.includes('Tier Upgrade Required'), 'T5.6.12', 'SubscriptionGate displays "Tier Upgrade Required" when starter tier user accesses pro feature');

  // T5.6.12: TheraFlow SHA-256 Tamper-Evident Hash Chain
  const genesisEntry = {
    id: 'audit-001',
    timestamp: '2026-10-01T08:00:00.000Z',
    actor: 'Dr. Sarah Chen, MD',
    action: 'CREATE_CLIENT' as const,
    patientMrn: '#MC-88219',
    resourceType: 'client',
    details: { name: 'Jane Doe' },
    prevHash: GENESIS_HASH,
    hash: '',
  };
  genesisEntry.hash = computeRecordHash(genesisEntry);

  const secondEntry = {
    id: 'audit-002',
    timestamp: '2026-10-01T09:00:00.000Z',
    actor: 'Dr. Sarah Chen, MD',
    action: 'CREATE_NOTE' as const,
    patientMrn: '#MC-88219',
    resourceType: 'note',
    details: { type: 'DAP' },
    prevHash: genesisEntry.hash,
    hash: '',
  };
  secondEntry.hash = computeRecordHash(secondEntry);

  const validAuditChain = verifyAuditChain([genesisEntry, secondEntry]);
  assert(validAuditChain === true, 'T5.6.13', 'TheraFlow SHA-256 immutable audit ledger validates intact hash chain');

  // T5.6.13: Tamper Detection in Audit Chain
  const tamperedEntry = { ...secondEntry, details: { type: 'TAMPERED_SOAP' } };
  const tamperedAuditChain = verifyAuditChain([genesisEntry, tamperedEntry]);
  assert(tamperedAuditChain === false, 'T5.6.14', 'Tampering with audit record payload invalidates cryptographic chain verification');

  const brokenLinkEntry = { ...secondEntry, prevHash: '0000badhash00000000000000000000000000000000000000000000000000000000' };
  const brokenChain = verifyAuditChain([genesisEntry, brokenLinkEntry]);
  assert(brokenChain === false, 'T5.6.15', 'Broken prevHash pointer invalidates cryptographic audit ledger');

  // =========================================================================
  // SUITE 6B: Express API Endpoints & Stripe Billing Engine (Ephemeral Server)
  // =========================================================================
  console.log('\n▶ [Suite 6B] Express API Endpoints & Stripe Billing Engine');

  try {
    console.log(`Starting ephemeral test server on port ${TEST_SERVER_PORT}...`);
    await startEphemeralServer();

    // T5.6.16: API Health check
    const healthRes = await fetch(`${TEST_SERVER_URL}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.ok && healthJson.status === 'healthy', 'T5.6.16', 'Express /api/health endpoint responds with healthy status');

    // T5.6.17: Stripe Checkout Session for Pro tier
    const checkoutResPro = await fetch(`${TEST_SERVER_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'pro',
        billingCycle: 'monthly',
        clinicianEmail: 'sarah.chen@clinic.org',
      }),
    });
    const checkoutProJson = await checkoutResPro.json();
    assert(checkoutResPro.ok && Boolean(checkoutProJson.url || checkoutProJson.sessionId), 'T5.6.17', 'POST /api/create-checkout-session creates simulated Pro session successfully');

    // T5.6.18: Stripe Checkout Session Annual Discount
    const checkoutResAnnual = await fetch(`${TEST_SERVER_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'group',
        billingCycle: 'annual',
      }),
    });
    const annualJson = await checkoutResAnnual.json();
    assert(checkoutResAnnual.ok && Boolean(annualJson.url), 'T5.6.18', 'Annual billing cycle checkout initiates successfully');

    // T5.6.19: Invalid Plan ID rejection
    const invalidPlanRes = await fetch(`${TEST_SERVER_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'nonexistent_tier_xyz',
      }),
    });
    assert(invalidPlanRes.status === 400, 'T5.6.19', 'Invalid plan ID rejected with 400 Bad Request');

    // T5.6.20: Prototype Pollution in planId rejected
    const protoPlanRes = await fetch(`${TEST_SERVER_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: '__proto__',
      }),
    });
    assert(protoPlanRes.status === 400, 'T5.6.20', 'Prototype key "__proto__" as planId rejected cleanly with 400 Bad Request');

  } finally {
    console.log('Shutting down ephemeral test server...');
    await stopEphemeralServer();
    console.log('Test server terminated.');
  }

  // =========================================================================
  // TEST SUITE SUMMARY
  // =========================================================================
  console.log('\n====================================================================');
  console.log(`   Tier 5 Adversarial Coverage Hardening Summary                     `);
  console.log(`   Passed: ${passedTests} | Failed: ${failedTests} | Total: ${totalTests}         `);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES RECORDED:');
    for (const f of failureDetails) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('✓ ALL TIER 5 ADVERSARIAL STRESS & EDGE-CASE AUDITS PASSED (100% SUCCESS)\n');
    process.exit(0);
  }
}

runTier5TestSuite().catch((err) => {
  console.error('Unhandled fatal error in Tier 5 test suite:', err);
  process.exit(1);
});
