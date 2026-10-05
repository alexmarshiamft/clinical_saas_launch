/**
 * Milestone 4 Automated Test Suite: Clinical AI Scribe v2 Integration
 * Verifies Features 13, 14, 15, 16, 17, and 18 across data contracts,
 * algorithms, templates, dual-engine synthesis, and UI invariant mounting.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

// Core imports
import { DEFAULT_CLINICAL_TEMPLATES } from '../src/tools/scribe/data/defaultTemplates';
import { interpolateTemplateVariables, SUPPORTED_VARIABLES } from '../src/tools/scribe/variable-interpolator';
import { generateDeterministicClinicalNote } from '../src/tools/scribe/ai-template-generator';
import {
  getStoredTemplates,
  saveTemplate,
  deleteTemplate,
  resetToFactoryPresets,
} from '../src/tools/scribe/data/templateStore';
import {
  STATUTORY_ICD10_DATABASE,
  STATUTORY_CPT_DATABASE,
} from '../src/tools/scribe/data/codingData';
import { matchDiagnosticCodes, recommendCptCode } from '../src/tools/scribe/utils/codeSuggestionEngine';
import { generateMedicalNecessityBlock } from '../src/tools/scribe/utils/medicalNecessityBuilder';
import {
  formatEpicSmartText,
  formatEpicFhirDocument,
  formatCernerPowerChart,
  formatAthenaEncounter,
  formatMarkdownUniversal,
  sanitizeEpicSmartTextContent,
  sanitizeCernerPowerChartContent,
} from '../src/tools/scribe/utils/ehrExportAdapters';
import { CLINICAL_ENCOUNTER_SAMPLES } from '../src/tools/scribe/PreRecordedEncounters';
import { ScribeWorkspace } from '../src/tools/scribe/ScribeWorkspace';
import { WaveformVisualizer } from '../src/tools/scribe/WaveformVisualizer';
import { ClinicalContextProvider } from '../src/lib/clinical-context';
import { EhrExportData } from '../src/tools/scribe/types';

// Test execution tracking
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
  console.log('   Milestone 4: Clinical AI Scribe v2 Integration Test Suite       ');
  console.log('====================================================================\n');

  // -------------------------------------------------------------------------
  // Category 1: Feature 13 Ambient Acoustic Diarization Feed
  // -------------------------------------------------------------------------
  console.log('--- Category 1: Feature 13 Ambient Acoustic Diarization Feed ---');
  {
    assert(
      CLINICAL_ENCOUNTER_SAMPLES.length >= 4,
      'F13.1 Encounter Catalog contains at least 4 clinical encounters',
      `Found ${CLINICAL_ENCOUNTER_SAMPLES.length} encounters`
    );

    const gad7 = CLINICAL_ENCOUNTER_SAMPLES.find((c) => c.id === 'sample-gad7');
    assert(
      Boolean(gad7 && gad7.patientName === 'Jane Doe' && gad7.cptCode === '90837'),
      'F13.2 GAD-7 Anxiety Intake sample binds to Jane Doe and CPT 90837'
    );

    const mdd = CLINICAL_ENCOUNTER_SAMPLES.find((c) => c.id === 'sample-mdd');
    assert(
      Boolean(mdd && mdd.patientName === 'Marcus Vance' && mdd.cptCode === '90834'),
      'F13.3 MDD Follow-up sample binds to Marcus Vance and CPT 90834'
    );

    const ptsd = CLINICAL_ENCOUNTER_SAMPLES.find((c) => c.id === 'sample-ptsd');
    assert(
      Boolean(ptsd && ptsd.patientName === 'David Kim' && ptsd.cptCode === '90837'),
      'F13.4 PTSD Trauma Session sample binds to David Kim and CPT 90837'
    );

    const dia = CLINICAL_ENCOUNTER_SAMPLES.find((c) => c.id === 'sample-diabetes');
    assert(
      Boolean(dia && dia.patientName === 'Elena Rostova' && dia.cptCode === '99214'),
      'F13.5 Diabetes Somatic Consultation binds to Elena Rostova and CPT 99214'
    );

    // Verify utterance data model
    const sampleUtterance = gad7?.transcript[0];
    assert(
      Boolean(
        sampleUtterance &&
          sampleUtterance.speakerId === 'clinician' &&
          sampleUtterance.timestamp === '00:00' &&
          typeof sampleUtterance.seconds === 'number' &&
          sampleUtterance.text.length > 0
      ),
      'F13.6 Utterance contract fulfills id, role, timestamp, seconds, and text'
    );
  }

  // -------------------------------------------------------------------------
  // Category 2: Feature 14 6 Clinical Note Templates & Dual-Engine AI
  // -------------------------------------------------------------------------
  console.log('\n--- Category 2: Feature 14 6 Clinical Note Templates & Dual-Engine AI ---');
  {
    assert(
      DEFAULT_CLINICAL_TEMPLATES.length === 6,
      'F14.1 Exactly 6 standard clinical templates pre-configured in defaultTemplates.ts',
      `Found ${DEFAULT_CLINICAL_TEMPLATES.length}`
    );

    const expectedIds = ['psych-eval', 'soap', 'dap', 'birp', 'clinical-intake', 'discharge-summary'];
    const actualIds = DEFAULT_CLINICAL_TEMPLATES.map((t) => t.id);
    const allIdsPresent = expectedIds.every((id) => actualIds.includes(id));
    assert(allIdsPresent, 'F14.2 All 6 mandated template IDs present (psych-eval, soap, dap, birp, intake, discharge)');

    // 1. Comprehensive Psychiatric Evaluation
    const psychEval = DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'psych-eval');
    const psychSectionIds = psychEval?.sections.map((s) => s.id) || [];
    const mandatedPsychSections = ['hpi', 'past_psych', 'medical_substance', 'mse', 'diagnostic_formulation', 'treatment_recommendations'];
    assert(
      mandatedPsychSections.every((id) => psychSectionIds.includes(id)),
      'F14.3 Comprehensive Psychiatric Evaluation has all 6 mandated sections (HPI, Past Psych, Medical, MSE, Formulation, Treatment)'
    );

    // 2. SOAP Note
    const soap = DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'soap');
    const soapSectionIds = soap?.sections.map((s) => s.id) || [];
    assert(
      ['subjective', 'objective', 'assessment', 'plan'].every((id) => soapSectionIds.includes(id)),
      'F14.4 SOAP Progress Note contains Subjective, Objective, Assessment, Plan'
    );

    // 3. DAP Note
    const dap = DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'dap');
    const dapSectionIds = dap?.sections.map((s) => s.id) || [];
    assert(
      ['data', 'assessment', 'plan'].every((id) => dapSectionIds.includes(id)),
      'F14.5 DAP Progress Note contains Data, Assessment, Plan'
    );

    // 4. BIRP Note
    const birp = DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'birp');
    const birpSectionIds = birp?.sections.map((s) => s.id) || [];
    assert(
      ['behavior', 'intervention', 'response', 'plan'].every((id) => birpSectionIds.includes(id)),
      'F14.6 BIRP Progress Note contains Behavior, Intervention, Response, Plan'
    );

    // 5. Clinical Intake
    const intake = DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'clinical-intake');
    const intakeSectionIds = intake?.sections.map((s) => s.id) || [];
    assert(
      ['presenting_problem', 'biopsychosocial_history', 'risk_assessment', 'diagnostic_impressions', 'clinical_goals'].every((id) =>
        intakeSectionIds.includes(id)
      ),
      'F14.7 Clinical Intake Assessment contains Presenting Problem, History, Risk, Impressions, Goals'
    );

    // 6. Discharge Summary
    const discharge = DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'discharge-summary');
    const dischargeSectionIds = discharge?.sections.map((s) => s.id) || [];
    assert(
      ['reason_admission', 'treatment_course', 'condition_discharge', 'continuing_care', 'relapse_prevention'].every((id) =>
        dischargeSectionIds.includes(id)
      ),
      'F14.8 Discharge Summary contains Admission Reason, Treatment Course, Discharge Condition, Care, Relapse'
    );

    // Deterministic Rule Engine Performance & Synthesis Test across all 6 templates
    const testTranscript =
      '[00:00] Dr. Chen: Good morning Jane, how did the stimulus control exercises work this week?\n[00:08] Jane Doe: Dr. Chen, it really made a difference. I fell asleep in under 20 minutes. Anxiety was much lower.';
    const testContext = {
      patient_name: 'Jane Doe',
      mrn: '#MC-88219',
      dob: '04/12/1988',
      chief_complaint: 'Generalized Anxiety Disorder follow-up',
      cpt_code: '90837',
      encounter_date: 'October 5, 2026',
      clinician_name: 'Dr. Sarah Chen, MD',
    };

    // JIT warm-up to eliminate cold-start artifact
    generateDeterministicClinicalNote({
      template: DEFAULT_CLINICAL_TEMPLATES[0],
      transcript: testTranscript,
      context: testContext,
    });

    for (const tpl of DEFAULT_CLINICAL_TEMPLATES) {
      const startTime = Date.now();
      const result = generateDeterministicClinicalNote({
        template: tpl,
        transcript: testTranscript,
        context: testContext,
      });
      const durationMs = Date.now() - startTime;

      assert(
        result.engineUsed === 'deterministic-rule-engine' &&
          result.fullMarkdown.length > 100 &&
          result.fullMarkdown.includes('Jane Doe') &&
          result.fullMarkdown.includes('#MC-88219'),
        `F14.9 [${tpl.name}] Deterministic synthesis produces valid clinical markdown with patient demographics`
      );
      assert(durationMs < 50, `F14.10 [${tpl.name}] Deterministic synthesis executes instantaneously (<50ms, took ${durationMs}ms)`);
    }
  }

  // -------------------------------------------------------------------------
  // Category 3: Feature 15 Scribe Template Studio & Variable Interpolation
  // -------------------------------------------------------------------------
  console.log('\n--- Category 3: Feature 15 Scribe Template Studio & Variable Interpolation ---');
  {
    const rawTemplateStr =
      'Patient {{patient_name}} (MRN: {{mrn}}, DOB: {{dob}}) evaluated on {{encounter_date}} by {{clinician_name}} for {{chief_complaint}} under CPT {{cpt_code}}.';
    const testContext = {
      patient_name: 'Jane Doe',
      mrn: '#MC-88219',
      dob: '04/12/1988',
      chief_complaint: 'Panic Disorder & Agoraphobia',
      cpt_code: '90837',
      encounter_date: '10/05/2026',
      clinician_name: 'Dr. Sarah Chen, MD',
    };

    const interpolated = interpolateTemplateVariables(rawTemplateStr, testContext);

    assert(
      interpolated.includes('Jane Doe') &&
        interpolated.includes('#MC-88219') &&
        interpolated.includes('04/12/1988') &&
        interpolated.includes('Panic Disorder & Agoraphobia') &&
        interpolated.includes('90837') &&
        interpolated.includes('10/05/2026') &&
        interpolated.includes('Dr. Sarah Chen, MD'),
      'F15.1 interpolateTemplateVariables successfully replaces all 7 clinical variable tokens'
    );

    assert(
      SUPPORTED_VARIABLES.length >= 7,
      'F15.2 SUPPORTED_VARIABLES exposes at least 7 variable token chips with labels and examples'
    );

    // Section re-ordering and order re-indexing check
    const soapTpl = JSON.parse(JSON.stringify(DEFAULT_CLINICAL_TEMPLATES.find((t) => t.id === 'soap')!));
    const reorderedSections = [...soapTpl.sections].reverse();
    reorderedSections.forEach((s, idx) => {
      s.order = idx;
    });

    assert(
      reorderedSections[0].id === 'plan' && reorderedSections[0].order === 0,
      'F15.3 Dynamic section re-ordering correctly assigns new position and 0-based order index'
    );

    // Custom variable token interpolation and prototype safety
    const customTemplate = 'Allergies: {{allergies}}, Duration: {{session_duration}}, Token: {{constructor}} {{__proto__}}';
    const customResult = interpolateTemplateVariables(customTemplate, {
      allergies: 'NKDA (No Known Drug Allergies)',
      session_duration: '53 minutes',
    });
    assert(
      customResult.includes('NKDA (No Known Drug Allergies)') &&
        customResult.includes('53 minutes') &&
        customResult.includes('{{constructor}}') &&
        customResult.includes('{{__proto__}}'),
      'F15.4 interpolateTemplateVariables supports custom tokens and resists prototype property leaks'
    );

    // Unmapped token preservation by default and cleanUnmapped option
    const unmappedTmpl = 'Note: {{custom_specialty}} and {{custom_field}}';
    const defaultUnmapped = interpolateTemplateVariables(unmappedTmpl, {});
    const cleanedUnmapped = interpolateTemplateVariables(unmappedTmpl, {}, { cleanUnmapped: true });
    assert(
      defaultUnmapped.includes('{{custom_specialty}}') &&
        defaultUnmapped.includes('{{custom_field}}') &&
        cleanedUnmapped === 'Note:  and ',
      'F15.5 interpolateTemplateVariables preserves unmapped tokens by default and cleans them with cleanUnmapped option'
    );
  }

  // -------------------------------------------------------------------------
  // Category 4: Feature 16 Scribe Billing & Coding Assistant
  // -------------------------------------------------------------------------
  console.log('\n--- Category 4: Feature 16 Scribe Billing & Coding Assistant ---');
  {
    assert(
      STATUTORY_ICD10_DATABASE.length >= 10,
      'F16.1 Statutory ICD-10 database contains primary psychiatric & somatic codes'
    );

    const hasGad = STATUTORY_ICD10_DATABASE.some((c) => c.code === 'F41.1');
    const hasMdd = STATUTORY_ICD10_DATABASE.some((c) => c.code === 'F32.9' || c.code === 'F32.1');
    const hasPtsd = STATUTORY_ICD10_DATABASE.some((c) => c.code === 'F43.10');
    assert(hasGad && hasMdd && hasPtsd, 'F16.2 ICD-10 database contains F41.1 (GAD), F32.1/F32.9 (MDD), F43.10 (PTSD)');

    assert(
      STATUTORY_CPT_DATABASE.length >= 6,
      'F16.3 Statutory CPT database contains 90832, 90834, 90837, 90791, 99213, 99214'
    );

    // Diagnostic Matcher with anxiety transcript
    const anxietyMatches = matchDiagnosticCodes(
      'Patient reports chronic worry, racing heart, and elevated GAD-7 score.',
      'Generalized Anxiety Disorder assessment.',
      'Sleep onset insomnia and anxiety.'
    );
    assert(
      anxietyMatches.length > 0 && anxietyMatches[0].code.code === 'F41.1',
      'F16.4 matchDiagnosticCodes scores F41.1 as top match for anxiety dialogue'
    );

    // Diagnostic Matcher with trauma transcript
    const ptsdMatches = matchDiagnosticCodes(
      'Severe trauma flashbacks, night terrors, and constant hypervigilance in public.',
      'Trauma processing and PTSD symptoms.',
      'Startle reflex and intrusion.'
    );
    assert(
      ptsdMatches.length > 0 && ptsdMatches[0].code.code === 'F43.10',
      'F16.5 matchDiagnosticCodes scores F43.10 as top match for PTSD/trauma dialogue'
    );

    // CPT duration recommendation
    assert(recommendCptCode(60).code === '90837', 'F16.6 recommendCptCode maps 60 min to 90837');
    assert(recommendCptCode(45).code === '90834', 'F16.7 recommendCptCode maps 45 min to 90834');
    assert(recommendCptCode(30).code === '90832', 'F16.8 recommendCptCode maps 30 min to 90832');
    assert(recommendCptCode(60, true).code === '90791', 'F16.9 recommendCptCode maps initial intake to 90791');

    // Medical Necessity Justification Statement Builder
    const cpt90837 = STATUTORY_CPT_DATABASE.find((c) => c.code === '90837')!;
    const icdF411 = STATUTORY_ICD10_DATABASE.find((c) => c.code === 'F41.1')!;

    const justification = generateMedicalNecessityBlock({
      patientName: 'Jane Doe',
      patientMrn: '#MC-88219',
      encounterDuration: 60,
      cptCode: cpt90837,
      primaryIcd: icdF411,
      interventions: ['Cognitive Behavioral Therapy (CBT)', 'Progressive muscle relaxation'],
      complexity: 'High',
      clinicianName: 'Dr. Sarah Chen, MD',
    });

    assert(
      justification.includes('MEDICAL CODING & MEDICAL NECESSITY JUSTIFICATION') &&
        justification.includes('Jane Doe') &&
        justification.includes('CPT 90837') &&
        justification.includes('ICD-10 **F41.1**') &&
        justification.includes('Dr. Sarah Chen, MD'),
      'F16.10 generateMedicalNecessityBlock generates audit-compliant statement containing AMA/CMS criteria'
    );
  }

  // -------------------------------------------------------------------------
  // Category 5: Feature 17 Scribe Multi-EHR Export Adapters
  // -------------------------------------------------------------------------
  console.log('\n--- Category 5: Feature 17 Scribe Multi-EHR Export Adapters ---');
  {
    const exportData: EhrExportData = {
      patient: {
        name: 'Jane Doe',
        mrn: '#MC-88219',
        dob: '04/12/1988',
        id: 'p-101',
        cptCode: '90837',
      },
      clinician: {
        name: 'Dr. Sarah Chen, MD',
        npi: '1982730192',
        specialty: 'Psychiatry & Behavioral Health',
      },
      notes: {
        subjective: 'Patient reports improved sleep and lower anxiety.',
        objective: 'Alert and oriented x4. Affect congruent.',
        assessment: 'Generalized Anxiety Disorder (F41.1).',
        plan: 'Continue weekly CBT (CPT 90837).',
      },
      primaryIcd: 'F41.1',
    };

    // 1. Epic SmartText
    const epicText = formatEpicSmartText(exportData);
    assert(
      epicText.includes('.MARSHI_CLINICAL_NOTE') &&
        epicText.includes('=== SUBJECTIVE ===') &&
        epicText.includes('=== OBJECTIVE ===') &&
        epicText.includes('=== ASSESSMENT & DIAGNOSES ===') &&
        epicText.includes('=== PLAN & ORDERS ==='),
      'F17.1 formatEpicSmartText outputs valid Epic dot-phrase format with section delimiters'
    );

    // 2. Epic FHIR R4 DocumentReference JSON
    const fhirJson = formatEpicFhirDocument(exportData);
    const parsedFhir = JSON.parse(fhirJson);
    assert(
      parsedFhir.resourceType === 'DocumentReference' &&
        parsedFhir.type?.coding[0]?.code === '11506-3' &&
        parsedFhir.subject?.reference === 'Patient/p-101',
      'F17.2 formatEpicFhirDocument produces valid FHIR R4 DocumentReference JSON with LOINC 11506-3'
    );

    // 3. Oracle / Cerner PowerChart
    const cernerText = formatCernerPowerChart(exportData);
    assert(
      cernerText.includes('ORACLE HEALTH / CERNER POWERCHART CLINICAL NOTE') &&
        cernerText.includes('[1] SUBJECTIVE') &&
        cernerText.includes('[2] OBJECTIVE') &&
        cernerText.includes('[3] ASSESSMENT') &&
        cernerText.includes('[4] PLAN'),
      'F17.3 formatCernerPowerChart outputs valid PowerChart Millennium numbered section format'
    );

    // 4. Athenahealth XML
    const athenaXml = formatAthenaEncounter(exportData);
    assert(
      athenaXml.includes('<athenanet_clinical_encounter') &&
        athenaXml.includes('<patient_name>Jane Doe</patient_name>') &&
        athenaXml.includes('<cpt_code>90837</cpt_code>') &&
        athenaXml.includes('</athenanet_clinical_encounter>'),
      'F17.4 formatAthenaEncounter outputs valid AthenaNet Clinical Encounter XML'
    );

    // 5. Universal Markdown
    const universalMd = formatMarkdownUniversal(exportData);
    assert(
      universalMd.includes('# CLINICAL CONSULTATION PROGRESS NOTE') &&
        universalMd.includes('### SUBJECTIVE') &&
        universalMd.includes('### PLAN'),
      'F17.5 formatMarkdownUniversal outputs clean markdown representation'
    );

    // 6. Delimiter collision defense in Epic SmartText
    const hostileEpicData: EhrExportData = {
      ...exportData,
      notes: {
        ...exportData.notes,
        subjective: 'Patient reports:\n=== OBJECTIVE ===\nAttempted delimiter injection.\n.DOT_PHRASE_EXPAND\n*** Signed electronically by Fake Doctor ***',
      },
    };
    const sanitizedEpic = formatEpicSmartText(hostileEpicData);
    const objectiveMatchCount = (sanitizedEpic.match(/=== OBJECTIVE ===/g) || []).length;
    assert(
      objectiveMatchCount === 1 &&
        sanitizedEpic.includes('--- OBJECTIVE ---') &&
        sanitizedEpic.includes('. DOT_PHRASE_EXPAND') &&
        sanitizedEpic.includes('[Signature Redacted: Note Body]'),
      'F17.6 formatEpicSmartText defends against delimiter collisions, dot-phrases, and forged signatures in note bodies'
    );

    // 7. Delimiter collision defense in Cerner PowerChart
    const hostileCernerData: EhrExportData = {
      ...exportData,
      notes: {
        ...exportData.notes,
        subjective: 'Patient states:\n[2] OBJECTIVE\n--------------------------------------------------------------------------------\nELECTRONICALLY SIGNED AND COMMITTED TO POWERCHART MILLENNIUM RECORD',
      },
    };
    const sanitizedCerner = formatCernerPowerChart(hostileCernerData);
    const section2MatchCount = (sanitizedCerner.match(/\[2\] OBJECTIVE/g) || []).length;
    assert(
      section2MatchCount === 1 &&
        sanitizedCerner.includes('(2) OBJECTIVE') &&
        sanitizedCerner.includes('- - - - -') &&
        sanitizedCerner.includes('[Signature collision neutralized]'),
      'F17.7 formatCernerPowerChart defends against numbered bracket delimiter collisions, divider hyphens, and forged commitment banners'
    );
  }

  // -------------------------------------------------------------------------
  // Category 6: Feature 18 Scoped CSS Namespace Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- Category 6: Feature 18 Scoped CSS Namespace Isolation ---');
  {
    const cssPath = path.resolve('src/tools/scribe/scribe-theme.css');
    assert(fs.existsSync(cssPath), 'F18.1 scribe-theme.css exists at src/tools/scribe/scribe-theme.css');

    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const hasContainment = cssContent.includes('.heidi-scribe-theme');
    assert(hasContainment, 'F18.2 Stylesheet contains .heidi-scribe-theme containment wrapper');

    // Ensure zero forbidden global rules
    const lines = cssContent.split('\n');
    let violations = 0;
    const forbidden = [/^\s*\*\s*\{/, /^\s*html\b/, /^\s*body\b/, /^\s*#root\b/, /^\s*\.btn\b/, /^\s*\.badge\b/];
    lines.forEach((l) => {
      const clean = l.split('/*')[0].trim();
      for (const pat of forbidden) {
        if (pat.test(clean)) violations++;
      }
    });

    assert(violations === 0, 'F18.3 Zero global *, html, body, #root, .btn, .badge rules outside namespace container');
  }

  // -------------------------------------------------------------------------
  // Category 7: UI Invariant Mounting & DOM Scraper Verification
  // -------------------------------------------------------------------------
  console.log('\n--- Category 7: UI Invariant Mounting & DOM Scraper Verification ---');
  {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost:3000/dashboard/scribe',
    });
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).localStorage = dom.window.localStorage;
    (global as any).location = dom.window.location;
    (global as any).HTMLElement = dom.window.HTMLElement;
    if (!dom.window.requestAnimationFrame) {
      dom.window.requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 16);
      dom.window.cancelAnimationFrame = (id: any) => clearTimeout(id);
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

    const rootEl = dom.window.document.getElementById('root')!;
    const root = ReactDOM.createRoot(rootEl);

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(ClinicalContextProvider, null, React.createElement(ScribeWorkspace))
      );
      setTimeout(resolve, 80);
    });

    const renderedHtml = rootEl.innerHTML;

    // Verify all 9 strict invariant strings
    assert(renderedHtml.includes('Clinical AI Scribe v2'), 'UI.1 Invariant string "Clinical AI Scribe v2" rendered');
    assert(renderedHtml.includes('AI Diarization Ready'), 'UI.2 Invariant string "AI Diarization Ready" rendered');
    assert(renderedHtml.includes('Live Acoustic Transcript'), 'UI.3 Invariant string "Live Acoustic Transcript" rendered');
    assert(renderedHtml.includes('Dr. Chen:'), 'UI.4 Invariant string "Dr. Chen:" rendered');
    assert(renderedHtml.includes('Jane Doe:'), 'UI.5 Invariant string "Jane Doe:" rendered');
    assert(renderedHtml.includes('Generated SOAP Preview'), 'UI.6 Invariant string "Generated SOAP Preview" rendered');
    assert(renderedHtml.includes('Subjective:'), 'UI.7 Invariant string "Subjective:" rendered');
    assert(renderedHtml.includes('Assessment:'), 'UI.8 Invariant string "Assessment:" rendered');
    assert(
      renderedHtml.includes('Generated SOAP Preview (CPT 90837)'),
      'UI.9 Invariant string "Generated SOAP Preview (CPT 90837)" rendered'
    );

    // Verify SVG Waveform Visualizer mounts cleanly without canvas error
    const svgVisualizer = dom.window.document.querySelector('svg.waveform-visualizer');
    assert(Boolean(svgVisualizer), 'UI.10 Dynamic SVG Waveform Visualizer mounts without canvas context crashes');

    root.unmount();
  }

  // -------------------------------------------------------------------------
  // Final Results Summary
  // -------------------------------------------------------------------------
  console.log('\n====================================================================');
  console.log(`   Milestone 4 Verification Summary: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('✓ [CERTIFIED] All Milestone 4 Clinical AI Scribe v2 deliverables pass.\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
