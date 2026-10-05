export type ClinicalSpecialty =
  | 'general'
  | 'trauma'
  | 'cbt'
  | 'couples'
  | 'child';

export type CopilotStatus =
  | 'standby'
  | 'listening'
  | 'transcribing'
  | 'structuring'
  | 'ready';

export interface Dsm5Criterion {
  id: string;
  code: string;
  text: string;
  category?: string;
  defaultChecked?: boolean;
}

export interface Dsm5Diagnosis {
  id: string;
  code: string; // e.g. "F41.1"
  name: string; // e.g. "Generalized Anxiety Disorder"
  category: string; // e.g. "Anxiety Disorders"
  thresholdText: string;
  requiredCount: number;
  criteria: Dsm5Criterion[];
  evidenceInterventions: string[];
  typicalCptCodes: string[];
  associatedPatientIds: string[]; // e.g. ["p-101"]
}

export interface SuggestionChip {
  id: string;
  label: string;
  category: 'assessment' | 'differential' | 'intervention' | 'risk';
  textToInsert: string;
  cptReference?: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface AuraSettings {
  specialty: ClinicalSpecialty;
  shortcutKey: string;
  autoFormatSoap: boolean;
  showQuickChips: boolean;
  orbPosition: { x: number; y: number };
}

export interface AuraFloatingOrbProps {
  initialOpen?: boolean;
  onNavigateToStudio?: () => void;
}

export interface TypewriterSoapProps {
  initialText?: string;
  sourceNarrative?: string;
  compact?: boolean;
  onInsertToEhr?: (note: string) => void;
  onSendToScrubber?: (note: string) => void;
  onStreamingComplete?: () => void;
}

export interface AuraVisualizerProps {
  isRecording: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}
