# Architectural Survey & Requirement Analysis Report
**Target System**: Unified Clinical Telehealth & AI Scribe SaaS Platform  
**Working Directory**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch`  
**Date**: October 5, 2026  
**Author**: Explorer 3 (`teamwork_preview_explorer_survey_3`)  
**Mission**: Analyze requirements R1–R3, target environment, Stripe billing, auth architecture, CSS bleed prevention, and automated E2E verification strategy.

---

## Executive Summary

This investigation analyzed the requirements and architectural blueprint for unifying the **4 core applications** of the Clinical Telehealth & AI Scribe Ecosystem:
1. **TheraFlow / Clinical OS** (Practice Management & Telehealth EHR) — `/Users/alexandermarshi/Downloads/theraflow`
2. **Clinical AI Scribe v2** (`marshi-diarize` / Heidi clone) — `/Users/alexandermarshi/Downloads/heidi-clone`
3. **Aura Assistant** (Cross-EHR Floating Overlay / Clinical Decision Support) — `/Users/alexandermarshi/Documents/antigravity/aura-extension`
4. **HIPAA PHI Scrubber** (18-Safe Harbor Identifier De-identification Engine) — `/Users/alexandermarshi/phi_scrubber`

The target directory `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch` is currently a **greenfield workspace** (only `.agents/` and `ORIGINAL_REQUEST.md` exist; no prior git repository or starter code).

To achieve **100% clean builds (`npm run build`)** and **zero CSS bleed**, we recommend building a **unified Vite 6 + React 19 Single Page Application (SPA)** with TypeScript and Tailwind CSS v4, supplemented by a lightweight Node/Express server for Stripe checkout API endpoints, scoped CSS Modules/container namespaces for the Heidi Scribe dark theme, and Shadow DOM / scoped encapsulation for Aura Assistant.

---

## 1. Target Environment Inspection

### 1.1 Directory Status
- **Path**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch`
- **Existing Files**:
  - `.agents/` (teamwork metadata directory)
  - `ORIGINAL_REQUEST.md` (authoritative specification, 2072 bytes)
- **Git Repository**: None initialized yet (`.git` absent).
- **Node/Package Environment**: No `package.json`, `node_modules`, or starter configuration currently present.
- **Verdict**: Clean-slate greenfield environment. Full architectural freedom to establish optimal dependencies, directory structure, and tooling.

---

## 2. Source Applications & Asset Inventory

| App # | Name | Canonical Source Path | Primary Stack | Key Styling Architecture |
|---|---|---|---|---|
| 1 | **TheraFlow EHR** | `/Users/alexandermarshi/Downloads/theraflow` | React 19, Vite 6, TypeScript, Supabase JS, Lucide | Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI |
| 2 | **Clinical AI Scribe v2** | `/Users/alexandermarshi/Downloads/heidi-clone` | React 18/19, Vite, Lucide, Canvas Confetti | Custom global CSS (`index.css`), dark theme `:root` vars, generic `.btn`, `.badge` |
| 3 | **Aura Assistant** | `/Users/alexandermarshi/Documents/antigravity/aura-extension` | Vanilla JS / MV3 Extension, Web Audio | Closed Shadow DOM, `aura.css` glassmorphism, floating orb & panel |
| 4 | **HIPAA PHI Scrubber** | `/Users/alexandermarshi/phi_scrubber` | Python 3 / FastAPI REST microservice | Regex engine detecting all 18 HIPAA Safe Harbor identifiers |

---

## 3. Requirement R1: Unified Authentication & Dashboard

### 3.1 Authentication Architecture Recommendation: Dual-Engine Resilient Auth
The platform requires production-ready security combined with zero-friction onboarding and deterministic E2E testability.

1. **Production Engine: Supabase Auth (`@supabase/supabase-js`)**
   - Already integrated in TheraFlow (`@/lib/auth.tsx`, `@/lib/supabase.ts`).
   - Supports email/password, magic links, session persistence in `localStorage`, and Row Level Security (RLS).
   - Manages user sessions, JWT tokens, and metadata (`practice_name`, `role`, `subscription_tier`).

2. **Deterministic Sandbox & Test Mode (Critical for CI & Automated Testing)**:
   - When environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are unconfigured or when running in offline/testing mode, the `AuthProvider` gracefully falls back to an integrated **Demo / Mock Auth Provider**.
   - Provides a prominent **"Quick Sign-In: Demo Clinician"** (`Dr. Sarah Chen, MD - Behavioral Health Specialist`) on `/login`.
   - Stores mock session credentials in `localStorage` under `clinical_saas_session`.
   - Guarantees automated E2E tests and CI pipelines can authenticate deterministically without requiring live Supabase cloud connectivity or hitting third-party rate limits.

### 3.2 Route Protection & Guard Hierarchy
Implement a hierarchical route protection system in React Router:
- **Level 1: Authentication Guard (`<RequireAuth>`)**:
  - Inspects `user` and `session` state.
  - If unauthenticated: redirects immediately to `/login?redirect=${encodeURIComponent(currentLocation)}` with an alert toast.
- **Level 2: Subscription Guard (`<RequireSubscription>`)**:
  - Inspects `user.subscriptionStatus` (`'active' | 'trialing' | 'none'`).
  - If unsubscribed: blocks access to core clinical tools and redirects to `/dashboard/subscription` (or triggers the interactive Stripe checkout modal).
- **Level 3: Role-Based Guard (`<RequireRole allowedRoles={['therapist', 'admin']}>`)**:
  - Gating between provider EHR workspace and client portal.

### 3.3 Unified Navigation & Dashboard Layout
A cohesive clinical command center (`AppLayout.tsx`) replacing standalone navigation bars:
- **Header**: Active Practice Name, Clinician Profile, Subscription Status Badge (`PRO CLINICIAN`), Global Patient Context Selector, and Audit Log indicator.
- **Sidebar**:
  - **Core Clinical Tools (The 4 Apps)**:
    - 🏥 **Clinical EHR & Telehealth** (`/dashboard/ehr`) — TheraFlow patient charts, scheduling, notes.
    - 🎙️ **Clinical AI Scribe v2** (`/dashboard/scribe`) — Multi-speaker diarization, real-time consultation recording, automated SOAP notes.
    - ⚡ **Aura Assistant** (`/dashboard/aura`) — In-workflow clinical decision support, DSM-5 criteria, snippet expansion.
    - 🛡️ **HIPAA PHI Scrubber** (`/dashboard/phi-scrubber`) — Real-time 18-identifier redaction, compliance certification.
  - **Practice Operations**:
    - 📅 **Calendar & Sessions** (`/dashboard/calendar`)
    - 👥 **Client Roster** (`/dashboard/clients`)
    - 💳 **Billing & Subscription** (`/dashboard/subscription`)
    - ⚙️ **Settings & Security** (`/dashboard/settings`)
- **Global Aura Floating Orb**: Clinicians can toggle the floating Aura Assistant overlay across *any* page in the EHR without navigating away from their active note or chart!

---

## 4. Requirement R2: Stripe Subscription Billing

### 4.1 Plan Tiers & Commercial Packaging
| Plan Tier | Price | Target Clinician | Entitlements & Features |
|---|---|---|---|
| **Starter** | $49 / month | Solo Therapists & Counselors | TheraFlow Core EHR, Patient Invoicing, Basic PHI Scrubber (up to 25 documents/mo). |
| **Clinician Pro** *(Flagship)* | $99 / month | Full-time Practitioners & Clinics | **All 4 Applications Unlocked**: Full EHR, Unlimited Clinical AI Scribe v2 with speaker diarization, Aura Assistant in-workflow overlay, Unlimited PHI Scrubber. |
| **Practice Group** | $249 / month | Multi-provider Group Practices | All 4 Tools + 5 Provider Seats, Multi-clinician billing, Priority BAA (Business Associate Agreement), Custom Clinical Note Templates. |

### 4.2 Stripe Integration Flow (Test Keys)
1. **Server-Side Checkout Session Creation Endpoint**:
   - `POST /api/create-checkout-session`
   - Accepts: `{ planId: 'pro', billingCycle: 'monthly', clinicianEmail: '...' }`
   - Uses `STRIPE_SECRET_KEY` (e.g., `sk_test_...`).
   - Calls Stripe REST API: `https://api.stripe.com/v1/checkout/sessions`.
   - Configures:
     - `mode: 'subscription'`
     - `payment_method_types: ['card']`
     - `line_items`: mapped to test price IDs or ad-hoc test price data.
     - `success_url`: `${origin}/dashboard/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`
     - `cancel_url`: `${origin}/dashboard/subscription?status=canceled`
2. **Graceful Test Fallback / Mock Engine**:
   - If `STRIPE_SECRET_KEY` is not provided or runs in offline CI sandbox, the endpoint generates a valid mock checkout response with `sessionId: 'cs_test_simulated_' + uuid` and returns a mock checkout confirmation page.
3. **Active Subscription Verification & Access Gating**:
   - `SubscriptionContext` maintains:
     - `status`: `'active' | 'trialing' | 'canceled' | 'none'`
     - `tier`: `'starter' | 'pro' | 'enterprise'`
     - `renewsOn`: ISO timestamp
   - **Gating Mechanism**:
     - When an unsubscribed user clicks on Clinical AI Scribe, Aura, or PHI Scrubber, a modal is displayed:
       *"Clinician Pro Subscription Required — Unlock Real-Time Audio Diarization, AI Scribing, and Full HIPAA De-Identification."*
     - Features an instant "Upgrade Now" action triggering Stripe Checkout.
     - Includes a "Start 14-Day Free Trial (Test Mode)" toggle to allow auditors and automated tests to verify full unlocked functionality.

---

## 5. Requirement R3: Production-Ready SPA Integration & CSS Bleed Prevention

### 5.1 Architecture Decision: Single Cohesive Vite 6 + React 19 SPA
- **Why Vite + React 19 over Next.js?**
  1. **Stack Synergy**: TheraFlow is already Vite 6 + React 19. Heidi-clone is Vite + React.
  2. **Browser APIs & WebRTC**: Telehealth (AWS Chime / Jitsi), Audio Recording (`MediaRecorder`), and Web Audio API are client-side only. Next.js SSR causes frequent hydration mismatch errors (`window is not defined`) and requires `'use client'` on every component.
  3. **Build Performance**: `vite build` bundles cleanly into a static, high-performance distribution in seconds without server build overhead.
  4. **Backend Synergy**: A single lightweight `server.ts` (Express + Vite middleware) handles API routes (`/api/create-checkout-session`) and serves the SPA in production.

### 5.2 CSS Bleed Prevention: The Critical Challenge & Solution
Our code inspection identified severe conflicting CSS rules across the source applications:

| Threat | Source Code Location | Conflicting Rule / Class | Impact on Merged Platform |
|---|---|---|---|
| **Global Body Reset** | `heidi-clone/src/index.css:84-93` | `html, body { background: #0c0e11; overflow: hidden; }` | Turns the entire SaaS app black; freezes scrolling on EHR patient charts and calendar! |
| **Universal Margin Reset** | `heidi-clone/src/index.css:78-82` | `* { margin: 0; padding: 0; }` | Strips padding and margin across all TheraFlow forms and tables. |
| **Button Class Collisions** | `heidi-clone/src/index.css:128-148` | `.btn`, `.btn-primary` | Clashes with shadcn / Tailwind UI button classes in TheraFlow. |
| **Fixed Viewport Overlay** | `aura-extension/aura.css:6-15` | `#aura-container { position: fixed; z-index: 2147483647; }` | High z-index floating overlay can trap focus or obscure modal dialogs. |
| **Root Variable Collision** | `heidi-clone/src/index.css:2-50` | `--bg-app`, `--text-primary`, `--border-subtle` | Corrupts Tailwind theme variable inheritance. |

### 5.3 Concrete CSS Bleed Elimination Strategy
We enforce a strict 4-part containment policy:

1. **Global Design System**:
   - Master shell and TheraFlow EHR use **Tailwind CSS v4** (`@tailwindcss/vite`) with clean `@theme` declarations.
2. **Scope Heidi-Clone Under Namespace Container**:
   - Rename/refactor `heidi-clone/src/index.css` to remove `html, body`, `*`, and `#root` selectors.
   - Enclose all Heidi styling under a scoped container selector: `.heidi-scribe-theme { ... }`.
   - All classes (`.btn`, `.badge`, `.card`) and custom CSS variables are restricted to children of `.heidi-scribe-theme`.
   - The Heidi Scribe view mounts within `<div className="heidi-scribe-theme h-full flex flex-col">`.
3. **Shadow DOM Encapsulation for Aura Assistant**:
   - Aura Assistant was explicitly designed for Shadow DOM (`aura.css` uses `:host`).
   - Mount the floating Aura widget inside a closed Shadow Root:
     ```tsx
     const hostRef = useRef<HTMLDivElement>(null);
     useEffect(() => {
       if (!hostRef.current || hostRef.current.shadowRoot) return;
       const shadow = hostRef.current.attachShadow({ mode: 'open' });
       // Append scoped aura.css and widget DOM
     }, []);
     ```
   - Zero styles can leak out into the host dashboard, and zero host EHR styles can alter Aura!
4. **Native Tailwind Implementation for PHI Scrubber**:
   - Rather than relying on Python-only or raw unstyled components, port the PHI Scrubber UI directly into a high-polish React component styled with Tailwind CSS v4.
   - Embed a fast, 100% client-side TypeScript implementation of the 18 Safe Harbor regex rules so text is de-identified in real time without server latency or data transmission risks.

---

## 6. Acceptance Criteria & E2E Verification Blueprint

### 6.1 Clean Build Verification (`npm run build`)
- **Target Command**: `npm run build` (executing `tsc --noEmit && vite build`).
- **Dependencies Alignment**:
  - `react`: `^19.0.0`
  - `react-dom`: `^19.0.0`
  - `react-router-dom`: `^7.0.0` or `^6.28.0`
  - `lucide-react`: `^0.468.0` / `^0.546.0`
  - `@tailwindcss/vite`: `^4.0.0`
  - `tailwindcss`: `^4.0.0`
- **Zero Type Errors**: Strict TypeScript checking across all merged components, props, and contexts.

### 6.2 Unauthenticated Route Blocking & Redirection
- **Automated Verification Script**: `scripts/verify-auth-redirect.mjs`
- **Assertion Protocol**:
  1. Launch preview/test server on port 3000.
  2. Simulate unauthenticated requests to protected endpoints:
     - `/dashboard`
     - `/dashboard/ehr`
     - `/dashboard/scribe`
     - `/dashboard/aura`
     - `/dashboard/phi-scrubber`
  3. Verify HTTP/browser redirection to `/login`.
  4. Verify redirect parameter preserved: `/login?redirect=...`.
  5. Verify that authenticated requests (holding token) successfully access the routes.

### 6.3 Stripe Checkout Initialization Verification (Test Keys)
- **Automated Verification Script**: `scripts/verify-stripe-checkout.mjs`
- **Assertion Protocol**:
  1. Send `POST /api/create-checkout-session` with valid plan configuration `{ planId: 'pro', clinicianEmail: 'test@clinical-saas.com' }`.
  2. Verify response status is `200 OK`.
  3. Validate JSON payload structure: contains `sessionId` (`cs_test_...`) and `url` (`https://checkout.stripe.com/...` or validated checkout simulator URL).
  4. Verify error handling: sending invalid planId returns HTTP `400 Bad Request`.

### 6.4 Zero CSS Bleed & Multi-App Rendering Audit
- **Automated Verification Script**: `scripts/verify-css-bleed.mjs` (Agent-as-Judge & DOM Inspector)
- **Assertion Protocol**:
  1. Render Dashboard layout and measure computed styles:
     - Verify `document.body` computed background is clean light-mode (`#f9fafb` / `#ffffff`) and `overflow-y` is not locked to `hidden`.
     - Verify TheraFlow buttons do not have Heidi's `--accent-yellow` or border radii applied.
  2. Switch to `/dashboard/scribe`:
     - Verify `.heidi-scribe-theme` contains dark mode palette without leaking to outer dashboard sidebar or header.
  3. Mount Aura Assistant:
     - Verify Shadow DOM host encapsulates `aura.css`.
  4. Mount PHI Scrubber:
     - Verify dual-pane text editor and 18-category pill badges render seamlessly.
  5. Confirm all 4 tools render within the authenticated frame with zero visual regressions.

---

## 7. Recommended Directory Structure for Implementation

```
clinical_saas_launch/
├── package.json                   # Unified dependencies (React 19, Vite, Tailwind 4, Lucide)
├── tsconfig.json                  # Clean TypeScript configuration
├── vite.config.ts                 # Vite bundler configuration
├── server.ts                      # Express API server (Stripe endpoints + Vite middleware)
├── .env.example                   # Environment configuration template
├── src/
│   ├── main.tsx                   # App entrypoint
│   ├── index.css                  # Global Tailwind CSS v4 root
│   ├── App.tsx                    # React Router configuration & route guards
│   ├── lib/
│   │   ├── auth.tsx               # Supabase + Demo Auth Provider & hooks
│   │   ├── subscription.tsx       # Stripe subscription state & gating logic
│   │   ├── clinical-context.tsx   # Shared patient/consultation state
│   │   └── supabase.ts            # Supabase client initialization
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx      # Unified clinical command center layout
│   │   │   ├── Sidebar.tsx        # Navigation with tool badges & tier indicators
│   │   │   └── Header.tsx         # Practice header & active patient selector
│   │   ├── guards/
│   │   │   ├── ProtectedRoute.tsx # Auth verification gate
│   │   │   └── SubscriptionGate.tsx # Feature access restriction modal
│   │   └── ui/                    # Shared UI primitives (Button, Card, Dialog, Badge)
│   ├── pages/
│   │   ├── Landing.tsx            # High-converting SaaS landing page
│   │   ├── Login.tsx              # Unified Login & Signup + Quick Demo button
│   │   ├── Subscription.tsx       # Pricing plans & Stripe checkout portal
│   │   └── DashboardHome.tsx      # Unified clinical operations overview
│   └── tools/                     # The 4 Core Integrated Clinical Applications
│       ├── theraflow/             # Tool 1: EHR & Telehealth Management
│       │   ├── Clients.tsx
│       │   ├── Calendar.tsx
│       │   ├── Notes.tsx
│       │   └── Billing.tsx
│       ├── scribe/                # Tool 2: Clinical AI Scribe v2 (Heidi clone)
│       │   ├── ScribeWorkspace.tsx # Scoped container (.heidi-scribe-theme)
│       │   ├── DiarizeFeed.tsx
│       │   ├── SpeakerManager.tsx
│       │   └── scribe.module.css  # Scoped non-bleeding styles
│       ├── aura/                  # Tool 3: Aura Clinical Assistant
│       │   ├── AuraStudio.tsx     # Fullscreen decision support tool
│       │   ├── AuraFloatingOrb.tsx# Shadow DOM encapsulated overlay
│       │   └── aura-shadow.css    # Encapsulated styles
│       └── phi-scrubber/          # Tool 4: HIPAA PHI Scrubber
│           ├── PhiScrubberView.tsx # Interactive dual-pane scrubber
│           ├── SafeHarborEngine.ts # 18 Safe Harbor TypeScript regex engine
│           └── RedactionAudit.tsx # Category pills & audit log export
└── scripts/
    ├── verify-build.sh            # Runs type check & build
    ├── verify-auth-redirect.mjs   # E2E auth route test
    ├── verify-stripe-checkout.mjs # Stripe test checkout verification
    └── verify-css-bleed.mjs       # CSS isolation & multi-app rendering test
```

---

## 8. Conclusion & Implementation Readiness

The analysis confirms that merging the 4 core applications into a unified, high-performance SaaS platform is completely feasible with clear, non-conflicting boundaries. By executing the prescribed:
1. **Dual-engine resilient authentication** (Supabase + local demo fallback),
2. **Stripe subscription gating** (Starter, Pro, Enterprise tiers with test key checkout),
3. **Strict CSS isolation** (Tailwind v4 shell + Scoped Heidi namespace + Shadow DOM Aura), and
4. **Automated verification scripts** across all 4 acceptance criteria,

the team can ensure a **100% build pass** and **zero CSS bleed** for immediate public launch.
