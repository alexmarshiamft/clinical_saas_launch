/**
 * TheraFlow OS — Adversarial Clinician Compensation Engine Test Suite
 * 
 * Verifies all financial integrity invariants:
 * 1. 0% percentage rule remains $0.00
 * 2. $0 flatAmount rule remains $0.00
 * 3. One-cent fractional rounding boundaries
 * 4. Tier volume boundaries (sessions 1-20 @ 50%, 21-30 @ 55%, 31+ @ 60%)
 * 5. No-show without rule in plan DOES NOT fall through to full CPT session rate
 * 6. No-show with rule accrues specified fee
 * 7. Documentation promptness bonus awarded ONCE per encounter (partial payments do not multiply bonus)
 * 8. Practice retained is NOT clamped to 0: allows negative margin when flat fee exceeds collected
 * 9. Exact accounting reconciliation: clinicianEarning + practiceRetained === amountCollected
 * 10. Negative adjustments & clawbacks
 * 11. Property-based randomized corpus test (50,000 test cases with zero cent drift)
 */

import {
  calculateEncounterCompensation,
  dollarsToCents,
  centsToDollars,
  evaluateMinimumGuarantee,
  evaluateDocumentationBonus,
} from '../src/modules/compensation/compensation-engine';
import { CompensationPlan, WorkerRecord } from '../src/types/practice-os';

const TEST_PLAN: CompensationPlan = {
  id: 'plan-test-01',
  practiceId: 'practice-01',
  name: 'Standard Outpatient Hybrid',
  description: 'Tiered volume with CPT-specific flat overrides and documentation bonus',
  isDefault: true,
  minimumPayGuarantee: 3500.00,
  documentationBonusAmount: 10.00,
  rules: [
    {
      id: 'rule-intake',
      name: 'Intake Evaluation CPT 90791',
      ruleType: 'cpt_rate',
      cptCodes: ['90791'],
      flatAmount: 110.00,
      timingPolicy: 'on_cash_settlement',
    },
    {
      id: 'rule-tiered',
      name: 'Tiered Outpatient Psychotherapy',
      ruleType: 'tiered_volume',
      cptCodes: ['90837', '90834'],
      tiers: [
        { fromCount: 1, toCount: 20, rateOrPercentage: 50 },
        { fromCount: 21, toCount: 30, rateOrPercentage: 55 },
        { fromCount: 31, toCount: null, rateOrPercentage: 60 },
      ],
      timingPolicy: 'on_cash_settlement',
    },
    {
      id: 'rule-couples',
      name: 'Couples / Family 90847',
      ruleType: 'flat_fee',
      encounterTypes: ['couples', 'family'],
      flatAmount: 95.00,
      timingPolicy: 'on_cash_settlement',
    },
    {
      id: 'rule-noshow',
      name: 'No-Show Fee Policy',
      ruleType: 'no_show_fee',
      flatAmount: 50.00,
      timingPolicy: 'on_cash_settlement',
    },
    {
      id: 'rule-latecancel',
      name: 'Late Cancellation Fee',
      ruleType: 'late_cancellation',
      flatAmount: 60.00,
      timingPolicy: 'on_cash_settlement',
    },
  ],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const PLAN_WITHOUT_NOSHOW: CompensationPlan = {
  ...TEST_PLAN,
  id: 'plan-no-noshow-rule',
  rules: TEST_PLAN.rules.filter((r) => r.ruleType !== 'no_show_fee' && r.ruleType !== 'late_cancellation'),
};

function runCompensationAdversarialSuite() {
  console.log('====================================================================');
  console.log('   Adversarial Compensation Engine & Monetary Invariant Audit      ');
  console.log('====================================================================');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`    ↳ Details: ${details}`);
      failed++;
    }
  }

  // 1. 0% percentage compensation
  const zeroPctPlan: CompensationPlan = {
    ...TEST_PLAN,
    rules: [
      {
        id: 'rule-zero-pct',
        name: 'Pro Bono Plan 0%',
        ruleType: 'percentage_collected',
        percentage: 0,
        timingPolicy: 'on_cash_settlement',
      },
    ],
  };

  const resZeroPct = calculateEncounterCompensation(
    {
      encounterId: 'enc-zero-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient A',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 200,
      amountCollected: 150,
      timingEvent: 'cash_settled',
    },
    zeroPctPlan
  );

  assert(
    '0% percentage rule remains exactly $0.00 clinician earning (does not default to 50%)',
    resZeroPct.clinicianEarning === 0 && resZeroPct.practiceRetained === 150,
    `Earning: $${resZeroPct.clinicianEarning}, Retained: $${resZeroPct.practiceRetained}`
  );

  // 2. $0 flatAmount compensation
  const zeroFlatPlan: CompensationPlan = {
    ...TEST_PLAN,
    rules: [
      {
        id: 'rule-zero-flat',
        name: 'Pro Bono Flat $0',
        ruleType: 'flat_fee',
        flatAmount: 0,
        timingPolicy: 'on_cash_settlement',
      },
    ],
  };

  const resZeroFlat = calculateEncounterCompensation(
    {
      encounterId: 'enc-zero-flat',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient A',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 150,
      amountCollected: 100,
      timingEvent: 'cash_settled',
    },
    zeroFlatPlan
  );

  assert(
    '$0.00 flatAmount rule remains exactly $0.00 (does not fall through)',
    resZeroFlat.clinicianEarning === 0 && resZeroFlat.practiceRetained === 100,
    `Earning: $${resZeroFlat.clinicianEarning}, Retained: $${resZeroFlat.practiceRetained}`
  );

  // 3. One-cent values & exact fractional rounding
  const resOneCent = calculateEncounterCompensation(
    {
      encounterId: 'enc-cent-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient A',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 0.02,
      amountCollected: 0.02,
      completedSessionCountInPeriod: 1, // 50% tier
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  assert(
    'One-cent value ($0.02 at 50%) rounds exactly to $0.01 clinician + $0.01 practice',
    resOneCent.clinicianEarning === 0.01 && resOneCent.practiceRetained === 0.01,
    `Earning: $${resOneCent.clinicianEarning}, Retained: $${resOneCent.practiceRetained}`
  );

  // 4. Tier volume boundaries (sessions 1-20 @ 50%, 21-30 @ 55%, 31+ @ 60%)
  const tierCases = [
    { session: 1, expectedPct: 50, collected: 100, expectedEarn: 50 },
    { session: 20, expectedPct: 50, collected: 100, expectedEarn: 50 },
    { session: 21, expectedPct: 55, collected: 100, expectedEarn: 55 },
    { session: 30, expectedPct: 55, collected: 100, expectedEarn: 55 },
    { session: 31, expectedPct: 60, collected: 100, expectedEarn: 60 },
    { session: 45, expectedPct: 60, collected: 100, expectedEarn: 60 },
  ];

  let tiersAllPassed = true;
  for (const tc of tierCases) {
    const res = calculateEncounterCompensation(
      {
        encounterId: `enc-tier-${tc.session}`,
        workerId: 'worker-1',
        workerName: 'Dr. Test',
        clientName: 'Patient T',
        dateOfService: '2026-10-05',
        cptCode: '90837',
        serviceType: 'individual',
        status: 'completed',
        amountBilled: 150,
        amountCollected: tc.collected,
        completedSessionCountInPeriod: tc.session,
        timingEvent: 'cash_settled',
      },
      TEST_PLAN
    );

    if (res.clinicianEarning !== tc.expectedEarn || res.practiceRetained !== (tc.collected - tc.expectedEarn)) {
      tiersAllPassed = false;
      console.error(`Tier boundary failure at session #${tc.session}: earned $${res.clinicianEarning}, expected $${tc.expectedEarn}`);
    }
  }
  assert('Tier boundaries 20/21/30/31 volume thresholds calculate strictly', tiersAllPassed);

  // 5. No-show without rule in plan DOES NOT fall through to full CPT session rate
  const resNoShowNoRule = calculateEncounterCompensation(
    {
      encounterId: 'enc-noshow-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient NS',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'no_show',
      amountBilled: 150,
      amountCollected: 0,
      timingEvent: 'cash_settled',
    },
    PLAN_WITHOUT_NOSHOW
  );

  assert(
    'No-show without rule in plan is blocked from full CPT session rate ($85 -> $0)',
    resNoShowNoRule.eligibleForAccrual === false && resNoShowNoRule.clinicianEarning === 0,
    `Accrual: ${resNoShowNoRule.eligibleForAccrual}, Earning: $${resNoShowNoRule.clinicianEarning}`
  );

  // 6. No-show with configured fee
  const resNoShowRule = calculateEncounterCompensation(
    {
      encounterId: 'enc-noshow-2',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient NS',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'no_show',
      amountBilled: 50,
      amountCollected: 50,
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  assert(
    'No-show with configured fee pays policy fee ($50.00)',
    resNoShowRule.clinicianEarning === 50 && resNoShowRule.practiceRetained === 0,
    `Earning: $${resNoShowRule.clinicianEarning}`
  );

  // 7. Documentation promptness bonus awarded ONCE across partial payments
  // Encounter 90837 ($150 total):
  // Payment 1: $50 collected, note signed on time, bonusAlreadyAwarded: false -> earning = $25 (50%) + $10 bonus = $35
  const resPart1 = calculateEncounterCompensation(
    {
      encounterId: 'enc-multi-part-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient P',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 150,
      amountCollected: 50,
      completedSessionCountInPeriod: 1,
      isNoteSignedOnTime: true,
      bonusAlreadyAwarded: false,
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  // Payment 2: $50 collected, bonusAlreadyAwarded: true -> earning = $25 (no bonus)
  const resPart2 = calculateEncounterCompensation(
    {
      encounterId: 'enc-multi-part-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient P',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 150,
      amountCollected: 50,
      completedSessionCountInPeriod: 1,
      isNoteSignedOnTime: true,
      bonusAlreadyAwarded: true,
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  // Payment 3: $50 collected, bonusAlreadyAwarded: true -> earning = $25 (no bonus)
  const resPart3 = calculateEncounterCompensation(
    {
      encounterId: 'enc-multi-part-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient P',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 150,
      amountCollected: 50,
      completedSessionCountInPeriod: 1,
      isNoteSignedOnTime: true,
      bonusAlreadyAwarded: true,
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  const totalEarnedThreeParts = resPart1.clinicianEarning! + resPart2.clinicianEarning! + resPart3.clinicianEarning!;
  // Expected: $25 + $10 + $25 + $25 = $85.00 (NOT $105 with tripled bonus)
  assert(
    'Documentation bonus awarded exactly once across 3 partial payments ($85 total, not $105)',
    totalEarnedThreeParts === 85 && resPart1.clinicianEarning === 35 && resPart2.clinicianEarning === 25 && resPart3.clinicianEarning === 25,
    `Total earned across 3 parts: $${totalEarnedThreeParts}`
  );

  // 8. Practice retained is NOT clamped to 0: allows negative margin when flat fee exceeds collected
  // e.g. Couples therapy $95 flat fee, but insurance/client paid only $60
  const resDeficit = calculateEncounterCompensation(
    {
      encounterId: 'enc-deficit-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Couple X',
      dateOfService: '2026-10-05',
      cptCode: '90847',
      serviceType: 'couples',
      status: 'completed',
      amountBilled: 150,
      amountCollected: 60,
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  assert(
    'Practice retained allows negative margin when flat fee ($95) exceeds collected ($60) -> practice -$35',
    resDeficit.clinicianEarning === 95 && resDeficit.practiceRetained === -35,
    `Clinician: $${resDeficit.clinicianEarning}, Practice: $${resDeficit.practiceRetained}`
  );

  // 9. Strict reconciliation equality
  assert(
    'Reconciliation equality: clinicianEarning + practiceRetained === amountCollected ($95 + -$35 = $60)',
    resDeficit.clinicianEarning! + resDeficit.practiceRetained! === 60
  );

  // 10. Negative adjustments / clawbacks
  const resClawback = calculateEncounterCompensation(
    {
      encounterId: 'enc-clawback-1',
      workerId: 'worker-1',
      workerName: 'Dr. Test',
      clientName: 'Patient C',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: -100,
      amountCollected: -100,
      completedSessionCountInPeriod: 1, // 50%
      timingEvent: 'cash_settled',
    },
    TEST_PLAN
  );

  assert(
    'Negative adjustment generates negative clinician earning (-$50) and reconciles',
    resClawback.clinicianEarning === -50 && resClawback.practiceRetained === -50,
    `Clinician: $${resClawback.clinicianEarning}, Retained: $${resClawback.practiceRetained}`
  );

  // 11. Property-based randomized test over 50,000 cases with zero cent drift
  console.log('\n[Phase 2] Running 50,000 Property-Based Randomized Monetary Tests...');
  let randomizedMismatches = 0;
  for (let i = 0; i < 50000; i++) {
    // Random collection amount between $0.01 and $2,500.00
    const dollars = Math.floor(Math.random() * 250000 + 1) / 100;
    const sessionNum = Math.floor(Math.random() * 50 + 1);

    const res = calculateEncounterCompensation(
      {
        encounterId: `rand-${i}`,
        workerId: 'w-1',
        workerName: 'Dr. Random',
        clientName: 'Client',
        dateOfService: '2026-10-05',
        cptCode: '90837',
        serviceType: 'individual',
        status: 'completed',
        amountBilled: dollars,
        amountCollected: dollars,
        completedSessionCountInPeriod: sessionNum,
        timingEvent: 'cash_settled',
      },
      TEST_PLAN
    );

    const earnCents = dollarsToCents(res.clinicianEarning!);
    const retCents = dollarsToCents(res.practiceRetained!);
    const colCents = dollarsToCents(dollars);

    if (earnCents + retCents !== colCents) {
      randomizedMismatches++;
      if (randomizedMismatches <= 3) {
        console.error(`Mismatch on $${dollars}: Earned $${res.clinicianEarning} + Retained $${res.practiceRetained} != $${dollars}`);
      }
    }
  }

  assert(
    `Property Test: 50,000 randomized cases with 0 cent-level mismatches (observed ${randomizedMismatches})`,
    randomizedMismatches === 0
  );

  console.log('\n====================================================================');
  console.log(`Summary: ${passed} Passed, ${failed} Failed (Total: ${passed + failed})`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCompensationAdversarialSuite();
