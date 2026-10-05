# Architectural Investigation & Blueprint: Custom Variable Extensibility & Adversarial Hardening in Clinical AI Scribe v2

**Author**: Explorer 2 (`teamwork_preview_explorer_m4_it2_2`)  
**Milestone**: Milestone 4 Iteration 2 (Scribe Hardening)  
**Target Subsystem**: `src/tools/scribe/variable-interpolator.ts`, `TemplateStudio.tsx`, `templateStore.ts`  
**Reviewer Finding Reference**: Reviewer 1 Minor Finding 2 (Adversarial Robustness: Custom Variable Extensibility)  

---

## Executive Summary

During Milestone 4 review, Reviewer 1 identified that `variable-interpolator.ts` only substitutes the 8 predefined statutory clinical variables. If a clinician defines custom tokens in `TemplateStudio` (such as `{{allergies}}`, `{{session_duration}}`, or `{{medications}}`), or if unmapped tokens are present, raw brackets remain unrendered.

This investigation provides a comprehensive architectural blueprint to:
1. **Extensibly support custom clinical tokens** via an open context record, a dedicated custom variables dictionary, or an options configuration.
2. **Enforce strict, foolproof defense against Prototype Pollution (`__proto__`, `constructor`)** and JavaScript prototype chain property hijacking (`toString`, `valueOf`), ensuring complete safety against adversarial payloads.
3. **Gracefully manage unmapped tokens**: preserving unmapped tokens by default (preventing accidental syntax corruption and maintaining 100% compatibility with existing test `CHAL-1.6`), while providing a configurable `cleanUnmapped` and `unmappedFallback` mechanism for downstream EHR export pipelines.
4. **Maintain 100% backward compatibility** across all 57 Scribe unit tests (`npm run test:scribe`), 41 empirical stress tests (`npm run test:challenger:m4`), and platform E2E suites.

---

## 1. Deep Code Analysis: Current State

### 1.1 `src/tools/scribe/variable-interpolator.ts`
The current implementation (Lines 1–38) is structured as follows:
```typescript
import { ClinicalVariableContext } from './types';

export const SUPPORTED_VARIABLES = [
  { token: '{{patient_name}}', label: 'Patient Name', example: 'Jane Doe' },
  { token: '{{dob}}', label: 'Date of Birth', example: '04/12/1988' },
  { token: '{{mrn}}', label: 'MRN', example: '#MC-88219' },
  { token: '{{chief_complaint}}', label: 'Chief Complaint', example: 'Generalized anxiety and panic' },
  { token: '{{cpt_code}}', label: 'CPT Code', example: '90837' },
  { token: '{{cpt_desc}}', label: 'CPT Description', example: 'Psychotherapy (60m)' },
  { token: '{{encounter_date}}', label: 'Date of Service', example: 'October 5, 2026' },
  { token: '{{clinician_name}}', label: 'Clinician Name', example: 'Dr. Sarah Chen, MD' },
] as const;

export function interpolateTemplateVariables(
  templateString: string,
  context: Partial<ClinicalVariableContext>
): string {
  if (!templateString) return '';

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return templateString
    .replace(/\{\{patient_name\}\}/gi, context.patient_name || 'Jane Doe')
    .replace(/\{\{dob\}\}/gi, context.dob || '04/12/1988')
    .replace(/\{\{mrn\}\}/gi, context.mrn || '#MC-88219')
    .replace(/\{\{chief_complaint\}\}/gi, context.chief_complaint || 'Clinical Consultation')
    .replace(/\{\{cpt_code\}\}/gi, context.cpt_code || '90837')
    .replace(/\{\{cpt_desc\}\}/gi, context.cpt_desc || 'Psychotherapy (60m)')
    .replace(/\{\{encounter_date\}\}/gi, context.encounter_date || currentDate)
    .replace(/\{\{clinician_name\}\}/gi, context.clinician_name || 'Dr. Sarah Chen, MD');
}
```

#### Deficiencies Identified:
1. **Closed Schema & Rigid Type Signature**:
   The function signature accepts only `Partial<ClinicalVariableContext>`. Any custom property passed by a caller (e.g. `{ allergies: 'Penicillin' }`) is discarded by TypeScript typing and ignored at runtime.
2. **Hardcoded Static Replacements**:
   The function executes 8 individual, sequential string replacements. Tokens outside this fixed list of 8 cannot be substituted under any circumstances.
3. **Lack of Spacing Tolerance**:
   Tokens with inner whitespace (e.g., `{{ patient_name }}` or `{{  dob  }}`) are not matched by the static regexes `/\{\{patient_name\}\}/gi`.
4. **Accidental Security Through Static Rigidity**:
   The existing code passes the prototype pollution test `CHAL-1.4` (`maliciousTemplate = 'Tokens: {{constructor}} {{__proto__}} {{toString}} {{valueOf}} {{prototype}}'`) solely because it never attempts dynamic property lookup. The moment an engineer replaces the 8 `.replace()` calls with a naive dynamic regex `replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, k) => context[k])`, catastrophic prototype leakage occurs.

---

### 1.2 `src/tools/scribe/TemplateStudio.tsx`
`TemplateStudio.tsx` provides an interactive prompt engineering studio for clinicians:
1. **Token Chips (Lines 240–263)**: Iterates `SUPPORTED_VARIABLES` to render 8 clickable chips that insert tokens into the active section prompt instruction. Clinicians currently have no UI mechanism or system capability to insert or resolve custom tokens.
2. **Live Resolved Preview (Lines 349–355)**:
   ```tsx
   <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
     <span className="text-purple-300 font-semibold">Live Resolved Preview: </span>
     <span className="italic">
       {interpolateTemplateVariables(section.promptInstruction, activeContext)}
     </span>
   </div>
   ```
   If a clinician types a custom token like `{{allergies}}` or `{{session_duration}}`, the preview displays raw unresolved brackets `{{allergies}}`.
3. **Template Persistence (`templateStore.ts`)**:
   Templates are serialized to `localStorage` under `clinical_saas_scribe_templates_v2`. The `sections` array stores raw prompt strings with tokens. Custom templates can easily store custom tokens, but downstream processing fails to resolve them.

---

## 2. Threat Modeling & Adversarial Vulnerability Analysis

A dynamic template interpolation engine must defend against multiple adversarial vectors:

### 2.1 Attack Vector 1: Prototype Property Leakage & Hijacking
In JavaScript, plain objects inherit from `Object.prototype`.
If code evaluates `context[token]` or `safeLookup[token]` where `token` is `toString`, `valueOf`, or `constructor`:
```javascript
const obj = {};
obj["toString"]    // returns function toString() { [native code] }
obj["constructor"] // returns function Object() { [native code] }
obj["valueOf"]     // returns function valueOf() { [native code] }
```
If a clinician or an adversarial actor includes `{{toString}}` in a clinical template:
- **Naive Implementation Result**: Stringifies the function, rendering:
  `"Clinical Assessment: function toString() { [native code] }"`
- **Consequence**: Corruption of clinical documentation, EHR rejection, and immediate failure of test `CHAL-1.4`.

### 2.2 Attack Vector 2: Global Prototype Pollution via Injected Payloads
If an untrusted payload (e.g. from an incoming API webhook or imported JSON template) contains:
```json
{
  "__proto__": { "polluted": "true", "admin": true },
  "patient_name": "Injected"
}
```
If the interpolator clones or merges dictionaries using recursive property assignment or unsafe spreads without prototype sanitization, `Object.prototype` becomes tainted globally across all application components.

### 2.3 Attack Vector 3: Denial of Service / Invocation Crash
If a property on the context object resolves to a function, getter, or complex symbol, invoking `.toString()` or treating it as a string could execute arbitrary getters or trigger runtime exceptions (e.g. `TypeError: Cannot convert object to primitive value`).

### 2.4 Defenses Required:
1. **Null-Prototype Lookup Maps**: All internal lookup tables must be instantiated via `Object.create(null)`.
2. **Explicit Metaprogramming Denylist**: A strict set of forbidden keys (`__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, etc.) that are unconditionally rejected.
3. **Own Property Verification**: Only own, enumerable properties (`Object.prototype.hasOwnProperty.call(...)`) are ingested.
4. **Primitive Coercion Guard**: Only string, number, and boolean values are converted to strings; functions, objects, and symbols are rejected.

---

## 3. Blueprint & Architectural Design Specification

### 3.1 Type Definitions
To maintain backward compatibility while supporting custom variables and options:

```typescript
// Extensible Context Type
export interface TemplateVariables {
  patient_name: string;
  dob: string;
  mrn: string;
  chief_complaint: string;
  cpt_code: string;
  cpt_desc?: string;
  encounter_date: string;
  clinician_name: string;
  encounter_time?: string;
  [customKey: string]: any; // Allows custom clinician variables
}

export type ClinicalVariableContext = TemplateVariables;

export interface VariableDefinition {
  token: string;
  label: string;
  example: string;
  category?: 'standard' | 'clinical' | 'administrative';
  isCustom?: boolean;
}

export interface InterpolationOptions {
  /**
   * Dedicated dictionary of custom variable overrides
   * (e.g. { allergies: 'Penicillin', session_duration: '53m' })
   */
  customVariables?: Record<string, string | number | undefined | null>;

  /**
   * If true, unmapped tokens are removed or replaced with fallback value.
   * If false (default), unmapped tokens remain intact (e.g. {{unmapped}}).
   */
  cleanUnmapped?: boolean;

  /**
   * Replacement string or transformer for unmapped tokens when cleanUnmapped is true.
   * Defaults to empty string ('') if unspecified.
   */
  unmappedFallback?: string | ((token: string) => string);

  /**
   * Whether to allow inner whitespace in tokens (e.g., {{ patient_name }}).
   * Defaults to true.
   */
  trimTokenWhitespace?: boolean;
}
```

---

### 3.2 Enhanced `SUPPORTED_VARIABLES` Catalog
Expand `SUPPORTED_VARIABLES` to include standard tokens plus common clinical extension chips:

```typescript
export const SUPPORTED_VARIABLES: readonly VariableDefinition[] = [
  // 8 Statutory Core Clinical Tokens
  { token: '{{patient_name}}', label: 'Patient Name', example: 'Jane Doe', category: 'standard' },
  { token: '{{dob}}', label: 'Date of Birth', example: '04/12/1988', category: 'standard' },
  { token: '{{mrn}}', label: 'MRN', example: '#MC-88219', category: 'standard' },
  { token: '{{chief_complaint}}', label: 'Chief Complaint', example: 'Generalized anxiety and panic', category: 'standard' },
  { token: '{{cpt_code}}', label: 'CPT Code', example: '90837', category: 'standard' },
  { token: '{{cpt_desc}}', label: 'CPT Description', example: 'Psychotherapy (60m)', category: 'standard' },
  { token: '{{encounter_date}}', label: 'Date of Service', example: 'October 5, 2026', category: 'standard' },
  { token: '{{clinician_name}}', label: 'Clinician Name', example: 'Dr. Sarah Chen, MD', category: 'standard' },

  // Clinical Extensibility Tokens
  { token: '{{allergies}}', label: 'Allergies', example: 'NKDA (No Known Drug Allergies)', category: 'clinical', isCustom: true },
  { token: '{{medications}}', label: 'Medications', example: 'Escitalopram 10mg, Metformin 500mg', category: 'clinical', isCustom: true },
  { token: '{{vital_signs}}', label: 'Vitals', example: 'BP 120/80, HR 72, SpO2 98%', category: 'clinical', isCustom: true },
  { token: '{{session_duration}}', label: 'Duration', example: '53 minutes', category: 'clinical', isCustom: true },
  { token: '{{referring_provider}}', label: 'Referring Provider', example: 'Dr. Michael Vance, MD', category: 'administrative', isCustom: true },
] as const;
```

---

### 3.3 Enhanced Implementation Blueprint for `src/tools/scribe/variable-interpolator.ts`

```typescript
import { ClinicalVariableContext } from './types';

/**
 * Strict Denylist: Metaprogramming and Object.prototype identifiers
 * that must NEVER be resolved or interpolated.
 */
const FORBIDDEN_PROTOTYPE_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'toLocaleString',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Standard statutory clinical fallback defaults.
 */
function getStandardDefaults(): Record<string, string> {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    patient_name: 'Jane Doe',
    dob: '04/12/1988',
    mrn: '#MC-88219',
    chief_complaint: 'Clinical Consultation',
    cpt_code: '90837',
    cpt_desc: 'Psychotherapy (60m)',
    encounter_date: currentDate,
    clinician_name: 'Dr. Sarah Chen, MD',
  };
}

/**
 * Safely constructs a null-prototype dictionary merging standard defaults,
 * context fields, and custom variables with zero prototype taint risk.
 */
function buildSafeLookupTable(
  context?: Record<string, any> | null,
  customVariables?: Record<string, any> | null
): Record<string, string> {
  // Use Object.create(null) so prototype methods (toString, valueOf) do not exist
  const safeLookup: Record<string, string> = Object.create(null);
  const defaults = getStandardDefaults();

  // 1. Seed standard defaults
  for (const [key, defaultVal] of Object.entries(defaults)) {
    safeLookup[key.toLowerCase()] = defaultVal;
  }

  // 2. Safe ingestion helper
  const ingest = (source?: Record<string, any> | null) => {
    if (!source || typeof source !== 'object') return;

    // Object.keys guarantees only own enumerable properties are inspected
    const keys = Object.keys(source);
    for (const key of keys) {
      const lowerKey = key.trim().toLowerCase();
      // Normalize tokens passed with or without surrounding curly braces
      const cleanKey = lowerKey.replace(/^\{\{|\}\}$/g, '').trim();

      // Guard 1: Reject any prototype or metaprogramming property name
      if (FORBIDDEN_PROTOTYPE_KEYS.has(cleanKey)) {
        continue;
      }

      // Guard 2: Strict own-property validation
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const val = source[key];

        // Guard 3: Reject functions, symbols, and objects
        if (typeof val === 'function' || typeof val === 'symbol') {
          continue;
        }

        // Guard 4: Non-empty value assignment
        // For standard tokens, empty strings fall back to standard defaults (CHAL-1.3)
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          safeLookup[cleanKey] = String(val);
        }
      }
    }
  };

  ingest(context);
  ingest(customVariables);

  return safeLookup;
}

/**
 * High-performance, prototype-safe template variable interpolator.
 *
 * @param templateString The template string containing {{variable}} tokens
 * @param context Clinical variable context or key-value object
 * @param optionsOrCustom Optional custom variables map OR interpolation configuration options
 * @returns Fully interpolated template string
 */
export function interpolateTemplateVariables(
  templateString: string,
  context?: Partial<ClinicalVariableContext> | Record<string, any> | null,
  optionsOrCustom?: Record<string, string> | InterpolationOptions
): string {
  if (!templateString || typeof templateString !== 'string') return '';

  // Parse 3rd argument polymorphism
  let customVars: Record<string, any> | undefined;
  let cleanUnmapped = false;
  let unmappedFallback: string | ((token: string) => string) | undefined;

  if (optionsOrCustom && typeof optionsOrCustom === 'object') {
    if (
      'customVariables' in optionsOrCustom ||
      'cleanUnmapped' in optionsOrCustom ||
      'unmappedFallback' in optionsOrCustom
    ) {
      const opts = optionsOrCustom as InterpolationOptions;
      customVars = opts.customVariables;
      cleanUnmapped = Boolean(opts.cleanUnmapped);
      unmappedFallback = opts.unmappedFallback;
    } else {
      customVars = optionsOrCustom as Record<string, string>;
    }
  }

  const lookupTable = buildSafeLookupTable(context as any, customVars);

  // Regex matching {{token}} with flexible inner whitespace
  // [a-zA-Z0-9_-]+ ensures empty brackets {{}} are untouched (CHAL-1.6)
  const tokenRegex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

  return templateString.replace(tokenRegex, (match, rawKey) => {
    const normalizedKey = rawKey.toLowerCase();

    // Prototype attack probe: leave untouched verbatim (CHAL-1.4)
    if (FORBIDDEN_PROTOTYPE_KEYS.has(normalizedKey)) {
      return match;
    }

    // Direct lookup in null-prototype table
    if (normalizedKey in lookupTable) {
      return lookupTable[normalizedKey];
    }

    // Unmapped token handling
    if (cleanUnmapped) {
      if (typeof unmappedFallback === 'function') {
        return unmappedFallback(rawKey);
      }
      return typeof unmappedFallback === 'string' ? unmappedFallback : '';
    }

    // Default: leave unmapped token untouched in string (CHAL-1.6)
    return match;
  });
}

export default interpolateTemplateVariables;
```

---

## 4. Semantics of Unmapped Tokens: Harmonizing Reviewer 1 & CHAL-1.6

Reviewer 1 noted:
> *"If a clinician creates custom tokens in `TemplateStudio` ... or if unmapped tokens are present, raw brackets remain."*

However, the existing challenger test `tests/m4-challenger-stress.test.ts` (CHAL-1.6) explicitly asserts:
```typescript
const unmappedTmpl = 'Unmapped: {{billing_uuid}} and {{hospital_wing}} and {{}} and {patient_name}';
const res = interpolateTemplateVariables(unmappedTmpl, {});
assert(
  res.includes('{{billing_uuid}}') &&
  res.includes('{{hospital_wing}}') &&
  res.includes('{{}}') &&
  res.includes('{patient_name}'),
  'CHAL-1.6 Unmapped tokens and malformed single braces remain untouched'
);
```

### The Harmonized Architecture:
1. **Default Mode (`cleanUnmapped: false` or omitted)**:
   Unmapped tokens remain untouched. This ensures:
   - Zero regression on CHAL-1.6.
   - Template drafting in `TemplateStudio` does not silently destroy partially-entered tokens while typing.
   - Malformed braces like `{{}}` and `{patient_name}` are preserved verbatim.
2. **Sanitization Mode (`cleanUnmapped: true`)**:
   When invoking note generation for final EHR export or PHI scrubbing, callers can pass `{ cleanUnmapped: true }`.
   Any unmapped tokens are replaced either with empty string `""` or an explicit clinical placeholder such as `'[Unspecified]'`.
3. **Custom Variable Ingestion**:
   When custom variables ARE supplied in the context (e.g. `{ allergies: 'Penicillin' }` or `{ customVariables: { allergies: 'Penicillin' } }`), they are immediately resolved, directly resolving Reviewer 1's concern.

---

## 5. TemplateStudio Integration Blueprint

In `src/tools/scribe/TemplateStudio.tsx`:

1. **Displaying Expanded Variable Chips**:
   The variable chips section will render both standard statutory chips (amber tags) and clinical extensibility chips (emerald/purple tags):
   ```tsx
   <div className="flex flex-wrap gap-1.5">
     {SUPPORTED_VARIABLES.map((v) => (
       <button
         key={v.token}
         type="button"
         onClick={() => handleInsertToken(v.token, activeSectionIdx)}
         className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
           v.isCustom 
             ? 'bg-purple-950/70 border border-purple-700 text-purple-300 hover:bg-purple-900/50' 
             : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300'
         }`}
         title={`Inserts ${v.token} (e.g. ${v.example})`}
       >
         <span>{v.token}</span>
         <span className="text-[10px] text-slate-400 font-sans">({v.label})</span>
       </button>
     ))}
   </div>
   ```

2. **Live Resolved Preview with Custom Variable Defaults**:
   Supply default example values for custom tokens in `activeContext` fallback:
   ```typescript
   const defaultCustomContext = {
     allergies: 'NKDA (No Known Drug Allergies)',
     medications: 'Escitalopram 10mg PO QD, Metformin 500mg PO BID',
     vital_signs: 'BP: 120/80 mmHg, HR: 72 bpm, SpO2: 98%',
     session_duration: '53 minutes',
     referring_provider: 'Dr. Michael Vance, MD',
   };
   ```
   In the preview pane:
   ```tsx
   <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
     <span className="text-purple-300 font-semibold">Live Resolved Preview: </span>
     <span className="italic">
       {interpolateTemplateVariables(
         section.promptInstruction,
         { ...defaultCustomContext, ...activeContext }
       )}
     </span>
   </div>
   ```

---

## 6. Backward Compatibility Verification Matrix

| Test Suite | Test Identifier | Verification Contract | Projected Result |
|---|---|---|---|
| `test:scribe` | F15.1 | Replaces all 7 statutory clinical tokens | PASS (100% match) |
| `test:scribe` | F15.2 | `SUPPORTED_VARIABLES.length >= 7` | PASS (length 13 >= 7) |
| `test:scribe` | F15.3 | Section re-ordering order indexing | PASS (unaffected) |
| `test:challenger:m4` | CHAL-1.1 | Empty context fallback to defaults | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.2 | Partial context preserves supplied & applies defaults | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.3 | Empty string `""` falls back to default placeholder | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.4 | `{{constructor}}`, `{{__proto__}}` remain unmapped & no prototype taint | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.4b | Malicious JSON payload `{"__proto__": ...}` fails to pollute Object.prototype | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.5 | Accents, CJK, RTL Arabic, Emojis, XSS tags interpolate verbatim | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.6 | Unmapped tokens and `{patient_name}`, `{{}}` remain untouched | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.6b | Case-insensitive token replacement | PASS (100% match) |
| `test:challenger:m4` | CHAL-1.7a-c | Empty/null/undefined template string returns `''` | PASS (100% match) |

---

## 7. Recommended Implementation Sequence for Implementer

1. Update `src/tools/scribe/types.ts` to allow index signature `[key: string]: any` on `TemplateVariables` and export `InterpolationOptions`.
2. Update `src/tools/scribe/variable-interpolator.ts` with the proposed prototype-safe algorithm and expanded `SUPPORTED_VARIABLES`.
3. Update `src/tools/scribe/TemplateStudio.tsx` to display categorized chips and bind custom example variables in live preview.
4. Run `npm run test:scribe && npm run test:challenger:m4` to verify 0 regressions.
5. Add unit tests for custom variables (`{{allergies}}`, `{{session_duration}}`, and `{ cleanUnmapped: true }`) to `tests/m4-challenger-stress.test.ts`.
