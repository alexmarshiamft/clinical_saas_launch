import { ICD10Code, CPTProcedureCode, CodeSuggestion } from '../types';
import { STATUTORY_ICD10_DATABASE, STATUTORY_CPT_DATABASE } from '../data/codingData';

/**
 * Real-time diagnostic matcher analyzing clinical narrative and dialogue.
 */
export function matchDiagnosticCodes(
  transcript: string = '',
  assessmentText: string = '',
  subjectiveText: string = ''
): CodeSuggestion[] {
  const combinedCorpus = `${transcript} ${assessmentText} ${subjectiveText}`.toLowerCase();
  const suggestions: CodeSuggestion[] = [];

  for (const icd of STATUTORY_ICD10_DATABASE) {
    const matchedKeywords: string[] = [];
    let score = 0;

    // Check keywords
    for (const kw of icd.keywords) {
      if (combinedCorpus.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
        score += 25;
      }
    }

    // Check diagnosis description and exact code mentions
    if (combinedCorpus.includes(icd.description.toLowerCase()) || combinedCorpus.includes(icd.code.toLowerCase())) {
      score += 45;
    }

    if (matchedKeywords.length > 0 || score > 0) {
      const confidence = Math.min(Math.max(score, 20), 99);
      suggestions.push({
        code: icd,
        confidence,
        matchedKeywords,
        rationale: `Matched ${matchedKeywords.length} clinical keyword(s): ${matchedKeywords.slice(0, 3).join(', ')}`,
      });
    }
  }

  // Sort descending by confidence score
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Recommends appropriate CPT procedure code based on encounter duration and visit type.
 */
export function recommendCptCode(
  durationMinutes: number,
  isInitialIntake: boolean = false
): CPTProcedureCode {
  if (isInitialIntake) {
    return STATUTORY_CPT_DATABASE.find((c) => c.code === '90791')!;
  }
  if (durationMinutes >= 53) {
    return STATUTORY_CPT_DATABASE.find((c) => c.code === '90837')!;
  }
  if (durationMinutes >= 38) {
    return STATUTORY_CPT_DATABASE.find((c) => c.code === '90834')!;
  }
  return STATUTORY_CPT_DATABASE.find((c) => c.code === '90832')!;
}
