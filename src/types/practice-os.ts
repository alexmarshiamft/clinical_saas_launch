/**
 * TheraFlow OS — Unified Practice Operating System
 * Core Data Contracts for Workforce, Compensation, Payroll, Banking & Unified Ledger
 */

// ============================================================================
// 1. WORKFORCE & PRACTICE ENTITIES
// ============================================================================

export type WorkerRole =
  | 'practice_owner'
  | 'clinical_admin'
  | 'supervising_clinician'
  | 'licensed_clinician'
  | 'associate_clinician'
  | 'intern'
  | 'billing_specialist'
  | 'administrative_assistant';

export type EmploymentType = 'w2_employee' | '1099_contractor';

export type WorkerStatus = 'active' | 'on_leave' | 'terminated' | 'onboarding';

export type LicenseType = 'LMFT' | 'LCSW' | 'LPCC' | 'PsyD' | 'MD' | 'DO' | 'AMFT' | 'ASW' | 'APCC';

export interface PracticeLocation {
  id: string;
  practiceId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isPrimary: boolean;
  phone: string;
}

export interface WorkerRecord {
  id: string;
  practiceId: string;
  firstName: string;
  lastName: string;
  title?: string;
  npi?: string;
  email: string;
  phone: string;
  role: WorkerRole;
  employmentType: EmploymentType;
  status: WorkerStatus;
  primaryLocationId: string;
  hireDate: string; // YYYY-MM-DD
  credentials: {
    licenseType: LicenseType;
    licenseNumber: string;
    licenseState: string;
    npi: string;
    taxonomyCode: string;
    expirationDate: string;
  };
  supervisorId?: string; // For associate clinicians requiring supervision
  compensationPlanId: string;
  paySchedule: 'semi_monthly' | 'bi_weekly' | 'monthly';
  avatarInitials: string;
  weeklyTargetHours: number;
}

// ============================================================================
// 2. CLINICIAN COMPENSATION ENGINE ENTITIES
// ============================================================================

export type CompensationRuleType =
  | 'flat_fee'              // Fixed $ per session
  | 'cpt_rate'              // Rate keyed to CPT (90837, 90834, etc.)
  | 'percentage_billed'     // % of gross charge
  | 'percentage_allowed'    // % of insurance contracted rate
  | 'percentage_collected'  // % of actual cash received
  | 'tiered_volume'         // Higher % after N sessions in pay period
  | 'tiered_collections'    // Higher % after $X collections in pay period
  | 'supervision_stipend'   // Flat $ per supervisee per month
  | 'admin_hourly'          // $ per non-clinical administrative hour
  | 'no_show_fee'           // $ for completed no-show claim
  | 'late_cancellation'    // $ for late cancellation fee
  | 'documentation_bonus';  // $ bonus for notes signed within 24 hours

export type CompensationTimingPolicy =
  | 'on_date_of_service'    // Accrues immediately upon completed encounter
  | 'on_claim_acceptance'   // Accrues when 277CA acceptance is received
  | 'on_insurer_remittance' // Accrues when 835 ERA payment is posted
  | 'on_cash_settlement';   // Accrues when bank deposit clears

export interface TierThreshold {
  fromCount: number;
  toCount: number | null; // null = infinity
  rateOrPercentage: number;
}

export interface CompensationRule {
  id: string;
  name: string;
  ruleType: CompensationRuleType;
  cptCodes?: string[];          // e.g. ['90837', '90834']
  encounterTypes?: string[];    // e.g. ['individual', 'couples', 'intake']
  flatAmount?: number;          // In dollars
  percentage?: number;          // e.g. 55 = 55%
  tiers?: TierThreshold[];
  timingPolicy: CompensationTimingPolicy;
  description: string;
}

export interface CompensationPlan {
  id: string;
  practiceId: string;
  name: string;
  description: string;
  isDefault: boolean;
  rules: CompensationRule[];
  minimumPayGuarantee?: number; // Minimum monthly floor if active
  documentationBonusAmount?: number; // e.g. $10 per note signed <24h
  createdAt: string;
  updatedAt: string;
}

export interface EarningLineItem {
  id: string;
  workerId: string;
  workerName: string;
  encounterId?: string;
  claimId?: string;
  paymentId?: string;
  dateOfService: string;
  clientName: string;
  serviceDescription: string;
  cptCode: string;
  amountBilled: number;
  amountCollected: number;
  clinicianEarning: number;
  practiceRetained: number;
  ruleApplied: string;
  explanation: string; // Exact auditable breakdown
  status: 'accrued' | 'approved' | 'paid' | 'adjusted';
  createdAt: string;
}

// ============================================================================
// 3. THERAFLOW PAYROLL ORCHESTRATION ENTITIES
// ============================================================================

export type PayPeriodStatus = 'open' | 'closing' | 'closed' | 'funded';
export type PayrollRunStatus = 'draft' | 'under_review' | 'approved' | 'submitted' | 'settled';

export interface PayPeriod {
  id: string;
  practiceId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  payDate: string;   // YYYY-MM-DD
  status: PayPeriodStatus;
  totalClinicians: number;
  totalEncounters: number;
  totalGrossCollections: number;
  totalGrossCompensation: number;
}

export interface ClinicianPayrollSummary {
  workerId: string;
  workerName: string;
  employmentType: EmploymentType;
  role: WorkerRole;
  individualSessionsCount: number;
  couplesSessionsCount: number;
  intakesCount: number;
  lateCancellationsCount: number;
  supervisionHours: number;
  attributableCollections: number;
  baseCompensation: number;
  bonuses: number;
  adjustments: number;
  reimbursements: number;
  grossPay: number;
  status: 'pending_review' | 'approved' | 'submitted';
  lineItems: EarningLineItem[];
}

export interface PayrollRun {
  id: string;
  practiceId: string;
  payPeriodId: string;
  payPeriodLabel: string;
  runDate: string;
  status: PayrollRunStatus;
  provider: 'sandbox' | 'gusto' | 'adp' | 'rippling' | 'quickbooks' | 'paychex';
  externalPayrollBatchId?: string;
  externalBatchId?: string;
  totalGrossPay: number;
  totalEmployerTaxesEstimate: number;
  totalFundingRequired: number;
  approvedBy?: string;
  approvedAt?: string;
  submittedAt?: string;
  settledAt?: string;
  clinicianSummaries: ClinicianPayrollSummary[];
}

// ============================================================================
// 4. THERAFLOW MONEY (BUSINESS BANKING & EMBEDDED FINANCE)
// ============================================================================

export interface BankAccount {
  id: string;
  practiceId: string;
  accountType: 'operating_checking' | 'tax_reserve' | 'payroll_escrow';
  accountNumberMasked: string; // e.g. "•••• 8492"
  routingNumberMasked: string; // e.g. "•••• 0210"
  currentBalance: number;
  availableBalance: number;
  institutionName: string; // e.g. "TheraFlow Banking (Evolve Bank & Trust, Member FDIC)"
  currency: 'USD';
  status: 'active' | 'restricted';
}

export interface BankTransaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'ach_debit' | 'ach_credit' | 'internal_transfer';
  category: 'insurance_remittance' | 'patient_private_pay' | 'payroll_funding' | 'tax_set_aside' | 'operating_expense';
  amount: number; // Positive = credit/deposit, Negative = debit
  description: string;
  referenceId?: string; // Claim ID, Payroll Run ID, or Stripe Charge ID
  timestamp: string;
  runningBalance: number;
  reconciled: boolean;
}

export interface ClaimPaymentReconciliation {
  id: string;
  claimId: string;
  clientName: string;
  payerName: string;
  cptCode: string;
  dateOfService: string;
  amountBilled: number;
  allowedAmount: number;
  payerPayment: number;
  patientResponsibility: number;
  matchedDepositId: string;
  clinicianId: string;
  clinicianName: string;
  compensationRule: string;
  clinicianShare: number;
  practiceShare: number;
  reconciledAt: string;
  status: 'matched' | 'pending_deposit' | 'disputed' | 'reversed';
}

export interface PracticeFinancialSummary {
  operatingCash: number;
  availableCash: number;
  pendingDeposits: number;
  accruedPayrollLiability: number;
  taxReserveBalance: number;
  accountsReceivableInsurance: number;
  accountsReceivablePatient: number;
  monthlyRevenueInsurance: number;
  monthlyRevenuePrivatePay: number;
  monthlyTotalRevenue: number;
  monthlyClinicianCompensation: number;
  monthlyGrossPracticeMargin: number;
  monthlyGrossMarginPercentage: number;
  monthlyOperatingExpenses: number;
  monthlyNetCashFlow: number;

  // Convenience aliases for Unified Command Center
  totalRevenue?: number;
  clinicianCompensation?: number;
  grossMargin?: number;
  grossMarginPercentage?: number;
  insuranceCollections?: number;
  privatePayCollections?: number;
  netOperatingCashFlow?: number;
}

// ============================================================================
// 5. UNIFIED PRACTICE EVENT BUS
// ============================================================================

export type PracticeEventType =
  | 'encounter.completed'
  | 'claim.created'
  | 'claim.accepted'
  | 'payment.received'
  | 'deposit.matched'
  | 'compensation.accrued'
  | 'pay_period.closed'
  | 'payroll.approved'
  | 'payroll.submitted'
  | 'payroll.funded';

export interface PracticeEvent<T = any> {
  id: string;
  type: PracticeEventType;
  practiceId: string;
  timestamp: string;
  actorId: string;
  idempotencyKey: string; // Unique hash preventing duplicate downstream actions
  payload: T;
}
