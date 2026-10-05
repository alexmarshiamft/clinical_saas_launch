# Portfolio Survey & Technical Analysis Report
## Target Applications: TheraFlow & Clinical AI Scribe v2

**Author:** Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Date:** 2026-10-05  
**Mission:** Comprehensive survey, architectural audit, and integration analysis of **TheraFlow / Clinical OS** and **Clinical AI Scribe v2 (Heidi Clone / marshi-diarize)** to support merging into a unified, production-ready Clinical SaaS platform.

---

## Executive Summary

Both core target applications have been located, inspected, and verified via production builds:
1. **TheraFlow / Clinical OS** (`/Users/alexandermarshi/Downloads/theraflow`, staging at `/Users/alexandermarshi/Downloads/remix_-theraflow`):
   - Comprehensive Flagship Mental Health EHR and Telehealth platform built on **React 19**, **Vite 6**, **Tailwind CSS v4**, **Supabase**, **Express (`server.ts`)**, **AWS Chime WebRTC SDK**, and **Google Gemini 3.1 Pro**.
   - Features complete therapist and client-portal workflows: appointments, calendar, patient charting, DSM-5 / ICD-10 diagnostic coding, DAP progress notes with AI shorthand expansion, treatment plans, billing invoices, Superbill generation, and HIPAA audit trails.
2. **Clinical AI Scribe v2** (`/Users/alexandermarshi/Downloads/heidi-clone`, named `marshi-diarize` in `package.json`):
   - Advanced Ambient Clinical Consultation Scribe replicating Heidi Health workflows, built on **React 18.3.1**, **Vite 5.4**, custom design system, Web Audio acoustic diarization, Web Speech API, and Vercel serverless endpoints (`/api/diarize`, `/api/sessions`).
   - Features real-time 2-speaker diarization, continuous audio recording, 6 clinical note templates (SOAP, Referral Letter, Patient Summary, H&P, Specialty Note, Requisition), custom Template Studio, ICD-10 / CPT billing code reconciler, "Ask Marshi" AI Co-Pilot, HIPAA PII redactor, and multi-format EHR exports (Epic, Cerner, Athena, PDF, SRT, JSON).

Both applications currently build cleanly with exit code 0 (`npm run build`). When merging into a unified Next.js or Vite SPA with centralized authentication and Stripe billing, specific dependency versions (React 19 vs 18), styling paradigms (Tailwind v4 OKLCH vs bespoke CSS variables), and API proxy layers must be normalized.

---

## 1. Exact File Paths & Directory Structures

### 1.1. TheraFlow / Clinical OS

- **Canonical Repository Path:** `/Users/alexandermarshi/Downloads/theraflow`
- **Secondary / Staging Path:** `/Users/alexandermarshi/Downloads/remix_-theraflow`
- **Portfolio Reference:** App 02 in `app_portfolio_eval/APP_PORTFOLIO_EVALUATION.md` (lines 270–305), `verify_builds.sh` (line 107), `ROADMAP_COMPLETION_CHECKLIST.md` (lines 70–94).

#### Directory Hierarchy (`/Users/alexandermarshi/Downloads/theraflow`):
```text
/Users/alexandermarshi/Downloads/theraflow/
├── package.json                   # React 19, Tailwind v4, Chime SDK, Supabase, GenAI
├── vite.config.ts                 # Vite 6 config with @/ alias and GEMINI_API_KEY define
├── tsconfig.json                  # TypeScript 5.8 config
├── server.ts                      # Express API server (AWS Chime, Stripe Connect, health)
├── index.html                     # HTML entry point
├── components.json                # shadcn configuration
├── .env.example                   # Environment variable template
├── components/
│   ├── ErrorBoundary.tsx          # Global React error boundary
│   ├── Layout.tsx                 # Authenticated clinician sidebar layout & navigation
│   ├── SessionManager.tsx         # Inactivity timeout & auth session watcher
│   ├── SuperbillDialog.tsx        # CMS-1500 / Insurance reimbursement generator & print view
│   └── ui/                        # UI primitives (Base UI / Radix style)
│       ├── button.tsx, calendar.tsx, card.tsx, checkbox.tsx, dialog.tsx,
│       ├── dropdown-menu.tsx, input.tsx, label.tsx, select.tsx, sonner.tsx,
│       └── table.tsx, tabs.tsx, textarea.tsx
├── pages/                         # Core Clinician Application Views
│   ├── LandingPage.tsx            # Marketing landing page
│   ├── Login.tsx                  # Therapist & client authentication screen
│   ├── Dashboard.tsx              # Revenue metrics, appointment queues, pending notes
│   ├── Calendar.tsx               # React Big Calendar appointment scheduler
│   ├── Clients.tsx                # Patient roster, search, status filters
│   ├── ClientProfile.tsx          # Chart tabs: appointments, notes, treatment plans, forms
│   ├── NoteEditor.tsx             # DAP progress note editor with Gemini AI expansion
│   ├── TreatmentPlanEditor.tsx    # Problem, goal, objective, intervention documentation
│   ├── TelehealthSession.tsx      # AWS Chime WebRTC video room with tile grid & controls
│   ├── Billing.tsx                # Invoice ledger, status tracking, Superbill trigger
│   ├── Messages.tsx               # Realtime patient-therapist chat
│   ├── Tasks.tsx                  # Practice task checklist & reminders
│   ├── Settings.tsx               # Practice branding & account settings
│   ├── BrowserWorkspace.tsx       # HIPAA browser sandbox (SimplePractice, Availity, Lab)
│   └── portal/                    # Patient-Facing Portal
│       ├── PortalLayout.tsx       # Patient portal header & navigation
│       ├── PortalDashboard.tsx    # Patient welcome, upcoming visits, outstanding balances
│       ├── PortalAppointments.tsx # Patient appointment list & cancellation
│       ├── PortalScheduleAppointment.tsx # Patient self-scheduling interface
│       ├── PortalInvoices.tsx     # Client invoice view & payment trigger
│       ├── PortalForms.tsx        # Intake questionnaire & consent forms
│       └── PortalMessages.tsx     # Patient secure messaging
├── lib/
│   ├── audit.ts                   # HIPAA ePHI immutable audit log writer (`audit_logs`)
│   ├── auth.tsx                   # Supabase AuthProvider & `useAuth` hook
│   ├── gemini.ts                  # Google GenAI SDK client (`gemini-3.1-pro-preview`)
│   ├── supabase.ts                # Supabase browser client initialization
│   └── utils.ts                   # Class name merger (`clsx`, `twMerge`)
├── src/
│   ├── App.tsx                    # React Router 7 route definitions & ProtectedRoute guard
│   ├── main.tsx                   # Entry point mounting App
│   ├── index.css                  # Tailwind CSS v4 directives, @theme inline, OKLCH palette
│   └── data/
│       └── demo_seed.json         # Static fallback patient fixtures
├── supabase/                      # Database Schema Migrations & Seeders
│   ├── schema.sql                 # Core tables (profiles, clients, appointments, notes, invoices)
│   ├── advanced_schema.sql        # Client portal auth link, out_of_office, treatment_plans, intake
│   ├── messaging_tasks_schema.sql # Realtime messages & tasks
│   ├── telehealth_schema.sql      # Chime session references
│   ├── ehr_security_schema.sql    # Audit logs table & immutable HIPAA RLS
│   ├── rbac_schema.sql            # Clinician vs Client RBAC policies
│   └── demo_seed.sql              # SQL seeder for 10 realistic synthetic patients
├── scripts/
│   └── seed-demo.ts               # Turnkey Node/TS seeder script (`npm run seed:demo`)
├── docs/
│   └── HIPAA_SECURITY_ARCHITECTURE.md # Encryption in transit/rest, audit logging compliance
└── legal/
    ├── BAA_TEMPLATE.md            # HHS Business Associate Agreement template
    └── BAA_TEMPLATE.pdf           # Binary BAA contract asset
```

---

### 1.2. Clinical AI Scribe v2 (Heidi Clone / marshi-diarize)

- **Canonical Repository Path:** `/Users/alexandermarshi/Downloads/heidi-clone`
- **Package Name:** `marshi-diarize`
- **Portfolio Reference:** App 09 in `app_portfolio_eval/APP_PORTFOLIO_EVALUATION.md` (lines 512–537), `verify_builds.sh` (line 114), `ROADMAP_COMPLETION_CHECKLIST.md` (lines 259–283).

#### Directory Hierarchy (`/Users/alexandermarshi/Downloads/heidi-clone`):
```text
/Users/alexandermarshi/Downloads/heidi-clone/
├── package.json                   # React 18.3.1, Vite 5.4.11, canvas-confetti, lucide-react
├── vite.config.js                 # Vite configuration
├── vercel.json                    # Vercel serverless routing & API rewrites
├── index.html                     # HTML template with Google Fonts (Inter, Plus Jakarta Sans)
├── api/                           # Serverless Backend Handlers
│   ├── diarize.ts                 # AssemblyAI / Whisper diarization API handler
│   ├── diarize.js                 # Compiled / JavaScript handler variant
│   ├── sessions.js                # Cloud session storage (GET/POST /api/sessions)
│   └── health.js                  # Diagnostic health probe
├── src/
│   ├── App.jsx                    # Diarization workspace layout (Header, Timeline, Transcript)
│   ├── main.jsx                   # Entry point (ThemeProvider, DiarizeProvider, ScribeProvider)
│   ├── index.css                  # Custom design system (Dark/Light themes, --accent-yellow, .btn)
│   ├── context/
│   │   ├── DiarizeContext.jsx     # Live Web Audio engine, 2-speaker acoustic state, cloud sync
│   │   ├── ScribeContext.jsx      # Heidi clinical encounter state, note generation, co-pilot
│   │   └── ThemeContext.jsx       # Dark / Light theme toggle provider
│   ├── components/
│   │   ├── diarize/               # Diarization UI Components
│   │   │   ├── Header.jsx         # App header, recording toggle, speaker modes, language
│   │   │   ├── SpeakerTimeline.jsx# Multi-speaker visualizer & real-time pitch bar
│   │   │   ├── SpeakerManager.jsx # Speaker names, colors, talk-time meters, acoustic profiles
│   │   │   ├── DiarizedTranscript.jsx # Utterance feed, live speech preview, search, inline editing
│   │   │   ├── ExportBar.jsx      # Audio playback player & TXT/SRT/JSON download triggers
│   │   │   └── CloudModal.jsx     # Cloud session browser & loader
│   │   ├── sidebar/
│   │   │   └── Sidebar.jsx        # Clinician profile, patient card, nav (Scribe, Templates, Billing)
│   │   ├── notes/
│   │   │   ├── NoteEditor.jsx     # Markdown clinical note editor, formatting bar, copy confetti
│   │   │   ├── TemplateSelector.jsx # Template switcher tabs (SOAP, Referral, Summary, H&P, etc.)
│   │   │   ├── StyleControls.jsx  # Tone, length, perspective customization toggles
│   │   │   └── ExportModal.jsx    # EHR export (Epic, Cerner, Athena, Best Practice) & PDF
│   │   ├── askHeidi/
│   │   │   └── AskHeidiDrawer.jsx # "Ask Marshi" AI Co-Pilot chat drawer, clinical query chips
│   │   ├── billing/
│   │   │   └── BillingPanel.jsx   # ICD-10 search, CPT E/M complexity evaluator, note insertion
│   │   ├── templates/
│   │   │   └── TemplateStudio.jsx # Custom template creator & community template browser
│   │   ├── privacy/
│   │   │   └── PrivacySettingsModal.jsx # HIPAA PII masking toggle & consent log viewer
│   │   ├── header/
│   │   │   └── PatientModal.jsx   # Patient encounter demographics editor modal
│   │   ├── audio/
│   │   │   ├── AudioPlayer.jsx    # Audio playback widget
│   │   │   ├── AudioRecorder.jsx  # Low-level recorder widget
│   │   │   └── WaveformVisualizer.jsx # Canvas / audio waveform visualizer
│   │   ├── history/
│   │   │   └── ConsultationHistory.jsx # Past encounter history list
│   │   └── transcript/
│   │       └── TranscriptView.jsx # Alternative transcript view
│   ├── data/
│   │   ├── defaultTemplates.js    # Built-in note templates (SOAP, Referral, Aftercare, H&P, etc.)
│   │   ├── clinicalCases.js       # Pre-built realistic consultation cases (Cardio, Endo, Peds, Psych)
│   │   ├── icd10Codes.js          # ICD-10 diagnostic database & CPT E/M coding levels
│   │   └── specialtyOptions.js    # Medical specialties, languages, EHR export formats
│   └── utils/
│       ├── diarizationEngine.js   # Web Audio autocorrelation, pitch, spectral centroid clustering
│       ├── speechRecognition.js   # Web Speech API wrapper with auto-restart
│       ├── aiNoteGenerator.js     # NLP entity extractor & template compiler
│       ├── piiRedactor.js         # HIPAA PII regex scrubber & consent logger
│       └── pdfExport.js           # Printable HTML/PDF export with clinical letterhead
├── public/
│   └── samples/                   # Pre-recorded demonstration fixtures
│       ├── cardio_consultation.json
│       ├── psych_evaluation.json
│       └── manifest.json
└── docs/
    └── ARCHITECTURE.md            # Speaker diarization & Vercel serverless documentation
```

---

## 2. Technology Stacks & Dependency Comparison

### 2.1. Side-by-Side Dependency Audit

| Category | TheraFlow / Clinical OS | Clinical AI Scribe v2 | Merged SaaS Target & Compatibility Assessment |
| :--- | :--- | :--- | :--- |
| **Framework / React** | `react@^19.0.0`<br>`react-dom@^19.0.0` | `react@^18.3.1`<br>`react-dom@^18.3.1` | **Conflict:** Must upgrade Scribe components to React 19 or standardize on React 19. All Scribe components (`marshi-diarize`) use standard hooks (`useState`, `useEffect`, `useRef`, `useContext`) and render cleanly in React 19. |
| **Build Tool** | `vite@^6.2.0`<br>`@vitejs/plugin-react@^5.0.4` | `vite@^5.4.11`<br>`@vitejs/plugin-react@^4.3.4` | **Standardization:** Vite 6 with React plugin is already working and backward compatible. |
| **Language** | TypeScript (`tsconfig.json`, `~5.8.2`) | JavaScript / JSX (with some TS in `api/`) | **Unification:** Both can coexist in Vite, but converting Scribe components to `.tsx` or allowing `.jsx` in `tsconfig.json` provides strict type safety. |
| **Styling & CSS** | `@tailwindcss/vite@^4.1.14`<br>`tailwindcss@^4.1.14`<br>`tw-animate-css@^1.4.0`<br>OKLCH variables | Pure Vanilla CSS (`index.css`) with CSS custom properties (`--bg-app`, `--accent-yellow`) | **Style Bleed Risk:** `heidi-clone/src/index.css` overrides `html, body { height: 100%; overflow: hidden; }` and defines generic classes like `.btn`, `.btn-primary`. Must be namespace-scoped (e.g., `.marshi-scribe-scope`) or refactored into Tailwind classes. |
| **UI Components** | `@base-ui/react@^1.3.0`<br>`shadcn@^4.1.0` primitives | Custom bespoke React modals and cards | Clean separation: TheraFlow's shadcn/Base UI components can wrap or replace Scribe modals. |
| **Icons** | `lucide-react@^0.546.0` | `lucide-react@^0.468.0` | **Compatible:** Upgrade to `^0.546.0` (minor/patch differences only, same icon API). |
| **Audio & Telehealth** | `@aws-sdk/client-chime-sdk-meetings@^3.1015.0`<br>`amazon-chime-sdk-component-library-react@^3.12.0`<br>`amazon-chime-sdk-js@^3.30.0`<br>`@jitsi/react-sdk@^1.4.4` | Web Audio API (`AudioContext`, `BiquadFilter`)<br>`MediaRecorder`<br>Web Speech API | **Complementary:** TheraFlow manages remote 2-way WebRTC telehealth video calls. Scribe captures ambient microphone audio for local acoustic diarization. Can run concurrently during a telehealth session. |
| **AI SDKs** | `@google/genai@^1.29.0` (Gemini 3.1 Pro Preview) | Rule-based NLP entity extractor (`aiNoteGenerator.js`) + optional AssemblyAI / OpenAI Whisper backend | **Synergy:** Can pipe Scribe diarized transcripts directly into Gemini 3.1 Pro for note expansion, creating a superior ambient clinical workflow. |
| **Backend & Auth** | `@supabase/supabase-js@^2.100.0`<br>`express@^4.22.1`<br>`tsx@^4.21.0` | Vercel Serverless (`api/*.js`, `api/*.ts`)<br>`fetch('/api/...')` | **Integration:** Express backend in `server.ts` can mount `/api/diarize` and `/api/sessions` directly alongside existing `/api/telehealth` and `/api/billing` routes. |
| **Animation & UX** | `framer-motion@^12.38.0`<br>`motion@^12.23.24` | `canvas-confetti@^1.9.4` | Both compatible. |
| **Forms & Dates** | `react-hook-form@^7.72.0`<br>`zod@^4.3.6`<br>`date-fns@^4.1.0` | Standard controlled inputs | `date-fns` v4 is standard across the platform. |
| **Data Viz** | `recharts@^3.8.0`<br>`react-big-calendar@^1.19.4` | Custom SVG / CSS speaker timeline & audio bars | No conflicting charting packages. |

---

## 3. Comprehensive Feature Inventory

### 3.1. TheraFlow / Clinical OS

#### Screens & Route Map:
1. **Landing Page (`/`)**:
   - Marketing hero, feature showcases (Telehealth, AI Notes, Client Portal, Billing), pricing tiers ($59/mo solo, $149/mo group), and call-to-action buttons redirecting to `/login`.
2. **Authentication (`/login`)**:
   - Split therapist / client login tabs. Supports Supabase email/password auth, role detection, and session resumption.
3. **Dashboard (`/dashboard`)**:
   - High-level KPIs: Active Clients count, Monthly Revenue ($), Outstanding Invoices ($).
   - Interactive Recharts Revenue Area Chart (last 7 days).
   - "Today's Schedule" widget with one-click "Join Video" button for telehealth appointments.
   - "Pending Documentation" widget highlighting completed sessions lacking signed progress notes.
4. **Calendar (`/dashboard/calendar`)**:
   - Month, Week, Day, and Agenda views powered by `react-big-calendar`.
   - Appointment scheduling modal: client selector, session date/time, CPT session code (e.g. `90837 - 60 Min Individual`, `90834 - 45 Min Individual`), location (In-Person vs Telehealth), out-of-office block creation.
   - Direct link to launch Telehealth room or generate progress note from any calendar slot.
5. **Clients Roster (`/dashboard/clients`)**:
   - Searchable, filterable client list (Active, Inactive, Discharged).
   - Patient summary cards showing contact info, next scheduled visit, outstanding balance, and assigned ICD-10 diagnosis.
   - "Add New Client" modal collecting demographics, emergency contacts, and portal invitation links.
6. **Client Profile & Charting (`/dashboard/clients/:id`)**:
   - Comprehensive chart with 4 tabs:
     - **Appointments**: Historical encounter log with attendance status.
     - **Progress Notes**: Longitudinal list of DAP notes, signed status, date of service, and direct editor link.
     - **Treatment Plans**: Active vs archived treatment plans with diagnosis, goals, objectives, and interventions.
     - **Intake Forms**: Completed and pending digital client intake forms.
   - Portal Access Link generator (associates client record with Supabase `auth.users`).
7. **Note Editor (`/dashboard/clients/:id/notes/:noteId`)**:
   - Structured DAP (Data, Assessment, Plan) clinical documentation interface.
   - **Gemini AI Shorthand Expander**: Modal dialog allowing clinicians to type raw shorthand notes; calls `generateDAPNote()` via `@google/genai` to automatically structure objective data, clinical assessment, and therapeutic plan.
   - "Sign & Lock" workflow: sets `is_locked = true` to render notes immutable for HIPAA compliance.
   - Immutable audit logging on save and view.
8. **Treatment Plan Editor (`/dashboard/clients/:id/treatment-plans/:planId`)**:
   - Clinical diagnosis code selector (DSM-5 / ICD-10), overarching goals, behavioral objectives, and evidence-based interventions.
9. **Telehealth Session (`/telehealth/:id`)**:
   - Full-screen WebRTC video room powered by AWS Chime SDK (`MeetingProvider`, `VideoTileGrid`, `ControlBar`, `AudioInputControl`, `VideoInputControl`).
   - Graceful fallback: simulated connection mode for sandbox evaluation if AWS credentials are not configured.
   - Encrypted session logging in `audit_logs`.
10. **Billing & Invoicing (`/dashboard/billing`)**:
    - Revenue summary cards: Total Invoices, Outstanding Unpaid, Total Collected.
    - Invoice management table: Client, Amount, Status (Paid, Unpaid, Void), Due Date.
    - Status updater and one-click Superbill generator.
11. **Superbill Dialog (`SuperbillDialog.tsx`)**:
    - Generates standardized insurance reimbursement statement.
    - CPT code, ICD-10 diagnosis code, Provider NPI, Provider Tax ID.
    - Dedicated `@media print` CSS stylesheet formatting printouts for patient insurance claims.
12. **Browser Workspace (`/dashboard/browser`)**:
    - HIPAA sandbox workspace for integrating with SimplePractice, Availity (eligibility verification), and outside lab portals with minimum necessary field enforcement.
13. **Messages (`/dashboard/messages`)**:
    - Real-time secure clinician-client messaging using Supabase Postgres CDC subscriptions (`supabase.channel`).
14. **Tasks (`/dashboard/tasks`)**:
    - Clinical task checklist (intake reviews, prescription refills, treatment plan renewals).
15. **Settings (`/dashboard/settings`)**:
    - Practice profile, NPI, license number, clinical specialty, and notifications.
16. **Patient Portal (`/portal/*`)**:
    - Dedicated patient-facing portal layout (`PortalLayout.tsx`).
    - `PortalDashboard`: Client view of upcoming sessions and unpaid invoices.
    - `PortalAppointments`: Client appointment history.
    - `PortalScheduleAppointment`: Client self-scheduling widget.
    - `PortalInvoices`: Client bill pay interface.
    - `PortalForms`: Patient intake questionnaires and consent forms.
    - `PortalMessages`: Patient secure messaging thread.

#### Data Models & Supabase Schemas:
- `therapist_profiles`: `id (UUID PK)`, `full_name`, `practice_name`, `created_at`
- `clients`: `id (UUID PK)`, `therapist_id (FK)`, `auth_user_id (FK)`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `diagnosis_code`, `status`
- `appointments`: `id (UUID PK)`, `therapist_id (FK)`, `client_id (FK)`, `start_time`, `end_time`, `session_type`, `status`
- `progress_notes`: `id (UUID PK)`, `therapist_id (FK)`, `client_id (FK)`, `appointment_id (FK)`, `date_of_service`, `d_text`, `a_text`, `p_text`, `is_locked`, `updated_at`
- `treatment_plans`: `id (UUID PK)`, `therapist_id (FK)`, `client_id (FK)`, `diagnosis`, `goals`, `objectives`, `interventions`, `status`
- `invoices`: `id (UUID PK)`, `therapist_id (FK)`, `client_id (FK)`, `amount`, `status`, `due_date`, `notes`
- `intake_forms`: `id (UUID PK)`, `therapist_id (FK)`, `client_id (FK)`, `form_data (JSONB)`, `status`
- `messages`: `id (UUID PK)`, `sender_id (FK)`, `receiver_id (FK)`, `content`, `is_read`
- `tasks`: `id (UUID PK)`, `therapist_id (FK)`, `title`, `description`, `due_date`, `is_completed`
- `audit_logs`: `id (UUID PK)`, `user_id (FK)`, `action`, `resource_type`, `resource_id`, `details (JSONB)`, `created_at` (immutable: no UPDATE or DELETE policies)

#### Mock Data & Demo Seeder:
- `scripts/seed-demo.ts` & `supabase/demo_seed.sql`: 10 fully populated synthetic patient records:
  1. *Elena Reyes* (35yo, F41.1 GAD, fee $175)
  2. *Marcus Chen* (37yo, F33.0 MDD Recurrent Mild, fee $200)
  3. *Sarah Jenkins* (31yo, F43.10 PTSD, SUD reduction EMDR, fee $220)
  4. *David O'Connor* (44yo, F43.23 Adjustment Disorder, fee $175)
  5. *Amina Patel* (29yo, F41.0 Panic Disorder, fee $190)
  6. *Carlos Mendez* (42yo, F34.1 Dysthymia, fee $180)
  7. *Chloe Dupont* (26yo, F50.00 Anorexia Nervosa, fee $210)
  8. *Jordan Taylor* (33yo, F90.2 ADHD Combined Type, fee $195)
  9. *Hannah Abbott* (39yo, F42.2 OCD Mixed, fee $205)
  10. *Robert Vance* (52yo, F10.20 Alcohol Use Disorder Mild In Remission, fee $175)
  - Complete with 20 past/future appointments, signed DAP notes, and invoices.

---

### 3.2. Clinical AI Scribe v2 (Heidi Clone / marshi-diarize)

#### Screens & Components:
1. **Diarized Scribe Header (`Header.jsx`)**:
   - Ambient recording trigger button with pulsating active state.
   - Mode switcher: **2-Speaker Auto Separation** vs **Single Speaker (Solo)**.
   - Multi-language dropdown (English, Spanish, French, German, Mandarin, Japanese, Portuguese, Arabic).
   - Navigation triggers for Template Studio, Cloud Sessions, Session Reset, and Dark/Light Theme toggle.
2. **Speaker Timeline & Audio Analyzer (`SpeakerTimeline.jsx`)**:
   - Visual audio frequency visualizer tracking incoming volume (RMS), voice pitch (Hz), and active speech.
   - Real-time multi-speaker turn visualization bar.
3. **Speaker Manager (`SpeakerManager.jsx`)**:
   - Acoustic profiles for Speaker 1 (Doctor) and Speaker 2 (Patient).
   - Dynamic talk-time meter, utterance count, and customizable speaker names/colors.
4. **2-Speaker Live Transcript (`DiarizedTranscript.jsx`)**:
   - Continuous live transcription feed with speaker avatars, timestamps, and confidence indicators.
   - Live interim speech preview before utterance finalization.
   - Inline text editing of transcripts.
   - Speaker swap button (one-click toggle between Speaker 1 and Speaker 2 for misattributed turns).
   - Search bar filtering utterances by keyword or speaker.
   - Manual utterance input bar.
5. **Note Editor (`NoteEditor.jsx`)**:
   - Two-pane workspace: Markdown editor on the right side of the transcript.
   - Header action toolbar: One-click "Copy Note" with celebratory `canvas-confetti` explosion.
   - One-click "Export PDF" formatted with clinic letterhead.
   - "Regenerate Note" button invoking `aiNoteGenerator.js`.
   - Rich-text markdown insertion helpers (Bold, Italic, Headings, Lists).
   - Word count and character count counters.
6. **Template Selector (`TemplateSelector.jsx`)**:
   - Switchable clinical documentation templates:
     - **SOAP Note**: Subjective, Objective, Assessment, Plan.
     - **Specialist Referral Letter**: Header, Reason for Referral, Clinical Summary, Findings, Interim Management.
     - **Patient After-Care Summary**: Jargon-free visit explanation, simple diagnosis, medication instructions, red flags.
     - **Comprehensive H&P**: Full 14-system Review of Systems, multi-system physical examination, prioritized problem list.
     - **Specialty-Specific Encounter**: Customized for Psychiatry (MSE/DAP), Cardiology, Pediatrics, or Orthopedics.
     - **Diagnostic & Pathology Order**: Structured lab and radiology requisitions with ICD-10 justification.
7. **Style Controls (`StyleControls.jsx`)**:
   - **Tone**: Clinical (objective medical), Concise (high-yield bulleted), Narrative (in-depth descriptive).
   - **Length**: Standard, Brief, Comprehensive.
   - **Perspective**: Third-person ("The clinician examined..."), First-person ("I evaluated...").
8. **Template Studio (`TemplateStudio.jsx`)**:
   - Interactive builder allowing clinicians to create custom note templates with user-defined sections and AI prompting instructions.
   - Community Template Browser with 5 pre-loaded specialty templates (Emergency Dept Rapid Triage, Psychiatric Evaluation & MSE, Pediatric Well-Child, Orthopedic ROM, Dermatology Biopsy).
9. **"Ask Marshi" AI Co-Pilot Drawer (`AskHeidiDrawer.jsx`)**:
   - Conversational clinical assistant drawer.
   - Pre-configured prompt chips: "Suggest ICD-10 & CPT billing codes", "Check drug interactions", "Draft specialist referral", "Generate Patient-Friendly Aftercare Instructions".
   - "Insert into Note" button: transfers AI suggestions directly into the active note editor.
10. **Medical Coding & Billing Panel (`BillingPanel.jsx`)**:
    - Embedded searchable ICD-10 database (Cardiovascular, Endocrine, ENT, Mental Health, Musculoskeletal, Respiratory).
    - CPT Evaluation & Management (E/M) level auditor:
      - CPT 99212 (Straightforward, Problem-focused)
      - CPT 99213 (Low Complexity MDM, 20–29 mins)
      - CPT 99214 (Moderate Complexity MDM, 30–39 mins)
      - CPT 99215 (High Complexity MDM, 40–54 mins)
    - "Insert Billing Block into Note" button: appends structured ICD-10 and CPT coding reconciliation block to the clinical note.
11. **Export Bar (`ExportBar.jsx`) & Export Modal (`ExportModal.jsx`)**:
    - Audio player widget for recorded audio review.
    - Download options: `.webm` raw audio, `.txt` transcript, `.srt` subtitle file, `.json` structured object.
    - Formatted EHR exports:
      - **Epic Hyperspace**: Formatted as `.MARSHI_ENCOUNTER_NOTE` SmartPhrase syntax.
      - **Cerner PowerChart**: Formatted with PowerChart section tags.
      - **Athenahealth**: Structured XML `<encounter_note>` format.
      - **Best Practice Premier**: Standardized Australian/UK clinical summary.
12. **HIPAA & Privacy Settings Modal (`PrivacySettingsModal.jsx`)**:
    - Live HIPAA PII Anonymizer toggle: masks patient names, MRNs, dates, phone numbers, emails, and SSNs.
    - Patient verbal consent recorder and audit log viewer.
13. **Patient Demographics Modal (`PatientModal.jsx`)**:
    - Modal editing patient name, age, gender, DOB, MRN, visit type, and vital signs.

#### Pre-Loaded Clinical Cases (`clinicalCases.js` & `public/samples/`):
- `case-cardio-01`: *Arthur Pendelton* (62yo male, CAD, exertional angina, nitroglycerin response)
- `case-endo-02`: *Elena Rostova* (54yo female, Type 2 Diabetes, diabetic peripheral neuropathy)
- `case-pediatrics-03`: *Liam O'Connor* (3yo male, acute otitis media, high fever, amoxicillin dosing)
- `case-psych-04`: *Marcus Vance* (38yo male, GAD-7: 16, PHQ-9: 14, panic disorder, escitalopram)

---

## 4. State Management, Styling Systems & Merge Conflicts

### 4.1. State Management Comparison

| Architecture Dimension | TheraFlow / Clinical OS | Clinical AI Scribe v2 | Merged State Design Recommendation |
| :--- | :--- | :--- | :--- |
| **Global State** | React Context (`AuthProvider`) + Supabase Realtime Channels | React Context (`DiarizeContext`, `ScribeContext`, `ThemeContext`) | **Centralized Context:** Keep `AuthContext` as the root boundary. Wrap the Scribe tool inside `DiarizeContext` and `ScribeContext` only on the Scribe route/modal. |
| **Data Fetching** | Direct Supabase SDK client (`supabase.from('...').select()`) | Browser `fetch()` to `/api/*` endpoints | Direct Supabase for database state; proxy serverless endpoints through unified backend. |
| **Local State** | React standard `useState`, `useEffect`, controlled forms | React `useState`, `useRef` for audio engines and timers | Compatible: no Redux or complex external state engines to clash. |

### 4.2. Styling Systems & Potential Bleed

#### TheraFlow's Styling Architecture:
- Uses **Tailwind CSS v4** (`@tailwindcss/vite`, `@import "tailwindcss";`, `@theme inline`).
- Color space uses modern **OKLCH**:
  ```css
  --primary: oklch(0.205 0 0);
  --background: oklch(1 0 0);
  --card: oklch(1 0 0);
  --border: oklch(0.922 0 0);
  ```
- Uses `shadcn/tailwind.css` classes (`border-border`, `bg-background`, `text-foreground`).
- Component library: Base UI primitives styled via utility classes (`bg-blue-50 text-blue-700`).

#### Clinical AI Scribe v2's Styling Architecture:
- Pure CSS with custom design tokens in `src/index.css`:
  ```css
  --bg-app: #0c0e11;
  --bg-surface: #14171c;
  --accent-yellow: #ffe17d;
  --accent-teal: #14b8a6;
  --text-primary: #f3f4f6;
  ```
- **Dangerous Global Selectors in `heidi-clone/src/index.css`:**
  - `html, body { height: 100%; width: 100%; overflow: hidden; }` — If imported globally, this will lock scrolling across the entire TheraFlow dashboard!
  - `* { box-sizing: border-box; margin: 0; padding: 0; }` — Resets margin/padding globally.
  - `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` — Class names will collide with any buttons using standard CSS class names.
  - `#root { height: 100%; display: flex; flex-direction: column; }` — Enforces full-height flex column layout on the root element.

#### Resolution Strategy for Safe Merging:
1. **CSS Namespacing:** Scope the entire Scribe stylesheet under a dedicated parent container:
   ```css
   .clinical-scribe-container {
     /* All Marshi Scribe tokens and rules scoped here */
   }
   ```
2. **Remove Root Lock:** Eliminate `html, body` overflow and height constraints from the Scribe stylesheet.
3. **Prefix Utility Classes:** Rename `.btn` to `.scribe-btn`, `.badge` to `.scribe-badge`, or replace them with TheraFlow's existing Tailwind `<Button variant="default">` and `<Badge>` primitives.

---

## 5. External APIs, Environment Variables & Mock Services

### 5.1. TheraFlow / Clinical OS

| Variable / Service | Purpose | Mock / Graceful Fallback Present? |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini 3.1 Pro Preview API for DAP progress note expansion (`lib/gemini.ts`) | Fails with explicit toast if key is missing. |
| `VITE_SUPABASE_URL` | Supabase project URL (`lib/supabase.ts`) | Defaults to `https://placeholder.supabase.co`. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key | Defaults to `'placeholder'`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase backend admin key (`server.ts`) | Validated on startup; server logs warning and starts anyway. |
| `AWS_ACCESS_KEY_ID` | Amazon Chime SDK meetings client (`server.ts`) | **Yes:** Returns simulated meeting ID and attendee session for testing without AWS keys. |
| `AWS_SECRET_ACCESS_KEY` | Amazon Chime SDK secret key | **Yes:** Handled via simulated meeting fallback. |
| `AWS_REGION` | AWS Chime region (default `us-east-1`) | Defaults to `us-east-1`. |
| `STRIPE_SECRET_KEY` | Stripe Connect onboarding & client invoice checkout | **Yes:** Simulates Stripe Connect URLs and checkout sessions (`cs_simulated_...`) if unset. |
| `APP_URL` | Base URL for OAuth callbacks and redirects | Defaults to `http://localhost:${PORT}`. |
| `PORT` | Node/Express backend port | Defaults to `3000`. |

### 5.2. Clinical AI Scribe v2

| Variable / Service | Purpose | Mock / Graceful Fallback Present? |
| :--- | :--- | :--- |
| `ASSEMBLYAI_API_KEY` | AssemblyAI speaker-diarized audio transcription API (`api/diarize.ts`) | **Yes:** Generates simulated speaker-labeled transcript if unconfigured. |
| `OPENAI_API_KEY` | OpenAI Whisper speech-to-text API fallback | **Yes:** Falls back to Web Speech API or simulated responses. |
| `GROQ_API_KEY` | Groq high-speed Whisper fallback | **Yes:** Optional fallback in `api/diarize.ts`. |
| Web Audio API (`AudioContext`) | In-browser real-time pitch, spectral centroid, and voice activity detection | Pure client-side; zero external API dependencies. |
| Web Speech API (`webkitSpeechRecognition`) | In-browser continuous live speech transcription | Client-side; requires Chrome/Edge/Safari browser support. |
| `api/sessions.js` | Cloud session save/restore endpoint | In-memory / JSON file backend storage. |

---

## 6. Synthesis & Unified SaaS Integration Plan

### 6.1. Architectural Fit
The two applications fit together naturally into an integrated clinical operating system:
1. **TheraFlow** provides the outer **EHR & Telehealth Operating System**:
   - Secure Authentication (Supabase Auth).
   - Unified Clinician Dashboard with Revenue and Schedule tracking.
   - Patient Charting, Scheduling, Invoicing, and Client Portal.
   - Built-in HIPAA Audit Logging (`audit_logs`) and BAA documentation.
2. **Clinical AI Scribe v2** provides the core **AI Consultation Scribing Engine**:
   - Live ambient 2-speaker acoustic diarization during in-person or telehealth visits.
   - Structured multi-template clinical documentation (SOAP, Referral, Aftercare Summary).
   - Real-time "Ask Marshi" clinical assistant and billing code auditor (ICD-10 / CPT).
   - Multi-format EHR export (Epic, Cerner, Athena).

### 6.2. Concrete Integration Roadmap
1. **Unified Routing:**
   - Mount Clinical AI Scribe directly within TheraFlow's protected layout at `/dashboard/scribe` (or as a slide-out assistant during `/telehealth/:id` visits).
   - Add "AI Scribe" to the clinician sidebar navigation in `components/Layout.tsx`.
2. **Centralize Data Flow:**
   - When launching the Scribe from a client's profile (`/dashboard/clients/:id`), pass the client's demographics (`name`, `dob`, `mrn`, `diagnosis_code`) into the Scribe context.
   - When the clinician clicks "Save Note" in the Scribe, write the generated note directly to TheraFlow's `progress_notes` table in Supabase, logging the action in `audit_logs`.
3. **API Consolidation:**
   - Move `heidi-clone/api/diarize.ts` and `heidi-clone/api/sessions.js` into TheraFlow's `server.ts` Express backend under `/api/scribe/diarize` and `/api/scribe/sessions`.
4. **CSS Isolation:**
   - Wrap Scribe styles inside a scoped wrapper or migrate its UI controls to TheraFlow's Tailwind v4 / Base UI design system to prevent styling conflicts.
5. **Stripe Billing Integration:**
   - TheraFlow already has Stripe Connect billing endpoints in `server.ts`. To satisfy Requirement R2 of the original request, add a root subscription guard restricting access to both TheraFlow and Scribe until an active platform subscription is confirmed.
