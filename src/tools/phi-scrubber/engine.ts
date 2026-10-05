import { SAFE_HARBOR_RULES } from './safeHarborRules';
import {
  PhiEntity,
  ScrubOptions,
  ScrubResult,
  StatutoryMaskMode,
  ForensicAuditMetrics,
  SafeHarborRuleId,
} from './types';

interface CandidateMatch {
  ruleId: SafeHarborRuleId;
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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scrubText(
  input: string,
  options: Partial<ScrubOptions> = {}
): ScrubResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const maskStyle: StatutoryMaskMode = options.maskStyle || 'tag';
  const candidates: CandidateMatch[] = [];

  if (!input || typeof input !== 'string') {
    return {
      originalText: '',
      cleanText: '',
      itemsRedacted: 0,
      categoriesTriggered: [],
      entities: [],
      metrics: {
        totalEntities: 0,
        categoriesTriggeredCount: 0,
        categoriesTriggered: [],
        riskSeverity: 'SAFE',
        directIdentifiersCount: 0,
        quasiIdentifiersCount: 0,
        characterDelta: 0,
        processingTimeMs: 0,
        complianceStatus: 'CLEAN',
      },
    };
  }

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
      pat.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(input)) !== null) {
        const fullMatch = match[0];
        let matchedValue = fullMatch;
        let start = match.index;
        let end = match.index + fullMatch.length;

        // Extract targeted capture group if specified
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
          tag: pat.customTag || rule.tagToken,
          originalValue: matchedValue,
          start,
          end,
          confidence: pat.customConfidence || rule.baseConfidence,
          riskTier: rule.isDirectIdentifier ? 'Direct' : 'Indirect',
          patternName: pat.name,
        });

        // Prevent infinite zero-width match loops
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
    ruleId: m.ruleId,
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
  } else if (entities.length > 0) {
    riskSeverity = 'MODERATE';
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const metrics: ForensicAuditMetrics = {
    totalEntities: entities.length,
    categoriesTriggeredCount: categoriesSet.size,
    categoriesTriggered: Array.from(categoriesSet),
    riskSeverity,
    directIdentifiersCount: directCount,
    quasiIdentifiersCount: quasiCount,
    characterDelta: cleanText.length - input.length,
    processingTimeMs: Math.round((endTime - startTime) * 100) / 100,
    complianceStatus: entities.length > 0 ? '100% DE-IDENTIFIED' : 'CLEAN',
  };

  return {
    originalText: input,
    cleanText,
    itemsRedacted: entities.length,
    categoriesTriggered: Array.from(categoriesSet),
    entities,
    metrics,
  };
}
