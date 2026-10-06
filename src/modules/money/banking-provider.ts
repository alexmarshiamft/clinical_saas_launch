/**
 * TheraFlow OS — Embedded Business Banking & Financial Provider Abstraction
 * 
 * Manages the BaaS (Banking-as-a-Service) embedded finance layer.
 * Coordinates practice checking accounts, automated tax reserves, payroll funding,
 * and intelligent claim-to-deposit reconciliation.
 * 
 * REMEDIATED ARCHITECTURE:
 * - Backed by Double-Entry General Ledger (DoubleEntryLedger).
 * - Integer-cents precision with zero floating point drift.
 * - Tax reserves transfer cash between internal vaults (credits operating, debits tax vault)
 *   so net practice money is never artificially created or destroyed.
 * - Enforces overdraft protection, duplicate payroll funding prevention, and defensive copying.
 * - Truthfully labeled as "TheraFlow Sandbox Treasury (Simulated BaaS Partner - Demo Only)".
 */

import {
  BankAccount,
  BankTransaction,
  ClaimPaymentReconciliation,
  PracticeFinancialSummary,
} from '@/types/practice-os';
import { DoubleEntryLedger } from '@/modules/ledger/double-entry-ledger';
import { dollarsToCents, centsToDollars } from '@/modules/compensation/compensation-engine';

/**
 * Converts a percentage representation or basis points into exact BigInt basis points (1 bp = 0.01% = 1/10000).
 * Completely eliminates IEEE-754 floating-point arithmetic (zero float multiplications).
 *
 * Supported inputs:
 * - Direct BigInt basis points: 6550n -> 6550n
 * - Whole percentage number/string: 70 -> 7000n, "70" -> 7000n
 * - Fractional percentage number/string: 65.5 -> 6550n, "65.5" -> 6550n (via exact string parsing, 0 floats)
 */
export function parseBasisPoints(input: bigint | number | string): bigint {
  if (typeof input === 'bigint') {
    return input;
  }
  const str = String(input).trim();
  if (!str) return 0n;
  const parts = str.split('.');
  const wholePart = BigInt(parts[0] || '0');
  if (parts.length === 1) {
    return wholePart * 100n;
  }
  // Extract up to 2 decimal places (hundredths of a percent = basis points)
  const fracStr = (parts[1] + '00').slice(0, 2);
  const sign = wholePart < 0n || str.startsWith('-') ? -1n : 1n;
  const absWhole = wholePart < 0n ? -wholePart : wholePart;
  return sign * (absWhole * 100n + BigInt(fracStr));
}

/**
 * Pure Fixed-Point Basis-Point Arithmetic:
 * Calculates percentage of an integer cent amount using basis points (1 bp = 0.01%, 10,000 bps = 100%):
 * `(baseCents * basisPoints) / 10000n`
 *
 * Supports direct BigInt basis points (e.g. 6550n for 65.50%) as well as percentage
 * values parsed purely through decimal string conversion with zero floating-point operations.
 */
export function calculateBasisPointsCents(
  baseCents: bigint,
  percentageOrBasisPoints: bigint | number | string,
  isExplicitBasisPoints: boolean = false
): bigint {
  const bps: bigint = isExplicitBasisPoints
    ? BigInt(percentageOrBasisPoints)
    : parseBasisPoints(percentageOrBasisPoints);
  return (baseCents * bps) / 10000n;
}

export interface BusinessBankingProvider {
  name: string;
  isSandbox: boolean;
  getAccounts(practiceId: string): Promise<BankAccount[]>;
  getTransactions(practiceId: string, limit?: number): Promise<BankTransaction[]>;
  getFinancialSummary(practiceId: string): Promise<PracticeFinancialSummary>;
  fundPayroll(practiceId: string, payrollRunId: string, amount: number): Promise<{ success: boolean; transactionId: string }>;
  reconcileClaimPayment(params: {
    claimId: string;
    clientName: string;
    payerName: string;
    cptCode: string;
    dateOfService: string;
    amountBilled: number;
    allowedAmount: number;
    payerPayment: number;
    patientResponsibility: number;
    clinicianId: string;
    clinicianName: string;
    compensationPercentage?: number;
    compensationBasisPoints?: bigint | number;
  }): Promise<ClaimPaymentReconciliation>;
  processPrivatePayCharge(params: {
    clientName: string;
    amount: number;
    cptCode: string;
    clinicianId: string;
    clinicianName: string;
    clinicianPercentage?: number;
    clinicianBasisPoints?: bigint | number;
  }): Promise<{ transaction: BankTransaction; reconciliation: ClaimPaymentReconciliation }>;
}

export class SandboxEmbeddedBankingProvider implements BusinessBankingProvider {
  public name = 'TheraFlow Embedded Treasury (Sandbox Simulator - Demo Only)';
  public isSandbox = true;

  private ledger: DoubleEntryLedger;
  private processedClaims = new Set<string>();
  private fundedPayrollRuns = new Set<string>();

  // Internal bank accounts in integer cents
  private accountsState = {
    operatingCents: 7842050n,    // $78,420.50
    taxReserveCents: 1960512n,   // $19,605.12
    payrollEscrowCents: 1425000n,// $14,250.00
  };

  private transactions: BankTransaction[] = [
    {
      id: 'tx-001',
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'insurance_remittance',
      amount: 1850.00,
      description: 'AETNA HEALTH ERA #849102 EFT Batch',
      referenceId: 'claim-batch-849',
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      runningBalance: 78420.50,
      reconciled: true,
    },
    {
      id: 'tx-002',
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'patient_private_pay',
      amount: 400.00,
      description: 'Stripe Autopay - Jane Doe & Marcus Vance',
      referenceId: 'chg_stripe_9921',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      runningBalance: 76570.50,
      reconciled: true,
    },
    {
      id: 'tx-003',
      accountId: 'acct-operating-01',
      type: 'ach_debit',
      category: 'payroll_funding',
      amount: -12450.00,
      description: 'Payroll Direct Deposit Funding - Oct 1-15 Run',
      referenceId: 'pay-run-2026-10-01',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      runningBalance: 76170.50,
      reconciled: true,
    },
    {
      id: 'tx-004',
      accountId: 'acct-operating-01',
      type: 'withdrawal',
      category: 'operating_expense',
      amount: -850.00,
      description: 'EHR Cloud Infrastructure & Office Lease Suite 400',
      referenceId: 'exp-lease-oct',
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
      runningBalance: 88620.50,
      reconciled: true,
    },
  ];

  constructor(initialLedger?: DoubleEntryLedger) {
    this.ledger = initialLedger || new DoubleEntryLedger();
  }

  public getLedger(): DoubleEntryLedger {
    return this.ledger;
  }

  /**
   * Return deep-cloned defensive copies so callers cannot mutate internal balances
   */
  async getAccounts(practiceId: string): Promise<BankAccount[]> {
    return [
      {
        id: 'acct-operating-01',
        practiceId: practiceId || 'practice-demo-1',
        accountType: 'operating_checking',
        accountNumberMasked: '•••• 8492',
        routingNumberMasked: '•••• 0210',
        currentBalance: centsToDollars(this.accountsState.operatingCents),
        availableBalance: centsToDollars(this.accountsState.operatingCents),
        institutionName: 'TheraFlow Sandbox Treasury (Simulated BaaS Partner - Demo Only)',
        currency: 'USD',
        status: 'active',
      },
      {
        id: 'acct-tax-reserve-02',
        practiceId: practiceId || 'practice-demo-1',
        accountType: 'tax_reserve',
        accountNumberMasked: '•••• 3190',
        routingNumberMasked: '•••• 0210',
        currentBalance: centsToDollars(this.accountsState.taxReserveCents),
        availableBalance: centsToDollars(this.accountsState.taxReserveCents),
        institutionName: 'TheraFlow Automated Tax Vault (Simulated Sandbox)',
        currency: 'USD',
        status: 'active',
      },
      {
        id: 'acct-payroll-escrow-03',
        practiceId: practiceId || 'practice-demo-1',
        accountType: 'payroll_escrow',
        accountNumberMasked: '•••• 6644',
        routingNumberMasked: '•••• 0210',
        currentBalance: centsToDollars(this.accountsState.payrollEscrowCents),
        availableBalance: centsToDollars(this.accountsState.payrollEscrowCents),
        institutionName: 'TheraFlow Payroll Escrow (Simulated Sandbox)',
        currency: 'USD',
        status: 'active',
      },
    ];
  }

  async getTransactions(_practiceId: string, limit: number = 20): Promise<BankTransaction[]> {
    return this.transactions.slice(0, limit).map((t) => ({ ...t }));
  }

  async getFinancialSummary(_practiceId: string): Promise<PracticeFinancialSummary> {
    const operating = centsToDollars(this.accountsState.operatingCents);
    const tax = centsToDollars(this.accountsState.taxReserveCents);

    return {
      operatingCash: operating,
      availableCash: operating,
      pendingDeposits: 3450.00,
      accruedPayrollLiability: 8420.50,
      taxReserveBalance: tax,
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
    };
  }

  /**
   * Payroll Funding with Overdraft & Duplicate Funding Guard
   */
  async fundPayroll(practiceId: string, payrollRunId: string, amount: number): Promise<{ success: boolean; transactionId: string }> {
    const amountCents = dollarsToCents(amount);
    if (amountCents <= 0n) {
      throw new Error(`Invalid payroll funding amount: $${amount}. Must be greater than 0.`);
    }

    // Guard 1: Duplicate payroll funding prevention
    if (this.fundedPayrollRuns.has(payrollRunId)) {
      throw new Error(`Duplicate funding rejected: Payroll run ${payrollRunId} has already been funded.`);
    }

    // Guard 2: Overdraft protection
    if (this.accountsState.operatingCents < amountCents) {
      throw new Error(
        `Insufficient funds in operating checking account ($${(centsToDollars(this.accountsState.operatingCents)).toFixed(2)}) to fund payroll ($${amount.toFixed(2)}). Funding rejected.`
      );
    }

    this.fundedPayrollRuns.add(payrollRunId);

    // Record double-entry transaction
    this.ledger.recordPayrollFunding({
      practiceId,
      payrollRunId,
      netCompCents: Number(amountCents),
    });

    // Debit operating account in integer cents
    this.accountsState.operatingCents -= amountCents;

    const txId = `tx-payroll-${Date.now()}`;
    const newTx: BankTransaction = {
      id: txId,
      accountId: 'acct-operating-01',
      type: 'ach_debit',
      category: 'payroll_funding',
      amount: -amount,
      description: `ACH Payroll Direct Deposit Funding - ${payrollRunId}`,
      referenceId: payrollRunId,
      timestamp: new Date().toISOString(),
      runningBalance: centsToDollars(this.accountsState.operatingCents),
      reconciled: true,
    };

    this.transactions.unshift(newTx);
    return { success: true, transactionId: txId };
  }

  async fundPayrollBatch(practiceId: string, payrollRunId: string, amount: number): Promise<{ success: boolean; transactionId: string; achTraceNumber: string }> {
    const res = await this.fundPayroll(practiceId, payrollRunId, amount);
    return { ...res, achTraceNumber: `ach-tr-${Date.now()}` };
  }

  /**
   * Reconcile Claim Payment:
   * Deposits ACTUAL cash received from insurer into operating account,
   * accurately records double-entry revenue & accrual, and allocates 25% tax reserve
   * via an internal account transfer without creating artificial money.
   */
  async reconcileClaimPayment(params: {
    claimId: string;
    clientName: string;
    payerName: string;
    cptCode: string;
    dateOfService: string;
    amountBilled: number;
    allowedAmount: number;
    payerPayment: number;
    patientResponsibility: number;
    clinicianId: string;
    clinicianName: string;
    compensationPercentage?: number;
    compensationBasisPoints?: bigint | number;
  }): Promise<ClaimPaymentReconciliation> {
    // Idempotency check: prevent duplicate compensation if claim is reprocessed
    if (this.processedClaims.has(params.claimId)) {
      throw new Error(`Idempotency fault: Claim ${params.claimId} has already been reconciled.`);
    }

    this.processedClaims.add(params.claimId);

    // Calculate in integer cents
    const payerPaymentCents = dollarsToCents(params.payerPayment);
    const patientRespCents = dollarsToCents(params.patientResponsibility);
    const totalCollectedCents = payerPaymentCents + patientRespCents;

    // Actual bank deposit from insurance EFT is strictly the payer payment
    const actualBankDepositCents = payerPaymentCents > 0n ? payerPaymentCents : totalCollectedCents;

    // Pure fixed-point basis-point calculation (zero floating-point operations)
    const bpsArg = params.compensationBasisPoints !== undefined
      ? params.compensationBasisPoints
      : (params.compensationPercentage ?? 70);
    const clinicianShareCents = calculateBasisPointsCents(
      totalCollectedCents,
      bpsArg,
      params.compensationBasisPoints !== undefined
    );
    const practiceShareCents = totalCollectedCents - clinicianShareCents;

    // 1. Record Double-Entry Journal for deposit
    this.ledger.recordInsuranceDeposit({
      practiceId: 'practice-demo-1',
      payerName: params.payerName,
      claimId: params.claimId,
      depositAmountCents: Number(actualBankDepositCents),
    });

    // 2. Record Double-Entry Journal for clinician compensation accrual
    this.ledger.recordClinicianCompAccrual({
      practiceId: 'practice-demo-1',
      workerId: params.clinicianId,
      workerName: params.clinicianName,
      encounterId: params.claimId,
      compAmountCents: Number(clinicianShareCents),
    });

    // Update operating balance in integer cents
    this.accountsState.operatingCents += actualBankDepositCents;

    const depositId = `dep-${Date.now()}`;
    const newTx: BankTransaction = {
      id: `tx-${Date.now()}`,
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'insurance_remittance',
      amount: centsToDollars(actualBankDepositCents),
      description: `EFT Remittance: ${params.payerName} - Claim ${params.claimId} (${params.clientName})`,
      referenceId: params.claimId,
      timestamp: new Date().toISOString(),
      runningBalance: centsToDollars(this.accountsState.operatingCents),
      reconciled: true,
    };
    this.transactions.unshift(newTx);

    // 3. Automated 25% Tax Reserve Set-Aside (2,500 basis points)
    // Transferred FROM operating checking TO tax reserve vault (Balanced transfer, no phantom money!)
    const taxSetAsideCents = (practiceShareCents * 2500n) / 10000n;
    if (taxSetAsideCents > 0n && this.accountsState.operatingCents >= taxSetAsideCents) {
      this.ledger.recordTaxReserveTransfer({
        practiceId: 'practice-demo-1',
        referenceId: params.claimId,
        amountCents: Number(taxSetAsideCents),
      });

      // Transfer between accounts: subtract from operating, add to tax reserve
      this.accountsState.operatingCents -= taxSetAsideCents;
      this.accountsState.taxReserveCents += taxSetAsideCents;
    }

    const reconciliation: ClaimPaymentReconciliation = {
      id: `rec-${Date.now()}`,
      claimId: params.claimId,
      clientName: params.clientName,
      payerName: params.payerName,
      cptCode: params.cptCode,
      dateOfService: params.dateOfService,
      amountBilled: params.amountBilled,
      allowedAmount: params.allowedAmount,
      payerPayment: params.payerPayment,
      patientResponsibility: params.patientResponsibility,
      matchedDepositId: depositId,
      clinicianId: params.clinicianId,
      clinicianName: params.clinicianName,
      compensationRule: `${params.compensationPercentage}% of collections`,
      clinicianShare: centsToDollars(clinicianShareCents),
      practiceShare: centsToDollars(practiceShareCents),
      reconciledAt: new Date().toISOString(),
      status: 'matched',
    };

    return reconciliation;
  }

  /**
   * Private-Pay Automated Charge Flow
   */
  async processPrivatePayCharge(params: {
    clientName: string;
    amount: number;
    cptCode: string;
    clinicianId: string;
    clinicianName: string;
    clinicianPercentage?: number;
    clinicianBasisPoints?: bigint | number;
  }): Promise<{ transaction: BankTransaction; reconciliation: ClaimPaymentReconciliation }> {
    const chargeId = `chg-stripe-${Date.now()}`;
    const amountCents = dollarsToCents(params.amount);

    // Pure fixed-point basis-point calculation (zero floating-point operations)
    const bpsArg = params.clinicianBasisPoints !== undefined
      ? params.clinicianBasisPoints
      : (params.clinicianPercentage ?? 70);
    const clinicianShareCents = calculateBasisPointsCents(
      amountCents,
      bpsArg,
      params.clinicianBasisPoints !== undefined
    );
    const practiceShareCents = amountCents - clinicianShareCents;

    // Record double entry settlement
    this.ledger.recordPrivatePaySettlement({
      practiceId: 'practice-demo-1',
      clientName: params.clientName,
      chargeId,
      amountCents: Number(amountCents),
    });

    // Record compensation accrual
    this.ledger.recordClinicianCompAccrual({
      practiceId: 'practice-demo-1',
      workerId: params.clinicianId,
      workerName: params.clinicianName,
      encounterId: chargeId,
      compAmountCents: Number(clinicianShareCents),
    });

    this.accountsState.operatingCents += amountCents;

    const tx: BankTransaction = {
      id: `tx-card-${Date.now()}`,
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'patient_private_pay',
      amount: params.amount,
      description: `Card Settlement: ${params.clientName} (CPT ${params.cptCode})`,
      referenceId: chargeId,
      timestamp: new Date().toISOString(),
      runningBalance: centsToDollars(this.accountsState.operatingCents),
      reconciled: true,
    };
    this.transactions.unshift(tx);

    // 25% Tax Set-aside transfer (2,500 basis points)
    const taxSetAsideCents = (practiceShareCents * 2500n) / 10000n;
    if (taxSetAsideCents > 0n && this.accountsState.operatingCents >= taxSetAsideCents) {
      this.ledger.recordTaxReserveTransfer({
        practiceId: 'practice-demo-1',
        referenceId: chargeId,
        amountCents: Number(taxSetAsideCents),
      });

      this.accountsState.operatingCents -= taxSetAsideCents;
      this.accountsState.taxReserveCents += taxSetAsideCents;
    }

    const rec: ClaimPaymentReconciliation = {
      id: `rec-private-${Date.now()}`,
      claimId: chargeId,
      clientName: params.clientName,
      payerName: 'Private Pay (Card on File)',
      cptCode: params.cptCode,
      dateOfService: new Date().toISOString().split('T')[0],
      amountBilled: params.amount,
      allowedAmount: params.amount,
      payerPayment: 0,
      patientResponsibility: params.amount,
      matchedDepositId: tx.id,
      clinicianId: params.clinicianId,
      clinicianName: params.clinicianName,
      compensationRule: `${params.clinicianPercentage}% of card settlement`,
      clinicianShare: centsToDollars(clinicianShareCents),
      practiceShare: centsToDollars(practiceShareCents),
      reconciledAt: new Date().toISOString(),
      status: 'matched',
    };

    return { transaction: tx, reconciliation: rec };
  }

  // ==========================================================================
  // Reversal, Refund, and ACH Return Workflows
  // ==========================================================================

  public async refundPayment(params: {
    clientName: string;
    chargeId: string;
    amount: number;
    reason?: string;
  }): Promise<{ success: boolean; transactionId: string }> {
    const amountCents = dollarsToCents(params.amount);
    if (this.accountsState.operatingCents < amountCents) {
      throw new Error('Insufficient operating balance to issue refund.');
    }

    const refundId = `ref-${Date.now()}`;
    this.ledger.recordRefund({
      practiceId: 'practice-demo-1',
      clientName: params.clientName,
      refundId,
      originalChargeId: params.chargeId,
      amountCents: Number(amountCents),
    });

    this.accountsState.operatingCents -= amountCents;

    const tx: BankTransaction = {
      id: `tx-refund-${Date.now()}`,
      accountId: 'acct-operating-01',
      type: 'withdrawal',
      category: 'operating_expense',
      amount: -params.amount,
      description: `Patient Refund: ${params.clientName} (Charge ${params.chargeId})`,
      referenceId: refundId,
      timestamp: new Date().toISOString(),
      runningBalance: centsToDollars(this.accountsState.operatingCents),
      reconciled: true,
    };
    this.transactions.unshift(tx);

    return { success: true, transactionId: tx.id };
  }

  public async handleReturnedAchFunding(params: {
    payrollRunId: string;
    amount: number;
    reason: string;
  }): Promise<{ success: boolean; transactionId: string }> {
    const amountCents = dollarsToCents(params.amount);
    this.ledger.recordFailedAch({
      practiceId: 'practice-demo-1',
      payrollRunId: params.payrollRunId,
      amountCents: Number(amountCents),
      reason: params.reason,
    });

    // Re-credit operating checking since funding did not settle
    this.accountsState.operatingCents += amountCents;
    this.fundedPayrollRuns.delete(params.payrollRunId);

    const tx: BankTransaction = {
      id: `tx-ret-ach-${Date.now()}`,
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'payroll_funding',
      amount: params.amount,
      description: `ACH Return / Funding Failed: ${params.payrollRunId} (${params.reason})`,
      referenceId: params.payrollRunId,
      timestamp: new Date().toISOString(),
      runningBalance: centsToDollars(this.accountsState.operatingCents),
      reconciled: true,
    };
    this.transactions.unshift(tx);

    return { success: true, transactionId: tx.id };
  }
}

export { SandboxEmbeddedBankingProvider as SandboxBankingProvider };
