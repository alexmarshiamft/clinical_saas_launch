import { EhrExportData } from '../types';

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function dateIsoSplit(iso: string): string {
  return iso.split('T')[0];
}

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

/**
 * 1. Epic Systems: SmartText / Dot-Phrase Format (.MARSHI_CLINICAL_NOTE)
 */
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

/**
 * 2. Epic Systems: HL7 FHIR R4 DocumentReference Resource JSON
 */
export function formatEpicFhirDocument(data: EhrExportData): string {
  const isoDate = new Date().toISOString();
  const rawNarrative = `SUBJECTIVE:\n${data.notes.subjective}\n\nOBJECTIVE:\n${data.notes.objective}\n\nASSESSMENT:\n${data.notes.assessment}\n\nPLAN:\n${data.notes.plan}`;
  const base64Data =
    typeof Buffer !== 'undefined'
      ? Buffer.from(rawNarrative).toString('base64')
      : typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(rawNarrative)))
      : '';

  const fhirResource = {
    resourceType: 'DocumentReference',
    id: `docref-${data.patient.id}-${Date.now()}`,
    status: 'current',
    docStatus: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11506-3',
          display: 'Progress note',
        },
      ],
      text: 'Outpatient Clinical Progress Note',
    },
    category: [
      {
        coding: [
          {
            system: 'http://loinc.org',
            code: 'LP173421-1',
            display: 'Report',
          },
        ],
      },
    ],
    subject: {
      reference: `Patient/${data.patient.id}`,
      display: data.patient.name,
    },
    date: isoDate,
    author: [
      {
        display: `${data.clinician.name} (NPI: ${data.clinician.npi})`,
      },
    ],
    description: `Clinical encounter progress note for ${data.patient.name} (CPT ${data.patient.cptCode})`,
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          data: base64Data,
          title: `Encounter_${data.patient.mrn}_${dateIsoSplit(isoDate)}.txt`,
        },
      },
    ],
    context: {
      encounter: [
        {
          reference: `Encounter/enc-${data.patient.id}`,
        },
      ],
      period: {
        start: isoDate,
      },
    },
  };

  return JSON.stringify(fhirResource, null, 2);
}

/**
 * 3. Oracle Health / Cerner: PowerChart Millennium Format
 */
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

/**
 * 4. Athenahealth: AthenaNet Clinical Encounter XML Format
 */
export function formatAthenaEncounter(data: EhrExportData): string {
  return `<athenanet_clinical_encounter version="2024.1">
  <encounter_metadata>
    <patient_id>${escapeXml(data.patient.id)}</patient_id>
    <patient_name>${escapeXml(data.patient.name)}</patient_name>
    <dob>${escapeXml(data.patient.dob)}</dob>
    <mrn>${escapeXml(data.patient.mrn)}</mrn>
    <provider_name>${escapeXml(data.clinician.name)}</provider_name>
    <provider_npi>${escapeXml(data.clinician.npi)}</provider_npi>
    <cpt_code>${escapeXml(data.patient.cptCode)}</cpt_code>
    <primary_diagnosis>${escapeXml(data.primaryIcd || 'F41.1')}</primary_diagnosis>
  </encounter_metadata>
  <section id="hpi_subjective">
    <title>Subjective / History of Present Illness</title>
    <content>${escapeXml(data.notes.subjective)}</content>
  </section>
  <section id="exam_objective">
    <title>Objective / Mental Status &amp; Vitals</title>
    <content>${escapeXml(data.notes.objective)}</content>
  </section>
  <section id="assessment_diagnoses">
    <title>Assessment &amp; Clinical Formulations</title>
    <content>${escapeXml(data.notes.assessment)}</content>
  </section>
  <section id="treatment_plan">
    <title>Treatment Plan &amp; Interventions</title>
    <content>${escapeXml(data.notes.plan)}</content>
  </section>
</athenanet_clinical_encounter>`;
}

/**
 * 5. Universal Clean Rich Text / Markdown
 */
export function formatMarkdownUniversal(data: EhrExportData): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `# CLINICAL CONSULTATION PROGRESS NOTE
**Patient:** ${data.patient.name} | **DOB:** ${data.patient.dob} | **MRN:** ${data.patient.mrn}  
**Date of Service:** ${dateStr} | **CPT Level:** ${data.patient.cptCode}  
**Provider:** ${data.clinician.name} (${data.clinician.specialty})  

---

### SUBJECTIVE
${data.notes.subjective}

### OBJECTIVE
${data.notes.objective}

### ASSESSMENT
${data.notes.assessment}

### PLAN
${data.notes.plan}

---
*Signed Electronically by ${data.clinician.name} (NPI: ${data.clinician.npi})*`;
}
