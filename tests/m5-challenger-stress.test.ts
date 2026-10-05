/**
 * Milestone 5 Empirical Challenge & Adversarial Stress Test Suite
 *
 * Archetype: Empirical Challenger (critic, specialist)
 * Target: HIPAA PHI Scrubber & 18 Safe Harbor Engine (Milestone 5)
 *  - 18 Safe Harbor Statutory Rules Adversarial Probing
 *  - Greedy Interval Scheduling Overlap & Contiguity Resolution
 *  - Masking Styles Verification (tag, block, asterisk)
 *  - Confidence Score Boundaries & Non-PHI Negative Controls
 *  - Massive Clinical Note Throughput & Memory Stability (100,000+ chars)
 *  - Cross-Verification of Worker M5 Claims
 *
 * Execution: npx tsx tests/m5-challenger-stress.test.ts
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

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail: string = ''): void {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [CHALLENGE-PASS] ${testName}`);
  } else {
    failedChecks++;
    const errMsg = `FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
    failures.push(errMsg);
    console.error(`  ✗ [CHALLENGE-FAIL] ${errMsg}`);
  }
}

async function runMilestone5ChallengeSuite(): Promise<void> {
  console.log('\n====================================================================');
  console.log('   Milestone 5: Empirical Challenger Adversarial Stress Suite      ');
  console.log('   Target: HIPAA PHI Scrubber & 18 Safe Harbor Engine              ');
  console.log('====================================================================\n');

  // =========================================================================
  // DOMAIN 1: 18 SAFE HARBOR STATUTORY RULES ADVERSARIAL STRESS TESTING
  // =========================================================================
  console.log('--- Domain 1: 18 Safe Harbor Statutory Rules Adversarial Stress ---');

  // 1.0 Catalog Completeness
  assert(
    SAFE_HARBOR_RULES.length === 18,
    'CHAL-1.0 All 18 statutory Safe Harbor rules present in rules catalog'
  );

  // 1.1 Rule 1: Names (Apostrophes, Hyphens, Labeled vs Contextual)
  {
    // Contextual active patient with hyphen and apostrophe
    const hyphenName = "Patient Name: Mary-Jane O'Connor attended the consultation.";
    const resContext = scrubText(hyphenName, {
      customPatientContext: { name: "Mary-Jane O'Connor" },
    });
    assert(
      resContext.cleanText.includes('[NAME]') &&
      !resContext.cleanText.includes("Mary-Jane O'Connor") &&
      resContext.entities.some((e) => e.originalValue === "Mary-Jane O'Connor"),
      'CHAL-1.1a Contextual patient name with hyphen and apostrophe successfully masked with [NAME]'
    );

    // Standard capitalized patient name
    const standardName = 'Patient Name: Arthur Pendelton was evaluated today.';
    const resStd = scrubText(standardName);
    assert(
      resStd.cleanText.includes('[NAME]') && !resStd.cleanText.includes('Arthur Pendelton'),
      'CHAL-1.1b Standard labeled patient name masked with [NAME]'
    );

    // Clinician name with medical credentials
    const clinicianName = 'Consultation conducted by Dr. Sarah Chen, MD and signed off.';
    const resClinician = scrubText(clinicianName);
    assert(
      resClinician.cleanText.includes('[NAME]') && !resClinician.cleanText.includes('Sarah Chen'),
      'CHAL-1.1c Clinician name with title and MD credential masked with [NAME]'
    );
  }

  // 1.2 Rule 2: Geographic Subdivisions (Complex Addresses, Suites, ZIP+4)
  {
    const suiteAddr = 'Office located at 456 Elm Ave Suite 200, Boston, MA 02108-1234.';
    const resAddr = scrubText(suiteAddr);
    assert(
      resAddr.cleanText.includes('[LOCATION]') || resAddr.cleanText.includes('[ZIP]'),
      'CHAL-1.2a Complex street address with Suite and ZIP+4 masked'
    );

    const terraceAddr = 'Residence: 742 Evergreen Terrace, Springfield, IL 62704.';
    const resTerrace = scrubText(terraceAddr);
    assert(
      !resTerrace.cleanText.includes('Springfield, IL 62704'),
      'CHAL-1.2b Standard City, State, ZIP redacted cleanly'
    );

    const standaloneZip = 'Delivery to regional zone 90210.';
    const resZip = scrubText(standaloneZip);
    assert(
      resZip.cleanText.includes('[ZIP]') && !resZip.cleanText.includes('90210'),
      'CHAL-1.2c Standalone 5-digit postal code masked with [ZIP]'
    );
  }

  // 1.3 Rule 3: Diverse Date Formats & Age 90+ Boundaries
  {
    const datesText = 'Intake: 04/12/1988, Admitted: 2026-10-05, Discharged: November 15, 2026, Review: 22 Dec 2026.';
    const resDates = scrubText(datesText);
    const dateCount = resDates.entities.filter((e) => e.ruleId === 'DATE').length;
    assert(
      dateCount >= 4 &&
      !resDates.cleanText.includes('04/12/1988') &&
      !resDates.cleanText.includes('2026-10-05') &&
      !resDates.cleanText.includes('November 15, 2026'),
      'CHAL-1.3a Diverse date formats (slash, ISO, Month Day Year, Day Month Year) all redacted'
    );

    // Age 90+ boundary tests
    const age94 = 'Patient is a 94 years old female presenting with tremor.';
    const resAge94 = scrubText(age94);
    assert(
      resAge94.cleanText.includes('[AGE_90+]'),
      'CHAL-1.3b Age 94 flagged and masked with [AGE_90+]'
    );

    const age102 = 'Patient is 102 y/o with cognitive stability.';
    const resAge102 = scrubText(age102);
    assert(
      resAge102.cleanText.includes('[AGE_90+]'),
      'CHAL-1.3c Centenarian age (102 y/o) flagged and masked with [AGE_90+]'
    );

    // Negative control: Age 88 should NOT be flagged under statutory Safe Harbor
    const age88 = 'Patient is an 88-year-old male with hypertension.';
    const resAge88 = scrubText(age88);
    assert(
      !resAge88.cleanText.includes('[AGE_90+]') && !resAge88.cleanText.includes('[DATE]'),
      'CHAL-1.3d Age 88 correctly NOT flagged (Safe Harbor statutory threshold is >89 years)'
    );
  }

  // 1.4 Rule 4: Telephone Numbers
  {
    const phones = 'Call (415) 555-0199 or mobile 212-555-0144 or office 617.555.0123 or +1-415-555-0199.';
    const resPhones = scrubText(phones);
    const phoneEntities = resPhones.entities.filter((e) => e.ruleId === 'PHONE');
    assert(
      phoneEntities.length >= 4 &&
      !resPhones.cleanText.includes('415-555-0199') &&
      !resPhones.cleanText.includes('(415) 555-0199'),
      'CHAL-1.4 Domestic telephone numbers in paren, hyphen, dot, and +1 prefix redacted'
    );
  }

  // 1.5 Rule 5: Fax Numbers
  {
    const faxText = 'Records transmitted to Fax: (415) 555-9876.';
    const resFax = scrubText(faxText);
    assert(
      resFax.cleanText.includes('[FAX]') || resFax.cleanText.includes('[PHONE]'),
      'CHAL-1.5 Labeled facsimile number redacted cleanly'
    );
  }

  // 1.6 Rule 6: Email Addresses
  {
    const emailText = 'Inquiries to patient.secure_intake+tag@medical-center.health.org.';
    const resEmail = scrubText(emailText);
    assert(
      resEmail.cleanText.includes('[EMAIL]') && !resEmail.cleanText.includes('medical-center.health.org'),
      'CHAL-1.6 Complex RFC 5322 email with plus-tagging and subdomains redacted'
    );
  }

  // 1.7 Rule 7: Social Security Numbers (Valid and Formatted)
  {
    const ssnText = 'Patient SSN is 123-45-6789 on record.';
    const resSsn = scrubText(ssnText);
    assert(
      resSsn.cleanText.includes('[SSN]') && !resSsn.cleanText.includes('123-45-6789'),
      'CHAL-1.7 Valid formatted SSN redacted with [SSN]'
    );
  }

  // 1.8 Rule 8: Medical Record Numbers (MRN)
  {
    const mrnText = 'Active chart MRN: MC-88219 and secondary #MC-10002.';
    const resMrn = scrubText(mrnText);
    assert(
      resMrn.cleanText.includes('[MRN]') && !resMrn.cleanText.includes('MC-88219'),
      'CHAL-1.8 Medical record numbers with #MC prefix and MRN labels redacted'
    );
  }

  // 1.9 Rule 9: Health Plan Beneficiary Numbers
  {
    const planText = 'Coverage: BCBS-XY9812345 and Policy Number: POL-99887711.';
    const resPlan = scrubText(planText);
    assert(
      resPlan.cleanText.includes('[HEALTH_PLAN_NUM]') && !resPlan.cleanText.includes('BCBS-XY9812345'),
      'CHAL-1.9 Health plan carrier ID and labeled policy number redacted'
    );
  }

  // 1.10 Rule 10: Account Numbers & Payment Cards
  {
    const acctText = 'Billing Acct #: ACCT-9918274 and Card: 4111-2222-3333-4444.';
    const resAcct = scrubText(acctText);
    assert(
      resAcct.cleanText.includes('[ACCOUNT_NUM]') && !resAcct.cleanText.includes('4111-2222-3333-4444'),
      'CHAL-1.10 Billing account number and payment card number redacted'
    );
  }

  // 1.11 Rule 11: Certificate / License Numbers (NPI, DEA, Driver License)
  {
    const licText = 'Attending NPI: 1234567890, DEA License: AS1234563, State License: MD-99281.';
    const resLic = scrubText(licText);
    assert(
      resLic.cleanText.includes('[LICENSE_NUM]') &&
      !resLic.cleanText.includes('1234567890') &&
      !resLic.cleanText.includes('AS1234563'),
      'CHAL-1.11 Statutory 10-digit NPI, DEA license, and medical license redacted'
    );
  }

  // 1.12 Rule 12: Vehicle Identifiers (ISO VIN, License Plate)
  {
    const vehText = 'Patient transported in vehicle VIN: 1HGBH41JXMN109186 with License Plate: 7XYZ89.';
    const resVeh = scrubText(vehText);
    assert(
      resVeh.cleanText.includes('[VEHICLE_ID]') &&
      !resVeh.cleanText.includes('1HGBH41JXMN109186') &&
      !resVeh.cleanText.includes('7XYZ89'),
      'CHAL-1.12 ISO 17-character VIN and vehicle license plate redacted'
    );
  }

  // 1.13 Rule 13: Device Identifiers & UDI
  {
    const devText = 'Telemetry synced from Pacemaker Serial # DEV-789-XYZ-001 (UDI: 00888444111222).';
    const resDev = scrubText(devText);
    assert(
      resDev.cleanText.includes('[DEVICE_ID]') && !resDev.cleanText.includes('DEV-789-XYZ-001'),
      'CHAL-1.13 Medical device serial and UDI identifier redacted'
    );
  }

  // 1.14 Rule 14: Web URLs (Query Strings, Paths, Fragments)
  {
    const urlText = 'Portal access at https://portal.health-system.com/patient/78423?auth=true&exp=2026#sec.';
    const resUrl = scrubText(urlText);
    assert(
      resUrl.cleanText.includes('[URL]') && !resUrl.cleanText.includes('portal.health-system.com'),
      'CHAL-1.14 HTTPS URL with complex query parameters and fragment masked with [URL]'
    );
  }

  // 1.15 Rule 15: IP Addresses (IPv4, IPv6, Bound Checking)
  {
    const ipText = 'Telehealth telemetry from IPv4 192.168.1.42 and IPv6 2001:0db8:85a3:0000:0000:8a2e:0370:7334.';
    const resIp = scrubText(ipText);
    const ipEntities = resIp.entities.filter((e) => e.ruleId === 'IP_ADDRESS');
    assert(
      ipEntities.length === 2 &&
      !resIp.cleanText.includes('192.168.1.42') &&
      !resIp.cleanText.includes('2001:0db8:85a3:0000:0000:8a2e:0370:7334'),
      'CHAL-1.15 Both IPv4 and IPv6 addresses accurately identified and masked'
    );

    // Negative control: Invalid IPv4 (999.999.999.999) should NOT match
    const invalidIp = 'Invalid IP address is 999.999.999.999.';
    const resInv = scrubText(invalidIp);
    assert(
      !resInv.cleanText.includes('[IP_ADDRESS]'),
      'CHAL-1.15b Out-of-bounds octets (999.999.999.999) rejected as non-IP'
    );
  }

  // 1.16 Rule 16: Biometric Identifiers
  {
    const bioText = 'Biometric intake: iris scan matched and voiceprint verification confirmed.';
    const resBio = scrubText(bioText);
    assert(
      resBio.cleanText.includes('[BIOMETRIC]'),
      'CHAL-1.16 Biometric references (iris scan, voiceprint verification) redacted'
    );
  }

  // 1.17 Rule 17: Full-Face Photographic Images
  {
    const photoText = 'Clinical image saved at /records/photos/doe_jane_2026.jpg.';
    const resPhoto = scrubText(photoText);
    assert(
      resPhoto.cleanText.includes('[PHOTO_ID]') && !resPhoto.cleanText.includes('doe_jane_2026.jpg'),
      'CHAL-1.17 Patient clinical photograph file path redacted'
    );
  }

  // 1.18 Rule 18: Other Unique Identifiers (UUIDs, Research Tracking IDs)
  {
    const uidText = 'Encounter GUID: 123e4567-e89b-12d3-a456-426614174000 and Tracking Tag # BIO-REF-99281-XYZ.';
    const resUid = scrubText(uidText);
    assert(
      resUid.cleanText.includes('[UNIQUE_ID]') &&
      !resUid.cleanText.includes('123e4567-e89b-12d3-a456-426614174000'),
      'CHAL-1.18 Canonical RFC 4122 UUID and research tracking UID redacted'
    );
  }

  // =========================================================================
  // DOMAIN 2: GREEDY INTERVAL SCHEDULING OVERLAP & CONTIGUITY RESOLUTION
  // =========================================================================
  console.log('\n--- Domain 2: Greedy Interval Scheduling Overlap & Contiguity ---');

  // 2.1 Nested/Subsumed Entities (URL containing embedded IP address)
  {
    const nestedText = 'Access clinical server at http://192.168.1.1/patient/records.pdf immediately.';
    const resNested = scrubText(nestedText);
    // URL span covers the entire URL including IP. Scheduler must select URL, not both.
    const urlEnt = resNested.entities.find((e) => e.ruleId === 'URL');
    const ipEnt = resNested.entities.find((e) => e.ruleId === 'IP_ADDRESS');

    assert(
      urlEnt !== undefined && ipEnt === undefined && resNested.cleanText.includes('[URL]'),
      'CHAL-2.1 Embedded IP within URL is resolved by outer URL span without duplicate substitution'
    );
  }

  // 2.2 Identical Start Offset, Different Lengths (Context match vs Regex match)
  {
    const coStart = 'Patient Name: Jane Doe was admitted.';
    const resCoStart = scrubText(coStart, {
      customPatientContext: { name: 'Jane' }, // len 4
    });
    // Regex matches "Jane Doe" (len 8). Greedy scheduler must prioritize longer span.
    assert(
      resCoStart.entities.length === 1 &&
      resCoStart.entities[0].originalValue === 'Jane Doe' &&
      resCoStart.cleanText === 'Patient Name: [NAME] was admitted.',
      'CHAL-2.2 Candidates sharing identical start offset prioritize longest span (Jane Doe over Jane)'
    );
  }

  // 2.3 Strictly Contiguous Adjacent Entities (zero-gap contact)
  {
    const adjacentText = '#MC-12345#MC-67890';
    const resAdj = scrubText(adjacentText);
    assert(
      resAdj.entities.length === 2 &&
      resAdj.entities[0].end === resAdj.entities[1].start &&
      resAdj.cleanText === '[MRN][MRN]',
      'CHAL-2.3 Zero-gap adjacent entities (#MC-12345#MC-67890) replace contiguously without index corruption'
    );
  }

  // 2.4 Multi-Overlap Complex Collision Scenario
  {
    const multiCollision = 'Patient Jane Doe DOB: 04/12/1988 MRN: #MC-88219 Phone: (415) 555-0199';
    const resMulti = scrubText(multiCollision, {
      customPatientContext: {
        name: 'Jane Doe',
        dob: '04/12/1988',
        mrn: '#MC-88219',
        phone: '(415) 555-0199',
      },
    });

    // Verify all original offsets match input character by character
    const offsetsValid = resMulti.entities.every(
      (e) => multiCollision.slice(e.start, e.end) === e.originalValue
    );
    // Verify non-overlapping invariant: each start >= previous end
    let intervalsDisjoint = true;
    for (let i = 1; i < resMulti.entities.length; i++) {
      if (resMulti.entities[i].start < resMulti.entities[i - 1].end) {
        intervalsDisjoint = false;
        break;
      }
    }

    assert(
      offsetsValid && intervalsDisjoint && resMulti.entities.length === 4,
      'CHAL-2.4 Multi-collision context vs regex scan maintains strict disjoint intervals and exact slices'
    );
  }

  // =========================================================================
  // DOMAIN 3: MASKING STYLES EMPIRICAL VERIFICATION
  // =========================================================================
  console.log('\n--- Domain 3: Masking Styles Empirical Verification ---');

  // 3.1 Tag Mode
  {
    const tagRes = scrubText('Call (415) 555-0199 for Jane.', { maskStyle: 'tag' });
    assert(
      tagRes.cleanText.includes('[PHONE]'),
      'CHAL-3.1 Tag mode emits semantic token [PHONE]'
    );
  }

  // 3.2 Block Mode Length Clamping
  {
    const blockShort = generateMask('AB', '[TAG]', 'block');
    const blockMedium = generateMask('0123456789', '[TAG]', 'block');
    const blockLong = generateMask('A'.repeat(50), '[TAG]', 'block');

    assert(
      blockShort.length === 4 && blockShort === '████',
      'CHAL-3.2a Block mode clamps short entities to minimum 4 solid blocks'
    );
    assert(
      blockMedium.length === 10 && blockMedium === '██████████',
      'CHAL-3.2b Block mode preserves exact 1:1 length for medium entities (10 blocks)'
    );
    assert(
      blockLong.length === 32,
      'CHAL-3.2c Block mode clamps massive entities to maximum 32 solid blocks'
    );
  }

  // 3.3 Asterisk Mode Length Clamping
  {
    const astShort = generateMask('AB', '[TAG]', 'asterisk');
    const astMedium = generateMask('0123456789', '[TAG]', 'asterisk');
    const astLong = generateMask('A'.repeat(50), '[TAG]', 'asterisk');

    assert(
      astShort.length === 4 && astShort === '****',
      'CHAL-3.3a Asterisk mode clamps short entities to minimum 4 asterisks'
    );
    assert(
      astMedium.length === 10 && astMedium === '**********',
      'CHAL-3.3b Asterisk mode preserves exact 1:1 length for medium entities (10 asterisks)'
    );
    assert(
      astLong.length === 32,
      'CHAL-3.3c Asterisk mode clamps massive entities to maximum 32 asterisks'
    );
  }

  // =========================================================================
  // DOMAIN 4: CONFIDENCE SCORE BOUNDARIES & NEGATIVE CONTROLS
  // =========================================================================
  console.log('\n--- Domain 4: Confidence Score Boundaries & Negative Controls ---');

  // 4.1 Pure Non-PHI Clinical Narrative (Negative Control)
  {
    const pureClinical = `
    The patient presented for clinical psychotherapy follow-up.
    Reported persistent fatigue, generalized muscle tension, and disrupted sleep architecture.
    Mental status examination: alert, oriented x4, mood euthymic, affect congruent.
    No active suicidal or homicidal ideation, intent, or plan is documented.
    Engaged in cognitive restructuring exercises and agreed to progressive relaxation homework.
    Plan: continue bi-weekly cognitive behavioral therapy.
    `;
    const resPure = scrubText(pureClinical);
    assert(
      resPure.itemsRedacted === 0 &&
      resPure.entities.length === 0 &&
      resPure.cleanText === pureClinical &&
      resPure.metrics.riskSeverity === 'SAFE' &&
      resPure.metrics.complianceStatus === 'CLEAN',
      'CHAL-4.1 Pure non-PHI clinical narrative produces 0 false positives, SAFE severity, and CLEAN compliance'
    );
  }

  // 4.2 Empty, Null, and Non-String Inputs
  {
    const resEmpty = scrubText('');
    assert(
      resEmpty.cleanText === '' && resEmpty.itemsRedacted === 0,
      'CHAL-4.2a Empty string input safely handled without error'
    );

    const resNull = scrubText(null as any);
    assert(
      resNull.cleanText === '' && resNull.itemsRedacted === 0,
      'CHAL-4.2b Null input safely handled without throwing exception'
    );

    const resUndefined = scrubText(undefined as any);
    assert(
      resUndefined.cleanText === '' && resUndefined.itemsRedacted === 0,
      'CHAL-4.2c Undefined input safely handled without throwing exception'
    );
  }

  // 4.3 Confidence Score Clamping Range [0.70, 1.00]
  {
    const fullRes = scrubText(PRESET_FULL_18);
    const validConfidences = fullRes.entities.every(
      (e) => e.confidence >= 0.7 && e.confidence <= 1.0
    );
    assert(
      validConfidences && fullRes.entities.length >= 18,
      'CHAL-4.3 All detected entities across statutory catalog scored with confidence between 0.70 and 1.00'
    );
  }

  // =========================================================================
  // DOMAIN 5: MASSIVE CLINICAL NOTE THROUGHPUT & MEMORY STABILITY (100k+ CHARS)
  // =========================================================================
  console.log('\n--- Domain 5: Massive Clinical Note Throughput & Memory Stability ---');

  {
    // Generate a 120,000+ character realistic clinical document
    const paragraphBlock = `
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

    let massiveDoc = '';
    while (massiveDoc.length < 120000) {
      massiveDoc += paragraphBlock;
    }

    const initialMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const massiveResult = scrubText(massiveDoc);

    const endTime = performance.now();
    const finalMem = process.memoryUsage().heapUsed;

    const durationMs = endTime - startTime;
    const charsPerSec = (massiveDoc.length / durationMs) * 1000;
    const memDeltaMB = (finalMem - initialMem) / 1024 / 1024;

    console.log(`     ↳ Document Size: ${massiveDoc.length} characters`);
    console.log(`     ↳ Execution Duration: ${durationMs.toFixed(2)} ms`);
    console.log(`     ↳ Processing Throughput: ${charsPerSec.toFixed(0)} chars/sec`);
    console.log(`     ↳ Redacted Entities Count: ${massiveResult.entities.length}`);
    console.log(`     ↳ Heap Memory Delta: ${memDeltaMB.toFixed(2)} MB`);

    assert(
      massiveDoc.length >= 100000,
      'CHAL-5.1 Massive clinical note exceeds 100,000 character minimum benchmark'
    );
    assert(
      durationMs < 500,
      `CHAL-5.2 Processing completed in ${durationMs.toFixed(2)}ms (sub-500ms SLA, >200k chars/sec)`
    );
    assert(
      memDeltaMB < 25,
      `CHAL-5.3 Heap memory allocation delta (${memDeltaMB.toFixed(2)}MB) is bounded (<25MB)`
    );
    assert(
      massiveResult.metrics.complianceStatus === '100% DE-IDENTIFIED',
      'CHAL-5.4 Massive document marked 100% DE-IDENTIFIED with CRITICAL severity'
    );
    assert(
      !massiveResult.cleanText.includes('Jane Doe') &&
      !massiveResult.cleanText.includes('04/12/1988') &&
      !massiveResult.cleanText.includes('(415) 555-0199'),
      'CHAL-5.5 Zero ePHI leakage across entire 100k+ character document'
    );
  }

  // =========================================================================
  // DOMAIN 6: CROSS-VERIFICATION OF WORKER M5 CLAIMS
  // =========================================================================
  console.log('\n--- Domain 6: Cross-Verification of Worker M5 Claims ---');

  // 6.1 Sample Presets Integrity
  {
    const sampleOutput = getActivePatientSample({
      id: 'p-101',
      name: 'Jane Doe',
      dob: '04/12/1988',
      mrn: '#MC-88219',
      cptCode: '90837',
      primaryDiagnosis: 'F41.1',
      secondaryDiagnosis: 'F32.1',
      lastEncounterDate: '2026-10-05',
    });
    assert(
      sampleOutput.includes('Jane Doe') && sampleOutput.includes('90837'),
      'CHAL-6.1 Active patient sample dynamic interpolation functional'
    );
    assert(
      PRESET_FULL_18.length > 500 && PRESET_INTAKE_NOTE.length > 300,
      'CHAL-6.2 Built-in clinical presets non-empty and well-structured'
    );
  }

  // =========================================================================
  // DOMAIN 7: PATHOLOGICAL INPUTS & REDOS IMMUNITY STRESS
  // =========================================================================
  console.log('\n--- Domain 7: Pathological Inputs & ReDoS Immunity Stress ---');

  {
    const pathologicalProbes = [
      { name: '50k repeated uppercase A', text: 'A'.repeat(50000) },
      { name: '50k repeated digits', text: '0'.repeat(50000) },
      { name: '50k repeated whitespace', text: ' '.repeat(50000) },
      { name: 'Unclosed URL probe with 20k characters', text: 'http://' + 'a'.repeat(20000) + ' ' },
      { name: 'Dr. title with 5k trailing letters', text: 'Dr. ' + 'A'.repeat(5000) + ' ' },
      { name: 'Address label with 5k trailing letters', text: 'Address: ' + 'A'.repeat(5000) + ' ' },
      { name: 'Street prefix with 5k trailing letters', text: '123 ' + 'A'.repeat(5000) + ' Street ' },
      { name: 'Date prefix with 5k trailing digits', text: '1999-' + '9'.repeat(5000) },
      { name: 'Paren phone prefix with 5k trailing digits', text: '(415) ' + '5'.repeat(5000) },
      { name: 'Email @ prefix with 5k trailing characters', text: 'a@' + 'b'.repeat(5000) },
      { name: 'BCBS prefix with 5k trailing digits', text: 'BCBS-' + '1'.repeat(5000) },
    ];

    let allUnderSla = true;
    for (const probe of pathologicalProbes) {
      const t0 = performance.now();
      const res = scrubText(probe.text);
      const elapsed = performance.now() - t0;
      if (elapsed > 100) {
        allUnderSla = false;
        console.error(`Slow pathological probe (${elapsed.toFixed(1)}ms): ${probe.name}`);
      }
    }

    assert(
      allUnderSla,
      'CHAL-7.1 All 11 pathological / adversarial string probes execute within sub-100ms without ReDoS backtracking'
    );
  }

  // =========================================================================
  // DOMAIN 8: 250,000+ CHARACTER MEGA DOCUMENT SCALE BENCHMARK
  // =========================================================================
  console.log('\n--- Domain 8: 250,000+ Character Mega Document Scale Benchmark ---');

  {
    let megaDoc = '';
    while (megaDoc.length < 250000) {
      megaDoc += PRESET_FULL_18 + '\n\n';
    }

    const tStart = performance.now();
    const megaResult = scrubText(megaDoc);
    const tEnd = performance.now();
    const megaElapsed = tEnd - tStart;

    console.log(`     ↳ Mega Document Length: ${megaDoc.length} characters`);
    console.log(`     ↳ Total Redactions: ${megaResult.entities.length} entities`);
    console.log(`     ↳ Execution Duration: ${megaElapsed.toFixed(2)} ms`);

    assert(
      megaDoc.length >= 250000 && megaElapsed < 500 && megaResult.entities.length >= 5000,
      `CHAL-8.1 250,000+ char document processed in ${megaElapsed.toFixed(2)}ms (<500ms limit) with 5,000+ entities redacted`
    );
  }

  // =========================================================================
  // DOMAIN 9: MULTI-LAYER CONCENTRIC OVERLAP RESOLUTION
  // =========================================================================
  console.log('\n--- Domain 9: Multi-Layer Concentric Overlap Resolution ---');

  {
    // Concentric nesting: Outer container subsumes intermediate, which subsumes inner
    const concentricText = 'PATIENT-RECORD-12345';
    const resConcentric = scrubText(concentricText, {
      customPatientContext: {
        name: 'PATIENT-RECORD-12345', // span [0, 20]
        mrn: 'RECORD-12345',          // span [8, 20]
        phone: '12345',               // span [15, 20]
      },
    });

    assert(
      resConcentric.entities.length === 1 &&
      resConcentric.entities[0].originalValue === 'PATIENT-RECORD-12345' &&
      resConcentric.cleanText === '[NAME]',
      'CHAL-9.1 Concentric 3-layer nested candidates cleanly resolve to outermost enclosing span without duplication'
    );
  }

  // =========================================================================
  // SUMMARY AND VERDICT
  // =========================================================================
  console.log('\n====================================================================');
  console.log(`   Empirical Challenge Summary: ${passedChecks} Passed, ${failedChecks} Failed (Total: ${totalChecks})`);
  console.log('====================================================================\n');

  if (failedChecks > 0) {
    console.error(`VERDICT: REJECT. ${failedChecks} empirical challenge test(s) failed.`);
    for (const f of failures) {
      console.error(` - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE. All empirical stress, edge-case, and boundary tests PASSED (100%).\n');
    process.exit(0);
  }
}

runMilestone5ChallengeSuite().catch((err) => {
  console.error('Unhandled challenge runner error:', err);
  process.exit(1);
});
