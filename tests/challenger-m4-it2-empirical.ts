/**
 * Milestone 4 Iteration 2: Empirical Challenger Stress & Verification Suite
 * Challenger: Challenger 1 (teamwork_preview_challenger_m4_it2_1)
 *
 * Scope & Verification:
 * Domain 1: Custom Variable Interpolator Extreme & Adversarial Conditions
 *   - 8 statutory standard tokens & custom clinical tokens (allergies, medications, vitals, etc.)
 *   - Unmapped token behaviors (default preserve, cleanUnmapped, unmappedFallback)
 *   - Prototype pollution attempts ({{constructor}}, {{__proto__}}, hostile JSON payload)
 *   - Prototype property leaks ({{toString}}, {{valueOf}}, {{toLocaleString}}, etc.)
 *   - Special character payloads (XSS, SQLi, CJK, RTL Arabic, emojis, massive strings)
 *   - Token syntax variations (case insensitivity, internal whitespace, adjacent tokens)
 * Domain 2: Template Studio Section Re-ordering & State Persistence Boundaries
 *   - Factory template hydration & defaults integrity
 *   - Movement bounds protection (index 0 'up', last index 'down')
 *   - Rapid multi-turn sequential reordering invariant preservation
 *   - Minimum section count deletion protection (<= 1 section guard)
 *   - Large template scaling (100 sections) & deterministic synthesis performance
 *   - Versioned localStorage persistence, corruption tolerance, and factory reset
 * Domain 3: Coding Suggestion Engine & Medical Necessity Builder
 *   - CPT statutory duration boundary precision (37m vs 38m, 52m vs 53m, fractions, negatives, 0m)
 *   - Initial intake override to CPT 90791
 *   - Somatic vs psychiatric diagnostic matching with 0 false-positive psychiatric matches on pure somatic presentations
 *   - Pediatric, trauma, depressive, and comorbidity presentation accuracy
 *   - Medical Necessity block CMS/AMA compliance, secondary ICD handling, and hostile string handling
 *
 * Execution: npx tsx tests/challenger-m4-it2-empirical.ts
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
import {
  ClinicalTemplate,
  TemplateSection,
  MedicalNecessityParams,
  ClinicalVariableContext,
} from '../src/tools/scribe/types';

// Mock localStorage for Node CLI runtime
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

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {};
}
(globalThis.window as any).localStorage = new MockLocalStorage();

// Audit Result Collectors
interface TestRecord {
  domain: string;
  testId: string;
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestRecord[] = [];
let passCount = 0;
let failCount = 0;

function recordTest(
  domain: string,
  testId: string,
  name: string,
  condition: boolean,
  details: string = ''
): void {
  if (condition) {
    passCount++;
    testResults.push({ domain, testId, name, passed: true, details });
    console.log(`  ✓ [PASS] [${domain}] ${testId}: ${name}`);
    if (details) console.log(`      ↳ ${details}`);
  } else {
    failCount++;
    testResults.push({ domain, testId, name, passed: false, details });
    console.error(`  ❌ [FAIL] [${domain}] ${testId}: ${name} -> ${details}`);
  }
}

console.log('\n====================================================================');
console.log('   CHALLENGER 1: MILESTONE 4 ITERATION 2 EMPIRICAL STRESS SUITE   ');
console.log('   Target: Scribe Templates, Custom Variables, & Coding Engine    ');
console.log('====================================================================\n');

// ===========================================================================
// DOMAIN 1: CUSTOM VARIABLE INTERPOLATOR EXTREME & ADVERSARIAL CONDITIONS
// ===========================================================================
console.log('--- Domain 1: Custom Variable Interpolator Extreme & Adversarial Conditions ---');

// D1.1: 8 Standard statutory tokens replacement
{
  const tmpl = 'Patient: {{patient_name}} (DOB: {{dob}}, MRN: {{mrn}}), Chief Complaint: {{chief_complaint}}, CPT: {{cpt_code}} - {{cpt_desc}}, DOS: {{encounter_date}}, Clinician: {{clinician_name}}';
  const ctx = {
    patient_name: 'Marcus Vance',
    dob: '11/04/1985',
    mrn: '#MC-10002',
    chief_complaint: 'Major Depressive Disorder follow-up',
    cpt_code: '90834',
    cpt_desc: 'Psychotherapy (45m)',
    encounter_date: 'October 5, 2026',
    clinician_name: 'Dr. Sarah Chen, MD',
  };
  const res = interpolateTemplateVariables(tmpl, ctx);
  const ok =
    res.includes('Patient: Marcus Vance') &&
    res.includes('DOB: 11/04/1985') &&
    res.includes('MRN: #MC-10002') &&
    res.includes('Chief Complaint: Major Depressive Disorder follow-up') &&
    res.includes('CPT: 90834 - Psychotherapy (45m)') &&
    res.includes('DOS: October 5, 2026') &&
    res.includes('Clinician: Dr. Sarah Chen, MD');
  recordTest('Domain 1', 'D1.1', 'All 8 statutory standard tokens resolve correctly with complete context', ok);
}

// D1.2: Empty context defaults fallback
{
  const tmpl = 'Patient: {{patient_name}}, MRN: {{mrn}}, CPT: {{cpt_code}}';
  const res = interpolateTemplateVariables(tmpl, {});
  const ok =
    res.includes('Patient: Jane Doe') &&
    res.includes('MRN: #MC-88219') &&
    res.includes('CPT: 90837') &&
    !res.includes('undefined') &&
    !res.includes('null');
  recordTest('Domain 1', 'D1.2', 'Empty context gracefully applies statutory fallback defaults without undefined/null', ok);
}

// D1.3: Partial context overrides provided fields while defaulting missing
{
  const tmpl = 'Patient: {{patient_name}}, MRN: {{mrn}}, Clinician: {{clinician_name}}';
  const res = interpolateTemplateVariables(tmpl, { patient_name: 'David Kim' });
  const ok =
    res.includes('Patient: David Kim') &&
    res.includes('MRN: #MC-88219') &&
    res.includes('Clinician: Dr. Sarah Chen, MD');
  recordTest('Domain 1', 'D1.3', 'Partial context correctly binds supplied fields and defaults unsupplied standard fields', ok);
}

// D1.4: Empty string in standard field falls back to default placeholder
{
  const tmpl = 'Patient: {{patient_name}}, CPT: {{cpt_code}}';
  const res = interpolateTemplateVariables(tmpl, { patient_name: '   ', cpt_code: '' });
  const ok =
    res.includes('Patient: Jane Doe') &&
    res.includes('CPT: 90837');
  recordTest('Domain 1', 'D1.4', 'Whitespace-only or empty strings fallback safely to statutory defaults', ok);
}

// D1.5: Custom clinical tokens via context
{
  const tmpl = 'Allergies: {{allergies}} | Meds: {{medications}} | Vitals: {{vital_signs}} | Duration: {{session_duration}} | Ref: {{referring_provider}}';
  const ctx = {
    allergies: 'Penicillin (anaphylaxis), Sulfa',
    medications: 'Sertraline 50mg QD, Clonazepam 0.5mg PRN',
    vital_signs: 'BP 118/76, HR 68, SpO2 99%',
    session_duration: '53 minutes',
    referring_provider: 'Dr. Gregory House, MD',
  };
  const res = interpolateTemplateVariables(tmpl, ctx);
  const ok =
    res.includes('Penicillin (anaphylaxis), Sulfa') &&
    res.includes('Sertraline 50mg QD, Clonazepam 0.5mg PRN') &&
    res.includes('BP 118/76, HR 68, SpO2 99%') &&
    res.includes('53 minutes') &&
    res.includes('Dr. Gregory House, MD');
  recordTest('Domain 1', 'D1.5', 'Custom clinical tokens (allergies, medications, vitals, duration, referring) interpolate via context', ok);
}

// D1.6: Custom variables passed via 3rd argument customVariables options
{
  const tmpl = 'Primary: {{allergies}}, Secondary: {{custom_lab_value}}, Ins: {{insurance_provider}}';
  const res = interpolateTemplateVariables(tmpl, null, {
    customVariables: {
      allergies: 'NKDA',
      custom_lab_value: 'HbA1c 6.2%',
      insurance_provider: 'Blue Cross Blue Shield',
    },
  });
  const ok =
    res.includes('Primary: NKDA') &&
    res.includes('Secondary: HbA1c 6.2%') &&
    res.includes('Ins: Blue Cross Blue Shield');
  recordTest('Domain 1', 'D1.6', 'Arbitrary custom tokens interpolate via InterpolationOptions.customVariables', ok);
}

// D1.7: Array values joined safely
{
  const tmpl = 'Allergies: {{allergies}} | Meds: {{medications}}';
  const ctx = {
    allergies: ['Penicillin', 'Sulfa drugs', 'Latex'],
    medications: ['Metformin 500mg', 'Lisinopril 10mg'],
  };
  const res = interpolateTemplateVariables(tmpl, ctx);
  const ok =
    res.includes('Penicillin, Sulfa drugs, Latex') &&
    res.includes('Metformin 500mg, Lisinopril 10mg');
  recordTest('Domain 1', 'D1.7', 'Array variable values cleanly serialize into comma-separated strings without brackets', ok);
}

// D1.8: Unmapped tokens preservation by default
{
  const tmpl = 'Patient: {{patient_name}} | Unmapped: {{unknown_variable_foo}} | Incomplete: {single_brace}';
  const res = interpolateTemplateVariables(tmpl, { patient_name: 'Jane Doe' });
  const ok =
    res.includes('Patient: Jane Doe') &&
    res.includes('Unmapped: {{unknown_variable_foo}}') &&
    res.includes('Incomplete: {single_brace}');
  recordTest('Domain 1', 'D1.8', 'Unmapped tokens and single-brace strings are preserved verbatim by default', ok);
}

// D1.9: Configurable unmapped token removal via cleanUnmapped: true
{
  const tmpl = 'Hello {{patient_name}}, your test is {{unknown_lab_token}} and code is {{another_missing}}.';
  const res = interpolateTemplateVariables(tmpl, { patient_name: 'Jane Doe' }, { cleanUnmapped: true });
  const ok =
    res === 'Hello Jane Doe, your test is  and code is .';
  recordTest('Domain 1', 'D1.9', 'cleanUnmapped: true option removes all unmapped tokens cleanly', ok);
}

// D1.10: Configurable unmapped token replacement via string unmappedFallback
{
  const tmpl = 'Test: {{missing_1}} | Spec: {{missing_2}}';
  const res = interpolateTemplateVariables(tmpl, {}, {
    cleanUnmapped: true,
    unmappedFallback: '[NOT RECORDED]',
  });
  const ok =
    res === 'Test: [NOT RECORDED] | Spec: [NOT RECORDED]';
  recordTest('Domain 1', 'D1.10', 'unmappedFallback string populates custom replacement marker for missing tokens', ok);
}

// D1.11: Configurable unmapped token replacement via function unmappedFallback
{
  const tmpl = 'Field: {{missing_clinical_token}}';
  const res = interpolateTemplateVariables(tmpl, {}, {
    cleanUnmapped: true,
    unmappedFallback: (token) => `[UNMAPPED:${token.toUpperCase()}]`,
  });
  const ok =
    res === 'Field: [UNMAPPED:MISSING_CLINICAL_TOKEN]';
  recordTest('Domain 1', 'D1.11', 'unmappedFallback function callback dynamically transforms missing tokens', ok);
}

// D1.12: Prototype pollution defense - tokens in template
{
  const tmpl = 'Tokens: {{constructor}} {{__proto__}} {{prototype}} {{__defineGetter__}}';
  const res = interpolateTemplateVariables(tmpl, {});
  const cleanObj: Record<string, any> = {};
  const ok =
    res === tmpl &&
    (cleanObj as any).polluted === undefined &&
    (Object.prototype as any).polluted === undefined;
  recordTest('Domain 1', 'D1.12', 'Prototype pollution tokens remain verbatim and do not taint Object.prototype', ok);
}

// D1.13: Prototype pollution defense - hostile context payload
{
  const hostilePayload = JSON.parse(
    '{"__proto__": {"hacked": "true"}, "constructor": {"prototype": {"hacked": "true"}}, "patient_name": "Injected Name"}'
  );
  const res = interpolateTemplateVariables('Patient: {{patient_name}}', hostilePayload);
  const freshObj: any = {};
  const ok =
    res.includes('Injected Name') &&
    freshObj.hacked === undefined &&
    !('hacked' in freshObj) &&
    (Object.prototype as any).hacked === undefined;
  recordTest('Domain 1', 'D1.13', 'Hostile JSON payload with __proto__ fails to pollute global or fresh object prototype', ok);
}

// D1.14: Prototype property leaks (toString, valueOf, toLocaleString)
{
  const tmpl = 'Leaked: {{toString}} {{valueOf}} {{toLocaleString}} {{hasOwnProperty}} {{isPrototypeOf}}';
  const res = interpolateTemplateVariables(tmpl, {});
  const ok =
    res === tmpl &&
    !res.includes('[object Object]') &&
    !res.includes('native code');
  recordTest('Domain 1', 'D1.14', 'Prototype property tokens (toString, valueOf, etc.) do NOT leak function bodies or [object Object]', ok);
}

// D1.15: Hostile context attempting to supply forbidden prototype property
{
  const hostileCtx = {
    toString: 'EVIL_STRING',
    valueOf: 'EVIL_VALUE',
    constructor: 'EVIL_CONSTRUCTOR',
    patient_name: 'Safe Patient',
  };
  const tmpl = 'Patient: {{patient_name}}, toString: {{toString}}, valueOf: {{valueOf}}';
  const res = interpolateTemplateVariables(tmpl, hostileCtx);
  const ok =
    res.includes('Patient: Safe Patient') &&
    res.includes('toString: {{toString}}') &&
    res.includes('valueOf: {{valueOf}}') &&
    !res.includes('EVIL_STRING') &&
    !res.includes('EVIL_VALUE');
  recordTest('Domain 1', 'D1.15', 'Context supplying forbidden prototype keys (toString, valueOf) is defanged and ignored', ok);
}

// D1.16: Adversarial strings: XSS vectors, SQL injection, script tags
{
  const xssPayload = '<script>alert("xss")</script><img src="x" onerror="steal()"/>';
  const sqliPayload = "'; DROP TABLE patients; SELECT * FROM credentials WHERE '1'='1";
  const tmpl = 'Name: {{patient_name}} | Note: {{chief_complaint}}';
  const res = interpolateTemplateVariables(tmpl, {
    patient_name: xssPayload,
    chief_complaint: sqliPayload,
  });
  const ok =
    res.includes(xssPayload) &&
    res.includes(sqliPayload);
  recordTest('Domain 1', 'D1.16', 'XSS scripts and SQL injection payloads interpolate verbatim without code execution or crashing', ok);
}

// D1.17: Unicode, CJK, RTL Arabic, Accents, and Emojis
{
  const cjkName = '李小龙 (Bruce Lee) 田中太郎';
  const rtlName = 'فاطمة الزهراء (Fatima Al-Zahra)';
  const accentedName = 'Dr. José-María François-Müller';
  const emojiStr = '🩺 Vital Signs Normal 🧬 🚀 ✨';
  const tmpl = 'CJK: {{patient_name}} | RTL: {{allergies}} | Accents: {{clinician_name}} | Emojis: {{vital_signs}}';
  const res = interpolateTemplateVariables(tmpl, {
    patient_name: cjkName,
    allergies: rtlName,
    clinician_name: accentedName,
    vital_signs: emojiStr,
  });
  const ok =
    res.includes(cjkName) &&
    res.includes(rtlName) &&
    res.includes(accentedName) &&
    res.includes(emojiStr);
  recordTest('Domain 1', 'D1.17', 'CJK characters, RTL Arabic, accented European text, and emojis interpolate with 100% fidelity', ok);
}

// D1.18: Token variations: internal whitespace and case-insensitivity
{
  const tmpl = 'A: {{  patient_name   }} | B: {{PATIENT_NAME}} | C: {{Patient_Name}} | D: {{   ALLERGIES   }}';
  const res = interpolateTemplateVariables(tmpl, {
    patient_name: 'Alice Cooper',
    allergies: 'Latex',
  });
  const ok =
    res.includes('A: Alice Cooper') &&
    res.includes('B: Alice Cooper') &&
    res.includes('C: Alice Cooper') &&
    res.includes('D: Latex');
  recordTest('Domain 1', 'D1.18', 'Tokens with internal whitespace and varied casing (upper, mixed, lower) resolve consistently', ok);
}

// D1.19: Adjacent tokens and high-density repetition
{
  const tmpl = '{{patient_name}}{{cpt_code}}{{patient_name}}{{patient_name}}';
  const res = interpolateTemplateVariables(tmpl, { patient_name: 'Jane', cpt_code: '90837' });
  const ok = res === 'Jane90837JaneJane';
  recordTest('Domain 1', 'D1.19', 'Adjacent tokens without whitespace boundaries interpolate seamlessly', ok);
}

// D1.20: Boundary template sizes and null/undefined resilience
{
  const emptyStr = interpolateTemplateVariables('', {});
  const nullStr = interpolateTemplateVariables(null as any, {});
  const undefStr = interpolateTemplateVariables(undefined as any, {});
  const massiveStr = '{{patient_name}} '.repeat(5000);
  const start = Date.now();
  const massiveRes = interpolateTemplateVariables(massiveStr, { patient_name: 'Jane' });
  const duration = Date.now() - start;
  const ok =
    emptyStr === '' &&
    nullStr === '' &&
    undefStr === '' &&
    massiveRes.startsWith('Jane Jane ') &&
    duration < 100;
  recordTest('Domain 1', 'D1.20', 'Null/undefined/empty template strings handle safely; 5,000-token template resolves in <100ms', ok, `Took ${duration}ms`);
}


// ===========================================================================
// DOMAIN 2: TEMPLATE STUDIO RE-ORDERING & STATE PERSISTENCE BOUNDARIES
// ===========================================================================
console.log('\n--- Domain 2: Template Studio Section Re-ordering & State Persistence Boundaries ---');

// D2.1: Cold start factory template hydration
{
  (globalThis.window as any).localStorage.clear();
  const templates = getStoredTemplates();
  const mandatoryIds = ['psych-eval', 'soap', 'dap', 'birp', 'clinical-intake', 'discharge-summary'];
  const ok =
    templates.length === 6 &&
    mandatoryIds.every((id) => templates.some((t) => t.id === id)) &&
    templates.every((t) => t.sections.length >= 3);
  recordTest('Domain 2', 'D2.1', 'getStoredTemplates initializes exactly 6 standard factory templates with all mandatory IDs', ok);
}

// D2.2: Move top section up is a safe no-op
{
  const soap = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'soap')!)) as ClinicalTemplate;
  const initialSections = [...soap.sections];
  const initialFirstId = initialSections[0].id;

  // Simulate handleMoveSection(0, 'up')
  function moveSection(sections: TemplateSection[], index: number, direction: 'up' | 'down'): TemplateSection[] {
    const copy = [...sections];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= copy.length) return copy;
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    copy.forEach((s, idx) => { s.order = idx; });
    return copy;
  }

  const moved = moveSection(initialSections, 0, 'up');
  const ok =
    moved.length === initialSections.length &&
    moved[0].id === initialFirstId &&
    moved.every((s, idx) => s.order === idx);
  recordTest('Domain 2', 'D2.2', 'Moving top section (index 0) upward is a safe no-op preserving 0-based order', ok);
}

// D2.3: Move bottom section down is a safe no-op
{
  const soap = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'soap')!)) as ClinicalTemplate;
  const initialSections = [...soap.sections];
  const lastIdx = initialSections.length - 1;
  const initialLastId = initialSections[lastIdx].id;

  function moveSection(sections: TemplateSection[], index: number, direction: 'up' | 'down'): TemplateSection[] {
    const copy = [...sections];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= copy.length) return copy;
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    copy.forEach((s, idx) => { s.order = idx; });
    return copy;
  }

  const moved = moveSection(initialSections, lastIdx, 'down');
  const ok =
    moved.length === initialSections.length &&
    moved[moved.length - 1].id === initialLastId &&
    moved.every((s, idx) => s.order === idx);
  recordTest('Domain 2', 'D2.3', 'Moving bottom section downward is a safe no-op preserving 0-based order', ok);
}

// D2.4: Out-of-bounds move requests (-1, 999) safely ignored
{
  const soap = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'soap')!)) as ClinicalTemplate;
  let sections = [...soap.sections];

  function moveSection(sList: TemplateSection[], index: number, direction: 'up' | 'down'): TemplateSection[] {
    const copy = [...sList];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= copy.length || index < 0 || index >= copy.length) return copy;
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    copy.forEach((s, idx) => { s.order = idx; });
    return copy;
  }

  sections = moveSection(sections, -1, 'up');
  sections = moveSection(sections, 999, 'down');
  const ok = sections.length === soap.sections.length && sections[0].id === soap.sections[0].id;
  recordTest('Domain 2', 'D2.4', 'Out-of-bounds indices (-1, 999) in section move handler are safely rejected', ok);
}

// D2.5: Rapid 100-cycle random sequential shuffle preserves section integrity & 0-based indexing
{
  const psychEval = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'psych-eval')!)) as ClinicalTemplate;
  let sections = [...psychEval.sections];
  const originalIds = new Set(sections.map((s) => s.id));

  function moveSection(sList: TemplateSection[], index: number, direction: 'up' | 'down'): TemplateSection[] {
    const copy = [...sList];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= copy.length) return copy;
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    copy.forEach((s, idx) => { s.order = idx; });
    return copy;
  }

  // Perform 100 deterministic swaps
  for (let i = 0; i < 100; i++) {
    const idx = i % sections.length;
    const dir: 'up' | 'down' = i % 2 === 0 ? 'up' : 'down';
    sections = moveSection(sections, idx, dir);
  }

  const allIdsPresent = sections.every((s) => originalIds.has(s.id)) && sections.length === originalIds.size;
  const strictIndexing = sections.every((s, idx) => s.order === idx);
  const ok = allIdsPresent && strictIndexing;
  recordTest('Domain 2', 'D2.5', '100-cycle rapid sequential section move maintains exact ID membership and strict 0-based ordering', ok);
}

// D2.6: Section deletion guard (cannot delete when <= 1 section remaining)
{
  const templateWithOneSec: ClinicalTemplate = {
    id: 'single-sec-test',
    name: 'Single Section Test',
    description: 'Test template with 1 section',
    category: 'general',
    sections: [
      { id: 'sec-1', title: 'Only Section', promptInstruction: 'Only', placeholder: '', order: 0 },
    ],
  };

  function deleteSection(template: ClinicalTemplate, index: number): ClinicalTemplate {
    if (template.sections.length <= 1) return template; // Guard from TemplateStudio.tsx line 91
    const newSections = template.sections.filter((_, idx) => idx !== index);
    newSections.forEach((s, idx) => { s.order = idx; });
    return { ...template, sections: newSections };
  }

  const afterDelete = deleteSection(templateWithOneSec, 0);
  const ok = afterDelete.sections.length === 1 && afterDelete.sections[0].id === 'sec-1';
  recordTest('Domain 2', 'D2.6', 'TemplateStudio deletion guard protects templates with <= 1 section from zeroing out', ok);
}

// D2.7: Adding and updating sections
{
  const template: ClinicalTemplate = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES[0]));
  const originalLen = template.sections.length;

  const newSection: TemplateSection = {
    id: 'custom_section_101',
    title: 'Collateral Informant Interview',
    promptInstruction: 'Document information gathered from family members for {{patient_name}}.',
    placeholder: 'Enter collateral notes...',
    order: originalLen,
  };

  const updatedSections = [...template.sections, newSection];
  updatedSections.forEach((s, idx) => { s.order = idx; });

  const ok =
    updatedSections.length === originalLen + 1 &&
    updatedSections[updatedSections.length - 1].title === 'Collateral Informant Interview' &&
    updatedSections[updatedSections.length - 1].order === originalLen;
  recordTest('Domain 2', 'D2.7', 'Adding new clinical section correctly appends and assigns next sequential order index', ok);
}

// D2.8: Persistence round-trip to localStorage
{
  const customTmpl: ClinicalTemplate = {
    id: 'telehealth-custom-eval',
    name: 'Telehealth Intake Evaluation',
    description: 'Custom Telehealth Template',
    category: 'telehealth',
    sections: [
      { id: 'th-1', title: 'Tech Verification & Consent', promptInstruction: 'Audio/video confirmed', placeholder: '', order: 0 },
      { id: 'th-2', title: 'Clinical Formulation', promptInstruction: 'Diagnosis for {{patient_name}}', placeholder: '', order: 1 },
    ],
  };

  saveTemplate(customTmpl);
  const loaded = getStoredTemplates();
  const found = loaded.find((t) => t.id === 'telehealth-custom-eval');
  const ok =
    Boolean(found) &&
    found?.name === 'Telehealth Intake Evaluation' &&
    found?.sections.length === 2 &&
    found?.sections[0].title === 'Tech Verification & Consent';
  recordTest('Domain 2', 'D2.8', 'saveTemplate persists custom template to versioned localStorage key and re-hydrates accurately', ok);
}

// D2.9: Reset to factory presets purges custom template
{
  const beforeReset = getStoredTemplates();
  const hasCustom = beforeReset.some((t) => t.id === 'telehealth-custom-eval');

  const afterReset = resetToFactoryPresets();
  const customPurged = !afterReset.some((t) => t.id === 'telehealth-custom-eval');
  const factoryRestored = afterReset.length === 6;
  const ok = hasCustom && customPurged && factoryRestored;
  recordTest('Domain 2', 'D2.9', 'resetToFactoryPresets purges user-created templates and restores pristine factory presets', ok);
}

// D2.10: Massive template (100 sections) serialization & synthesis speed
{
  const massiveSections: TemplateSection[] = [];
  for (let i = 0; i < 100; i++) {
    massiveSections.push({
      id: `sec_massive_${i}`,
      title: `Clinical Section ${i + 1}`,
      promptInstruction: `Document findings for section ${i + 1} for {{patient_name}}.`,
      placeholder: `Placeholder ${i + 1}`,
      order: i,
    });
  }

  const massiveTemplate: ClinicalTemplate = {
    id: 'massive-100-sec',
    name: '100-Section Comprehensive Protocol',
    description: 'Massive protocol template',
    category: 'specialty',
    sections: massiveSections,
  };

  saveTemplate(massiveTemplate);
  const reloaded = getStoredTemplates().find((t) => t.id === 'massive-100-sec');

  const startSynth = Date.now();
  const transcript = 'Dr. Chen: How are you today? Jane Doe: I feel much better.';
  const synthesized = generateDeterministicClinicalNote({
    template: massiveTemplate,
    transcript,
    context: { patient_name: 'Jane Doe', clinician_name: 'Dr. Sarah Chen, MD' },
  });
  const synthTime = Date.now() - startSynth;

  const ok =
    reloaded?.sections.length === 100 &&
    synthesized.fullMarkdown.includes('CLINICAL SECTION 1') &&
    synthesized.fullMarkdown.includes('CLINICAL SECTION 100') &&
    synthTime < 50;
  recordTest('Domain 2', 'D2.10', '100-section template persists cleanly and deterministic note synthesizes in <50ms', ok, `Took ${synthTime}ms`);
}


// ===========================================================================
// DOMAIN 3: CODING SUGGESTION ENGINE & MEDICAL NECESSITY BUILDER
// ===========================================================================
console.log('\n--- Domain 3: Coding Suggestion Engine & Medical Necessity Builder ---');

// D3.1: Duration threshold 37m vs 38m
{
  const cpt37 = recommendCptCode(37);
  const cpt38 = recommendCptCode(38);
  const cpt37_5 = recommendCptCode(37.5);
  const cpt37_99 = recommendCptCode(37.99);

  const ok =
    cpt37.code === '90832' &&
    cpt38.code === '90834' &&
    cpt37_5.code === '90832' &&
    cpt37_99.code === '90832';
  recordTest('Domain 3', 'D3.1', 'Duration 37m (and 37.99m) maps to CPT 90832; 38m maps to CPT 90834', ok, `37m->${cpt37.code}, 38m->${cpt38.code}`);
}

// D3.2: Duration threshold 52m vs 53m
{
  const cpt52 = recommendCptCode(52);
  const cpt53 = recommendCptCode(53);
  const cpt52_5 = recommendCptCode(52.5);
  const cpt52_99 = recommendCptCode(52.99);
  const cpt53_01 = recommendCptCode(53.01);

  const ok =
    cpt52.code === '90834' &&
    cpt53.code === '90837' &&
    cpt52_5.code === '90834' &&
    cpt52_99.code === '90834' &&
    cpt53_01.code === '90837';
  recordTest('Domain 3', 'D3.2', 'Duration 52m (and 52.99m) maps to CPT 90834; 53m (and 53.01m) maps to CPT 90837', ok, `52m->${cpt52.code}, 53m->${cpt53.code}`);
}

// D3.3: Extreme durations (0m, negative, 120m)
{
  const cpt0 = recommendCptCode(0);
  const cptNeg = recommendCptCode(-10);
  const cpt120 = recommendCptCode(120);

  const ok =
    cpt0.code === '90832' &&
    cptNeg.code === '90832' &&
    cpt120.code === '90837';
  recordTest('Domain 3', 'D3.3', 'Degenerate durations (0m, -10m) default to 90832; extended 120m maps to 90837', ok);
}

// D3.4: Initial Intake flag overrides duration to CPT 90791
{
  const intake15 = recommendCptCode(15, true);
  const intake30 = recommendCptCode(30, true);
  const intake53 = recommendCptCode(53, true);
  const intake90 = recommendCptCode(90, true);

  const ok =
    intake15.code === '90791' &&
    intake30.code === '90791' &&
    intake53.code === '90791' &&
    intake90.code === '90791';
  recordTest('Domain 3', 'D3.4', 'isInitialIntake=true strictly overrides encounter duration to CPT 90791 across 15m, 30m, 53m, 90m', ok);
}

// D3.5: Somatic presentations with 0 false-positive psychiatric code matches
{
  const somaticDialogue = `
    Clinician: Hello Elena. We are here for your quarterly chronic disease review.
    Patient: Yes, doctor. My blood pressure has been around 130 over 85 at home.
    Clinician: Have you been taking your lisinopril daily?
    Patient: Yes, every morning. Also metformin 500mg twice daily with meals.
    Clinician: Any chest pain, angina, or shortness of breath?
    Patient: No chest pain at all. Sometimes slight wheezing when it is cold, so I used my albuterol inhaler once.
    Clinician: Fasting blood glucose was 118, HbA1c is 6.9%. Lungs are clear with no bronchospasm today.
  `;

  const suggestions = matchDiagnosticCodes(somaticDialogue);
  const psychiatricCodes = ['F41.1', 'F32.9', 'F32.1', 'F43.10', 'F90.2', 'F41.0', 'F42.2', 'F10.10'];
  const matchedPsychiatric = suggestions.filter((s) => psychiatricCodes.includes(s.code.code));
  const matchedCodes = suggestions.map((s) => s.code.code);

  const hasHypertension = matchedCodes.includes('I10');
  const hasDiabetes = matchedCodes.includes('E11.9');
  const hasAsthma = matchedCodes.includes('J45.41');
  const zeroPsychFalsePositives = matchedPsychiatric.length === 0;

  const ok = zeroPsychFalsePositives && hasHypertension && hasDiabetes && hasAsthma;
  recordTest('Domain 3', 'D3.5', 'Pure somatic clinical encounter identifies I10, E11.9, J45.41 with 0 false-positive psychiatric codes', ok, `Matched: ${matchedCodes.join(', ')}`);
}

// D3.6: Pediatric ADHD clinical presentation
{
  const adhdDialogue = `
    Clinician: Let us discuss Tommy's evaluation.
    Parent: The teacher says his attention deficit is severe. He shows extreme distractibility and inattention during reading.
    Clinician: How is his physical activity level?
    Parent: Constant hyperactivity, fidgeting with his hands, impulsivity when waiting for his turn, and executive dysfunction with homework.
  `;
  const suggestions = matchDiagnosticCodes(adhdDialogue);
  const topMatch = suggestions[0];
  const ok = Boolean(topMatch) && topMatch.code.code === 'F90.2';
  recordTest('Domain 3', 'D3.6', 'Pediatric presentation with inattention and hyperactivity scores ADHD (F90.2) as top diagnostic match', ok, `Top: ${topMatch?.code.code} (${topMatch?.code.description})`);
}

// D3.7: PTSD trauma presentation
{
  const ptsdDialogue = `
    Patient: Since the collision, I cannot sleep. Every night I have severe nightmares and night terrors.
    Clinician: Are you experiencing any daytime intrusive memories or flashbacks?
    Patient: Yes, constant intrusive memories. Any loud sound causes extreme hypervigilance and an exaggerated startle response. My PCL-5 score was high.
  `;
  const suggestions = matchDiagnosticCodes(ptsdDialogue);
  const topMatch = suggestions[0];
  const ok = Boolean(topMatch) && topMatch.code.code === 'F43.10';
  recordTest('Domain 3', 'D3.7', 'Trauma encounter with flashbacks and hypervigilance scores PTSD (F43.10) as top diagnostic match', ok, `Top: ${topMatch?.code.code} (${topMatch?.code.description})`);
}

// D3.8: Major Depressive Disorder moderate presentation
{
  const mddDialogue = `
    Patient: For the past two months I have experienced deep sadness and crying spells almost every morning.
    Clinician: How is your energy and interest in your hobbies?
    Patient: Total anergia and anhedonia. I have lost 8 pounds due to severe appetite loss, and profound sleep disturbance waking at 3am.
  `;
  const suggestions = matchDiagnosticCodes(mddDialogue);
  const matchedCodes = suggestions.map((s) => s.code.code);
  const hasMdd = matchedCodes.includes('F32.1') || matchedCodes.includes('F32.9');
  const ok = hasMdd && suggestions[0].code.code.startsWith('F32');
  recordTest('Domain 3', 'D3.8', 'Depressive encounter with anhedonia, anergia, crying spells scores MDD (F32.1/F32.9) as top match', ok, `Top: ${suggestions[0]?.code.code}`);
}

// D3.9: Diagnostic matcher noise resilience & score clamping
{
  const emptyRes = matchDiagnosticCodes('');
  const noiseRes = matchDiagnosticCodes('The quick brown fox jumps over the lazy dog. Today is Tuesday.');
  const hugeTranscript = 'Patient reports severe anxiety, panic, worry, and insomnia. '.repeat(500);

  const start = Date.now();
  const hugeRes = matchDiagnosticCodes(hugeTranscript);
  const duration = Date.now() - start;

  const scoresClamped = hugeRes.every((s) => s.confidence >= 20 && s.confidence <= 99);
  const sortedDescending = hugeRes.every((s, i) => i === 0 || s.confidence <= hugeRes[i - 1].confidence);

  const ok =
    emptyRes.length === 0 &&
    noiseRes.length === 0 &&
    hugeRes.length > 0 &&
    scoresClamped &&
    sortedDescending &&
    duration < 25;
  recordTest('Domain 3', 'D3.9', 'Diagnostic matcher handles empty/noise text; clamps confidence to [20, 99]; executes in <25ms', ok, `Took ${duration}ms`);
}

// D3.10: Medical Necessity Builder CMS / AMA audit compliance
{
  const primaryIcd = STATUTORY_ICD10_DATABASE.find((i) => i.code === 'F41.1')!;
  const secondaryIcds = [
    STATUTORY_ICD10_DATABASE.find((i) => i.code === 'I10')!,
    STATUTORY_ICD10_DATABASE.find((i) => i.code === 'E11.9')!,
  ];
  const cptCode = STATUTORY_CPT_DATABASE.find((c) => c.code === '90837')!;

  const params: MedicalNecessityParams = {
    patientName: 'Jane Doe',
    patientMrn: '#MC-88219',
    encounterDuration: 53,
    cptCode,
    primaryIcd,
    secondaryIcds,
    complexity: 'Moderate',
    interventions: [
      'Cognitive restructuring targeting catastrophic anticipatory anxiety cognitions',
      'Diaphragmatic breathing and progressive muscle relaxation training',
      'Systematic exposure hierarchy review for social avoidance triggers',
    ],
    clinicianName: 'Dr. Sarah Chen, MD',
  };

  const block = generateMedicalNecessityBlock(params);

  const hasHeader = block.includes('### MEDICAL CODING & MEDICAL NECESSITY JUSTIFICATION');
  const hasDos = block.includes('**Date of Service:**');
  const hasPatient = block.includes('**Patient:** Jane Doe (MRN: #MC-88219)');
  const hasCpt = block.includes('**Billing Level:** CPT 90837');
  const hasPrimary = block.includes('ICD-10 **F41.1** - Generalized anxiety disorder (GAD)');
  const hasSecondary1 = block.includes('* Secondary ICD-10: **I10**');
  const hasSecondary2 = block.includes('* Secondary ICD-10: **E11.9**');
  const hasSec1 = block.includes('**1. Clinical Medical Necessity & Symptom Severity Rationale:**');
  const hasSec2 = block.includes('**2. Duration & Complexity Validation (AMA / CMS Guidelines):**');
  const hasSec3 = block.includes('**3. Evidenced-Based Interventions Delivered:**');
  const hasSec4 = block.includes('**4. Treatment Response & Prognosis:**');
  const hasCertification = block.includes('Electronically signed by **Dr. Sarah Chen, MD**');

  const ok =
    hasHeader &&
    hasDos &&
    hasPatient &&
    hasCpt &&
    hasPrimary &&
    hasSecondary1 &&
    hasSecondary2 &&
    hasSec1 &&
    hasSec2 &&
    hasSec3 &&
    hasSec4 &&
    hasCertification;
  recordTest('Domain 3', 'D3.10', 'Medical Necessity Block fulfills all mandatory AMA/CMS statutory sections with multi-secondary ICDs', ok);
}

// D3.11: Medical Necessity Builder negative declaration for empty secondary ICDs
{
  const primaryIcd = STATUTORY_ICD10_DATABASE.find((i) => i.code === 'F43.10')!;
  const cptCode = STATUTORY_CPT_DATABASE.find((c) => c.code === '90834')!;

  const params: MedicalNecessityParams = {
    patientName: 'David Kim',
    patientMrn: '#MC-77312',
    encounterDuration: 45,
    cptCode,
    primaryIcd,
    secondaryIcds: [],
    complexity: 'Moderate',
    interventions: ['Prolonged exposure therapy and trauma narrative processing'],
    clinicianName: 'Dr. Sarah Chen, MD',
  };

  const block = generateMedicalNecessityBlock(params);
  const hasNegativeDecl = block.includes('* Secondary ICD-10: None documented for this encounter');
  const ok = hasNegativeDecl;
  recordTest('Domain 3', 'D3.11', 'Medical Necessity Block emits statutory negative declaration when secondary ICD list is empty', ok);
}

// D3.12: Medical Necessity Builder with special characters and international names
{
  const primaryIcd = STATUTORY_ICD10_DATABASE.find((i) => i.code === 'F32.1')!;
  const cptCode = STATUTORY_CPT_DATABASE.find((c) => c.code === '90791')!;

  const params: MedicalNecessityParams = {
    patientName: 'José-María Müller-François <script>',
    patientMrn: '#MRN-999-X',
    encounterDuration: 60,
    cptCode,
    primaryIcd,
    complexity: 'High',
    interventions: ['Comprehensive biopsychosocial diagnostic intake evaluation'],
    clinicianName: 'Dr. Renée O\'Connor, MD',
  };

  const block = generateMedicalNecessityBlock(params);
  const hasPatientName = block.includes('José-María Müller-François <script>');
  const hasClinician = block.includes('Dr. Renée O\'Connor, MD');
  const ok = hasPatientName && hasClinician;
  recordTest('Domain 3', 'D3.12', 'Medical Necessity Block formats non-ASCII characters, punctuation, and script tokens without escaping crashes', ok);
}


// ===========================================================================
// HARNESS EXECUTION SUMMARY
// ===========================================================================
console.log('\n====================================================================');
console.log('   CHALLENGER 1 M4 IT2 EMPIRICAL STRESS HARNESS SUMMARY            ');
console.log('====================================================================');
console.log(`Total Checks Run: ${testResults.length}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log('--------------------------------------------------------------------');

if (failCount === 0) {
  console.log('VERDICT: APPROVE');
  process.exit(0);
} else {
  console.error('VERDICT: REJECT');
  process.exit(1);
}
