/**
 * TheraFlow OS — Unified Practice Operating System Context
 * 
 * Provides reactive global state for Workforce, Compensation, Payroll,
 * Embedded Banking, and the Unified Encounter Ledger.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  WorkerRecord,
  PracticeLocation,
  CompensationPlan,
  EarningLineItem,
  PayPeriod,
  PayrollRun,
  BankAccount,
  BankTransaction,
  ClaimPaymentReconciliation,
  PracticeFinancialSummary,
  ClinicianPayrollSummary,
} from '@/types/practice-os';
import { calculateEncounterCompensation } from '@/modules/compensation/compensation-engine';
import { SandboxEmbeddedBankingProvider } from '@/modules/money/banking-provider';
import { SandboxPayrollProvider, getPayrollProvider } from '@/modules/payroll/payroll-provider';
import { PracticeEventBus, practiceEventBus } from '@/modules/ledger/practice-event-bus';

export interface PracticeOsContextType {
  // Practice & Locations
  practiceName: string;
  locations: PracticeLocation[];
  
  // Workforce
  workers: WorkerRecord[];
  addWorker: (worker: Omit<WorkerRecord, 'id'>) => void;
  updateWorker: (id: string, updates: Partial<WorkerRecord>) => void;
  
  // Compensation Plans
  compensationPlans: CompensationPlan[];
  addCompensationPlan: (plan: Omit<CompensationPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  
  // Payroll
  currentPayPeriod: PayPeriod;
  activePayPeriod: PayPeriod; // Convenient alias
  openEarnings: EarningLineItem[];
  clinicianPayrollSummaries: ClinicianPayrollSummary[];
  payrollRuns: PayrollRun[];
  selectedPayrollProvider: string;
  setSelectedPayrollProvider: (provider: string) => void;
  approveAndSubmitPayroll: (payPeriodId: string) => Promise<{ success: boolean; batchId: string }>;
  
  // Embedded Banking & Finances
  bankAccounts: BankAccount[];
  operatingAccount: BankAccount | null; // Convenient alias
  isHydrating: boolean;
  bankTransactions: BankTransaction[];
  financialSummary: PracticeFinancialSummary;
  reconciliations: ClaimPaymentReconciliation[];
  
  // One-Click Workflows & Demonstrations
  triggerEncounterToPaycheckCascade: (encounterDetails: {
    clientName: string;
    cptCode: string;
    serviceType: 'individual' | 'couples' | 'intake';
    amountCollected: number;
    workerId: string;
  }) => Promise<void>;
  executeCascadeSimulation: () => Promise<void>; // Convenient alias
  simulateInsuranceRemittance: (claimId: string, allowedAmount: number, payerPayment: number) => Promise<void>;
  simulatePrivatePayPayment: (clientName: string, amount: number, cptCode: string) => Promise<void>;
  simulatePrivatePaySettlement: (clientName?: string, amount?: number, cptCode?: string) => Promise<void>; // Convenient alias
  
  // Status flags
  isProcessing: boolean;
  dbError: string | null;
  refreshFromPostgres: () => Promise<boolean>;
}

// Initial Mock Locations
const SEED_LOCATIONS: PracticeLocation[] = [
  {
    id: 'loc-sf-downtown',
    practiceId: 'practice-demo-1',
    name: 'San Francisco Financial District',
    address: '450 Sutter St, Suite 1400',
    city: 'San Francisco',
    state: 'CA',
    zip: '94108',
    isPrimary: true,
    phone: '(415) 555-0100',
  },
  {
    id: 'loc-oakland-uptown',
    practiceId: 'practice-demo-1',
    name: 'Oakland Uptown Health Center',
    address: '1900 Telegraph Ave, Suite 300',
    city: 'Oakland',
    state: 'CA',
    zip: '94612',
    isPrimary: false,
    phone: '(510) 555-0188',
  },
];

// Initial Mock Compensation Plans
const SEED_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 'plan-tiered-standard',
    practiceId: 'practice-demo-1',
    name: 'Standard Behavioral Health Tiered Split',
    description: 'Tiered collections split (50% base, 55% for 21-30 sessions, 60% for 31+ sessions) with $10 note bonus',
    isDefault: true,
    minimumPayGuarantee: 3500.00,
    documentationBonusAmount: 10.00,
    rules: [
      {
        id: 'rule-tiered-vol',
        name: 'Volume Tier Split (50% - 60%)',
        ruleType: 'tiered_volume',
        tiers: [
          { fromCount: 1, toCount: 20, rateOrPercentage: 50 },
          { fromCount: 21, toCount: 30, rateOrPercentage: 55 },
          { fromCount: 31, toCount: null, rateOrPercentage: 60 },
        ],
        timingPolicy: 'on_cash_settlement',
        description: 'Tiered percentage of actual collections based on session volume',
      },
      {
        id: 'rule-intake-flat',
        name: 'Initial Intake Evaluation (CPT 90791)',
        ruleType: 'flat_fee',
        cptCodes: ['90791'],
        flatAmount: 120.00,
        timingPolicy: 'on_date_of_service',
        description: 'Guaranteed flat rate for comprehensive 90-minute psychiatric intake',
      },
      {
        id: 'rule-no-show',
        name: 'Late Cancellation / No-Show Fee',
        ruleType: 'late_cancellation',
        flatAmount: 60.00,
        timingPolicy: 'on_date_of_service',
        description: 'Fixed $60 clinician credit on billable patient late cancellation',
      },
    ],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'plan-cpt-fixed',
    practiceId: 'practice-demo-1',
    name: 'Associate Clinician CPT Fixed Fee',
    description: 'Flat fee per session: $85 for 90837, $70 for 90834, $95 for couples 90847',
    isDefault: false,
    minimumPayGuarantee: 2800.00,
    rules: [
      {
        id: 'rule-90837',
        name: '60-Minute Psychotherapy (90837)',
        ruleType: 'cpt_rate',
        cptCodes: ['90837'],
        flatAmount: 85.00,
        timingPolicy: 'on_date_of_service',
        description: '$85.00 flat clinician fee per completed 60m session',
      },
      {
        id: 'rule-90834',
        name: '45-Minute Psychotherapy (90834)',
        ruleType: 'cpt_rate',
        cptCodes: ['90834'],
        flatAmount: 70.00,
        timingPolicy: 'on_date_of_service',
        description: '$70.00 flat clinician fee per completed 45m session',
      },
      {
        id: 'rule-90847',
        name: 'Couples / Family Psychotherapy (90847)',
        ruleType: 'cpt_rate',
        cptCodes: ['90847'],
        flatAmount: 95.00,
        timingPolicy: 'on_date_of_service',
        description: '$95.00 flat clinician fee for conjoint couples session',
      },
    ],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
];

// Initial Mock Workers
const SEED_WORKERS: WorkerRecord[] = [
  {
    id: 'worker-dr-sarah-chen',
    practiceId: 'practice-demo-1',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen.md@behavioralhealth.org',
    phone: '(415) 555-0199',
    role: 'practice_owner',
    employmentType: 'w2_employee',
    status: 'active',
    primaryLocationId: 'loc-sf-downtown',
    hireDate: '2024-01-15',
    credentials: {
      licenseType: 'MD',
      licenseNumber: 'A148920',
      licenseState: 'CA',
      npi: '1982736450',
      taxonomyCode: '2084P0800X',
      expirationDate: '2028-06-30',
    },
    compensationPlanId: 'plan-tiered-standard',
    paySchedule: 'semi_monthly',
    avatarInitials: 'SC',
    weeklyTargetHours: 25,
  },
  {
    id: 'worker-marcus-vance',
    practiceId: 'practice-demo-1',
    firstName: 'Marcus',
    lastName: 'Vance',
    email: 'marcus.vance.lcsw@behavioralhealth.org',
    phone: '(415) 555-0244',
    role: 'licensed_clinician',
    employmentType: 'w2_employee',
    status: 'active',
    primaryLocationId: 'loc-sf-downtown',
    hireDate: '2024-06-01',
    credentials: {
      licenseType: 'LCSW',
      licenseNumber: 'LCSW77481',
      licenseState: 'CA',
      npi: '1447289103',
      taxonomyCode: '1041C0700X',
      expirationDate: '2027-11-30',
    },
    compensationPlanId: 'plan-tiered-standard',
    paySchedule: 'semi_monthly',
    avatarInitials: 'MV',
    weeklyTargetHours: 28,
  },
  {
    id: 'worker-elena-rostova',
    practiceId: 'practice-demo-1',
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova.amft@behavioralhealth.org',
    phone: '(510) 555-0312',
    role: 'associate_clinician',
    employmentType: 'w2_employee',
    status: 'active',
    primaryLocationId: 'loc-oakland-uptown',
    hireDate: '2025-02-15',
    credentials: {
      licenseType: 'AMFT',
      licenseNumber: 'AMFT119402',
      licenseState: 'CA',
      npi: '1669842105',
      taxonomyCode: '106H00000X',
      expirationDate: '2027-02-28',
    },
    supervisorId: 'worker-dr-sarah-chen',
    compensationPlanId: 'plan-cpt-fixed',
    paySchedule: 'semi_monthly',
    avatarInitials: 'ER',
    weeklyTargetHours: 20,
  },
  {
    id: 'worker-trupti-patel',
    practiceId: 'practice-demo-1',
    firstName: 'Trupti',
    lastName: 'Patel',
    email: 'trupti.patel.psyd@behavioralhealth.org',
    phone: '(415) 555-0899',
    role: 'supervising_clinician',
    employmentType: '1099_contractor',
    status: 'active',
    primaryLocationId: 'loc-sf-downtown',
    hireDate: '2024-09-01',
    credentials: {
      licenseType: 'PsyD',
      licenseNumber: 'PSY28914',
      licenseState: 'CA',
      npi: '1229874100',
      taxonomyCode: '103T00000X',
      expirationDate: '2027-08-31',
    },
    compensationPlanId: 'plan-tiered-standard',
    paySchedule: 'semi_monthly',
    avatarInitials: 'TP',
    weeklyTargetHours: 15,
  },
];

// Initial Seed Earning Line Items for Current Pay Period (Oct 1–15, 2026)
const SEED_EARNINGS: EarningLineItem[] = [
  {
    id: 'earn-001',
    workerId: 'worker-dr-sarah-chen',
    workerName: 'Dr. Sarah Chen, MD',
    encounterId: 'enc-jane-doe-90837',
    dateOfService: '2026-10-02',
    clientName: 'Jane Doe',
    serviceDescription: 'INDIVIDUAL - CPT 90837',
    cptCode: '90837',
    amountBilled: 200.00,
    amountCollected: 160.00,
    clinicianEarning: 98.00, // 55% of $160 = $88 + $10 doc bonus
    practiceRetained: 62.00,
    ruleApplied: 'Volume Tier Split (50% - 60%)',
    explanation: 'Encounter enc-jane-doe-90837 | CPT 90837 | Collected $160.00 | Tier 55% ($88.00) + $10.00 Doc Bonus | Clinician earning: $98.00',
    status: 'accrued',
    createdAt: '2026-10-02T11:00:00Z',
  },
  {
    id: 'earn-002',
    workerId: 'worker-dr-sarah-chen',
    workerName: 'Dr. Sarah Chen, MD',
    encounterId: 'enc-david-kim-90837',
    dateOfService: '2026-10-03',
    clientName: 'David Kim',
    serviceDescription: 'INDIVIDUAL - CPT 90837',
    cptCode: '90837',
    amountBilled: 200.00,
    amountCollected: 160.00,
    clinicianEarning: 98.00,
    practiceRetained: 62.00,
    ruleApplied: 'Volume Tier Split (50% - 60%)',
    explanation: 'Encounter enc-david-kim-90837 | CPT 90837 | Collected $160.00 | Tier 55% ($88.00) + $10.00 Doc Bonus | Clinician earning: $98.00',
    status: 'accrued',
    createdAt: '2026-10-03T14:30:00Z',
  },
  {
    id: 'earn-003',
    workerId: 'worker-marcus-vance',
    workerName: 'Marcus Vance, LCSW',
    encounterId: 'enc-marcus-90834',
    dateOfService: '2026-10-04',
    clientName: 'Alex Morgan',
    serviceDescription: 'INDIVIDUAL - CPT 90834',
    cptCode: '90834',
    amountBilled: 160.00,
    amountCollected: 130.00,
    clinicianEarning: 71.50, // 55% of $130
    practiceRetained: 58.50,
    ruleApplied: 'Volume Tier Split (50% - 60%)',
    explanation: 'Encounter enc-marcus-90834 | CPT 90834 | Collected $130.00 | Tier 55% ($71.50) | Clinician earning: $71.50',
    status: 'accrued',
    createdAt: '2026-10-04T12:00:00Z',
  },
  {
    id: 'earn-004',
    workerId: 'worker-elena-rostova',
    workerName: 'Elena Rostova, AMFT',
    encounterId: 'enc-elena-intake',
    dateOfService: '2026-10-04',
    clientName: 'Samuel Green',
    serviceDescription: 'INTAKE - CPT 90791',
    cptCode: '90791',
    amountBilled: 250.00,
    amountCollected: 220.00,
    clinicianEarning: 85.00,
    practiceRetained: 135.00,
    ruleApplied: 'Associate Clinician CPT Fixed Fee',
    explanation: 'Encounter enc-elena-intake | CPT 90791 | Fixed CPT Fee: $85.00 | Clinician earning: $85.00',
    status: 'accrued',
    createdAt: '2026-10-04T16:00:00Z',
  },
];

const PracticeOsContext = createContext<PracticeOsContextType | null>(null);

const loadPersisted = <T,>(key: string, fallback: T): T => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(`theraflow_pos_${key}`);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return fallback;
};

const savePersisted = (key: string, val: any) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`theraflow_pos_${key}`, JSON.stringify(val));
    } catch {}
  }
};

export const PracticeOsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankingProvider] = useState(() => new SandboxEmbeddedBankingProvider());
  const [locations] = useState<PracticeLocation[]>(SEED_LOCATIONS);
  const [workers, setWorkers] = useState<WorkerRecord[]>(SEED_WORKERS);
  const [compensationPlans, setCompensationPlans] = useState<CompensationPlan[]>(SEED_COMPENSATION_PLANS);
  const [openEarnings, setOpenEarnings] = useState<EarningLineItem[]>(SEED_EARNINGS);
  const [selectedPayrollProvider, setSelectedPayrollProvider] = useState<string>('sandbox');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Bank & Reconciliation State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [financialSummary, setFinancialSummary] = useState<PracticeFinancialSummary>({
    operatingCash: 78420.50,
    availableCash: 76220.50,
    pendingDeposits: 3450.00,
    accruedPayrollLiability: 8420.50,
    taxReserveBalance: 19605.12,
    accountsReceivableInsurance: 12480.00,
    accountsReceivablePatient: 2150.00,
    monthlyRevenueInsurance: 28400.00,
    monthlyRevenuePrivatePay: 14200.00,
    monthlyTotalRevenue: 42600.00,
    monthlyClinicianCompensation: 23430.00,
    monthlyGrossPracticeMargin: 19170.00,
    monthlyGrossMarginPercentage: 45.0,
    monthlyOperatingExpenses: 4850.00,
    monthlyNetCashFlow: 14320.00,
  });

  const [reconciliations, setReconciliations] = useState<ClaimPaymentReconciliation[]>([
    {
      id: 'rec-init-01',
      claimId: 'claim-8472',
      clientName: 'Jane Doe',
      payerName: 'Aetna Health Plan',
      cptCode: '90837',
      dateOfService: '2026-10-02',
      amountBilled: 200.00,
      allowedAmount: 160.00,
      payerPayment: 140.00,
      patientResponsibility: 20.00,
      matchedDepositId: 'tx-001',
      clinicianId: 'worker-dr-sarah-chen',
      clinicianName: 'Dr. Sarah Chen, MD',
      compensationRule: '55% of collections',
      clinicianShare: 88.00,
      practiceShare: 72.00,
      reconciledAt: '2026-10-02T14:22:00Z',
      status: 'matched',
    },
  ]);

  // Current Open Pay Period (Oct 1–15, 2026)
  const [currentPayPeriod, setCurrentPayPeriod] = useState<PayPeriod>({
    id: 'pay-period-2026-10-A',
    practiceId: 'practice-demo-1',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    payDate: '2026-10-20',
    status: 'open',
    totalClinicians: 4,
    totalEncounters: 38,
    totalGrossCollections: 6420.00,
    totalGrossCompensation: 352.50,
  });

  // Historical Closed Payroll Runs
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([
    {
      id: 'pay-run-2026-09-B',
      practiceId: 'practice-demo-1',
      payPeriodId: 'pay-period-2026-09-B',
      payPeriodLabel: 'Sep 16 - Sep 30, 2026',
      runDate: '2026-10-01',
      status: 'settled',
      provider: 'sandbox',
      externalBatchId: 'ach-batch-9921',
      totalGrossPay: 12450.00,
      totalEmployerTaxesEstimate: 1226.32,
      totalFundingRequired: 13676.32,
      approvedBy: 'Dr. Sarah Chen, MD',
      approvedAt: '2026-10-01T09:00:00Z',
      submittedAt: '2026-10-01T09:15:00Z',
      settledAt: '2026-10-03T16:00:00Z',
      clinicianSummaries: [],
    },
  ]);

  // Hydrate authoritative Practice OS state from PostgreSQL API
  const refreshFromPostgres = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/practice-os/state');
      if (res.ok) {
        const data = await res.json();
        if (data.workers && data.workers.length > 0) setWorkers(data.workers);
        if (data.compensationPlans && data.compensationPlans.length > 0) setCompensationPlans(data.compensationPlans);
        if (data.openEarnings) setOpenEarnings(data.openEarnings);
        if (data.currentPayPeriod) setCurrentPayPeriod(data.currentPayPeriod);
        if (data.payrollRuns) setPayrollRuns(data.payrollRuns);
        if (data.bankAccounts) setBankAccounts(data.bankAccounts);
        if (data.bankTransactions) setBankTransactions(data.bankTransactions);
        if (data.financialSummary) setFinancialSummary(data.financialSummary);
        if (data.reconciliations) setReconciliations(data.reconciliations);
        setDbError(null);
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        setDbError(err.error || `PostgreSQL Authority Unavailable (HTTP ${res.status})`);
        return false;
      }
    } catch (err: any) {
      // In standalone JSDOM headless testing without active backend
      return false;
    } finally {
      setIsHydrating(false);
    }
  };

  useEffect(() => {
    refreshFromPostgres();
  }, []);

  // Derive Clinician Payroll Summaries from open earnings line items
  const clinicianPayrollSummaries: ClinicianPayrollSummary[] = workers.map((worker) => {
    const workerEarnings = openEarnings.filter((e) => e.workerId === worker.id);
    const indSessions = workerEarnings.filter((e) => e.cptCode === '90837' || e.cptCode === '90834').length;
    const couples = workerEarnings.filter((e) => e.cptCode === '90847').length;
    const intakes = workerEarnings.filter((e) => e.cptCode === '90791').length;
    const lateCancels = workerEarnings.filter((e) => e.ruleApplied.includes('Late') || e.ruleApplied.includes('No-Show')).length;
    const totalCollected = workerEarnings.reduce((acc, curr) => acc + curr.amountCollected, 0);
    const bonuses = workerEarnings
      .filter((e) => e.cptCode === 'BONUS' || e.ruleApplied.toLowerCase().includes('bonus'))
      .reduce((acc, curr) => acc + curr.clinicianEarning, 0);
    const baseCompensation = workerEarnings
      .filter((e) => e.cptCode !== 'BONUS' && !e.ruleApplied.toLowerCase().includes('bonus'))
      .reduce((acc, curr) => acc + curr.clinicianEarning, 0);
    const adjustments = workerEarnings
      .filter((e) => e.ruleApplied.toLowerCase().includes('adjustment') || e.clinicianEarning < 0)
      .reduce((acc, curr) => acc + curr.clinicianEarning, 0);
    const reimbursements = 0;
    const grossPay = Math.round((baseCompensation + bonuses + adjustments + reimbursements) * 100) / 100;

    return {
      workerId: worker.id,
      workerName: `${worker.firstName} ${worker.lastName}, ${worker.credentials.licenseType}`,
      employmentType: worker.employmentType,
      role: worker.role,
      individualSessionsCount: indSessions,
      couplesSessionsCount: couples,
      intakesCount: intakes,
      lateCancellationsCount: lateCancels,
      supervisionHours: worker.role === 'supervising_clinician' ? 4 : 0,
      attributableCollections: totalCollected,
      baseCompensation,
      bonuses,
      adjustments,
      reimbursements,
      grossPay,
      status: 'pending_review',
      lineItems: workerEarnings,
    };
  });

  const addWorker = (newWorker: Omit<WorkerRecord, 'id'>) => {
    const created: WorkerRecord = {
      ...newWorker,
      id: `worker-${Date.now()}`,
    };
    setWorkers((prev) => [...prev, created]);
  };

  const updateWorker = (id: string, updates: Partial<WorkerRecord>) => {
    setWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const addCompensationPlan = (newPlan: Omit<CompensationPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const plan: CompensationPlan = {
      ...newPlan,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCompensationPlans((prev) => [...prev, plan]);
  };

  /**
   * Complete Downstream Cascade Workflow:
   * Encounter -> Note -> Claim -> Payment -> Compensation Accrual -> Payroll Ledger -> Banking Deposit
   */
  const triggerEncounterToPaycheckCascade = async (encounterDetails: {
    clientName: string;
    cptCode: string;
    serviceType: 'individual' | 'couples' | 'intake';
    amountCollected: number;
    workerId: string;
    encounterId?: string;
    claimId?: string;
  }) => {
    setIsProcessing(true);
    try {
      const worker = workers.find((w) => w.id === encounterDetails.workerId) || workers[0];
      const plan = compensationPlans.find((p) => p.id === worker.compensationPlanId) || compensationPlans[0];
      const dateStr = new Date().toISOString().split('T')[0];
      const encounterId = encounterDetails.encounterId || `enc-${worker.id}-${encounterDetails.clientName.toLowerCase().replace(/\s+/g, '-')}-${dateStr}`;
      const claimId = encounterDetails.claimId || `claim-${encounterId}`;
      const idempotencyKey = PracticeEventBus.createPaymentIdempotencyKey('practice-demo-1', 'encounter_cascade', encounterId);

      // Durable Idempotency Check: reject duplicate cascade on same encounter
      if (practiceEventBus.isProcessed(idempotencyKey)) {
        console.warn(`[PracticeOS] Durable idempotency duplicate rejected for encounter: ${encounterId}`);
        return;
      }

      // 1. Emit encounter.completed
      await practiceEventBus.emit('encounter.completed', 'practice-demo-1', worker.id, `enc-comp-${encounterId}`, {
        encounterId,
        workerId: worker.id,
        clientName: encounterDetails.clientName,
        cptCode: encounterDetails.cptCode,
      });

      // 2. Calculate Compensation Line Item
      const compResult = calculateEncounterCompensation(
        {
          encounterId,
          workerId: worker.id,
          workerName: `${worker.firstName} ${worker.lastName}, ${worker.credentials.licenseType}`,
          clientName: encounterDetails.clientName,
          dateOfService: dateStr,
          cptCode: encounterDetails.cptCode,
          serviceType: encounterDetails.serviceType,
          status: 'completed',
          amountBilled: encounterDetails.amountCollected + 40,
          allowedAmount: encounterDetails.amountCollected,
          amountCollected: encounterDetails.amountCollected,
          isNoteSignedOnTime: true,
          historicalSessionCountInPeriod: openEarnings.filter((e) => e.workerId === worker.id && e.status !== 'paid').length,
          timingEvent: 'cash_settled',
        },
        plan
      );

      if (compResult.lineItem) {
        // 3. Reconcile deposit with Double-Entry Banking Provider FIRST (atomic commit)
        const rec = await bankingProvider.reconcileClaimPayment({
          claimId,
          clientName: encounterDetails.clientName,
          payerName: 'Primary Insurance Remittance',
          cptCode: encounterDetails.cptCode,
          dateOfService: dateStr,
          amountBilled: encounterDetails.amountCollected + 40,
          allowedAmount: encounterDetails.amountCollected,
          payerPayment: encounterDetails.amountCollected,
          patientResponsibility: 0,
          clinicianId: worker.id,
          clinicianName: `${worker.firstName} ${worker.lastName}`,
          compensationPercentage: 50,
        });

        const newLineItem = compResult.lineItem;
        setOpenEarnings((prev) => [newLineItem, ...prev]);
        setReconciliations((prev) => [rec, ...prev]);

        // 4. Emit compensation.accrued
        await practiceEventBus.emit('compensation.accrued', 'practice-demo-1', worker.id, `comp-acc-${newLineItem.id}`, {
          lineItem: newLineItem,
        });

        // Refresh banking accounts and transactions from authoritative provider
        const accts = await bankingProvider.getAccounts('practice-demo-1');
        const txs = await bankingProvider.getTransactions('practice-demo-1', 20);
        setBankAccounts(accts);
        setBankTransactions(txs);

        // Update current pay period totals
        setCurrentPayPeriod((prev) => ({
          ...prev,
          totalEncounters: prev.totalEncounters + 1,
          totalGrossCollections: prev.totalGrossCollections + encounterDetails.amountCollected,
          totalGrossCompensation: prev.totalGrossCompensation + newLineItem.clinicianEarning,
        }));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reconciles an Insurance Claim with Payer Remittance
   */
  const simulateInsuranceRemittance = async (claimId: string, allowedAmount: number, payerPayment: number) => {
    setIsProcessing(true);
    const worker = workers[0];
    const rec = await bankingProvider.reconcileClaimPayment({
      claimId,
      clientName: 'Jane Doe',
      payerName: 'Blue Shield of California',
      cptCode: '90837',
      dateOfService: '2026-10-04',
      amountBilled: 200.00,
      allowedAmount,
      payerPayment,
      patientResponsibility: 0,
      clinicianId: worker.id,
      clinicianName: `${worker.firstName} ${worker.lastName}`,
      compensationPercentage: 55,
    });

    setReconciliations((prev) => [rec, ...prev]);

    // Add earning line item to clinician payroll ledger
    const earning: EarningLineItem = {
      id: `earn-remit-${Date.now()}`,
      workerId: worker.id,
      workerName: `${worker.firstName} ${worker.lastName}, ${worker.credentials.licenseType}`,
      claimId,
      dateOfService: '2026-10-04',
      clientName: 'Jane Doe',
      serviceDescription: 'INSURANCE CLAIM REMITTANCE - CPT 90837',
      cptCode: '90837',
      amountBilled: 200.00,
      amountCollected: payerPayment,
      clinicianEarning: rec.clinicianShare,
      practiceRetained: rec.practiceShare,
      ruleApplied: '55% of Collections (Insurance Paid)',
      explanation: `Claim ${claimId} Reconciled | Payer: Blue Shield | Collected $${payerPayment.toFixed(2)} | Clinician Share (55%): $${rec.clinicianShare.toFixed(2)}`,
      status: 'accrued',
      createdAt: new Date().toISOString(),
    };

    setOpenEarnings((prev) => [earning, ...prev]);

    // Refresh banking accounts and transactions
    const accts = await bankingProvider.getAccounts('practice-demo-1');
    const txs = await bankingProvider.getTransactions('practice-demo-1', 20);
    setBankAccounts(accts);
    setBankTransactions(txs);

    setIsProcessing(false);
  };

  /**
   * Processes a Private-Pay Card Charge
   */
  const simulatePrivatePayPayment = async (clientName: string, amount: number, cptCode: string) => {
    setIsProcessing(true);
    const worker = workers[1]; // Marcus Vance
    const { transaction, reconciliation } = await bankingProvider.processPrivatePayCharge({
      clientName,
      amount,
      cptCode,
      clinicianId: worker.id,
      clinicianName: `${worker.firstName} ${worker.lastName}`,
      clinicianPercentage: 55,
    });

    setReconciliations((prev) => [reconciliation, ...prev]);
    setBankTransactions((prev) => [transaction, ...prev]);

    // Add to open earnings
    const earning: EarningLineItem = {
      id: `earn-card-${Date.now()}`,
      workerId: worker.id,
      workerName: `${worker.firstName} ${worker.lastName}, ${worker.credentials.licenseType}`,
      dateOfService: new Date().toISOString().split('T')[0],
      clientName,
      serviceDescription: `PRIVATE PAY CARD - CPT ${cptCode}`,
      cptCode,
      amountBilled: amount,
      amountCollected: amount,
      clinicianEarning: reconciliation.clinicianShare,
      practiceRetained: reconciliation.practiceShare,
      ruleApplied: '55% of Private-Pay Card Settlement',
      explanation: `Private Pay Settlement | Client: ${clientName} | Card Charge: $${amount.toFixed(2)} | Clinician Earning: $${reconciliation.clinicianShare.toFixed(2)}`,
      status: 'accrued',
      createdAt: new Date().toISOString(),
    };

    setOpenEarnings((prev) => [earning, ...prev]);

    // Update banking accounts
    const accts = await bankingProvider.getAccounts('practice-demo-1');
    setBankAccounts(accts);

    setIsProcessing(false);
  };

  /**
   * Approves & Submits Current Pay Period Run with Server-Side PostgreSQL Lock Authority
   */
  const approveAndSubmitPayroll = async (payPeriodId: string): Promise<{ success: boolean; batchId: string }> => {
    setIsProcessing(true);
    try {
      // 1. Authoritative Server-Side PostgreSQL Execution
      const response = await fetch('/api/practice-os/payroll/approve-and-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payPeriodId,
          provider: selectedPayrollProvider,
        }),
      }).catch(() => null);

      if (response) {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server payroll approval rejected with HTTP ${response.status}`
          );
        }
        const result = await response.json();
        await refreshFromPostgres();
        return { success: true, batchId: result.batchId };
      }

      // Snapshot the exact open earnings line items included in this run
      const includedEarningsSnapshot = openEarnings.filter(
        (e) => e.status === 'accrued' || e.status === 'approved'
      );
      const includedEarningIds = new Set(includedEarningsSnapshot.map((e) => e.id));

      const provider = getPayrollProvider(selectedPayrollProvider);
      const totalGross = clinicianPayrollSummaries.reduce((acc, curr) => acc + curr.grossPay, 0);
      const taxesEstimate = Math.round(totalGross * 0.0985 * 100) / 100;
      const totalFunding = totalGross + taxesEstimate;

      const draftRun: PayrollRun = {
        id: `pay-run-${Date.now()}`,
        practiceId: 'practice-demo-1',
        payPeriodId,
        payPeriodLabel: `${currentPayPeriod.startDate} to ${currentPayPeriod.endDate}`,
        runDate: new Date().toISOString().split('T')[0],
        status: 'approved',
        provider: selectedPayrollProvider as any,
        totalGrossPay: totalGross,
        totalEmployerTaxesEstimate: taxesEstimate,
        totalFundingRequired: totalFunding,
        approvedBy: 'Dr. Sarah Chen, MD',
        approvedAt: new Date().toISOString(),
        clinicianSummaries: clinicianPayrollSummaries,
      };

      // 1. Submit to Payroll Provider (Sandbox, Gusto, or ADP)
      const result = await provider.submitPayroll(draftRun);
      if (!result.success) {
        throw new Error(result.error || `Payroll submission to ${provider.name} failed: cannot fund payroll or mark earnings paid.`);
      }

      // 2. Fund via Embedded Business Banking ACH
      await bankingProvider.fundPayroll('practice-demo-1', draftRun.id, totalFunding);

      // 3. Mark ONLY the included earnings snapshot as paid (protects against in-flight earnings defect)
      draftRun.status = 'submitted';
      draftRun.externalBatchId = result.externalBatchId;
      draftRun.submittedAt = result.submittedAt;

      setOpenEarnings((prev) =>
        prev.map((e) => (includedEarningIds.has(e.id) ? { ...e, status: 'paid' } : e))
      );

      setPayrollRuns((prev) => [draftRun, ...prev]);

      // 4. Advance Pay Period to next cycle
      const currentEnd = new Date(currentPayPeriod.endDate);
      const nextStart = new Date(currentEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextEnd.getDate() + 14);
      const nextPay = new Date(nextEnd);
      nextPay.setDate(nextPay.getDate() + 5);

      setCurrentPayPeriod({
        id: `pp-${nextStart.toISOString().split('T')[0]}`,
        practiceId: currentPayPeriod.practiceId || 'practice-demo-1',
        startDate: nextStart.toISOString().split('T')[0],
        endDate: nextEnd.toISOString().split('T')[0],
        payDate: nextPay.toISOString().split('T')[0],
        status: 'open',
        totalClinicians: workers.length,
        totalEncounters: 0,
        totalGrossCollections: 0,
        totalGrossCompensation: 0,
      });

      // Refresh bank balances
      const accts = await bankingProvider.getAccounts('practice-demo-1');
      const txs = await bankingProvider.getTransactions('practice-demo-1', 20);
      setBankAccounts(accts);
      setBankTransactions(txs);

      return { success: true, batchId: result.externalBatchId };
    } finally {
      setIsProcessing(false);
    }
  };

  const operatingAccount = bankAccounts.find((a) => a.accountType === 'operating_checking') || bankAccounts[0] || null;

  const executeCascadeSimulation = async () => {
    await triggerEncounterToPaycheckCascade({
      clientName: 'Jane Doe',
      cptCode: '90837',
      serviceType: 'individual',
      amountCollected: 150.00,
      workerId: 'worker-dr-sarah-chen', // Authoritative Dr. Sarah Chen ID
    });
  };

  const simulatePrivatePaySettlement = async (clientName = 'Elena Rostova', amount = 200, cptCode = '90834') => {
    await simulatePrivatePayPayment(clientName, amount, cptCode);
  };

  return (
    <PracticeOsContext.Provider
      value={{
        practiceName: 'Bay Area Behavioral Health Group',
        locations,
        workers,
        addWorker,
        updateWorker,
        compensationPlans,
        addCompensationPlan,
        currentPayPeriod,
        activePayPeriod: currentPayPeriod,
        openEarnings,
        clinicianPayrollSummaries,
        payrollRuns,
        selectedPayrollProvider,
        setSelectedPayrollProvider,
        approveAndSubmitPayroll,
        bankAccounts,
        operatingAccount,
        isHydrating,
        bankTransactions,
        financialSummary,
        reconciliations,
        triggerEncounterToPaycheckCascade,
        executeCascadeSimulation,
        simulateInsuranceRemittance,
        simulatePrivatePayPayment,
        simulatePrivatePaySettlement,
        isProcessing,
        dbError,
        refreshFromPostgres,
      }}
    >
      {children}
    </PracticeOsContext.Provider>
  );
};

export const usePracticeOs = (): PracticeOsContextType => {
  const context = useContext(PracticeOsContext);
  if (!context) {
    throw new Error('usePracticeOs must be used within a PracticeOsProvider');
  }
  return context;
};
