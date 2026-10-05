/**
 * TheraFlow OS — Clinician Compensation Calculation Engine (Cents-Safe & Auditable)
 * 
 * Pure, deterministic rules engine for behavioral-health practice compensation.
 * Evaluates clinical encounters, CPT codes, cash collections, session volume,
 * and timing policies to produce auditable earning line items using integer-cents arithmetic.
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
  bonusAlreadyAwarded?: boolean; // Prevents duplicate bonus on partial payments
  historicalSessionCountInPeriod?: number; // For tiered volume calculations
  completedSessionCountInPeriod?: number; // Convenient alias
  historicalCollectionsInPeriod?: number; // For tiered collections calculations
  timingEvent: 'service_completed' | 'claim_accepted' | 'remittance_received' | 'cash_settled';
  triggerEvent?: 'service_completed' | 'claim_accepted' | 'remittance_received' | 'cash_settled'; // Convenient alias
  ruleVersion?: number;
}

export interface CompensationCalculationResult {
  eligibleForAccrual: boolean;
  lineItem?: EarningLineItem;
  ineligibilityReason?: string;
  clinicianEarning?: number;
  practiceRetained?: number;
  clinicianEarningCents?: bigint;
  practiceRetainedCents?: bigint;
  explanation?: string;
}

/**
 * Monetary Arithmetic Utilities: Integer-Cents Decimal Precision
 */
export function dollarsToCents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

export function centsToDollars(cents: bigint | number): number {
  return Number(cents) / 100;
}

/**
 * Calculates clinician compensation for a specific encounter based on assigned plan rules.
 * Strictly guarantees: clinicianEarning + practiceRetained === amountCollected (or negative adjustment).
 */
export function calculateEncounterCompensation(
  input: EncounterCompensationInput,
  plan: CompensationPlan
): CompensationCalculationResult {
  // 1. Cancelled appointment without late-cancel charge is never compensable
  if (input.status === 'cancelled') {
    return {
      eligibleForAccrual: false,
      ineligibilityReason: 'Cancelled appointment without late-cancel charge is not compensable.',
      clinicianEarning: 0,
      practiceRetained: 0,
    };
  }

  // 2. Resolve matching rule in plan
  let selectedRule: CompensationRule | undefined;

  // A. Special status handling (no-show / late-cancel)
  // CRITICAL AUDIT FIX: If plan does NOT have a no_show_fee or late_cancellation rule,
  // do NOT fall through to the full CPT session rate! Return uncompensated.
  if (input.status === 'no_show') {
    selectedRule = plan.rules.find((r) => r.ruleType === 'no_show_fee');
    if (!selectedRule) {
      return {
        eligibleForAccrual: false,
        ineligibilityReason: `Encounter marked NO-SHOW, but plan "${plan.name}" does not specify a no-show compensation rule. No compensation accrued.`,
        clinicianEarning: 0,
        practiceRetained: 0,
      };
    }
  } else if (input.status === 'late_cancelled') {
    selectedRule = plan.rules.find((r) => r.ruleType === 'late_cancellation');
    if (!selectedRule) {
      return {
        eligibleForAccrual: false,
        ineligibilityReason: `Encounter marked LATE CANCELLED, but plan "${plan.name}" does not specify a late-cancellation rule. No compensation accrued.`,
        clinicianEarning: 0,
        practiceRetained: 0,
      };
    }
  }

  // B. Specific CPT match (any rule explicitly targeting this CPT code)
  if (!selectedRule && input.cptCode) {
    selectedRule = plan.rules.find((r) => r.cptCodes?.includes(input.cptCode));
  }

  // C. Specific Service Type match (e.g., couples, intake, supervision)
  if (!selectedRule) {
    selectedRule = plan.rules.find((r) => r.encounterTypes?.includes(input.serviceType));
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
  const effectiveEvent = input.triggerEvent || input.timingEvent;
  const satisfiesTiming = checkTimingPolicy(selectedRule.timingPolicy, effectiveEvent);
  if (!satisfiesTiming) {
    return {
      eligibleForAccrual: false,
      ineligibilityReason: `Compensation timing policy (${selectedRule.timingPolicy}) not satisfied by current event (${effectiveEvent}). Accrual deferred.`,
    };
  }

  // 4. Compute clinician earning in integer cents
  const collectedCents = dollarsToCents(input.amountCollected);
  const billedCents = dollarsToCents(input.amountBilled);
  const allowedCents = input.allowedAmount !== undefined ? dollarsToCents(input.allowedAmount) : billedCents;

  let clinicianEarningCents = 0n;
  let explanation = '';

  switch (selectedRule.ruleType) {
    case 'flat_fee':
    case 'cpt_rate': {
      // CRITICAL AUDIT FIX: flatAmount === 0 must remain 0
      const rate = selectedRule.flatAmount !== undefined && selectedRule.flatAmount !== null
        ? selectedRule.flatAmount
        : 0;
      clinicianEarningCents = dollarsToCents(rate);
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} (${input.serviceType}) | Flat Rate: $${rate.toFixed(2)} | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'percentage_collected': {
      // CRITICAL AUDIT FIX: percentage === 0 must remain 0% (not default to 50%)
      const pct = selectedRule.percentage !== undefined && selectedRule.percentage !== null
        ? selectedRule.percentage
        : 50;
      // Integer cents half-up rounding: Math.round(collectedCents * pct / 100)
      const earned = Math.round(Number(collectedCents) * (pct / 100));
      clinicianEarningCents = BigInt(earned);
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} | Cash Collected: $${centsToDollars(collectedCents).toFixed(2)} | Rule: ${pct}% of collections | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'percentage_allowed': {
      const pct = selectedRule.percentage !== undefined && selectedRule.percentage !== null
        ? selectedRule.percentage
        : 50;
      const earned = Math.round(Number(allowedCents) * (pct / 100));
      clinicianEarningCents = BigInt(earned);
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} | Payer Allowed: $${centsToDollars(allowedCents).toFixed(2)} | Rule: ${pct}% of allowed amount | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'percentage_billed': {
      const pct = selectedRule.percentage !== undefined && selectedRule.percentage !== null
        ? selectedRule.percentage
        : 40;
      const earned = Math.round(Number(billedCents) * (pct / 100));
      clinicianEarningCents = BigInt(earned);
      explanation = `Encounter ${input.encounterId} | CPT ${input.cptCode} | Billed Gross: $${centsToDollars(billedCents).toFixed(2)} | Rule: ${pct}% of billed charge | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'tiered_volume': {
      const sessionIndex = input.completedSessionCountInPeriod !== undefined
        ? input.completedSessionCountInPeriod
        : ((input.historicalSessionCountInPeriod || 0) + 1);
      
      let appliedPct = 50; // Standard fallback
      if (selectedRule.tiers && selectedRule.tiers.length > 0) {
        for (const tier of selectedRule.tiers) {
          if (sessionIndex >= tier.fromCount && (tier.toCount === null || sessionIndex <= tier.toCount)) {
            appliedPct = tier.rateOrPercentage;
            break;
          }
        }
      }
      const earned = Math.round(Number(collectedCents) * (appliedPct / 100));
      clinicianEarningCents = BigInt(earned);
      explanation = `Encounter ${input.encounterId} | Session #${sessionIndex} in period | Tier ${appliedPct}% of collected ($${centsToDollars(collectedCents).toFixed(2)}) | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'tiered_collections': {
      const currentGrossCents = dollarsToCents(input.historicalCollectionsInPeriod || 0) + collectedCents;
      const currentGross = centsToDollars(currentGrossCents);
      let appliedPct = 50;
      if (selectedRule.tiers && selectedRule.tiers.length > 0) {
        for (const tier of selectedRule.tiers) {
          if (currentGross >= tier.fromCount && (tier.toCount === null || currentGross <= tier.toCount)) {
            appliedPct = tier.rateOrPercentage;
            break;
          }
        }
      }
      const earned = Math.round(Number(collectedCents) * (appliedPct / 100));
      clinicianEarningCents = BigInt(earned);
      explanation = `Encounter ${input.encounterId} | Cumulative collections $${currentGross.toFixed(2)} | Tier ${appliedPct}% of $${centsToDollars(collectedCents).toFixed(2)} | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'no_show_fee':
    case 'late_cancellation': {
      const fee = selectedRule.flatAmount !== undefined && selectedRule.flatAmount !== null
        ? selectedRule.flatAmount
        : (input.status === 'no_show' ? 50 : 60);
      clinicianEarningCents = dollarsToCents(fee);
      explanation = `Encounter ${input.encounterId} | Status: ${input.status.toUpperCase()} | Policy Fee: $${fee.toFixed(2)} | Clinician earning: $${centsToDollars(clinicianEarningCents).toFixed(2)}`;
      break;
    }

    case 'supervision_stipend': {
      const stipend = selectedRule.flatAmount !== undefined && selectedRule.flatAmount !== null
        ? selectedRule.flatAmount
        : 75;
      clinicianEarningCents = dollarsToCents(stipend);
      explanation = `Clinical Supervision Encounter ${input.encounterId} | Supervision Rate: $${stipend.toFixed(2)}`;
      break;
    }

    case 'admin_hourly': {
      const adminRate = selectedRule.flatAmount !== undefined && selectedRule.flatAmount !== null
        ? selectedRule.flatAmount
        : 40;
      clinicianEarningCents = dollarsToCents(adminRate);
      explanation = `Administrative Service ${input.encounterId} | Hourly Admin Allowance: $${adminRate.toFixed(2)}`;
      break;
    }

    default: {
      clinicianEarningCents = dollarsToCents(75);
      explanation = `Encounter ${input.encounterId} | Standard Base Fee: $75.00`;
    }
  }

  // 5. Add documentation promptness bonus ONCE per encounter (if not already awarded)
  // CRITICAL AUDIT FIX: Partial payments or subsequent events must not repeatedly trigger bonus
  if (input.isNoteSignedOnTime && !input.bonusAlreadyAwarded && (plan.documentationBonusAmount || 0) > 0) {
    const bonusCents = dollarsToCents(plan.documentationBonusAmount!);
    clinicianEarningCents += bonusCents;
    explanation += ` + $${centsToDollars(bonusCents).toFixed(2)} Documentation Bonus (signed <24h)`;
  }

  // 6. Practice Retained: Exact accounting reconciliation
  // CRITICAL AUDIT FIX: Do NOT clamp to Math.max(0, ...). Practice retained can be negative if flat fee exceeds collected.
  // Invariant: clinicianEarningCents + practiceRetainedCents === collectedCents
  const practiceRetainedCents = collectedCents - clinicianEarningCents;

  const clinicianEarning = centsToDollars(clinicianEarningCents);
  const practiceRetained = centsToDollars(practiceRetainedCents);

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
    clinicianEarningCents,
    practiceRetainedCents,
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
      return true;
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
    const deficitCents = dollarsToCents(floor) - dollarsToCents(totalAccruedInMonth);
    const deficit = centsToDollars(deficitCents);
    return {
      adjustmentNeeded: true,
      adjustmentAmount: deficit,
      explanation: `Minimum monthly guarantee floor ($${floor.toFixed(2)}) exceeded accrued earnings ($${totalAccruedInMonth.toFixed(2)}). Top-up adjustment: +$${deficit.toFixed(2)}`,
    };
  }

  return {
    adjustmentNeeded: false,
    adjustmentAmount: 0,
    explanation: `Total earnings ($${totalAccruedInMonth.toFixed(2)}) met or exceeded monthly minimum guarantee ($${floor.toFixed(2)}).`,
  };
}

/**
 * Evaluates documentation promptness bonus (< 24 hours after encounter).
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
