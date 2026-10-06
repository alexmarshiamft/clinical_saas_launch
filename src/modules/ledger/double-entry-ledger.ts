/**
 * TheraFlow OS — Enterprise Double-Entry Practice General Ledger
 * 
 * Double-entry general ledger engine.
 * Architectural Invariants:
 * 1. Every transaction has balanced debit and credit entries: SUM(debits) == SUM(credits).
 * 2. Balances cannot be arbitrarily mutated; they are derived from append-only journal entries.
 * 3. Monetary units are strictly represented in integer cents (avoiding JS float drift).
 * 4. Money is never created or destroyed: transfers between accounts preserve net practice balance.
 */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type EntryType = 'DEBIT' | 'CREDIT';

export interface ChartOfAccount {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  description: string;
}

export const STANDARD_CHART_OF_ACCOUNTS: Record<string, ChartOfAccount> = {
  // Assets (Normal Balance: DEBIT)
  '1010': {
    code: '1010',
    name: 'Operating Checking',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Primary practice operating bank account for collections and disbursements',
  },
  '1020': {
    code: '1020',
    name: 'Tax Reserve Vault',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Automated 25% tax set-aside reserve account',
  },
  '1030': {
    code: '1030',
    name: 'Payroll Clearing / Escrow',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Dedicated clearing account for direct deposit payroll distributions',
  },
  '1200': {
    code: '1200',
    name: 'Accounts Receivable - Insurance',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Claims billed to commercial and government payers awaiting adjudication',
  },
  '1210': {
    code: '1210',
    name: 'Accounts Receivable - Patient',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Patient copays, coinsurance, and deductibles awaiting card settlement',
  },

  // Liabilities (Normal Balance: CREDIT)
  '2010': {
    code: '2010',
    name: 'Clinician Compensation Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Accrued compensation owed to clinicians prior to payroll disbursement',
  },
  '2020': {
    code: '2020',
    name: 'Employer Payroll Tax Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'FICA, Medicare, and FUTA/SUTA statutory employer tax liabilities',
  },
  '2050': {
    code: '2050',
    name: 'Refund & Chargeback Clearing',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Pending patient refunds, disputes, and merchant chargebacks',
  },

  // Revenue (Normal Balance: CREDIT)
  '4010': {
    code: '4010',
    name: 'Practice Revenue - Insurance',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Earned revenue from insurance claim reimbursements',
  },
  '4020': {
    code: '4020',
    name: 'Practice Revenue - Private Pay',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Earned revenue from self-pay and out-of-pocket patient sessions',
  },

  // Expenses (Normal Balance: DEBIT)
  '5010': {
    code: '5010',
    name: 'Clinician Compensation Expense',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Earned professional compensation expenses',
  },
  '5020': {
    code: '5020',
    name: 'Employer Payroll Tax Expense',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Employer share of payroll taxes',
  },
  '5090': {
    code: '5090',
    name: 'Operating & Administrative Expense',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Facility, software, EHR, and practice overhead expenses',
  },
};

export interface JournalLine {
  accountCode: string;
  type: EntryType;
  amountCents: number; // Positive integer cents
  memo?: string;
}

export interface JournalEntry {
  id: string;
  practiceId: string;
  entryNumber: string;
  timestamp: string;
  description: string;
  referenceType: string;
  referenceId: string;
  lines: JournalLine[];
  totalDebitCents: number;
  totalCreditCents: number;
}

export class DoubleEntryLedger {
  private entries: JournalEntry[] = [];
  private entrySequence = 1000;

  constructor(initialEntries?: JournalEntry[]) {
    if (initialEntries && initialEntries.length > 0) {
      this.entries = [...initialEntries];
      this.entrySequence = 1000 + this.entries.length;
    }
  }

  /**
   * Validate and record a journal transaction.
   * Throws if SUM(debits) !== SUM(credits) or amountCents <= 0.
   */
  public postEntry(params: {
    practiceId: string;
    description: string;
    referenceType: string;
    referenceId: string;
    lines: JournalLine[];
    timestamp?: string;
  }): JournalEntry {
    if (!params.lines || params.lines.length < 2) {
      throw new Error('A valid journal entry must contain at least two line items (debit and credit).');
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of params.lines) {
      if (!Number.isInteger(line.amountCents) || line.amountCents <= 0) {
        throw new Error(`Invalid line item amount: ${line.amountCents}. Must be a positive integer in cents.`);
      }
      if (!STANDARD_CHART_OF_ACCOUNTS[line.accountCode]) {
        throw new Error(`Unknown account code: ${line.accountCode} in chart of accounts.`);
      }

      if (line.type === 'DEBIT') {
        totalDebits += line.amountCents;
      } else if (line.type === 'CREDIT') {
        totalCredits += line.amountCents;
      } else {
        throw new Error(`Invalid entry type: ${line.type}. Must be 'DEBIT' or 'CREDIT'.`);
      }
    }

    // Invariant: SUM(debits) === SUM(credits)
    if (totalDebits !== totalCredits) {
      throw new Error(
        `Unbalanced journal entry! Total debits ($${(totalDebits / 100).toFixed(2)}) != total credits ($${(totalCredits / 100).toFixed(2)}). Difference: ${totalDebits - totalCredits} cents.`
      );
    }

    this.entrySequence++;
    const entry: JournalEntry = {
      id: `je-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      practiceId: params.practiceId,
      entryNumber: `JE-${this.entrySequence}`,
      timestamp: params.timestamp || new Date().toISOString(),
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      lines: [...params.lines],
      totalDebitCents: totalDebits,
      totalCreditCents: totalCredits,
    };

    this.entries.push(entry);
    return entry;
  }

  // ==========================================================================
  // Standardized Practice Workflows (Always Balanced)
  // ==========================================================================

  /**
   * 1. Insurance Remittance EFT Deposit
   * Debit: 1010 Operating Checking (cash received)
   * Credit: 4010 Practice Revenue - Insurance (earned revenue recognized)
   */
  public recordInsuranceDeposit(params: {
    practiceId: string;
    payerName: string;
    claimId: string;
    depositAmountCents: number;
    traceId?: string;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `EFT Remittance Deposit: ${params.payerName} - Claim ${params.claimId}`,
      referenceType: 'insurance_remittance',
      referenceId: params.claimId,
      lines: [
        {
          accountCode: '1010',
          type: 'DEBIT',
          amountCents: params.depositAmountCents,
          memo: `Operating deposit for claim ${params.claimId} (${params.payerName})`,
        },
        {
          accountCode: '4010',
          type: 'CREDIT',
          amountCents: params.depositAmountCents,
          memo: `Revenue recognition for claim ${params.claimId}`,
        },
      ],
    });
  }

  /**
   * 2. Patient Private-Pay Card Settlement
   * Debit: 1010 Operating Checking (cash received)
   * Credit: 4020 Practice Revenue - Private Pay
   */
  public recordPrivatePaySettlement(params: {
    practiceId: string;
    clientName: string;
    chargeId: string;
    amountCents: number;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `Private-Pay Card Settlement: ${params.clientName} (Charge ${params.chargeId})`,
      referenceType: 'private_pay_settlement',
      referenceId: params.chargeId,
      lines: [
        {
          accountCode: '1010',
          type: 'DEBIT',
          amountCents: params.amountCents,
          memo: `Card deposit for ${params.clientName}`,
        },
        {
          accountCode: '4020',
          type: 'CREDIT',
          amountCents: params.amountCents,
          memo: `Earned private pay revenue for charge ${params.chargeId}`,
        },
      ],
    });
  }

  /**
   * 3. Clinician Compensation Accrual
   * Debit: 5010 Clinician Compensation Expense
   * Credit: 2010 Clinician Compensation Payable
   */
  public recordClinicianCompAccrual(params: {
    practiceId: string;
    workerId: string;
    workerName: string;
    encounterId: string;
    compAmountCents: number;
    memo?: string;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `Compensation Accrual: ${params.workerName} for Encounter ${params.encounterId}`,
      referenceType: 'compensation_accrual',
      referenceId: params.encounterId,
      lines: [
        {
          accountCode: '5010',
          type: 'DEBIT',
          amountCents: params.compAmountCents,
          memo: params.memo || `Compensation expense for ${params.workerName}`,
        },
        {
          accountCode: '2010',
          type: 'CREDIT',
          amountCents: params.compAmountCents,
          memo: `Payable liability to ${params.workerName}`,
        },
      ],
    });
  }

  /**
   * 4. Automated Tax Reserve Transfer (25% set-aside)
   * Transfer between internal bank vaults:
   * Debit: 1020 Tax Reserve Vault (reserve increased)
   * Credit: 1010 Operating Checking (operating cash decreased)
   * Net practice cash change: $0.00
   */
  public recordTaxReserveTransfer(params: {
    practiceId: string;
    referenceId: string;
    amountCents: number;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `Automated Tax Set-Aside Transfer (25% Practice Share) ref: ${params.referenceId}`,
      referenceType: 'tax_reserve_transfer',
      referenceId: params.referenceId,
      lines: [
        {
          accountCode: '1020',
          type: 'DEBIT',
          amountCents: params.amountCents,
          memo: 'Deposit to automated tax reserve vault',
        },
        {
          accountCode: '1010',
          type: 'CREDIT',
          amountCents: params.amountCents,
          memo: 'Disbursement from operating checking for tax set-aside',
        },
      ],
    });
  }

  /**
   * 5. Payroll Direct Deposit Funding
   * Debit: 2010 Clinician Compensation Payable (liability extinguished)
   * Credit: 1010 Operating Checking (or 1030 Payroll Clearing)
   */
  public recordPayrollFunding(params: {
    practiceId: string;
    payrollRunId: string;
    netCompCents: number;
    employerTaxesCents?: number;
  }): JournalEntry {
    const lines: JournalLine[] = [
      {
        accountCode: '2010',
        type: 'DEBIT',
        amountCents: params.netCompCents,
        memo: `Extinguish compensation payable for run ${params.payrollRunId}`,
      },
    ];

    let totalFunding = params.netCompCents;

    if (params.employerTaxesCents && params.employerTaxesCents > 0) {
      lines.push({
        accountCode: '5020',
        type: 'DEBIT',
        amountCents: params.employerTaxesCents,
        memo: `Employer payroll taxes for run ${params.payrollRunId}`,
      });
      totalFunding += params.employerTaxesCents;
    }

    lines.push({
      accountCode: '1010',
      type: 'CREDIT',
      amountCents: totalFunding,
      memo: `ACH debit for payroll funding run ${params.payrollRunId}`,
    });

    return this.postEntry({
      practiceId: params.practiceId,
      description: `Payroll Direct Deposit & Tax Funding Run ${params.payrollRunId}`,
      referenceType: 'payroll_funding',
      referenceId: params.payrollRunId,
      lines,
    });
  }

  /**
   * 6. Patient Refund Workflow
   * Debit: 4020 Practice Revenue - Private Pay (revenue reversed)
   * Credit: 1010 Operating Checking (cash refunded)
   */
  public recordRefund(params: {
    practiceId: string;
    clientName: string;
    refundId: string;
    originalChargeId: string;
    amountCents: number;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `Patient Refund: ${params.clientName} (Charge ${params.originalChargeId})`,
      referenceType: 'refund',
      referenceId: params.refundId,
      lines: [
        {
          accountCode: '4020',
          type: 'DEBIT',
          amountCents: params.amountCents,
          memo: `Revenue reversal for refund ${params.refundId}`,
        },
        {
          accountCode: '1010',
          type: 'CREDIT',
          amountCents: params.amountCents,
          memo: `Cash disbursement to patient ${params.clientName}`,
        },
      ],
    });
  }

  /**
   * 7. Merchant Chargeback / Dispute Workflow
   * Debit: 2050 Refund & Chargeback Clearing
   * Credit: 1010 Operating Checking
   */
  public recordChargeback(params: {
    practiceId: string;
    disputeId: string;
    chargeId: string;
    amountCents: number;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `Merchant Card Chargeback Dispute: ${params.disputeId} on ${params.chargeId}`,
      referenceType: 'chargeback',
      referenceId: params.disputeId,
      lines: [
        {
          accountCode: '2050',
          type: 'DEBIT',
          amountCents: params.amountCents,
          memo: `Disputed funds held in clearing`,
        },
        {
          accountCode: '1010',
          type: 'CREDIT',
          amountCents: params.amountCents,
          memo: `Merchant account debit for disputed charge`,
        },
      ],
    });
  }

  /**
   * 8. Reversal of Erroneous Transaction
   * Generates exact inverse entries of the original journal entry.
   */
  public recordReversal(originalEntryId: string, reason: string): JournalEntry {
    const original = this.entries.find((e) => e.id === originalEntryId || e.referenceId === originalEntryId);
    if (!original) {
      throw new Error(`Original journal entry not found for reversal: ${originalEntryId}`);
    }

    const inverseLines: JournalLine[] = original.lines.map((line) => ({
      accountCode: line.accountCode,
      type: line.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amountCents: line.amountCents,
      memo: `REVERSAL of ${original.entryNumber}: ${line.memo || reason}`,
    }));

    return this.postEntry({
      practiceId: original.practiceId,
      description: `REVERSAL of ${original.entryNumber} (${original.description}) - Reason: ${reason}`,
      referenceType: 'journal_reversal',
      referenceId: original.entryNumber,
      lines: inverseLines,
    });
  }

  /**
   * 9. Failed ACH Debit Workflow
   * If payroll ACH funding fails, restore funds to Operating Checking and reinstate Compensation Payable.
   */
  public recordFailedAch(params: {
    practiceId: string;
    payrollRunId: string;
    amountCents: number;
    reason: string;
  }): JournalEntry {
    return this.postEntry({
      practiceId: params.practiceId,
      description: `ACH Return / Funding Failed: Run ${params.payrollRunId} (${params.reason})`,
      referenceType: 'failed_ach',
      referenceId: params.payrollRunId,
      lines: [
        {
          accountCode: '1010',
          type: 'DEBIT',
          amountCents: params.amountCents,
          memo: `Returned funds re-credited to operating checking`,
        },
        {
          accountCode: '2010',
          type: 'CREDIT',
          amountCents: params.amountCents,
          memo: `Reinstated clinician compensation payable due to returned ACH`,
        },
      ],
    });
  }

  // ==========================================================================
  // Invariant & Reporting Queries (Derived Solely From Journal)
  // ==========================================================================

  /**
   * Derive account balance from all journal entries.
   * ASSET & EXPENSE normal balance: SUM(DEBIT) - SUM(CREDIT)
   * LIABILITY, EQUITY, REVENUE normal balance: SUM(CREDIT) - SUM(DEBIT)
   */
  public getAccountBalanceCents(accountCode: string): number {
    const meta = STANDARD_CHART_OF_ACCOUNTS[accountCode];
    if (!meta) throw new Error(`Account code ${accountCode} not recognized in chart of accounts.`);

    let debits = 0;
    let credits = 0;

    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.accountCode === accountCode) {
          if (line.type === 'DEBIT') debits += line.amountCents;
          else if (line.type === 'CREDIT') credits += line.amountCents;
        }
      }
    }

    if (meta.normalBalance === 'DEBIT') {
      return debits - credits;
    } else {
      return credits - debits;
    }
  }

  public getAccountBalanceDollars(accountCode: string): number {
    return this.getAccountBalanceCents(accountCode) / 100;
  }

  /**
   * Verifies the fundamental accounting equation:
   * Total Debits == Total Credits across the entire historical journal.
   */
  public verifyGlobalLedgerBalance(): { isBalanced: boolean; totalDebits: number; totalCredits: number; diff: number } {
    let globalDebits = 0;
    let globalCredits = 0;

    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.type === 'DEBIT') globalDebits += line.amountCents;
        if (line.type === 'CREDIT') globalCredits += line.amountCents;
      }
    }

    return {
      isBalanced: globalDebits === globalCredits,
      totalDebits: globalDebits,
      totalCredits: globalCredits,
      diff: globalDebits - globalCredits,
    };
  }

  public getAllEntries(): JournalEntry[] {
    return [...this.entries];
  }
}
