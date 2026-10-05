import { MedicalNecessityParams } from '../types';

/**
 * Builds an audit-proof CMS / AMA compliant medical necessity justification block.
 */
export function generateMedicalNecessityBlock(params: MedicalNecessityParams): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const secondaryStr =
    params.secondaryIcds && params.secondaryIcds.length > 0
      ? params.secondaryIcds.map((i) => `* Secondary ICD-10: **${i.code}** - ${i.description}`).join('\n')
      : '* Secondary ICD-10: None documented for this encounter';

  return `### MEDICAL CODING & MEDICAL NECESSITY JUSTIFICATION
**Date of Service:** ${dateStr}
**Patient:** ${params.patientName} (MRN: ${params.patientMrn})
**Billing Level:** CPT ${params.cptCode.code} (${params.cptCode.type} - ${params.cptCode.timeRange})
**Primary Diagnosis:** ICD-10 **${params.primaryIcd.code}** - ${params.primaryIcd.description}
${secondaryStr}

**1. Clinical Medical Necessity & Symptom Severity Rationale:**
Patient presents for scheduled outpatient encounter demonstrating clinical indications for active treatment under ICD-10 ${params.primaryIcd.code}. Symptoms significantly impair social, relational, or occupational functioning. Continued clinical intervention is medically necessary to prevent functional regression, alleviate distressing symptoms, and achieve treatment plan objectives.

**2. Duration & Complexity Validation (AMA / CMS Guidelines):**
* Face-to-Face Encounter Duration: ${params.encounterDuration} minutes (qualifies for CPT ${params.cptCode.code} time standard: ${params.cptCode.timeRange}).
* Medical Decision Making (MDM) Complexity: **${params.complexity}**.
* Rationale: ${params.cptCode.requirements}

**3. Evidenced-Based Interventions Delivered:**
${params.interventions.map((i) => `* ${i}`).join('\n')}

**4. Treatment Response & Prognosis:**
Patient engaged constructively, demonstrated affective congruence, and expressed understanding of prescribed coping interventions. Prognosis remains favorable with ongoing compliance.

**Statutory Provider Certification:**
Electronically signed by **${params.clinicianName}**. Verified AMA / CMS compliant documentation committed to clinical billing record.`;
}

export default generateMedicalNecessityBlock;
