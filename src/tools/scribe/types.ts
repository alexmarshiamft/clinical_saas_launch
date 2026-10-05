/**
 * Clinical AI Scribe v2 - Core TypeScript Definitions
 * Feature 13 - Feature 18 Contracts
 */

export interface Utterance {
  id: string;
  speakerId: 'clinician' | 'patient' | string;
  speakerName: string; // e.g. "Dr. Sarah Chen, MD" or "Jane Doe"
  role: 'clinician' | 'patient';
  timestamp: string; // e.g. "00:00", "00:08"
  seconds: number;
  text: string;
  confidence?: number;
  isInterim?: boolean;
}

export interface Speaker {
  id: 'clinician' | 'patient' | string;
  name: string;
  role: 'clinician' | 'patient';
  color: string;
  avatar?: string;
  avgPitch?: number;
}

export interface AudioMetrics {
  rms: number;
  isVoiceActive: boolean;
  pitch: number;
}

export interface DiarizationSession {
  id: string;
  patientId: string;
  encounterId: string;
  startTime: string;
  durationSeconds: number;
  utterances: Utterance[];
  audioMetrics?: AudioMetrics;
}

export interface TemplateSection {
  id: string;
  title: string;
  promptInstruction: string;
  placeholder?: string;
  order: number;
}

export interface ClinicalTemplate {
  id: string;
  name: string;
  category: 'Standard Notes' | 'Behavioral Health' | 'Evaluations & Intake' | 'Transitions of Care' | 'Custom';
  specialty: string;
  description: string;
  icon?: string;
  isFactoryPreset: boolean;
  ehrReady: boolean;
  globalPrompt?: string;
  sections: TemplateSection[];
}

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
  [customKey: string]: any;
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
  customVariables?: Record<string, string | number | undefined | null>;
  cleanUnmapped?: boolean;
  unmappedFallback?: string | ((token: string) => string);
  trimTokenWhitespace?: boolean;
}

export interface ClinicalEncounterSample {
  id: string;
  title: string;
  specialty: string;
  patientName: string;
  mrn: string;
  cptCode: string;
  durationSeconds: number;
  summary: string;
  transcript: Utterance[];
  soapPreview: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface ICD10Code {
  code: string;
  description: string;
  category: 'Mental Health' | 'Cardiovascular' | 'Endocrine' | 'Respiratory' | 'Musculoskeletal' | 'General';
  keywords: string[];
  specificity: 'High' | 'Medium' | 'Low';
  hcc: boolean;
  commonComorbidities?: string[];
}

export interface CPTProcedureCode {
  code: string;
  type: string;
  category: 'psychotherapy' | 'intake' | 'evaluation_management';
  level: string;
  timeRange: string;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  mdmComplexity: 'Low' | 'Moderate' | 'High';
  requirements: string;
  reimbursementAvg: string;
  statutoryDescription: string;
}

export interface CodeSuggestion {
  code: ICD10Code;
  confidence: number; // 0 to 100
  matchedKeywords: string[];
  rationale: string;
}

export type DiagnosticMatch = CodeSuggestion;

export interface MedicalNecessityParams {
  patientName: string;
  patientMrn: string;
  encounterDuration: number;
  cptCode: CPTProcedureCode;
  primaryIcd: ICD10Code;
  secondaryIcds?: ICD10Code[];
  interventions: string[];
  complexity: 'Low' | 'Moderate' | 'High';
  clinicianName: string;
}

export type EhrExportFormat =
  | 'epic-smarttext'
  | 'epic-fhir'
  | 'cerner-powerchart'
  | 'athena-xml'
  | 'universal-markdown';

export interface EhrExportData {
  patient: {
    name: string;
    mrn: string;
    dob: string;
    id: string;
    cptCode: string;
  };
  clinician: {
    name: string;
    npi: string;
    specialty: string;
  };
  notes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    rawTranscript?: string;
  };
  primaryIcd?: string;
}

export interface GenerateNoteOptions {
  template: ClinicalTemplate;
  transcript: string;
  context: ClinicalVariableContext;
  style?: {
    tone?: 'clinical' | 'concise' | 'narrative' | 'patient';
    length?: 'standard' | 'brief' | 'comprehensive';
    perspective?: 'third' | 'first';
  };
}

export interface GeneratedNoteResult {
  fullMarkdown: string;
  sections: Record<string, string>;
  engineUsed: 'gemini-2.5-flash' | 'deterministic-rule-engine';
  generatedAt: string;
}
