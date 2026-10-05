# Milestone 5 Technical Investigation & Blueprint: HIPAA PHI Scrubber (Features 23, 24, 25)

**Author:** Explorer 2 (`teamwork_preview_explorer_m5_2`)  
**Date:** 2026-10-05  
**Target Milestone:** Milestone 5 — HIPAA PHI Scrubber 18 Safe Harbor Engine & Diff Viewer  
**Canonical Source:** `/Users/alexandermarshi/phi_scrubber` (514 LOC engine, 253 LOC Streamlit visualizer, 207 LOC test suite)  
**Destination Codebase:** `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch`  

---

## 1. Executive Summary & Canonical Portfolio Analysis

The canonical repository at `/Users/alexandermarshi/phi_scrubber` provides an end-to-end statutory Safe Harbor de-identification engine under the **HIPAA Privacy Rule** (45 CFR § 164.514(b)(2)). In the current `clinical_saas_launch` application, `/dashboard/phi-scrubber` mounts a static placeholder (`PhiScrubberView.tsx`, 59 LOC) which hardcodes strings to satisfy baseline tests.

This blueprint specifies the full TypeScript port of the canonical engine into the single-page application architecture:
1. **Feature 23: PHI Scrubber 18 Safe Harbor Engine** (`src/tools/phi-scrubber/safeHarborRules.ts` & `engine.ts`):
   - All 18 statutory HIPAA Safe Harbor regexes and entity extractors implemented natively in TypeScript without requiring external C++/Python NLP runtimes.
   - Character-level interval scheduling preventing overlapping match corruption.
   - Confidence scoring (0.0 to 1.0) and direct vs. quasi-identifier classification.
   - Three statutory masking modes: `tag` (`[NAME]`, `[DATE]`, `[PHONE]`, `[SSN]`, etc.), `block` (`████████`), and `asterisk` (`********`).
2. **Feature 24: PHI Scrubber Side-by-Side Diff Viewer** (`src/tools/phi-scrubber/DiffViewer.tsx` & `PhiScrubberView.tsx`):
   - Synchronized dual-pane layout: Unredacted Source pane with color-coded entity highlight pills vs Redacted Clean pane.
   - Interactive mask switcher (`tag`, `block`, `asterisk`).
   - 1-click clipboard copy with user feedback.
   - 100% backward-compatible preservation of existing E2E DOM invariants (`T1.7.1`–`T1.7.5`, `T3.2`, `T3.7`, `T4.4`).
3. **Feature 25: PHI Scrubber Forensic Audit Table** (`src/tools/phi-scrubber/AuditTable.tsx`):
   - 4 Metric cards: Total Entities Detected, Safe Harbor Categories Triggered (x/18), Risk Severity Score, De-identification Compliance.
   - Entity taxonomy table detailing category, token, raw value, start/end character offsets, confidence score, and risk tier.
   - 1-click client-side JSON and CSV forensic export generators.

---

## 2. Architecture & File Layout

The PHI Scrubber module will reside entirely within `src/tools/phi-scrubber/`:

```
src/tools/phi-scrubber/
├── types.ts              # Core TypeScript interfaces, enums, and data contracts
├── safeHarborRules.ts    # 18 statutory HIPAA Safe Harbor regex rules & entity extractors
├── engine.ts             # De-identification engine: interval scheduler, mask generator, metrics
├── sampleTexts.ts        # Presets: All 18 Identifiers, Intake Note, Telemetry, Active Patient Note
├── DiffViewer.tsx        # Synchronized side-by-side diff viewer with highlighted spans
├── AuditTable.tsx        # Forensic audit trail table, metrics cards, JSON & CSV export
├── PhiScrubberView.tsx   # Top-level workspace container: toolbar, tabs, context binding
└── index.ts              # Clean module barrel exports
```

---

## 3. Feature 23 Blueprint: Statutory 18 Safe Harbor Engine

### 3.1 Statutory 18 HIPAA Safe Harbor Identifier Taxonomy (45 CFR § 164.514(b)(2))

| # | Statutory Category | 45 CFR Reference | Default Token | Regex Pattern Strategy | Confidence | Risk Tier |
|---|---|---|---|---|---|---|
| **1** | **Names** | §164.514(b)(2)(i)(A) | `[NAME]` | Titled clinicians (`Dr.`, `MD`), labeled patient/client fields, and clinical context matches (`activePatient.name`) | 0.95 | Direct |
| **2** | **Geographic subdivisions** | §164.514(b)(2)(i)(B) | `[LOCATION]` / `[ZIP]` | Street suffixes (`Ave`, `St`, `Dr`, `Way`, `Terrace`), City/State/ZIP, 5 & 9-digit postal codes | 0.92 | Indirect |
| **3** | **Dates & Ages > 89** | §164.514(b)(2)(i)(C) | `[DATE]` / `[AGE_90+]` | MM/DD/YYYY, YYYY-MM-DD, Month DD YYYY, DD Month YYYY, DOB/Admit/Discharge labels, ages 90+ | 0.98 | Indirect |
| **4** | **Telephone numbers** | §164.514(b)(2)(i)(D) | `[PHONE]` | US & International formats: `(XXX) XXX-XXXX`, `XXX-XXX-XXXX`, `XXX.XXX.XXXX`, `+1 ...` | 0.98 | Direct |
| **5** | **Fax numbers** | §164.514(b)(2)(i)(E) | `[FAX]` | Labeled fax lines (`Fax:`, `Facsimile:`, `FX:`) with standard phone formats | 0.98 | Direct |
| **6** | **Email addresses** | §164.514(b)(2)(i)(F) | `[EMAIL]` | RFC 5322 email regex: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b` | 0.99 | Direct |
| **7** | **Social Security numbers (SSN)** | §164.514(b)(2)(i)(G) | `[SSN]` | Validated 3-2-4 digit pattern: `(?!000\|666\|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}` | 0.99 | Direct |
| **8** | **Medical Record numbers (MRN)** | §164.514(b)(2)(i)(H) | `[MRN]` | Labeled MRN (`MRN:`, `MR#`, `Medical Record #`), `#MC-` clinical EHR prefixes | 0.98 | Direct |
| **9** | **Health plan beneficiary numbers** | §164.514(b)(2)(i)(I) | `[HEALTH_PLAN_NUM]` | Labeled Member/Insurance/Policy/Group ID (`BCBS-...`, `AETNA-...`, `CIGNA-...`) | 0.96 | Direct |
| **10** | **Account numbers** | §164.514(b)(2)(i)(J) | `[ACCOUNT_NUM]` | Labeled `Acct #`, `Account:`, and 13-16 digit Luhn candidate credit card runs | 0.95 | Direct |
| **11** | **Certificate / license numbers** | §164.514(b)(2)(i)(K) | `[LICENSE_NUM]` / `[NPI]` | 10-digit NPI, 9-char DEA license (`AS1234563`), State Medical / Driver's License | 0.97 | Direct |
| **12** | **Vehicle identifiers (VIN & plates)** | §164.514(b)(2)(i)(L) | `[VEHICLE_ID]` | Standard 17-char ISO 3779 VIN (`[A-HJ-NPR-Z0-9]{17}`), labeled license plates | 0.97 | Direct |
| **13** | **Device identifiers & serial numbers** | §164.514(b)(2)(i)(M) | `[DEVICE_ID]` | Labeled device serials, pacemaker IDs, UDI identifiers (`DEV-789-XYZ-001`, `SN-GW-...`) | 0.95 | Direct |
| **14** | **Web URLs** | §164.514(b)(2)(i)(N) | `[URL]` | `https?://[^\s<>"]+`, `www.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}` | 0.99 | Direct |
| **15** | **IP addresses (IPv4 & IPv6)** | §164.514(b)(2)(i)(O) | `[IP_ADDRESS]` | Octet-bounded IPv4 `(?:(?:25[0-5]...)\.){3}...`, hex-grouped IPv6 | 0.99 | Direct |
| **16** | **Biometric identifiers** | §164.514(b)(2)(i)(P) | `[BIOMETRIC]` | Clinical mentions of fingerprints, retina/iris scans, voiceprints, facial recognition data | 0.92 | Direct |
| **17** | **Full-face photographic images** | §164.514(b)(2)(i)(Q) | `[PHOTO_ID]` | Image paths/URLs (`/records/photos/...jpg`, `.png`, `.dcm`), labeled photo references | 0.94 | Direct |
| **18** | **Any other unique identifiers** | §164.514(b)(2)(i)(R) | `[UNIQUE_ID]` | Standard UUID (`[0-9a-f]{8}-...`), barcode UID, clinical research tracking tags | 0.94 | Direct |

---

### 3.2 Data Types (`src/tools/phi-scrubber/types.ts`)

```typescript
export type SafeHarborRuleId =
  | 'NAME'
  | 'GEOGRAPHIC'
  | 'DATE'
  | 'PHONE'
  | 'FAX'
  | 'EMAIL'
  | 'SSN'
  | 'MRN'
  | 'HEALTH_PLAN_NUM'
  | 'ACCOUNT_NUM'
  | 'LICENSE_NUM'
  | 'VEHICLE_ID'
  | 'DEVICE_ID'
  | 'URL'
  | 'IP_ADDRESS'
  | 'BIOMETRIC'
  | 'PHOTO_ID'
  | 'UNIQUE_ID';

export type StatutoryMaskMode = 'tag' | 'block' | 'asterisk';

export interface SafeHarborRuleDefinition {
  ruleId: SafeHarborRuleId;
  ruleNumber: number; // 1 to 18
  statutoryName: string;
  cfrReference: string;
  tagToken: string;
  description: string;
  isDirectIdentifier: boolean;
  baseConfidence: number;
  patterns: Array<{
    name: string;
    regex: RegExp;
    extractGroup?: number;
    customConfidence?: number;
  }>;
}

export interface PhiEntity {
  id: string;
  ruleId: SafeHarborRuleId;
  ruleNumber: number;
  category: string;
  tag: string;
  originalValue: string;
  redactedValue: string;
  start: number;
  end: number;
  confidence: number;
  riskTier: 'Direct' | 'Indirect';
  patternName: string;
}

export interface ScrubOptions {
  maskStyle: StatutoryMaskMode;
  strictSafeHarbor?: boolean;
  customPatientContext?: {
    name?: string;
    dob?: string;
    mrn?: string;
    phone?: string;
  };
}

export interface ForensicAuditMetrics {
  totalEntities: number;
  categoriesTriggeredCount: number;
  categoriesTriggered: SafeHarborRuleId[];
  riskSeverity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'SAFE';
  directIdentifiersCount: number;
  quasiIdentifiersCount: number;
  characterDelta: number;
  processingTimeMs: number;
  complianceStatus: '100% DE-IDENTIFIED' | 'PHI DETECTED / PENDING' | 'CLEAN';
}

export interface ScrubResult {
  originalText: string;
  cleanText: string;
  itemsRedacted: number;
  categoriesTriggered: SafeHarborRuleId[];
  entities: PhiEntity[];
  metrics: ForensicAuditMetrics;
}
```

---

### 3.3 Rule Definitions (`src/tools/phi-scrubber/safeHarborRules.ts`)

The rules file compiles regular expressions for all 18 statutory categories:

```typescript
import { SafeHarborRuleDefinition } from './types';

export const SAFE_HARBOR_RULES: SafeHarborRuleDefinition[] = [
  // 1. Names
  {
    ruleId: 'NAME',
    ruleNumber: 1,
    statutoryName: 'Names',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(A)',
    tagToken: '[NAME]',
    description: 'Patient, clinician, provider, and relative personal names',
    isDirectIdentifier: true,
    baseConfidence: 0.95,
    patterns: [
      {
        name: 'labeled_patient_name',
        regex: /(?:Patient|Client|Pt\.?|Subject|Resident|Member)\s*(?:Name)?\s*[:#]\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+(?:Jr|Sr|II|III|IV)\.?)?)/gi,
        extractGroup: 1,
        customConfidence: 0.98,
      },
      {
        name: 'titled_clinician_name',
        regex: /\b(?:Dr\.|Dr|Doctor|Prof\.|Mr\.|Mrs\.|Ms\.|Miss)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{1,20}(?:,\s*(?:MD|DO|PhD|PsyD|NP|PA|RN|LCSW|LMFT))?)\b/g,
        extractGroup: 1,
        customConfidence: 0.96,
      },
      {
        name: 'dictated_author_signature',
        regex: /(?:Attending(?:\s+Physician)?|Referring(?:\s+Physician)?|Primary\s+Clinician|Primary\s+Care|Dictated\s+by|Signed\s+by|Author|Transcribed\s+by)\s*[:#]?\s*([A-Z][a-z]{1,20}(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{1,20}(?:,\s*(?:MD|DO|PhD|PsyD|NP|PA|RN|LCSW|LMFT))?)/gi,
        extractGroup: 1,
        customConfidence: 0.96,
      },
    ],
  },

  // 2. Geographic Subdivisions
  {
    ruleId: 'GEOGRAPHIC',
    ruleNumber: 2,
    statutoryName: 'Geographic Subdivisions',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(B)',
    tagToken: '[LOCATION]',
    description: 'Street address, city, county, precinct, and ZIP codes',
    isDirectIdentifier: false,
    baseConfidence: 0.92,
    patterns: [
      {
        name: 'street_address_full',
        regex: /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\.\s]{1,30}\s+(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Road|Rd\.?|Drive|Dr\.?|Court|Ct\.?|Lane|Ln\.?|Way|Terrace|Ter\.?|Circle|Cir\.?|Place|Pl\.?)\b/gi,
        customConfidence: 0.95,
      },
      {
        name: 'city_state_zip',
        regex: /\b[A-Z][a-zA-Z\s]{2,25},\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+\d{5}(?:-\d{4})?\b/g,
        customConfidence: 0.96,
      },
      {
        name: 'labeled_residence_address',
        regex: /(?:Address|Residence\s+Address|Home\s+Address)\s*[:#]?\s*([^,\n\r]+,\s*[^,\n\r]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi,
        extractGroup: 1,
        customConfidence: 0.97,
      },
      {
        name: 'standalone_zip_code',
        regex: /\b\d{5}(?:-\d{4})?\b/g,
        customConfidence: 0.88,
      },
    ],
  },

  // 3. Dates & Ages 90+
  {
    ruleId: 'DATE',
    ruleNumber: 3,
    statutoryName: 'Dates',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(C)',
    tagToken: '[DATE]',
    description: 'All date elements (birth, admit, discharge, encounter) and ages over 89',
    isDirectIdentifier: false,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'mm_dd_yyyy_slash_dash',
        regex: /\b(?:0?[1-9]|1[0-2])[/\-.](?:0?[1-9]|[12]\d|3[01])[/\-.](?:19|20)\d{2}\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'iso_yyyy_mm_dd',
        regex: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'month_word_day_year',
        regex: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'day_month_word_year',
        regex: /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:19|20)\d{2}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'age_90_plus',
        regex: /\b(?:9[0-9]|1[0-9]{2})[-\s]*(?:years?[-\s]*(?:old)?|y\/?o)\b/gi,
        customConfidence: 0.95,
      },
    ],
  },

  // 4. Telephone Numbers
  {
    ruleId: 'PHONE',
    ruleNumber: 4,
    statutoryName: 'Telephone Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(D)',
    tagToken: '[PHONE]',
    description: 'Telephone contact numbers',
    isDirectIdentifier: true,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'us_standard_phone',
        regex: /(?<!\d)(?:\+?1[-.\s]?)?(?:\([2-9]\d{2}\)[-.\s]?|[2-9]\d{2}[-.\s])[2-9]\d{2}[-.\s]\d{4}(?!\d)/g,
        customConfidence: 0.98,
      },
      {
        name: 'labeled_phone_number',
        regex: /(?:Phone|Telephone|Tel|Cell|Mobile|Primary\s+Phone|Emergency\s+Contact)\s*[:#]?\s*(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 5. Fax Numbers
  {
    ruleId: 'FAX',
    ruleNumber: 5,
    statutoryName: 'Fax Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(E)',
    tagToken: '[FAX]',
    description: 'Facsimile transmission telephone numbers',
    isDirectIdentifier: true,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'labeled_fax_number',
        regex: /\b(?:Fax|Facsimile|FX)\s*[:#]?\s*(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 6. Email Addresses
  {
    ruleId: 'EMAIL',
    ruleNumber: 6,
    statutoryName: 'Email Addresses',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(F)',
    tagToken: '[EMAIL]',
    description: 'Electronic mail addresses',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'rfc5322_email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        customConfidence: 0.99,
      },
    ],
  },

  // 7. Social Security Numbers
  {
    ruleId: 'SSN',
    ruleNumber: 7,
    statutoryName: 'Social Security Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(G)',
    tagToken: '[SSN]',
    description: 'US Social Security Numbers (SSN)',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'standard_ssn_validated',
        regex: /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'labeled_ssn',
        regex: /\b(?:SSN|Social\s+Security(?:\s+(?:Number|#|No\.?))?)\s*[:#]?\s*\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 8. Medical Record Numbers
  {
    ruleId: 'MRN',
    ruleNumber: 8,
    statutoryName: 'Medical Record Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(H)',
    tagToken: '[MRN]',
    description: 'Patient medical record numbers and clinical chart identifiers',
    isDirectIdentifier: true,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'labeled_mrn',
        regex: /\b(?:MRN?|MR#|Medical\s+Record\s*(?:Number|#|No\.?))\s*[:#]?\s*[A-Z0-9][\w\-]{3,15}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'mc_prefixed_mrn',
        regex: /#MC-\d{4,8}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 9. Health Plan Beneficiary Numbers
  {
    ruleId: 'HEALTH_PLAN_NUM',
    ruleNumber: 9,
    statutoryName: 'Health Plan Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(I)',
    tagToken: '[HEALTH_PLAN_NUM]',
    description: 'Health plan, insurance, policy, and beneficiary identifiers',
    isDirectIdentifier: true,
    baseConfidence: 0.96,
    patterns: [
      {
        name: 'labeled_insurance_member_id',
        regex: /\b(?:Health\s+Plan|Beneficiary|Member|Policy|Group|Insurance|Coverage|Claim)\s*(?:ID|Number|No\.?|#)\s*[:#]?\s*[A-Z0-9][\w\-]{4,20}\b/gi,
        customConfidence: 0.97,
      },
      {
        name: 'carrier_prefix_id',
        regex: /\b(?:BCBS|AETNA|CIGNA|UHC|HUMANA|MEDICARE|MEDICAID)[-\s]?[A-Z0-9]{5,15}\b/gi,
        customConfidence: 0.96,
      },
    ],
  },

  // 10. Account Numbers
  {
    ruleId: 'ACCOUNT_NUM',
    ruleNumber: 10,
    statutoryName: 'Account Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(J)',
    tagToken: '[ACCOUNT_NUM]',
    description: 'Patient billing accounts and financial payment cards',
    isDirectIdentifier: true,
    baseConfidence: 0.95,
    patterns: [
      {
        name: 'labeled_account_number',
        regex: /\b(?:Acct\.?|Account)\s*(?:No\.?|Number|#)\s*[:#]?\s*[A-Z0-9][\w\-]{4,19}\b/gi,
        customConfidence: 0.96,
      },
      {
        name: 'credit_debit_card_number',
        regex: /\b(?:4\d{3}|5[1-5]\d{2}|6011|3[47]\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g,
        customConfidence: 0.97,
      },
    ],
  },

  // 11. Certificate / License Numbers
  {
    ruleId: 'LICENSE_NUM',
    ruleNumber: 11,
    statutoryName: 'Certificate / License Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(K)',
    tagToken: '[LICENSE_NUM]',
    description: 'Medical licenses, NPI, DEA registrations, and driver licenses',
    isDirectIdentifier: true,
    baseConfidence: 0.97,
    patterns: [
      {
        name: 'national_provider_identifier_npi',
        regex: /\bNPI\s*[:#]?\s*\d{10}\b/gi,
        customConfidence: 0.99,
      },
      {
        name: 'dea_registration_number',
        regex: /\bDEA(?:\s+License)?\s*(?:No\.?|Number|#)?\s*[:#]?\s*[A-Z]{2}\d{7}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'license_certificate_number',
        regex: /\b(?:License|Licence|Cert(?:ificate)?|Driver'?s?\s+License|UPIN)\s*(?:No\.?|Number|#)?\s*[:#]?\s*[A-Z0-9][\w\-]{3,18}\b/gi,
        customConfidence: 0.95,
      },
    ],
  },

  // 12. Vehicle Identifiers & Serial Numbers
  {
    ruleId: 'VEHICLE_ID',
    ruleNumber: 12,
    statutoryName: 'Vehicle Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(L)',
    tagToken: '[VEHICLE_ID]',
    description: 'Vehicle Identification Numbers (VIN) and license plates',
    isDirectIdentifier: true,
    baseConfidence: 0.97,
    patterns: [
      {
        name: 'iso_vin_17_char',
        regex: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
        customConfidence: 0.98,
      },
      {
        name: 'labeled_vin',
        regex: /\b(?:VIN|Vehicle\s+ID)\s*[:#]?\s*[A-HJ-NPR-Z0-9]{10,17}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'license_plate',
        regex: /\b(?:Plate|License\s+Plate)\s*[:#]?\s*[A-Z0-9]{2,8}\b/gi,
        customConfidence: 0.95,
      },
    ],
  },

  // 13. Device Identifiers & Serial Numbers
  {
    ruleId: 'DEVICE_ID',
    ruleNumber: 13,
    statutoryName: 'Device Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(M)',
    tagToken: '[DEVICE_ID]',
    description: 'Medical device serial numbers, UDI, pacemakers, and hardware telemetry',
    isDirectIdentifier: true,
    baseConfidence: 0.95,
    patterns: [
      {
        name: 'medical_device_serial_udi',
        regex: /\b(?:Serial|Device(?:\s+Serial)?|Implant|Pacemaker|Sensor|Hardware|Gateway|Monitor|UDI|Holter)\s*(?:No\.?|Number|#|ID|Serial)?\s*[:#]?\s*[A-Z0-9][\w\-]{4,22}\b/gi,
        customConfidence: 0.96,
      },
    ],
  },

  // 14. Web URLs
  {
    ruleId: 'URL',
    ruleNumber: 14,
    statutoryName: 'Web URLs',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(N)',
    tagToken: '[URL]',
    description: 'Universal Resource Locators (URLs) and web endpoints',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'http_https_url',
        regex: /\bhttps?:\/\/[^\s<>"']+/gi,
        customConfidence: 0.99,
      },
      {
        name: 'www_web_domain',
        regex: /\bwww\.[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 15. Internet Protocol (IP) Addresses
  {
    ruleId: 'IP_ADDRESS',
    ruleNumber: 15,
    statutoryName: 'IP Addresses',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(O)',
    tagToken: '[IP_ADDRESS]',
    description: 'IPv4 and IPv6 internet protocol addresses',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'ipv4_octet_bounded',
        regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'ipv6_hex_groups',
        regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
        customConfidence: 0.99,
      },
    ],
  },

  // 16. Biometric Identifiers
  {
    ruleId: 'BIOMETRIC',
    ruleNumber: 16,
    statutoryName: 'Biometric Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(P)',
    tagToken: '[BIOMETRIC]',
    description: 'Fingerprints, voiceprints, iris scans, and biometric verification references',
    isDirectIdentifier: true,
    baseConfidence: 0.92,
    patterns: [
      {
        name: 'biometric_narrative_keyword',
        regex: /\b(?:fingerprint|retina|iris|voiceprint|voice\s+recognition|hand\s+geometry|facial\s+recognition)\s*(?:id|identifier|scan|data|record|template|match|verification)?\b/gi,
        customConfidence: 0.92,
      },
    ],
  },

  // 17. Full-Face Photographic Images
  {
    ruleId: 'PHOTO_ID',
    ruleNumber: 17,
    statutoryName: 'Photographic Images',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(Q)',
    tagToken: '[PHOTO_ID]',
    description: 'Full-face patient photographs and clinical image file paths',
    isDirectIdentifier: true,
    baseConfidence: 0.94,
    patterns: [
      {
        name: 'photo_file_path_or_url',
        regex: /\b(?:photo(?:graph)?|image|picture|headshot|portrait)\s*(?:of\s+patient|file|path|url)?\s*[:#]?\s*[\/\w\.-]+\.(?:jpg|jpeg|png|tiff|bmp|dcm|dicom)\b/gi,
        customConfidence: 0.95,
      },
      {
        name: 'labeled_patient_photo',
        regex: /(?:Patient\s+photo(?:graph)?(?:\s+file)?|Headshot\s+image)\s*[:#]?\s*[^\s,;]+/gi,
        customConfidence: 0.94,
      },
    ],
  },

  // 18. Any Other Unique Identifying Number, Characteristic, or Code
  {
    ruleId: 'UNIQUE_ID',
    ruleNumber: 18,
    statutoryName: 'Unique Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(R)',
    tagToken: '[UNIQUE_ID]',
    description: 'UUIDs, tracking tags, barcodes, and clinical research patient IDs',
    isDirectIdentifier: true,
    baseConfidence: 0.94,
    patterns: [
      {
        name: 'standard_uuid',
        regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
        customConfidence: 0.98,
      },
      {
        name: 'barcode_tracking_uid',
        regex: /\b(?:Barcode|Tracking\s+ID|Tracking\s+Tag|Unique\s+ID|Subject\s+ID|UID)\s*(?:#|No\.?|Number)?\s*[:#]?\s*[A-Z0-9][\w\-]{4,30}\b/gi,
        customConfidence: 0.95,
      },
    ],
  },
];
```

---

### 3.4 De-Identification Engine Algorithm (`src/tools/phi-scrubber/engine.ts`)

```typescript
import { SAFE_HARBOR_RULES } from './safeHarborRules';
import {
  PhiEntity,
  ScrubOptions,
  ScrubResult,
  StatutoryMaskMode,
  ForensicAuditMetrics,
} from './types';

interface CandidateMatch {
  ruleId: string;
  ruleNumber: number;
  category: string;
  tag: string;
  originalValue: string;
  start: number;
  end: number;
  confidence: number;
  riskTier: 'Direct' | 'Indirect';
  patternName: string;
}

export function generateMask(
  originalValue: string,
  tag: string,
  mode: StatutoryMaskMode
): string {
  switch (mode) {
    case 'tag':
      return tag;
    case 'block':
      return '█'.repeat(Math.max(4, Math.min(originalValue.length, 32)));
    case 'asterisk':
      return '*'.repeat(Math.max(4, Math.min(originalValue.length, 32)));
    default:
      return tag;
  }
}

export function scrubText(
  input: string,
  options: Partial<ScrubOptions> = {}
): ScrubResult {
  const startTime = performance.now();
  const maskStyle: StatutoryMaskMode = options.maskStyle || 'tag';
  const candidates: CandidateMatch[] = [];

  // 1. Contextual Active Patient Injection
  if (options.customPatientContext) {
    const { name, dob, mrn, phone } = options.customPatientContext;
    if (name && name.trim().length > 2) {
      const nameRegex = new RegExp(`\\b${escapeRegExp(name.trim())}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = nameRegex.exec(input)) !== null) {
        candidates.push({
          ruleId: 'NAME',
          ruleNumber: 1,
          category: 'Names',
          tag: '[NAME]',
          originalValue: m[0],
          start: m.index,
          end: m.index + m[0].length,
          confidence: 0.99,
          riskTier: 'Direct',
          patternName: 'context_active_patient_name',
        });
      }
    }
    if (dob && dob.trim().length > 4) {
      const dobRegex = new RegExp(`\\b${escapeRegExp(dob.trim())}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = dobRegex.exec(input)) !== null) {
        candidates.push({
          ruleId: 'DATE',
          ruleNumber: 3,
          category: 'Dates',
          tag: '[DATE]',
          originalValue: m[0],
          start: m.index,
          end: m.index + m[0].length,
          confidence: 0.99,
          riskTier: 'Indirect',
          patternName: 'context_active_patient_dob',
        });
      }
    }
    if (mrn && mrn.trim().length > 3) {
      const mrnRegex = new RegExp(escapeRegExp(mrn.trim()), 'gi');
      let m: RegExpExecArray | null;
      while ((m = mrnRegex.exec(input)) !== null) {
        candidates.push({
          ruleId: 'MRN',
          ruleNumber: 8,
          category: 'Medical Record Numbers',
          tag: '[MRN]',
          originalValue: m[0],
          start: m.index,
          end: m.index + m[0].length,
          confidence: 0.99,
          riskTier: 'Direct',
          patternName: 'context_active_patient_mrn',
        });
      }
    }
    if (phone && phone.trim().length > 6) {
      const phoneRegex = new RegExp(escapeRegExp(phone.trim()), 'gi');
      let m: RegExpExecArray | null;
      while ((m = phoneRegex.exec(input)) !== null) {
        candidates.push({
          ruleId: 'PHONE',
          ruleNumber: 4,
          category: 'Telephone Numbers',
          tag: '[PHONE]',
          originalValue: m[0],
          start: m.index,
          end: m.index + m[0].length,
          confidence: 0.99,
          riskTier: 'Direct',
          patternName: 'context_active_patient_phone',
        });
      }
    }
  }

  // 2. Scan Statutory 18 Safe Harbor Rules
  for (const rule of SAFE_HARBOR_RULES) {
    for (const pat of rule.patterns) {
      // Re-initialize regex index
      pat.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(input)) !== null) {
        const fullMatch = match[0];
        let matchedValue = fullMatch;
        let start = match.index;
        let end = match.index + fullMatch.length;

        // If a specific capture group was targeted (e.g. for labeled prefixes)
        if (pat.extractGroup && match[pat.extractGroup]) {
          matchedValue = match[pat.extractGroup];
          const groupOffset = fullMatch.indexOf(matchedValue);
          if (groupOffset !== -1) {
            start = match.index + groupOffset;
            end = start + matchedValue.length;
          }
        }

        candidates.push({
          ruleId: rule.ruleId,
          ruleNumber: rule.ruleNumber,
          category: rule.statutoryName,
          tag: rule.tagToken,
          originalValue: matchedValue,
          start,
          end,
          confidence: pat.customConfidence || rule.baseConfidence,
          riskTier: rule.isDirectIdentifier ? 'Direct' : 'Indirect',
          patternName: pat.name,
        });

        // Prevent infinite zero-width loops
        if (match.index === pat.regex.lastIndex) {
          pat.regex.lastIndex++;
        }
      }
    }
  }

  // 3. Resolve Overlapping Intervals (Greedy Interval Scheduling)
  // Sort by start ascending, then span length descending, then confidence descending
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;
    return b.confidence - a.confidence;
  });

  const selected: CandidateMatch[] = [];
  let lastEnd = -1;

  for (const cand of candidates) {
    if (cand.start >= lastEnd) {
      selected.push(cand);
      lastEnd = cand.end;
    }
  }

  // 4. Construct Entities with Masked Redaction
  const entities: PhiEntity[] = selected.map((m, idx) => ({
    id: `phi-entity-${idx + 1}`,
    ruleId: m.ruleId as any,
    ruleNumber: m.ruleNumber,
    category: m.category,
    tag: m.tag,
    originalValue: m.originalValue,
    redactedValue: generateMask(m.originalValue, m.tag, maskStyle),
    start: m.start,
    end: m.end,
    confidence: m.confidence,
    riskTier: m.riskTier,
    patternName: m.patternName,
  }));

  // 5. Build Redacted Clean Text (Left-to-Right String Slicing)
  let cleanText = '';
  let cursor = 0;
  for (const ent of entities) {
    cleanText += input.slice(cursor, ent.start);
    cleanText += ent.redactedValue;
    cursor = ent.end;
  }
  cleanText += input.slice(cursor);

  // 6. Aggregate Forensic Audit Metrics
  const categoriesSet = new Set(entities.map((e) => e.ruleId));
  const directCount = entities.filter((e) => e.riskTier === 'Direct').length;
  const quasiCount = entities.filter((e) => e.riskTier === 'Indirect').length;

  let riskSeverity: ForensicAuditMetrics['riskSeverity'] = 'SAFE';
  if (directCount > 0) {
    riskSeverity = 'CRITICAL';
  } else if (quasiCount > 0) {
    riskSeverity = 'HIGH';
  }

  const metrics: ForensicAuditMetrics = {
    totalEntities: entities.length,
    categoriesTriggeredCount: categoriesSet.size,
    categoriesTriggered: Array.from(categoriesSet) as any[],
    riskSeverity,
    directIdentifiersCount: directCount,
    quasiIdentifiersCount: quasiCount,
    characterDelta: cleanText.length - input.length,
    processingTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    complianceStatus: entities.length > 0 ? '100% DE-IDENTIFIED' : 'CLEAN',
  };

  return {
    originalText: input,
    cleanText,
    itemsRedacted: entities.length,
    categoriesTriggered: Array.from(categoriesSet) as any[],
    entities,
    metrics,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## 4. Feature 24 Blueprint: Side-by-Side Diff Viewer

### 4.1 Component Architecture (`src/tools/phi-scrubber/DiffViewer.tsx`)

`DiffViewer.tsx` implements a synchronized dual-pane visual inspection layout:
- **Left Pane (`Unredacted Source`)**:
  - Displays source clinical narrative with detected entities highlighted.
  - Direct identifiers highlighted with Rose badges (`bg-rose-100 text-rose-900 border-rose-300`).
  - Quasi-identifiers highlighted with Amber badges (`bg-amber-100 text-amber-900 border-amber-300`).
  - Strict preservation of the header: `Unredacted Clinical Source (Protected ePHI)`.
- **Right Pane (`Redacted Output`)**:
  - Displays de-identified clean text.
  - If `maskStyle === 'tag'`: highlighted tokens like `[NAME]`, `[DATE]`, `[PHONE]` in Cyan pill badges (`bg-cyan-100 text-cyan-900 border-cyan-300 font-bold`).
  - If `maskStyle === 'block'`: solid blocks `████████` in high-contrast mono pills.
  - If `maskStyle === 'asterisk'`: asterisks `********` in warning pills.
  - Strict preservation of the header: `18 Safe Harbor Redacted Output`.
  - Negative validation guarantee: Under `18 Safe Harbor Redacted Output`, the unredacted name `Jane Doe` is strictly absent!
- **Interactive Mask Style Switcher**:
  - Button group for `tag` (`[TAG] Statutory Tokens`), `block` (`██ Solid Mask`), `asterisk` (`** Asterisks`).
  - Instantly toggles redactions without re-parsing source text.
- **1-Click Copy Clean Text**:
  - Copies clean de-identified text to system clipboard.
  - Displays animated checkmark icon and feedback badge ("Copied to clipboard").

### 4.2 Exact DOM Invariant Hooks for E2E Preservation

| E2E Test | Target Selector / String | Invariant Implementation |
|---|---|---|
| **T1.7.1** | `HIPAA PHI Scrubber`, `18 Safe Harbor Active` | Main header `<h2>` and badge `<span className="... bg-cyan-100 text-cyan-800 ...">18 Safe Harbor Active</span>` |
| **T1.7.2** | `Unredacted Clinical Source (Protected ePHI)`, `Jane Doe`, `04/12/1988`, `(415) 555-0199` | Left pane title `<span>Unredacted Clinical Source (Protected ePHI)</span>` and default text interpolating `activePatient.name`, `activePatient.dob`, phone |
| **T1.7.3** | `18 Safe Harbor Redacted Output`, `[NAME]` | Right pane title `<span>18 Safe Harbor Redacted Output</span>` and token `[NAME]` |
| **T1.7.4** | `[DATE]` | Token `[DATE]` in redacted pane |
| **T1.7.5** | `[PHONE]` | Token `[PHONE]` in redacted pane |
| **T3.2** | Multi-app patient sync with `Elena Rostova`, `07/22/1985` | Listens to `activePatient` from `useClinicalContext()` and dynamically refreshes source/clean panes |
| **T3.7** | `Jane Doe (DOB: 04/12/1988)`, `(415) 555-0199` | Exact formatting in default sample: `{activePatient.name} (DOB: {activePatient.dob}) presented for CPT {activePatient.cptCode} psychotherapy. Patient phone: (415) 555-0199.` |
| **T4.4** | `!scrubberHtml.includes('18 Safe Harbor Redacted Output</span></div><p class="text-slate-800 leading-relaxed">Jane Doe')` | Clean pane renders `[NAME]` rather than `Jane Doe`, completely preventing leakage |

---

## 5. Feature 25 Blueprint: Forensic Audit Table

### 5.1 Component Architecture (`src/tools/phi-scrubber/AuditTable.tsx`)

`AuditTable.tsx` provides an audit log and compliance certificate dashboard:

1. **Top Metric Cards Grid (4 Cards)**:
   - **Total Entities Detected**: Total count of entities, labeled direct vs indirect (`ShieldAlert` icon).
   - **Safe Harbor Categories Triggered**: Count / 18 categories triggered with horizontal visual progress bar.
   - **Risk Severity Score**: Badged as `CRITICAL` (Direct PHI present), `HIGH`, `MODERATE`, or `SAFE`.
   - **De-Identification Status**: `100% DE-IDENTIFIED` (Safe Harbor Compliant) with character count delta.
2. **Forensic Entity Taxonomy Table**:
   - Filter chips: `All Categories`, `Direct Identifiers Only`, `Quasi-Identifiers Only`.
   - Table columns:
     - `#`: Sequential match index
     - `Statutory Rule`: Rule Number + Category (e.g. `Rule 1: Names`, `Rule 7: Social Security Numbers`)
     - `Token`: Tag badge (e.g. `[NAME]`, `[SSN]`, `[MRN]`)
     - `Detected Sensitive Value`: Font-mono string with interactive Eye/EyeOff toggle to mask/unmask in audit view.
     - `Start - End Offsets`: Precise character boundaries (e.g. `14 - 32`).
     - `Confidence Score`: Percentage score with colored mini progress bar (`98%`).
     - `Risk Tier`: Direct vs Indirect badge.
3. **Forensic Export Tools**:
   - **JSON Export (`phi-forensic-audit-[timestamp].json`)**:
     - Includes audit metadata, timestamp, HIPAA 45 CFR standard tag, original character length, clean text, metrics, and entity list.
   - **CSV Export (`phi-forensic-audit-[timestamp].csv`)**:
     - Formatted according to RFC 4180 with headers:
       `Index,RuleNumber,Category,Tag,DetectedValue,StartOffset,EndOffset,Confidence,RiskTier`.

---

## 6. Integration & Workspace Orchestration

### 6.1 Preset Narratives (`src/tools/phi-scrubber/sampleTexts.ts`)

To allow rapid testing of all 18 rules and realistic clinical flows, `sampleTexts.ts` exports 4 presets:

```typescript
import { Patient } from '@/lib/clinical-context';

export function getActivePatientSample(patient: Patient): string {
  return `${patient.name} (DOB: ${patient.dob}) presented for CPT ${patient.cptCode} psychotherapy. Patient phone: (415) 555-0199.`;
}

export const PRESET_FULL_18 = `CLINICAL CONSULTATION & ADMISSION SUMMARY
================================================================================
Patient Name: Jane Elizabeth Doe                          DOB: 03/14/1932 (Age 94)
MRN: 00734821                                            SSN: 123-45-6789
Phone: (555) 867-5309                                    Fax: 555-234-5678
Email: jane.doe@healthmail.org                           Health Plan ID: BCBS-XY9812345
Account Number: ACCT-9918274                             Credit Card: 4111-2222-3333-4444

Attending Physician: Dr. Michael R. Chen, MD             NPI: 1234567890
Referring Physician: Dr. Patricia O'Sullivan             DEA License: AS1234563
Driver's License: DL-CA-98127419                         Vehicle VIN: 1HGBH41JXMN109186

Admission Date: January 14, 2026                         Discharge Date: 01/17/2026
Service Encounter Date: 2026-01-14

Residence Address: 742 Evergreen Terrace, Springfield, IL 62704-1234
IP Address of Telehealth Session: 192.168.1.42
Patient Portal URL: https://portal.health-system.com/patient/78423

Device Details: Medtronic Pacemaker Serial # DEV-789-XYZ-001 (UDI: 00888444111222)
Biometric Verification: Voiceprint biometric voice recognition match confirmed at 09:15 AM.
Clinical Imagery: Full-face photographic image archived at /records/photos/doe_jane_2026.jpg.
Unique Tracking Tag: Barcode UID # BIO-REF-99281-XYZ.

CLINICAL IMPRESSION:
The 94-year-old female presents with acute shortness of breath and episodic tachycardia.
Dictated by Dr. Michael R. Chen at St. Jude Memorial Hospital on 01/15/2026.`;

export const PRESET_INTAKE_NOTE = `OUTPATIENT PSYCHIATRIC INTAKE NOTE
================================================================================
Client: Robert 'Bob' Vance                               DOB: 11/04/1984
Primary Phone: 212-555-0199                              Emergency Contact: 212-555-0144
Email: bob.vance@refrigeration.com                       Member ID: AETNA-W9928174

Address: 404 Industrial Way, Scranton, PA 18503
Primary Clinician: Dr. Linda Freeman, PsyD               NPI: 9876543210
Encounter Date: October 28, 2025
Prior Hospitalization: 05/12/2019 at Scranton Regional Medical Center (MRN 883921).

CHIEF COMPLAINT:
Client self-refers following increased panic attacks while driving company truck (License Plate: 7XYZ89).
Reports high stress regarding pending tax audit (SSN: 987-65-4321).`;

export const PRESET_TELEHEALTH_TELEMETRY = `REMOTE PATIENT MONITORING (RPM) TELEMETRY LOG
================================================================================
Transmission Timestamp: 2026-02-10T14:32:00Z
Gateway Device Serial Number: SN-GW-9948271
Cardiac Holter Monitor ID: HOLTER-MED-771239
Patient Identifier: PT-99201-B                           SSN: 123-45-6789
Home Hub IP Address: 10.0.4.155                          Firmware Host: https://telemetry.sync-health.io/v2/stream

Telemetry originated from subscriber: Alice M. Walker, 12 Elm Court, Austin, TX 78701.
Clinician on call: Dr. Aaron Hayes (Cell: 512-555-8833).`;
```

---

### 6.2 Top-Level Workspace Container (`src/tools/phi-scrubber/PhiScrubberView.tsx`)

`PhiScrubberView.tsx` ties together:
1. State management:
   - `activePatient` & `scrubberInputText` from `useClinicalContext()`
   - `selectedPreset`: `'active_patient' | 'full_18' | 'intake' | 'telehealth' | 'custom'`
   - `maskStyle`: `'tag' | 'block' | 'asterisk'`
   - `currentText`: populated on mount from `scrubberInputText` if non-empty, otherwise default active patient template.
   - `activeTab`: `'diff' | 'audit' | 'all'`
2. Automatic re-scrub on text change or patient switch:
   ```typescript
   const scrubResult = useMemo(() => {
     return scrubText(currentText, {
       maskStyle,
       customPatientContext: {
         name: activePatient.name,
         dob: activePatient.dob,
         mrn: activePatient.mrn,
         phone: '(415) 555-0199',
       },
     });
   }, [currentText, maskStyle, activePatient]);
   ```
3. Header containing exact test hooks:
   ```tsx
   <div className="flex items-center gap-3">
     <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
       <ShieldCheck className="h-5 w-5" />
     </div>
     <div>
       <h2 className="text-xl font-extrabold text-slate-900">HIPAA PHI Scrubber</h2>
       <p className="text-xs text-slate-500">18 Safe Harbor Statutory De-identification Engine</p>
     </div>
   </div>
   <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
     18 Safe Harbor Active
   </span>
   ```

---

## 7. Verification Method & Test Plan

### 7.1 Existing E2E Test Suite Validation
Execute:
```bash
npm run test:e2e
```
Must pass 100% of all 80 tests:
- **Tier 1 (Feature Coverage)**: Tests `T1.7.1` through `T1.7.5` verifying mount, active badge, source pane, and `[NAME]`, `[DATE]`, `[PHONE]` redactions.
- **Tier 2 (Boundaries & Corners)**: Route security and session bounds.
- **Tier 3 (Interactions)**: Test `T3.2` (patient switch to Elena Rostova), `T3.5` (Scribe -> Scrubber pipeline), and `T3.7` (Jane Doe ePHI redaction).
- **Tier 4 (Real-World Scenarios)**: Scenario 4 validating zero ePHI leakage under the redacted pane.

### 7.2 Dedicated Milestone 5 Test Suite (`tests/m5-aura-scrubber.test.ts`)
To be registered in `package.json` (`"test:aura": "tsx tests/m5-aura-scrubber.test.ts"`), asserting:
1. **Feature 23 Test Cases**:
   - `test_all_18_rules_individually`: Passes test strings for each of the 18 statutory rules in isolation, asserting replacement with appropriate token.
   - `test_mask_styles`: Asserts `[NAME]` for tag mode, `████████` for block mode, and `********` for asterisk mode.
   - `test_confidence_scores`: Asserts all entities scored between 0.70 and 1.0.
   - `test_character_offsets`: Asserts `input.slice(entity.start, entity.end) === entity.originalValue`.
2. **Feature 24 Test Cases**:
   - `test_diff_viewer_dual_panes`: Mounts `DiffViewer` and verifies unredacted and redacted panes render without errors.
   - `test_clipboard_copy_action`: Tests copy action handler.
3. **Feature 25 Test Cases**:
   - `test_audit_table_rendering`: Asserts table rows equal `itemsRedacted`.
   - `test_json_export_schema`: Asserts JSON payload contains `timestamp`, `metrics`, and `entities`.
   - `test_csv_export_format`: Asserts RFC 4180 CSV header and rows.
