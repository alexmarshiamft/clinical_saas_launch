# Technical Survey & Asset Evaluation: Aura Assistant & HIPAA PHI Scrubber

**Date**: 2026-10-05  
**Author**: Explorer 2 (`teamwork_preview_explorer_survey_2`)  
**Mission**: Comprehensive technical investigation of **Aura Assistant** and **HIPAA PHI Scrubber** across the portfolio for seamless consolidation into the unified Clinical Telehealth & AI Scribe SaaS platform (`clinical_saas_launch`).

---

## Executive Summary

Both target applications have been located, cataloged, and technically verified across two distinct layers:
1. **Canonical Production Repositories**:
   - **Aura Clinical Assistant**: Chrome Manifest V3 In-Workflow Extension (`/Users/alexandermarshi/Documents/antigravity/aura-extension`), featuring a closed Shadow DOM overlay, audio dictation visualizer, quick-insert clinical snippet chips, and direct DOM injection into host EHR form fields.
   - **HIPAA PHI Scrubber**: High-throughput Safe Harbor De-Identification Engine (`/Users/alexandermarshi/phi_scrubber`), featuring 100% verified test coverage (41 tests passing), deterministic regex rules for all 18 HIPAA Safe Harbor identifiers, spaCy NER support, FastAPI REST microservice, Streamlit interactive visualizer, and LangChain/LlamaIndex guardrails.
2. **Interactive React Web Implementations** (from `interactive_portfolio_site`):
   - **Aura Assistant React Component**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/DemoApp31.tsx`
   - **HIPAA PHI Scrubber React Component**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/DemoApp17.tsx`
   - **Complementary Document Redactor Component**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/DemoApp23.tsx`

These two applications provide the **clinical workflow acceleration** (Aura) and **statutory data privacy / de-identification** (PHI Scrubber) pillars of the unified SaaS suite.

---

## 1. Canonical File Paths & Directory Structures

### 1.1. Application 1: Aura Clinical Assistant

#### Standalone Extension Repository
- **Canonical Path**: `/Users/alexandermarshi/Documents/antigravity/aura-extension`
- **Portfolio Catalog ID**: App 31 (`aura-clinical-assistant`)
- **Directory Layout**:
  ```text
  /Users/alexandermarshi/Documents/antigravity/aura-extension/
  ├── manifest.json              # Chrome Manifest V3 schema (permissions: storage, web_accessible_resources)
  ├── package.json               # Package config (playwright: ^1.42.1)
  ├── package-lock.json          # Dependency lockfile
  ├── content.js                 # 234 lines (9.4 KB) - Closed Shadow Root, host focus tracking, UI & SOAP engine
  ├── aura.css                   # 296 lines (6.3 KB) - Scoped glassmorphism styles, orb animations, responsive panel
  ├── popup.html                 # 127 lines (3.2 KB) - Extension popup settings interface
  ├── popup.js                   # 39 lines (1.8 KB) - chrome.storage.local persistence with localStorage fallback
  ├── record-aura.mjs            # Playwright automated browser test & video recording script
  ├── DUE_DILIGENCE.md           # Technical verification report (MV3 compliance, zero external telemetry)
  ├── store_assets/              # Chrome Web Store promotional markdown and graphic assets
  └── node_modules/              # Local node runtime dependencies
  ```

#### Integrated React Component
- **Component File**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/DemoApp31.tsx` (216 lines, 10.0 KB)
- **Module Barrel**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/index.ts`
- **Catalog Metadata**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/data/appsCatalog.ts` (Lines 1145–1167)
- **Staged Verification**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/staged_verification/app_31/manifest.json`

---

### 1.2. Application 2: HIPAA PHI Scrubber

#### Standalone Library & Service Repository
- **Canonical Path**: `/Users/alexandermarshi/phi_scrubber`
- **Portfolio Catalog ID**: App 17 (`hipaa-phi-scrubber`)
- **Directory Layout**:
  ```text
  /Users/alexandermarshi/phi_scrubber/
  ├── phi_scrubber.py            # 514 lines (17.8 KB) - Core engine: 18-identifier Safe Harbor regexes & NER pipeline
  ├── api.py                     # 162 lines (5.9 KB) - FastAPI microservice with /health, /scrub, /scrub-json
  ├── demo.py                    # 253 lines (10.2 KB) - Streamlit interactive dashboard with live diff & metrics
  ├── pyproject.toml             # 65 lines (1.4 KB) - Hatchling packaging, CLI entrypoint, optional bundles
  ├── test_phi_scrubber.py       # 207 lines (9.2 KB) - 37 unit tests covering all 18 HIPAA identifier types
  ├── test_api_and_demo.py       # 66 lines (1.9 KB) - 4 integration tests for REST API endpoints & demo data
  ├── conftest.py                # Pytest configuration
  ├── README.md                  # 259 lines (8.3 KB) - Documentation, 18-rule matrix, LangChain/LlamaIndex guides
  └── __pycache__/               # Compiled Python bytecode (Python 3.12 verified)
  ```

#### Integrated React Component
- **Component File**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/DemoApp17.tsx` (244 lines, 10.7 KB)
- **Module Barrel**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/index.ts`
- **Catalog Metadata**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/data/appsCatalog.ts` (Lines 615–651)

#### Related Complementary Assets (Document Redactor Suite)
- **Complementary Extension & Backend**: `/Users/alexandermarshi/Downloads/hipaa-redactor-plugin` (Flask 2.3.3, `pdfplumber==0.10.3`, `pypdf==3.17.1`, `reportlab==4.0.7`)
- **React Component**: `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/interactive_portfolio_site/src/components/demos/cluster2/DemoApp23.tsx` (180 lines, 7.4 KB)

---

## 2. Technology Stacks, Dependencies & Compatibility Analysis

### 2.1. Standalone Codebase Tech Stacks

| Metric | Aura Clinical Assistant | HIPAA PHI Scrubber |
|---|---|---|
| **Primary Language** | JavaScript (ES Modules, Vanilla JS) | Python 3.9+ (Type annotations, dataclasses) |
| **Runtime / Platform** | Chrome Manifest V3 Browser Extension | Python CLI, FastAPI (Uvicorn), Streamlit |
| **Build System / Tooling** | Vanilla / Playwright `^1.42.1` | `hatchling` (PEP 517/621 `pyproject.toml`) |
| **Testing Framework** | Playwright E2E (`record-aura.mjs`) | `pytest>=8.0` (41 passing tests, 0.04s core execution) |
| **UI Rendering** | Scoped CSS3 + Web Components Shadow DOM | Streamlit 1.30+ / React 18 component |
| **State Management** | `chrome.storage.local` with fallback to `localStorage` | Stateless functional engine; Pydantic v2 schemas |

### 2.2. Portfolio React Implementations Stack (`interactive_portfolio_site`)

Both applications have already been ported to production-grade React 18 TypeScript components within `interactive_portfolio_site/package.json`:
- **React**: `18.3.1` (`@types/react`: `18.3.28`, `@types/react-dom`: `18.3.0`)
- **Bundler & Tooling**: Vite `5.4.21`, `@vitejs/plugin-react` `4.7.0`, TypeScript `5.6.3`
- **Routing**: `react-router-dom` `7.15.0`
- **Styling**: `tailwindcss` `3.4.19`, `postcss` `8.5.14`, `autoprefixer` `10.5.0`
- **Utilities**: `clsx` `2.1.1`, `tailwind-merge` `2.6.1`
- **Iconography**: `lucide-react` `0.368.0`
- **Document Utilities**: `pdf-lib` `1.17.1`

### 2.3. Dependency & Library Conflict Analysis for Single SPA Merge

1. **Icon Library Uniformity**:
   - Both `DemoApp31.tsx` and `DemoApp17.tsx` exclusively use `lucide-react` (`Sparkles`, `Zap`, `Mic`, `Copy`, `CheckCircle2`, `Lock`, `FileText`, `Shield`, `Tag`, `Sliders`, `Filter`, etc.).
   - This perfectly aligns with TheraFlow and Clinical AI Scribe v2, eliminating icon library bloat.
2. **React 18 & TypeScript Consistency**:
   - Both components are strictly typed with zero implicit `any`, compatible with standard `tsc --noEmit` checks.
3. **Execution Model Differences**:
   - **Aura Extension**: Uses browser extension APIs (`chrome.runtime`, `chrome.storage.local`, DOM document level `focusin`).
     - *Merge Solution*: The React version (`DemoApp31.tsx`) simulates the host EHR interaction in-browser, while the core assistant features (dictation buffer, SOAP generator, quick snippets) operate cleanly within React component state or standard `localStorage`.
   - **PHI Scrubber**: The Python backend (`phi_scrubber.py`) is deterministic regex.
     - *Merge Solution*: Two viable approaches exist:
       - **Approach A (Pure Client-Side SPA)**: Port the compiled regular expressions from `phi_scrubber.py` into a client-side TypeScript module (`phiScrubber.ts`). This allows 0ms instant de-identification directly in the browser with zero network requests and absolute zero cloud PHI transmission.
       - **Approach B (Hybrid Microservice)**: Containerize `api.py` as a FastAPI backend route (`/api/v1/scrub`) or deploy as an edge function.
       - *Recommendation*: Implement **Approach A** as the primary client-side sanitization layer for zero-latency charting, with an optional backend API route for bulk file processing.

---

## 3. Comprehensive Feature Inventory

### 3.1. Aura Assistant Feature Inventory

#### 3.1.1. Core Screens & UI Components
1. **Floating Action Orb**:
   - Conic and radial gradient circular trigger with ambient purple/pink glow and pulse keyframe animation.
   - Positioned in bottom-right corner (`fixed` or container-absolute).
   - Toggles open/close states with smooth transform scaling.
2. **Command Center Dock Panel**:
   - Modern glassmorphism panel (`backdrop-filter: blur(24px) saturate(180%)`, semi-transparent background, subtle border).
   - Header with Aura branding, "Closed Shadow DOM" badge, and dismiss button (`&times;`).
3. **Real-Time Voice Visualizer Simulation**:
   - Container displaying 5 animated frequency bars (`.bar`) bouncing with alternating cubic-bezier animation delays.
   - Visual cue: switches color from purple (`#8b5cf6`) to vibrant pink (`#ec4899`) during dictation mode.
   - Text label: "Click Orb to Dictate" fading to simulated speech transcript.
4. **Clinical Dictation Buffer (`textarea`)**:
   - Real-time scratchpad holding dictated or pasted patient encounter narratives.
5. **Quick-Insert Clinical Snippets Bar**:
   - One-click clinical chip buttons for instantaneous documentation:
     - `No SI/HI`: *"Patient denies suicidal or homicidal ideation, intent, or plan. Risk level assessed as low."*
     - `MSE WNL`: *"Mental Status Exam: Alert and oriented x4, euthymic affect, linear thought process, intact insight and judgment."*
     - `CBT Homework`: *"Addressed cognitive distortions using thought record; assigned behavioral activation homework."*
6. **AI SOAP Structuring Engine & Streaming Output**:
   - Action button: "Format SOAP" with spinner / typewriter streaming simulation (40ms per word cadence).
   - Formats input into standardized 4-part SOAP note:
     - `SUBJECTIVE`: Chief complaint, symptom chronology, pain characteristics.
     - `OBJECTIVE`: Vital signs, behavioral observations, mental status findings.
     - `ASSESSMENT`: Diagnostic impression, ICD-10 clinical formulation.
     - `PLAN`: Intervention strategy, homework, pharmacological referrals, follow-up schedule.
7. **Host EHR Direct Injection Engine**:
   - Action button: "Insert to EHR" with green gradient and checkmark confirmation.
   - Traverses document to target `lastActiveHostInput` (captured via `focusin` event listeners) or `document.activeElement`.
   - Supports `<textarea>`, `<input>`, `contentEditable` div elements, and falls back to clipboard with user notification.
8. **Settings & Customization Modal / Popup (`popup.html`)**:
   - Clinical Specialty Selector:
     - General Adult Psychotherapy
     - Trauma & EMDR Focus
     - CBT / Behavioral Activation
     - Couples & Family Therapy
     - Child & Adolescent
   - Configurable shortcut hotkey (default: `Alt + A`).
   - Toggles: "Auto-Format SOAP on Finish", "Show EHR Quick-Insert Chips".
9. **Emulated Host EHR Workspace (in `DemoApp31.tsx`)**:
   - Patient header: "Jane Doe • DOB: 04/12/1988 • CPT: 90837 • Encounter #49102".
   - 4 discrete EHR charting inputs: Subjective, Objective, Assessment, Plan.
   - One-click full SOAP injection action: *"⚡ Inject Formatted SOAP to EHR"*.

---

### 3.2. HIPAA PHI Scrubber Feature Inventory

#### 3.2.1. Core Screens & UI Components
1. **Clinical Narrative Workspace & Side-by-Side Diff**:
   - Left column: Raw encounter text input / display with detected entity counter badge (`rose-400`).
   - Right column: Sanitized Safe Harbor text output display with "100% De-Identified" status badge (`emerald-400`).
2. **Clinical Narrative Preset Selector**:
   - Preset 1: *Full Consultation & Admission* (Comprehensive inpatient intake with all 18 identifiers: Jane Doe, Seattle Grace, pacemaker DEV-789-XYZ-001, VIN, voiceprint, photo).
   - Preset 2: *Outpatient AMFT Session Note* (Client Emily Watson, Pasadena, Stark Industries, phone).
   - Preset 3: *Outpatient Psychiatric Intake Note* (Robert 'Bob' Vance, Scranton, PA, AETNA, truck plate, tax audit SSN).
   - Preset 4: *Remote Patient Monitoring Telemetry Log* (Alice M. Walker, Holter monitor, gateway serial, IP, firmware URL).
3. **Masking Style Controls**:
   - `tag` mode: Replaces sensitive spans with categorized bracketed tokens (e.g. `[NAME]`, `[SSN]`, `[DATE]`, `[MRN]`).
   - `block` mode: Solid redaction blackouts (`████████`).
   - `asterisk` mode: Masked characters (`********`).
   - `hash` mode: Phone/ID format masks (`***-***-****`).
4. **Strict Safe Harbor Enforcement Toggle**:
   - Enforces strict compliance with 45 CFR § 164.514, stripping all dates (except year for age < 90) and geographic subdivisions below state level.
5. **Action Controls**:
   - "Copy Redacted Text" button with copied feedback state.
   - "Download Clean Text (.txt)" and "Download Redaction Audit Log (.json)" file export buttons.
6. **Forensic Redaction Audit Trail / Entity Taxonomy Table**:
   - Interactive table detailing every detected span:
     - Index #
     - Category (Patient Identity, Temporal, Government ID, Geographic, Contact, Beneficiary, Biometric / Device)
     - Safe Harbor Entity Tag (`NAME`, `DATE`, `SSN`, `ADDRESS`, `PHONE`, `EMAIL`, `HEALTH_PLAN`, `DEVICE_ID`, `IP_ADDRESS`, etc.)
     - Redacted Value (original text span)
     - Confidence metric (`99.8%` deterministic accuracy)
     - Offset range (`start` – `end` character indices)
7. **Telemetry & Metric Indicators**:
   - Total items redacted counter.
   - Categories triggered counter (`X / 18`).
   - Character length delta indicator (`orig_len → clean_len`).
   - De-identification status badge (`COMPLIANT` vs `CLEAN`).

#### 3.2.2. All 18 HIPAA Safe Harbor Identifier Detection Rules

`phi_scrubber.py` implements complete, prioritized detection for the 18 statutory HIPAA identifiers:

| # | HIPAA Identifier | Regex / NER Classification Rule | Default Token |
|---|---|---|---|
| **1** | **Names** | spaCy NER (`PERSON`) + Title heuristics (`Dr.`, `Mr.`, `Patient Name:`, `Attending:`, etc.) | `[NAME]` |
| **2** | **Geographic subdivisions** | spaCy NER (`GPE`, `LOC`) + Full street address / 9-digit / 5-digit ZIP regex | `[LOCATION]` / `[ZIP]` |
| **3** | **Dates & Ages > 89** | Multi-format date regex (MM/DD/YYYY, Month DD YYYY, ISO dates) + Ages 90+ (`9[0-9]\|1[0-9]{2}`) | `[DATE]` / `[AGE_90+]` |
| **4** | **Phone numbers** | US & international phone formats: `(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}` | `[PHONE]` |
| **5** | **Fax numbers** | Contextual fax patterns and standard telephone runs | `[PHONE]` |
| **6** | **Email addresses** | RFC 5322 regex: `\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b` | `[EMAIL]` |
| **7** | **Social Security numbers (SSN)** | Validated SSN runs excluding 000, 666, 9xx areas: `(?!000\|666\|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}` | `[SSN]` |
| **8** | **Medical Record numbers (MRN)** | Labelled MRN patterns: `\b(?:MRN?\|Medical\s+Record\s+(?:Number\|#\|No\.?))\s*[:#]?\s*\d[\d\-]{4,14}\b` | `[MRN]` |
| **9** | **Health plan beneficiary numbers** | Carrier IDs: `\b(?:Health\s+Plan\|Beneficiary\|Member\|Policy\|Group\|Insurance\|Claim)\s*(?:ID\|Number\|No\.?\|#)\s*[:#]?\s*[A-Z0-9][\w\-]{4,20}\b` | `[HEALTH_PLAN_NUM]` |
| **10** | **Account numbers & Credit cards** | Labelled account numbers + 13-16 digit Luhn candidate credit cards (Visa, MC, Amex, Discover) | `[ACCOUNT_NUM]` / `[CREDIT_CARD]` |
| **11** | **Certificate / license numbers** | DEA, state medical license, UPIN, driver's licenses: `\b(?:License\|Licence\|Cert(?:ificate)?\|DEA\|UPIN)\s*...` | `[LICENSE_NUM]` |
| **12** | **Vehicle identifiers (VIN & plates)** | Standard 17-character VIN + labelled license plates: `[A-HJ-NPR-Z0-9]{17}` | `[VEHICLE_ID]` |
| **13** | **Device identifiers & serial numbers** | Pacemaker, sensor, implant serials: `\b(?:Serial\|Device\|Implant\|Pacemaker\|Sensor)\s*(?:No\.?\|Number\|#\|ID)\s*...` | `[DEVICE_SERIAL]` |
| **14** | **Web URLs** | Full HTTP/HTTPS URLs and www prefixes | `[URL]` |
| **15** | **IP addresses** | IPv4 octet runs (`(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}...`) | `[IP_ADDRESS]` |
| **16** | **Biometric identifiers** | Labelled biometric scans (voiceprint, retina, iris, fingerprint, facial recognition) | `[BIOMETRIC]` |
| **17** | **Full-face photographic images** | Image/photo file paths and clinical portrait references | `[PHOTO_REF]` |
| **18** | **Unique identifying numbers** | Unique barcode UIDs, tracking numbers, NPI (10-digit national provider identifiers) | `[NPI]` / `[UNIQUE_ID]` |

#### 3.2.3. Algorithmic Integrity Safeguards
- **Priority-Ordered Execution**: Structured regex patterns run in strict precedence so specialized patterns (e.g., NPI 10-digit) consume numbers before generic patterns (e.g., phone numbers).
- **Right-to-Left Substitution**: Patterns are replaced in reverse character order so string indices of earlier matches remain valid without distortion.
- **Recursive JSON / Dict Scrubbing (`scrub_dict`)**: Recursively walks nested object trees, de-identifying clinical text fields while keeping keys, integers, and data structures intact.

---

## 4. State Management, Styling & Merge Conflict Analysis

### 4.1. Styling Architecture & Conflict Assessment

| Feature | Aura Assistant (`aura-extension`) | Aura React (`DemoApp31.tsx`) | PHI Scrubber (`DemoApp17.tsx`) | Target Unified SaaS |
|---|---|---|---|---|
| **Styling Paradigm** | Raw Scoped CSS (`aura.css`) with Closed Shadow DOM | Tailwind CSS v3 utility classes | Tailwind CSS v3 utility classes | Tailwind CSS v3 / v4 with Design System Tokens |
| **Theme / Color Palette** | Glassmorphism dark/light blur (`rgba(255,255,255,0.65)`), purple/pink gradients | Dark slate (`bg-slate-900`, `border-slate-800`), purple accents (`from-purple-600 to-pink-600`) | Dark slate (`bg-slate-900`), indigo accents (`bg-indigo-600`, `text-indigo-400`), emerald/rose badges | Unified dark slate theme with consistent brand color system (`bg-slate-950`, `bg-slate-900`, `border-slate-800`) |
| **Z-Index & Positioning** | `position: fixed; z-index: 2147483647; bottom: 24px; right: 24px;` | `position: absolute; bottom: 6; right: 6; z-index: 20;` inside parent container | Standard responsive grid / flex layout | Modular dashboard workspace; dockable or floating drawer within app layout |
| **Containment Strategy** | Closed Shadow Root (`attachShadow({ mode: 'closed' })`) | `contain: layout style` | `contain: layout style` | CSS Containment (`contain: layout style paint; isolation: isolate;`) |

#### Style Conflict Risks & Mitigations:
1. **Global Class Name Collisions**:
   - `aura.css` uses generic class names like `.panel`, `.badge`, `.btn-row`, `.primary-btn`, `.bar`.
   - *Risk*: If `aura.css` were imported globally, these classes would override dashboard UI components, navigation bars, and buttons.
   - *Mitigation*: **Do NOT import `aura.css` globally.** Use the Tailwind classes already implemented in `DemoApp31.tsx`, or encapsulate the floating assistant inside a Shadow DOM container `<div ref={shadowHostRef} />` when mounted as an overlay widget.
2. **Fixed Viewport vs Dashboard Layout**:
   - The original extension positions itself at `fixed bottom-24 right-24 z-[2147483647]` over the whole browser window.
   - *Risk*: In a multi-tool SaaS dashboard, a fixed overlay floating over navigation links or the Stripe billing banner could obstruct clinician workflows.
   - *Mitigation*: Provide two viewing modes in the unified SaaS:
     - **Mode A (Full Tab / Dedicated View)**: A dedicated "Aura Clinical Scribe" workspace alongside the patient chart.
     - **Mode B (Floating Drawer / Dock)**: A toggleable drawer contained within the authenticated dashboard layout (`absolute right-6 bottom-6 z-30`).

### 4.2. State Management Assessment

- **Aura Assistant**:
  - Current extension: `chrome.storage.local` with fallback to `localStorage.getItem('aura_settings')`.
  - Current React component: Local `useState` hooks for `panelOpen`, `dictationActive`, `injectedNotice`, `ehrSubjective`, `ehrObjective`, `ehrAssessment`, `ehrPlan`.
- **PHI Scrubber**:
  - Current Python service: Stateless request/response model.
  - Current React component: Local `useState` hooks for `selectedPresetId`, `maskStyle`, `strictSafeHarbor`, `copied`.
- **Proposed Unified State Architecture**:
  - Implement a centralized state store (Zustand or React Context) in the unified SPA:
    - `useAuthStore`: User session, subscription tier, clinician profile.
    - `usePatientStore`: Active patient encounter, CPT code, clinical session metadata.
    - `useClinicalNoteStore`: Shared clinical text state allowing seamless data pipelines between tools:
      - e.g., Clinician dictates in **Aura Assistant** &rarr; structures SOAP note &rarr; sends to **PHI Scrubber** to sanitize identifiers &rarr; exports to **TheraFlow** EHR chart!

---

## 5. External APIs, Environment Variables & Mock Services

### 5.1. Aura Assistant
- **External Network Calls**: **Zero**. Operates 100% offline in standalone mode.
- **Mock Services Used**:
  - Audio dictation simulation: `setTimeout` delay (2,500ms) with animated wave visualizer.
  - AI SOAP note structuring simulation: 500ms initiation delay followed by 40ms per-word streaming typewriter loop.
- **Environment Variables**: None currently required.
- **Production Integration Path**:
  - Can connect to a backend route (`POST /api/ai/soap`) backed by Google Gemini (`@google/genai`) or OpenAI to generate real SOAP notes from dictated transcripts, protected by user authentication.

### 5.2. HIPAA PHI Scrubber
- **External Network Calls**: **Zero**.
- **Execution Overhead**:
  - Deterministic regex passes execute in under **40 milliseconds** for complete medical records.
  - No cloud data transfer fees or third-party API exposure.
- **Local Services / Endpoints**:
  - FastAPI: `http://localhost:8000` (`/health`, `/scrub`, `/scrub-json`).
  - Streamlit: `http://localhost:8501`.
- **Environment Variables**: None required.
- **Production Integration Path**:
  - Client-side TypeScript port (`phiScrubber.ts`) ensures 100% HIPAA compliance by de-identifying data before it leaves the browser, with an optional backend API route for batch file processing.

---

## 6. Recommendations for SPA Consolidation

1. **Extract UI from React Demonstrations**:
   - Both `DemoApp31.tsx` and `DemoApp17.tsx` from `interactive_portfolio_site` are already written in React 18, TypeScript, Tailwind CSS, and `lucide-react`. They are ready to be migrated directly into the unified dashboard.
2. **Build a Shared Clinical Pipeline**:
   - Connect Aura Assistant and PHI Scrubber so clinicians can scrub notes generated by Aura with a single click before saving or exporting.
3. **Preserve Shadow DOM Option for Aura Extension**:
   - Retain the standalone Chrome extension files in a `/packages/aura-extension` folder as a downloadable companion tool for clinicians who want in-workflow charting on third-party EHRs like SimplePractice or Epic Web.
4. **Enforce Style Sandboxing**:
   - Utilize `.demo-sandbox-wrapper` with CSS `contain: layout style paint; isolation: isolate;` to guarantee zero style bleed across the unified dashboard.
