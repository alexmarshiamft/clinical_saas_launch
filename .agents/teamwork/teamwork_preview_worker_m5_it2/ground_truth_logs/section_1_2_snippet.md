### 1.2 Verbatim Terminal Output from Verification Commands
The following 12 terminal execution outputs were captured directly from running the verification commands via turnkey automated capture:

#### Command 1: `npm run test:aura` (PASS, Exit 0, 2s)
```

> clinical-saas-platform@1.0.0 test:aura
> tsx tests/m5-aura-scrubber.test.ts


====================================================================
   Milestone 5: Aura Assistant & HIPAA PHI Scrubber Test Suite
====================================================================

▶ [Category 1] Feature 19: Aura Assistant Workspace & Studio
  ✓ [PASS] F19.1 Header title "Aura Assistant Studio" renders
  ✓ [PASS] F19.2 Status badge "Copilot Standby" renders
  ✓ [PASS] F19.3 Dynamic differential header binds to Jane Doe
  ✓ [PASS] F19.4 CPT badge renders "CPT: 90837"
  ✓ [PASS] F19.5 Invariant text contains "DSM-5 symptom markers"
  ✓ [PASS] F19.6 Invariant text contains "ICD-10 diagnostic codes"
  ✓ [PASS] F19.7 Invariant text contains "clinical interventions"
  ✓ [PASS] F19.8 Jane Doe resolves to GAD-7 (F41.1)
  ✓ [PASS] F19.9 GAD-7 contains >= 6 diagnostic criteria
  ✓ [PASS] F19.10 Marcus Vance resolves to MDD (F32.1)
  ✓ [PASS] F19.11 Elena Rostova resolves to Panic Disorder (F41.0)
  ✓ [PASS] F19.12 Clinical suggestion chips library contains >= 8 chips
  ✓ [PASS] F19.13 Suggestion chip includes GAD-7 Protocol
  ✓ [PASS] F19.14 Suggestion chip includes Low Risk / No SI/HI

▶ [Category 2] Feature 20: Aura Floating Action Orb
  ✓ [PASS] F20.1 Floating action orb element rendered in DOM
  ✓ [PASS] F20.2 Expanded overlay title "Aura Copilot" rendered
  ✓ [PASS] F20.3 Floating panel header displays active patient tag
  ✓ [PASS] F20.4 Floating panel contains "Format SOAP" button
  ✓ [PASS] F20.5 Floating panel contains "Insert EHR" button
  ✓ [PASS] F20.6 Keyboard shortcut indicator Alt + A rendered

▶ [Category 3] Feature 21: Aura Dictation & Typewriter SOAP
  ✓ [PASS] F21.1 Headless-safe pure CSS audio visualizer renders 5 bars without canvas/AudioContext
  ✓ [PASS] F21.2 Synthesized note contains SUBJECTIVE section
  ✓ [PASS] F21.3 Synthesized note contains OBJECTIVE section
  ✓ [PASS] F21.4 Synthesized note contains ASSESSMENT section
  ✓ [PASS] F21.5 Synthesized note contains PLAN section
  ✓ [PASS] F21.6 Synthesized note references active CPT code 90837
  ✓ [PASS] F21.7 Typewriter SOAP header rendered
  ✓ [PASS] F21.8 Typewriter component contains "Insert to EHR Chart" action
  ✓ [PASS] F21.9 Typewriter component contains "Send to PHI Scrubber" action

▶ [Category 4] Feature 22: Aura Shadow DOM & CSS Isolation
  ✓ [PASS] F22.1 aura-shadow.css exists on disk
  ✓ [PASS] F22.2 aura-shadow.css has 0 global CSS bleed violations
  ✓ [PASS] F22.3 Styles encapsulated with :host pseudo-selector
  ✓ [PASS] F22.4 Namespaced class .aura-orb defined

▶ [Category 5] Feature 23: PHI Scrubber 18 Safe Harbor Engine
  ✓ [PASS] F23.0 All 18 statutory HIPAA Safe Harbor rules defined
  ✓ [PASS] F23.1 Rule 1 (Names) redacted with [NAME]
  ✓ [PASS] F23.1b Source patient name not present in clean text
  ✓ [PASS] F23.2 Rule 2 (Geographic) redacted
  ✓ [PASS] F23.3 Rule 3 (Dates) redacted with [DATE]
  ✓ [PASS] F23.3b Rule 3 (Ages 90+) redacted with [AGE_90+]
  ✓ [PASS] F23.4 Rule 4 (Phone) redacted with [PHONE]
  ✓ [PASS] F23.5 Rule 5 (Fax) redacted
  ✓ [PASS] F23.6 Rule 6 (Email) redacted with [EMAIL]
  ✓ [PASS] F23.7 Rule 7 (SSN) redacted with [SSN]
  ✓ [PASS] F23.8 Rule 8 (MRN) redacted with [MRN]
  ✓ [PASS] F23.9 Rule 9 (Health Plan) redacted with [HEALTH_PLAN_NUM]
  ✓ [PASS] F23.10 Rule 10 (Account) redacted with [ACCOUNT_NUM]
  ✓ [PASS] F23.11 Rule 11 (License/NPI) redacted
  ✓ [PASS] F23.12 Rule 12 (Vehicle IDs) redacted with [VEHICLE_ID]
  ✓ [PASS] F23.13 Rule 13 (Device IDs) redacted with [DEVICE_ID]
  ✓ [PASS] F23.14 Rule 14 (URLs) redacted with [URL]
  ✓ [PASS] F23.15 Rule 15 (IP Addresses) redacted with [IP_ADDRESS]
  ✓ [PASS] F23.16 Rule 16 (Biometric) redacted with [BIOMETRIC]
  ✓ [PASS] F23.17 Rule 17 (Photos) redacted with [PHOTO_ID]
  ✓ [PASS] F23.18 Rule 18 (Unique IDs) redacted with [UNIQUE_ID]
  ✓ [PASS] F23.19 Mask style "tag" generates [PHONE]
  ✓ [PASS] F23.20 Mask style "block" generates solid blocks
  ✓ [PASS] F23.21 Mask style "asterisk" generates asterisks
  ✓ [PASS] F23.22 Character offsets perfectly match original source text across all entities
  ✓ [PASS] F23.23 Confidence scores scored between 0.70 and 1.00

▶ [Category 6] Feature 24: PHI Scrubber Side-by-Side Diff Viewer
  ✓ [PASS] F24.1 Unredacted Source pane header rendered
  ✓ [PASS] F24.2 Redacted Output pane header rendered
  ✓ [PASS] F24.3 "Copy Clean Text" button rendered
  ✓ [PASS] F24.4 Tag mask mode switcher button rendered
  ✓ [PASS] F24.5 Block mask mode switcher button rendered
  ✓ [PASS] F24.6 Asterisk mask mode switcher button rendered

▶ [Category 7] Feature 25: PHI Scrubber Forensic Audit Table
  ✓ [PASS] F25.1 Metric card "Total ePHI Detected" rendered
  ✓ [PASS] F25.2 Metric card "Safe Harbor Rules" rendered
  ✓ [PASS] F25.3 Metric card "Risk Severity" rendered
  ✓ [PASS] F25.4 Metric card "Compliance Status" rendered
  ✓ [PASS] F25.5 "Export JSON" action rendered
  ✓ [PASS] F25.6 "Export CSV" action rendered
  ✓ [PASS] F25.7 Forensic table displays statutory rule classification

▶ [Category 8] Feature 26: Cross-Tool Clinical Pipelines
  ✓ [PASS] F26.1 ClinicalContext mounts cleanly
  ✓ [PASS] F26.2 Default active patient is Jane Doe
  ✓ [PASS] F26.3 sendToPhiScrubber synchronously sets scrubberInputText
  ✓ [PASS] F26.4 sendToPhiScrubber dispatches clinical:send-to-phi-scrubber custom event
  ✓ [PASS] F26.5 Event detail includes clinical text payload
[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
  ✓ [PASS] F26.6 insertToEhr(string) appends addendum without overwriting prior assessment
  ✓ [PASS] F26.7 insertToEhr(object) updates structured subjective
  ✓ [PASS] F26.8 insertToEhr(object) updates structured plan
  ✓ [PASS] F26.9 PhiScrubberView mounts with "HIPAA PHI Scrubber"
  ✓ [PASS] F26.10 PhiScrubberView displays "18 Safe Harbor Active" badge
  ✓ [PASS] F26.11 PhiScrubberView contains exact [NAME] token
  ✓ [PASS] F26.12 PhiScrubberView contains exact [DATE] token
  ✓ [PASS] F26.13 PhiScrubberView contains exact [PHONE] token

====================================================================
   Milestone 5 Verification Summary: 85 Passed, 0 Failed (Total: 85)
====================================================================

✓ [CERTIFIED] All Milestone 5 Aura Assistant & HIPAA PHI Scrubber deliverables pass.

```

#### Command 2: `node scripts/verify-css-bleed.mjs` (PASS, Exit 0, 0s)
```
✓ [PASS] Zero CSS bleed detected in scribe-theme.css. Scoping strictly preserved.
✓ [PASS] Zero CSS bleed detected in aura-shadow.css. Scoping strictly preserved.
✓ [PASS] All stylesheets passed zero CSS bleed verification.
```

#### Command 3: `npm run test:scribe` (PASS, Exit 0, 1s)
```

> clinical-saas-platform@1.0.0 test:scribe
> tsx tests/m4-clinical-scribe.test.ts


====================================================================
   Milestone 4: Clinical AI Scribe v2 Integration Test Suite       
====================================================================

--- Category 1: Feature 13 Ambient Acoustic Diarization Feed ---
  ✓ [PASS] F13.1 Encounter Catalog contains at least 4 clinical encounters
  ✓ [PASS] F13.2 GAD-7 Anxiety Intake sample binds to Jane Doe and CPT 90837
  ✓ [PASS] F13.3 MDD Follow-up sample binds to Marcus Vance and CPT 90834
  ✓ [PASS] F13.4 PTSD Trauma Session sample binds to David Kim and CPT 90837
  ✓ [PASS] F13.5 Diabetes Somatic Consultation binds to Elena Rostova and CPT 99214
  ✓ [PASS] F13.6 Utterance contract fulfills id, role, timestamp, seconds, and text

--- Category 2: Feature 14 6 Clinical Note Templates & Dual-Engine AI ---
  ✓ [PASS] F14.1 Exactly 6 standard clinical templates pre-configured in defaultTemplates.ts
  ✓ [PASS] F14.2 All 6 mandated template IDs present (psych-eval, soap, dap, birp, intake, discharge)
  ✓ [PASS] F14.3 Comprehensive Psychiatric Evaluation has all 6 mandated sections (HPI, Past Psych, Medical, MSE, Formulation, Treatment)
  ✓ [PASS] F14.4 SOAP Progress Note contains Subjective, Objective, Assessment, Plan
  ✓ [PASS] F14.5 DAP Progress Note contains Data, Assessment, Plan
  ✓ [PASS] F14.6 BIRP Progress Note contains Behavior, Intervention, Response, Plan
  ✓ [PASS] F14.7 Clinical Intake Assessment contains Presenting Problem, History, Risk, Impressions, Goals
  ✓ [PASS] F14.8 Discharge Summary contains Admission Reason, Treatment Course, Discharge Condition, Care, Relapse
  ✓ [PASS] F14.9 [Comprehensive Psychiatric Evaluation] Deterministic synthesis produces valid clinical markdown with patient demographics
  ✓ [PASS] F14.10 [Comprehensive Psychiatric Evaluation] Deterministic synthesis executes instantaneously (<50ms, took 1ms)
  ✓ [PASS] F14.9 [SOAP Progress Note] Deterministic synthesis produces valid clinical markdown with patient demographics
  ✓ [PASS] F14.10 [SOAP Progress Note] Deterministic synthesis executes instantaneously (<50ms, took 0ms)
  ✓ [PASS] F14.9 [DAP Progress Note] Deterministic synthesis produces valid clinical markdown with patient demographics
  ✓ [PASS] F14.10 [DAP Progress Note] Deterministic synthesis executes instantaneously (<50ms, took 0ms)
  ✓ [PASS] F14.9 [BIRP Progress Note] Deterministic synthesis produces valid clinical markdown with patient demographics
  ✓ [PASS] F14.10 [BIRP Progress Note] Deterministic synthesis executes instantaneously (<50ms, took 0ms)
  ✓ [PASS] F14.9 [Clinical Intake Assessment] Deterministic synthesis produces valid clinical markdown with patient demographics
  ✓ [PASS] F14.10 [Clinical Intake Assessment] Deterministic synthesis executes instantaneously (<50ms, took 0ms)
  ✓ [PASS] F14.9 [Discharge Summary] Deterministic synthesis produces valid clinical markdown with patient demographics
  ✓ [PASS] F14.10 [Discharge Summary] Deterministic synthesis executes instantaneously (<50ms, took 0ms)

--- Category 3: Feature 15 Scribe Template Studio & Variable Interpolation ---
  ✓ [PASS] F15.1 interpolateTemplateVariables successfully replaces all 7 clinical variable tokens
  ✓ [PASS] F15.2 SUPPORTED_VARIABLES exposes at least 7 variable token chips with labels and examples
  ✓ [PASS] F15.3 Dynamic section re-ordering correctly assigns new position and 0-based order index
  ✓ [PASS] F15.4 interpolateTemplateVariables supports custom tokens and resists prototype property leaks
  ✓ [PASS] F15.5 interpolateTemplateVariables preserves unmapped tokens by default and cleans them with cleanUnmapped option

--- Category 4: Feature 16 Scribe Billing & Coding Assistant ---
  ✓ [PASS] F16.1 Statutory ICD-10 database contains primary psychiatric & somatic codes
  ✓ [PASS] F16.2 ICD-10 database contains F41.1 (GAD), F32.1/F32.9 (MDD), F43.10 (PTSD)
  ✓ [PASS] F16.3 Statutory CPT database contains 90832, 90834, 90837, 90791, 99213, 99214
  ✓ [PASS] F16.4 matchDiagnosticCodes scores F41.1 as top match for anxiety dialogue
  ✓ [PASS] F16.5 matchDiagnosticCodes scores F43.10 as top match for PTSD/trauma dialogue
  ✓ [PASS] F16.6 recommendCptCode maps 60 min to 90837
  ✓ [PASS] F16.7 recommendCptCode maps 45 min to 90834
  ✓ [PASS] F16.8 recommendCptCode maps 30 min to 90832
  ✓ [PASS] F16.9 recommendCptCode maps initial intake to 90791
  ✓ [PASS] F16.10 generateMedicalNecessityBlock generates audit-compliant statement containing AMA/CMS criteria

--- Category 5: Feature 17 Scribe Multi-EHR Export Adapters ---
  ✓ [PASS] F17.1 formatEpicSmartText outputs valid Epic dot-phrase format with section delimiters
  ✓ [PASS] F17.2 formatEpicFhirDocument produces valid FHIR R4 DocumentReference JSON with LOINC 11506-3
  ✓ [PASS] F17.3 formatCernerPowerChart outputs valid PowerChart Millennium numbered section format
  ✓ [PASS] F17.4 formatAthenaEncounter outputs valid AthenaNet Clinical Encounter XML
  ✓ [PASS] F17.5 formatMarkdownUniversal outputs clean markdown representation
  ✓ [PASS] F17.6 formatEpicSmartText defends against delimiter collisions, dot-phrases, and forged signatures in note bodies
  ✓ [PASS] F17.7 formatCernerPowerChart defends against numbered bracket delimiter collisions, divider hyphens, and forged commitment banners

--- Category 6: Feature 18 Scoped CSS Namespace Isolation ---
  ✓ [PASS] F18.1 scribe-theme.css exists at src/tools/scribe/scribe-theme.css
  ✓ [PASS] F18.2 Stylesheet contains .heidi-scribe-theme containment wrapper
  ✓ [PASS] F18.3 Zero global *, html, body, #root, .btn, .badge rules outside namespace container

--- Category 7: UI Invariant Mounting & DOM Scraper Verification ---
  ✓ [PASS] UI.1 Invariant string "Clinical AI Scribe v2" rendered
  ✓ [PASS] UI.2 Invariant string "AI Diarization Ready" rendered
  ✓ [PASS] UI.3 Invariant string "Live Acoustic Transcript" rendered
  ✓ [PASS] UI.4 Invariant string "Dr. Chen:" rendered
  ✓ [PASS] UI.5 Invariant string "Jane Doe:" rendered
  ✓ [PASS] UI.6 Invariant string "Generated SOAP Preview" rendered
  ✓ [PASS] UI.7 Invariant string "Subjective:" rendered
  ✓ [PASS] UI.8 Invariant string "Assessment:" rendered
  ✓ [PASS] UI.9 Invariant string "Generated SOAP Preview (CPT 90837)" rendered
  ✓ [PASS] UI.10 Dynamic SVG Waveform Visualizer mounts without canvas context crashes

====================================================================
   Milestone 4 Verification Summary: 61 Passed, 0 Failed (Total: 61)
====================================================================

✓ [CERTIFIED] All Milestone 4 Clinical AI Scribe v2 deliverables pass.

```

#### Command 4: `npm run test:ehr` (PASS, Exit 0, 4s)
```

> clinical-saas-platform@1.0.0 test:ehr
> tsx tests/m3-theraflow-ehr.test.ts

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
====================================================================
   Milestone 3 Verification: TheraFlow Clinical EHR & Telehealth    
====================================================================

Starting ephemeral backend server for M3 verification...
✓ Ephemeral server online at http://127.0.0.1:3995

--- Feature 8: Client Roster & Profile Charting ---
  ✓ [PASS] F8.1 Store seeds canonical TheraFlow patients (at least 11)
      ↳ Loaded 11 clients including Jane Doe & Marcus Vance
  ✓ [PASS] F8.2 Canonical patient records contain valid MRN, fee, and ICD-10 diagnoses
      ↳ Jane: #MC-88219 (F41.1) | Marcus: #MC-10002 | Elena: F41.1
  ✓ [PASS] F8.3 addClient assigns UUID, formatted MRN (#MC-xxxxx), and persists
      ↳ Created client ID: client-1791201724327-82 with MRN: #MC-43922
  ✓ [PASS] F8.4 getClientById returns exact persisted record
      ↳ Fetched: Sophia Montgomery

--- Feature 9: Interactive Appointment Calendar ---
  ✓ [PASS] F9.1 Appointment store contains seeded clinical appointments
      ↳ Loaded 6 appointments
  ✓ [PASS] F9.2 addAppointment books clinical session with CPT 90837 and Telehealth location
      ↳ Appt ID: appt-1791201724327-277 for Jane Doe
  ✓ [PASS] F9.3 addAppointment supports Out of Office (OOO) calendar blocking
      ↳ OOO Event created: Out of Office Block
  ✓ [PASS] F9.4 updateAppointment transitions status to completed
      ↳ New status: completed
  ✓ [PASS] F9.5 deleteAppointment removes session cleanly from registry
      ↳ Appointment appt-1791201724327-277 successfully removed

--- Feature 10: DAP Notes & Treatment Plans ---
  ✓ [PASS] F10.1 addNote creates structured DAP progress note with Data, Assessment, Plan
      ↳ Note ID: note-1791201724328-838 created for Jane Doe
  ✓ [PASS] F10.2 expandShorthandToDAP generates structured clinical Data, Assessment, and Plan
      ↳ Generated Data (491 chars), Assessment (494 chars), Plan (286 chars)
  ✓ [PASS] F10.3 updateNote digitally signs and locks DAP note (HIPAA immutability)
      ↳ Signed at: 2026-10-05T12:02:04.329Z
  ✓ [PASS] F10.4 addTreatmentPlan stores problem, goal, time-bound objectives, and interventions
      ↳ Plan ID: tp-1791201724329-619 with 2 objectives

--- Feature 11: Invoicing & CMS-1500 Superbills ---
  ✓ [PASS] F11.1 Invoice store loads baseline invoices across paid, unpaid, and overdue statuses
      ↳ Loaded 4 invoices
  ✓ [PASS] F11.2 Financial engine accurately computes Total Billed, Paid, and Overdue receivables
      ↳ Total: $770.00 | Paid Count: 2 | Overdue Count: 1
  ✓ [PASS] F11.3 addInvoice generates billing record with CPT items and due date
      ↳ Invoice: INV-TEST-4329 ($175)
  ✓ [PASS] F11.4 updateInvoice marks invoice as paid and attaches paid_date timestamp
      ↳ Status: paid (Paid at: 2026-10-05T12:02:04.329Z)

--- Feature 12: Telehealth WebRTC & HIPAA Audit Logs ---
  ✓ [PASS] F12.1 POST /api/telehealth/meeting issues WebRTC room credentials and join token
      ↳ Returned Meeting.MeetingId and Attendee.JoinToken
  ✓ [PASS] F12.2 getAuditLogs loads cryptographically chained audit ledger
      ↳ Loaded 13 audit entries
  ✓ [PASS] F12.3 verifyAuditChain verifies 100% cryptographic integrity of audit ledger
      ↳ Chain verification result: true
  ✓ [PASS] F12.4 verifyAuditChain flags tamper breach when log payload is altered
      ↳ Cryptographic hash mismatch caught unauthorized payload tampering
  ✓ [PASS] F12.5 GET & POST /api/audit-logs records and filters immutable logs
      ↳ HTTP 201 on log submission and HTTP 200 with verified filter query

--- Section 6: UI Component & Routing Integration ---
  ✓ [PASS] UI.1 EhrWorkspace renders persistent header and 3 invariant summary cards
      ↳ Title: true | Subtitle: true | Badge: true | Patient: true | Telehealth: true | Notes: true
  ✓ [PASS] UI.2 EhrWorkspace with defaultTab="clients" renders interactive client roster
      ↳ Roster rendered: true
Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform
  ✓ [PASS] UI.3 EhrWorkspace with defaultTab="calendar" renders appointment scheduler
      ↳ Calendar rendered: true
  ✓ [PASS] UI.4 EhrWorkspace with defaultTab="notes" renders DAP note editor with CMS guidance
      ↳ Notes rendered: true
  ✓ [PASS] UI.5 EhrWorkspace with defaultTab="treatment-plans" renders treatment plan builder
      ↳ Treatment plans rendered: true
  ✓ [PASS] UI.6 EhrWorkspace with defaultTab="billing" renders invoice and claims ledger
      ↳ Billing rendered: true
  ✓ [PASS] UI.7 EhrWorkspace with defaultTab="telehealth" renders WebRTC video room simulation
      ↳ Telehealth room rendered: true
  ✓ [PASS] UI.8 EhrWorkspace with defaultTab="audit-logs" renders HIPAA immutable audit ledger
      ↳ Audit trail rendered: true

====================================================================
Milestone 3 EHR Verification: 30 Passed, 0 Failed (Total: 30)
====================================================================

✓ ALL MILESTONE 3 THERAWFLOW EHR & TELEHEALTH CHECKS PASSED WITH 100% SUCCESS.
```

#### Command 5: `npm run test:e2e` (PASS, Exit 0, 21s)
```

> clinical-saas-platform@1.0.0 test:e2e
> node tests/e2e/run-all.mjs

╔══════════════════════════════════════════════════════════════════════════╗
║   Clinical Telehealth & AI Scribe SaaS — Comprehensive E2E Test Suite    ║
║   Tiers 1–4 Opaque-Box End-to-End Verification Harness                   ║
╚══════════════════════════════════════════════════════════════════════════╝

Initializing shared Express test server runtime...
✓ Test server operational on http://127.0.0.1:3899


▶ Executing Tier 1: Feature Coverage...
  Description: Comprehensive isolated validation across all 7 core platform features
  ──────────────────────────────────────────────────────────────────
====================================================================
   E2E Tier 1: Full Feature Coverage Test Suite (7 Features)        
====================================================================

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
--- Feature 1: Dual-Engine Authentication ---
✓ [PASS] T1.1.1 [Auth] Unauthenticated route access blocked and redirected to /login
    ↳ Redirected to: /login?redirect=%2Fdashboard | ePHI Leaked: false
✓ [PASS] T1.1.2 [Auth] 1-Click Demo Clinician button authenticates and routes to target
    ↳ Final route: /dashboard/ehr | Session hydrated: true
✓ [PASS] T1.1.3 [Auth] Session envelope persists valid Supabase User and Session fixtures
    ↳ User ID: a0000000-0000-4000-8000-000000000001 | Token valid: true
✓ [PASS] T1.1.4 [Auth] Authenticated session renders clinician and practice profile identity
    ↳ Clinician name present: true | Practice name present: true
✓ [PASS] T1.1.5 [Auth] Sign-out clears localStorage session and redirects to /login
    ↳ Session cleared: true | Pathname: /login

--- Feature 2: Unified Command Center & Dashboard Layout ---
✓ [PASS] T1.2.1 [Dashboard] AppLayout shell renders Sidebar, Header, and HIPAA banner
    ↳ Sidebar: true | Header: true | Banner: true
✓ [PASS] T1.2.2 [Dashboard] DashboardHome renders Clinical Command Center welcome banner
    ↳ Command Center title: true | Welcome: true
✓ [PASS] T1.2.3 [Dashboard] Active Patient Hero Card renders patient Jane Doe with MRN and CPT
    ↳ Name: true | MRN: true | DOB: true | CPT: true
✓ [PASS] T1.2.4 [Dashboard] Clinical schedule displays today appointments with timestamps and CPT
    ↳ Schedule header: true | Jane: true | Marcus: true
✓ [PASS] T1.2.5 [Dashboard] Header Patient Selector allows switching active encounter context
    ↳ Switched active patient: true

--- Feature 3: Stripe Subscription Billing Engine ---
✓ [PASS] T1.3.1 [Stripe] POST /api/create-checkout-session creates session for Starter plan ($49)
    ↳ HTTP 200 | Session: cs_test_simulated_d5... | Amount: $49
✓ [PASS] T1.3.2 [Stripe] POST /api/create-checkout-session creates session for Clinician Pro plan ($99)
    ↳ HTTP 200 | Session: cs_test_simulated_dd... | Amount: $99
✓ [PASS] T1.3.3 [Stripe] POST /api/create-checkout-session creates session for Practice Group plan ($249)
    ↳ HTTP 200 | Session: cs_test_simulated_90... | Amount: $249
✓ [PASS] T1.3.4 [Stripe] Subscription UI renders 3-tier pricing cards and annual billing toggle
    ↳ Starter: true | Pro: true | Group: true | 20% discount toggle: true
✓ [PASS] T1.3.5 [Stripe] GET /api/subscription/status returns active Pro subscription metadata
    ↳ HTTP 200 | status: active | tier: pro | isSubscribed: true

--- Feature 4: TheraFlow Clinical EHR & Telehealth ---
✓ [PASS] T1.4.1 [EHR] EhrWorkspace mounts at /dashboard/ehr with EHR Active status pill
    ↳ Title present: true | Badge present: true
✓ [PASS] T1.4.2 [EHR] EhrWorkspace binds to active patient chart (Jane Doe, MRN, CPT)
    ↳ Active patient charting data bound: true
✓ [PASS] T1.4.3 [EHR] Telehealth module renders encrypted WebRTC room status indicator
    ↳ Telehealth status: true
✓ [PASS] T1.4.4 [EHR] Clinical notes section displays DAP / SOAP format synchronization
    ↳ Clinical notes formats rendered: true
Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform
✓ [PASS] T1.4.5 [EHR] Operations routes (/calendar, /clients, /billing) route to EHR workspace
    ↳ Calendar: true | Clients: true | Billing: true

--- Feature 5: Clinical AI Scribe v2 Diarization Workspace ---
✓ [PASS] T1.5.1 [Scribe] ScribeWorkspace mounts at /dashboard/scribe with AI Diarization Ready badge
    ↳ Title: true | Acoustic badge: true
✓ [PASS] T1.5.2 [Scribe] Renders live acoustic diarization transcript separating clinician & patient
    ↳ Dual-speaker diarization text rendered: true
✓ [PASS] T1.5.3 [Scribe] Automatically synthesizes SOAP preview for active encounter
    ↳ SOAP preview rendered: true
✓ [PASS] T1.5.4 [Scribe] Scribe workspace preview synchronizes with active patient CPT 90837 code
    ↳ CPT 90837 bound: true
✓ [PASS] T1.5.5 [Scribe] Command Center contains direct launcher linking to Scribe recording feed
    ↳ Scribe launcher anchor present: true

--- Feature 6: Aura Assistant Studio & Clinical Copilot ---
✓ [PASS] T1.6.1 [Aura] AuraStudio mounts at /dashboard/aura with Copilot Standby status
    ↳ Title: true | Standby status: true
✓ [PASS] T1.6.2 [Aura] Diagnostic Differential Assistant binds to Jane Doe and CPT 90837
    ↳ Patient binding: true
✓ [PASS] T1.6.3 [Aura] Studio provides real-time DSM-5 criteria and ICD-10 intervention guidance
    ↳ DSM-5 guidance text rendered: true
✓ [PASS] T1.6.4 [Aura] Header contains Aura Copilot quick launcher accessible across all views
    ↳ Aura link found in Header: true | Has text: true
✓ [PASS] T1.6.5 [Aura] Aura Studio updates diagnostic target when active patient context switches
    ↳ Aura updated to Marcus Vance: true

--- Feature 7: HIPAA PHI Scrubber 18 Safe Harbor Engine ---
✓ [PASS] T1.7.1 [PHI Scrubber] PhiScrubberView mounts at /dashboard/phi-scrubber with 18 Safe Harbor Active badge
    ↳ Title: true | 18 Safe Harbor badge: true
✓ [PASS] T1.7.2 [PHI Scrubber] Unredacted source pane displays patient clinical ePHI for review
    ↳ ePHI source text identified: true
✓ [PASS] T1.7.3 [PHI Scrubber] 18 Safe Harbor engine masks patient identity with [NAME] token
    ↳ [NAME] token present: true
✓ [PASS] T1.7.4 [PHI Scrubber] 18 Safe Harbor engine masks date of birth with [DATE] token
    ↳ [DATE] token present: true
✓ [PASS] T1.7.5 [PHI Scrubber] 18 Safe Harbor engine masks telephone contact info with [PHONE] token
    ↳ [PHONE] token present: true

--------------------------------------------------------------------
  Tier 1 Feature Coverage Summary
  Passed: 35 | Failed: 0 | Total: 35 (3.97s)
--------------------------------------------------------------------


▶ Executing Tier 2: Boundary & Corner Cases...
  Description: Negative probing, empty inputs, prototype safety, security boundaries
  ──────────────────────────────────────────────────────────────────
====================================================================
   E2E Tier 2: Boundary & Corner Cases Test Suite                   
====================================================================

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
--- Category 1: Unauthenticated Route Matrix & Zero ePHI Leakage ---
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/ehr redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fehr | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/scribe redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fscribe | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/aura redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Faura | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/phi-scrubber redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fphi-scrubber | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/calendar redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fcalendar | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/clients redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fclients | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/billing redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fbilling | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/subscription redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fsubscription | Blocked: true | Leaked ePHI: false
✓ [PASS] T2.1 [Route Guard] Unauthenticated probe to /dashboard/scribe?encounter=enc_99214&patient=101 redirects cleanly with 0 ePHI leak
    ↳ Target: /login??redirect=%2Fdashboard%2Fscribe%3Fencounter%3Denc_99214%26patient%3D101 | Blocked: true | Leaked ePHI: false

--- Category 2: API Endpoint Input Boundaries & Negative Payloads ---
✓ [PASS] T2.2.1 [Stripe API] Invalid plan tier string returns 400 Bad Request with validPlans catalog
    ↳ HTTP 400 | error: "Invalid planId provided" | validPlans: ["starter","pro","group"]
✓ [PASS] T2.2.2 [Stripe API] Numeric planId type mismatch returns 400 Bad Request
    ↳ HTTP 400
✓ [PASS] T2.2.3 [Stripe API] Empty string planId safely defaults to Clinician Pro tier
    ↳ HTTP 200 | Resolved plan: Clinician Pro
✓ [PASS] T2.2.4 [Stripe API] Prototype probe planId='constructor' survives without server crash
    ↳ HTTP 400 | Server survived without unhandled rejection
✓ [PASS] T2.2.5 [Stripe API] Prototype probe planId='__proto__' survives without pollution
    ↳ HTTP 400 | Server survived
✓ [PASS] T2.2.6 [Stripe API] Prototype probe planId='toString' survives safely
    ↳ HTTP 400
✓ [PASS] T2.2.7 [API Core] Malformed unclosed JSON in request body returns 400 Bad Request
    ↳ HTTP 400 | Syntax error caught by parser
✓ [PASS] T2.2.8 [API Core] Massive 500KB body payload rejected with 413 Payload Too Large
    ↳ HTTP 413 | Enforced size limit
✓ [PASS] T2.2.9 [Billing API] Empty body in billing checkout safely defaults amount and patient name
    ↳ HTTP 200 | amountTotal: $150 | client: Patient
✓ [PASS] T2.2.10 [Routing] Nonexistent API route returns 404 JSON error without leaking SPA index.html
    ↳ HTTP 404 | Content-Type: application/json; charset=utf-8

--- Category 3: Session Forgery, Corrupted Storage & Fail-Closed Security ---
✓ [PASS] T2.3.1 [Storage Security] Corrupted non-JSON localStorage token is purged and user sent to /login
    ↳ Purged storage: true | Path: /login
✓ [PASS] T2.3.2 [Storage Security] Primitive non-object string in session storage fails closed
    ↳ Purged storage: true | Path: /login
✓ [PASS] T2.3.3 [Storage Security] Forged unauthorized user ID rejected and session wiped
    ↳ Purged storage: true | Path: /login
✓ [PASS] T2.3.4 [Storage Security] Valid ID with mismatched email fails anti-forgery validation
    ↳ Purged storage: true | Path: /login
✓ [PASS] T2.3.5 [Storage Security] Expired session token (past expires_at) fails closed and purges
    ↳ Purged storage: true | Path: /login
✓ [PASS] T2.3.6 [Storage Security] Whitespace-only access token rejected as invalid envelope
    ↳ Purged storage: true | Path: /login

--- Category 4: Query Parameter Injection & Open Redirect Defense ---
✓ [PASS] T2.4.1 [Open Redirect] Full HTTPS external URL in ?redirect sanitized to /dashboard
    ↳ Path after signin: /dashboard | External site blocked: true
✓ [PASS] T2.4.2 [Open Redirect] Protocol-relative URL (//evil.com) in ?redirect sanitized to /dashboard
    ↳ Path after signin: /dashboard
✓ [PASS] T2.4.3 [XSS Defense] JavaScript pseudo-protocol URI (javascript:...) in ?redirect sanitized
    ↳ Path after signin: /dashboard
✓ [PASS] T2.4.4 [XSS Defense] Data URI in ?redirect sanitized to internal /dashboard
    ↳ Path after signin: /dashboard

--------------------------------------------------------------------
  Tier 2 Boundaries & Corners Summary
  Passed: 30 | Failed: 0 | Total: 30 (2.45s)
--------------------------------------------------------------------


▶ Executing Tier 3: Cross-Feature Combinations...
  Description: Interactions between Auth, Subscription, Scribe, Aura, Scrubber & EHR
  ──────────────────────────────────────────────────────────────────
====================================================================
   E2E Tier 3: Cross-Feature Combinations & State Flow Test Suite   
====================================================================

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
✓ [PASS] T3.1 [Auth+Dashboard] Authenticated session hydrates Clinician identity and default Jane Doe context
    ↳ Clinician: true | Patient: true | CPT: true
✓ [PASS] T3.2 [Context Sync] Switching active patient propagates synchronously across EHR, Aura, and PHI Scrubber
    ↳ Switched: true | EHR: true | Aura: true | PHI: true
✓ [PASS] T3.3 [Subscription Gate] Higher tier feature is gated and instantly unlocks upon tier elevation
    ↳ Gate locked initially: true | Unlocked after upgrade: true
✓ [PASS] T3.4 [Clinical Context] Note field mutation updates state and re-renders dependent views
    ↳ Initial note present: true | Updated matches: true
✓ [PASS] T3.5 [Scribe->Scrubber] sendToPhiScrubber dispatches raw transcript into scrubber pipeline
    ↳ Payload received in scrubberInputText: true
✓ [PASS] T3.6 [Scribe->EHR] insertToEhr appends synthesized clinical findings into active EHR chart
    ↳ Addendum appended to assessment: true
✓ [PASS] T3.7 [Context->Scrubber] 18 Safe Harbor engine masks all patient identifiers in active chart
    ↳ Source ePHI verified: true | Tokens verified: [NAME], [DATE], [PHONE]
✓ [PASS] T3.8 [Stripe+Context] createCheckoutSession dispatches to backend and updates local subscription state
    ↳ Session ID: cs_test_simulated_40ab98... | Updated Tier: group
✓ [PASS] T3.9 [Auth Lifecycle] Sign-out completely purges session and relocks protected routes
    ↳ Storage purged: true | Immediate relock verified: true
✓ [PASS] T3.10 [Workflow Flow] Continuous multi-tool navigation sequence traverses all 4 clinical workspaces cleanly
    ↳ 5-step cross-application traversal verified without runtime errors: true

--------------------------------------------------------------------
  Tier 3 Cross-Feature Combinations Summary
  Passed: 10 | Failed: 0 | Total: 10 (1.80s)
--------------------------------------------------------------------


▶ Executing Tier 4: Real-World Clinical Scenarios...
  Description: End-to-end clinical encounter journeys from intake to de-identification
  ──────────────────────────────────────────────────────────────────
====================================================================
   E2E Tier 4: Real-World Clinical Workload Scenarios Test Suite    
====================================================================

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
--- Scenario 1: Complete Patient Intake to Note Finalization & EHR Commit ---
✓ [PASS] Scenario 1: End-to-end patient encounter workflow from intake login to SOAP synthesis and EHR chart commit
    ↳ Auth: true | Hero: true | Scribe: true | Transcript: true | SOAP: true | EHR: true

--- Scenario 2: Telehealth Session with Live Scribe & CPT Code Reconciliation ---
✓ [PASS] Scenario 2: Telehealth session verification with live acoustic diarization and CPT 90837 reconciliation
    ↳ WebRTC Room: true | CPT Encounter: true | Scribe Active: true | Reconciled: true

--- Scenario 3: Complex Multi-Diagnosis Encounter with Aura Copilot Assistance ---
✓ [PASS] Scenario 3: Multi-specialty clinical decision support encounter with real-time DSM-5 copilot guidance
    ↳ Studio: true | Differential: true | DSM-5 criteria: true | Multi-patient adaptation: true

--- Scenario 4: Statutory HIPAA 18 Safe Harbor Redaction & Forensic Audit Export ---
✓ [PASS] Scenario 4: Complete HIPAA statutory 18 Safe Harbor de-identification and zero-leak verification
    ↳ Scrubber: true | Safe Harbor Active: true | Source ePHI: true | Masked tokens: true

--- Scenario 5: Full Practice Subscription Lifecycle & Commercial Billing Flow ---
✓ [PASS] Scenario 5: Commercial subscription lifecycle, annual tier checkout, and active license verification
    ↳ Catalog: true | Checkout Session: cs_test_simulated_7f6a... | Status: active

--------------------------------------------------------------------
  Tier 4 Real-World Workload Scenarios Summary
  Passed: 5 | Failed: 0 | Total: 5 (0.84s)
--------------------------------------------------------------------


Terminating test server...
✓ Test server shutdown cleanly.

╔══════════════════════════════════════════════════════════════════════════╗
║                         E2E TEST HARNESS SUMMARY                         ║
╠══════════════════════════════════════════════════════════════════════════╣
║  [✓ PASS] Tier 1  : Feature Coverage                 (6.68s)            ║
║  [✓ PASS] Tier 2  : Boundary & Corner Cases          (4.95s)            ║
║  [✓ PASS] Tier 3  : Cross-Feature Combinations       (4.29s)            ║
║  [✓ PASS] Tier 4  : Real-World Clinical Scenarios    (3.36s)            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Total Suites: 4 | Verdict: ALL TIERS PASSED (100% SUCCESS)     (20.18s) ║
╚══════════════════════════════════════════════════════════════════════════╝

```

#### Command 6: `node tests/e2e/tier4-scenarios.test.mjs` (PASS, Exit 0, 4s)
```
====================================================================
   E2E Tier 4: Real-World Clinical Workload Scenarios Test Suite    
====================================================================

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
--- Scenario 1: Complete Patient Intake to Note Finalization & EHR Commit ---
✓ [PASS] Scenario 1: End-to-end patient encounter workflow from intake login to SOAP synthesis and EHR chart commit
    ↳ Auth: true | Hero: true | Scribe: true | Transcript: true | SOAP: true | EHR: true

--- Scenario 2: Telehealth Session with Live Scribe & CPT Code Reconciliation ---
✓ [PASS] Scenario 2: Telehealth session verification with live acoustic diarization and CPT 90837 reconciliation
    ↳ WebRTC Room: true | CPT Encounter: true | Scribe Active: true | Reconciled: true

--- Scenario 3: Complex Multi-Diagnosis Encounter with Aura Copilot Assistance ---
✓ [PASS] Scenario 3: Multi-specialty clinical decision support encounter with real-time DSM-5 copilot guidance
    ↳ Studio: true | Differential: true | DSM-5 criteria: true | Multi-patient adaptation: true

--- Scenario 4: Statutory HIPAA 18 Safe Harbor Redaction & Forensic Audit Export ---
✓ [PASS] Scenario 4: Complete HIPAA statutory 18 Safe Harbor de-identification and zero-leak verification
    ↳ Scrubber: true | Safe Harbor Active: true | Source ePHI: true | Masked tokens: true

--- Scenario 5: Full Practice Subscription Lifecycle & Commercial Billing Flow ---
✓ [PASS] Scenario 5: Commercial subscription lifecycle, annual tier checkout, and active license verification
    ↳ Catalog: true | Checkout Session: cs_test_simulated_5a4d... | Status: active

--------------------------------------------------------------------
  Tier 4 Real-World Workload Scenarios Summary
  Passed: 5 | Failed: 0 | Total: 5 (1.64s)
--------------------------------------------------------------------

```

#### Command 7: `npm run test:challenger:m2` (PASS, Exit 0, 5s)
```

> clinical-saas-platform@1.0.0 test:challenger:m2
> tsx tests/challenger-m2-empirical-audit.ts

====================================================================
   EMPIRICAL CHALLENGER: Milestone 2 Adversarial Stress Suite      
====================================================================

Starting test server on port 3988...
Server online at http://127.0.0.1:3988

--- PART 1: POST /api/create-checkout-session Fuzzing & Boundaries ---
✓ [API Fuzzing (planId)] null planId
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] undefined planId (defaults to pro)
    ↳ HTTP 200 (Expected 200). Body: {"sessionId":"cs_test_simulated_4b586fab2034467182f1a4732fb06a07","url
✓ [API Fuzzing (planId)] empty string planId (defaults to pro)
    ↳ HTTP 200 (Expected 200). Body: {"sessionId":"cs_test_simulated_ab6985394e994d569c19a2323110a617","url
✓ [API Fuzzing (planId)] whitespace only ("   ")
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] padded planId ("  starter  ")
    ↳ HTTP 200 (Expected 200). Body: {"sessionId":"cs_test_simulated_9e4b756593e64d3d97f43c5ac73ccd49","url
✓ [API Fuzzing (planId)] uppercase planId ("PRO")
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] array of strings (["pro"])
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] array of objects
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] object { id: "pro" }
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] boolean true
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] boolean false
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] number 0
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] number 99
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] SQL injection "starter' OR 1=1--"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] XSS payload "<script>alert(1)</script>"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Path traversal "../../../../etc/passwd"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Null byte injection "starter\0"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Unicode emoji "🏥"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Prototype property "toString"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Prototype property "valueOf"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Prototype property "constructor"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Prototype property "__proto__"
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou
✓ [API Fuzzing (planId)] Massive string (10,000 chars)
    ↳ HTTP 400 (Expected 400). Body: {"error":"Invalid planId provided","validPlans":["starter","pro","grou

--- PART 1.2: billingCycle Fuzzing ---
✓ [API Fuzzing (billingCycle)] valid "monthly"
    ↳ Amount: $99 (Expected $99)
✓ [API Fuzzing (billingCycle)] valid "annual" (20% discount applied: $948/yr)
    ↳ Amount: $948 (Expected $948)
✓ [API Fuzzing (billingCycle)] invalid "weekly" (should fallback to monthly)
    ↳ Amount: $99 (Expected $99)
✓ [API Fuzzing (billingCycle)] invalid "lifetime" (should fallback to monthly)
    ↳ Amount: $99 (Expected $99)
✓ [API Fuzzing (billingCycle)] numeric cycle (12)
    ↳ Amount: $99 (Expected $99)
✓ [API Fuzzing (billingCycle)] boolean cycle (true)
    ↳ Amount: $99 (Expected $99)
✓ [API Fuzzing (billingCycle)] null cycle
    ↳ Amount: $99 (Expected $99)

--- PART 1.3: Oversized Payloads & Body Parser Stress ---
✓ [Payload Size Stress] 50KB Payload (under default limit)
    ↳ HTTP 200
✓ [Payload Size Stress] 500KB Payload (exceeds default limit, returns 413)
    ↳ HTTP 413 (Expected 413)
✓ [Payload Size Stress] 5MB Payload Boundary Rejection
    ↳ HTTP 413

--- PART 1.4: Probing Session Verification Endpoint ---
✓ [Session Verification] Valid Session Retrieval from Registry
    ↳ status=200, tier=starter, isSubscribed=true
✓ [Session Verification] Uncreated Session with "cs_test_" Prefix Probing
    ↳ Server safely rejected uncreated session with status 404
✓ [Session Verification] Nonexistent Session (without test prefix) returns 404
    ↳ HTTP 404 (Expected 404)
✓ [Session Verification] Path Traversal Probe in sessionId
    ↳ HTTP 404

--- PART 1.5: SessionStore LRU Eviction & Bound Stress ---
Flooding 1,100 sessions to test 1,000 capacity eviction...
✓ [Session Registry Capacity] Recent Session Retention After 1,100 Insertions
    ↳ Newest session retained with tier='starter'
✓ [Session Registry Capacity] Evicted Session Fallback Behavior
    ↳ Oldest session state preserved or handled gracefully.

====================================================================
--- PART 2: Client Subscription Gate, URL Bypass & ePHI Leakage ---
====================================================================

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
--- PART 2.1: ePHI Leakage on /dashboard for Unsubscribed Users ---
✓ [ePHI Protection] Unsubscribed Clinician on /dashboard (DashboardHome)
    ↳ Zero ePHI exposed on /dashboard for unsubscribed users.

--- PART 2.2: Practice Operations Routes Gating & ePHI Leakage ---
✓ [Access Gating & ePHI] Client Roster (/dashboard/clients)
    ↳ Properly locked behind SubscriptionGate
✓ [Access Gating & ePHI] Appointment Calendar (/dashboard/calendar)
    ↳ Properly locked behind SubscriptionGate
✓ [Access Gating & ePHI] Billing & Invoicing (/dashboard/billing)
    ↳ Properly locked behind SubscriptionGate
✓ [Access Gating & ePHI] Practice Settings (/dashboard/settings)
    ↳ Properly locked behind SubscriptionGate

--- PART 2.3: URL Query Parameter Lock Screen Bypass Probing ---
✓ [URL Parameter Tampering] Bypass on Clinical AI Scribe v2 via URL Params (status=success&session_id=cs_fake_bypass_session_9999)
    ↳ Gate resisted query parameter tampering.
✓ [URL Parameter Tampering] Bypass on Aura Assistant Copilot via URL Params (status=success&plan=pro)
    ↳ Gate resisted query parameter tampering.
✓ [URL Parameter Tampering] Bypass on Clinical EHR & Telehealth via URL Params (status=success&session_id=cs_unverified_mock_123&plan=starter)
    ↳ Gate resisted query parameter tampering.

--- PART 2.4: Storage Corruption & Default Status Boundaries ---
✓ [Storage Parsing Logic] Unhandled status ("expired") defaults to "active" in getStoredSubscription
    ↳ Expired status parsed safely.
✓ [Storage Parsing Logic] Unhandled status ("unpaid") defaults to "active" in getStoredSubscription
    ↳ Unpaid status parsed safely.
✓ [Trial Expiration Gating] Expired Free Trial Gating (trialDaysRemaining: 0, past renewal date)
    ↳ Expired trial was locked appropriately.

--- PART 2.5: Trial Activation & Cancellation Lifecycles ---
✓ [Trial Lifecycle] 1-Click Trial Activation Flow
    ↳ Gate locked initially: true, status mutated to 'trialing', gate dismantled: true
✓ [Cancellation Lifecycle] User-Facing Subscription Cancellation CTA in Pricing/Subscription UI
    ↳ Found user-facing cancellation button in Subscription page.

--- PART 2.6: Sign-Out Isolation & Session Clearing ---
✓ [Session Isolation] Subscription State Clearing on Clinician Logout
    ↳ Subscription state cleared cleanly on logout.

Terminating test server...

====================================================================
   EMPIRICAL CHALLENGER AUDIT SUMMARY                             
====================================================================

Total Checks Run: 53
Passed: 53
Critical Vulnerabilities: 0
High Vulnerabilities: 0
Medium Warnings: 0
--------------------------------------------------------------------
VERDICT: APPROVE
```

#### Command 8: `npm run test:stripe` (PASS, Exit 0, 1s)
```

> clinical-saas-platform@1.0.0 test:stripe
> node scripts/verify-stripe-checkout.mjs

====================================================================
   Clinical Telehealth & AI Scribe SaaS — Stripe Checkout Audit    
   Milestone 2 Acceptance Criterion AC3 & §R2 Verification         
====================================================================

Launching ephemeral server on test port 3942...
✓ Ephemeral server online at http://127.0.0.1:3942

--- Phase 1: API Health & Preflight Inspection ---
✓ [PASSED] GET /api/health Status & Stripe Service Flag
    ↳ status=200, uptime=0.4s, sandboxMode=true

--- Phase 2: Checkout Session Creation Across All 3 Tiers ---
✓ [PASSED] POST /api/create-checkout-session [Tier: starter]
    ↳ sessionId=cs_test_simulated_0c1727..., amount=$49, url=http://127.0.0.1:3942/dashboard/subscription?...
✓ [PASSED] POST /api/create-checkout-session [Tier: pro]
    ↳ sessionId=cs_test_simulated_8659b8..., amount=$99, url=http://127.0.0.1:3942/dashboard/subscription?...
✓ [PASSED] POST /api/create-checkout-session [Tier: group]
    ↳ sessionId=cs_test_simulated_68953e..., amount=$249, url=http://127.0.0.1:3942/dashboard/subscription?...

--- Phase 3: Billing Cycle Handling (Monthly & Annual) ---
✓ [PASSED] POST /api/create-checkout-session with annual billingCycle
    ↳ billingCycle=annual, sessionId=cs_test_simulated_dc1345...

--- Phase 4: Default Fallback Verification ---
✓ [PASSED] Omitted planId defaults to Clinician Pro ($99)
    ↳ Resolved plan: Clinician Pro
✓ [PASSED] Empty string planId ("") defaults to Clinician Pro
    ↳ Resolved plan: Clinician Pro

--- Phase 5: URL Configuration & Email Forwarding ---
✓ [PASSED] Custom URLs and clinicianEmail accepted cleanly
    ↳ sessionId=cs_test_simulated_be2929...

--- Phase 6: Boundary & Adversarial Input Rejection (HTTP 400) ---
✓ [PASSED] Negative Test: Invalid string tier ("enterprise_ultra")
    ↳ status=400, error="Invalid planId provided"
✓ [PASSED] Negative Test: SQL injection string ("starter' OR '1'='1")
    ↳ status=400, error="Invalid planId provided"
✓ [PASSED] Negative Test: Numeric planId (99999)
    ↳ status=400, error="Invalid planId provided"
✓ [PASSED] Negative Test: Object injection ({ tier: "pro" })
    ↳ status=400, error="Invalid planId provided"
✓ [PASSED] Negative Test: Prototype key probe ("constructor")
    ↳ status=400, error="Invalid planId provided"

--- Phase 7: Session Verification Endpoint Audit ---
✓ [PASSED] GET /api/subscription/session/:sessionId [Valid Session]
    ↳ status=complete, paymentStatus=paid, isSubscribed=true, tier=pro
✓ [PASSED] GET /api/subscription/session/:sessionId [Nonexistent 404]
    ↳ status=404 (Expected 404)

====================================================================
Stripe Audit Summary: 15 Passed, 0 Failed (Total: 15)
====================================================================

✓ [AC3 CERTIFIED] Stripe subscription checkout initialization and session verification fully operational.
```

#### Command 9: `npm run test:subscription` (PASS, Exit 0, 4s)
```

> clinical-saas-platform@1.0.0 test:subscription
> node scripts/verify-subscription-gate.mjs

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
====================================================================
   Clinical Telehealth & AI Scribe SaaS — Subscription Gate Audit  
   Milestone 2 Acceptance Criteria §R2 & §AC3 Verification         
====================================================================

--- Phase 1: Probing Clinical Routes for Unsubscribed Clinicians ---
✓ [PASSED] Gate Lock on /dashboard/ehr (Clinical EHR & Telehealth)
    ↳ LockOverlay: YES, SubscribeBtn: YES, TrialBtn: YES, Leaked ePHI: NONE
✓ [PASSED] Gate Lock on /dashboard/scribe (Clinical AI Scribe v2)
    ↳ LockOverlay: YES, SubscribeBtn: YES, TrialBtn: YES, Leaked ePHI: NONE
✓ [PASSED] Gate Lock on /dashboard/aura (Aura Assistant Copilot)
    ↳ LockOverlay: YES, SubscribeBtn: YES, TrialBtn: YES, Leaked ePHI: NONE
✓ [PASSED] Gate Lock on /dashboard/phi-scrubber (HIPAA PHI Scrubber)
    ↳ LockOverlay: YES, SubscribeBtn: YES, TrialBtn: YES, Leaked ePHI: NONE

--- Phase 2: Verifying Commercial Pricing Page is Ungated ---
✓ [PASSED] Ungated Pricing Table Access (/dashboard/subscription)
    ↳ 3 Tiers ($49, $99, $249): YES, Billing Cycle Toggle: YES, Sandbox: YES

--- Phase 3: Instant Free Trial Activation via Gate Bypass ---
✓ [PASSED] 1-Click Free Trial Activation Unlocks Workspace
    ↳ status in localStorage="trialing", Gate Dismantled=true, Scribe Mounted=true, Badge=TRIAL

--- Phase 4: Starter Tier Gating vs Pro Gating Verification ---
✓ [PASSED] Starter Tier: Permitted Access to Clinical EHR (/dashboard/ehr)
    ↳ Gate locked: false
✓ [PASSED] Starter Tier: Permitted Access to PHI Scrubber (/dashboard/phi-scrubber)
    ↳ Gate locked: false
✓ [PASSED] Starter Tier: Strictly Gated from Aura Assistant (Requires Pro Upgrade)
    ↳ Lock Overlay Present: true, Sidebar Upgrade Badge: true
✓ [PASSED] Starter Tier: Strictly Gated from Clinical AI Scribe v2 (Requires Pro Upgrade)
    ↳ Lock Overlay Present: true, Sidebar Upgrade Badge: true

--- Phase 5: Header & Sidebar Tier Badge State Synchronization ---
✓ [PASSED] Tier Badge Display [NONE : PRO]
    ↳ Header="UNSUBSCRIBED", Sidebar="UNSUBSCRIBED", Expected="UNSUBSCRIBED"
✓ [PASSED] Tier Badge Display [TRIALING : PRO]
    ↳ Header="TRIAL", Sidebar="TRIAL", Expected="TRIAL"
✓ [PASSED] Tier Badge Display [ACTIVE : STARTER]
    ↳ Header="STARTER", Sidebar="STARTER", Expected="STARTER"
✓ [PASSED] Tier Badge Display [ACTIVE : PRO]
    ↳ Header="PRO CLINICIAN", Sidebar="PRO CLINICIAN", Expected="PRO CLINICIAN"
✓ [PASSED] Tier Badge Display [ACTIVE : GROUP]
    ↳ Header="PRACTICE GROUP", Sidebar="PRACTICE GROUP", Expected="PRACTICE GROUP"

--- Phase 6: Pricing Table Billing Cycle Toggle & 20% Discount ---
✓ [PASSED] Annual Billing Switcher (20% Discount: $39, $79, $199)
    ↳ Starter $39: true, Pro $79: true, Group $199: true, Save 20%: true

--- Phase 7: Checkout Return URL Parameter Subscription Activation ---
[Subscription] Checkout confirmed: tier=group, session=cs_test_mock_return_99182
✓ [PASSED] Return URL (?status=success) Activates Subscription
    ↳ localStorage status="active", tier="group", Success Banner Rendered=true

====================================================================
Subscription Gate Audit Summary: 17 Passed, 0 Failed (Total: 17)
====================================================================

✓ [AC3 & §R2 CERTIFIED] Subscription access gating, trial bypass, tier privileges, and billing operational.
```

#### Command 10: `npm run test:security` (PASS, Exit 0, 4s)
```

> clinical-saas-platform@1.0.0 test:security
> node scripts/adversarial-security-audit.mjs

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
========================================================================
   CHALLENGER 1: ADVERSARIAL AUTH & ROUTE GUARD STRESS HARNESS        
   Target: Milestone 1 Core Foundation & Auth Shell                  
========================================================================

--- Suite 1: Clean Unauthenticated Route Probing (Empty Storage) ---

--- Suite 2: Storage Corruption & Parsing Crash Resilience ---

--- Suite 3: Adversarial Route Bypass via Session Forgery ---

--- Suite 4: Query Parameter Injection & Open Redirect Probing ---

--- Suite 5: Legitimate Demo Clinician Authentication Verification ---

========================================================================
                      HARNESS EXECUTION SUMMARY                         
========================================================================

✓ [PASS] [S1-/dashboard] Unauthenticated Access: /dashboard
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/ehr] Unauthenticated Access: /dashboard/ehr
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/scribe] Unauthenticated Access: /dashboard/scribe
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/aura] Unauthenticated Access: /dashboard/aura
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/phi-scrubber] Unauthenticated Access: /dashboard/phi-scrubber
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/calendar] Unauthenticated Access: /dashboard/calendar
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/clients] Unauthenticated Access: /dashboard/clients
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/billing] Unauthenticated Access: /dashboard/billing
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/subscription] Unauthenticated Access: /dashboard/subscription
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/settings] Unauthenticated Access: /dashboard/settings
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/ehr/patients/p-101/notes] Unauthenticated Access: /dashboard/ehr/patients/p-101/notes
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S1-/dashboard/scribe?encounter=enc_99214&patient=101] Unauthenticated Access: /dashboard/scribe?encounter=enc_99214&patient=101
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-corrupt-json] Storage Crash Resilience: Malformed unclosed JSON
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-non-json] Storage Crash Resilience: Raw string token
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-primitive-number] Storage Crash Resilience: JSON number primitive
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-primitive-bool] Storage Crash Resilience: JSON boolean true
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-empty-obj] Storage Crash Resilience: Empty JSON object
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-null-keys] Storage Crash Resilience: Null user and session keys
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-user-without-session] Storage Crash Resilience: User object missing session
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S2-session-without-user] Storage Crash Resilience: Session object missing user
    ↳ Path: /login | Leaked ePHI: None | Crash: None
✓ [PASS] [S3-attack-string-user] Attack: Forged string user property ({"user": "attacker", "session": "dummy"})
    ↳ Path: /login | ePHI Leaked: None | Bypassed Guard: NO
✓ [PASS] [S3-attack-arbitrary-object] Attack: Forged arbitrary user ID ({"user": {"id": "unauthorized-intruder"}, "session": {"access_token": "fake"}})
    ↳ Path: /login | ePHI Leaked: None | Bypassed Guard: NO
✓ [PASS] [S3-attack-expired-token] Attack: Expired session token (expires_at: 100 [Year 1970])
    ↳ Path: /login | ePHI Leaked: None | Honored Expired Token: NO
✓ [PASS] [S4-open-redirect-crash] Attack: External navigation via ?redirect=https://evil-phishing.com
    ↳ Crash Thrown: NO (Gracefully Handled)
✓ [PASS] [S4-javascript-uri] Attack: Javascript URI via ?redirect=javascript:alert(1)
    ↳ Crash Thrown: NO (Gracefully Handled)
✓ [PASS] [S5-legitimate-demo] Legitimate: Official Demo Clinician Session (Dr. Sarah Chen, MD)
    ↳ Path: /dashboard | Doctor: true | Patient: true

========================================================================
TOTAL TESTS: 26 | PASSED: 26 | FAILED: 0
========================================================================

VERDICT: APPROVE
```

#### Command 11: `npm run test:auth` (PASS, Exit 0, 3s)
```

> clinical-saas-platform@1.0.0 test:auth
> node scripts/verify-auth-redirect.mjs

[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.
====================================================================
   Clinical Telehealth & AI Scribe SaaS — Auth Redirection Audit   
   Target: ProtectedRoute Gate & Dual-Engine Session Management     
====================================================================

--- Phase 1: Probing Protected Routes with Empty Session ---
✓ [PASSED] Route /dashboard
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/ehr
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fehr
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/scribe
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fscribe
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/aura
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Faura
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/phi-scrubber
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fphi-scrubber
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/calendar
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fcalendar
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/clients
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fclients
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/billing
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fbilling
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/subscription
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fsubscription
    ↳ Confidential Content Leaked: NO (Protected)
✓ [PASSED] Route /dashboard/scribe?encounter=enc_99214&patient=101
    ↳ Blocked & Redirected to: /login?redirect=%2Fdashboard%2Fscribe%3Fencounter%3Denc_99214%26patient%3D101
    ↳ Confidential Content Leaked: NO (Protected)

--- Phase 2: Verifying 1-Click Demo Clinician Sign-In ---
✓ Initial unauthenticated redirect to /login verified.
✓ Found #demo-clinician-signin-btn on Login screen.
✓ [PASSED] 1-Click Demo Clinician Sign-In
    ↳ Session Persisted in localStorage: YES (clinical_saas_session)
    ↳ Returned to Target Route: /dashboard/scribe?patient=101
    ↳ Clinician Identity Rendered: Dr. Sarah Chen, MD
    ↳ AI Scribe Workspace Unlocked: YES

--- Phase 3: Verifying Direct Authenticated Session Access ---
✓ [PASSED] Direct Access with Persisted Session
    ↳ Pathname: /dashboard (Not Redirected)
    ↳ Command Center Rendered: YES
    ↳ Active Patient Jane Doe: YES

====================================================================
Audit Summary: 12 Passed, 0 Failed
====================================================================

✓ ALL AUTHENTICATION AND ROUTE GUARD CHECKS PASSED WITH 100% SUCCESS.
```

#### Command 12: `npm run build` (PASS, Exit 0, 6s)
```

> clinical-saas-platform@1.0.0 build
> tsc --noEmit && vite build

vite v6.4.3 building for production...
transforming...
✓ 3034 modules transformed.
rendering chunks...
[plugin vite:reporter] 
(!) /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/data/theraflow-store.ts is dynamically imported by /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/lib/clinical-context.tsx but also statically imported by /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/AuditLogsView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/BillingView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/CalendarView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/ClientProfileView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/ClientsView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/DAPNotesView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/TelehealthView.tsx, /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/src/tools/theraflow/TreatmentPlanView.tsx, dynamic import will not move module into another chunk.

computing gzip size...
dist/index.html                                                1.05 kB │ gzip:   0.57 kB
dist/assets/geist-cyrillic-ext-wght-normal-DjL33-gN.woff2      7.42 kB
dist/assets/geist-vietnamese-wght-normal-6IgcOCM7.woff2        8.00 kB
dist/assets/geist-cyrillic-wght-normal-BEAKL7Jp.woff2         15.08 kB
dist/assets/geist-latin-ext-wght-normal-DC-KSUi6.woff2        16.51 kB
dist/assets/geist-latin-wght-normal-BgDaEnEv.woff2            29.40 kB
dist/assets/index-UPxaWvYO.css                               115.63 kB │ gzip:  19.72 kB
dist/assets/vendor-react-CccpTWbb.js                          52.37 kB │ gzip:  18.46 kB
dist/assets/vendor-ui-Dx-g8jaf.js                             64.32 kB │ gzip:  16.48 kB
dist/assets/index-DxWEP3fv.js                              1,394.85 kB │ gzip: 361.13 kB
✓ built in 3.18s
```

