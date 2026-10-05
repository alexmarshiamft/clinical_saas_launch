## 2026-10-05T05:17:20Z
You are Worker M4 (teamwork_preview_worker).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m4
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md
The E2E test certification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/TEST_READY.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task:
Implement Milestone 4: Clinical AI Scribe v2 Integration across Features 13, 14, 15, 16, 17, and 18.
Read the comprehensive blueprints prepared by the 3 Explorers:
- Explorer 1 (Diarization, Audio & Scoped CSS): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m4_1/report.md
- Explorer 2 (6 Note Templates, Dual-engine AI & Template Studio): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m4_2/report.md
- Explorer 3 (Billing/Coding Assistant, Multi-EHR Export, Invariant Preservation & Tests): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m4_3/report.md
- Canonical source portfolio: /Users/alexandermarshi/Downloads/heidi-clone/

Implement the following deliverables in `src/tools/scribe/`:
1. `src/tools/scribe/types.ts`: TypeScript contracts for Utterance, DiarizationSession, ClinicalTemplate, NoteSection, CodeSuggestion, EhrExportFormat, and TemplateVariables.
2. Feature 13: Ambient Acoustic Diarization Feed:
   - `WaveformVisualizer.tsx`: Dynamic SVG-based audio visualizer (rendering animated bars/waveform safe from JSDOM/null canvas context crashes).
   - `AudioRecorder.tsx`: Recording controls (Record, Pause, Stop, Clear), audio input device selector, simulation mode fallback for headless test environments.
   - `DiarizationFeed.tsx`: Speaker separation (Dr. Sarah Chen, MD vs Jane Doe / active encounter), timestamps, 1-click speaker flip button, editable utterance text, search, and transcript export.
   - `PreRecordedEncounters.tsx`: Catalog of realistic clinical encounter transcripts (GAD-7 intake, MDD follow-up, PTSD trauma session, Diabetes/Somatic consultation) with speed-controlled playback simulation.
3. Feature 14: 6 Clinical Note Templates & Dual-Engine Generation:
   - `data/defaultTemplates.ts`: Pre-configured schemas for:
     1. Comprehensive Psychiatric Evaluation (HPI, Past Psych, Medical, MSE, Diagnostic Formulation, Treatment Recommendations)
     2. SOAP Progress Note (Subjective, Objective, Assessment, Plan)
     3. DAP Progress Note (Data, Assessment, Plan)
     4. BIRP Progress Note (Behavior, Intervention, Response, Plan)
     5. Clinical Intake Assessment (Presenting Problem, Biopsychosocial History, Risk Assessment, Diagnostic Impressions, Clinical Goals)
     6. Discharge Summary (Reason for Admission, Summary of Treatment Course, Condition at Discharge, Continuing Care Plan, Relapse Prevention)
   - `ai-template-generator.ts`: Dual-engine note synthesis:
     - Branch A: Live `@google/genai` Gemini 2.5 Flash (`gemini-2.5-flash`) structured JSON output when `GEMINI_API_KEY` is present.
     - Branch B: Rich deterministic clinical rule engine parsing transcript for risk assessment, therapeutic modalities (CBT, PMR, EMDR), mental status observations, and interpolating patient clinical context.
   - `NoteTemplates.tsx`: Template selector, section accordion editor, copy formatted note, and direct 1-click dispatch to TheraFlow EHR (`insertToEhr()`) and HIPAA PHI Scrubber (`sendToPhiScrubber()`).
4. Feature 15: Scribe Template Studio:
   - `TemplateStudio.tsx`: Clinician prompt engineering studio, dynamic section re-ordering (Move Up / Move Down buttons), custom clinical variable token interpolation (`{{patient_name}}`, `{{dob}}`, `{{mrn}}`, `{{chief_complaint}}`, `{{cpt_code}}`, `{{encounter_date}}`, `{{clinician_name}}`), token insertion chips, template saving to versioned localStorage (`clinical_saas_scribe_templates_v2`), and factory preset reset.
5. Feature 16: Scribe Billing & Coding Assistant:
   - `data/codingData.ts`: Database of psychiatric ICD-10 codes (F41.1, F32.9, F43.10, F90.2, etc.) and psychotherapy CPT codes (90832, 90834, 90837, 90791, 99213, 99214).
   - `utils/codeSuggestionEngine.ts`: Real-time keyword & clinical symptom code matcher.
   - `utils/medicalNecessityBuilder.ts`: Audit-proof CMS medical necessity justification builder.
   - `BillingCodingAssistant.tsx`: Real-time coding suggestion panel with 1-click code acceptance syncing to `activePatient.cptCode` via `setActivePatient`.
6. Feature 17: Scribe Multi-EHR Export Adapters:
   - `utils/ehrExportAdapters.ts`: Statutory export adapters for:
     - Epic Systems: Dot-phrase SmartText (`.MARSHI_CLINICAL_NOTE`, `=== SECTION ===`) + HL7 FHIR R4 `DocumentReference` JSON.
     - Oracle Health / Cerner: PowerChart Millennium format with bracketed sections (`[1] SUBJECTIVE`) and coding reconciliation footer.
     - Athenahealth: Valid statutory AthenaNet XML format (`<athenanet_clinical_encounter>`).
     - Universal Rich Text / Markdown formatted clipboard copy.
   - `MultiEhrExportPanel.tsx`: Format selector, formatted preview, 1-click copy with toast feedback, and download options.
7. Feature 18: Scribe CSS Namespace Isolation:
   - `src/tools/scribe/scribe-theme.css`: Complete styling strictly scoped under `.heidi-scribe-theme` without global bleed. Zero top-level `*`, `html`, or `body` overrides.
8. Container, Routing & E2E String Invariants:
   - `src/tools/scribe/ScribeWorkspace.tsx`: Multi-tabbed workspace (`feed`, `templates`, `studio`, `billing`, `export`) wrapped in `<div className="heidi-scribe-theme ...">`.
   - STRICT INVARIANT PRESERVATION: On the default `'feed'` tab, permanently render all 9 exact strings required by E2E tests:
     - `"Clinical AI Scribe v2"`
     - `"AI Diarization Ready"`
     - `"Live Acoustic Transcript"`
     - `"Dr. Chen:"`
     - `"Jane Doe:"`
     - `"Generated SOAP Preview"`
     - `"Subjective:"`
     - `"Assessment:"`
     - `"Generated SOAP Preview (CPT 90837)"`
   - `src/App.tsx`: Ensure route `/dashboard/scribe` and `/dashboard/scribe/*` is protected by `<SubscriptionGate requiredTier="starter">`.
   - `src/components/layout/Sidebar.tsx`: Ensure Scribe is unlocked for starter tier users.
9. Milestone 4 Automated Test Suite:
   - Author `tests/m4-clinical-scribe.test.ts` (verifying all Features 13–18: diarization data structures, 6 templates, template generator dual-engine, template studio variable interpolation, ICD-10/CPT coding reconciler, multi-EHR export formatting, CSS isolation, and UI tab mounting).
   - Add `"test:scribe": "tsx tests/m4-clinical-scribe.test.ts"` to `package.json`.

Verification Requirements:
1. `npm run test:scribe` (all feature checks pass, Exit 0)
2. `npm run test:ehr` (30/30 PASS, Exit 0)
3. `npm run test:e2e` (80/80 PASS across all 4 tiers, Exit 0)
4. `node tests/e2e/tier4-scenarios.test.mjs` (5/5 PASS, Exit 0)
5. `npm run test:challenger:m2` (53/53 PASS, Exit 0)
6. `npm run test:stripe` (15/15 PASS, Exit 0)
7. `npm run test:subscription` (17/17 PASS, Exit 0)
8. `npm run test:security` (26/26 PASS, Exit 0)
9. `npm run test:auth` (12/12 PASS, Exit 0)
10. `node scripts/verify-css-bleed.mjs` (0 bleed errors, Exit 0)
11. `npm run build` (clean build, 0 TS compiler errors, Exit 0)
