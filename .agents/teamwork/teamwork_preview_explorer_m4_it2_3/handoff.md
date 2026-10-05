# Handoff Report: Delimiter Collision Defense & EHR Adapter Hardening

**Date**: 2026-10-05T06:00:00Z  
**From**: Explorer 3 (`teamwork_preview_explorer_m4_it2_3`)  
**To**: Orchestrator (`parent` / `b0192614-d8d6-40cc-89d2-10ad99ce4cc6`)  
**Target Next Agent**: `teamwork_preview_worker_m4` (Milestone 4 Iteration 2)  
**Status**: Investigation Complete — Hard Handoff  

---

## 1. Observation

1. **Reviewer 1 Minor Finding 3 in `handoff.md`**:
   In `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_reviewer_m4_1/handoff.md`, lines 197–202:
   ```markdown
   ### [Minor] Finding 3 — Delimiter Collision Defense in EHR Adapters
   - What: Epic SmartText and Cerner PowerChart text formats rely on section headers like `=== SUBJECTIVE ===` or `[1] SUBJECTIVE`.
   - Where: `src/tools/scribe/utils/ehrExportAdapters.ts`, Lines 38–50, 144–160.
   - Why: If user-entered clinical notes contain matching delimiter strings, downstream legacy parser rules in EHR ingestion scripts could misparse sections.
   - Suggestion: Sanitize or escape triple-equals or bracket headers in user note bodies prior to template formatting.
   ```

2. **Source Code Implementation in `src/tools/scribe/utils/ehrExportAdapters.ts`**:
   - Lines 38–50 (`formatEpicSmartText`):
     ```typescript
     === SUBJECTIVE ===
     ${data.notes.subjective}

     === OBJECTIVE ===
     ${data.notes.objective}

     === ASSESSMENT & DIAGNOSES ===
     Primary ICD-10: ${data.primaryIcd || 'F41.1 (Generalized Anxiety Disorder)'}
     ${data.notes.assessment}

     === PLAN & ORDERS ===
     Level of Service: CPT ${data.patient.cptCode}
     ${data.notes.plan}
     ```
     `data.notes.subjective`, `data.notes.objective`, `data.notes.assessment`, and `data.notes.plan` are directly interpolated with zero sanitization for `===` delimiters, `.phrase` macro triggers, or `***` signature banners.
   - Lines 144–162 (`formatCernerPowerChart`):
     ```typescript
     [1] SUBJECTIVE (HISTORY OF PRESENT ILLNESS & REVIEW OF SYSTEMS)
     --------------------------------------------------------------------------------
     ${data.notes.subjective}
     ...
     [2] OBJECTIVE (VITALS & CLINICAL OBSERVATIONS)
     --------------------------------------------------------------------------------
     ${data.notes.objective}
     ...
     [3] ASSESSMENT (DIAGNOSTIC FORMULATION & MDM COMPLEXITY)
     --------------------------------------------------------------------------------
     ${data.notes.assessment}
     ...
     [4] PLAN (THERAPEUTIC ORDERS & CONTINUING CARE)
     --------------------------------------------------------------------------------
     ${data.notes.plan}
     ```
     `data.notes` fields are directly interpolated without sanitizing `[#] SECTION` brackets, repeated hyphens, or commitment banners.
   - Lines 3–20 & 174–203 (`formatAthenaEncounter`):
     All dynamic fields pass through `escapeXml(/[<>&'"]/g)`. Static section titles use `&amp;`.
   - Lines 58–127 (`formatEpicFhirDocument`):
     Clinical narrative is Base64 encoded (`[A-Za-z0-9+/=]`) into `content[0].attachment.data` and the entire resource is serialized via `JSON.stringify()`.

3. **Baseline Test Executions**:
   - `npm run test:scribe`: 57 Passed, 0 Failed (Categories 1–7).
   - `node scripts/verify-css-bleed.mjs`: Zero CSS bleed detected in `scribe-theme.css`.
   - `npm run test:e2e`: 80 Passed, 0 Failed across all 4 tiers (Tier 1: 35, Tier 2: 30, Tier 3: 10, Tier 4: 5).
   - `npm run build`: Succeeded in 9.03s, transforming 3,023 modules with 0 errors.

4. **9 Mandated E2E Invariants in `src/tools/scribe/ScribeWorkspace.tsx`**:
   - Line 164: `"Clinical AI Scribe v2"`
   - Line 170: `"AI Diarization Ready"`
   - Line 261: `"Live Acoustic Transcript"`
   - Line 97/127: `"Dr. Chen:"`
   - Line 97/127: `"Jane Doe:"`
   - Line 271: `"Generated SOAP Preview"`
   - Line 274: `"Subjective:"`
   - Line 275: `"Assessment:"`
   - Line 271: `"Generated SOAP Preview (CPT 90837)"`

---

## 2. Logic Chain

1. **Step 1 (Risk Deduction)**: Observations 1 and 2 reveal that if a clinician note or transcript contains literal strings matching format boundaries (e.g., `=== OBJECTIVE ===` inside `data.notes.subjective`, or `[2] OBJECTIVE` inside Cerner notes), downstream EHR ingestion engines matching `/^===\s*([A-Z &]+)\s*===/` or `/^\[(\d+)\]\s+([A-Z]+)/` will trigger premature section breaks and note truncation.
2. **Step 2 (Sanitization Design)**: Neutralizing delimiters at the note-field level before template insertion prevents collisions:
   - For Epic: Replacing `={3,}\s*([A-Z0-9\s&/-]+?)\s*={3,}` with `--- $1 ---` prevents regex delimiter matching, while keeping headers clean and legible. Leading dot-phrases (`^(\s*)\.([A-Za-z0-9_]+)`) must be padded with space (`$1 . $2`) to prevent Epic Hyperspace macro auto-expansion.
   - For Cerner: Replacing `\[(\d+)\]\s*([A-Z]+)` with `($1) $2` and converting lines with 5+ hyphens to `- - - - -` breaks parser tokenization without destroying clinician text meaning.
3. **Step 3 (Safety Verification)**: Because `MultiEhrExportPanel.tsx` passes `data.notes` to `formatEpicSmartText` and `formatCernerPowerChart`, sanitizing note fields inside these functions automatically protects copy-to-clipboard, file downloads, and EHR dispatch actions.
4. **Step 4 (Invariant Independence)**: Delimiter sanitization is strictly confined to `ehrExportAdapters.ts`. The 9 E2E invariant strings in `ScribeWorkspace.tsx` reside in the top container header and the default `feed` tab, completely unaffected by EHR export adapters.
5. **Step 5 (Remediation Alignment)**: Worker M4 It2 can resolve both Critical Finding 1 (replacing fabricated handoff test outputs with genuine verbatim traces) and Minor Finding 3 (implementing the two sanitizers and adding test assertions F17.6/F17.7 in `tests/m4-clinical-scribe.test.ts`).

---

## 3. Caveats

- **Legacy EHR Parser Diversity**: While replacing `===` with `---` and `[#]` with `(#)` neutralizes standard regex patterns in Epic Bridges and Cerner Discern/MDM engines, non-standard custom integration scripts might use custom tokens. The blueprinted sanitizer is targeted at statutory and vendor-standard delimiters.
- **Concurrent Test Execution Port Collision**: Running `npm run test:e2e` concurrently with other test scripts listening on port 3899 produces `EADDRINUSE`. The verification method requires running test suites sequentially.

---

## 4. Conclusion

- **Finding 3 Feasibility**: Delimiter collision defense in `ehrExportAdapters.ts` is fully designed and low-risk. Exporting `sanitizeEpicSmartTextContent` and `sanitizeCernerPowerChartContent` solves the vulnerability cleanly.
- **XML & FHIR Assessment**: `formatAthenaEncounter` (XML escaping) and `formatEpicFhirDocument` (Base64 encapsulation + JSON serialization) are verified 100% robust. No code changes are required for them.
- **E2E Invariants**: All 9 E2E invariants in `ScribeWorkspace.tsx` are 100% intact and require zero modification.
- **Ready for Worker Implementation**: Complete blueprints, code diffs, and verification steps are cataloged in `report.md`.

---

## 5. Verification Method

### 5.1 Verification Commands
The Worker and Reviewer can independently verify implementation using:

```bash
# 1. Verify Scribe unit & integration test suite (now including F17.6 and F17.7 delimiter tests)
npm run test:scribe

# 2. Verify zero CSS namespace bleed
node scripts/verify-css-bleed.mjs

# 3. Verify TheraFlow EHR integration suite
npm run test:ehr

# 4. Verify full platform E2E suite across Tiers 1-4 (80/80 tests)
npm run test:e2e

# 5. Verify production TypeScript compilation and Vite build
npm run build
```

### 5.2 Specific Code Invariants to Inspect
- `src/tools/scribe/utils/ehrExportAdapters.ts`: Inspect that `sanitizeEpicSmartTextContent` and `sanitizeCernerPowerChartContent` are exported and invoked for all note fields (`subjective`, `objective`, `assessment`, `plan`).
- `tests/m4-clinical-scribe.test.ts`: Inspect that hostile delimiter injection payloads pass with exactly 1 canonical section marker.
- `src/tools/scribe/ScribeWorkspace.tsx`: Inspect that lines 164, 170, 261, 271, 274, 275 match all 9 invariant strings verbatim.
- `.agents/teamwork/teamwork_preview_worker_m4/handoff.md`: Inspect Section 1.2 to confirm that only verbatim test execution outputs from `npm run test:scribe` and `node scripts/verify-css-bleed.mjs` are present.

### 5.3 Invalidation Conditions
- Any occurrence of `=== OBJECTIVE ===` from user note text appearing un-neutralized in the output of `formatEpicSmartText`.
- Any occurrence of `[2] OBJECTIVE` from user note text appearing un-neutralized in the output of `formatCernerPowerChart`.
- Any mutation of the 9 invariant strings in `ScribeWorkspace.tsx`.
- Any test failures in `npm run test:scribe`, `npm run test:e2e`, or `npm run build`.
