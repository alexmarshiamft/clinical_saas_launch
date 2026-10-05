# Milestone 4 Architecture Blueprint: Clinical AI Scribe v2 Integration
## Feature 14: 6 Clinical Note Templates & Dual-Engine Generation
## Feature 15: Scribe Template Studio & Cross-Tool EHR/Scrubber Pipeline

---

## 1. Executive Summary & Problem Scope

This report establishes the complete architectural specification and implementation blueprint for **Milestone 4 (Clinical AI Scribe v2 Integration)** within the **Clinical Telehealth & AI Scribe SaaS Platform**, focusing on:
1. **Feature 14: 6 Clinical Note Templates** with **Dual-Engine Generation** (Live `@google/genai` Gemini 2.5 Flash + Deterministic Clinical Rule Engine).
2. **Feature 15: Scribe Template Studio** with custom prompt engineering, section re-ordering, variable interpolation (`{{patient_name}}`, `{{dob}}`, `{{mrn}}`, `{{chief_complaint}}`, `{{cpt_code}}`), and factory preset lifecycle management.
3. **Clinical Ecosystem Integration**: Direct integration with `ClinicalContext`, one-click export into TheraFlow EHR (`insertToEhr()`), and direct routing into HIPAA PHI Scrubber (`sendToPhiScrubber()`).
4. **Verification Criteria & Test Suite**: Unit, integration, and E2E test certification ensuring 100% pass rates across existing Tiers 1–4 and new Milestone 4 verification targets.

---

## 2. Canonical Source Portfolio Analysis (`heidi-clone`)

A comprehensive audit of the canonical portfolio repository `/Users/alexandermarshi/Downloads/heidi-clone/` was conducted to extract proven UI/UX patterns and identify architectural gaps requiring enhancement for production SaaS standards:

### 2.1 Audited Components and Assets
- **`src/data/defaultTemplates.js` (194 lines)**:
  - Contained generic medical templates: SOAP, Specialist Referral Letter, Patient After-Care Summary, Comprehensive H&P, Specialty-Specific Encounter, Diagnostic Requisition.
  - Structure: array of `{ section, description }` objects per template.
  - Included a mock community library (`COMMUNITY_TEMPLATES`).
- **`src/utils/aiNoteGenerator.js` (315 lines)**:
  - Extracted clinical dialogue via `parseClinicalTranscript()` regex matchers: chief complaint, HPI details, medications, allergies, exam findings, vitals, assessment points, plan points, instructions.
  - Synthesized Markdown output synchronously based on extracted entity arrays.
  - Did NOT support live `@google/genai` Gemini calls, prompt instructions per section, or dynamic token interpolation.
- **`src/components/templates/TemplateStudio.jsx` (345 lines)**:
  - Interactive React form for creating custom templates.
  - Supported dynamic sections array (`title`, `promptInstruction`), add section (`handleAddSection`), and remove section (`handleRemoveSection`).
  - Lacked section re-ordering (move up / down) and lacked variable token interpolation chips.
- **`src/components/notes/TemplateSelector.jsx` (113 lines)**:
  - Horizontal pill-based carousel with Lucide icons for template selection, custom template display, and "+ Add Custom Template" modal trigger.
- **`src/components/notes/NoteEditor.jsx` (362 lines)**:
  - Dual-mode note viewer (Markdown preview vs editable raw textarea), copy with canvas-confetti, word count, print PDF, and Markdown quick-tag formatters (`**bold**`, `*italic*`, etc.).
- **`src/components/notes/ExportModal.jsx` (167 lines)**:
  - EHR-targeted export formatters for Epic Hyperspace (`.MARSHI_ENCOUNTER_NOTE`), Cerner PowerChart (`/* POWERCHART CLINICAL NOTE */`), and athenahealth (`<encounter_note>` XML).
- **`src/data/clinicalCases.js` (424 lines)**:
  - Realistic multi-turn acoustic transcripts across specialties (Cardiology, GP, Pediatrics, Psychiatry Marcus Vance, Orthopedics, Telehealth).

### 2.2 Key Portfolio Gaps Addressed in this SaaS Specification
1. **Psychiatric & Behavioral Health Coverage**: Portfolio lacked psychiatric documentation formats (Psychiatric Evaluation, DAP, BIRP, Clinical Intake, Discharge Summary).
2. **Dual-Engine AI Pipeline**: Portfolio relied on simple string concatenation of extracted regex lines. Milestone 4 provides live `@google/genai` Gemini 2.5 Flash execution with a high-fidelity, deterministic clinical rule engine fallback.
3. **Variable Token Interpolation**: Portfolio lacked variable resolution. Milestone 4 introduces `{{patient_name}}`, `{{dob}}`, `{{mrn}}`, `{{chief_complaint}}`, `{{cpt_code}}`, `{{encounter_date}}`, `{{clinician_name}}`.
4. **Section Re-Ordering**: Milestone 4 implements move up/down and positional indexing for custom template sections.
5. **Cross-App Data Pipeline**: The portfolio was an isolated single-tool demo. Milestone 4 directly couples to `ClinicalContext`, TheraFlow EHR (`insertToEhr()`), and HIPAA PHI Scrubber (`sendToPhiScrubber()`).

---

## 3. Feature 14 Specification: 6 Clinical Note Templates

The platform provides 6 standard, out-of-the-box clinical templates tailored for multi-specialty and behavioral healthcare:

### 3.1 Template Catalog

| # | Template Name | ID | Category | Key Clinical Sections | EHR Ready |
|---|---------------|----|----------|------------------------|-----------|
| 1 | **Comprehensive Psychiatric Evaluation** | `psych-eval` | Behavioral Health | 1. History of Present Illness (HPI)<br>2. Past Psychiatric History<br>3. Medical & Substance History<br>4. Mental Status Examination (MSE)<br>5. Diagnostic Formulation (DSM-5-TR / ICD-10)<br>6. Treatment Recommendations | Yes |
| 2 | **SOAP Progress Note** | `soap` | Standard Clinical | 1. Subjective (S)<br>2. Objective (O)<br>3. Assessment (A)<br>4. Plan (P) | Yes (Default) |
| 3 | **DAP Progress Note** | `dap` | Psychotherapy / Outpatient | 1. Data (D)<br>2. Assessment (A)<br>3. Plan (P) | Yes |
| 4 | **BIRP Progress Note** | `birp` | Behavioral Health / Inpatient | 1. Behavior (B)<br>2. Intervention (I)<br>3. Response (R)<br>4. Plan (P) | Yes |
| 5 | **Clinical Intake Assessment** | `clinical-intake` | Evaluations & Intake | 1. Presenting Problem<br>2. Biopsychosocial History<br>3. Risk Assessment (SI/HI/Safety)<br>4. Diagnostic Impressions<br>5. Clinical Goals & Timelines | Yes |
| 6 | **Discharge Summary** | `discharge-summary` | Transitions of Care | 1. Reason for Admission / Intake<br>2. Summary of Treatment Course<br>3. Condition at Discharge<br>4. Continuing Care Plan<br>5. Relapse Prevention & Safety Protocols | Yes |

### 3.2 Detailed Sectional Structure

#### 1. Comprehensive Psychiatric Evaluation (`psych-eval`)
- **History of Present Illness (HPI)**: Onset, duration, severity of psychiatric symptoms, precipitating stressors, sleep/appetite disturbances, functional impairment in vocational/social domains.
- **Past Psychiatric History**: Prior psychiatric episodes, psychiatric hospitalizations, past psychotropic medication trials and adverse effects, outpatient psychotherapy history, self-harm/suicide attempt history.
- **Medical & Substance History**: Pertinent medical conditions, chronic illnesses, family medical history, current non-psychiatric medications, alcohol/tobacco/illicit substance use history.
- **Mental Status Examination (MSE)**: Detailed assessment across all 9 formal domains:
  1. Appearance & General Behavior
  2. Motor Activity & Psychomotor Status
  3. Speech (Rate, Volume, Fluency)
  4. Mood (Subjective report) & Affect (Objective congruence, range)
  5. Thought Process (Linear, circumstantial, tangential, loose associations)
  6. Thought Content (Suicidal/homicidal ideation, delusions, obsessions, phobias)
  7. Perceptual Disturbances (Auditory/visual hallucinations, illusions)
  8. Sensorium & Cognitive Function (Orientation x4, memory, concentration)
  9. Insight & Judgment (Capacity for decision-making, clinical compliance)
- **Diagnostic Formulation**: Synthesis of biopsychosocial factors, provisional and differential diagnoses according to DSM-5-TR and ICD-10 coding.
- **Treatment Recommendations**: Multimodal management plan: psychopharmacological regimen, individual/group psychotherapy modalities (CBT/DBT), laboratory workup (e.g. metabolic panel, thyroid), and interdisciplinary coordination.

#### 2. SOAP Progress Note (`soap`)
- **Subjective (S)**: Patient's reported status since prior session, adherence to treatment, sleep quality, subjective distress levels, response to homework.
- **Objective (O)**: Mental status observations during the encounter, behavioral presentation, affect congruency, vitals if recorded.
- **Assessment (A)**: Diagnostic progress, clinical synthesis of symptom trajectory, treatment response, formal risk assessment.
- **Plan (P)**: Therapeutic interventions applied, medication management changes, assigned clinical homework, follow-up session frequency and scheduled encounter time.

#### 3. DAP Progress Note (`dap`)
- **Data (D)**: Objective clinical facts, patient behavioral presentation, verbatim patient statements, specific therapeutic interventions applied by clinician (e.g., CBT cognitive restructuring, PMR).
- **Assessment (A)**: Clinician's diagnostic evaluation of patient's current mental status, insight, coping mechanisms, progress toward treatment goals, and risk evaluation.
- **Plan (P)**: Next therapeutic steps, patient action items/homework, scheduled follow-up, and coordination with collateral providers.

#### 4. BIRP Progress Note (`birp`)
- **Behavior (B)**: Specific observed behaviors, presenting symptoms, affective state, and clinical presentation during the session.
- **Intervention (I)**: Exact therapeutic interventions and clinical techniques deployed by clinician (e.g., cognitive challenging, mindfulness grounding, psychoeducation).
- **Response (R)**: The patient's immediate cognitive, affective, and verbal response to each intervention during the encounter.
- **Plan (P)**: Continuing clinical trajectory, homework assignments, safety plans, and scheduled next encounter.

#### 5. Clinical Intake Assessment (`clinical-intake`)
- **Presenting Problem**: Chief complaint in client's words, duration, severity, trigger events, previous coping attempts.
- **Biopsychosocial History**: Family psychiatric and medical history, developmental history, academic/vocational background, social support system, cultural and spiritual factors.
- **Risk Assessment**: In-depth suicide, homicide, and self-harm risk appraisal, historical attempts, current intent/plan/means, protective factors, and formal safety plan status.
- **Diagnostic Impressions**: Clinical rationale for primary and differential diagnoses, corresponding ICD-10 codes.
- **Clinical Goals & Timelines**: Measurable, time-limited therapeutic goals (SMART criteria), anticipated frequency of sessions, and estimated duration of treatment episode.

#### 6. Discharge Summary (`discharge-summary`)
- **Reason for Admission / Intake**: Initial clinical indications for beginning care, baseline diagnostic impressions, baseline severity scores (e.g. GAD-7, PHQ-9).
- **Summary of Treatment Course**: Total sessions attended, clinical modalities utilized (e.g. CBT, ACT), major therapeutic breakthroughs, goal attainment summary.
- **Condition at Discharge**: Final mental status evaluation, symptom resolution percentage, current functional status in home/work/social environments.
- **Continuing Care Plan**: Step-down recommendations, outpatient maintenance appointments, community support groups, medication maintenance orders.
- **Relapse Prevention & Safety Protocols**: Identified personal triggers, early warning signs of symptom exacerbation, emergency crisis contacts, and safety plan refresh.

---

## 4. Dual-Engine Generation Architecture

The note generation system utilizes a **dual-engine architecture** that balances state-of-the-art LLM synthesis with guaranteed zero-failure deterministic fallback:

```
                      [ Incoming Consultation Transcript ]
                     [ Active Patient & Template Context ]
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ API Key Present & Valid?  │
                        │ (GEMINI_API_KEY / VITE_*) │
                        └─────────────┬─────────────┘
                                      │
                      Yes ────────────┴──────────── No
                       │                             │
                       ▼                             ▼
        ┌─────────────────────────────┐   ┌─────────────────────────────┐
        │  BRANCH A: Live Gemini API  │   │  BRANCH B: Deterministic    │
        │      (@google/genai)        │   │    Clinical Rule Engine     │
        │    Model: gemini-2.5-flash  │   │  - Pattern match & extract  │
        │  - Structured JSON Output   │   │  - Variable interpolation   │
        │  - Section prompt guidance  │   │  - Multi-paragraph synthesis│
        └──────────────┬──────────────┘   └──────────────┬──────────────┘
                       │                                 │
                   API Error /                           │
                   Rate Limit                            │
                       │                                 │
                       └─────────────► Fallback ◄────────┘
                                          │
                                          ▼
                         [ Synthesized Clinical Note ]
                         [ Markdown & Structured JSON ]
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
          [ Synchronize with EHR ]                    [ Send to PHI Scrubber ]
           (insertToEhr / addNote)                     (sendToPhiScrubber)
```

### 4.1 Branch A: Live Gemini 2.5 Flash Engine (`@google/genai`)

- **Package**: `@google/genai` (installed at `^1.29.0`).
- **Target Model**: `gemini-2.5-flash`.
- **API Key Resolution**:
  ```ts
  const apiKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';
  ```
- **Execution Workflow**:
  1. Instantiates `const ai = new GoogleGenAI({ apiKey })`.
  2. Constructs system instructions defining the persona of an expert, board-certified psychiatrist / clinical psychologist.
  3. Injects the interpolated template prompt, section definitions, active patient demographics, and the speaker-attributed consultation transcript.
  4. Configures `config: { responseMimeType: 'application/json' }` requesting a key-value object where keys match template section IDs.
  5. Parses JSON response into sectioned markdown and updates `activeEncounterNotes`.
  6. Wraps execution in `try/catch`. On timeout, rate-limit (429), or network failure, it automatically and silently falls back to Branch B with detailed diagnostic console logging.

### 4.2 Branch B: Deterministic Clinical Rule Engine

- **Execution Guarantee**:
  - 100% deterministic, instant execution (<10ms).
  - Zero external HTTP/network calls.
  - Zero test flakiness in CI/CD, JSDOM, or sandbox environments.
- **Entity Extraction Pipeline (`parseTranscriptEntities`)**:
  - `patientDialogue`: extracts all patient/client lines.
  - `clinicianDialogue`: extracts all doctor/therapist lines.
  - `symptomTokens`: identifies anxiety, depressive, panic, insomnia, somatic, and cognitive symptoms.
  - `medicationTokens`: identifies dosage, frequency, compliance, and drug names (e.g. Escitalopram, Atorvastatin).
  - `riskTokens`: detects SI, HI, self-harm mentions and absence of active intent.
  - `interventionTokens`: detects CBT cognitive reframing, PMR relaxation, mindfulness, EMDR, and psychoeducation.
  - `mseTokens`: extracts appearance, speech rate, affect, thought process, and orientation findings.
- **Section Synthesizers**:
  - Implements dedicated algorithmic generators for each of the 6 templates.
  - Generates rich, multi-sentence, professional clinical prose that directly quotes the transcript and active patient context (`Jane Doe`, `#MC-88219`, `CPT 90837`).
  - Ensures all 6 templates produce complete, audit-compliant medical documentation even with minimal input shorthand.

---

## 5. Feature 15 Specification: Scribe Template Studio

The **Scribe Template Studio** provides clinicians with an intuitive, self-service prompt engineering suite for tailoring documentation formats:

### 5.1 Core Architecture & Features
1. **Interactive Prompt Engineering Editor**:
   - Clinicians can configure Template Name, Category, Clinical Specialty, Description, and Global AI System Instructions.
   - Per-section configuration: Section Heading, AI Guidance Prompt, and Placeholder Text.
2. **Dynamic Section Re-Ordering & Management**:
   - Move sections up/down (`ChevronUp` / `ChevronDown`).
   - Add new custom sections (`Plus` button).
   - Delete sections with confirmation (`Trash2` button).
   - Positional re-indexing ensures generated notes follow the desired chronological clinical flow.
3. **Custom Clinical Variable Interpolation Engine**:
   - Supports statutory clinical variables:
     - `{{patient_name}}` -> Active patient full name (e.g., `Jane Doe`)
     - `{{dob}}` -> Patient date of birth (e.g., `04/12/1988`)
     - `{{mrn}}` -> Medical Record Number (e.g., `#MC-88219`)
     - `{{chief_complaint}}` -> Primary presenting complaint or encounter reason
     - `{{cpt_code}}` -> Active encounter billing code (e.g., `90837`)
     - `{{encounter_date}}` -> Current formatted date of service
     - `{{clinician_name}}` -> Attending clinician name (e.g., `Dr. Sarah Chen, MD`)
   - **Interactive Variable Chips**: One-click chip buttons below textareas allow clinicians to insert variable tokens at the active cursor position.
   - **Live Variable Resolver**: Resolves variables both in preview mode and at the moment of AI generation.
4. **Lifecycle Management & Factory Presets**:
   - **Persistent Storage**: Saved in `localStorage` under `clinical_saas_scribe_templates_v2` with sync across browser sessions.
   - **Editing Presets**: Clinicians can clone any of the 6 standard templates, customize prompts, and save as a custom variant.
   - **Reset to Factory Presets**: One-click restore button that purges custom mutations and re-instates the 6 pristine clinical templates with confirmation feedback.
5. **Preloaded Community Library**:
   - Provides verified specialty templates:
     - *Emergency Department Rapid Triage* (ED Medicine)
     - *Pediatric Developmental & Well-Child Exam* (Pediatrics)
     - *Trauma-Informed CBT & EMDR Protocol* (Psychotherapy)
     - *Orthopedic Post-Operative Progress* (Sports Medicine)
   - One-click "Import to My Templates" with canvas-confetti celebration feedback.

---

## 6. Clinical Ecosystem Integration

The Clinical AI Scribe v2 connects directly into the broader SaaS ecosystem:

```
                            ┌────────────────────────┐
                            │    ClinicalContext     │
                            │  - activePatient       │
                            │  - activeEncounterNotes│
                            └───────────┬────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
        ┌─────────────────┐   ┌───────────────────┐   ┌─────────────────┐
        │ Clinical Scribe │   │  TheraFlow EHR    │   │  PHI Scrubber   │
        │ - Diarize feed  │   │ - Progress notes  │   │ - 18 Safe Harbor│
        │ - 6 Templates   │   │ - Patient charts  │   │ - Redacted diff │
        │ - TemplateStudio│   │ - Billing/Superbill│  │ - Forensic audit│
        └────────┬────────┘   └─────────▲─────────┘   └────────▲────────┘
                 │                      │                      │
                 ├───── insertToEhr() ──┘                      │
                 │                                             │
                 └───── sendToPhiScrubber() ───────────────────┘
```

### 6.1 `ClinicalContext` Integration
- Consumes `useClinicalContext()`:
  - `activePatient`: `{ id, name, dob, mrn, cptCode, encounterId, cptDesc }`
  - `activeEncounterNotes`: `{ subjective, objective, assessment, plan, rawTranscript }`
  - `updateNoteField(field, text)`
  - `insertToEhr(note)`
  - `sendToPhiScrubber(text)`
- Automatically maps generated SOAP or DAP sections directly to `activeEncounterNotes`, keeping all tabs in sync.

### 6.2 One-Click Export to TheraFlow EHR (`insertToEhr`)
- **Direct EHR Chart Ingestion**:
  - The Scribe workspace includes a prominent "Commit to TheraFlow Chart" button.
  - Invokes `insertToEhr(generatedNote)` and calls `addNote()` from `src/tools/theraflow/data/theraflow-store.ts`.
  - Creates an official progress note record in the client chart tied to `activePatient.id` with timestamp, clinician ID, and digital signature status.
  - Triggers a HIPAA audit log entry: `UPDATE_NOTE / progress_note`.
  - Displays a toast notification: `✓ Note successfully committed to TheraFlow EHR chart for Jane Doe (#MC-88219)`.

### 6.3 One-Click Export to HIPAA PHI Scrubber (`sendToPhiScrubber`)
- **De-Identification Pipeline**:
  - The Scribe workspace includes a dedicated "Send to PHI Scrubber" button.
  - Invokes `sendToPhiScrubber(generatedNote)`.
  - Sets `scrubberInputText` in `ClinicalContext`, instantly populating the PHI Scrubber workspace unredacted pane.
  - Offers immediate 1-click navigation to `/dashboard/phi-scrubber` for 18 Safe Harbor de-identification before external research or legal transmission.

### 6.4 Multi-EHR Export Adapters
- Includes an **Export & Interoperability Modal** supporting formatted clipboard copying:
  - **Epic Hyperspace SmartPhrase**:
    ```text
    // EPIC HYPERSPACE SMARTPHRASE EXPORT
    .CLINICAL_NOTE_SCRIBE
    == SUBJECTIVE ==
    ...
    == ASSESSMENT & PLAN ==
    ...
    ```
  - **Cerner / Oracle Health PowerChart**:
    ```text
    /* POWERCHART CLINICAL PROGRESS NOTE */
    PATIENT: Jane Doe | MRN: #MC-88219 | DATE: 10/05/2026
    ...
    ```
  - **athenahealth athenaClinicals**:
    ```xml
    <encounter_note patient="Jane Doe" mrn="#MC-88219" cpt="90837">
    ...
    </encounter_note>
    ```
  - **Universal Rich Text & Markdown**: formatted for any browser or desktop EHR paste buffer.

### 6.5 CSS Isolation & Containment
- All Scribe components are wrapped in the `.heidi-scribe-theme` namespace container.
- Prevents CSS bleed into TheraFlow, Aura, or Shell navigation bars.
- Uses scoped CSS custom variables (`--bg-app: #0c0e11`, `--bg-surface: #14171c`, `--accent-yellow: #ffe17d`, `--text-primary: #f3f4f6`).

---

## 7. Implementation Blueprint: File-by-File Specification

The builder agent will implement the following structured file layout in `src/tools/scribe/`:

```
src/tools/scribe/
├── types.ts                      # Interfaces: ClinicalTemplate, TemplateSection, VariableContext, NoteResult
├── variable-interpolator.ts      # Variable interpolation engine ({{patient_name}}, {{mrn}}, etc.)
├── ai-template-generator.ts      # Dual-Engine generation (Gemini 2.5 Flash + Deterministic Rule Engine)
├── ScribeWorkspace.tsx           # Main workspace shell with Diarization feed, Template Picker, Editor & Studio tabs
├── TemplateStudio.tsx            # Custom prompt engineering editor, section re-ordering, variable chips
├── TemplateSelector.tsx          # Pill carousel for selecting standard & custom templates
├── NoteEditor.tsx                # Dual-pane preview/edit markdown note editor with toolbar
├── ExportModal.tsx               # Multi-EHR export modal (Epic, Cerner, Athena, PDF, Clipboard)
├── data/
│   ├── default-templates.ts      # The 6 standard clinical templates (Psychiatric, SOAP, DAP, BIRP, Intake, Discharge)
│   ├── community-templates.ts    # Pre-built specialty templates (ED, Pediatrics, Trauma, Ortho)
│   └── template-store.ts         # LocalStorage persistence, CRUD, and factory reset helpers
└── styles/
    └── scribe-scoped.css         # Contained Heidi styling scoped to .heidi-scribe-theme
```

### 7.1 Data Contracts & Interfaces (`src/tools/scribe/types.ts`)

```typescript
export interface TemplateSection {
  id: string;
  title: string;
  promptInstruction: string;
  placeholder?: string;
  order: number;
}

export interface ClinicalTemplate {
  id: string;
  name: string;
  category: 'Standard Notes' | 'Behavioral Health' | 'Evaluations & Intake' | 'Transitions of Care' | 'Custom';
  specialty: string;
  description: string;
  icon: string;
  isFactoryPreset: boolean;
  ehrReady: boolean;
  globalPrompt?: string;
  sections: TemplateSection[];
}

export interface ClinicalVariableContext {
  patient_name: string;
  dob: string;
  mrn: string;
  chief_complaint: string;
  cpt_code: string;
  cpt_desc?: string;
  encounter_date: string;
  clinician_name: string;
  encounter_time?: string;
}

export interface GenerateNoteOptions {
  template: ClinicalTemplate;
  transcript: string;
  context: ClinicalVariableContext;
  style?: {
    tone?: 'clinical' | 'concise' | 'narrative' | 'patient';
    length?: 'standard' | 'brief' | 'comprehensive';
    perspective?: 'third' | 'first';
  };
}

export interface GeneratedNoteResult {
  fullMarkdown: string;
  sections: Record<string, string>;
  engineUsed: 'gemini-2.5-flash' | 'deterministic-rule-engine';
  generatedAt: string;
}
```

### 7.2 Variable Interpolator (`src/tools/scribe/variable-interpolator.ts`)

```typescript
import { ClinicalVariableContext } from './types';

export const SUPPORTED_VARIABLES = [
  { token: '{{patient_name}}', label: 'Patient Name', example: 'Jane Doe' },
  { token: '{{dob}}', label: 'Date of Birth', example: '04/12/1988' },
  { token: '{{mrn}}', label: 'MRN', example: '#MC-88219' },
  { token: '{{chief_complaint}}', label: 'Chief Complaint', example: 'Generalized anxiety and panic' },
  { token: '{{cpt_code}}', label: 'CPT Code', example: '90837' },
  { token: '{{encounter_date}}', label: 'Date of Service', example: 'October 5, 2026' },
  { token: '{{clinician_name}}', label: 'Clinician Name', example: 'Dr. Sarah Chen, MD' },
] as const;

export function interpolateTemplateVariables(
  templateString: string,
  context: ClinicalVariableContext
): string {
  if (!templateString) return '';

  return templateString
    .replace(/\{\{patient_name\}\}/gi, context.patient_name || 'Patient')
    .replace(/\{\{dob\}\}/gi, context.dob || 'DOB Pending')
    .replace(/\{\{mrn\}\}/gi, context.mrn || '#Pending')
    .replace(/\{\{chief_complaint\}\}/gi, context.chief_complaint || 'Clinical evaluation')
    .replace(/\{\{cpt_code\}\}/gi, context.cpt_code || '90837')
    .replace(/\{\{cpt_desc\}\}/gi, context.cpt_desc || 'Psychotherapy (60m)')
    .replace(/\{\{encounter_date\}\}/gi, context.encounter_date || new Date().toLocaleDateString())
    .replace(/\{\{clinician_name\}\}/gi, context.clinician_name || 'Attending Clinician');
}
```

### 7.3 Dual-Engine AI Generator (`src/tools/scribe/ai-template-generator.ts`)

```typescript
import { GoogleGenAI } from '@google/genai';
import { GenerateNoteOptions, GeneratedNoteResult } from './types';
import { interpolateTemplateVariables } from './variable-interpolator';

export async function generateClinicalNote(
  options: GenerateNoteOptions
): Promise<GeneratedNoteResult> {
  const { template, transcript, context, style } = options;

  const geminiKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';

  // Branch A: Live Gemini 2.5 Flash
  if (geminiKey && geminiKey.length > 10 && !geminiKey.includes('placeholder')) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = buildGeminiPrompt(options);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return formatResultFromSections(template, parsed, 'gemini-2.5-flash', context);
      }
    } catch (err) {
      console.warn('[Scribe Engine] Gemini 2.5 Flash API error, falling back to deterministic clinical engine:', err);
    }
  }

  // Branch B: Deterministic Clinical Rule Engine
  return generateDeterministicClinicalNote(options);
}
```

---

## 8. Verification Criteria & Automated Test Strategy

To guarantee zero regression and verify the full feature inventory, the following multi-tier verification strategy is specified:

### 8.1 Regression Defense (Existing E2E Tiers 1–4)
All existing 80 test cases in `tests/e2e/run-all.mjs` must pass with 100% success rate:
- **T1.5.1**: `Clinical AI Scribe v2` mounts with `AI Diarization Ready` badge.
- **T1.5.2**: `Live Acoustic Transcript` renders `Dr. Chen:` and `Jane Doe:`.
- **T1.5.3**: `Generated SOAP Preview` renders `Subjective:` and `Assessment:`.
- **T1.5.4**: `Generated SOAP Preview (CPT 90837)` bound to patient CPT code.
- **T1.5.5**: Command Center launcher anchors link to `/dashboard/scribe`.
- **T3.5**: `sendToPhiScrubber` dispatches raw transcript into scrubber pipeline.
- **T3.6**: `insertToEhr` commits clinical note into active EHR chart.
- **Scenario 1 & 2**: Real-world intake to note finalization and telehealth diarization.

*Crucial Design Rule*: In `ScribeWorkspace.tsx`, the live acoustic transcript card and the SOAP preview card must preserve all existing strings and test element classes so that opaque-box JSDOM scrapers verify seamlessly.

### 8.2 New Dedicated Test Suite: `tests/m4-scribe-templates.test.ts`
A standalone TypeScript verification suite executed via `npx tsx tests/m4-scribe-templates.test.ts` or `npm run test:scribe` will validate:
1. **Template Catalog Verification**:
   - Confirms all 6 standard templates exist with correct section IDs.
   - Verifies psychiatric evaluation contains all 6 mandated sections (HPI, Past Psych, Medical, MSE, Diagnostic Formulation, Treatment Recommendations).
   - Verifies SOAP, DAP, BIRP, Clinical Intake, and Discharge Summary structures.
2. **Deterministic Clinical Rule Engine Verification**:
   - Generates notes for all 6 templates without an API key.
   - Asserts non-empty, multi-paragraph markdown containing patient name (`Jane Doe`), MRN (`#MC-88219`), and CPT (`90837`).
   - Asserts execution completes in `<20ms` per template.
3. **Variable Interpolation Engine Verification**:
   - Probes `interpolateTemplateVariables()` with all tokens (`{{patient_name}}`, `{{dob}}`, `{{mrn}}`, `{{chief_complaint}}`, `{{cpt_code}}`).
   - Validates proper substitution and fallback behavior on empty context.
4. **Template Studio CRUD & Section Re-ordering**:
   - Adds custom section to template.
   - Reorders sections (moving section 3 to index 0) and verifies note synthesis follows new order.
   - Mutates custom prompts and executes `resetToFactoryPresets()`, confirming factory restoration.
5. **Cross-Tool Pipeline Verification**:
   - Executes `insertToEhr()` and asserts note entry is added to `theraflow-store`.
   - Executes `sendToPhiScrubber()` and asserts `scrubberInputText` matches note markdown.
6. **Multi-EHR Export Formats**:
   - Tests output format strings for Epic, Cerner, and Athena.

---

## 9. Next Steps for Implementer

1. Implement `src/tools/scribe/types.ts` and `src/tools/scribe/variable-interpolator.ts`.
2. Implement `src/tools/scribe/data/default-templates.ts` with the 6 standard templates.
3. Implement `src/tools/scribe/ai-template-generator.ts` with Gemini 2.5 Flash + Deterministic Rule Engine.
4. Implement `src/tools/scribe/data/template-store.ts` for persistence and factory resets.
5. Build `src/tools/scribe/TemplateStudio.tsx` and `src/tools/scribe/TemplateSelector.tsx`.
6. Upgrade `src/tools/scribe/ScribeWorkspace.tsx` while maintaining strict backwards compatibility with existing E2E test anchors.
7. Implement `tests/m4-scribe-templates.test.ts` and verify with `npm run test:e2e`.
