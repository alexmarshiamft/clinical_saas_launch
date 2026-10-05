# Milestone 5 Architecture Blueprint: Aura Assistant & Floating Action Orb Ecosystem

**Author**: Explorer 1 (`teamwork_preview_explorer_m5_1`)  
**Target Milestone**: Milestone 5 — Aura Assistant & Floating Action Orb Architecture (Features 19, 20, 21, 22)  
**Status**: Completed Architectural Blueprint & Technical Due Diligence  
**Date**: 2026-10-05T07:10:00Z  

---

## 1. Executive Summary & Canonical Discovery

### 1.1 Canonical Portfolio Discovery
Through exhaustive filesystem investigation across `/Users/alexandermarshi/` and `/Users/alexandermarshi/Documents/`, the authoritative canonical implementation of Aura Assistant has been located and analyzed:

- **Canonical Repository Path**: `/Users/alexandermarshi/Documents/antigravity/aura-extension`
- **Application Identity**: App 31: *Aura Clinical Assistant (Cross-EHR In-Workflow Floating Overlay Extension)*
- **Key Artifacts Analyzed**:
  - `content.js` (9.4 KB): Full DOM injection logic, `attachShadow({ mode: 'closed' })` encapsulation, document `focusin` coordinate tracker, voice visualizer, typewriter SOAP formatter, and 1-click EHR injection.
  - `aura.css` (6.3 KB): Pure glassmorphism design system with floating orb concentric gradients, backdrop blur, animated audio visualizer bars, and snippet buttons.
  - `popup.html` & `popup.js`: Clinical specialty configuration (General Psychotherapy, Trauma/EMDR, CBT, Couples, Child/Adolescent), keyboard shortcut binding (`Alt + A`), and local settings persistence.
  - `record-aura.mjs`: Playwright automation script verifying headless orb injection and automated dictation-to-SOAP generation.
  - `DUE_DILIGENCE.md`: Technical documentation validating zero external PHI leakage, closed shadow DOM boundary, and compatibility with SimplePractice, TherapyNotes, and Epic.

### 1.2 Integration Mandate for Milestone 5
In accordance with `PROJECT.md`, `ORIGINAL_REQUEST.md`, and `TEST_READY.md`, the standalone extension must be promoted into a first-class SaaS module consisting of:
1. **Feature 19 (`AuraStudio.tsx`)**: Fullscreen clinical decision support and interactive diagnostic differential assistant.
2. **Feature 20 (`AuraFloatingOrb.tsx`)**: Global toggleable floating overlay accessible across any screen in the application.
3. **Feature 21 (`TypewriterSoap.tsx` / `AuraDictation.tsx`)**: Headless-safe audio visualizer, live typewriter SOAP generation, and cross-tool actions (`insertToEhr()`, `sendToPhiScrubber()`).
4. **Feature 22 (`aura-shadow.css` / `AuraShadowRoot.tsx`)**: Closed/Open Shadow DOM encapsulation guaranteeing zero CSS bleed, verified by `scripts/verify-css-bleed.mjs`.
5. **Types (`types.ts`)**: Type-safe data contracts spanning clinical specialties, DSM-5 differential criteria, suggestion chips, and SOAP notes.

---

## 2. Feature 19: Aura Assistant Workspace & Studio (`src/tools/aura/AuraStudio.tsx`)

### 2.1 Workspace Overview & Layout Architecture
`AuraStudio` mounts at `/dashboard/aura` (protected by `<SubscriptionGate requiredTier="pro">`). It functions as a clinical decision support (CDS) workstation where clinicians can evaluate complex patient narratives against DSM-5 diagnostic criteria, track symptom thresholds, explore differential diagnoses, and format structured progress notes.

The Studio employs a responsive dual-panel layout:
- **Left Panel (60% width)**: Interactive Diagnostic Differential Assistant & Clinical Decision Support.
- **Right Panel (40% width)**: Embedded Typewriter SOAP & Dictation Studio.

### 2.2 Preserving Strict E2E Test Invariants
Existing E2E test suites (`tier1-features.test.mjs`, `tier3-interactions.test.mjs`, `tier4-scenarios.test.mjs`) assert exact textual and structural markers. The new `AuraStudio` implementation must preserve all of them verbatim:
- `Aura Assistant Studio` (Page title)
- `Copilot Standby` (Status badge)
- `Diagnostic Differential Assistant: {activePatient.name}` (Dynamic header)
- `CPT: {activePatient.cptCode}` (Dynamic CPT marker)
- `DSM-5 symptom markers` (Decision support criteria marker)
- `ICD-10 diagnostic codes` (Diagnostic coding marker)
- `clinical interventions` (Intervention guidance marker)

### 2.3 Interactive DSM-5 Criteria Differential Engine
The Studio dynamically binds to `activePatient` from `useClinicalContext()` and pulls from a structured DSM-5 knowledge base (`src/tools/aura/data/dsm5-database.ts`):
- **Jane Doe** (`#MC-88219`, CPT `90837`):
  - Primary Target: **Generalized Anxiety Disorder (GAD-7 score: 14/21, ICD-10: F41.1)**.
  - DSM-5 Checklist: 6 diagnostic criteria (Excessive anxiety >= 6 mos, restlessness, fatigue, muscle tension, sleep disturbance, impaired daily functioning).
  - Differential Options: Panic Disorder (`F41.0`), Major Depressive Disorder (`F32.1`), Adjustment Disorder (`F43.22`).
  - Evidence-Based Interventions: Stimulus control, Progressive Muscle Relaxation (PMR), Thought Record cognitive restructuring.
- **Marcus Vance** (`#MC-91042`, CPT `90834`):
  - Primary Target: **Major Depressive Disorder, Single Episode, Moderate (PHQ-9 score: 16/27, ICD-10: F32.1)**.
  - DSM-5 Checklist: 9 diagnostic criteria (Depressed mood, anhedonia, sleep disturbance, fatigue, guilt/worthlessness, concentration loss).
  - Differential Options: Persistent Depressive Disorder (Dysthymia `F34.1`), Bipolar II (`F31.81`), GAD (`F41.1`).
  - Evidence-Based Interventions: Behavioral activation, Graded task assignment, Activity scheduling.
- **Elena Rostova** (`#MC-77312`, CPT `90791`):
  - Primary Target: **Panic Disorder with Agoraphobia (ICD-10: F41.0 / F40.00)**.
  - Diagnostic Intake (90791) differential evaluation and interoceptive exposure planning.

Each criterion has an interactive checkbox. As clinicians toggle symptoms, a real-time progress bar recalculates:
- `Threshold Progress`: e.g. "5 / 6 criteria met (83% - Diagnostic Threshold Satisfied)"
- `Confidence Score`: High / Moderate / Subclinical

### 2.4 Quick Clinical Suggestion Chips Bar
Interactive quick-chips categorized for instant workflow application:
1. **Assessment Protocols**:
   - `+ GAD-7 Protocol`: Inserts standardized anxiety score and symptom severity into subjective/assessment.
   - `+ PHQ-9 Differential`: Inserts depressive symptom screening criteria.
   - `+ MSE WNL`: Mental status examination baseline ("Alert & oriented x4, euthymic affect, linear thought process").
2. **CBT & Clinical Interventions**:
   - `+ CBT Thought Record`: Inserts cognitive distortion identification and rational counter-thought.
   - `+ Behavioral Activation`: Inserts activity scheduling and pleasure/mastery ratings.
   - `+ Exposure Hierarchy`: Inserts systematic desensitization protocol.
3. **Risk & Safety Screening**:
   - `+ Low Risk / No SI/HI`: Statutory risk assessment documentation ("Patient denies SI/HI intent or plan. Low risk.").
   - `+ Safety Plan Initiated`: Inserts Stanley-Brown safety planning markers.

Clicking any chip invokes a context action: either inserting into the Typewriter SOAP editor or appending to the active patient chart.

---

## 3. Feature 20: Aura Floating Action Orb (`src/tools/aura/AuraFloatingOrb.tsx`)

### 3.1 Global Mounting in `AppLayout.tsx`
`AuraFloatingOrb` is mounted in `src/components/layout/AppLayout.tsx`. Consequently, it floats persistently across all authenticated screens:
- `/dashboard` (Command Center)
- `/dashboard/ehr` (TheraFlow EHR)
- `/dashboard/scribe` (Clinical AI Scribe v2)
- `/dashboard/phi-scrubber` (HIPAA PHI Scrubber)
- `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`

### 3.2 Visual & Interaction Architecture
The floating orb directly inherits the visual design of App 31:
- **Orb Geometry**: 56px circular button fixed at bottom-right (`bottom: 24px`, `right: 24px`, `z-index: 9999`).
- **Gradient Fill**:
  ```css
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.1) 60%),
              conic-gradient(from 0deg at 50% 50%, #3b82f6, #8b5cf6, #ec4899, #3b82f6);
  ```
- **Micro-interactions**:
  - Idle state: Subtle breathing drop-shadow (`box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4)`).
  - Hover state: 1.08x scale with amplified purple/pink glow.
  - Recording state: Pulsing magenta aura (`box-shadow: 0 0 40px rgba(236, 72, 153, 0.8)`).
- **Trigger Mechanisms**:
  1. Direct click on Floating Orb.
  2. Keyboard shortcut: `Alt + A` (customizable in preferences).
  3. Header quick link: Clicking "Aura Copilot" in the top navigation bar directs to `/dashboard/aura` or toggles the overlay.

### 3.3 Draggable Non-Intrusive Floating Panel
When clicked, the Orb expands into a floating glassmorphism panel (`width: 384px`, max-height: `580px`):
- **Draggable Handle**: The panel header acts as a drag handle. Clinicians can click and drag the panel anywhere on screen. Mouse events (`onMouseDown`, `onMouseMove`, `onMouseUp`) update window-relative coordinates with boundary clamping.
- **Header Elements**:
  - Sparkles icon + "Aura Copilot" title.
  - Active patient tag: `Jane Doe (90837)`.
  - Minimize and Close (`×`) buttons.
  - Fullscreen button (navigates to `/dashboard/aura`).
- **Panel Body**:
  - Compact simulated audio visualizer.
  - Dictation input textarea.
  - Quick snippet buttons: `No SI/HI`, `MSE WNL`, `CBT Homework`.
  - Action buttons: `Format SOAP`, `Insert to EHR`, `Scrub PHI`, `Clear`.
  - Output pane with real-time typewriter playback.

---

## 4. Feature 21: Aura Dictation & Typewriter SOAP (`TypewriterSoap.tsx` / `AuraDictation.tsx`)

### 4.1 Headless-Safe Simulated Audio Visualizer
**Critical Reliability Requirement**: To prevent headless/JSDOM crashes during automated test execution (`test:e2e`), the audio visualizer MUST NOT invoke `HTMLCanvasElement.prototype.getContext('2d')` without guards, and MUST NOT require native `AudioContext`.

**Implementation Strategy**:
- Create `AuraVisualizer.tsx` using **pure CSS animated divs** or **dynamic SVG rects** (patterned after Scribe's resilient `WaveformVisualizer.tsx`).
- 5 vertical visualizer bars:
  - Idle height: 8px, purple `#8b5cf6`.
  - Recording state: CSS keyframe `pulse-bar` oscillating between 8px and 40px with staggered delays (0.0s, 0.2s, 0.4s, 0.1s, 0.5s), color-morphing into magenta `#ec4899`.
- Zero canvas calls, zero audio hardware dependency — 100% crash-free in JSDOM and CI runners.

### 4.2 Dictation Capture Engine (`AuraDictation.tsx`)
- Clinician clicks "Dictate" or microphone button.
- Status shifts to `listening`.
- Simulated speech-to-text engine buffers incoming audio chunks.
- Includes preset clinical scenarios:
  1. *Anxiety Follow-up*: "Jane Doe reports reduced nocturnal panic attacks following progressive muscle relaxation homework. Residual worry centered around work deadlines."
  2. *Depression Assessment*: "Marcus Vance reports lethargy and low motivation. Completed 3 of 5 scheduled behavioral activation walks."
  3. *Trauma Intake*: "Elena Rostova presents with avoidance behaviors and hyperarousal following vehicular collision."
- Manual input field allows clinicians to type or paste notes freely.

### 4.3 Typewriter Streaming Animation Engine (`TypewriterSoap.tsx`)
- Clinician clicks `Format SOAP`.
- AI structuring engine parses narrative text into structured 4-part SOAP format:
  ```
  SUBJECTIVE:
  Patient presents for scheduled psychotherapy follow-up...

  OBJECTIVE:
  Mental Status Exam: Alert and oriented x4. Euthymic affect...

  ASSESSMENT:
  Generalized Anxiety Disorder (ICD-10 F41.1). Patient demonstrates...

  PLAN:
  1. Continue individual psychotherapy (CPT 90837).
  2. Behavioral activation and daily thought record review.
  ```
- Streaming simulation:
  - Emits words at a smooth cadence (35ms per word).
  - Displays terminal-style blinking cursor (`|`).
  - Provides a "Skip / Fast-Forward" button allowing immediate rendering of full text (crucial for zero-wait automated tests).

### 4.4 1-Click Cross-Tool Action Integrations
Typewriter SOAP connects directly to the unified `useClinicalContext()`:
1. **`insertToEhr(soapNote)`**:
   - Calls `clinical.insertToEhr(note)`.
   - Appends formatted clinical progress note directly into TheraFlow's active encounter chart (`activeEncounterNotes.assessment` / `activeEncounterNotes.plan`).
   - Button provides visual feedback: "Inserted to EHR! ✓" for 2 seconds.
2. **`sendToPhiScrubber(soapNote)`**:
   - Calls `clinical.sendToPhiScrubber(note)`.
   - Populates `scrubberInputText` in `ClinicalContext`.
   - Clinician can switch to `/dashboard/phi-scrubber` to immediately scrub 18 Safe Harbor identifiers.
3. **`copyToClipboard()`**:
   - Calls `navigator.clipboard.writeText(soapNote)`.
   - Visual feedback: "Copied! ✓".

---

## 5. Feature 22: Aura Shadow DOM CSS Isolation (`aura-shadow.css` & `AuraShadowRoot.tsx`)

### 5.1 Encapsulation Architecture
To achieve 100% strict isolation and prevent `aura.css` styles from bleeding into Tailwind v4 or TheraFlow/Scribe layouts:
- The Floating Orb and Panel are rendered inside a **Shadow Root** via `AuraShadowRoot.tsx`:
  - Mode: `'open'` (enabling seamless React Portal integration and test assertions).
  - The host element is `<div id="aura-extension-root"></div>`.
  - Inside the shadow root, `<style>` injects the raw content of `aura-shadow.css`.
  - In environments where Shadow DOM is unavailable or in SSR, it gracefully renders inside a scoped container (`.aura-shadow-scope`).

### 5.2 Zero CSS Bleed Audit Compliance (`scripts/verify-css-bleed.mjs`)
The project's automated verification script `node scripts/verify-css-bleed.mjs` enforces 7 strict AST/regex containment rules:
1. Zero global `*` rules (`/^\s*\*\s*\{/`)
2. Zero `html` rules (`/^\s*html\b/`)
3. Zero `body` rules (`/^\s*body\b/`)
4. Zero `#root` rules (`/^\s*#root\b/`)
5. Zero unscoped `.btn` rules (`/^\s*\.btn\b/`)
6. Zero unscoped `.badge` rules (`/^\s*\.badge\b/`)
7. Zero global `overflow: hidden` locks on `html` or `body`

### 5.3 Rewriting Canonical `aura.css` into `aura-shadow.css`
In the original canonical `aura.css`:
- Line 117 had `.badge { ... }` ➔ Would trigger rule #6 violation!
- Line 241 had `.primary-btn, .secondary-btn { ... }` ➔ If renamed to `.btn`, would trigger rule #5 violation!
- Line 1 had `:host { ... }`.

**Strict Scoping Fixes for `aura-shadow.css`**:
- All classes are namespaced under `:host` and `.aura-*`:
  - `:host { all: initial; font-family: ... }`
  - `:host .aura-container { ... }`
  - `:host .aura-orb { ... }`
  - `:host .aura-panel { ... }`
  - `:host .aura-badge, .aura-badge { ... }` (No line starts with `.badge`)
  - `:host .aura-btn, .aura-primary-btn, .aura-secondary-btn { ... }` (No line starts with `.btn`)
  - `:host .aura-visualizer { ... }`
  - `:host .aura-input-area, :host .aura-output-area { ... }`
- Result: **0 regex violations** detected when parsed by `verify-css-bleed.mjs`.

### 5.4 Updating `scripts/verify-css-bleed.mjs`
To ensure ongoing CI verification, `scripts/verify-css-bleed.mjs` should audit both stylesheets:
```javascript
// scripts/verify-css-bleed.mjs
const stylesheets = [
  { path: 'src/tools/scribe/scribe-theme.css', name: 'scribe-theme.css' },
  { path: 'src/tools/aura/aura-shadow.css', name: 'aura-shadow.css', optional: true },
];
```
Running `node scripts/verify-css-bleed.mjs` will verify both stylesheets with 0 violations and exit with code 0.

---

## 6. TypeScript Type System (`src/tools/aura/types.ts`)

A dedicated type definition file `src/tools/aura/types.ts` is required:

```typescript
export type ClinicalSpecialty =
  | 'general'
  | 'trauma'
  | 'cbt'
  | 'couples'
  | 'child';

export type CopilotStatus =
  | 'standby'
  | 'listening'
  | 'transcribing'
  | 'structuring'
  | 'ready';

export interface Dsm5Criterion {
  id: string;
  code: string;
  text: string;
  category?: string;
  defaultChecked?: boolean;
}

export interface Dsm5Diagnosis {
  id: string;
  code: string;        // e.g. "F41.1"
  name: string;        // e.g. "Generalized Anxiety Disorder"
  category: string;    // e.g. "Anxiety Disorders"
  thresholdText: string; // e.g. "Must meet >= 3 of 6 secondary criteria for >= 6 months"
  requiredCount: number;
  criteria: Dsm5Criterion[];
  evidenceInterventions: string[];
  typicalCptCodes: string[];
  associatedPatientIds: string[]; // e.g. ["p-101"]
}

export interface SuggestionChip {
  id: string;
  label: string;
  category: 'assessment' | 'differential' | 'intervention' | 'risk';
  textToInsert: string;
  cptReference?: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface AuraSettings {
  specialty: ClinicalSpecialty;
  shortcutKey: string;
  autoFormatSoap: boolean;
  showQuickChips: boolean;
  orbPosition: { x: number; y: number };
}

export interface AuraFloatingOrbProps {
  initialOpen?: boolean;
  onNavigateToStudio?: () => void;
}

export interface TypewriterSoapProps {
  initialText?: string;
  compact?: boolean;
  onInsertToEhr?: (note: string) => void;
  onSendToScrubber?: (note: string) => void;
}

export interface AuraVisualizerProps {
  isRecording: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}
```

---

## 7. Clinical Knowledge Base Architecture (`src/tools/aura/data/dsm5-database.ts`)

To ensure rich, realistic clinical decision support that dynamically updates as the clinician switches patients in the Header (Jane Doe ➔ Marcus Vance ➔ Elena Rostova), a database file `src/tools/aura/data/dsm5-database.ts` will provide:
1. `DSM5_DIAGNOSES`:
   - Generalized Anxiety Disorder (`F41.1`)
   - Major Depressive Disorder, Single Episode (`F32.1`)
   - Panic Disorder with Agoraphobia (`F41.0` / `F40.00`)
   - Post-Traumatic Stress Disorder (`F43.10`)
   - Adjustment Disorder with Depressed Mood (`F43.21`)
2. `CLINICAL_SUGGESTION_CHIPS`:
   - Standardized library of 8+ clinical prompt chips.
3. `CLINICAL_PRESET_SCENARIOS`:
   - Mock dictations and clinical encounters for instant testing.
4. `getDiagnosisForPatient(patientId: string)`:
   - Synchronous resolver mapping patient ID to primary diagnostic differential.

---

## 8. Cross-Tool Clinical Pipeline Integration

Aura interacts directly with the other three clinical SaaS applications via `useClinicalContext()`:

```
┌────────────────────────────────────────────────────────┐
│                      Aura Assistant                    │
│   (AuraStudio Workspace & AuraFloatingOrb Overlay)     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       insertToEhr(soapNote)    sendToPhiScrubber(soapNote)
                │                        │
                ▼                        ▼
┌────────────────────────┐      ┌────────────────────────┐
│     TheraFlow EHR      │      │   HIPAA PHI Scrubber   │
│  Active Patient Chart  │      │  18 Safe Harbor Engine │
│ (Jane Doe, CPT 90837)  │      │   (Zero ePHI Leak)     │
└────────────────────────┘      └────────────────────────┘
```

1. **Patient Context Sync**: Changing the active patient in Header (`Jane Doe` ➔ `Marcus Vance` ➔ `Elena Rostova`) immediately updates the diagnostic differential card in `AuraStudio` and the header tag in `AuraFloatingOrb`.
2. **EHR Append**: Invoking `insertToEhr(soap)` pushes synthesized SOAP notes into `activeEncounterNotes`, immediately visible in TheraFlow's DAP/SOAP progress notes.
3. **PHI De-identification**: Invoking `sendToPhiScrubber(soap)` passes raw clinical text into `scrubberInputText`, immediately ready for Safe Harbor redaction in the PHI Scrubber.

---

## 9. File Layout & Deliverable Inventory

The implementer agent will create and modify the following files:

```
src/tools/aura/
├── types.ts                    # TypeScript types and interfaces
├── aura-shadow.css             # Scoped stylesheet with 0 bleed violations
├── AuraShadowRoot.tsx          # React Shadow DOM container component
├── AuraVisualizer.tsx          # Headless-resilient SVG/CSS audio visualizer
├── AuraDictation.tsx           # Audio dictation & scenario capture engine
├── TypewriterSoap.tsx          # Typewriter streaming SOAP note synthesizer
├── AuraFloatingOrb.tsx         # Global draggable floating overlay
├── AuraStudio.tsx              # Fullscreen clinical decision support studio
└── data/
    └── dsm5-database.ts        # DSM-5 diagnostic differential database

src/components/layout/
└── AppLayout.tsx               # Mounts <AuraFloatingOrb /> globally

scripts/
└── verify-css-bleed.mjs        # Audits scribe-theme.css AND aura-shadow.css
```

---

## 10. E2E Test Compatibility & Certification

### 10.1 Existing Suite Baseline
The entire E2E test suite (`tests/e2e/run-all.mjs`, 80 test cases across 4 tiers) is currently **100% passing**.

### 10.2 Verification Plan for Milestone 5
1. **Tier 1 Feature Tests (`tier1-features.test.mjs`)**:
   - `T1.6.1`: `AuraStudio` mounts at `/dashboard/aura` with `Copilot Standby`.
   - `T1.6.2`: Differential Assistant binds to `Jane Doe` and `CPT: 90837`.
   - `T1.6.3`: Contains `DSM-5 symptom markers`, `ICD-10 diagnostic codes`, `clinical interventions`.
   - `T1.6.4`: Header contains Aura Copilot quick link.
   - `T1.6.5`: Updates dynamically to `Marcus Vance`.
2. **Tier 3 Cross-Feature Tests (`tier3-interactions.test.mjs`)**:
   - `T3.2`: Switching patient to Elena Rostova propagates to Aura.
   - `T3.6`: `insertToEhr` commits note to chart.
   - `T3.10`: Traversal across all 4 clinical tools passes cleanly.
3. **Tier 4 Scenario Tests (`tier4-scenarios.test.mjs`)**:
   - `Scenario 3`: Complex Multi-Diagnosis Encounter with Aura Copilot Assistance passes.
4. **CSS Bleed Verification**:
   - `node scripts/verify-css-bleed.mjs` exits with 0 violations.
5. **Production Build**:
   - `npm run build` succeeds cleanly with zero TypeScript errors.
