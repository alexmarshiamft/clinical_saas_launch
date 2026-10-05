/**
 * TheraFlow OS — Clinician Compensation Calculation Engine
 * 
 * Pure, deterministic rules engine for behavioral-health practice compensation.
 * Evaluates clinical encounters, CPT codes, cash collections, session volume,
 * and timing policies to produce auditable earning line items.
 */

import {
  CompensationPlan,
  CompensationRule,
  CompensationTimingPolicy,
  EarningLineItem,
  WorkerRecord,
} from '@/types/practice-os';

export interface EncounterCompensationInput {
  encounterId: string;
  workerId: string;
  workerName: string;
  clientName: string;
  dateOfService: string;
  cptCode: string; // e.g. "90837", "90834", "90847", "90791"
  serviceType: 'individual' | 'couples' | 'family' | 'intake' | 'assessment' | 'supervision' | 'admin';
  status: 'completed' | 'no_show' | 'late_cancelled' | 'cancelled';
  amountBilled: number;
  allowedAmount?: number;
  amountCollected: number; // Actual cash/insurance payment received
  isNoteSignedOnTime?: boolean; // Signed within 24h
  historicalSessionCountInPeriod?: number; // For tiered volume calculations
  completedSessionCountInPeriod?: number; // Convenient alias
  historicalCollectionsInPeriod?: number; // For tiered collections calculations
  timingEvent: 'service_completed' | 'claim_accepted' | 'remittance_received' | 'cash_settled';
  triggerEvent?: 'service_completed' | 'claim_accepted' | 'remittance_received' | 'cash_settled'; // Convenient alias
}

export interface CompensationCalculationResult {
  eligibleForAccrual: boolean;
  lineItem?: EarningLineItem;
  ineligibilityReason?: string;
  clinicianEarning?: number;
  practiceRetained?: number;
  explanation?: string;
}

/**
 * Calculates clinician compensation for a specific encounter based on assigned plan rules.
 */
export function calculateEncounterCompensation(
  input: EncounterCompensationInput,
  plan: CompensationPlan
): CompensationCalculationResult {
  // 1. Check if encounter is eligible under the timing policy of the plan
  // If cancelled (standard, non-late), no compensation is due
  if (input.status === 'cancelled') {
    return {
      eligibleForAccrual: false,
      ineligibilityReason: 'Cancelled appointment without late-cancel charge is not compensable.',
    };
  }

  // 2. Resolve matching rule in plan
  let selectedRule: CompensationRule | undefined;

  // A. Special status handling (no-show / late-cancel)
  if (input.status === 'no_show') {
    selectedRule = plan.rules.find((r) => r.ruleType === 'no_show_fee');
  } else if (input.status === 'late_cancelled') {
    selectedRule = plan.rules.find((r) => r.ruleType === 'late_cancellation');
  }

  // B. Specific CPT match (any rule explicitly targeting this CPT code)
  if (!selectedRule && input.cptCode) {
    selectedRule = plan.rules.find(
      (r) => r.cptCodes?.includes(input.cptCode)
    );
  }

  // C. Specific Service Type match (e.g., couples, intake, supervision)
  if (!selectedRule) {
    selectedRule = plan.rules.find(
      (r) => r.encounterTypes?.includes(input.serviceType)
    );
  }

  // D. General tier or percentage or flat rule
  if (!selectedRule) {
    selectedRule = plan.rules.find((r) =>
      ['percentage_collected', 'percentage_allowed', 'percentage_billed', 'tiered_volume', 'tiered_collections', 'flat_fee'].includes(r.ruleType)
    );
  }

  // Fallback to first rule if none matched
  if (!selectedRule && plan.rules.length > 0) {
    selectedRule = plan.rules[0];
  }

  if (!selectedRule) {
    return {
      eligibleForAccrual: false,
      ineligibilityReason: `No active compensation rule found in plan "${plan.name}" for CPT ${input.cptCode}.`,
    };
  }

  // 3. Timing policy validation
  // Check if current event satisfies the rule's timing requirement
  const effectiveEvent = input.triggerEvent || input.timingEvent;
  const satisfiesTiming = checkTimingPolicy(selectedRule.timingPolicy, effectiveEvent);
  if (!satisfiesTiming) {
    return {
      eligibleForAccrual: false,
      ineligibilityReason: `Compensation timing policy (${selectedRule.timingPolicy}) not satisfied by current event (${effectiveEvent}). Accrual deferred.`,
    };
  }

  // 4. Compute clinician earning and generate auditable explanation
  let clinicianEarning = 0;
  let explanation = '';

  switch (selectedRule.ruleType) {
    case 'flat_fee':
    case 'cpt_rate': {
      const rate = selectedRule.flatAmount || 0;
      clinicianEarning = rate;
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} (${input.serviceType}) | Flat Rate: $${rate.toFixed(2)} | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'percentage_collected': {
      const pct = (selectedRule.percentage || 50) / 100;
      clinicianEarning = Math.round(input.amountCollected * pct * 100) / 100;
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} | Cash Collected: $${input.amountCollected.toFixed(2)} | Rule: ${(pct * 100).toFixed(0)}% of collections | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'percentage_allowed': {
      const allowed = input.allowedAmount ?? input.amountBilled;
      const pct = (selectedRule.percentage || 50) / 100;
      clinicianEarning = Math.round(allowed * pct * 100) / 100;
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} | Payer Allowed: $${allowed.toFixed(2)} | Rule: ${(pct * 100).toFixed(0)}% of allowed amount | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'percentage_billed': {
      const pct = (selectedRule.percentage || 40) / 100;
      clinicianEarning = Math.round(input.amountBilled * pct * 100) / 100;
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} | Billed Gross: $${input.amountBilled.toFixed(2)} | Rule: ${(pct * 100).toFixed(0)}% of billed charge | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'tiered_volume': {
      const sessionIndex = input.completedSessionCountInPeriod !== undefined
        ? input.completedSessionCountInPeriod
        : ((input.historicalSessionCountInPeriod || 0) + 1);
      let appliedPct = 45;
      if (selectedRule.tiers && selectedRule.tiers.length > 0) {
        for (const tier of selectedRule.tiers) {
          if (sessionIndex >= tier.fromCount && (tier.toCount === null || sessionIndex <= tier.toCount)) {
            appliedPct = tier.rateOrPercentage;
            break;
          }
        }
      }
      const pct = appliedPct / 100;
      clinicianEarning = Math.round(input.amountCollected * pct * 100) / 100;
      explanation = `Encounter ${input.encounterId} | Session #${sessionIndex} in period | Tier ${appliedPct}% of collected ($${input.amountCollected.toFixed(2)}) | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'tiered_collections': {
      const currentGross = (input.historicalCollectionsInPeriod || 0) + input.amountCollected;
      let appliedPct = 50;
      if (selectedRule.tiers && selectedRule.tiers.length > 0) {
        for (const tier of selectedRule.tiers) {
          if (currentGross >= tier.fromCount && (tier.toCount === null || currentGross <= tier.toCount)) {
            appliedPct = tier.rateOrPercentage;
            break;
          }
        }
      }
      const pct = appliedPct / 100;
      clinicianEarning = Math.round(input.amountCollected * pct * 100) / 100;
      explanation = `Encounter ${input.encounterId} | Cumulative collections $${currentGross.toFixed(2)} | Tier ${appliedPct}% of $${input.amountCollected.toFixed(2)} | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'no_show_fee':
    case 'late_cancellation': {
      const fee = selectedRule.flatAmount || (input.status === 'no_show' ? 50 : 60);
      clinicianEarning = fee;
      explanation = `Encounter ${input.encounterId} | Status: ${input.status.toUpperCase()} | Policy Fee: $${fee.toFixed(2)} | Clinician earning: $${clinicianEarning.toFixed(2)}`;
      break;
    }

    case 'supervision_stipend': {
      const stipend = selectedRule.flatAmount || 75;
      clinicianEarning = stipend;
      explanation = `Clinical Supervision Encounter ${input.encounterId} | Supervision Rate: $${stipend.toFixed(2)}`;
      break;
    }

    case 'admin_hourly': {
      const adminRate = selectedRule.flatAmount || 40;
      clinicianEarning = adminRate;
      explanation = `Administrative Service ${input.encounterId} | Hourly Admin Allowance: $${adminRate.toFixed(2)}`;
      break;
    }

    default: {
      clinicianEarning = 75;
      explanation = `Encounter ${input.encounterId} | Default Standard Fee: $75.00`;
    }
  }

  // 5. Add documentation bonus if applicable
  if (input.isNoteSignedOnTime && (plan.documentationBonusAmount || 0) > 0) {
    const bonus = plan.documentationBonusAmount!;
    clinicianEarning += bonus;
    explanation += ` + $${bonus.toFixed(2)} Documentation Bonus (signed <24h)`;
  }

  const practiceRetained = Math.max(0, Math.round((input.amountCollected - clinicianEarning) * 100) / 100);

  const lineItem: EarningLineItem = {
    id: `earn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    workerId: input.workerId,
    workerName: input.workerName,
    encounterId: input.encounterId,
    dateOfService: input.dateOfService,
    clientName: input.clientName,
    serviceDescription: `${input.serviceType.toUpperCase()} - CPT ${input.cptCode}`,
    cptCode: input.cptCode,
    amountBilled: input.amountBilled,
    amountCollected: input.amountCollected,
    clinicianEarning,
    practiceRetained,
    ruleApplied: selectedRule.name,
    explanation,
    status: 'accrued',
    createdAt: new Date().toISOString(),
  };

  return {
    eligibleForAccrual: true,
    lineItem,
    clinicianEarning,
    practiceRetained,
    explanation,
  };
}

/**
 * Helper to test whether the trigger event satisfies the timing policy.
 */
function checkTimingPolicy(
  policy: CompensationTimingPolicy,
  event: 'service_completed' | 'claim_accepted' | 'remittance_received' | 'cash_settled'
): boolean {
  switch (policy) {
    case 'on_date_of_service':
      return true; // Accrues on any event at or after service completion
    case 'on_claim_acceptance':
      return ['claim_accepted', 'remittance_received', 'cash_settled'].includes(event);
    case 'on_insurer_remittance':
      return ['remittance_received', 'cash_settled'].includes(event);
    case 'on_cash_settlement':
      return event === 'cash_settled';
    default:
      return true;
  }
}

/**
 * Evaluates monthly minimum guarantee for a clinician at pay period close.
 */
export function evaluateMinimumGuarantee(
  totalAccruedInMonth: number,
  plan: CompensationPlan,
  worker: WorkerRecord
): { adjustmentNeeded: boolean; adjustmentAmount: number; explanation: string } {
  if (!plan.minimumPayGuarantee || plan.minimumPayGuarantee <= 0) {
    return { adjustmentNeeded: false, adjustmentAmount: 0, explanation: 'No minimum guarantee configured.' };
  }

  const floor = plan.minimumPayGuarantee;
  if (totalAccruedInMonth < floor) {
    const deficit = Math.round((floor - totalAccruedInMonth) * 100) / 100;
    return {
      adjustmentNeeded: true,
      adjustmentAmount: deficit,
      explanation: `Minimum monthly guarantee floor ($${floor.toFixed(2)}) exceeded earnings ($${totalAccruedInMonth.toFixed(2)}). Top-up adjustment: +$${deficit.toFixed(2)}`,
    };
  }

  return {
    adjustmentNeeded: false,
    adjustmentAmount: 0,
    explanation: `Total earnings ($${totalAccruedInMonth.toFixed(2)}) met or exceeded monthly minimum guarantee ($${floor.toFixed(2)}).`,
  };
}

/**
 * Evaluates documentation promptness bonus (e.g. note signed < 24 hours after encounter).
 */
export function evaluateDocumentationBonus(
  encounterId: string,
  workerId: string,
  workerName: string,
  dateOfService: string,
  clientName: string,
  hoursToSign: number,
  plan: CompensationPlan
): EarningLineItem | null {
  const bonus = plan.documentationBonusAmount || 0;
  if (bonus <= 0 || hoursToSign > 24) {
    return null;
  }

  return {
    id: `bonus-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workerId,
    workerName,
    encounterId,
    dateOfService,
    clientName,
    serviceDescription: 'Documentation Promptness Bonus (< 24h note completion)',
    cptCode: 'BONUS',
    amountBilled: 0,
    amountCollected: 0,
    clinicianEarning: bonus,
    practiceRetained: 0,
    ruleApplied: 'Documentation Bonus (<24h)',
    explanation: `Note finalized in ${hoursToSign.toFixed(1)}h (< 24.0h standard). Documentation Bonus awarded: +$${bonus.toFixed(2)}`,
    status: 'accrued',
    createdAt: new Date().toISOString(),
  };
}

