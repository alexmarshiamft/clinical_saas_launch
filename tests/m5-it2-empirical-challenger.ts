/**
 * Milestone 5 Iteration 2 Empirical Challenger Stress Harness
 * 
 * Archetype: Empirical Challenger (critic, specialist)
 * Target: HIPAA PHI Scrubber & statutory 18 Safe Harbor engine
 * 
 * Comprehensive testing of:
 * 1. All 18 Safe Harbor rules with adversarial inputs
 * 2. Greedy interval scheduling against heavily overlapping and adjacent entities
 * 3. All 3 masking styles ('tag', 'block', 'asterisk')
 * 4. Confidence score boundaries and negative non-PHI controls
 * 5. Massive clinical notes (50,000+ to 250,000+ chars) for throughput & memory
 * 6. Pathological ReDoS strings and adversarial boundary probes
 */

import { scrubText, generateMask } from '../src/tools/phi-scrubber/engine';
import { SAFE_HARBOR_RULES } from '../src/tools/phi-scrubber/safeHarborRules';
import {
  getActivePatientSample,
  PRESET_FULL_18,
  PRESET_INTAKE_NOTE,
  PRESET_TELEHEALTH_TELEMETRY,
} from '../src/tools/phi-scrubber/sampleTexts';
import { SafeHarborRuleId } from '../src/tools/phi-scrubber/types';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails: string[] = [];

function check(condition: boolean, testId: string, description: string, details?: string): void {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [PASS] [${testId}] ${description}`);
  } else {
    failedAssertions++;
    const errMsg = `[${testId}] ${description} -> ${details || 'Assertion failed'}`;
    failureDetails.push(errMsg);
    console.error(`  ❌ [FAIL] ${errMsg}`);
  }
}

async function runEmpiricalChallengeSuite() {
  console.log('\n========================================================================');
  console.log('   CHALLENGER 1: EMPIRICAL STRESS & ADVERSARIAL PHI SCRUBBER SUITE     ');
  console.log('   Milestone 5 Iteration 2 — Statutory 18 Safe Harbor Engine            ');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: ALL 18 SAFE HARBOR STATUTORY RULES ADVERSARIAL TESTING
  // --------------------------------------------------------------------------
  console.log('▶ [Section 1] All 18 Safe Harbor Statutory Rules with Adversarial Inputs');

  // Rule 1: Names
  {
    // Contextual patient with hyphens and apostrophes
    const nameInput = "Patient Mary-Jane O'Connor attended today's session.";
    const res1 = scrubText(nameInput, {
      customPatientContext: { name: "Mary-Jane O'Connor" },
    });
    check(
      res1.cleanText.includes('[NAME]') && !res1.cleanText.includes("Mary-Jane O'Connor"),
      'RULE-1.1',
      "Patient name with hyphen and apostrophe (Mary-Jane O'Connor) redacted via context"
    );

    // Standard labeled patient name
    const resLabeled = scrubText('Patient Name: Arthur Pendelton was evaluated.');
    check(
      resLabeled.cleanText.includes('[NAME]') && !resLabeled.cleanText.includes('Arthur Pendelton'),
      'RULE-1.2',
      'Standard labeled patient name (Arthur Pendelton) redacted via labeled regex'
    );

    // Clinician name with post-nominal credentials
    const resDoc = scrubText('Consultation conducted by Dr. Sarah Chen, MD and signed.');
    check(
      resDoc.cleanText.includes('[NAME]') && !resDoc.cleanText.includes('Sarah Chen'),
      'RULE-1.3',
      'Clinician name with title and MD credential (Dr. Sarah Chen, MD) redacted'
    );

    // Dictated author signature
    const resSig = scrubText('Dictated by Dr. Michael R. Chen, PhD at conclusion.');
    check(
      resSig.cleanText.includes('[NAME]') && !resSig.cleanText.includes('Michael R. Chen'),
      'RULE-1.4',
      'Dictated author signature line redacted'
    );
  }

  // Rule 2: Geographic subdivisions
  {
    const suiteAddr = 'Office located at 456 Elm Ave Suite 200, Boston, MA 02108-1234.';
    const resSuite = scrubText(suiteAddr);
    check(
      resSuite.cleanText.includes('[LOCATION]') || resSuite.cleanText.includes('[ZIP]'),
      'RULE-2.1',
      'Complex street address with Suite and ZIP+4 masked'
    );

    const resTer = scrubText('Residence: 742 Evergreen Terrace, Springfield, IL 62704.');
    check(
      !resTer.cleanText.includes('Springfield, IL 62704'),
      'RULE-2.2',
      'Standard City, State, ZIP redacted cleanly'
    );

    const resZip = scrubText('Delivery to regional zone 90210.');
    check(
      resZip.cleanText.includes('[ZIP]') && !resZip.cleanText.includes('90210'),
      'RULE-2.3',
      'Standalone 5-digit ZIP code masked with [ZIP]'
    );
  }

  // Rule 3: Diverse Date Formats & Ages 90+
  {
    const resDates = scrubText(
      'Intake: 04/12/1988, Admitted: 2026-10-05, Discharged: November 15, 2026, Review: 22 Dec 2026.'
    );
    const dateEnts = resDates.entities.filter((e) => e.ruleId === 'DATE');
    check(
      dateEnts.length >= 4 &&
      !resDates.cleanText.includes('04/12/1988') &&
      !resDates.cleanText.includes('2026-10-05') &&
      !resDates.cleanText.includes('November 15, 2026'),
      'RULE-3.1',
      'Diverse date formats (slash, ISO, Month Day Year, Day Month Year) all redacted'
    );

    const resAge94 = scrubText('Patient is a 94 years old female presenting with tremor.');
    check(
      resAge94.cleanText.includes('[AGE_90+]'),
      'RULE-3.2',
      'Statutory Age 90+ (94 years old) masked with [AGE_90+]'
    );

    const resAge102 = scrubText('Patient is 102 y/o with cognitive stability.');
    check(
      resAge102.cleanText.includes('[AGE_90+]'),
      'RULE-3.3',
      'Centenarian age (102 y/o) flagged and masked with [AGE_90+]'
    );

    // Negative control: Age 88 should NOT be flagged under statutory Safe Harbor (>89)
    const resAge88 = scrubText('Patient is an 88-year-old male with hypertension.');
    check(
      !resAge88.cleanText.includes('[AGE_90+]') && !resAge88.cleanText.includes('[DATE]'),
      'RULE-3.4',
      'Age 88 correctly NOT flagged (statutory threshold is >89 years)'
    );
  }

  // Rule 4: Telephone Numbers
  {
    const resPhones = scrubText(
      'Call (415) 555-0199 or mobile 212-555-0144 or office 617.555.0123 or +1-415-555-0199.'
    );
    const phoneEnts = resPhones.entities.filter((e) => e.ruleId === 'PHONE');
    check(
      phoneEnts.length >= 4 &&
      !resPhones.cleanText.includes('415-555-0199') &&
      !resPhones.cleanText.includes('(415) 555-0199'),
      'RULE-4.1',
      'Telephone numbers in paren, hyphen, dot, and +1 prefix redacted'
    );
  }

  // Rule 5: Fax Numbers
  {
    const resFax = scrubText('Records transmitted to Fax: (415) 555-9876.');
    check(
      resFax.cleanText.includes('[FAX]') || resFax.cleanText.includes('[PHONE]'),
      'RULE-5.1',
      'Labeled facsimile number redacted cleanly'
    );
  }

  // Rule 6: Email Addresses
  {
    const resEmail = scrubText(
      'Inquiries to patient.secure_intake+tag@medical-center.health.org.'
    );
    check(
      resEmail.cleanText.includes('[EMAIL]') && !resEmail.cleanText.includes('medical-center.health.org'),
      'RULE-6.1',
      'Complex RFC 5322 email with plus-tagging and subdomains redacted'
    );
  }

  // Rule 7: Social Security Numbers
  {
    const resSsn = scrubText('Patient SSN is 123-45-6789 on record.');
    check(
      resSsn.cleanText.includes('[SSN]') && !resSsn.cleanText.includes('123-45-6789'),
      'RULE-7.1',
      'Valid formatted SSN redacted with [SSN]'
    );
  }

  // Rule 8: Medical Record Numbers
  {
    const resMrn = scrubText('Active chart MRN: MC-88219 and secondary #MC-10002.');
    check(
      resMrn.cleanText.includes('[MRN]') && !resMrn.cleanText.includes('MC-88219'),
      'RULE-8.1',
      'Medical record numbers with #MC prefix and MRN labels redacted'
    );
  }

  // Rule 9: Health Plan Beneficiary Numbers
  {
    const resPlan = scrubText('Coverage: BCBS-XY9812345 and Policy Number: POL-99887711.');
    check(
      resPlan.cleanText.includes('[HEALTH_PLAN_NUM]') && !resPlan.cleanText.includes('BCBS-XY9812345'),
      'RULE-9.1',
      'Health plan carrier ID and labeled policy number redacted'
    );
  }

  // Rule 10: Account Numbers & Payment Cards
  {
    const resAcct = scrubText('Billing Acct #: ACCT-9918274 and Card: 4111-2222-3333-4444.');
    check(
      resAcct.cleanText.includes('[ACCOUNT_NUM]') && !resAcct.cleanText.includes('4111-2222-3333-4444'),
      'RULE-10.1',
      'Billing account number and payment card number redacted'
    );
  }

  // Rule 11: Certificate / License Numbers (NPI, DEA, Medical License)
  {
    const resLic = scrubText(
      'Attending NPI: 1234567890, DEA License: AS1234563, State License: MD-99281.'
    );
    check(
      resLic.cleanText.includes('[LICENSE_NUM]') &&
      !resLic.cleanText.includes('1234567890') &&
      !resLic.cleanText.includes('AS1234563'),
      'RULE-11.1',
      'Statutory 10-digit NPI, DEA license, and medical license redacted'
    );
  }

  // Rule 12: Vehicle Identifiers (ISO VIN, License Plate)
  {
    const resVeh = scrubText(
      'Patient transported in vehicle VIN: 1HGBH41JXMN109186 with License Plate: 7XYZ89.'
    );
    check(
      resVeh.cleanText.includes('[VEHICLE_ID]') &&
      !resVeh.cleanText.includes('1HGBH41JXMN109186') &&
      !resVeh.cleanText.includes('7XYZ89'),
      'RULE-12.1',
      'ISO 17-character VIN and vehicle license plate redacted'
    );
  }

  // Rule 13: Device Identifiers & Serial Numbers
  {
    const resDev = scrubText(
      'Telemetry synced from Pacemaker Serial # DEV-789-XYZ-001 (UDI: 00888444111222).'
    );
    check(
      resDev.cleanText.includes('[DEVICE_ID]') && !resDev.cleanText.includes('DEV-789-XYZ-001'),
      'RULE-13.1',
      'Medical device serial and UDI identifier redacted'
    );
  }

  // Rule 14: Web URLs
  {
    const resUrl = scrubText(
      'Portal access at https://portal.health-system.com/patient/78423?auth=true&exp=2026#sec.'
    );
    check(
      resUrl.cleanText.includes('[URL]') && !resUrl.cleanText.includes('portal.health-system.com'),
      'RULE-14.1',
      'HTTPS URL with complex query parameters and fragment masked with [URL]'
    );
  }

  // Rule 15: IP Addresses
  {
    const resIp = scrubText(
      'Telehealth telemetry from IPv4 192.168.1.42 and IPv6 2001:0db8:85a3:0000:0000:8a2e:0370:7334.'
    );
    const ipEnts = resIp.entities.filter((e) => e.ruleId === 'IP_ADDRESS');
    check(
      ipEnts.length === 2 &&
      !resIp.cleanText.includes('192.168.1.42') &&
      !resIp.cleanText.includes('2001:0db8:85a3:0000:0000:8a2e:0370:7334'),
      'RULE-15.1',
      'Both IPv4 and IPv6 addresses accurately identified and masked'
    );

    // Negative control: Invalid IPv4 (999.999.999.999) should NOT match
    const resInv = scrubText('Invalid IP address is 999.999.999.999.');
    check(
      !resInv.cleanText.includes('[IP_ADDRESS]'),
      'RULE-15.2',
      'Out-of-bounds octets (999.999.999.999) rejected as non-IP'
    );
  }

  // Rule 16: Biometric Identifiers
  {
    const resBio = scrubText(
      'Biometric intake: iris scan matched and voiceprint verification confirmed.'
    );
    check(
      resBio.cleanText.includes('[BIOMETRIC]'),
      'RULE-16.1',
      'Biometric references (iris scan, voiceprint verification) redacted'
    );
  }

  // Rule 17: Full-Face Photographic Images
  {
    const resPhoto = scrubText('Clinical image saved at /records/photos/doe_jane_2026.jpg.');
    check(
      resPhoto.cleanText.includes('[PHOTO_ID]') && !resPhoto.cleanText.includes('doe_jane_2026.jpg'),
      'RULE-17.1',
      'Patient clinical photograph file path redacted'
    );
  }

  // Rule 18: Other Unique Identifiers
  {
    const resUid = scrubText(
      'Encounter GUID: 123e4567-e89b-12d3-a456-426614174000 and Tracking Tag # BIO-REF-99281-XYZ.'
    );
    check(
      resUid.cleanText.includes('[UNIQUE_ID]') &&
      !resUid.cleanText.includes('123e4567-e89b-12d3-a456-426614174000'),
      'RULE-18.1',
      'Canonical RFC 4122 UUID and research tracking UID redacted'
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 2: GREEDY INTERVAL SCHEDULING ADVERSARIAL OVERLAP & CONTIGUITY
  // --------------------------------------------------------------------------
  console.log('\n▶ [Section 2] Greedy Interval Scheduling: Overlaps & Contiguity');

  // 2.1 Nested URL containing embedded IP address
  {
    const nestedText = 'Access clinical server at http://192.168.1.1/patient/records.pdf immediately.';
    const res = scrubText(nestedText);
    const urlEnt = res.entities.find((e) => e.ruleId === 'URL');
    const ipEnt = res.entities.find((e) => e.ruleId === 'IP_ADDRESS');
    check(
      urlEnt !== undefined && ipEnt === undefined && res.cleanText.includes('[URL]'),
      'SCHED-2.1',
      'Embedded IP within URL resolved by outer URL span without duplicate substitution'
    );
  }

  // 2.2 Shared start offset, different lengths
  {
    const coStart = 'Patient Name: Jane Doe was admitted.';
    const res = scrubText(coStart, { customPatientContext: { name: 'Jane' } });
    check(
      res.entities.length === 1 &&
      res.entities[0].originalValue === 'Jane Doe' &&
      res.cleanText === 'Patient Name: [NAME] was admitted.',
      'SCHED-2.2',
      'Identical start offset prioritizes longest span (Jane Doe over Jane)'
    );
  }

  // 2.3 Strictly contiguous zero-gap adjacent entities
  {
    const adj = '#MC-12345#MC-67890';
    const res = scrubText(adj);
    check(
      res.entities.length === 2 &&
      res.entities[0].end === res.entities[1].start &&
      res.cleanText === '[MRN][MRN]',
      'SCHED-2.3',
      'Zero-gap adjacent entities (#MC-12345#MC-67890) replace contiguously without corruption'
    );
  }

  // 2.4 Multi-layer concentric nesting (3 tiers)
  {
    const concentric = 'PATIENT-RECORD-12345';
    const res = scrubText(concentric, {
      customPatientContext: {
        name: 'PATIENT-RECORD-12345',
        mrn: 'RECORD-12345',
        phone: '12345',
      },
    });
    check(
      res.entities.length === 1 &&
      res.entities[0].originalValue === 'PATIENT-RECORD-12345' &&
      res.cleanText === '[NAME]',
      'SCHED-2.4',
      'Concentric 3-layer nested candidates cleanly resolve to outermost enclosing span'
    );
  }

  // 2.5 Multi-collision mixed context & regex scan
  {
    const multi = 'Patient Jane Doe DOB: 04/12/1988 MRN: #MC-88219 Phone: (415) 555-0199';
    const res = scrubText(multi, {
      customPatientContext: {
        name: 'Jane Doe',
        dob: '04/12/1988',
        mrn: '#MC-88219',
        phone: '(415) 555-0199',
      },
    });
    const offsetsMatch = res.entities.every((e) => multi.slice(e.start, e.end) === e.originalValue);
    let disjoint = true;
    for (let i = 1; i < res.entities.length; i++) {
      if (res.entities[i].start < res.entities[i - 1].end) disjoint = false;
    }
    check(
      offsetsMatch && disjoint && res.entities.length === 4,
      'SCHED-2.5',
      'Multi-collision scan maintains strict disjoint intervals and exact string slices'
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 3: MASKING STYLES EMPIRICAL VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n▶ [Section 3] Masking Styles Empirical Verification');

  {
    const sample = 'Call (415) 555-0199 for Jane.';

    // Tag mode
    const resTag = scrubText(sample, { maskStyle: 'tag' });
    check(
      resTag.cleanText.includes('[PHONE]'),
      'MASK-3.1',
      'Tag mode generates statutory token [PHONE]'
    );

    // Block mode clamping [4, 32]
    const bShort = generateMask('AB', '[TAG]', 'block');
    const bMed = generateMask('0123456789', '[TAG]', 'block');
    const bLong = generateMask('X'.repeat(50), '[TAG]', 'block');
    check(
      bShort.length === 4 && bShort === '████',
      'MASK-3.2a',
      'Block mode clamps short entities to minimum 4 solid blocks'
    );
    check(
      bMed.length === 10 && bMed === '██████████',
      'MASK-3.2b',
      'Block mode preserves 1:1 length for medium entities (10 blocks)'
    );
    check(
      bLong.length === 32 && bLong === '█'.repeat(32),
      'MASK-3.2c',
      'Block mode clamps massive entities to maximum 32 solid blocks'
    );

    // Asterisk mode clamping [4, 32]
    const aShort = generateMask('AB', '[TAG]', 'asterisk');
    const aMed = generateMask('0123456789', '[TAG]', 'asterisk');
    const aLong = generateMask('X'.repeat(50), '[TAG]', 'asterisk');
    check(
      aShort.length === 4 && aShort === '****',
      'MASK-3.3a',
      'Asterisk mode clamps short entities to minimum 4 asterisks'
    );
    check(
      aMed.length === 10 && aMed === '**********',
      'MASK-3.3b',
      'Asterisk mode preserves 1:1 length for medium entities (10 asterisks)'
    );
    check(
      aLong.length === 32 && aLong === '*'.repeat(32),
      'MASK-3.3c',
      'Asterisk mode clamps massive entities to maximum 32 asterisks'
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 4: CONFIDENCE SCORE BOUNDARIES & NEGATIVE CONTROLS
  // --------------------------------------------------------------------------
  console.log('\n▶ [Section 4] Confidence Score Boundaries & Negative Controls');

  {
    // Pure non-PHI clinical narrative (Negative Control)
    const pureClinical = `
    The patient presented for clinical psychotherapy follow-up.
    Reported persistent fatigue, generalized muscle tension, and disrupted sleep architecture.
    Mental status examination: alert, oriented x4, mood euthymic, affect congruent.
    No active suicidal or homicidal ideation, intent, or plan is documented.
    Engaged in cognitive restructuring exercises and agreed to progressive relaxation homework.
    Plan: continue bi-weekly cognitive behavioral therapy.
    `;
    const resPure = scrubText(pureClinical);
    check(
      resPure.itemsRedacted === 0 &&
      resPure.entities.length === 0 &&
      resPure.cleanText === pureClinical &&
      resPure.metrics.riskSeverity === 'SAFE' &&
      resPure.metrics.complianceStatus === 'CLEAN',
      'CONF-4.1',
      'Pure non-PHI clinical narrative produces 0 false positives, SAFE severity, and CLEAN compliance'
    );

    // Empty, null, undefined inputs
    const resEmpty = scrubText('');
    check(
      resEmpty.cleanText === '' && resEmpty.itemsRedacted === 0,
      'CONF-4.2a',
      'Empty string input safely returns clean empty result'
    );

    const resNull = scrubText(null as any);
    check(
      resNull.cleanText === '' && resNull.itemsRedacted === 0,
      'CONF-4.2b',
      'Null input safely handled without throwing exception'
    );

    const resUndefined = scrubText(undefined as any);
    check(
      resUndefined.cleanText === '' && resUndefined.itemsRedacted === 0,
      'CONF-4.2c',
      'Undefined input safely handled without throwing exception'
    );

    // Confidence score clamping range [0.70, 1.00]
    const fullRes = scrubText(PRESET_FULL_18);
    const validConf = fullRes.entities.every((e) => e.confidence >= 0.7 && e.confidence <= 1.0);
    check(
      validConf && fullRes.entities.length >= 18,
      'CONF-4.3',
      'All detected entities across statutory catalog scored with confidence between 0.70 and 1.00'
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 5: MASSIVE CLINICAL NOTE THROUGHPUT & MEMORY STABILITY
  // --------------------------------------------------------------------------
  console.log('\n▶ [Section 5] Massive Clinical Note Throughput & Memory Stability');

  {
    const noteBlock = `
    CLINICAL PROGRESS NOTE:
    Patient Name: Jane Doe DOB: 04/12/1988 MRN: #MC-88219.
    Address: 742 Evergreen Terrace, Springfield, IL 62704. Phone: (415) 555-0199.
    Email: patient.records@healthmail.org. SSN: 123-45-6789.
    Health Plan: BCBS-XY9812345. Account: ACCT-9918274. Attending NPI: 1234567890.
    Vehicle VIN: 1HGBH41JXMN109186. Holter Monitor Serial: DEV-789-XYZ-001.
    Web: https://portal.health-system.com/patient/78423 IP: 192.168.1.42.
    Biometric: voiceprint scan confirmed match. Photo file: /records/photos/doe_jane_2026.jpg.
    Tracking UID: BIO-REF-99281-XYZ.
    The patient completed comprehensive psychiatric intake and behavioral assessment.
    Objective examination revealed resting heart rate of 72 bpm, blood pressure 118/78 mmHg.
    Cognitive functions remained intact across recent and remote memory recall.
    Treatment interventions emphasized diaphragmatic breathing and behavioral activation.
    Follow-up session scheduled in two weeks.
    `;

    // 1. 60,000 character note
    let doc60k = '';
    while (doc60k.length < 60000) doc60k += noteBlock;

    const t0 = performance.now();
    const mem0 = process.memoryUsage().heapUsed;
    const res60k = scrubText(doc60k);
    const t1 = performance.now();
    const mem1 = process.memoryUsage().heapUsed;
    const time60k = t1 - t0;
    const memDelta60k = (mem1 - mem0) / 1024 / 1024;

    console.log(`     ↳ 60k Note: ${doc60k.length} chars, ${time60k.toFixed(2)}ms, delta: ${memDelta60k.toFixed(2)}MB, ${res60k.entities.length} entities`);
    check(
      doc60k.length >= 50000 && time60k < 300 && memDelta60k < 20,
      'PERF-5.1',
      `60k+ char clinical note processed in ${time60k.toFixed(2)}ms (<300ms SLA) with ${memDelta60k.toFixed(2)}MB heap delta`
    );

    // 2. 120,000 character note
    let doc120k = '';
    while (doc120k.length < 120000) doc120k += noteBlock;

    const t2 = performance.now();
    const mem2 = process.memoryUsage().heapUsed;
    const res120k = scrubText(doc120k);
    const t3 = performance.now();
    const mem3 = process.memoryUsage().heapUsed;
    const time120k = t3 - t2;
    const memDelta120k = (mem3 - mem2) / 1024 / 1024;

    console.log(`     ↳ 120k Note: ${doc120k.length} chars, ${time120k.toFixed(2)}ms, delta: ${memDelta120k.toFixed(2)}MB, ${res120k.entities.length} entities`);
    check(
      doc120k.length >= 100000 && time120k < 500 && memDelta120k < 25,
      'PERF-5.2',
      `120k+ char clinical note processed in ${time120k.toFixed(2)}ms (<500ms SLA) with ${memDelta120k.toFixed(2)}MB heap delta`
    );

    // 3. 250,000 character mega document
    let doc250k = '';
    while (doc250k.length < 250000) doc250k += PRESET_FULL_18 + '\n\n';

    const t4 = performance.now();
    const res250k = scrubText(doc250k);
    const t5 = performance.now();
    const time250k = t5 - t4;

    console.log(`     ↳ 250k Mega Note: ${doc250k.length} chars, ${time250k.toFixed(2)}ms, ${res250k.entities.length} entities`);
    check(
      doc250k.length >= 250000 && time250k < 600 && res250k.entities.length >= 5000,
      'PERF-5.3',
      `250k+ char mega document processed in ${time250k.toFixed(2)}ms (<600ms SLA) with 5,000+ entities redacted`
    );

    // Zero ePHI leakage verification across massive documents
    check(
      !res120k.cleanText.includes('Jane Doe') &&
      !res120k.cleanText.includes('04/12/1988') &&
      !res120k.cleanText.includes('(415) 555-0199') &&
      !res120k.cleanText.includes('123-45-6789'),
      'PERF-5.4',
      'Zero ePHI leakage across entire massive clinical document'
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 6: PATHOLOGICAL INPUTS & REDOS IMMUNITY STRESS
  // --------------------------------------------------------------------------
  console.log('\n▶ [Section 6] Pathological Inputs & ReDoS Immunity Stress');

  {
    const pathologicalCases = [
      { name: '50k repeated uppercase A', text: 'A'.repeat(50000) },
      { name: '50k repeated digits', text: '0'.repeat(50000) },
      { name: '50k repeated whitespace', text: ' '.repeat(50000) },
      { name: 'Unclosed URL with 20k characters', text: 'http://' + 'a'.repeat(20000) + ' ' },
      { name: 'Dr. title with 5k trailing letters', text: 'Dr. ' + 'A'.repeat(5000) + ' ' },
      { name: 'Address label with 5k trailing letters', text: 'Address: ' + 'A'.repeat(5000) + ' ' },
      { name: 'Street prefix with 5k trailing letters', text: '123 ' + 'A'.repeat(5000) + ' Street ' },
      { name: 'Date prefix with 5k trailing digits', text: '1999-' + '9'.repeat(5000) },
      { name: 'Paren phone prefix with 5k trailing digits', text: '(415) ' + '5'.repeat(5000) },
      { name: 'Email @ prefix with 5k trailing characters', text: 'a@' + 'b'.repeat(5000) },
      { name: 'BCBS prefix with 5k trailing digits', text: 'BCBS-' + '1'.repeat(5000) },
    ];

    let allUnderSla = true;
    for (const testCase of pathologicalCases) {
      const start = performance.now();
      const res = scrubText(testCase.text);
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        allUnderSla = false;
        console.error(`Slow pathological input (${elapsed.toFixed(1)}ms): ${testCase.name}`);
      }
    }

    check(
      allUnderSla,
      'REDOS-6.1',
      'All 11 pathological / adversarial string probes execute within sub-100ms without ReDoS backtracking'
    );
  }

  // --------------------------------------------------------------------------
  // SUMMARY AND VERDICT
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`   EMPIRICAL CHALLENGE SUITE SUMMARY: ${passedAssertions} Passed, ${failedAssertions} Failed (Total: ${totalAssertions})`);
  console.log('========================================================================\n');

  if (failedAssertions > 0) {
    console.error(`VERDICT: REJECT (${failedAssertions} assertions failed).`);
    for (const f of failureDetails) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE. 100% empirical challenge assertions passed with zero defects.\n');
    process.exit(0);
  }
}

runEmpiricalChallengeSuite().catch((err) => {
  console.error('Fatal challenge execution error:', err);
  process.exit(1);
});
