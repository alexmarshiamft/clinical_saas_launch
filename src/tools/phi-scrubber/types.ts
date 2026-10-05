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
    customTag?: string;
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
