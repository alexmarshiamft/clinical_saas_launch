## 2026-10-05T07:12:33Z

You are Worker M5 (teamwork_preview_worker).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m5
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md
The E2E test certification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/TEST_READY.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INSTRUCTION ON HANDOFF DOCUMENTATION INTEGRITY:
In your handoff report (`handoff.md`), Section 1.2 MUST contain the 100% LITERAL, VERBATIM terminal output copied directly from running each verification command (redirect outputs directly to log files: `npm run <cmd> > /tmp/<file>.log 2>&1`). DO NOT edit, rewrite, or make up test names. Every single line in Section 1.2 must be the exact text produced by the test runner.

Scope & Task:
Implement Milestone 5: Aura Assistant & HIPAA PHI Scrubber Integration across Features 19, 20, 21, 22, 23, 24, 25, and 26.
Read the comprehensive blueprints prepared by the 3 Explorers:
- Explorer 1 (Aura Studio, Floating Orb, Visualizer, Shadow DOM): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m5_1/report.md
- Explorer 2 (HIPAA PHI Scrubber 18 Safe Harbor, Diff Viewer, Audit Table): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m5_2/report.md
- Explorer 3 (Cross-Tool Pipelines, Routing & E2E Invariant Preservation): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m5_3/report.md
- Canonical Aura source: /Users/alexandermarshi/Documents/antigravity/aura-extension
- Canonical PHI Scrubber source: /Users/alexandermarshi/phi_scrubber

Deliverables to Implement:
1. `src/tools/aura/` (Features 19, 20, 21, 22):
   - `types.ts`: TypeScript contracts for Aura entities, DSM-5 criteria, snippet chips, dictation states, and typewriter notes.
   - `data/dsm5-database.ts`: Real clinical criteria database for GAD-7, MDD, PTSD, ADHD, Bi-polar, Somatic symptom disorders with ICD-10 links and recommended clinical interventions.
   - `AuraVisualizer.tsx`: Pure CSS / dynamic SVG audio visualizer with 5 pulsating bars (safe from canvas/JSDOM context crashes).
   - `AuraDictation.tsx`: Dictation controls (Record, Pause, Stop), audio device selector, simulation mode fallback for automated tests.
   - `TypewriterSoap.tsx`: Realistic typewriter streaming animation for SOAP note generation with 1-click `insertToEhr()` and `sendToPhiScrubber()` buttons.
   - `AuraStudio.tsx`: Fullscreen clinical decision support studio preserving all exact E2E test strings:
     - `"Aura Assistant Studio"`
     - `"Copilot Standby"`
     - `"Diagnostic Differential Assistant: "` + patient name
     - `"CPT: "` + patient cptCode
     - `"DSM-5 symptom markers"`
     - `"ICD-10 diagnostic codes"`
     - `"clinical interventions"`
   - `AuraFloatingOrb.tsx`: Draggable, toggleable floating action orb (56px radial/conic gradient) mounted in `AppLayout.tsx`, accessible across all views with `Alt + A` shortcut.
   - `aura-shadow.css`: Clean, scoped styles strictly encapsulated to eliminate CSS bleed. Must pass `node scripts/verify-css-bleed.mjs` with 0 bleed errors.
2. `src/tools/phi-scrubber/` (Features 23, 24, 25):
   - `types.ts`: Scrubber types, entity taxonomy, masking styles (`tag`, `block`, `asterisk`), confidence thresholds.
   - `safeHarborRules.ts`: Full TypeScript implementation of all 18 statutory HIPAA Safe Harbor regexes:
     1. Names (first, last, full names, clinician names)
     2. Geographic subdivisions (street address, city, state, ZIP codes)
     3. Dates (birth dates, admission dates, discharge dates, encounter dates, MM/DD/YYYY, YYYY-MM-DD, month words)
     4. Telephone numbers
     5. Fax numbers
     6. Email addresses
     7. Social Security numbers (SSN)
     8. Medical Record numbers (MRN: #MC-xxxxx, MRN-xxxxx)
     9. Health plan beneficiary numbers
     10. Account numbers
     11. Certificate / license numbers (e.g. NPI, state license)
     12. Vehicle identifiers and serial numbers (VIN, plates)
     13. Device identifiers and serial numbers
     14. Web URLs
     15. IP addresses (IPv4 & IPv6)
     16. Biometric identifiers
     17. Full-face photos
     18. Any other unique identifying number
   - `engine.ts`: Scrubber engine using greedy interval scheduling to prevent overlapping match corruption, scoring confidence (0.0 to 1.0), character offsets, and applying the 3 masking styles: `tag` (`[NAME]`, `[DATE]`, `[PHONE]`, etc.), `block` (`████████`), `asterisk` (`********`).
   - `DiffViewer.tsx`: Synchronized dual-pane diff viewer: Unredacted Source pane vs Redacted Clean pane with entity highlights.
   - `AuditTable.tsx`: Forensic audit dashboard with metric cards, taxonomy table with start/end offsets, confidence scores, and JSON/CSV export.
   - `PhiScrubberView.tsx`: Main view mounting at `/dashboard/phi-scrubber` preserving all E2E test strings:
     - `"HIPAA PHI Scrubber"` / `"18 Safe Harbor Active"`
     - Unredacted source pane and clean pane
     - Exact masks: `[NAME]`, `[DATE]`, `[PHONE]`
     - 1-click copy clean text with clipboard toast feedback.
3. Feature 26: Cross-Tool Clinical Pipeline & App Integration:
   - In `src/lib/clinical-context.tsx`:
     - Update `sendToPhiScrubber(text: string)`: sets `scrubberInputText` and dispatches `clinical:send-to-phi-scrubber` event without calling `useNavigate()` directly (preventing router invariant crashes in headless test environments like T3.5).
     - Update `insertToEhr(note: EhrNoteInput)`: polymorphic signature accepting string addenda (preserving `T3.6` assertion `assessment.includes(originalAssessment) && assessment.includes(newClinicalFinding)`) or structured note objects, asynchronously updating DAP/SOAP notes in TheraFlow's active store.
   - In `src/App.tsx`:
     - Register routes `/dashboard/aura` and `/dashboard/aura/*` wrapped in `<SubscriptionGate requiredTier="starter">`.
     - Register routes `/dashboard/phi-scrubber` and `/dashboard/phi-scrubber/*` wrapped in `<SubscriptionGate requiredTier="starter">`.
   - In `src/components/layout/Header.tsx` & `Sidebar.tsx`:
     - Preserve `header a[href="/dashboard/aura"]` with text `Aura Copilot` (required by `T1.6.4`).
     - Add PHI Scrubber navigation launcher link.
     - Mount `<AuraFloatingOrb />` in `AppLayout.tsx`.
     - Ensure Aura is unlocked for `starter` tier in `Sidebar.tsx`.
4. Milestone 5 Automated Test Suite:
   - Author `tests/m5-aura-scrubber.test.ts` verifying all Features 19–26 (Aura studio mounting, DSM-5 criteria, floating orb, audio visualizer, typewriter SOAP, 18 Safe Harbor regexes, all 3 masking styles, confidence scoring, diff view, forensic audit table, cross-tool pipeline bridges, and zero CSS bleed).
   - Add `"test:aura": "tsx tests/m5-aura-scrubber.test.ts"` to `package.json`.
5. Update `scripts/verify-css-bleed.mjs`:
   - Include `src/tools/aura/aura-shadow.css` in CSS bleed verification to ensure zero global leakage.

Verification Requirements:
1. `npm run test:aura` (all tests pass, Exit 0)
2. `node scripts/verify-css-bleed.mjs` (0 bleed errors, Exit 0)
3. `npm run test:scribe` (61/61 PASS, Exit 0)
4. `npm run test:ehr` (30/30 PASS, Exit 0)
5. `npm run test:e2e` (80/80 PASS across all 4 tiers, Exit 0)
6. `node tests/e2e/tier4-scenarios.test.mjs` (5/5 PASS, Exit 0)
7. `npm run test:challenger:m2` (53/53 PASS, Exit 0)
8. `npm run test:stripe` (15/15 PASS, Exit 0)
9. `npm run test:subscription` (17/17 PASS, Exit 0)
10. `npm run test:security` (26/26 PASS, Exit 0)
11. `npm run test:auth` (12/12 PASS, Exit 0)
12. `npm run build` (clean build, 0 TS compiler errors, Exit 0)
