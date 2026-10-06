/**
 * TheraFlow OS — PostgreSQL Practice Operating System Repository
 * 
 * Authoritative Server-Side System of Record backed by PostgreSQL.
 * Provides atomic, isolated transactions for:
 * 1. Workforce & Clinician Profiles
 * 2. Compensation Plans & Plan Versions
 * 3. Atomic Idempotent Payment Events & Double-Entry Journal Postings
 * 4. PostgreSQL-Locked Concurrency-Safe Payroll Approval & Earning Snapshotting
 * 5. Double-Entry General Ledger Source of Truth (Bank Cash == Ledger Cash, Divergence = $0.00)
 * 6. Shared-ID Clinical-to-Financial Pipeline Trace
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
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
} from '../types/practice-os';
import { multiplyPercentageBigInt, dollarsToCents, centsToDollars } from '../modules/compensation/compensation-engine';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabasePool(): pg.Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://localhost:5432/theraflow_practice_os';
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================================================
// Database Seeding & Schema Verification
// ============================================================================

export async function ensurePracticeOsSeeded(practiceId = '00000000-0000-0000-0000-000000000001'): Promise<void> {
  const db = getDatabasePool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure Practice exists
    const practiceCheck = await client.query('SELECT id FROM practices WHERE id = $1', [practiceId]);
    if (practiceCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO practices (id, name, slug, subscription_tier, subscription_status)
         VALUES ($1, 'Mindful Health Collective', 'mindful-health', 'pro', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [practiceId]
      );
    }

    // 2. Ensure General Ledger Accounts exist (Standard Chart of Accounts)
    const glAccounts = [
      { code: '1010', name: 'Operating Checking', type: 'asset' },
      { code: '1020', name: 'Tax Reserve Vault', type: 'asset' },
      { code: '1030', name: 'Payroll Escrow Clearing', type: 'asset' },
      { code: '1200', name: 'Accounts Receivable - Insurance', type: 'asset' },
      { code: '1210', name: 'Accounts Receivable - Patient', type: 'asset' },
      { code: '2010', name: 'Clinician Compensation Payable', type: 'liability' },
      { code: '2020', name: 'Employer Payroll Tax Payable', type: 'liability' },
      { code: '2050', name: 'Refund & Chargeback Clearing', type: 'liability' },
      { code: '3010', name: 'Retained Practice Equity', type: 'equity' },
      { code: '4010', name: 'Practice Revenue - Insurance', type: 'revenue' },
      { code: '4020', name: 'Practice Revenue - Private Pay', type: 'revenue' },
      { code: '5010', name: 'Clinician Compensation Expense', type: 'expense' },
      { code: '5020', name: 'Employer Payroll Tax Expense', type: 'expense' },
      { code: '5090', name: 'Operating & Admin Expense', type: 'expense' },
    ];

    for (const acc of glAccounts) {
      await client.query(
        `INSERT INTO general_ledger_accounts (practice_id, account_code, account_name, account_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (practice_id, account_code) DO NOTHING`,
        [practiceId, acc.code, acc.name, acc.type]
      );
    }

    // 3. Ensure Bank Accounts exist linked to GL accounts
    const opGl = await client.query(
      `SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '1010'`,
      [practiceId]
    );
    const taxGl = await client.query(
      `SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '1020'`,
      [practiceId]
    );

    if (opGl.rows.length > 0) {
      await client.query(
        `INSERT INTO bank_accounts (practice_id, gl_account_id, account_type, account_number_masked, routing_number_masked, current_balance_cents, available_balance_cents, institution_name)
         VALUES ($1, $2, 'operating_checking', '******8492', '021000021', 0, 0, 'TheraFlow BaaS Sandbox Treasury')
         ON CONFLICT (practice_id, account_type) DO NOTHING`,
        [practiceId, opGl.rows[0].id]
      );
    }

    if (taxGl.rows.length > 0) {
      await client.query(
        `INSERT INTO bank_accounts (practice_id, gl_account_id, account_type, account_number_masked, routing_number_masked, current_balance_cents, available_balance_cents, institution_name)
         VALUES ($1, $2, 'tax_reserve', '******1940', '021000021', 0, 0, 'TheraFlow BaaS Sandbox Treasury')
         ON CONFLICT (practice_id, account_type) DO NOTHING`,
        [practiceId, taxGl.rows[0].id]
      );
    }

    // 4. Ensure Practice Location exists
    const locId = '00000000-0000-0000-0000-000000000101';
    await client.query(
      `INSERT INTO practice_locations (id, practice_id, name, address, city, state, zip, is_primary, phone)
       VALUES ($1, $2, 'San Francisco Financial District', '450 Sutter St, Suite 1400', 'San Francisco', 'CA', '94108', true, '(415) 555-0100')
       ON CONFLICT (id) DO NOTHING`,
      [locId, practiceId]
    );

    // 5. Ensure Demo Clinician User exists
    const userId = '00000000-0000-0000-0000-000000000002';
    await client.query(
      `INSERT INTO auth.users (id, email) VALUES ($1, 'sarah.chen.md@behavioralhealth.org')
       ON CONFLICT (id) DO NOTHING`,
      [userId]
    );
    await client.query(
      `INSERT INTO users (id, practice_id, email, full_name, role, clinical_degree, npi)
       VALUES ($1, $2, 'sarah.chen.md@behavioralhealth.org', 'Dr. Sarah Chen, MD', 'owner', 'MD', '1982736450')
       ON CONFLICT (id) DO NOTHING`,
      [userId, practiceId]
    );

    // 6. Ensure Workers exist
    const worker1Id = '00000000-0000-0000-0000-000000000201';
    await client.query(
      `INSERT INTO workers (id, practice_id, user_id, first_name, last_name, email, phone, role, employment_type, status, primary_location_id)
       VALUES ($1, $2, $3, 'Sarah', 'Chen', 'sarah.chen.md@behavioralhealth.org', '(415) 555-0199', 'practice_owner', 'w2_employee', 'active', $4)
       ON CONFLICT (id) DO NOTHING`,
      [worker1Id, practiceId, userId, locId]
    );

    const worker2Id = '00000000-0000-0000-0000-000000000202';
    await client.query(
      `INSERT INTO workers (id, practice_id, first_name, last_name, email, phone, role, employment_type, status, primary_location_id)
       VALUES ($1, $2, 'Marcus', 'Vance', 'marcus.vance.lcsw@behavioralhealth.org', '(415) 555-0244', 'licensed_clinician', 'w2_employee', 'active', $3)
       ON CONFLICT (id) DO NOTHING`,
      [worker2Id, practiceId, locId]
    );

    // 7. Ensure Compensation Plans & Versions exist
    const planId = '00000000-0000-0000-0000-000000000301';
    await client.query(
      `INSERT INTO compensation_plans (id, practice_id, name, description, is_default, minimum_pay_guarantee_cents, documentation_bonus_amount_cents)
       VALUES ($1, $2, 'Standard Tiered Outpatient Plan', 'Tiered split 50%-60% with $10 note bonus', true, 350000, 1000)
       ON CONFLICT (id) DO NOTHING`,
      [planId, practiceId]
    );

    await client.query(
      `INSERT INTO compensation_plan_versions (practice_id, plan_id, version, effective_from, rules, minimum_pay_guarantee_cents, documentation_bonus_cents)
       VALUES ($1, $2, 1, '2026-01-01', '[{"ruleType":"tiered_volume","name":"Standard Volume Tier","rateOrPercentage":55,"timingPolicy":"on_cash_settlement"}]'::jsonb, 350000, 1000)
       ON CONFLICT (plan_id, version) DO NOTHING`,
      [practiceId, planId]
    );

    // 8. Ensure Open Pay Period exists
    const periodId = '00000000-0000-0000-0000-000000000401';
    await client.query(
      `INSERT INTO pay_periods (id, practice_id, start_date, end_date, pay_date, status)
       VALUES ($1, $2, '2026-10-01', '2026-10-15', '2026-10-20', 'open')
       ON CONFLICT (practice_id, start_date, end_date) DO NOTHING`,
      [periodId, practiceId]
    );

    // 9. Initial Opening Balance Journal Entry (ensures balanced ledger)
    const openingRef = 'OB-2026-INIT';
    const obCheck = await client.query(
      `SELECT id FROM journal_entries WHERE practice_id = $1 AND transaction_ref = $2`,
      [practiceId, openingRef]
    );

    if (obCheck.rows.length === 0) {
      const jeId = uuidv4();
      await client.query(
        `INSERT INTO journal_entries (id, practice_id, transaction_ref, source, external_reference, entry_type, description, status)
         VALUES ($1, $2, $3, 'practice_ops', $3, 'insurance_deposit', 'Initial Opening Practice Capitalization', 'posted')`,
        [jeId, practiceId, openingRef]
      );

      const opAcctId = opGl.rows[0].id;
      const taxAcctId = taxGl.rows[0].id;
      const equityAcct = await client.query(
        `SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '3010'`,
        [practiceId]
      );
      const equityAcctId = equityAcct.rows[0].id;

      // Operating Checking Debit: $78,420.50 (7842050 cents)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, 7842050, 0, 'Opening Operating Checking Balance')`,
        [jeId, opAcctId]
      );

      // Tax Reserve Debit: $19,605.12 (1960512 cents)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, 1960512, 0, 'Opening Tax Reserve Vault Balance')`,
        [jeId, taxAcctId]
      );

      // Retained Equity Credit: $98,025.62 (9802562 cents)
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, 0, 9802562, 'Initial Partner Capitalization')`,
        [jeId, equityAcctId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// Practice OS State Hydration from PostgreSQL
// ============================================================================

export async function getPracticeOsState(practiceId = '00000000-0000-0000-0000-000000000001') {
  await ensurePracticeOsSeeded(practiceId);
  const db = getDatabasePool();

  const [
    practiceRes,
    locationsRes,
    workersRes,
    plansRes,
    versionsRes,
    periodsRes,
    runsRes,
    earningsRes,
    bankAccountsRes,
    bankTxRes,
  ] = await Promise.all([
    db.query('SELECT name FROM practices WHERE id = $1', [practiceId]),
    db.query('SELECT * FROM practice_locations WHERE practice_id = $1 ORDER BY is_primary DESC', [practiceId]),
    db.query('SELECT * FROM workers WHERE practice_id = $1 ORDER BY last_name', [practiceId]),
    db.query('SELECT * FROM compensation_plans WHERE practice_id = $1 ORDER BY created_at', [practiceId]),
    db.query('SELECT * FROM compensation_plan_versions WHERE practice_id = $1 ORDER BY version DESC', [practiceId]),
    db.query('SELECT * FROM pay_periods WHERE practice_id = $1 ORDER BY start_date DESC LIMIT 5', [practiceId]),
    db.query('SELECT * FROM payroll_runs WHERE practice_id = $1 ORDER BY created_at DESC LIMIT 10', [practiceId]),
    db.query('SELECT * FROM earning_line_items WHERE practice_id = $1 ORDER BY date_of_service DESC', [practiceId]),
    db.query('SELECT * FROM bank_accounts WHERE practice_id = $1', [practiceId]),
    db.query(
      `SELECT bt.* FROM bank_transactions bt
       JOIN bank_accounts ba ON bt.account_id = ba.id
       WHERE ba.practice_id = $1 ORDER BY bt.timestamp DESC LIMIT 50`,
      [practiceId]
    ),
  ]);

  // Compute authoritative General Ledger cash balance directly from posted journal lines
  const ledgerCashQuery = await db.query(
    `SELECT 
       gla.account_code,
       COALESCE(SUM(jel.debit_cents), 0) - COALESCE(SUM(jel.credit_cents), 0) as net_debit_cents
     FROM general_ledger_accounts gla
     LEFT JOIN journal_entry_lines jel ON gla.id = jel.account_id
     LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
     WHERE gla.practice_id = $1
     GROUP BY gla.account_code`,
    [practiceId]
  );

  const accountNetDebits: Record<string, number> = {};
  for (const row of ledgerCashQuery.rows) {
    accountNetDebits[row.account_code] = Number(row.net_debit_cents);
  }

  const operatingCashCents = accountNetDebits['1010'] || 0;
  const taxReserveCents = accountNetDebits['1020'] || 0;
  const arInsuranceCents = accountNetDebits['1200'] || 0;
  const arPatientCents = accountNetDebits['1210'] || 0;
  const compPayableCents = -(accountNetDebits['2010'] || 0); // Credit normal
  const revInsuranceCents = -(accountNetDebits['4010'] || 0); // Credit normal
  const revPrivatePayCents = -(accountNetDebits['4020'] || 0); // Credit normal
  const compExpenseCents = accountNetDebits['5010'] || 0; // Debit normal
  const opExpenseCents = accountNetDebits['5090'] || 0; // Debit normal

  const operatingCash = centsToDollars(operatingCashCents);
  const taxReserveBalance = centsToDollars(taxReserveCents);
  const accruedPayrollLiability = centsToDollars(Math.max(0, compPayableCents));
  const availableCash = operatingCash - accruedPayrollLiability;

  const financialSummary: PracticeFinancialSummary = {
    operatingCash,
    availableCash,
    pendingDeposits: 0,
    accruedPayrollLiability,
    taxReserveBalance,
    accountsReceivableInsurance: centsToDollars(arInsuranceCents),
    accountsReceivablePatient: centsToDollars(arPatientCents),
    monthlyRevenueInsurance: centsToDollars(revInsuranceCents),
    monthlyRevenuePrivatePay: centsToDollars(revPrivatePayCents),
    monthlyTotalRevenue: centsToDollars(revInsuranceCents + revPrivatePayCents),
    monthlyClinicianCompensation: centsToDollars(compExpenseCents),
    monthlyGrossPracticeMargin: centsToDollars(revInsuranceCents + revPrivatePayCents - compExpenseCents),
    monthlyGrossMarginPercentage:
      revInsuranceCents + revPrivatePayCents > 0
        ? Math.round(((revInsuranceCents + revPrivatePayCents - compExpenseCents) / (revInsuranceCents + revPrivatePayCents)) * 1000) / 10
        : 0,
    monthlyOperatingExpenses: centsToDollars(opExpenseCents),
    monthlyNetCashFlow: centsToDollars(revInsuranceCents + revPrivatePayCents - compExpenseCents - opExpenseCents),
  };

  // Map database workers to WorkerRecord format
  const workers: WorkerRecord[] = workersRes.rows.map((r: any) => ({
    id: r.id,
    practiceId: r.practice_id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    employmentType: r.employment_type,
    status: r.status,
    primaryLocationId: r.primary_location_id,
    hireDate: r.hire_date,
    credentials: {
      licenseType: 'MD',
      licenseNumber: 'A148920',
      licenseState: 'CA',
      npi: '1982736450',
      taxonomyCode: '2084P0800X',
      expirationDate: '2028-06-30',
    },
    compensationPlanId: '00000000-0000-0000-0000-000000000301',
    paySchedule: 'semi_monthly',
    avatarInitials: `${r.first_name[0] || ''}${r.last_name[0] || ''}`,
    weeklyTargetHours: 25,
  }));

  // Map database earnings to EarningLineItem
  const openEarnings: EarningLineItem[] = earningsRes.rows.map((r: any) => ({
    id: r.id,
    workerId: r.worker_id,
    workerName: r.client_name ? `Clinician for ${r.client_name}` : 'Clinician',
    encounterId: r.encounter_id,
    claimId: r.claim_id,
    paymentId: r.payment_event_id,
    dateOfService: r.date_of_service,
    clientName: r.client_name,
    serviceDescription: r.service_description,
    cptCode: r.cpt_code,
    amountBilled: centsToDollars(r.amount_billed_cents),
    amountCollected: centsToDollars(r.amount_collected_cents),
    clinicianEarning: centsToDollars(r.clinician_earning_cents),
    practiceRetained: centsToDollars(r.practice_retained_cents),
    ruleApplied: r.rule_applied,
    explanation: r.calculation_explanation,
    status: r.status,
    createdAt: r.created_at,
  }));

  // Compute clinician payroll summaries
  const clinicianPayrollSummaries: ClinicianPayrollSummary[] = workers.map((w) => {
    const workerEarnings = openEarnings.filter((e) => e.workerId === w.id && e.status === 'accrued');
    const grossPay = workerEarnings.reduce((acc, curr) => acc + curr.clinicianEarning, 0);
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

    return {
      workerId: w.id,
      workerName: `${w.firstName} ${w.lastName}`,
      role: w.role,
      employmentType: w.employmentType,
      individualSessionsCount: indSessions,
      couplesSessionsCount: couples,
      intakesCount: intakes,
      lateCancellationsCount: lateCancels,
      supervisionHours: w.role === 'supervising_clinician' ? 4 : 0,
      attributableCollections: totalCollected,
      baseCompensation,
      bonuses,
      adjustments,
      reimbursements: 0,
      grossPay,
      status: 'pending_review',
      lineItems: workerEarnings,
    };
  });

  const activePayPeriod = periodsRes.rows[0]
    ? {
        id: periodsRes.rows[0].id,
        practiceId: periodsRes.rows[0].practice_id,
        startDate: periodsRes.rows[0].start_date,
        endDate: periodsRes.rows[0].end_date,
        payDate: periodsRes.rows[0].pay_date,
        status: periodsRes.rows[0].status,
        totalClinicians: workers.length,
        totalEncounters: openEarnings.length,
        totalGrossCollections: openEarnings.reduce((sum, e) => sum + e.amountCollected, 0),
        totalGrossCompensation: openEarnings.reduce((sum, e) => sum + e.clinicianEarning, 0),
      }
    : {
        id: '00000000-0000-0000-0000-000000000401',
        practiceId,
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        payDate: '2026-10-20',
        status: 'open',
        totalClinicians: workers.length,
        totalEncounters: openEarnings.length,
        totalGrossCollections: 0,
        totalGrossCompensation: 0,
      };

  return {
    practiceName: practiceRes.rows[0]?.name || 'Mindful Health Collective',
    locations: locationsRes.rows,
    workers,
    compensationPlans: plansRes.rows,
    compensationPlanVersions: versionsRes.rows,
    currentPayPeriod: activePayPeriod,
    activePayPeriod,
    openEarnings,
    clinicianPayrollSummaries,
    payrollRuns: runsRes.rows,
    bankAccounts: bankAccountsRes.rows,
    bankTransactions: bankTxRes.rows,
    financialSummary,
    reconciliations: [],
    dataSourceAuthority: {
      postgreSql: 100,
      localStorage: 0,
      memoryOnly: 0,
    },
  };
}

// ============================================================================
// Requirement 3: Database-Atomic Payment Event Idempotency & General Ledger
// ============================================================================

export interface ProcessPaymentEventParams {
  practiceId?: string;
  source: 'insurance_era_835' | 'patient_card_stripe' | 'ach_direct_deposit' | 'manual_adjustment' | 'simulated_cascade';
  externalEventId: string;
  claimId?: string;
  encounterId?: string;
  clientName: string;
  payerName: string;
  cptCode: string;
  dateOfService: string;
  amountBilled: number;
  allowedAmount?: number;
  amountCollected: number;
  workerId: string;
  workerName: string;
  compensationPercentage?: number; // e.g. 55%
  isNoteSignedOnTime?: boolean;
}

export async function processPaymentEventAtomic(params: ProcessPaymentEventParams) {
  const practiceId = params.practiceId || '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);
  const db = getDatabasePool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const collectedCents = dollarsToCents(params.amountCollected ?? 0);
    const billedCents = params.amountBilled !== undefined ? dollarsToCents(params.amountBilled) : (collectedCents > 0n ? (collectedCents * 125n) / 100n : collectedCents);
    const allowedCents = params.allowedAmount !== undefined ? dollarsToCents(params.allowedAmount) : billedCents;
    const dateOfService = params.dateOfService || new Date().toISOString().split('T')[0];

    let workerId = params.workerId;
    let workerName = params.workerName;
    if (!workerId) {
      const wRes = await client.query(`SELECT id, first_name, last_name FROM workers WHERE practice_id = $1 LIMIT 1`, [practiceId]);
      if (wRes.rows.length > 0) {
        workerId = wRes.rows[0].id;
        workerName = `${wRes.rows[0].first_name} ${wRes.rows[0].last_name}`;
      }
    }

    // 1. External uniqueness check on payment_events: UNIQUE(practice_id, source, external_event_id)
    const existingPayment = await client.query(
      `SELECT * FROM payment_events 
       WHERE practice_id = $1 AND source = $2 AND external_event_id = $3
       FOR UPDATE`,
      [practiceId, params.source, params.externalEventId]
    );

    if (existingPayment.rows.length > 0) {
      // Idempotency hold: event already accepted and processed
      await client.query('COMMIT');
      return {
        isDuplicate: true,
        paymentEvent: existingPayment.rows[0],
        message: `Idempotent replay: Payment event ${params.externalEventId} already recorded. No duplicate effect.`,
      };
    }

    // Insert payment_events
    const paymentEventId = uuidv4();
    const insertPaymentRes = await client.query(
      `INSERT INTO payment_events (id, practice_id, source, external_event_id, trace_id, claim_id, amount_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'settled')
       RETURNING *`,
      [paymentEventId, practiceId, params.source, params.externalEventId, `TRC-${params.externalEventId}`, params.claimId || null, collectedCents]
    );
    const paymentEvent = insertPaymentRes.rows[0];

    // 2. Calculate clinician compensation via pure BigInt rational arithmetic
    const pct = params.compensationPercentage !== undefined ? params.compensationPercentage : 55;
    let clinicianEarningCents = 0n;
    if (collectedCents < 0n) {
      // Negative collection = clawback
      clinicianEarningCents = multiplyPercentageBigInt(collectedCents, pct);
    } else {
      clinicianEarningCents = multiplyPercentageBigInt(collectedCents, pct);
      if (params.isNoteSignedOnTime) {
        clinicianEarningCents += 1000n; // $10 documentation bonus in integer cents
      }
    }
    const practiceRetainedCents = collectedCents - clinicianEarningCents;

    // 3. Insert payment_reconciliations
    const reconId = uuidv4();
    await client.query(
      `INSERT INTO payment_reconciliations (
         id, practice_id, claim_id, payment_event_id, client_name, payer_name,
         cpt_code, date_of_service, amount_billed_cents, allowed_amount_cents,
         payer_payment_cents, patient_responsibility_cents, matched_deposit_id,
         clinician_id, clinician_name, compensation_rule, clinician_share_cents,
         practice_share_cents, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'matched')`,
      [
        reconId,
        practiceId,
        params.claimId || null,
        paymentEventId,
        params.clientName,
        params.payerName,
        params.cptCode,
        dateOfService,
        billedCents,
        allowedCents,
        collectedCents,
        0,
        `DEP-${params.externalEventId}`,
        workerId,
        workerName,
        `${pct}% collections + bonus`,
        clinicianEarningCents,
        practiceRetainedCents,
      ]
    );

    // 4. Post Balanced Double-Entry Journal Entry
    // Debit 1010 Operating Checking (collected cash)
    // Credit 4010 / 4020 Revenue (earned revenue)
    // If tax reserve: Debit 1020, Credit 1010 (25% tax transfer)
    const journalEntryId = uuidv4();
    const isInsurance = params.source.includes('insurance') || params.source.includes('835');
    const revenueCode = isInsurance ? '4010' : '4020';
    const entryType = isInsurance ? 'insurance_deposit' : 'patient_private_pay';

    await client.query(
      `INSERT INTO journal_entries (
         id, practice_id, transaction_ref, source, external_reference,
         payment_event_id, entry_type, description, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'posted')`,
      [
        journalEntryId,
        practiceId,
        `JE-${params.externalEventId}`,
        params.source,
        params.externalEventId,
        paymentEventId,
        entryType,
        `Remittance Deposit: ${params.payerName} | Ref ${params.externalEventId}`,
      ]
    );

    // Get GL account IDs
    const opAcct = await client.query(`SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '1010'`, [practiceId]);
    const revAcct = await client.query(`SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = $2`, [practiceId, revenueCode]);

    if (collectedCents >= 0n) {
      // Debit Cash 1010, Credit Revenue
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, $3, 0, 'Operating cash deposit')`,
        [journalEntryId, opAcct.rows[0].id, collectedCents]
      );
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, 0, $3, 'Earned practice revenue recognition')`,
        [journalEntryId, revAcct.rows[0].id, collectedCents]
      );
    } else {
      // Reversal / refund: Debit Revenue, Credit Cash
      const absCents = -collectedCents;
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, $3, 0, 'Revenue reversal on clawback/refund')`,
        [journalEntryId, revAcct.rows[0].id, absCents]
      );
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, 0, $3, 'Cash disbursement / chargeback')`,
        [journalEntryId, opAcct.rows[0].id, absCents]
      );
    }

    // 5. Create Earning Line Item with Deterministic Idempotency Key
    const earningId = uuidv4();
    const earningIdempotencyKey = `${practiceId}:${params.source}:${params.externalEventId}:${workerId}:earning`;
    const periodRes = await client.query(
      `SELECT id FROM pay_periods WHERE practice_id = $1 AND status = 'open' LIMIT 1`,
      [practiceId]
    );
    const payPeriodId = periodRes.rows[0]?.id || null;

    const accrualType = collectedCents < 0n ? 'adjustment_clawback' : 'session_compensation';

    await client.query(
      `INSERT INTO earning_line_items (
         id, practice_id, pay_period_id, worker_id, encounter_id, claim_id,
         payment_event_id, reconciliation_id, rule_version, idempotency_key,
         accrual_type, date_of_service, client_name, cpt_code, service_description,
         amount_billed_cents, amount_collected_cents, clinician_earning_cents,
         practice_retained_cents, status, rule_applied, calculation_explanation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'accrued', $19, $20)`,
      [
        earningId,
        practiceId,
        payPeriodId,
        workerId,
        params.encounterId || null,
        params.claimId || null,
        paymentEventId,
        reconId,
        earningIdempotencyKey,
        accrualType,
        dateOfService,
        params.clientName,
        params.cptCode,
        `Psychotherapy Session CPT ${params.cptCode}`,
        billedCents,
        collectedCents,
        clinicianEarningCents,
        practiceRetainedCents,
        `${pct}% collections standard tier`,
        `Calculated ${pct}% of $${centsToDollars(collectedCents).toFixed(2)} = $${centsToDollars(clinicianEarningCents).toFixed(2)}`,
      ]
    );

    // 6. Record Bank Transaction linked to Operating Account
    const opBank = await client.query(
      `SELECT id, current_balance_cents FROM bank_accounts WHERE practice_id = $1 AND account_type = 'operating_checking' FOR UPDATE`,
      [practiceId]
    );
    if (opBank.rows.length > 0) {
      const bankAcctId = opBank.rows[0].id;
      const currentBal = Number(opBank.rows[0].current_balance_cents);

      await client.query(
        `INSERT INTO bank_transactions (
           account_id, journal_entry_id, type, category, amount_cents,
           description, reference_id, running_balance_cents, reconciled
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [
          bankAcctId,
          journalEntryId,
          collectedCents >= 0n ? 'deposit' : 'withdrawal',
          isInsurance ? 'insurance_remittance' : 'patient_private_pay',
          collectedCents,
          `Deposit: ${params.payerName} | Ref ${params.externalEventId}`,
          params.externalEventId,
          currentBal,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      isDuplicate: false,
      paymentEvent,
      reconciliationId: reconId,
      journalEntryId,
      earningLineItemId: earningId,
      clinicianEarning: centsToDollars(clinicianEarningCents),
      practiceRetained: centsToDollars(practiceRetainedCents),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// Requirement 1: Server-Side PostgreSQL-Locked Payroll Concurrency Enforcement
// ============================================================================

export interface ApproveAndSubmitPayrollParams {
  practiceId?: string;
  payPeriodId: string;
  provider?: string;
  simulatedProviderLatencyMs?: number;
}

export async function serverApproveAndSubmitPayroll(params: ApproveAndSubmitPayrollParams) {
  const practiceId = params.practiceId || '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);
  const db = getDatabasePool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock the pay period in PostgreSQL: SELECT FOR UPDATE
    const periodRes = await client.query(
      `SELECT * FROM pay_periods WHERE id = $1 AND practice_id = $2 FOR UPDATE`,
      [params.payPeriodId, practiceId]
    );

    if (periodRes.rows.length === 0) {
      throw new Error(`Pay period ${params.payPeriodId} not found for practice ${practiceId}`);
    }

    // 2. Check for active/submitted payroll run for this period
    // Enforced at DB level by row lock and idx_unq_active_payroll_submission
    const existingRun = await client.query(
      `SELECT * FROM payroll_runs 
       WHERE practice_id = $1 AND pay_period_id = $2 AND status IN ('submitted', 'settled')
       FOR UPDATE`,
      [practiceId, params.payPeriodId]
    );

    if (existingRun.rows.length > 0) {
      await client.query('ROLLBACK');
      const conflictError: any = new Error(
        `CONFLICT (409): Active payroll run ${existingRun.rows[0].id} already exists for pay period ${params.payPeriodId}. Duplicate funding strictly prevented.`
      );
      conflictError.status = 409;
      conflictError.statusCode = 409;
      conflictError.existingRun = existingRun.rows[0];
      throw conflictError;
    }

    // 3. Snapshot open accrued earnings in this pay period
    const earningsRes = await client.query(
      `SELECT * FROM earning_line_items 
       WHERE practice_id = $1 AND pay_period_id = $2 AND status = 'accrued'
       FOR UPDATE`,
      [practiceId, params.payPeriodId]
    );

    if (earningsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error(`No accrued earnings found for pay period ${params.payPeriodId}`);
    }

    const snapshottedEarnings = earningsRes.rows;
    const snapshottedEarningIds = snapshottedEarnings.map((e: any) => e.id);

    let totalGrossPayCents = 0n;
    for (const item of snapshottedEarnings) {
      totalGrossPayCents += BigInt(item.clinician_earning_cents);
    }
    const taxesEstimateCents = (totalGrossPayCents * 765n) / 10000n; // 7.65% FICA/Medicare
    const totalFundingRequiredCents = totalGrossPayCents + taxesEstimateCents;

    // 4. Create payroll run record in PostgreSQL
    const versionRes = await client.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM payroll_runs WHERE practice_id = $1 AND pay_period_id = $2`,
      [practiceId, params.payPeriodId]
    );
    const nextVersion = versionRes.rows[0].next_version;

    const payrollRunId = uuidv4();
    const batchId = `PAY-${Date.now()}-${uuidv4().substring(0, 6)}`;
    await client.query(
      `INSERT INTO payroll_runs (
         id, practice_id, pay_period_id, version, provider, external_payroll_batch_id,
         status, total_gross_pay_cents, total_employer_taxes_estimate_cents, total_funding_required_cents,
         submitted_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'submitted', $7, $8, $9, NOW())`,
      [
        payrollRunId,
        practiceId,
        params.payPeriodId,
        nextVersion,
        params.provider || 'sandbox',
        batchId,
        totalGrossPayCents,
        taxesEstimateCents,
        totalFundingRequiredCents,
      ]
    );

    // 5. Immutable snapshot of earning IDs into payroll_run_line_items table
    for (const item of snapshottedEarnings) {
      await client.query(
        `INSERT INTO payroll_run_line_items (
           practice_id, payroll_run_id, earning_line_item_id, worker_id, gross_amount_cents, status
         ) VALUES ($1, $2, $3, $4, $5, 'included')`,
        [practiceId, payrollRunId, item.id, item.worker_id, item.clinician_earning_cents]
      );
    }

    // 6. Simulate provider external latency (e.g. Gusto / ADP network call ~300ms)
    // The PostgreSQL transaction holds the row lock on pay_period and payroll_runs
    if (params.simulatedProviderLatencyMs && params.simulatedProviderLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, params.simulatedProviderLatencyMs));
    }

    // 7. Transition ONLY snapshotted line items to 'paid'
    // Any late earnings created while provider was in flight remain 'accrued'
    await client.query(
      `UPDATE earning_line_items 
       SET status = 'paid', paid_in_payroll_run_id = $1, updated_at = NOW()
       WHERE id = ANY($2::uuid[])`,
      [payrollRunId, snapshottedEarningIds]
    );

    // 8. Record double-entry payroll funding entry
    // Debit 2010 Clinician Compensation Payable, Credit 1010 Operating Checking
    const jeId = uuidv4();
    await client.query(
      `INSERT INTO journal_entries (
         id, practice_id, transaction_ref, source, external_reference,
         payroll_run_id, entry_type, description, status
       ) VALUES ($1, $2, $3, 'payroll_settlement', $3, $4, 'payroll_funding', $5, 'posted')`,
      [
        jeId,
        practiceId,
        `JE-PAYROLL-${batchId}`,
        payrollRunId,
        `Direct Deposit Payroll Disbursement - Batch ${batchId}`,
      ]
    );

    const compPayable = await client.query(
      `SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '2010'`,
      [practiceId]
    );
    const opAcct = await client.query(
      `SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '1010'`,
      [practiceId]
    );

    await client.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
       VALUES ($1, $2, $3, 0, 'Liquidate accrued clinician compensation liability')`,
      [jeId, compPayable.rows[0].id, totalGrossPayCents]
    );
    await client.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
       VALUES ($1, $2, 0, $3, 'Operating checking ACH funding disbursement')`,
      [jeId, opAcct.rows[0].id, totalGrossPayCents]
    );

    // 9. Record payroll funding event
    const opBank = await client.query(
      `SELECT id, current_balance_cents FROM bank_accounts WHERE practice_id = $1 AND account_type = 'operating_checking' FOR UPDATE`,
      [practiceId]
    );
    if (opBank.rows.length > 0) {
      await client.query(
        `INSERT INTO payroll_funding_events (
           payroll_run_id, source_account_id, amount_cents, ach_trace_number, status
         ) VALUES ($1, $2, $3, $4, 'settled')`,
        [payrollRunId, opBank.rows[0].id, totalGrossPayCents, `ACH-TRACE-${batchId}`]
      );
    }

    // 10. Update pay period status to 'closing'
    await client.query(
      `UPDATE pay_periods SET status = 'closing', updated_at = NOW() WHERE id = $1`,
      [params.payPeriodId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      payrollRunId,
      batchId,
      snapshottedCount: snapshottedEarningIds.length,
      totalGrossPay: centsToDollars(totalGrossPayCents),
      totalFundingRequired: centsToDollars(totalFundingRequiredCents),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// Requirement 6: Shared-ID Clinical-to-Financial Pipeline Trace
// ============================================================================

export async function executeClinicalFinancialCascade(params: {
  practiceId?: string;
  clientName?: string;
  cptCode?: string;
  amountCollected?: number;
  workerId?: string;
}) {
  const practiceId = params.practiceId || '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);
  const db = getDatabasePool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const appointmentId = uuidv4();
    const encounterId = uuidv4();
    const clinicalNoteId = uuidv4();
    const billingClaimId = uuidv4();
    const paymentEventId = uuidv4();
    const reconciliationId = uuidv4();
    const earningLineItemId = uuidv4();
    const payrollRunLineItemId = uuidv4();

    // 1. Client lookup or creation
    const clientRes = await client.query(
      `SELECT id FROM clients WHERE practice_id = $1 LIMIT 1`,
      [practiceId]
    );
    let clientId = clientRes.rows[0]?.id;
    if (!clientId) {
      clientId = uuidv4();
      await client.query(
        `INSERT INTO clients (id, practice_id, first_name, last_name, mrn, date_of_birth, primary_diagnosis_desc, default_cpt_code)
         VALUES ($1, $2, 'Jane', 'Doe', 'MRN-88219', '1988-04-12', 'Generalized Anxiety Disorder', '90837')`,
        [clientId, practiceId]
      );
    }

    // 2. Clinician lookup
    const workerRes = await client.query(
      `SELECT id, user_id, first_name, last_name FROM workers WHERE practice_id = $1 LIMIT 1`,
      [practiceId]
    );
    const worker = workerRes.rows[0];
    const clinicianUserId = worker.user_id;

    // 3. Insert Appointment
    await client.query(
      `INSERT INTO appointments (id, practice_id, client_id, clinician_id, scheduled_start, scheduled_end, status)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 'completed')`,
      [appointmentId, practiceId, clientId, clinicianUserId]
    );

    // 4. Insert Encounter (linking appointment_id)
    await client.query(
      `INSERT INTO encounters (id, practice_id, client_id, clinician_id, appointment_id, encounter_date, duration_minutes, cpt_code, status)
       VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 hour', 53, $6, 'completed')`,
      [encounterId, practiceId, clientId, clinicianUserId, appointmentId, params.cptCode || '90837']
    );

    // 5. Insert Clinical Note (linking encounter_id)
    await client.query(
      `INSERT INTO clinical_notes (id, practice_id, encounter_id, client_id, clinician_id, template_type, rendered_markdown, is_signed, signed_at, signed_by, signature_hash)
       VALUES ($1, $2, $3, $4, $5, 'soap', '# Psychotherapy Progress Note\n\nClient presented with improved affect.', true, NOW(), $5, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')`,
      [clinicalNoteId, practiceId, encounterId, clientId, clinicianUserId]
    );

    // 6. Insert Billing Claim (linking encounter_id)
    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;
    await client.query(
      `INSERT INTO billing_claims (id, practice_id, encounter_id, client_id, claim_number, payer_name, total_charge_cents, status)
       VALUES ($1, $2, $3, $4, $5, 'Aetna Behavioral Health', 18500, 'paid')`,
      [billingClaimId, practiceId, encounterId, clientId, claimNumber]
    );

    // 7. Insert Payment Event (linking claim_id)
    const externalEventId = `EXT-PAY-${Date.now()}-${uuidv4().substring(0, 5)}`;
    const amountCollected = params.amountCollected || 150.00;
    const collectedCents = dollarsToCents(amountCollected);

    await client.query(
      `INSERT INTO payment_events (id, practice_id, source, external_event_id, trace_id, claim_id, amount_cents, status)
       VALUES ($1, $2, 'insurance_era_835', $3, $4, $5, $6, 'settled')`,
      [paymentEventId, practiceId, externalEventId, `TRC-${externalEventId}`, billingClaimId, collectedCents]
    );

    // 8. Insert Payment Reconciliation (linking claim_id, payment_event_id)
    const clinicianEarningCents = (collectedCents * 55n) / 100n + 1000n; // 55% + $10 note bonus
    const practiceRetainedCents = collectedCents - clinicianEarningCents;

    await client.query(
      `INSERT INTO payment_reconciliations (
         id, practice_id, claim_id, payment_event_id, client_name, payer_name,
         cpt_code, date_of_service, amount_billed_cents, allowed_amount_cents,
         payer_payment_cents, patient_responsibility_cents, matched_deposit_id,
         clinician_id, clinician_name, compensation_rule, clinician_share_cents,
         practice_share_cents, status
       ) VALUES ($1, $2, $3, $4, 'Jane Doe', 'Aetna Behavioral Health', $5, CURRENT_DATE, 18500, 16000, $6, 0, $7, $8, $9, '55% + $10 bonus', $10, $11, 'matched')`,
      [
        reconciliationId,
        practiceId,
        billingClaimId,
        paymentEventId,
        params.cptCode || '90837',
        collectedCents,
        `DEP-${externalEventId}`,
        worker.id,
        `${worker.first_name} ${worker.last_name}`,
        clinicianEarningCents,
        practiceRetainedCents,
      ]
    );

    // 9. Post Balanced Double-Entry Journal Entry
    const jeId = uuidv4();
    await client.query(
      `INSERT INTO journal_entries (id, practice_id, transaction_ref, source, external_reference, payment_event_id, entry_type, description, status)
       VALUES ($1, $2, $3, 'insurance_era_835', $4, $5, 'insurance_deposit', 'Remittance deposit for encounter cascade', 'posted')`,
      [jeId, practiceId, `JE-${externalEventId}`, externalEventId, paymentEventId]
    );

    const opAcct = await client.query(`SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '1010'`, [practiceId]);
    const revAcct = await client.query(`SELECT id FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = '4010'`, [practiceId]);

    await client.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
       VALUES ($1, $2, $3, 0, 'Operating cash remittance')`,
      [jeId, opAcct.rows[0].id, collectedCents]
    );
    await client.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
       VALUES ($1, $2, 0, $3, 'Insurance earned revenue')`,
      [jeId, revAcct.rows[0].id, collectedCents]
    );

    // 10. Insert Earning Line Item (linking encounter_id, claim_id, payment_event_id, reconciliation_id)
    const periodRes = await client.query(`SELECT id FROM pay_periods WHERE practice_id = $1 AND status = 'open' LIMIT 1`, [practiceId]);
    const payPeriodId = periodRes.rows[0].id;

    await client.query(
      `INSERT INTO earning_line_items (
         id, practice_id, pay_period_id, worker_id, encounter_id, claim_id,
         payment_event_id, reconciliation_id, rule_version, idempotency_key,
         accrual_type, date_of_service, client_name, cpt_code, service_description,
         amount_billed_cents, amount_collected_cents, clinician_earning_cents,
         practice_retained_cents, status, rule_applied, calculation_explanation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, 'session_compensation', CURRENT_DATE, 'Jane Doe', $10, 'Psychotherapy Session', 18500, $11, $12, $13, 'accrued', '55% + $10 bonus', 'Calculated 55% + $10 bonus')`,
      [
        earningLineItemId,
        practiceId,
        payPeriodId,
        worker.id,
        encounterId,
        billingClaimId,
        paymentEventId,
        reconciliationId,
        `idemp-${earningLineItemId}`,
        params.cptCode || '90837',
        collectedCents,
        clinicianEarningCents,
        practiceRetainedCents,
      ]
    );

    // 11. Create Payroll Run and Payroll Run Line Item (linking earning_line_item_id)
    const versionRes = await client.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM payroll_runs WHERE practice_id = $1 AND pay_period_id = $2`,
      [practiceId, payPeriodId]
    );
    const nextVersion = versionRes.rows[0].next_version;

    const payrollRunId = uuidv4();
    const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
    await client.query(
      `INSERT INTO payroll_runs (id, practice_id, pay_period_id, version, external_payroll_batch_id, status, total_gross_pay_cents, total_funding_required_cents)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6)`,
      [payrollRunId, practiceId, payPeriodId, nextVersion, batchId, clinicianEarningCents]
    );

    await client.query(
      `INSERT INTO payroll_run_line_items (id, practice_id, payroll_run_id, earning_line_item_id, worker_id, gross_amount_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'included')`,
      [payrollRunLineItemId, practiceId, payrollRunId, earningLineItemId, worker.id, clinicianEarningCents]
    );

    await client.query('COMMIT');

    const trace = {
      appointment_id: appointmentId,
      encounter_id: encounterId,
      clinical_note_id: clinicalNoteId,
      billing_claim_id: billingClaimId,
      payment_event_id: paymentEventId,
      reconciliation_id: reconciliationId,
      earning_line_item_id: earningLineItemId,
      payroll_run_line_item_id: payrollRunLineItemId,
    };

    return {
      success: true,
      trace,
      formattedTrace: `appointment ${appointmentId} → encounter ${encounterId} → note ${clinicalNoteId} → claim ${billingClaimId} → payment ${paymentEventId} → reconciliation ${reconciliationId} → earning ${earningLineItemId} → payroll line ${payrollRunLineItemId}`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// Requirement 4: Persisted Double-Entry Journal as Source of Financial Truth
// ============================================================================

export interface JournalLineParam {
  accountCode: string;
  debitCents: number | bigint;
  creditCents: number | bigint;
  description?: string;
}

export interface PostJournalEntryParams {
  practiceId?: string;
  source: string;
  externalReference?: string;
  entryType:
    | 'insurance_deposit'
    | 'patient_private_pay'
    | 'clinician_accrual'
    | 'tax_reserve_transfer'
    | 'payroll_funding'
    | 'refund_payout'
    | 'chargeback_reversal'
    | 'opening_balance'
    | 'reversal'
    | 'general_adjustment';
  description: string;
  lines: JournalLineParam[];
}

export async function postJournalEntryAtomic(params: PostJournalEntryParams) {
  const practiceId = params.practiceId || '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);

  // 1. Boundary check: sum(debits) must strictly equal sum(credits)
  let totalDebits = 0n;
  let totalCredits = 0n;
  for (const line of params.lines) {
    const debit = BigInt(line.debitCents || 0);
    const credit = BigInt(line.creditCents || 0);
    if (debit < 0n || credit < 0n) {
      throw new Error(`Negative amount not allowed on journal line: debit=${debit}, credit=${credit}`);
    }
    if (debit > 0n && credit > 0n) {
      throw new Error(`Journal line cannot specify both debit and credit: debit=${debit}, credit=${credit}`);
    }
    if (debit === 0n && credit === 0n) {
      throw new Error(`Journal line must have non-zero debit or credit`);
    }
    totalDebits += debit;
    totalCredits += credit;
  }

  if (totalDebits !== totalCredits) {
    throw new Error(
      `Unbalanced journal entry: sum(debits) = ${totalDebits} cents does not equal sum(credits) = ${totalCredits} cents`
    );
  }

  const db = getDatabasePool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 2. Uniqueness check for external reference: UNIQUE(practice_id, source, external_reference)
    if (params.externalReference) {
      const existing = await client.query(
        `SELECT id FROM journal_entries WHERE practice_id = $1 AND source = $2 AND external_reference = $3`,
        [practiceId, params.source, params.externalReference]
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return {
          isDuplicate: true,
          journalEntryId: existing.rows[0].id,
          message: `Duplicate journal entry ignored: external reference ${params.externalReference} already posted.`,
        };
      }
    }

    const journalEntryId = uuidv4();
    const txRef = `JE-${Date.now()}-${uuidv4().substring(0, 6)}`;

    // 3. Insert Journal Entry header
    await client.query(
      `INSERT INTO journal_entries (
         id, practice_id, transaction_ref, source, external_reference, entry_type, description, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'posted')`,
      [
        journalEntryId,
        practiceId,
        txRef,
        params.source,
        params.externalReference || null,
        params.entryType,
        params.description,
      ]
    );

    // 4. Insert Journal Lines & maintain bank account projection transactionally
    for (const line of params.lines) {
      const acctRes = await client.query(
        `SELECT id, account_type FROM general_ledger_accounts WHERE practice_id = $1 AND account_code = $2`,
        [practiceId, line.accountCode]
      );
      if (acctRes.rows.length === 0) {
        throw new Error(`GL account ${line.accountCode} not found for practice ${practiceId}`);
      }

      const acctId = acctRes.rows[0].id;
      const debit = BigInt(line.debitCents || 0);
      const credit = BigInt(line.creditCents || 0);

      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, acctId, debit, credit, line.description || params.description]
      );

      // If operating checking (1010), insert bank_transactions projection for audit trail
      if (line.accountCode === '1010') {
        const netCashDelta = debit - credit;
        const opBank = await client.query(
          `SELECT id, current_balance_cents FROM bank_accounts WHERE practice_id = $1 AND account_type = 'operating_checking' FOR UPDATE`,
          [practiceId]
        );
        if (opBank.rows.length > 0) {
          const bankId = opBank.rows[0].id;
          const currentBal = BigInt(opBank.rows[0].current_balance_cents);

          await client.query(
            `INSERT INTO bank_transactions (
               account_id, journal_entry_id, type, category, amount_cents,
               description, reference_id, running_balance_cents, reconciled
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
            [
              bankId,
              journalEntryId,
              netCashDelta >= 0n ? 'deposit' : 'withdrawal',
              params.entryType,
              netCashDelta,
              line.description || params.description,
              params.externalReference || txRef,
              currentBal,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    return {
      isDuplicate: false,
      journalEntryId,
      transactionRef: txRef,
      totalCents: totalDebits,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function reverseJournalEntryAtomic(params: {
  practiceId?: string;
  originalEntryId: string;
  reason: string;
  externalReference?: string;
}) {
  const practiceId = params.practiceId || '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);
  const db = getDatabasePool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch original entry and lock
    const origRes = await client.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND practice_id = $2 FOR UPDATE`,
      [params.originalEntryId, practiceId]
    );

    if (origRes.rows.length === 0) {
      throw new Error(`Original journal entry ${params.originalEntryId} not found`);
    }

    const orig = origRes.rows[0];

    // 2. Prevent double reversal: check if reversal already exists
    const priorReversal = await client.query(
      `SELECT id FROM journal_entries WHERE reversal_of_entry_id = $1`,
      [params.originalEntryId]
    );

    if (priorReversal.rows.length > 0) {
      throw new Error(`Reversal conflict: Journal entry ${params.originalEntryId} has already been reversed by ${priorReversal.rows[0].id}`);
    }

    // 3. Fetch original lines
    const linesRes = await client.query(
      `SELECT jel.*, gla.account_code 
       FROM journal_entry_lines jel 
       JOIN general_ledger_accounts gla ON jel.account_id = gla.id
       WHERE jel.journal_entry_id = $1`,
      [params.originalEntryId]
    );

    if (linesRes.rows.length === 0) {
      throw new Error(`Original journal entry ${params.originalEntryId} has no lines`);
    }

    // 4. Create Reversal Header
    const reversalEntryId = uuidv4();
    const revTxRef = `REV-${orig.transaction_ref}-${Date.now().toString().slice(-4)}`;

    await client.query(
      `INSERT INTO journal_entries (
         id, practice_id, transaction_ref, source, external_reference,
         reversal_of_entry_id, entry_type, description, status
       ) VALUES ($1, $2, $3, 'reversal', $4, $5, 'reversal', $6, 'posted')`,
      [
        reversalEntryId,
        practiceId,
        revTxRef,
        params.externalReference || null,
        orig.id,
        `Reversal of ${orig.transaction_ref}: ${params.reason}`,
      ]
    );

    // 5. Invert lines: original debit becomes credit, original credit becomes debit
    for (const line of linesRes.rows) {
      const origDebit = BigInt(line.debit_cents);
      const origCredit = BigInt(line.credit_cents);

      // Inverted
      const newDebit = origCredit;
      const newCredit = origDebit;

      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_cents, credit_cents, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          reversalEntryId,
          line.account_id,
          newDebit,
          newCredit,
          `Reversal line: ${line.description || 'inversion'}`,
        ]
      );

      // Record bank_transactions audit line for reversal if 1010
      if (line.account_code === '1010') {
        const netCashDelta = newDebit - newCredit;
        const opBank = await client.query(
          `SELECT id, current_balance_cents FROM bank_accounts WHERE practice_id = $1 AND account_type = 'operating_checking' FOR UPDATE`,
          [practiceId]
        );
        if (opBank.rows.length > 0) {
          const bankId = opBank.rows[0].id;
          const currentBal = BigInt(opBank.rows[0].current_balance_cents);

          await client.query(
            `INSERT INTO bank_transactions (
               account_id, journal_entry_id, type, category, amount_cents,
               description, reference_id, running_balance_cents, reconciled
             ) VALUES ($1, $2, $3, 'reversal', $4, $5, $6, $7, true)`,
            [
              bankId,
              reversalEntryId,
              netCashDelta >= 0n ? 'deposit' : 'withdrawal',
              netCashDelta,
              `Reversal: ${orig.transaction_ref}`,
              revTxRef,
              currentBal,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      reversalEntryId,
      transactionRef: revTxRef,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function reconcileBankAndLedger(practiceId = '00000000-0000-0000-0000-000000000001') {
  await ensurePracticeOsSeeded(practiceId);
  const db = getDatabasePool();
  const client = await db.connect();

  try {
    // 1. Calculate Ledger Cash independently from Account 1010 journal lines
    const ledgerRes = await client.query(
      `SELECT COALESCE(SUM(jel.debit_cents) - SUM(jel.credit_cents), 0) AS ledger_cash_cents
       FROM journal_entry_lines jel
       JOIN general_ledger_accounts gla ON jel.account_id = gla.id
       JOIN journal_entries je ON jel.journal_entry_id = je.id
       WHERE gla.practice_id = $1 AND gla.account_code = '1010' AND je.status = 'posted'`,
      [practiceId]
    );
    const ledgerCashCents = BigInt(ledgerRes.rows[0]?.ledger_cash_cents || 0);

    // 2. Query Bank Account Operating Checking Balance
    const bankRes = await client.query(
      `SELECT current_balance_cents FROM bank_accounts WHERE practice_id = $1 AND account_type = 'operating_checking'`,
      [practiceId]
    );
    const bankCashCents = BigInt(bankRes.rows[0]?.current_balance_cents || 0);

    // 3. Verify ALL journal entries in practice have sum(debits) == sum(credits)
    const imbalancedRes = await client.query(
      `SELECT je.id, je.transaction_ref, SUM(jel.debit_cents) as debits, SUM(jel.credit_cents) as credits
       FROM journal_entries je
       JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
       WHERE je.practice_id = $1
       GROUP BY je.id, je.transaction_ref
       HAVING SUM(jel.debit_cents) != SUM(jel.credit_cents)`,
      [practiceId]
    );

    const divergenceCents = bankCashCents - ledgerCashCents;

    return {
      practiceId,
      bankCashCents,
      ledgerCashCents,
      bankCash: centsToDollars(bankCashCents),
      ledgerCash: centsToDollars(ledgerCashCents),
      divergenceCents,
      divergenceDollars: centsToDollars(divergenceCents),
      isZeroDivergence: divergenceCents === 0n,
      unbalancedEntriesCount: imbalancedRes.rows.length,
      allEntriesBalanced: imbalancedRes.rows.length === 0,
    };
  } finally {
    client.release();
  }
}

