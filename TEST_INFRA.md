# Test Infrastructure Specification & E2E Testing Philosophy

## Overview
This document specifies the end-to-end (E2E) testing infrastructure, architectural philosophy, tier hierarchy, and execution guidelines for the **Clinical Telehealth & AI Scribe SaaS Platform**.

The testing framework is built following **Dual-Track & Opaque-Box principles** defined in `PROJECT.md` and derived directly from the authoritative requirements in `ORIGINAL_REQUEST.md`.

---

## 1. Testing Philosophy & Guiding Principles

### 1.1 Opaque-Box Verification
- Tests treat the platform as a black box, interacting through user-facing surfaces (rendered DOM, user events, route navigations) and public API endpoints (`/api/*`).
- Internal implementation details (private variables, unexported state) are never probed; only observable outputs, HTTP responses, and DOM mutations are validated.

### 1.2 Deterministic & Ephemeral Execution
- All tests are 100% self-contained and order-independent.
- Test suites instantiate an ephemeral Express server and isolated JSDOM browser contexts.
- LocalStorage and global DOM state are explicitly purged between test iterations to guarantee zero test cross-contamination.

### 1.3 Dual-Engine Support & Offline Resilience
- Tests evaluate both production live credential paths and deterministic sandbox / demo clinician modes (`Dr. Sarah Chen, MD`).
- The test harness runs offline without external dependencies on live Supabase or live Stripe accounts by asserting resilient simulated sandbox behaviors.

### 1.4 Expected Output Derivation
- Expected outcomes are strictly derived from specifications in `ORIGINAL_REQUEST.md` (§R1, §R2, §R3, §AC) and `PROJECT.md` (§Architecture, §Feature Inventory, §Interface Contracts).
- No facade or tautological tests: all assertions evaluate real clinical data structures, statutory HIPAA Safe Harbor compliance, and HTTP status codes.

---

## 2. Test Suite Architecture & 4-Tier Hierarchy

The test suite is structured into four distinct progressive tiers:

```
tests/e2e/
├── test-helpers.mjs           # Shared test fixtures, JSDOM bootstrap, and Express server manager
├── tier1-features.test.mjs    # Tier 1: Feature Coverage (>=5 tests per core feature across 7 apps/features)
├── tier2-boundaries.test.mjs  # Tier 2: Boundary & Corner Cases (negative testing, malformed inputs, attacks)
├── tier3-interactions.test.mjs# Tier 3: Cross-Feature Combinations & State Flow
├── tier4-scenarios.test.mjs   # Tier 4: Real-World Clinical Workload Journeys
└── run-all.mjs                # Unified orchestrator & test reporter
```

### Tier 1: Feature Coverage (35 Test Cases)
Verifies each feature independently against its contract specifications (minimum 5 test cases per feature across all 7 core platform features):
1. **Dual-Engine Authentication (5 tests)**:
   - Unauthenticated access detection
   - 1-Click Demo Clinician login (`Dr. Sarah Chen, MD`)
   - Session envelope integrity in `localStorage`
   - Offline fallback sign-in handling
   - Secure sign-out with credential purging
2. **Unified Command Center & Dashboard Layout (5 tests)**:
   - AppLayout navigation, header, sidebar, and HIPAA banner rendering
   - DashboardHome welcome card with clinician and practice identity
   - Active Patient Hero Card rendering Jane Doe with MRN and CPT code
   - Header patient switcher dropdown and context mutation
   - Today's appointment schedule table and status badges
3. **Stripe Subscription Billing Engine (5 tests)**:
   - `POST /api/create-checkout-session` for Starter tier ($49/mo)
   - `POST /api/create-checkout-session` for Clinician Pro tier ($99/mo)
   - `POST /api/create-checkout-session` for Practice Group tier ($249/mo)
   - Commercial Pricing UI tier catalog and billing cycle switcher (monthly vs annual 20% savings)
   - `GET /api/subscription/status` query and renewal timestamp formatting
4. **TheraFlow Clinical EHR & Telehealth (5 tests)**:
   - EhrWorkspace component mounting with Stethoscope badge
   - Active patient charting binding (`Jane Doe`, `#MC-88219`, CPT `90837`)
   - WebRTC Telehealth session status indicator ("Ready for Session")
   - DAP & SOAP clinical notes format display
   - Practice operations route aliases (`/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`)
5. **Clinical AI Scribe v2 Diarization Workspace (5 tests)**:
   - ScribeWorkspace mounting with animated acoustic pulse badge
   - Live dual-speaker acoustic transcript pane rendering
   - Generated SOAP note preview (Subjective, Assessment)
   - Specialty CPT code synchronization (CPT 90837)
   - Real-time clinical context updates reflecting in Scribe view
6. **Aura Assistant Studio & Clinical Copilot (5 tests)**:
   - AuraStudio mounting with Copilot Standby status
   - Diagnostic Differential Assistant binding to active patient
   - DSM-5 symptom marker monitoring guidance text
   - Quick launcher navigation from Header orb
   - Dynamic differential target updates on patient change
7. **HIPAA PHI Scrubber 18 Safe Harbor Engine (5 tests)**:
   - PhiScrubberView mounting with 18 Safe Harbor Active badge
   - Protected ePHI identification in Unredacted Clinical Source pane
   - Patient name masking with `[NAME]` tag
   - Patient date of birth masking with `[DATE]` tag
   - Patient telephone number masking with `[PHONE]` tag

### Tier 2: Boundary & Corner Cases (16 Test Cases)
Probes limits, negative inputs, boundary conditions, and adversarial vectors:
- **T2.1**: Unauthenticated route guard blocking across complete route tree (`/dashboard`, `/dashboard/ehr`, `/dashboard/scribe`, `/dashboard/aura`, `/dashboard/phi-scrubber`, `/dashboard/billing`, `/dashboard/clients`, `/dashboard/calendar`, `/dashboard/settings`)
- **T2.2**: Invalid Stripe plan ID string (`POST /api/create-checkout-session` with unknown plan) returns 400 Bad Request
- **T2.3**: Numeric plan ID type mismatch returns 400
- **T2.4**: Empty string planId safely defaults to Pro tier
- **T2.5 - T2.8**: Prototype pollution probing (`__proto__`, `constructor`, `toString`, `valueOf`) survives without prototype tampering
- **T2.9**: Malformed JSON syntax in HTTP request body rejected cleanly with 400 without crashing server
- **T2.10**: Body size limit enforcement (500KB payload returns 413 Payload Too Large)
- **T2.11**: Corrupted / non-JSON `localStorage` session fails closed and purges storage
- **T2.12**: Forged user ID / mismatched email in session payload fails closed and wipes storage
- **T2.13**: Expired session token (`expires_at` in past) fails closed and purges storage
- **T2.14**: Open redirect attack query parameters (`?redirect=https://evil.com`) sanitized to `/dashboard`
- **T2.15**: Protocol-relative open redirect (`?redirect=//evil.com`) sanitized to `/dashboard`
- **T2.16**: Nonexistent API route (`GET /api/nonexistent-route`) returns 404 JSON rather than HTML SPA fallback

### Tier 3: Cross-Feature Combinations & State Flow (10 Test Cases)
Tests integration and data handoff between two or more system components:
- **T3.1**: Auth Context -> AppLayout -> DashboardHome data binding
- **T3.2**: Header Patient Switcher -> EHR + Scribe + Aura + PHI Scrubber simultaneous sync
- **T3.3**: Subscription Access Gating & dynamic tier elevation
- **T3.4**: Clinical Context Note Field Mutation -> Real-time UI reflection
- **T3.5**: Scribe -> PHI Scrubber data pipeline (`sendToPhiScrubber`)
- **T3.6**: Scribe -> EHR Chart Note ingestion (`insertToEhr`)
- **T3.7**: Patient Context ePHI ingestion -> PHI Scrubber redaction verification
- **T3.8**: Subscription Plan Selection -> Express Checkout API -> Local Subscription State Sync
- **T3.9**: Sign-out triggering complete Context Purge & immediate Route Guard Relock
- **T3.10**: Seamless Multi-App Navigation Continuity (EHR -> Scribe -> Aura -> Scrubber -> Dashboard)

### Tier 4: Real-World Clinical Workload Scenarios (5 Comprehensive Scenarios)
Simulates end-to-end clinical encounter workflows from start to finish:
- **Scenario 1**: Full Patient Intake & Encounter Workflow (Dr. Chen logs in, selects Jane Doe, initiates 60m CBT session, reviews transcript, generates SOAP note, commits to EHR)
- **Scenario 2**: Telehealth Session with Live Scribe & Real-time CPT Coding (Patient room entry, WebRTC readiness check, ambient transcript capture, CPT 90837 reconciliation)
- **Scenario 3**: Multi-Specialty Clinical Encounter with Aura Copilot Assistance (Consultation, DSM-5 differential query, typewriter SOAP synthesis, decision support)
- **Scenario 4**: Statutory HIPAA Safe Harbor Redaction & Forensic Export Workflow (Encounter note extraction, 18 Safe Harbor execution, entity redaction with `[NAME]`, `[DATE]`, `[PHONE]`, zero ePHI leak)
- **Scenario 5**: Practice Subscription Lifecycle & Commercial Billing (Plan comparison, annual billing toggle with 20% discount, Stripe checkout initiation, UUID session verification, license activation)

---

## 3. Execution Environment & Test Commands

### 3.1 Requirements
- Node.js >= 20.x
- `tsx` (TypeScript execute engine)
- `jsdom` (Headless DOM environment for React rendering)
- Express server instance running on ephemeral port

### 3.2 Running the E2E Test Suite

Execute the entire test suite via npm:
```bash
npm run test:e2e
```

Or run via Node directly:
```bash
node tests/e2e/run-all.mjs
```

Run specific tiers individually:
```bash
node tests/e2e/tier1-features.test.mjs
node tests/e2e/tier2-boundaries.test.mjs
node tests/e2e/tier3-interactions.test.mjs
node tests/e2e/tier4-scenarios.test.mjs
```

### 3.3 CI/CD Integration
The runner exits with code `0` on 100% pass, or code `1` if any test fails, enabling direct integration into automated verification pipelines (`scripts/verify-build.sh` or GitHub Actions).

---

## 4. Defect Escalation Protocol
As an opaque-box test writer:
1. When an unexpected test failure occurs, verify whether the test assertion accurately reflects the authoritative specification in `ORIGINAL_REQUEST.md` or `PROJECT.md`.
2. If the test is correct and the application behaves inconsistently with specifications, record the defect in `handoff.md` and escalate to the implementing agent.
3. Test code must never be tailored to mask bugs in the application code.
