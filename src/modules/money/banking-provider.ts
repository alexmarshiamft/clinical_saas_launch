/**
 * TheraFlow OS — Embedded Business Banking & Financial Provider Abstraction
 * 
 * Manages the BaaS (Banking-as-a-Service) embedded finance layer.
 * Coordinates practice checking accounts, automated tax reserves, payroll funding,
 * and intelligent claim-to-deposit reconciliation.
 */

import {
  BankAccount,
  BankTransaction,
  ClaimPaymentReconciliation,
  PracticeFinancialSummary,
} from '@/types/practice-os';

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
    compensationPercentage: number;
  }): Promise<ClaimPaymentReconciliation>;
  processPrivatePayCharge(params: {
    clientName: string;
    amount: number;
    cptCode: string;
    clinicianId: string;
    clinicianName: string;
    clinicianPercentage: number;
  }): Promise<{ transaction: BankTransaction; reconciliation: ClaimPaymentReconciliation }>;
}

export class SandboxEmbeddedBankingProvider implements BusinessBankingProvider {
  public name = 'TheraFlow Embedded Treasury (Sandbox)';
  public isSandbox = true;

  // Track processed claim IDs to enforce idempotency and prevent duplicate compensation
  private processedClaims = new Set<string>();

  private mockAccounts: BankAccount[] = [
    {
      id: 'acct-operating-01',
      practiceId: 'practice-demo-1',
      accountType: 'operating_checking',
      accountNumberMasked: '•••• 8492',
      routingNumberMasked: '•••• 0210',
      currentBalance: 78420.50,
      availableBalance: 76220.50,
      institutionName: 'TheraFlow Treasury (Evolve Bank & Trust, Member FDIC)',
      currency: 'USD',
      status: 'active',
    },
    {
      id: 'acct-tax-reserve-02',
      practiceId: 'practice-demo-1',
      accountType: 'tax_reserve',
      accountNumberMasked: '•••• 3190',
      routingNumberMasked: '•••• 0210',
      currentBalance: 19605.12,
      availableBalance: 19605.12,
      institutionName: 'TheraFlow Automated Tax Vault',
      currency: 'USD',
      status: 'active',
    },
    {
      id: 'acct-payroll-escrow-03',
      practiceId: 'practice-demo-1',
      accountType: 'payroll_escrow',
      accountNumberMasked: '•••• 6644',
      routingNumberMasked: '•••• 0210',
      currentBalance: 14250.00,
      availableBalance: 14250.00,
      institutionName: 'TheraFlow Payroll Escrow',
      currency: 'USD',
      status: 'active',
    },
  ];

  private mockTransactions: BankTransaction[] = [
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

  async getAccounts(practiceId: string): Promise<BankAccount[]> {
    return [...this.mockAccounts];
  }

  async getTransactions(practiceId: string, limit: number = 20): Promise<BankTransaction[]> {
    return this.mockTransactions.slice(0, limit);
  }

  async getFinancialSummary(practiceId: string): Promise<PracticeFinancialSummary> {
    const operating = this.mockAccounts[0].currentBalance;
    const tax = this.mockAccounts[1].currentBalance;

    return {
      operatingCash: operating,
      availableCash: this.mockAccounts[0].availableBalance,
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

  async fundPayroll(practiceId: string, payrollRunId: string, amount: number): Promise<{ success: boolean; transactionId: string }> {
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
      runningBalance: this.mockAccounts[0].currentBalance - amount,
      reconciled: true,
    };

    this.mockAccounts[0].currentBalance -= amount;
    this.mockAccounts[0].availableBalance -= amount;
    this.mockTransactions.unshift(newTx);

    return { success: true, transactionId: txId };
  }

  async fundPayrollBatch(practiceId: string, payrollRunId: string, amount: number): Promise<{ success: boolean; transactionId: string; achTraceNumber: string }> {
    const res = await this.fundPayroll(practiceId, payrollRunId, amount);
    return { ...res, achTraceNumber: `ach-tr-${Date.now()}` };
  }

  /**
   * Automatic Claim-to-Bank Reconciliation with Idempotency Protection
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
    compensationPercentage: number;
  }): Promise<ClaimPaymentReconciliation> {
    // Idempotency check: prevent duplicate compensation if claim is reprocessed
    if (this.processedClaims.has(params.claimId)) {
      throw new Error(`Idempotency fault: Claim ${params.claimId} has already been reconciled and credited to clinician compensation.`);
    }

    this.processedClaims.add(params.claimId);

    const totalCollected = params.payerPayment + params.patientResponsibility;
    const pct = params.compensationPercentage / 100;
    const clinicianShare = Math.round(totalCollected * pct * 100) / 100;
    const practiceShare = Math.round((totalCollected - clinicianShare) * 100) / 100;

    const depositId = `dep-${Date.now()}`;
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
      clinicianShare,
      practiceShare,
      reconciledAt: new Date().toISOString(),
      status: 'matched',
    };

    // Credit operating checking account with payment
    const newTx: BankTransaction = {
      id: `tx-${Date.now()}`,
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'insurance_remittance',
      amount: totalCollected,
      description: `EFT Remittance: ${params.payerName} - Claim ${params.claimId} (${params.clientName})`,
      referenceId: params.claimId,
      timestamp: new Date().toISOString(),
      runningBalance: this.mockAccounts[0].currentBalance + totalCollected,
      reconciled: true,
    };

    this.mockAccounts[0].currentBalance += totalCollected;
    this.mockAccounts[0].availableBalance += totalCollected;
    this.mockTransactions.unshift(newTx);

    // Auto-allocate 25% of practice retained revenue to tax reserve vault
    const taxSetAside = Math.round(practiceShare * 0.25 * 100) / 100;
    this.mockAccounts[1].currentBalance += taxSetAside;
    this.mockAccounts[1].availableBalance += taxSetAside;

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
    clinicianPercentage: number;
  }): Promise<{ transaction: BankTransaction; reconciliation: ClaimPaymentReconciliation }> {
    const chargeId = `chg-stripe-${Date.now()}`;
    const pct = params.clinicianPercentage / 100;
    const clinicianShare = Math.round(params.amount * pct * 100) / 100;
    const practiceShare = Math.round((params.amount - clinicianShare) * 100) / 100;

    const tx: BankTransaction = {
      id: `tx-card-${Date.now()}`,
      accountId: 'acct-operating-01',
      type: 'deposit',
      category: 'patient_private_pay',
      amount: params.amount,
      description: `Card Settlement: ${params.clientName} (CPT ${params.cptCode})`,
      referenceId: chargeId,
      timestamp: new Date().toISOString(),
      runningBalance: this.mockAccounts[0].currentBalance + params.amount,
      reconciled: true,
    };

    this.mockAccounts[0].currentBalance += params.amount;
    this.mockAccounts[0].availableBalance += params.amount;
    this.mockTransactions.unshift(tx);

    // Auto-allocate 25% of practice retained revenue to tax reserve vault
    const taxSetAside = Math.round(practiceShare * 0.25 * 100) / 100;
    this.mockAccounts[1].currentBalance += taxSetAside;
    this.mockAccounts[1].availableBalance += taxSetAside;

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
      clinicianShare,
      practiceShare,
      reconciledAt: new Date().toISOString(),
      status: 'matched',
    };

    return { transaction: tx, reconciliation: rec };
  }
}

export { SandboxEmbeddedBankingProvider as SandboxBankingProvider };
