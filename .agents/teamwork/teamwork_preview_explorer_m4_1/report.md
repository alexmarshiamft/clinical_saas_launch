# Milestone 4 Technical Report: Clinical AI Scribe v2 Integration
## Feature 13 (Ambient Acoustic Diarization Feed) & Feature 18 (Scribe CSS Namespace Isolation)

**Author**: Explorer 1 (`teamwork_preview_explorer_m4_1`)  
**Date**: 2026-10-05  
**Working Directory**: `.agents/teamwork/teamwork_preview_explorer_m4_1/`  
**Target Codebase**: `clinical_saas_launch` (`src/tools/scribe/`)  
**Canonical Source Portfolio**: `/Users/alexandermarshi/Downloads/heidi-clone/`

---

## 1. Executive Summary

Milestone 4 integrates **Clinical AI Scribe v2** into the unified Clinical Telehealth & AI Scribe SaaS platform. This investigation analyzes the canonical portfolio repository (`heidi-clone`), evaluates existing platform contracts, and constructs an implementation-ready blueprint for:

1. **Feature 13: Ambient Acoustic Diarization Feed**:
   - Multi-speaker acoustic separation between Clinician (**Dr. Sarah Chen, MD**) and Patient (**Jane Doe** / active encounter) with millisecond-precision timestamps (`[MM:SS]`).
   - Headless/JSDOM-resilient real-time audio waveform visualizer eliminating `HTMLCanvasElement` context crashes.
   - Microphone hardware input selector with fallback simulation and recording controls (**Record**, **Pause**, **Stop**, **Clear**).
   - Pre-recorded clinical encounter samples (**GAD-7 Anxiety Intake**, **Major Depression & Panic Follow-up**, **PTSD Trauma & Hypervigilance Session**, **Chronic Illness / Diabetes Review**) with simulated turn playback and speed multipliers (1x–2x).
   - Seamless bidirectional state synchronization with `ClinicalContext` (`activePatient`, `rawTranscript`, `subjective`, `assessment`, `sendToPhiScrubber`, and `insertToEhr`).
2. **Feature 18: Scribe CSS Namespace Isolation**:
   - Strict CSS encapsulation under `.heidi-scribe-theme` eliminating global bleed.
   - Neutralization of destructive styles discovered in `heidi-clone/src/index.css` (specifically global `*`, `html, body { overflow: hidden; height: 100% }`, and unscoped `.btn`/`.badge` classes) that would otherwise compromise Tailwind CSS v4, Base UI, TheraFlow EHR, or Aura Assistant.
3. **Architecture and File Layout for `src/tools/scribe/`**:
   - Modular decomposition across `types.ts`, `WaveformVisualizer.tsx`, `AudioRecorder.tsx`, `DiarizationFeed.tsx`, `PreRecordedEncounters.tsx`, `ScribeWorkspace.tsx`, and `scribe-theme.css`.
4. **Automated Verification & Zero-Regression Test Strategy**:
   - Verification criteria ensuring 100% compliance with existing certified E2E tests (`T1.5.1`–`T1.5.5`, `T3.5`, `T3.6`, `T4.1`, `T4.2`).
   - Dedicated CSS bleed verification runner (`scripts/verify-css-bleed.mjs`).

---

## 2. Canonical Source Portfolio Analysis (`heidi-clone`)

An in-depth audit of `/Users/alexandermarshi/Downloads/heidi-clone/` was conducted across audio capture, diarization processing, clinical templates, and stylesheet definitions:

### 2.1 Audio Capture & Waveform Visualizer
- **Source File**: `src/components/audio/WaveformVisualizer.jsx`
- **Implementation**: Canvas-based 36-bar rendering loop driven by `requestAnimationFrame`.
- **Critical Risk Identified**: Line 9 executes `const ctx = canvas.getContext('2d');` without checking for a null context. In headless Node.js test environments (such as the project's JSDOM test runner in `tests/e2e/test-helpers.mjs`), `canvas.getContext('2d')` returns `null` because `node-canvas` is not loaded. Any execution in JSDOM throws:
  `TypeError: Cannot read properties of null (reading 'clearRect')`
- **Architectural Solution**: A dual-resilient visualizer using SVG `<rect>` elements or a guarded Canvas component with null check and fallback SVG rendering. In JSDOM, SVG elements render natively as DOM nodes, allowing automated test queries (`querySelector('svg')` or `data-testid="waveform-bar"`) without crashing the test runner.

### 2.2 Audio Recording & Diarization Engine
- **Source Files**: `src/components/audio/AudioRecorder.jsx`, `src/utils/diarizationEngine.js`, `src/context/DiarizeContext.jsx`
- **Capabilities**:
  - Web Audio API pipeline with Biquad low-pass filter (500Hz cutoff) and Fast Fourier Transform (FFT size 2048).
  - Autocorrelation-based fundamental frequency (`F0`) pitch detection for speaker differentiation (typical human speech ranges: male 85–180 Hz, female 165–255 Hz).
  - `MediaRecorder` audio chunk capture with fallback mime-types (`audio/webm;codecs=opus`, `audio/mp4`).
  - Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) for speech-to-text.
- **Critical Risk Identified**: In automated test environments or non-HTTPS browser contexts, `navigator.mediaDevices.getUserMedia` and `webkitSpeechRecognition` are unavailable or throw permission errors.
- **Architectural Solution**: The `AudioRecorder` component must feature robust defensive error handling and automatic simulation fallback. When live audio permissions are rejected or unavailable, the recorder transitions into synthetic mode with simulated frequency oscillations and audio energy metrics.

### 2.3 Transcript Diarization & Speaker Turn Management
- **Source Files**: `src/components/diarize/DiarizedTranscript.jsx`, `src/components/diarize/SpeakerTimeline.jsx`
- **Capabilities**:
  - Speaker identification with custom colors (Speaker 1 / Clinician: `#38bdf8`, Speaker 2 / Patient: `#ffe17d`).
  - 1-click speaker flip button (`ArrowLeftRight`) on each utterance to correct diarization misclassifications.
  - In-place utterance text editing with `<textarea>` and `onBlur` auto-save.
  - Utterance search and filter bar with real-time text matching.
  - Multi-track timeline bar showing conversational floor share by speech length.
  - 1-click clipboard export (`navigator.clipboard.writeText`).

### 2.4 Pre-Recorded Clinical Encounter Data
- **Source File**: `src/data/clinicalCases.js`
- **Capabilities**: Contains 6 comprehensive realistic clinical consultations with verbatim dialogue:
  - `case-cardio-01`: Cardiology Follow-up (Arthur Pendelton, Dr. Chen)
  - `case-gp-02`: General Practice / Diabetes (Elena Rostova, Dr. Chen)
  - `case-pediatrics-03`: Pediatrics (Liam O'Connor, Acute Otitis Media)
  - `case-psych-04`: Psychiatry (Marcus Vance, GAD-7: 16, PHQ-9: 14)
  - `case-ortho-05`: Orthopedics (Hannah Lindqvist, ACL & Medial Meniscus)
  - `case-telehealth-06`: Telehealth Pulmonology (David Kim, Acute Asthma)
- **Integration Synergy**: These encounters map directly onto the clinical domains specified in the dispatch (**GAD-7 intake**, **depression follow-up**, **PTSD trauma session**, **chronic illness follow-up**), providing rich, realistic simulation data for clinical workflows.

### 2.5 Severe CSS Bleed Hazards in `heidi-clone/src/index.css`
A line-by-line inspection of `heidi-clone/src/index.css` revealed extreme CSS bleed risks:
- **Global Reset**:
  ```css
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ```
  *Impact*: Overrides Tailwind v4 utility spacing, button paddings, and margin resets across the entire SaaS platform.
- **Global Root Lock**:
  ```css
  html, body {
    height: 100%;
    width: 100%;
    background-color: var(--bg-app);
    color: var(--text-primary);
    overflow: hidden;
  }
  ```
  *Impact*: Enforces a permanent dark background (`#0c0e11`) and freezes viewport scrolling globally (`overflow: hidden`), immediately breaking the Dashboard, TheraFlow Calendar, and Pricing pages.
- **Unscoped Selectors**:
  `.btn`, `.btn-primary`, `.btn-secondary`, `.badge`, `.badge-yellow`, `.modal-overlay`, `.modal-content`, `.form-input`.
  *Impact*: Directly conflicts with Tailwind components, Base UI controls, and TheraFlow EHR modals.

---

## 3. Feature 13: Ambient Acoustic Diarization Feed Blueprint

### 3.1 Speaker Separation Architecture
The diarization feed models dialogue as discrete chronological speech turns:

```typescript
export interface Utterance {
  id: string;
  speakerId: 'clinician' | 'patient' | string;
  speakerName: string; // "Dr. Sarah Chen, MD" | "Jane Doe"
  role: 'clinician' | 'patient';
  timestamp: string;  // e.g. "00:00", "00:08"
  seconds: number;
  text: string;
  confidence?: number;
  isInterim?: boolean;
}
```

#### Visual Differentiation & Interaction:
1. **Clinician Speech Turns**:
   - Border-left accent: Indigo/Cyan (`#38bdf8` or `#818cf8`).
   - Badge: Clinician avatar icon with name: `Dr. Sarah Chen, MD` (or `Dr. Sarah Chen`).
   - Font: Clear clinical typography with dark slate surface in dark mode or soft blue-gray surface in light mode.
2. **Patient Speech Turns**:
   - Border-left accent: Amber/Gold (`#ffe17d` or `#f59e0b`).
   - Badge: Patient avatar icon with name: `Jane Doe` (or active patient from `ClinicalContext`).
   - Font: Contrasting bubble treatment ensuring rapid visual separation.
3. **1-Click Speaker Flip Button**:
   - An interactive button on each utterance card with `ArrowLeftRight` icon.
   - Clicking immediately toggles the speech turn between `Dr. Sarah Chen` and the active patient without regenerating or reloading the transcript.
   - Synchronously updates the aggregated transcript in `ClinicalContext`.
4. **In-Place Utterance Correction**:
   - Clinicians can click the `Edit` icon or double-click text to enter inline edit mode with an auto-expanding `<textarea>`.
   - Pressing Enter or clicking outside commits the change and updates `ClinicalContext.activeEncounterNotes.rawTranscript`.
5. **Real-time Interim Bubble**:
   - While recording is active and interim speech is being captured, an animated pulsing bubble (`recording-pulse`) renders at the bottom of the feed displaying real-time partial transcription before final commit.

### 3.2 Headless/JSDOM-Resilient Waveform Visualizer
To guarantee that automated tests (including `npm run test:e2e`) run with zero crashes, the `WaveformVisualizer` employs an **SVG-First Hybrid Architecture**:

```tsx
// Architectural Pattern for WaveformVisualizer.tsx
export interface WaveformVisualizerProps {
  isRecording: boolean;
  isPlaying?: boolean;
  frequencyData?: Uint8Array | number[];
  barCount?: number;
  height?: number;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  isPlaying = false,
  frequencyData,
  barCount = 32,
  height = 36,
  className = '',
}) => {
  // Generates bar heights from frequencyData or deterministic fallback
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      if (isRecording || isPlaying) {
        if (frequencyData && frequencyData.length > 0) {
          const val = frequencyData[i % frequencyData.length] || 0;
          return Math.max(4, Math.round((val / 255) * (height - 8)));
        }
        // Simulated oscillation when recording/playing without Web Audio
        const wave = Math.abs(Math.sin((i + 1) * 0.45));
        return Math.max(6, Math.round(wave * (height - 6)));
      }
      return 4; // Idle resting amplitude
    });
  }, [isRecording, isPlaying, frequencyData, barCount, height]);

  return (
    <svg
      role="img"
      aria-label="Audio Waveform Visualizer"
      viewBox={`0 0 ${barCount * 6} ${height}`}
      className={`waveform-visualizer ${className}`}
      style={{ display: 'block', width: '100%', height: `${height}px` }}
    >
      {bars.map((barHeight, idx) => {
        const x = idx * 6;
        const y = (height - barHeight) / 2;
        const fill = isRecording
          ? 'url(#recordingGradient)'
          : isPlaying
          ? 'url(#playbackGradient)'
          : '#4b5563';

        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={3.5}
            height={barHeight}
            rx={1.75}
            fill={fill}
            className={isRecording ? 'waveform-bar-active' : ''}
          />
        );
      })}
      <defs>
        <linearGradient id="recordingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ffe17d" />
        </linearGradient>
        <linearGradient id="playbackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
    </svg>
  );
};
```

**Why this design excels:**
- **Zero Canvas Dependency**: Does not call `canvas.getContext('2d')`, completely eliminating JSDOM `null` context exceptions.
- **Pure DOM Elements**: Each bar is a standard SVG `<rect>` element that can be inspected, tested, and styled.
- **Fluid SVG Scaling**: Adapts smoothly to responsive widths via `viewBox`.
- **CSS Animation**: SVG rects animate with GPU acceleration via CSS transitions.

### 3.3 Audio Input Selector and Recording Controls
The `AudioRecorder` component provides complete clinical encounter audio lifecycle management:

1. **Hardware Device Selector**:
   - Populated dynamically using `navigator.mediaDevices.enumerateDevices()` filtered by `kind === 'audioinput'`.
   - Defensive fallback: When `enumerateDevices()` is blocked or absent (e.g. sandbox/CI), renders:
     - `Default System Microphone (Internal Studio Mic)`
     - `USB Clinical Noise-Canceling Headset`
     - `Telehealth Virtual Audio Stream (Loopback)`
2. **Recording State Machine**:
   - `idle` → `recording` → `paused` → `stopped`
   - **Record Button**: Initiates microphone stream or synthetic audio generation, starts the elapsed time counter, and activates waveform animation.
   - **Pause Button**: Freezes the timer and halts audio sampling while retaining interim transcript state.
   - **Stop Button**: Concludes the audio stream, triggers automatic transcript synthesis, and prepares SOAP notes.
   - **Clear Button**: Resets transcript, timer, and interim state (with confirmation guard).
3. **Timer & Telemetry**:
   - Formatted elapsed duration: `00:00` / `02:45`.
   - Voice energy VU meter showing real-time RMS voice volume.
   - Estimated vocal pitch indicator (e.g., `Clinician: 142 Hz` / `Patient: 218 Hz`).
4. **Mandatory UI String Contracts**:
   - Must render the badge: `AI Diarization Ready` (required by `tier1-features.test.mjs` and `tier4-scenarios.test.mjs`).
   - Must render title: `Clinical AI Scribe v2`.

### 3.4 Simulated Playback & Pre-Recorded Clinical Encounter Samples
To support sandbox demonstrations, training, and deterministic E2E test runs, Scribe provides an encounter library:

| Sample ID | Title | Specialty | Clinician | Patient | CPT Code | Key Clinical Presentation |
|---|---|---|---|---|---|---|
| `sample-gad7` | GAD-7 Anxiety Intake & CBT Progress | Psychiatry / Psychotherapy | Dr. Sarah Chen, MD | Jane Doe | **90837** | Sleep onset insomnia, stimulus control CBT, GAD F41.1, mindfulness exercises |
| `sample-mdd` | Major Depression & Panic Follow-up | Psychiatry | Dr. Sarah Chen, MD | Marcus Vance | **90834** | PHQ-9 (14), GAD-7 (16), workplace panic, Escitalopram 10mg titration |
| `sample-ptsd` | PTSD Trauma Session & Night Terrors | Behavioral Health | Dr. Sarah Chen, MD | David Kim | **90837** | Hypervigilance, trauma grounding, prolonged exposure review |
| `sample-diabetes` | Type 2 Diabetes & Neuropathy Review | General Practice | Dr. Sarah Chen, MD | Elena Rostova | **99214** | HbA1c 7.9%, bilateral foot tingling, Metformin + Empagliflozin SGLT2 |

#### Playback Controller Features:
- **Sample Switcher**: Dropdown/tab selector that instantly populates the transcript feed and synchronizes `ClinicalContext`.
- **Turn-by-Turn Playback Simulator**:
  - Play / Pause simulated encounter audio.
  - Speed multiplier buttons: **1x**, **1.25x**, **1.5x**, **2x**.
  - Interactive scrub slider tracking progress across encounter turns.
- **1-Click Sync**: "Apply Encounter to Active Chart" button immediately writes transcript and SOAP notes into `ClinicalContext`.

### 3.5 Synchronization with `ClinicalContext`
The Scribe integration connects directly with `src/lib/clinical-context.tsx`:

1. **Context Consumption**:
   - `const { activePatient, activeEncounterNotes, updateNoteField, sendToPhiScrubber, insertToEhr } = useClinicalContext();`
   - Active patient hero binds to `activePatient.name` (**Jane Doe** by default), `activePatient.mrn` (**#MC-88219**), and `activePatient.cptCode` (**90837**).
2. **Transcript Serialization**:
   - Transcripts are formatted and stored in `activeEncounterNotes.rawTranscript` as:
     ```text
     [00:00] Dr. Chen: Good morning Jane, how did the stimulus control exercises work this week?
     [00:08] Jane Doe: Dr. Chen, it really made a difference. I fell asleep in under 20 minutes.
     ```
   - Matches verbatim the assertions in `tier1-features.test.mjs` (`hasTranscript = html.includes('Dr. Chen:') && html.includes('Jane Doe:')`).
3. **Automated SOAP Preview Synthesis**:
   - When speech turns are added, edited, or pre-recorded cases loaded, Scribe synthesizes SOAP fields:
     - `Subjective`: Clinical narrative from patient speech turns.
     - `Objective`: Mental status or physical exam findings from clinician turns.
     - `Assessment`: Diagnosis reconciled with active CPT code (e.g. `Generalized Anxiety Disorder (F41.1) ... CPT 90837`).
     - `Plan`: Follow-up, medication, and therapeutic directives.
4. **Cross-Tool Pipeline Dispatch**:
   - **Send to PHI Scrubber Button**: Calls `sendToPhiScrubber(formattedTranscript)`. Automatically populates `scrubberInputText`, passing `tier3-interactions.test.mjs` test `T3.5`.
   - **Commit to EHR Chart Button**: Calls `insertToEhr(soapNote)`. Appends or updates `activeEncounterNotes.assessment`, passing `tier3-interactions.test.mjs` test `T3.6`.

---

## 4. Feature 18: Scribe CSS Namespace Isolation Blueprint

### 4.1 Strict Containment Under `.heidi-scribe-theme`
All Scribe styling must be contained inside `src/tools/scribe/scribe-theme.css` with every selector prefixed by or nested within `.heidi-scribe-theme`:

```css
/* ==========================================================================
   CLINICAL AI SCRIBE v2 (HEIDI CLONE) SCOPED NAMESPACE
   Containment: .heidi-scribe-theme
   Zero Global Bleed Guarantee
   ========================================================================== */

.heidi-scribe-theme {
  /* Scoped Design Tokens */
  --scribe-bg-app: #0c0e11;
  --scribe-bg-surface: #14171c;
  --scribe-bg-surface-elevated: #1a1e24;
  --scribe-bg-surface-hover: #222730;
  --scribe-bg-input: #101317;

  --scribe-border-subtle: #21262d;
  --scribe-border-medium: #2d333d;
  --scribe-border-focus: #ffe17d;

  --scribe-text-primary: #f3f4f6;
  --scribe-text-secondary: #9ca3af;
  --scribe-text-tertiary: #6b7280;

  --scribe-accent-yellow: #ffe17d;
  --scribe-accent-yellow-hover: #fcd34d;
  --scribe-accent-teal: #14b8a6;
  --scribe-accent-blue: #38bdf8;
  --scribe-accent-indigo: #818cf8;

  --scribe-radius-sm: 6px;
  --scribe-radius-md: 10px;
  --scribe-radius-lg: 14px;
  --scribe-radius-full: 9999px;

  /* Scoped Container Styles */
  background-color: var(--scribe-bg-surface);
  color: var(--scribe-text-primary);
  border-radius: var(--scribe-radius-lg);
  border: 1px solid var(--scribe-border-subtle);
  overflow: visible; /* Prevents global scroll-locking */
}

/* Scoped Buttons */
.heidi-scribe-theme .scribe-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--scribe-radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  outline: none;
  white-space: nowrap;
}

.heidi-scribe-theme .scribe-btn-primary {
  background-color: var(--scribe-accent-yellow);
  color: #0c0e11;
  border-color: var(--scribe-accent-yellow);
}

.heidi-scribe-theme .scribe-btn-primary:hover {
  background-color: var(--scribe-accent-yellow-hover);
  box-shadow: 0 0 16px rgba(255, 225, 125, 0.25);
}

.heidi-scribe-theme .scribe-btn-secondary {
  background-color: var(--scribe-bg-surface-elevated);
  color: var(--scribe-text-primary);
  border-color: var(--scribe-border-medium);
}

.heidi-scribe-theme .scribe-btn-secondary:hover {
  background-color: var(--scribe-bg-surface-hover);
  border-color: var(--scribe-border-focus);
}

.heidi-scribe-theme .scribe-btn-danger {
  background-color: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

.heidi-scribe-theme .scribe-btn-danger:hover {
  background-color: rgba(239, 68, 68, 0.25);
}

/* Scoped Badges */
.heidi-scribe-theme .scribe-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--scribe-radius-full);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.heidi-scribe-theme .scribe-badge-yellow {
  background-color: rgba(255, 225, 125, 0.15);
  color: var(--scribe-accent-yellow);
  border: 1px solid rgba(255, 225, 125, 0.3);
}

.heidi-scribe-theme .scribe-badge-teal {
  background-color: rgba(20, 184, 166, 0.15);
  color: var(--scribe-accent-teal);
  border: 1px solid rgba(20, 184, 166, 0.3);
}

/* Scoped Keyframes & Animation */
@keyframes scribePulseGlow {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.heidi-scribe-theme .recording-pulse {
  animation: scribePulseGlow 1.8s infinite;
}

/* Scoped Form Controls */
.heidi-scribe-theme .scribe-input,
.heidi-scribe-theme .scribe-select,
.heidi-scribe-theme .scribe-textarea {
  width: 100%;
  padding: 8px 12px;
  background-color: var(--scribe-bg-input);
  border: 1px solid var(--scribe-border-medium);
  border-radius: var(--scribe-radius-md);
  color: var(--scribe-text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.heidi-scribe-theme .scribe-input:focus,
.heidi-scribe-theme .scribe-select:focus,
.heidi-scribe-theme .scribe-textarea:focus {
  border-color: var(--scribe-border-focus);
}
```

### 4.2 Cross-App Insulation Matrix
| System Component | Potential Bleed Vector | Containment Defense | Verification Method |
|---|---|---|---|
| **Tailwind CSS v4** | Variable collisions with `@theme inline` | All Scribe variables use `--scribe-*` prefix or exist solely inside `.heidi-scribe-theme` | Inspect `:root` computed styles |
| **Global Viewport** | `html, body { overflow: hidden; height: 100% }` | Completely omitted from Scribe CSS; Scribe handles scrolling inside internal flex containers | Window scrolling verification |
| **TheraFlow Calendar** | Unscoped `.btn` or `table` reset breaking calendar grid | All buttons scoped under `.heidi-scribe-theme .scribe-btn` | `react-big-calendar` visual and layout check |
| **Base UI / Shadcn** | Dialog and badge selector pollution | Dialogs and badges scoped or use native Tailwind classes | Dialog modal rendering test |
| **Aura Assistant** | Glassmorphism card or chat bubble collisions | Aura uses Shadow DOM / `.aura-assistant-container`; Scribe isolated under `.heidi-scribe-theme` | Aura Studio concurrent mount test |

---

## 5. Architecture and File Layout for `src/tools/scribe/`

The complete component hierarchy for `src/tools/scribe/` is structured as follows:

```
src/tools/scribe/
├── types.ts                     # TypeScript definitions for utterances, speakers, samples, controls
├── scribe-theme.css             # Scoped CSS namespace container under .heidi-scribe-theme
├── WaveformVisualizer.tsx       # Headless-resilient SVG audio waveform visualizer
├── AudioRecorder.tsx            # Audio capture controls, device selector, recording timer, VU meter
├── DiarizationFeed.tsx          # Multi-speaker chronological transcript, speaker flip, inline editor, search
├── PreRecordedEncounters.tsx    # Encounter library (GAD-7, MDD, PTSD, Diabetes) & playback controller
└── ScribeWorkspace.tsx          # Top-level coordinator binding Feed, Recorder, SOAP Preview, & ClinicalContext
```

### 5.1 File Specifications & Interfaces

#### 1. `src/tools/scribe/types.ts`
```typescript
export interface Utterance {
  id: string;
  speakerId: 'clinician' | 'patient';
  speakerName: string;
  timestamp: string;
  seconds: number;
  text: string;
  isInterim?: boolean;
}

export interface Speaker {
  id: 'clinician' | 'patient';
  name: string;
  role: 'clinician' | 'patient';
  color: string;
  avatar?: string;
  avgPitch?: number;
}

export interface ClinicalEncounterSample {
  id: string;
  title: string;
  specialty: string;
  patientName: string;
  mrn: string;
  cptCode: string;
  durationSeconds: number;
  summary: string;
  transcript: Utterance[];
  soapPreview: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';
```

#### 2. `src/tools/scribe/WaveformVisualizer.tsx`
- **Role**: SVG-based dynamic audio waveform rendering with zero `node-canvas` dependency.
- **Props**:
  - `isRecording: boolean`
  - `isPlaying?: boolean`
  - `frequencyData?: Uint8Array | number[]`
  - `barCount?: number` (default 32)
  - `height?: number` (default 32)
- **Behavior**: Generates `<svg>` with animated gradients (`#ef4444` to `#ffe17d` for recording, `#14b8a6` to `#38bdf8` for playback, muted gray for idle).

#### 3. `src/tools/scribe/AudioRecorder.tsx`
- **Role**: Hardware audio device selection, recording controls, duration display, and voice activity telemetry.
- **Props / Callbacks**:
  - `recordingState: RecordingState`
  - `onStart: () => void`
  - `onPause: () => void`
  - `onResume: () => void`
  - `onStop: () => void`
  - `onClear: () => void`
  - `durationSeconds: number`
  - `audioMetrics: { rms: number; isVoiceActive: boolean; pitch: number }`
- **UI Elements**:
  - Hardware selector dropdown (`<select className="scribe-select">`)
  - Record/Pause/Stop/Clear button cluster
  - Live timer display (`00:00`)
  - Voice activity meter

#### 4. `src/tools/scribe/DiarizationFeed.tsx`
- **Role**: Renders chronological conversation turns with speaker badges, flip button, inline text editing, and transcript search.
- **Props**:
  - `transcript: Utterance[]`
  - `interimText?: string`
  - `onToggleSpeaker: (utteranceId: string) => void`
  - `onEditUtterance: (utteranceId: string, newText: string) => void`
  - `onAddUtterance: (text: string, speakerId: 'clinician' | 'patient') => void`
  - `speakers: Speaker[]`
  - `activePatientName: string`
- **UI Elements**:
  - Search input filtering utterances
  - Copy transcript CTA button
  - Utterance list with Clinician (cyan/indigo) vs Patient (amber/gold) badges
  - 1-click speaker flip button (`ArrowLeftRight`)
  - Inline textarea for editing text
  - Live interim bubble during active recording

#### 5. `src/tools/scribe/PreRecordedEncounters.tsx`
- **Role**: Interactive clinical sample catalog and simulated consultation playback.
- **Props**:
  - `samples: ClinicalEncounterSample[]`
  - `activeSampleId: string`
  - `onSelectSample: (sample: ClinicalEncounterSample) => void`
  - `isPlaying: boolean`
  - `onTogglePlay: () => void`
  - `playbackSpeed: number`
  - `onChangeSpeed: (speed: number) => void`
- **Encounters Included**:
  - 1. GAD-7 Anxiety Intake (Jane Doe, CPT 90837)
  - 2. Major Depression & Panic Follow-up (Marcus Vance, CPT 90834)
  - 3. PTSD Trauma Session (David Kim, CPT 90837)
  - 4. Type 2 Diabetes Review (Elena Rostova, CPT 99214)

#### 6. `src/tools/scribe/ScribeWorkspace.tsx`
- **Role**: Top-level coordinator wrapped in `.heidi-scribe-theme`.
- **Layout**:
  - Header: Title `Clinical AI Scribe v2`, subtitle, and badge `AI Diarization Ready`.
  - Recording & Telemetry Bar: Houses `AudioRecorder`, `WaveformVisualizer`, and `PreRecordedEncounters` switcher.
  - Two-Column Grid:
    - **Left Column**: `DiarizationFeed` displaying live acoustic speech turns.
    - **Right Column**: SOAP Note Synthesis Preview (`Subjective`, `Objective`, `Assessment`, `Plan`) synchronized with patient CPT code (**CPT 90837**), plus action CTAs:
      - **"Send to PHI Scrubber"** (`sendToPhiScrubber`)
      - **"Commit to EHR Chart"** (`insertToEhr`)
      - **"Copy Clinical Note"** (clipboard)

---

## 6. Verification Criteria and Automated Test Strategy

### 6.1 Compatibility Matrix with Certified E2E Test Suite
The implementation must pass 100% of the existing certified test suite (`npm run test:e2e` / `node tests/e2e/run-all.mjs`). The table below outlines every test requirement and exact verification criteria:

| Test ID | Test Name | Source File | Exact Strings / Elements Required | Implementation Compliance Plan |
|---|---|---|---|---|
| **T1.5.1** | Scribe Workspace Mounting | `tier1-features.test.mjs:400` | `Clinical AI Scribe v2`<br>`AI Diarization Ready` | Retain top-level header and pulsing badge verbatim in `ScribeWorkspace.tsx` |
| **T1.5.2** | Live Acoustic Diarization | `tier1-features.test.mjs:414` | `Dr. Sarah Chen` or `Dr. Chen:`<br>`Jane Doe:` | Diarization transcript default state must include turns from both `Dr. Chen:` and `Jane Doe:` |
| **T1.5.3** | SOAP Preview Synthesis | `tier1-features.test.mjs:430` | `Subjective:`<br>`Assessment:` | Right-column preview must render bold labels `Subjective:` and `Assessment:` |
| **T1.5.4** | CPT 90837 Code Synchronization | `tier1-features.test.mjs:446` | `CPT 90837` | SOAP preview header must display `CPT {activePatient.cptCode}` (resolving to `CPT 90837`) |
| **T1.5.5** | Scribe Launch CTA | `tier1-features.test.mjs:457` | `a[href="/dashboard/scribe"]` | Sidebar and Command Center navigation links must route cleanly |
| **T3.5** | Scribe -> PHI Scrubber Pipeline | `tier3-interactions.test.mjs:248` | `sendToPhiScrubber(text)` | Scribe CTA button calls `sendToPhiScrubber` with formatted transcript |
| **T3.6** | Scribe -> EHR Chart Commitment | `tier3-interactions.test.mjs:287` | `insertToEhr(text)` | Scribe CTA button calls `insertToEhr` appending to `activeEncounterNotes.assessment` |
| **T4.1** | End-to-End Patient Intake Journey | `tier4-scenarios.test.mjs:70` | `Clinical AI Scribe v2`<br>`Dr. Chen:` & `Jane Doe:`<br>`Subjective:` & `Assessment:` | Full scenario navigates to `/dashboard/scribe` and asserts transcript + SOAP preview |
| **T4.2** | Telehealth & Scribe Diarization | `tier4-scenarios.test.mjs:132` | `AI Diarization Ready`<br>`CPT 90837` | Telehealth encounter launches Scribe workspace and verifies CPT reconciliation |

### 6.2 Headless/JSDOM Resilience Criteria
- **Zero Canvas Failures**: `WaveformVisualizer` must mount in JSDOM without invoking un-mocked canvas methods (`clearRect`, `createLinearGradient`, `roundRect`).
- **Zero Media Exception Crashes**: `navigator.mediaDevices.getUserMedia` calls must be wrapped in `try/catch` and gracefully fall back to simulation when running in Node.js or environments without media hardware.
- **Zero Unhandled Timers**: All `requestAnimationFrame`, `setInterval`, and `setTimeout` timers must be safely unmounted in `useEffect` cleanup return functions.

### 6.3 Automated CSS Bleed Verification Script (`scripts/verify-css-bleed.mjs`)
To verify Feature 18 deterministically, a dedicated verification script `scripts/verify-css-bleed.mjs` will inspect both stylesheet source files and runtime JSDOM styles:

```javascript
// scripts/verify-css-bleed.mjs
import fs from 'node:fs';
import path from 'node:path';

const CSS_PATH = path.resolve('src/tools/scribe/scribe-theme.css');
const content = fs.readFileSync(CSS_PATH, 'utf-8');

// Rules:
// 1. Zero global * rules outside .heidi-scribe-theme
// 2. Zero html or body rules
// 3. Zero unscoped .btn or .badge rules
const lines = content.split('\n');
const forbiddenGlobalSelectors = [
  /^\s*\*\s*\{/,
  /^\s*html\b/,
  /^\s*body\b/,
  /^\s*#root\b/,
  /^\s*\.btn\b/,
  /^\s*\.badge\b/,
  /overflow:\s*hidden/i
];

let violations = 0;
lines.forEach((line, idx) => {
  // Strip comments
  const cleanLine = line.split('/*')[0].trim();
  for (const pattern of forbiddenGlobalSelectors) {
    if (pattern.test(cleanLine)) {
      console.error(`[CSS Bleed Violation] Line ${idx + 1}: "${cleanLine}" violates containment.`);
      violations++;
    }
  }
});

if (violations === 0) {
  console.log('✓ [PASS] Zero CSS bleed detected in scribe-theme.css. Scoping strictly preserved.');
  process.exit(0);
} else {
  console.error(`❌ [FAIL] ${violations} CSS bleed violations detected.`);
  process.exit(1);
}
```

---

## 7. Implementation Roadmap & Task Breakdown

1. **Step 1: Scoped Stylesheet (`src/tools/scribe/scribe-theme.css`)**
   - Create scoped design tokens and classes under `.heidi-scribe-theme`.
   - Verify zero unscoped selectors.
2. **Step 2: Types Definition (`src/tools/scribe/types.ts`)**
   - Define `Utterance`, `Speaker`, `ClinicalEncounterSample`, and `RecordingState`.
3. **Step 3: Headless-Resilient Visualizer (`src/tools/scribe/WaveformVisualizer.tsx`)**
   - Implement SVG-based 32-bar visualizer with gradient animations.
4. **Step 4: Audio Controls & Device Selector (`src/tools/scribe/AudioRecorder.tsx`)**
   - Implement Record, Pause, Stop, Clear, device selection dropdown, elapsed timer, and VU meter.
5. **Step 5: Pre-Recorded Encounters Catalog (`src/tools/scribe/PreRecordedEncounters.tsx`)**
   - Add sample encounters (GAD-7 Jane Doe, MDD Marcus Vance, PTSD David Kim, Diabetes Elena Rostova) with simulated playback controls.
6. **Step 6: Diarization Transcript Feed (`src/tools/scribe/DiarizationFeed.tsx`)**
   - Implement speaker-separated speech turns, 1-click speaker flip, inline text editing, search, and copy CTA.
7. **Step 7: Unified Scribe Workspace (`src/tools/scribe/ScribeWorkspace.tsx`)**
   - Integrate DiarizationFeed, AudioRecorder, WaveformVisualizer, PreRecordedEncounters, and SOAP note preview.
   - Synchronize with `ClinicalContext` (`sendToPhiScrubber`, `insertToEhr`, `activePatient.cptCode`).
8. **Step 8: Automated Verification Execution**
   - Run `npm run test:e2e` to verify 100% pass rate across Tiers 1–4 (80/80 tests).
   - Execute `node scripts/verify-css-bleed.mjs` to guarantee zero CSS pollution.

---

## 8. Conclusion

This blueprint provides complete technical and architectural specifications for integrating **Clinical AI Scribe v2** into the Clinical SaaS Platform. By combining an SVG-based resilient waveform visualizer, comprehensive speaker diarization controls, pre-recorded clinical encounter samples, bidirectional `ClinicalContext` synchronization, and strict CSS containment under `.heidi-scribe-theme`, the implementation delivers a polished clinical workflow while protecting the broader application from regression or visual bleed.
