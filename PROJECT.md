# Project: Clinical Telehealth & AI Scribe SaaS Platform

## Architecture
- **Framework**: Vite 6 + React 19 + TypeScript Single Page Application (SPA).
- **Styling**: Tailwind CSS v4 with scoped containment (`@tailwindcss/vite`).
  - Core Shell & TheraFlow: Tailwind CSS v4 design system.
  - Clinical AI Scribe v2: Scoped `.heidi-scribe-theme` namespace container (zero global overflow locks or un-scoped `.btn` selectors).
  - Aura Assistant: Scoped Web Components / Shadow DOM encapsulation for floating overlay and glassmorphism panel.
  - HIPAA PHI Scrubber: Tailwind CSS v4 responsive dual-pane layout with entity tags.
- **Backend**: Express API server (`server.ts`) for Stripe checkout endpoints and production SPA hosting.
- **Authentication**: Dual-Engine Resilient Authentication (`lib/auth.tsx`).
  - Production: Supabase Auth (`@supabase/supabase-js`) with JWT session persistence.
  - Deterministic Sandbox / CI Mode: Integrated Demo Clinician Provider (`Dr. Sarah Chen, MD`) with one-click test authentication.
- **Stripe Subscription Billing**: 3-Tier Subscription Engine (Starter $49/mo, Clinician Pro $99/mo, Practice Group $249/mo).
  - Backend `POST /api/create-checkout-session` using Stripe test keys (`sk_test_...` or simulated test mode).
  - Client `<SubscriptionGate>` and `<RequireSubscription>` route guards restricting clinical tools until subscribed.
- **Data Flow & Central State**:
  - `AuthContext`: Clinician identity, authentication status, practice metadata.
  - `SubscriptionContext`: Subscription tier, billing cycle, active status, checkout triggers.
  - `ClinicalContext`: Shared patient context (Jane Doe, AMFT session notes, active encounter) connecting EHR, Scribe, Aura, and PHI Scrubber.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Greenfield Build Scaffold | Vite 6 + React 19 + TypeScript + Tailwind v4 + Express server scaffold | M1 | ORIGINAL_REQUEST §R3 |
| 2 | Dual-Engine Authentication | Supabase Auth + Deterministic Demo Clinician login with persistent session | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Unified Command Center Layout | AppLayout with Sidebar, Header, Active Patient Selector, and tool status | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Authentication Route Guard | `<ProtectedRoute>` blocking unauthenticated access and redirecting to /login | M1 | ORIGINAL_REQUEST §AC2 |
| 5 | Stripe Checkout API Endpoint | `POST /api/create-checkout-session` with Stripe test keys & test simulation | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Commercial Pricing & Plan UI | Pricing page & modal with Starter ($49), Clinician Pro ($99), Group ($249) | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Subscription Access Gating | `<SubscriptionGate>` blocking clinical apps until subscribed + test bypass | M2 | ORIGINAL_REQUEST §R2 |
| 8 | TheraFlow Client & Patient Roster | Client list, profiles, contact info, clinical case details, search/filter | M3 | ORIGINAL_REQUEST §R3 |
| 9 | TheraFlow Appointment Calendar | Interactive calendar (`react-big-calendar`) with booking & appointment modal | M3 | ORIGINAL_REQUEST §R3 |
| 10 | TheraFlow DAP Notes & Treatment Plans | Clinical documentation with DAP progress notes and treatment plan builder | M3 | ORIGINAL_REQUEST §R3 |
| 11 | TheraFlow Invoicing & Superbills | Client invoicing, session payments, and CMS-1500 Superbill generator | M3 | ORIGINAL_REQUEST §R3 |
| 12 | TheraFlow Telehealth & Audit Logs | Telehealth WebRTC room simulation and HIPAA immutable audit log viewer | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Scribe Ambient Diarization Feed | Dual-speaker real-time acoustic transcription & waveform visualizer | M4 | ORIGINAL_REQUEST §R3 |
| 14 | Scribe Multi-Template Notes | 6 standard clinical templates (SOAP, Referral, Aftercare, H&P, Specialty, Requisition) | M4 | ORIGINAL_REQUEST §R3 |
| 15 | Scribe Template Studio | Interactive custom clinical note template builder | M4 | ORIGINAL_REQUEST §R3 |
| 16 | Scribe Billing & Coding Assistant | Real-time CPT & ICD-10 diagnostic coding reconciler | M4 | ORIGINAL_REQUEST §R3 |
| 17 | Scribe Multi-EHR Export Adapters | Formatted export for Epic, Cerner, Athena, and formatted text clipboard | M4 | ORIGINAL_REQUEST §R3 |
| 18 | Scribe CSS Namespace Isolation | Containment under `.heidi-scribe-theme` eliminating global CSS bleed | M4 | ORIGINAL_REQUEST §AC4 |
| 19 | Aura Assistant Workspace & Studio | Fullscreen clinical decision support and interactive SOAP builder | M5 | ORIGINAL_REQUEST §R3 |
| 20 | Aura Floating Action Orb | Global toggleable floating overlay accessible across any EHR screen | M5 | ORIGINAL_REQUEST §R3 |
| 21 | Aura Dictation & Typewriter SOAP | Simulated audio visualizer, quick snippet chips, typewriter SOAP generator | M5 | ORIGINAL_REQUEST §R3 |
| 22 | Aura Shadow DOM CSS Isolation | Encapsulation of `aura.css` inside Shadow Root or scoped container | M5 | ORIGINAL_REQUEST §AC4 |
| 23 | PHI Scrubber 18 Safe Harbor Engine | TypeScript port of 18 statutory HIPAA Safe Harbor regexes & identifiers | M5 | ORIGINAL_REQUEST §R3 |
| 24 | PHI Scrubber Side-by-Side Diff | Synchronized dual-pane view with entity tags, masking styles (tag/block/asterisk) | M5 | ORIGINAL_REQUEST §R3 |
| 25 | PHI Scrubber Forensic Audit Table | Entity taxonomy table with confidence scores, offsets, and JSON export | M5 | ORIGINAL_REQUEST §R3 |
| 26 | Cross-Tool Clinical Pipeline | Unified pipeline sending Aura/Scribe output directly into PHI Scrubber & EHR | M5 | ORIGINAL_REQUEST §R3 |
| 27 | E2E Tier 1 Feature Coverage Tests | Automated tests verifying every feature in isolation across all 4 apps | M6 | ORIGINAL_REQUEST §AC |
| 28 | E2E Tier 2 Boundary & Corner Tests | Boundary and negative tests (unauthenticated blocking, invalid Stripe keys, etc.) | M6 | ORIGINAL_REQUEST §AC2,3 |
| 29 | E2E Tier 3 Cross-Feature Integration | Tests for auth + subscription + EHR + Scribe + Aura + PHI scrubber interaction | M6 | ORIGINAL_REQUEST §AC |
| 30 | E2E Tier 4 Real-World Clinical Workloads | End-to-end clinical encounter workflows from intake to de-identified export | M6 | ORIGINAL_REQUEST §AC |
| 31 | Tier 5 Adversarial Coverage Hardening | White-box stress-testing, edge-case probing, and verification audit | M6 | ORIGINAL_REQUEST §AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & Auth Shell | Vite 6 + React 19 + Tailwind v4 setup, Express server.ts, AppLayout, Dual-engine Auth, ProtectedRoute | none | DONE |
| M2 | Stripe Subscription Billing | Stripe checkout endpoint, Pricing UI, SubscriptionContext, SubscriptionGate | M1 | DONE |
| M3 | TheraFlow EHR & Telehealth | Clients roster, Calendar, DAP Notes, Invoicing & Superbills, Audit Logs | M1 | DONE |
| M4 | Clinical AI Scribe v2 Integration | Diarization feed, 6 templates, Template Studio, ICD-10/CPT coding, Export adapters, Scoped CSS | M1, M2, M3 | DONE |
| M5 | Aura Assistant & HIPAA PHI Scrubber | Aura Studio & Floating Orb (Shadow DOM), PHI Scrubber (18 rules, diff, audit table), Cross-tool pipeline | M1 | DONE |
| M6 | Final Milestone: E2E Tests Pass & Hardening | Phase 1: Pass 100% of E2E test suite (Tiers 1-4). Phase 2: Adversarial hardening (Tier 5). | M1, M2, M3, M4, M5 | DONE |

## Interface Contracts
### Shell ↔ Auth & Subscription
- `useAuth()` provides `{ user, session, login, logout, isDemoClinician, loading }`
- `useSubscription()` provides `{ status, tier, planName, createCheckoutSession, startTrial, isSubscribed }`
- `<ProtectedRoute>` renders children if `user` is non-null; redirects to `/login?redirect=...` otherwise.
- `<SubscriptionGate>` renders children if `isSubscribed` is true; renders upgrade/trial modal otherwise.

### Shell ↔ Clinical Context
- `useClinicalContext()` provides:
  - `activePatient`: `{ id, name, dob, mrn, cptCode, encounterId }`
  - `activeEncounterNotes`: `{ subjective, objective, assessment, plan, rawTranscript }`
  - `updateNoteField(field, text)`
  - `sendToPhiScrubber(text)`
  - `insertToEhr(note)`

### Scribe / Aura ↔ PHI Scrubber
- `scrubText(input: string, options: ScrubOptions): ScrubResult`
  - `ScrubOptions`: `{ maskStyle: 'tag' | 'block' | 'asterisk', strictSafeHarbor: boolean }`
  - `ScrubResult`: `{ originalText, cleanText, itemsRedacted, categoriesTriggered, entities: Array<{ id, category, tag, originalValue, confidence, start, end }> }`

## Code Layout
```
clinical_saas_launch/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── server.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── App.tsx
│   ├── lib/
│   │   ├── auth.tsx
│   │   ├── subscription.tsx
│   │   ├── clinical-context.tsx
│   │   └── supabase.ts
│   ├── components/
│   │   ├── layout/ (AppLayout, Sidebar, Header)
│   │   ├── guards/ (ProtectedRoute, SubscriptionGate)
│   │   └── ui/ (Button, Card, Dialog, Badge, Tabs)
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Subscription.tsx
│   │   └── DashboardHome.tsx
│   └── tools/
│       ├── theraflow/ (Clients, Calendar, Notes, Billing, Superbill)
│       ├── scribe/ (ScribeWorkspace, DiarizeFeed, Templates, Coding, ExportModal, scribe-theme.css)
│       ├── aura/ (AuraStudio, AuraFloatingOrb, aura-shadow.css)
│       └── phi-scrubber/ (PhiScrubberView, safeHarborRules.ts, AuditTable)
├── scripts/
│   ├── verify-build.sh
│   ├── verify-auth-redirect.mjs
│   ├── verify-stripe-checkout.mjs
│   └── verify-css-bleed.mjs
└── tests/
    └── e2e/ (Tiers 1-4 automated test suites)
```
