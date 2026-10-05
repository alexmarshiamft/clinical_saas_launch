import { ClinicalVariableContext, VariableDefinition, InterpolationOptions } from './types';

export const SUPPORTED_VARIABLES = [
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

/**
 * Strict Denylist: Metaprogramming and Object.prototype identifiers
 * that must NEVER be resolved, interpolated, or polluted.
 */
const FORBIDDEN_PROTOTYPE_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'tostring',
  'valueof',
  'tolocalestring',
  'hasownproperty',
  'isprototypeof',
  'propertyisenumerable',
  '__definegetter__',
  '__definesetter__',
  '__lookupgetter__',
  '__lookupsetter__',
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

        // Guard 3: Reject functions and symbols
        if (typeof val === 'function' || typeof val === 'symbol') {
          continue;
        }

        // Support array values (e.g. ['Penicillin', 'Sulfa'])
        if (Array.isArray(val)) {
          safeLookup[cleanKey] = val.join(', ');
          continue;
        }

        // Reject non-array nested objects to prevent [object Object] leakage
        if (typeof val === 'object' && val !== null) {
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
  optionsOrCustom?: Record<string, any> | InterpolationOptions
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
      'unmappedFallback' in optionsOrCustom ||
      'trimTokenWhitespace' in optionsOrCustom
    ) {
      const opts = optionsOrCustom as InterpolationOptions;
      customVars = opts.customVariables as Record<string, any>;
      cleanUnmapped = Boolean(opts.cleanUnmapped);
      unmappedFallback = opts.unmappedFallback;
    } else {
      customVars = optionsOrCustom as Record<string, any>;
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
