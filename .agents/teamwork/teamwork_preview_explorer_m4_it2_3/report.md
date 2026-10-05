# Investigation Report: Delimiter Collision Defense in Multi-EHR Export Adapters

**Agent**: Explorer 3 (`teamwork_preview_explorer_m4_it2_3`)  
**Target Milestone**: Milestone 4 Iteration 2 (Clinical AI Scribe v2 Hardening)  
**Date**: 2026-10-05T05:58:30Z  
**Scope**: Reviewer 1 Minor Finding 3 (Delimiter Collision Defense in EHR Adapters), XML/FHIR Escaping Robustness, E2E UI Invariant Preservation, and Complete Verification Checklist for Worker M4 It2.

---

## Executive Summary

This investigation analyzed `src/tools/scribe/utils/ehrExportAdapters.ts`, `MultiEhrExportPanel.tsx`, `ScribeWorkspace.tsx`, and the test suites (`tests/m4-clinical-scribe.test.ts`, `tests/challenger-m4-empirical-stress.ts`, and `tests/e2e/tier1-features.test.mjs`).

1. **Root Vulnerability (Minor Finding 3)**: `formatEpicSmartText` and `formatCernerPowerChart` directly interpolated unescaped user clinical note strings (`data.notes.subjective`, `data.notes.objective`, `data.notes.assessment`, `data.notes.plan`) into structured plain-text templates. If a clinician or patient entered strings containing template delimiters (such as `=== OBJECTIVE ===`, `.MARSHI_CLINICAL_NOTE`, `[2] OBJECTIVE`, or 80-hyphen dividers), downstream interface engines (e.g., Epic Bridges, Cerner MDM/FSI, Cloverleaf, Mirth Connect) would misparse section boundaries, truncate notes, or trigger unexpected macro expansions.
2. **Sanitization Blueprint**: Two high-precision sanitization functions (`sanitizeEpicSmartTextContent` and `sanitizeCernerPowerChartContent`) have been blueprinted. They neutralize delimiter collisions, macro dot-phrases, long hyphen dividers, and forged electronic signatures while maintaining 100% human readability for clinicians.
3. **XML & FHIR R4 Robustness**: `escapeXml` in `formatAthenaEncounter` and Base64-encoded `content[0].attachment.data` + `JSON.stringify` in `formatEpicFhirDocument` were verified to be 100% robust against injection, syntax disruption, and XXE attacks.
4. **E2E Invariant Safety**: All 9 mandated E2E invariant strings in `ScribeWorkspace.tsx` remain 100% intact, untouched, and permanently mounted.
5. **Worker M4 It2 Guidance**: A complete step-by-step verification and remediation checklist is provided, including instructions to resolve Critical Finding 1 (replacing fabricated handoff traces with verbatim execution outputs).

---

## 1. Codebase Analysis of EHR Export Adapters

### 1.1 `src/tools/scribe/utils/ehrExportAdapters.ts`

| Adapter Function | Target EHR Standard | Current Delimiter Mechanism | Collision Risk Surface |
|---|---|---|---|
| `formatEpicSmartText` (lines 29–53) | Epic Hyperspace SmartText / Dot-Phrase (`.MARSHI_CLINICAL_NOTE`) | `=== SECTION ===` headers, line-initial `.` dot-phrases, `***` signature block | **High**: Note body containing `=== OBJECTIVE ===` or `.DOT_PHRASE` splits sections prematurely or triggers Epic macro triggers. |
| `formatCernerPowerChart` (lines 132–169) | Oracle Health / Cerner PowerChart Millennium Tagged Text | `[#] SECTION` headers, `------------------------` 80-hyphen dividers, commit banners | **High**: Note body containing `[2] OBJECTIVE` or repeated hyphens misleads regex splitters `/\[\d+\]\s+[A-Z]+/`. |
| `formatAthenaEncounter` (lines 174–203) | Athenahealth AthenaNet Clinical Encounter XML | XML element nodes (`<section id="...">`) escaped via `escapeXml` | **None (Secure)**: All variables pass through `escapeXml(/[<>&'"]/g)`. Static titles correctly encode `&amp;`. |
| `formatEpicFhirDocument` (lines 58–127) | HL7 FHIR R4 `DocumentReference` JSON (LOINC 11506-3) | Base64-encoded narrative in `content[0].attachment.data`, serialized via `JSON.stringify` | **None (Secure)**: Base64 character set `[A-Za-z0-9+/=]` cannot collide with JSON delimiters or script tags. |
| `formatMarkdownUniversal` (lines 208–235) | Clean Universal Markdown Rich Text | Markdown H3 (`### SECTION`) headers | **Low**: Standard markdown display; no legacy proprietary macro engine. |

### 1.2 Delimiter Collision Mechanism Details

#### Epic SmartText Collision Mechanics
Epic Hyperspace ingestion engines and interface parsers split incoming clinical notes using regular expressions targeting flush-left triple-equals lines:
```regex
^===\s*([A-Z &]+)\s*===
```
If a clinician or transcript includes:
```text
Patient states:
=== OBJECTIVE ===
BP was normal yesterday.
```
The downstream parser encounters two `=== OBJECTIVE ===` headers. Depending on the parser implementation, it either:
1. Overwrites the previous section with the second occurrence.
2. Closes the `SUBJECTIVE` section at line 2 and creates an empty or duplicated `OBJECTIVE` section.
3. Fails ingestion validation with a schema format error.

Additionally, Epic Hyperspace expands dot-phrases (`.PHRASE`) when typed or parsed at line start (`^\.([A-Za-z0-9_]+)`). If note content contains `.MARSHI_CLINICAL_NOTE` or `.DELETE_ALL`, the dot-phrase macro engine may trigger recursive expansion or runtime exceptions.

#### Cerner PowerChart Collision Mechanics
Cerner Millennium Document Management (MDM / FSI) engines parse tagged clinical notes using numbered section markers:
```regex
^\[(\d+)\]\s+([A-Z\s()]+)
```
and 80-character hyphen division lines:
```regex
^-{10,}
```
If a note body contains `[2] OBJECTIVE` or `--------------------------------------------------------------------------------`, the MDM script splits the text into fragmented, out-of-order clinical events.

---

## 2. Sanitization Blueprint: Implementation Architecture

To eliminate delimiter collisions without altering the clinical intent or readability of notes, two dedicated sanitization functions must be added to `src/tools/scribe/utils/ehrExportAdapters.ts`:

### 2.1 Epic SmartText Sanitizer (`sanitizeEpicSmartTextContent`)

```typescript
/**
 * Sanitizes clinical note content destined for Epic SmartText / dot-phrase format.
 * Defends against delimiter collisions where user-entered content matches Epic section headers
 * (e.g. "=== OBJECTIVE ==="), dot-phrase macro triggers (e.g. ".MARSHI_NOTE"),
 * or electronic signature banners ("*** Signed electronically...").
 */
export function sanitizeEpicSmartTextContent(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    // 1. Neutralize triple-equals section header collisions (=== HEADER === -> --- HEADER ---)
    .replace(/={3,}\s*([A-Z0-9\s&/-]+?)\s*={3,}/gi, '--- $1 ---')
    // 2. Neutralize any remaining isolated triple-equals sequences
    .replace(/={3,}/g, '---')
    // 3. Escape leading dot-phrases at beginning of lines to prevent Epic macro execution
    .replace(/^(\s*)\.([A-Za-z0-9_]+)/gm, '$1 . $2')
    // 4. Neutralize electronic signature banner collisions
    .replace(/\*{3,}\s*Signed electronically.*?\*{3,}/gi, '[Signature Redacted: Note Body]');
}
```

**Why this design is optimal**:
- `=== OBJECTIVE ===` becomes `--- OBJECTIVE ---`. Legacy Epic parsers looking for `===` will not match, while clinicians reading the text see clear, clean markdown-style headers.
- Any line starting with a dot `.phrase` is padded with a leading space ` . phrase`, disarming Epic Hyperspace macro auto-expansion.
- Hostile forged signatures like `*** Signed electronically in Epic Hyperspace by Dr. Hacker ***` are replaced with an explicit redaction placeholder.

### 2.2 Cerner PowerChart Sanitizer (`sanitizeCernerPowerChartContent`)

```typescript
/**
 * Sanitizes clinical note content destined for Cerner PowerChart Millennium format.
 * Defends against delimiter collisions where user-entered content matches Cerner numbered
 * section headers (e.g. "[1] SUBJECTIVE"), 80-hyphen separation lines, or commitment banners.
 */
export function sanitizeCernerPowerChartContent(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    // 1. Neutralize numbered bracketed headers (e.g. [1] SUBJECTIVE -> (1) SUBJECTIVE)
    .replace(/\[(\d+)\]\s*([A-Z]+)/g, '($1) $2')
    // 2. Neutralize any line-initial bracketed section index: [1] -> (1)
    .replace(/^(\s*)\[(\d+)\]/gm, '$1($2)')
    // 3. Neutralize long hyphen separation lines (>= 5 hyphens) to prevent divider collisions
    .replace(/-{5,}/g, '- - - - -')
    // 4. Neutralize Cerner header comments and commitment banners
    .replace(/\/\*\s*ORACLE HEALTH.*?PowerChart.*?\*\//gi, '[Banner collision neutralized]')
    .replace(/ELECTRONICALLY SIGNED AND COMMITTED TO POWERCHART MILLENNIUM RECORD/gi, '[Signature collision neutralized]')
    .replace(/---\s*ENCOUNTER BILLING RECONCILIATION\s*---/gi, '[Billing banner neutralized]');
}
```

**Why this design is optimal**:
- `[1] SUBJECTIVE` becomes `(1) SUBJECTIVE`. RegEx patterns looking for `\[\d+\]` fail closed without false matches, while preserving natural numbering for clinical readers.
- 80-hyphen lines become spaced `- - - - -`, preventing parser collision with Millennium boundary rules.
- Forged signature and billing reconciliation banners are neutralized.

### 2.3 Application in Adapter Functions

In `formatEpicSmartText`:
```typescript
export function formatEpicSmartText(data: EhrExportData): string {
  const dateStr = new Date().toLocaleDateString('en-US');
  const subj = sanitizeEpicSmartTextContent(data.notes.subjective);
  const obj = sanitizeEpicSmartTextContent(data.notes.objective);
  const assess = sanitizeEpicSmartTextContent(data.notes.assessment);
  const plan = sanitizeEpicSmartTextContent(data.notes.plan);

  return `// EPIC HYPERSPACE SMARTPHRASE EXPORT
.MARSHI_CLINICAL_NOTE
DATE: ${dateStr}
PATIENT: ${data.patient.name} | DOB: ${data.patient.dob} | MRN: ${data.patient.mrn}
PROVIDER: ${data.clinician.name} (NPI: ${data.clinician.npi})
ENCOUNTER CPT: ${data.patient.cptCode}

=== SUBJECTIVE ===
${subj}

=== OBJECTIVE ===
${obj}

=== ASSESSMENT & DIAGNOSES ===
Primary ICD-10: ${data.primaryIcd || 'F41.1 (Generalized Anxiety Disorder)'}
${assess}

=== PLAN & ORDERS ===
Level of Service: CPT ${data.patient.cptCode}
${plan}

*** Signed electronically in Epic Hyperspace by ${data.clinician.name} ***`;
}
```

In `formatCernerPowerChart`:
```typescript
export function formatCernerPowerChart(data: EhrExportData): string {
  const dateStr = new Date().toLocaleString('en-US');
  const subj = sanitizeCernerPowerChartContent(data.notes.subjective);
  const obj = sanitizeCernerPowerChartContent(data.notes.objective);
  const assess = sanitizeCernerPowerChartContent(data.notes.assessment);
  const plan = sanitizeCernerPowerChartContent(data.notes.plan);

  return `/* ORACLE HEALTH / CERNER POWERCHART CLINICAL NOTE */
PATIENT NAME: ${data.patient.name.toUpperCase()}
MRN: ${data.patient.mrn}
DOB: ${data.patient.dob}
ATTENDING: ${data.clinician.name}
SPECIALTY: ${data.clinician.specialty}
ENCOUNTER DATE/TIME: ${dateStr}
DOCUMENT STATUS: AUTHENTICATED / FINAL

--------------------------------------------------------------------------------
[1] SUBJECTIVE (HISTORY OF PRESENT ILLNESS & REVIEW OF SYSTEMS)
--------------------------------------------------------------------------------
${subj}

--------------------------------------------------------------------------------
[2] OBJECTIVE (VITALS & CLINICAL OBSERVATIONS)
--------------------------------------------------------------------------------
${obj}

--------------------------------------------------------------------------------
[3] ASSESSMENT (DIAGNOSTIC FORMULATION & MDM COMPLEXITY)
--------------------------------------------------------------------------------
${assess}

--------------------------------------------------------------------------------
[4] PLAN (THERAPEUTIC ORDERS & CONTINUING CARE)
--------------------------------------------------------------------------------
${plan}

--- ENCOUNTER BILLING RECONCILIATION ---
PROCEDURE CODE: CPT ${data.patient.cptCode}
PRIMARY DIAGNOSIS: ${data.primaryIcd || 'F41.1'}

ELECTRONICALLY SIGNED AND COMMITTED TO POWERCHART MILLENNIUM RECORD
Provider: ${data.clinician.name} | NPI: ${data.clinician.npi}`;
}
```

---

## 3. Verification of XML Escaping and FHIR R4 JSON

### 3.1 Athenahealth XML Escaping Audit
- **Implementation**: Lines 3–20 of `ehrExportAdapters.ts`:
  ```typescript
  function escapeXml(unsafe: string): string {
    return (unsafe || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
  ```
- **Coverage**: Every single dynamic field in `formatAthenaEncounter` is wrapped in `escapeXml()`:
  - `<patient_id>`, `<patient_name>`, `<dob>`, `<mrn>`
  - `<provider_name>`, `<provider_npi>`, `<cpt_code>`, `<primary_diagnosis>`
  - Section contents: `hpi_subjective`, `exam_objective`, `assessment_diagnoses`, `treatment_plan`.
- **Static Headers**: Static node titles utilize `&amp;` (e.g. `<title>Objective / Mental Status &amp; Vitals</title>`).
- **Empirical Test Proof**: Verified by `tests/challenger-m4-empirical-stress.ts` Test SEC-2.1, SEC-2.2, SEC-2.3:
  - Survives extreme XSS injection payloads (`<script>`, `<img src=x onerror=...>`, `<iframe>`).
  - Successfully parsed by DOMParser (`DOMParser.parseFromString(..., 'text/xml')`) with `parsererror === null`.
  - Neutralizes XXE doctype definitions (`<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>`) as literal text nodes.

### 3.2 Epic Systems FHIR R4 JSON Audit
- **Implementation**: Lines 58–127 of `ehrExportAdapters.ts`:
  - Clinical narrative combined into `rawNarrative` string.
  - Base64 encoded: `Buffer.from(rawNarrative).toString('base64')` (with browser `btoa(unescape(encodeURIComponent(rawNarrative)))` fallback).
  - Encapsulated inside `content[0].attachment.data`.
  - Serialized via native `JSON.stringify(fhirResource, null, 2)`.
- **Schema Compliance**: Adheres to HL7 FHIR R4 `DocumentReference`:
  - `type.coding`: LOINC `11506-3` (*Outpatient Clinical Progress Note*)
  - `category.coding`: LOINC `LP173421-1` (*Report*)
  - `status: 'current'`, `docStatus: 'final'`
  - `content[0].attachment.contentType: 'text/plain'`
- **Empirical Test Proof**: Verified by `tests/challenger-m4-empirical-stress.ts` Test SEC-2.4, SEC-2.5, SEC-2.6:
  - Produces 100% valid JSON parseable by `JSON.parse()`.
  - Base64 data decodes with 100% fidelity to the original clinical narrative without truncation or escape corruption.

---

## 4. Verification of 9 E2E Invariant Strings in `ScribeWorkspace.tsx`

The E2E test suites (`tests/e2e/tier1-features.test.mjs` lines 402–453 and `tests/m4-clinical-scribe.test.ts` lines 480–491) mandate 9 strict invariant strings permanently rendered upon mounting `/dashboard/scribe`:

| # | Mandatory Invariant String | Source Location in `ScribeWorkspace.tsx` | Permanent Rendering Verification |
|---|---|---|---|
| 1 | `"Clinical AI Scribe v2"` | Line 164: `<h2 ...>Clinical AI Scribe v2</h2>` | Rendered in top container header card. |
| 2 | `"AI Diarization Ready"` | Line 170: `AI Diarization Ready` | Rendered in top pulse status badge. |
| 3 | `"Live Acoustic Transcript"` | Line 261: `Live Acoustic Transcript ({activePatient.name})` | Rendered in live diarization feed column header. |
| 4 | `"Dr. Chen:"` | Lines 97, 127 & active note hydration | Rendered in transcript turn dialogue body. |
| 5 | `"Jane Doe:"` | Lines 97, 127 & active note hydration | Rendered in transcript turn dialogue body. |
| 6 | `"Generated SOAP Preview"` | Line 271: `Generated SOAP Preview (CPT {activePatient.cptCode})` | Substring match in SOAP preview card header. |
| 7 | `"Subjective:"` | Line 274: `<strong ...>Subjective:</strong>` | Rendered in SOAP Subjective field. |
| 8 | `"Assessment:"` | Line 275: `<strong ...>Assessment:</strong>` | Rendered in SOAP Assessment field. |
| 9 | `"Generated SOAP Preview (CPT 90837)"` | Line 271: evaluates with `activePatient.cptCode = '90837'` | Full exact match when Jane Doe is bound. |

**Impact Assessment**: The changes to `src/tools/scribe/utils/ehrExportAdapters.ts` do **NOT** modify or impact any of these 9 strings. `ScribeWorkspace.tsx` remains 100% untouched and compliant.

---

## 5. Worker M4 It2 Complete Verification & Remediation Checklist

### Step 1: Remediate Integrity Violation in `handoff.md` (Finding 1)
- [ ] Open `.agents/teamwork/teamwork_preview_worker_m4/handoff.md`.
- [ ] In Section 1.2.1 and Section 1.2.2, replace the synthetic/simulated logs with the **verbatim output** from executing:
  ```bash
  npm run test:scribe
  node scripts/verify-css-bleed.mjs
  ```
- [ ] Ensure no fictional test names (e.g. `[SEC.1]` through `[SEC.5]`, `[F13.1] AudioRecorder device enumeration...`) appear in the attestation.

### Step 2: Implement Delimiter Collision Defense in `ehrExportAdapters.ts` (Finding 3)
- [ ] In `src/tools/scribe/utils/ehrExportAdapters.ts`:
  - Export `sanitizeEpicSmartTextContent(unsafe: string): string`.
  - Export `sanitizeCernerPowerChartContent(unsafe: string): string`.
  - Update `formatEpicSmartText` to sanitize `notes.subjective`, `notes.objective`, `notes.assessment`, and `notes.plan`.
  - Update `formatCernerPowerChart` to sanitize `notes.subjective`, `notes.objective`, `notes.assessment`, and `notes.plan`.

### Step 3: Add Automated Test Coverage for Delimiter Collisions
- [ ] In `tests/m4-clinical-scribe.test.ts`, under Category 5 (Feature 17), append test assertions:
  - `F17.6`: Hostile Epic SmartText payload containing `=== OBJECTIVE ===`, `.MARSHI_CLINICAL_NOTE`, and forged signatures sanitizes cleanly with exactly 1 `=== OBJECTIVE ===` section header.
  - `F17.7`: Hostile Cerner PowerChart payload containing `[2] OBJECTIVE`, 80 hyphens, and forged commitment banners sanitizes cleanly with exactly 1 `[2] OBJECTIVE` section header.

### Step 4: Full Repository Verification Run (All 11 Suites)
- [ ] Run `npm run test:scribe` -> verify 59 Passed, 0 Failed.
- [ ] Run `node scripts/verify-css-bleed.mjs` -> verify 0 violations.
- [ ] Run `npm run test:ehr` -> verify 30 Passed.
- [ ] Run `npm run test:e2e` -> verify 80 Passed (Tiers 1–4).
- [ ] Run `node tests/e2e/tier4-scenarios.test.mjs` -> verify 5 Passed.
- [ ] Run `npm run test:challenger:m2` -> verify 53 Passed.
- [ ] Run `npm run test:stripe` -> verify 15 Passed.
- [ ] Run `npm run test:subscription` -> verify 17 Passed.
- [ ] Run `npm run test:security` -> verify 26 Passed.
- [ ] Run `npm run test:auth` -> verify 12 Passed.
- [ ] Run `npm run build` -> verify `tsc --noEmit && vite build` succeeds with 0 errors.

---
*Report certified by Explorer 3 (`teamwork_preview_explorer_m4_it2_3`).*
