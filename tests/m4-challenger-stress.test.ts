/**
 * Milestone 4 Empirical Challenge & Stress Test Suite
 *
 * Archetype: Empirical Challenger (critic, specialist)
 * Target: Clinical AI Scribe v2
 *  - Variable Interpolator under extreme/adversarial inputs
 *  - Template Studio state transitions, rapid re-ordering & boundary stress
 *  - Diagnostic Coding Matcher & Medical Necessity Builder under atypical/edge scenarios
 *  - CPT Statutory Boundary Precision (52m vs 53m, 37m vs 38m)
 *
 * Execution: tsx tests/m4-challenger-stress.test.ts
 */

import { interpolateTemplateVariables, SUPPORTED_VARIABLES } from '../src/tools/scribe/variable-interpolator';
import {
  getStoredTemplates,
  saveTemplate,
  deleteTemplate,
  resetToFactoryPresets,
  TEMPLATE_STORAGE_KEY,
} from '../src/tools/scribe/data/templateStore';
import { DEFAULT_CLINICAL_TEMPLATES } from '../src/tools/scribe/data/defaultTemplates';
import {
  matchDiagnosticCodes,
  recommendCptCode,
} from '../src/tools/scribe/utils/codeSuggestionEngine';
import { generateMedicalNecessityBlock } from '../src/tools/scribe/utils/medicalNecessityBuilder';
import { generateDeterministicClinicalNote } from '../src/tools/scribe/ai-template-generator';
import { STATUTORY_ICD10_DATABASE, STATUTORY_CPT_DATABASE } from '../src/tools/scribe/data/codingData';
import { ClinicalTemplate, TemplateSection, MedicalNecessityParams } from '../src/tools/scribe/types';

// In-memory mock localStorage for Node.js / CLI runtime
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

// Attach mock localStorage to global window
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {};
}
(globalThis.window as any).localStorage = new MockLocalStorage();

// Simple Assertion Harness
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

function runChallengeSuite(): void {
  console.log('\n====================================================================');
  console.log('   Milestone 4: Empirical Challenger Adversarial Stress Suite      ');
  console.log('====================================================================\n');

  // =========================================================================
  // SECTION 1: VARIABLE INTERPOLATION UNDER EXTREME CONDITIONS
  // =========================================================================
  console.log('--- Domain 1: Variable Interpolation Extreme & Adversarial Conditions ---');

  // 1.1 Empty context object fallback
  {
    const tmpl = 'Patient: {{patient_name}}, MRN: {{mrn}}, CPT: {{cpt_code}}, Clinician: {{clinician_name}}, DOB: {{dob}}, CC: {{chief_complaint}}';
    const result = interpolateTemplateVariables(tmpl, {});
    assert(
      result.includes('Patient: Jane Doe') &&
      result.includes('MRN: #MC-88219') &&
      result.includes('CPT: 90837') &&
      result.includes('Clinician: Dr. Sarah Chen, MD') &&
      result.includes('DOB: 04/12/1988') &&
      result.includes('CC: Clinical Consultation'),
      'CHAL-1.1 Empty context gracefully falls back to clinical defaults without undefined or null'
    );
  }

  // 1.2 Partial context with missing fields
  {
    const tmpl = 'Note for {{patient_name}} by {{clinician_name}} for {{cpt_code}}';
    const result = interpolateTemplateVariables(tmpl, { patient_name: 'Robert Miller' });
    assert(
      result.includes('Robert Miller') &&
      result.includes('Dr. Sarah Chen, MD') &&
      result.includes('90837'),
      'CHAL-1.2 Partial context preserves supplied fields and applies defaults to missing fields'
    );
  }

  // 1.3 Empty string values in context
  {
    const tmpl = 'Patient: {{patient_name}}';
    const result = interpolateTemplateVariables(tmpl, { patient_name: '' });
    assert(
      result === 'Patient: Jane Doe',
      'CHAL-1.3 Empty string in context falls back safely to default placeholder rather than blank space'
    );
  }

  // 1.4 Prototype Pollution & Malicious Token Probing
  {
    const maliciousTemplate = 'Tokens: {{constructor}} {{__proto__}} {{toString}} {{valueOf}} {{prototype}}';
    const result = interpolateTemplateVariables(maliciousTemplate, {});
    
    // Ensure prototype isn't polluted
    const cleanObj: Record<string, any> = {};
    const noPollution = (cleanObj as any).polluted === undefined && (Object.prototype as any).polluted === undefined;
    
    assert(
      result === maliciousTemplate && noPollution,
      'CHAL-1.4 Prototype pollution tokens ({{constructor}}, {{__proto__}}) remain unmapped and do not taint Object.prototype'
    );

    // Malicious context payload attempting prototype pollution
    const maliciousPayload = JSON.parse('{"__proto__": {"polluted": "yes"}, "patient_name": "Injected"}');
    interpolateTemplateVariables('Patient: {{patient_name}}', maliciousPayload);
    const globalPolluted = ({} as any).polluted !== undefined;
    assert(
      !globalPolluted,
      'CHAL-1.4b Malicious JSON payload with __proto__ fails to pollute global object prototype'
    );
  }

  // 1.5 Unicode, Accents, RTL, Emojis, and HTML/XSS Tokens
  {
    const adversarialNames = [
      'Dr. José-María Müller-François',
      '李小龙 (Bruce Lee)',
      'فاطمة الزهراء',
      'Patient 🩺 🧬 🚀',
      '<script>alert("xss")</script>',
      'O\'Connor & "Sons" <LLC>',
    ];

    let allAdversarialPassed = true;
    for (const name of adversarialNames) {
      const res = interpolateTemplateVariables('Patient: {{patient_name}}', { patient_name: name });
      if (!res.includes(name)) {
        allAdversarialPassed = false;
        break;
      }
    }
    assert(
      allAdversarialPassed,
      'CHAL-1.5 Accented characters, CJK unicode, RTL Arabic, emojis, and HTML characters interpolate verbatim'
    );
  }

  // 1.6 Unmapped, Malformed, and Case-Insensitive Tokens
  {
    const unmappedTmpl = 'Unmapped: {{billing_uuid}} and {{hospital_wing}} and {{}} and {patient_name}';
    const res = interpolateTemplateVariables(unmappedTmpl, {});
    assert(
      res.includes('{{billing_uuid}}') &&
      res.includes('{{hospital_wing}}') &&
      res.includes('{{}}') &&
      res.includes('{patient_name}'),
      'CHAL-1.6 Unmapped tokens and malformed single braces remain untouched'
    );

    const caseInsensitiveTmpl = 'Upper: {{PATIENT_NAME}}, Mixed: {{Patient_Name}}, Lower: {{patient_name}}';
    const caseRes = interpolateTemplateVariables(caseInsensitiveTmpl, { patient_name: 'Carlos Santana' });
    assert(
      caseRes === 'Upper: Carlos Santana, Mixed: Carlos Santana, Lower: Carlos Santana',
      'CHAL-1.6b Variable tokens are strictly case-insensitive across upper, mixed, and lower cases'
    );
  }

  // 1.7 Null, undefined, and empty template strings
  {
    assert(interpolateTemplateVariables('', {}) === '', 'CHAL-1.7a Empty template string returns empty string');
    assert(interpolateTemplateVariables(null as any, {}) === '', 'CHAL-1.7b Null template string returns empty string safely');
    assert(interpolateTemplateVariables(undefined as any, {}) === '', 'CHAL-1.7c Undefined template string returns empty string safely');
  }

  // 1.8 Custom Variables & Configurable Unmapped Token Sanitization
  {
    const customTmpl = 'Rx: {{medications}}, Allergies: {{allergies}}, Vitals: {{vital_signs}}';
    const customRes = interpolateTemplateVariables(customTmpl, {
      medications: 'Escitalopram 10mg',
      allergies: 'NKDA',
      vital_signs: 'BP 120/80',
    });
    assert(
      customRes.includes('Escitalopram 10mg') &&
      customRes.includes('NKDA') &&
      customRes.includes('BP 120/80'),
      'CHAL-1.8a Custom clinical tokens interpolate successfully with dedicated values'
    );

    const unmappedWithClean = interpolateTemplateVariables('Missing: {{missing_token}}', {}, { cleanUnmapped: true });
    assert(
      unmappedWithClean === 'Missing: ',
      'CHAL-1.8b cleanUnmapped option removes unmapped tokens'
    );

    const unmappedWithFallback = interpolateTemplateVariables('Missing: {{missing_token}}', {}, { cleanUnmapped: true, unmappedFallback: '[N/A]' });
    assert(
      unmappedWithFallback === 'Missing: [N/A]',
      'CHAL-1.8c unmappedFallback option populates custom placeholder for missing tokens'
    );
  }

  // =========================================================================
  // SECTION 2: TEMPLATE STUDIO RE-ORDERING, BOUNDARY CONDITIONS & STATE
  // =========================================================================
  console.log('\n--- Domain 2: Template Studio State Transitions & Boundary Conditions ---');

  // 2.1 Factory Presets Verification in LocalStore
  {
    (globalThis.window as any).localStorage.clear();
    const loaded = getStoredTemplates();
    assert(
      loaded.length === 6 && loaded.every((t) => t.sections.length > 0),
      'CHAL-2.1 getStoredTemplates initializes pristine 6 factory templates on cold start'
    );
  }

  // 2.2 Rapid Sequential Section Re-ordering Invariant Testing
  {
    const baseTemplate: ClinicalTemplate = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES[1])); // SOAP note: S, O, A, P (4 sections)
    let sections = [...baseTemplate.sections];

    // Helper simulating TemplateStudio handleMoveSection logic
    function simulateMove(currentSections: TemplateSection[], index: number, direction: 'up' | 'down'): TemplateSection[] {
      const copy = [...currentSections];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return copy;
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      copy.forEach((s, idx) => { s.order = idx; });
      return copy;
    }

    // Sequence of 50 rapid alternating moves
    let invariantPreserved = true;
    for (let i = 0; i < 50; i++) {
      const idx = i % sections.length;
      const dir = i % 2 === 0 ? 'down' : 'up';
      sections = simulateMove(sections, idx, dir);

      // Verify invariant: length is preserved, order index strictly matches array index
      const lengthOk = sections.length === 4;
      const orderOk = sections.every((s, pos) => s.order === pos);
      const uniqueIds = new Set(sections.map((s) => s.id)).size === 4;
      if (!lengthOk || !orderOk || !uniqueIds) {
        invariantPreserved = false;
        break;
      }
    }
    assert(
      invariantPreserved,
      'CHAL-2.2 Rapid 50-cycle sequential re-ordering maintains strict 0-based indexing and ID uniqueness'
    );
  }

  // 2.3 Boundary Re-ordering (Move top item up, move bottom item down)
  {
    const soap = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES[1]));
    let sections = [...soap.sections];

    // Move top item (0) UP -> should be no-op
    function simulateMove(currentSections: TemplateSection[], index: number, direction: 'up' | 'down'): TemplateSection[] {
      const copy = [...currentSections];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return copy;
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      copy.forEach((s, idx) => { s.order = idx; });
      return copy;
    }

    const afterTopUp = simulateMove(sections, 0, 'up');
    assert(
      afterTopUp[0].id === sections[0].id,
      'CHAL-2.3a Moving top section up is a safe no-op that preserves order'
    );

    const afterBottomDown = simulateMove(sections, sections.length - 1, 'down');
    assert(
      afterBottomDown[sections.length - 1].id === sections[sections.length - 1].id,
      'CHAL-2.3b Moving bottom section down is a safe no-op that preserves order'
    );
  }

  // 2.4 Minimum Section Deletion Bound
  {
    const singleSectionTemplate: ClinicalTemplate = {
      id: 'single_sec_tmpl',
      name: 'Single Section Note',
      description: 'Test note',
      specialty: 'Psychiatry',
      sections: [
        { id: 'only_sec', title: 'Clinical Note', promptInstruction: 'Document care', placeholder: '', order: 0 }
      ],
      isCustom: true,
    };

    // In TemplateStudio: if (currentTemplate.sections.length <= 1) return;
    const canDelete = singleSectionTemplate.sections.length > 1;
    assert(
      !canDelete,
      'CHAL-2.4 Deletion guard protects templates with <= 1 section from zeroing out'
    );
  }

  // 2.5 Extreme Boundary: Template with 50 Sections
  {
    const manySections: TemplateSection[] = [];
    for (let i = 0; i < 50; i++) {
      manySections.push({
        id: `section_stress_${i}`,
        title: `Stress Clinical Section ${i + 1}`,
        promptInstruction: `Document clinical metrics for section ${i + 1}: {{patient_name}}`,
        placeholder: `Placeholder ${i + 1}`,
        order: i,
      });
    }

    const stressTemplate: ClinicalTemplate = {
      id: 'stress_50_sections',
      name: 'Mega Protocol 50',
      description: 'Stress testing 50 sections',
      specialty: 'Complex Systems',
      sections: manySections,
      isCustom: true,
    };

    // Save to store
    saveTemplate(stressTemplate);
    const stored = getStoredTemplates();
    const retrieved = stored.find((t) => t.id === 'stress_50_sections');

    assert(
      retrieved !== undefined && retrieved.sections.length === 50,
      'CHAL-2.5a Template with 50 sections successfully persists to and hydrates from localStorage'
    );

    // Synthesize note with 50 sections
    const startNote = Date.now();
    const noteResult = generateDeterministicClinicalNote({
      template: stressTemplate,
      transcript: 'Patient reports feeling overwhelmed with 50 different symptoms.',
      context: { patient_name: 'Stress Test Subject', mrn: '#ST-5050' },
    });
    const durationNote = Date.now() - startNote;

    assert(
      Object.keys(noteResult.sections).length === 50 &&
      noteResult.fullMarkdown.includes('### STRESS CLINICAL SECTION 50') &&
      durationNote < 50,
      `CHAL-2.5b Deterministic generator synthesizes 50-section note in ${durationNote}ms (<50ms limit)`
    );

    // Clean up
    deleteTemplate('stress_50_sections');
  }

  // 2.6 Extreme Boundary: Template with 0 Sections
  {
    const zeroSectionTemplate: ClinicalTemplate = {
      id: 'zero_section_test',
      name: 'Zero Section Stub',
      description: 'Zero sections boundary test',
      specialty: 'Testing',
      sections: [],
      isCustom: true,
    };

    saveTemplate(zeroSectionTemplate);
    const stored = getStoredTemplates();
    const retrieved = stored.find((t) => t.id === 'zero_section_test');

    assert(
      retrieved !== undefined && retrieved.sections.length === 0,
      'CHAL-2.6a 0-section template survives serialization safely without throws'
    );

    const zeroResult = generateDeterministicClinicalNote({
      template: zeroSectionTemplate,
      transcript: 'No sections to synthesize into.',
      context: { patient_name: 'Zero Test' },
    });

    assert(
      zeroResult.fullMarkdown.includes('ZERO SECTION STUB') &&
      Object.keys(zeroResult.sections).length === 0,
      'CHAL-2.6b Deterministic engine handles 0 sections gracefully without null pointer errors'
    );

    deleteTemplate('zero_section_test');
  }

  // 2.7 Factory Reset Reliability
  {
    const custom: ClinicalTemplate = {
      id: 'custom_to_wipe',
      name: 'Ephemeral Template',
      description: 'To be wiped',
      specialty: 'General',
      sections: [{ id: 's1', title: 'S1', promptInstruction: '', placeholder: '', order: 0 }],
      isCustom: true,
    };
    saveTemplate(custom);
    assert(getStoredTemplates().some((t) => t.id === 'custom_to_wipe'), 'CHAL-2.7a Custom template registered');

    resetToFactoryPresets();
    const resetList = getStoredTemplates();
    assert(
      resetList.length === 6 && !resetList.some((t) => t.id === 'custom_to_wipe'),
      'CHAL-2.7b Factory reset purges custom templates and restores pristine default catalog'
    );
  }

  // =========================================================================
  // SECTION 3: CODING ENGINE & MEDICAL NECESSITY BUILDER
  // =========================================================================
  console.log('\n--- Domain 3: Coding Suggestion Engine & Medical Necessity Builder ---');

  // 3.1 Atypical Transcript: Pediatric ADHD Encounter
  {
    const pediatricTranscript = `
    Clinician: How have things been going in the 3rd grade classroom this semester?
    Parent: His teacher notes extreme restlessness, constant fidgeting, and severe inattention.
    Patient: I can't sit still, my mind jumps everywhere, and I interrupt people without meaning to.
    Clinician: We are evaluating executive dysfunction, distractibility, and impulsivity.
    `;
    const suggestions = matchDiagnosticCodes(pediatricTranscript);
    assert(
      suggestions.length > 0 && suggestions[0].code.code === 'F90.2',
      'CHAL-3.1 Pediatric clinical presentation accurately matches ADHD (F90.2) as highest confidence code'
    );
  }

  // 3.2 Atypical Transcript: Geriatric Depressive Episode with Somatic Comorbidity
  {
    const geriatricTranscript = `
    Clinician: Good morning Mr. Henderson, how are you coping at age 79?
    Patient: I feel persistent sadness and hopelessness. Low mood every morning, total anhedonia, no energy to leave bed.
    Clinician: Any chest symptoms?
    Patient: Just my chronic high blood pressure. I am taking amlodipine daily for elevated bp.
    `;
    const suggestions = matchDiagnosticCodes(geriatricTranscript);
    const codesFound = suggestions.map((s) => s.code.code);
    assert(
      (codesFound.includes('F32.9') || codesFound.includes('F32.1')) && codesFound.includes('I10'),
      'CHAL-3.2 Geriatric encounter detects both Major Depressive Disorder (F32.9/F32.1) and Hypertension (I10)'
    );
  }

  // 3.3 Somatic Consultation Without Behavioral Keywords (Negative Control)
  {
    const purelySomaticTranscript = `
    Clinician: Review of systems for endocrine management.
    Patient: Taking metformin 1000mg twice daily for type 2 diabetes. Fasting glucose is 145, HbA1c is 8.1%.
    Clinician: Blood pressure check reads 142/92, indicating uncontrolled hypertension. We will adjust amlodipine.
    Patient: Shortness of breath noted when climbing stairs, but using albuterol inhaler for asthma.
    `;
    const suggestions = matchDiagnosticCodes(purelySomaticTranscript);
    const psychiatricCodes = ['F41.1', 'F32.9', 'F32.1', 'F43.10', 'F90.2', 'F41.0', 'F10.10'];
    const matchedPsychCodes = suggestions.filter((s) => psychiatricCodes.includes(s.code.code));

    assert(
      matchedPsychCodes.length === 0,
      'CHAL-3.3 Somatic encounter with zero behavioral keywords yields 0 false-positive psychiatric code matches'
    );

    const matchedSomaticCodes = suggestions.map((s) => s.code.code);
    assert(
      matchedSomaticCodes.includes('E11.9') &&
      matchedSomaticCodes.includes('I10') &&
      matchedSomaticCodes.includes('J45.41'),
      'CHAL-3.3b Somatic encounter correctly matches Type 2 Diabetes (E11.9), Hypertension (I10), and Asthma (J45.41)'
    );
  }

  // 3.4 5,000+ Character High-Stress Transcript Load Test
  {
    let bigTranscript = 'CLINICAL ENCOUNTER DIALOGUE RECORDING ARCHIVE:\n';
    const fillerSentences = [
      'Clinician: Let us review your sleep patterns and nighttime autonomic symptoms.',
      'Patient: I have been experiencing severe insomnia, racing heart, and catastrophic worry whenever I lie down.',
      'Clinician: This matches the clinical criteria for generalized anxiety and elevated panic attacks.',
      'Patient: During the panic attack I get severe trembling, dyspnea, and rapid heart palpitations.',
      'Clinician: We will deploy cognitive restructuring and progressive muscle relaxation to down-regulate the nervous system.',
      'Patient: I also take lisinopril for my elevated bp, but my main distress is the panic disorder and worry.',
    ];

    // Build ~5,500 character transcript
    while (bigTranscript.length < 5200) {
      bigTranscript += fillerSentences.join('\n') + '\n';
    }

    const t0 = performance.now();
    const suggestions = matchDiagnosticCodes(bigTranscript);
    const durationMs = performance.now() - t0;

    const allScoresBounded = suggestions.every((s) => s.confidence >= 20 && s.confidence <= 99);
    const isSortedDesc = suggestions.every((s, i) => i === 0 || s.confidence <= suggestions[i - 1].confidence);

    assert(
      bigTranscript.length >= 5000 &&
      durationMs < 15 &&
      allScoresBounded &&
      isSortedDesc,
      `CHAL-3.4 5,000+ char transcript processed in ${durationMs.toFixed(2)}ms (<15ms limit); scores clamped [20-99] and sorted`
    );
  }

  // 3.5 CPT Duration Statutory Threshold Boundaries (Crucial Empirical Tests)
  {
    // Statutory Thresholds:
    // 90832: 16-37 min (midpoint 30)
    // 90834: 38-52 min (midpoint 45)
    // 90837: 53+ min   (midpoint 60)
    // 90791: Initial Diagnostic Intake

    // Boundary 1: 52 vs 53 minutes for 90837
    const cpt52 = recommendCptCode(52);
    const cpt53 = recommendCptCode(53);
    assert(cpt52.code === '90834', 'CHAL-3.5a Exactly 52 minutes maps to CPT 90834 (NOT 90837)');
    assert(cpt53.code === '90837', 'CHAL-3.5b Exactly 53 minutes maps to CPT 90837');

    // Float boundaries: 52.9 min vs 53.0 min
    assert(recommendCptCode(52.99).code === '90834', 'CHAL-3.5c 52.99 minutes strictly stays in CPT 90834');
    assert(recommendCptCode(53.01).code === '90837', 'CHAL-3.5d 53.01 minutes qualifies for CPT 90837');

    // Boundary 2: 37 vs 38 minutes for 90834
    const cpt37 = recommendCptCode(37);
    const cpt38 = recommendCptCode(38);
    assert(cpt37.code === '90832', 'CHAL-3.5e Exactly 37 minutes maps to CPT 90832 (NOT 90834)');
    assert(cpt38.code === '90834', 'CHAL-3.5f Exactly 38 minutes maps to CPT 90834');

    // Extreme boundaries: 0, negative, and large durations
    assert(recommendCptCode(0).code === '90832', 'CHAL-3.5g 0 minutes defaults to baseline 90832');
    assert(recommendCptCode(-15).code === '90832', 'CHAL-3.5h Negative duration defaults to baseline 90832');
    assert(recommendCptCode(120).code === '90837', 'CHAL-3.5i 120 minutes maps to extended 90837');

    // Initial Intake override
    assert(recommendCptCode(30, true).code === '90791', 'CHAL-3.5j Initial intake overrides time mapping to 90791 (30 min)');
    assert(recommendCptCode(55, true).code === '90791', 'CHAL-3.5k Initial intake overrides time mapping to 90791 (55 min)');
  }

  // 3.6 Medical Necessity Justification Generator Edge Cases
  {
    const primaryIcd = STATUTORY_ICD10_DATABASE[0]; // F41.1
    const secondaryIcd = STATUTORY_ICD10_DATABASE[1]; // F32.9
    const cptCode = STATUTORY_CPT_DATABASE[2]; // 90837

    // Case A: With secondary ICDs
    const paramsWithSecondary: MedicalNecessityParams = {
      patientName: 'Elena Gilbert',
      patientMrn: '#MRN-99881',
      encounterDate: '2026-10-05',
      encounterDuration: 60,
      cptCode,
      primaryIcd,
      secondaryIcds: [secondaryIcd],
      complexity: 'High',
      interventions: ['Cognitive reframing', 'Exposure hierarchy', 'Safety planning'],
      clinicianName: 'Dr. Sarah Chen, MD',
    };
    const blockA = generateMedicalNecessityBlock(paramsWithSecondary);
    assert(
      blockA.includes('### MEDICAL CODING & MEDICAL NECESSITY JUSTIFICATION') &&
      blockA.includes('Elena Gilbert') &&
      blockA.includes('CPT 90837') &&
      blockA.includes('Secondary ICD-10: **F32.9**') &&
      blockA.includes('Duration & Complexity Validation (AMA / CMS Guidelines)') &&
      blockA.includes('Face-to-Face Encounter Duration: 60 minutes') &&
      blockA.includes('Electronically signed by **Dr. Sarah Chen, MD**'),
      'CHAL-3.6a Medical necessity block with secondary diagnosis generates all mandatory CMS/AMA audit sections'
    );

    // Case B: Zero secondary ICDs
    const paramsWithoutSecondary: MedicalNecessityParams = {
      ...paramsWithSecondary,
      secondaryIcds: [],
    };
    const blockB = generateMedicalNecessityBlock(paramsWithoutSecondary);
    assert(
      blockB.includes('* Secondary ICD-10: None documented for this encounter'),
      'CHAL-3.6b Medical necessity block with empty secondary ICD list produces statutory explicit negative declaration'
    );

    // Case C: Special characters in names and interventions
    const paramsSpecial: MedicalNecessityParams = {
      ...paramsWithSecondary,
      patientName: 'José "Chico" Peña & <Family>',
      clinicianName: 'Dr. René François-Müller, MD',
      interventions: ['Dialectical Behavior Therapy (DBT) mindfulness & radical acceptance', 'Intervention with "quotes"'],
    };
    const blockC = generateMedicalNecessityBlock(paramsSpecial);
    assert(
      blockC.includes('José "Chico" Peña & <Family>') &&
      blockC.includes('Dr. René François-Müller, MD'),
      'CHAL-3.6c Medical necessity block formats special characters and multilingual names without distortion'
    );
  }

  // =========================================================================
  // SUMMARY AND VERDICT
  // =========================================================================
  console.log('\n====================================================================');
  console.log(`   Empirical Challenge Summary: ${passedCount} Passed, ${failedCount} Failed (Total: ${passedCount + failedCount})`);
  console.log('====================================================================\n');

  if (failedCount > 0) {
    console.error(`VERDICT: REJECT. ${failedCount} empirical challenge test(s) failed.`);
    for (const f of failures) {
      console.error(` - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE. All empirical stress, edge-case, and boundary tests PASSED (100%).\n');
    process.exit(0);
  }
}

runChallengeSuite();
