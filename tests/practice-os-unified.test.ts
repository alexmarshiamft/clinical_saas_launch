/**
 * TheraFlow OS — Comprehensive Automated Test Suite
 * Unified Practice Operating System: Workforce, Compensation Engine, Payroll & Embedded Money
 * 
 * Execution: npx tsx tests/practice-os-unified.test.ts
 */

import {
  calculateEncounterCompensation,
  evaluateDocumentationBonus,
} from '../src/modules/compensation/compensation-engine';
import {
  SandboxPayrollProvider,
  GustoPayrollAdapter,
  AdpPayrollAdapter,
} from '../src/modules/payroll/payroll-provider';
import { SandboxBankingProvider } from '../src/modules/money/banking-provider';
import { practiceEventBus } from '../src/modules/ledger/practice-event-bus';
import {
  CompensationPlan,
  EarningLineItem,
  PayPeriod,
  ClinicianPayrollSummary,
} from '../src/types/practice-os';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('  THERAFLOW OS — UNIFIED PRACTICE OPERATING SYSTEM TEST SUITE  ');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: CLINICIAN COMPENSATION RULES ENGINE
  // --------------------------------------------------------------------------
  console.log('▶ SUITE 1: Clinician Compensation Rules Engine');

  const testPlan: CompensationPlan = {
    id: 'test-plan-tiered',
    practiceId: 'practice-test-1',
    name: 'Standard Comprehensive Plan',
    description: 'Tiered volume, CPT flat fees, and documentation bonus',
    isDefault: true,
    minimumPayGuarantee: 3000.00,
    documentationBonusAmount: 10.00,
    rules: [
      {
        id: 'rule-tiered',
        name: 'Volume Tier (50% - 60%)',
        ruleType: 'tiered_volume',
        tiers: [
          { fromCount: 1, toCount: 20, rateOrPercentage: 50 },
          { fromCount: 21, toCount: 30, rateOrPercentage: 55 },
          { fromCount: 31, toCount: null, rateOrPercentage: 60 },
        ],
        timingPolicy: 'on_cash_settlement',
        description: 'Tiered collections percentage',
      },
      {
        id: 'rule-intake',
        name: 'Initial Intake Flat Fee (CPT 90791)',
        ruleType: 'flat_fee',
        cptCodes: ['90791'],
        flatAmount: 125.00,
        timingPolicy: 'on_date_of_service',
        description: '$125 flat for initial evaluations',
      },
      {
        id: 'rule-couples',
        name: 'Couples / Family Therapy (CPT 90847)',
        ruleType: 'cpt_rate',
        cptCodes: ['90847'],
        encounterTypes: ['couples', 'family'],
        flatAmount: 110.00,
        timingPolicy: 'on_date_of_service',
        description: '$110 flat for conjoint sessions',
      },
      {
        id: 'rule-no-show',
        name: 'Late Cancellation / No-Show',
        ruleType: 'late_cancellation',
        flatAmount: 60.00,
        timingPolicy: 'on_date_of_service',
        description: '$60 fee for late cancellations',
      },
    ],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  // Test 1.1: Tier 1 Volume (e.g. session #15 -> 50% split)
  const resTier1 = calculateEncounterCompensation(
    {
      encounterId: 'enc-001',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Jane Doe',
      dateOfService: '2026-10-05',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 175.00,
      amountCollected: 150.00,
      completedSessionCountInPeriod: 15,
      triggerEvent: 'cash_settled',
    },
    testPlan
  );
  assert(resTier1.clinicianEarning === 75.00, 'Tier 1 volume calculates 50% split on $150 ($75.00)');
  assert(resTier1.practiceRetained === 75.00, 'Tier 1 volume leaves 50% for practice ($75.00)');
  assert(resTier1.explanation.includes('50%'), 'Auditable explanation includes 50% tier details');

  // Test 1.2: Tier 2 Volume (e.g. session #25 -> 55% split)
  const resTier2 = calculateEncounterCompensation(
    {
      encounterId: 'enc-002',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Marcus Vance',
      dateOfService: '2026-10-06',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 175.00,
      amountCollected: 150.00,
      completedSessionCountInPeriod: 25,
      triggerEvent: 'cash_settled',
    },
    testPlan
  );
  assert(resTier2.clinicianEarning === 82.50, 'Tier 2 volume calculates 55% split on $150 ($82.50)');
  assert(resTier2.practiceRetained === 67.50, 'Tier 2 volume practice share is $67.50');

  // Test 1.3: Tier 3 Volume (e.g. session #35 -> 60% split)
  const resTier3 = calculateEncounterCompensation(
    {
      encounterId: 'enc-003',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Elena Rostova',
      dateOfService: '2026-10-07',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 175.00,
      amountCollected: 150.00,
      completedSessionCountInPeriod: 35,
      triggerEvent: 'cash_settled',
    },
    testPlan
  );
  assert(resTier3.clinicianEarning === 90.00, 'Tier 3 volume calculates 60% split on $150 ($90.00)');
  assert(resTier3.practiceRetained === 60.00, 'Tier 3 volume practice share is $60.00');

  // Test 1.4: CPT 90791 Flat Intake Fee
  const resIntake = calculateEncounterCompensation(
    {
      encounterId: 'enc-004',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Samuel Green',
      dateOfService: '2026-10-08',
      cptCode: '90791',
      serviceType: 'intake',
      status: 'completed',
      amountBilled: 250.00,
      amountCollected: 200.00,
      triggerEvent: 'service_completed',
    },
    testPlan
  );
  assert(resIntake.clinicianEarning === 125.00, 'Intake CPT 90791 yields guaranteed $125.00 flat fee');
  assert(resIntake.eligibleForAccrual === true, 'Timing policy on_date_of_service accrues on service completion');

  // Test 1.5: Couples / Conjoint Therapy CPT 90847
  const resCouples = calculateEncounterCompensation(
    {
      encounterId: 'enc-005',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Alex & Morgan Taylor',
      dateOfService: '2026-10-09',
      cptCode: '90847',
      serviceType: 'couples',
      status: 'completed',
      amountBilled: 200.00,
      amountCollected: 180.00,
      triggerEvent: 'service_completed',
    },
    testPlan
  );
  assert(resCouples.clinicianEarning === 110.00, 'Couples therapy CPT 90847 yields $110.00 rate');

  // Test 1.6: Late Cancellation / No-Show Fee
  const resNoShow = calculateEncounterCompensation(
    {
      encounterId: 'enc-006',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Late Patient',
      dateOfService: '2026-10-10',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'late_cancelled',
      amountBilled: 75.00,
      amountCollected: 75.00,
      triggerEvent: 'service_completed',
    },
    testPlan
  );
  assert(resNoShow.clinicianEarning === 60.00, 'Late cancellation produces configured $60.00 clinician credit');

  // Test 1.7: Timing Policy Gating
  const resTimingGated = calculateEncounterCompensation(
    {
      encounterId: 'enc-007',
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      clientName: 'Unpaid Client',
      dateOfService: '2026-10-11',
      cptCode: '90837',
      serviceType: 'individual',
      status: 'completed',
      amountBilled: 150.00,
      amountCollected: 0.00,
      triggerEvent: 'service_completed',
    },
    testPlan
  );
  assert(resTimingGated.eligibleForAccrual === false, 'Timing policy on_cash_settlement does NOT accrue before payment clears');

  // Test 1.8: Documentation Promptness Bonus
  const bonusItem = evaluateDocumentationBonus(
    'enc-008',
    'worker-1',
    'Dr. Sarah Chen',
    '2026-10-12',
    'Jane Doe',
    12.5, // Signed in 12.5 hours (< 24 hours)
    testPlan
  );
  assert(bonusItem !== null && bonusItem.clinicianEarning === 10.00, 'Note signed within 24h qualifies for $10 bonus');
  assert(bonusItem?.explanation.includes('Documentation Bonus'), 'Bonus line item includes auditable promptness explanation');

  const noBonusItem = evaluateDocumentationBonus(
    'enc-009',
    'worker-1',
    'Dr. Sarah Chen',
    '2026-10-12',
    'Marcus Vance',
    36.0, // Signed in 36 hours (> 24 hours)
    testPlan
  );
  assert(noBonusItem === null, 'Note signed after 24h correctly receives no documentation bonus');

  // --------------------------------------------------------------------------
  // SUITE 2: PAYROLL PROVIDER ABSTRACTION & ORCHESTRATION
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: Payroll Provider Abstraction & Orchestration');

  const sandboxPayroll = new SandboxPayrollProvider();
  const gustoAdapter = new GustoPayrollAdapter();
  const adpAdapter = new AdpPayrollAdapter();

  // Test 2.1: Practice Connection
  const connResult = await sandboxPayroll.connectPractice({ provider: 'sandbox', sandboxMode: true });
  assert(connResult.connected === true, 'Sandbox payroll connects practice');

  // Test 2.2: Worker Sync
  const workerSync = await sandboxPayroll.syncWorker({
    id: 'worker-1',
    practiceId: 'practice-test-1',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@example.com',
    phone: '(555) 012-3456',
    role: 'licensed_clinician',
    employmentType: 'w2_employee',
    status: 'active',
    primaryLocationId: 'loc-1',
    hireDate: '2025-01-15',
    credentials: {
      licenseType: 'LMFT',
      licenseNumber: 'LMFT104921',
      licenseState: 'CA',
      npi: '1942058192',
      taxonomyCode: '106H00000X',
      expirationDate: '2027-04-30',
    },
    compensationPlanId: 'plan-1',
    paySchedule: 'semi_monthly',
    avatarInitials: 'SC',
    weeklyTargetHours: 25,
  });
  assert(workerSync.synced === true && workerSync.externalWorkerId.startsWith('ext-sandbox-'), 'Sync worker generates external provider ID');

  // Test 2.3: Payroll Run Preview
  const testPayPeriod: PayPeriod = {
    id: 'period-oct-1',
    practiceId: 'practice-test-1',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    payDate: '2026-10-20',
    status: 'open',
    totalClinicians: 2,
    totalEncounters: 5,
    totalGrossCollections: 850.00,
    totalGrossCompensation: 467.50,
  };

  const testSummaries: ClinicianPayrollSummary[] = [
    {
      workerId: 'worker-1',
      workerName: 'Dr. Sarah Chen',
      employmentType: 'w2_employee',
      role: 'licensed_clinician',
      individualSessionsCount: 3,
      couplesSessionsCount: 1,
      intakesCount: 1,
      lateCancellationsCount: 0,
      supervisionHours: 0,
      attributableCollections: 850.00,
      baseCompensation: 457.50,
      bonuses: 10.00,
      adjustments: 0.00,
      reimbursements: 0.00,
      grossPay: 467.50,
      status: 'pending_review',
      lineItems: [],
    },
  ];

  const testPayrollRun = {
    id: 'run-demo-1',
    practiceId: 'practice-test-1',
    payPeriodId: testPayPeriod.id,
    payPeriodLabel: 'Oct 1–15, 2026',
    runDate: '2026-10-16',
    status: 'under_review' as const,
    provider: 'sandbox' as const,
    totalGrossPay: 467.50,
    totalEmployerTaxesEstimate: 35.76,
    totalFundingRequired: 503.26,
    clinicianSummaries: testSummaries,
  };

  const preview = await sandboxPayroll.previewPayroll(testPayrollRun);
  assert(preview.previewReady === true, 'Payroll preview ready status is true');
  assert(preview.employerTaxesEstimate > 0, 'Employer taxes estimated (7.65% FICA + SUTA)');

  // Test 2.4: Payroll Submission
  const submitResult = await sandboxPayroll.submitPayroll(testPayrollRun);
  assert(submitResult.success === true, 'Payroll batch submitted successfully to payroll orchestrator');
  assert(submitResult.externalBatchId.startsWith('ach-sandbox-'), 'Deterministic ACH direct deposit batch ID created');

  // Test 2.5: Multi-Provider Contract Adherence (Gusto & ADP adapters)
  const gustoConn = await gustoAdapter.connectPractice({ provider: 'gusto', apiKey: 'gst_test_sandbox_token', sandboxMode: true });
  assert(gustoConn.connected === true, 'Gusto provider adapter conforms to PayrollProvider contract');

  const adpConn = await adpAdapter.connectPractice({ provider: 'adp', apiKey: 'adp_test_client_secret', sandboxMode: true });
  assert(adpConn.connected === true, 'ADP provider adapter conforms to PayrollProvider contract');

  // --------------------------------------------------------------------------
  // SUITE 3: THERAFLOW MONEY, BAAS & CLAIM-TO-BANK RECONCILIATION
  // --------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: TheraFlow Money, BaaS & Claim-to-Bank Reconciliation');

  const bankingProvider = new SandboxBankingProvider();

  // Test 3.1: Bank Account Initial Balance
  const accounts = await bankingProvider.getAccounts('practice-test-1');
  const operatingAcct = accounts.find((a) => a.accountType === 'operating_checking');
  const taxVault = accounts.find((a) => a.accountType === 'tax_reserve');
  assert(operatingAcct !== undefined && operatingAcct.currentBalance > 0, 'Operating checking account initialized with available liquidity');
  assert(taxVault !== undefined && taxVault.currentBalance > 0, 'Tax reserve vault initialized');

  // Test 3.2: Automated Claim-to-Bank Reconciliation
  const initialOperatingBalance = operatingAcct!.currentBalance;
  const initialTaxBalance = taxVault!.currentBalance;

  const reconResult = await bankingProvider.reconcileClaimPayment({
    claimId: 'claim-8472',
    clientName: 'Jane Doe',
    payerName: 'Aetna Commercial',
    cptCode: '90837',
    dateOfService: '2026-10-04',
    amountBilled: 175.00,
    allowedAmount: 150.00,
    payerPayment: 150.00,
    patientResponsibility: 0.00,
    clinicianId: 'worker-1',
    clinicianName: 'Dr. Sarah Chen',
    compensationPercentage: 60.0,
  });

  assert(reconResult.status === 'matched', 'Claim 8472 matched to bank deposit of $150.00');
  assert(reconResult.clinicianShare === 90.00, 'Clinician 60% share correctly calculated ($90.00)');
  assert(reconResult.practiceShare === 60.00, 'Practice 40% retained share correctly calculated ($60.00)');

  // Verify bank account ripple
  const postReconAccounts = await bankingProvider.getAccounts('practice-test-1');
  const postOperating = postReconAccounts.find((a) => a.accountType === 'operating_checking')!;
  const postTax = postReconAccounts.find((a) => a.accountType === 'tax_reserve')!;

  assert(
    postOperating.currentBalance === initialOperatingBalance + 150.00,
    'Operating checking credited with full $150.00 insurance remittance'
  );

  // Test 3.3: Private Pay Credit Card Settlement
  const privatePayResult = await bankingProvider.processPrivatePayCharge({
    clientName: 'Elena Rostova',
    cptCode: '90834',
    amount: 200.00,
    clinicianId: 'worker-1',
    clinicianName: 'Dr. Sarah Chen',
    clinicianPercentage: 60.0,
  });

  assert(privatePayResult.transaction.amount === 200.00, 'Private-pay $200.00 card payment settled');
  assert(privatePayResult.reconciliation.clinicianShare === 120.00, 'Clinician receives $120.00 (60% of $200.00)');
  assert(privatePayResult.reconciliation.practiceShare === 80.00, 'Practice retains $80.00 (40% of $200.00)');

  // Verify automated 25% tax reserve set-aside on practice profit
  const postCardAccounts = await bankingProvider.getAccounts('practice-test-1');
  const postCardTax = postCardAccounts.find((a) => a.accountType === 'tax_reserve')!;
  // $15 from claim ($60 * 25%) + $20 from card ($80 * 25%) = $35
  assert(
    postCardTax.currentBalance === initialTaxBalance + 35.00,
    'Automated 25% tax reserve vault transfer executed on practice earnings ($35.00 across claim & card)'
  );

  // Test 3.4: Payroll ACH Funding
  const fundingResult = await bankingProvider.fundPayrollBatch('practice-test-1', 'run-batch-101', 500.00);
  assert(fundingResult.success === true, 'Payroll direct deposit batch funded via ACH debit');
  assert(fundingResult.achTraceNumber.startsWith('ach-tr-'), 'Valid ACH trace number logged for bank auditing');

  // Test 3.5: Duplicate Payment / Idempotency Protection
  console.log('\n▶ SUITE 4: Practice Event Bus & Idempotency Protection');

  let event1Fired = false;

  practiceEventBus.subscribe('payment.received', () => {
    event1Fired = true;
  });

  const evt1 = await practiceEventBus.publish({
    type: 'payment.received',
    practiceId: 'practice-test-1',
    actorId: 'system',
    idempotencyKey: 'remit-era-unique-99881',
    payload: { claimId: 'claim-8472', amount: 150.00 },
  });
  assert(evt1.delivered === true && event1Fired === true, 'First payment event with unique key processed successfully');

  // Attempt to publish duplicate event with exact same idempotency key
  const evtDuplicate = await practiceEventBus.publish({
    type: 'payment.received',
    practiceId: 'practice-test-1',
    actorId: 'system',
    idempotencyKey: 'remit-era-unique-99881', // DUPLICATE KEY
    payload: { claimId: 'claim-8472', amount: 150.00 },
  });
  assert(
    evtDuplicate.skippedDuplicate === true,
    'Duplicate payment event blocked by idempotency filter (prevents double clinician payment)'
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${testsPassed} PASSED | ${testsFailed} FAILED  `);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
