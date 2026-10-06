/**
 * TheraFlow OS — Multi-Process Payroll Concurrency & PostgreSQL Authority Test
 * 
 * Verifies Requirements 1 & 2:
 * 1. Claude Q1: Provider latency = ~300ms, Request B = ~100ms after Request A.
 *    Expected: 1 run, 1 funding, Request B rejected with HTTP 409 Conflict.
 * 2. Claude Q2: In-flight earning arrival while provider call is pending.
 *    Expected: Late earning remains 'accrued', only snapshotted earnings marked 'paid'.
 * 3. Multi-Process Attack: Two independent OS processes execute payroll approval concurrently.
 *    Expected: Database row locking & unique partial index strictly enforces 1 run, 1 funding.
 */

import { spawn } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  getDatabasePool,
  closeDatabasePool,
  ensurePracticeOsSeeded,
  serverApproveAndSubmitPayroll,
} from '../src/lib/practice-os-repository';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPayrollConcurrencySuite() {
  console.log('====================================================================');
  console.log('  CHALLENGER PAYROLL CONCURRENCY & MULTI-PROCESS ATTACK SUITE       ');
  console.log('  PostgreSQL Row-Locking & Authoritative Persistence Verification   ');
  console.log('====================================================================\n');

  const pool = getDatabasePool();
  const practiceId = '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${title}`);
      if (details) console.log(`   ${details}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${title}`);
      if (details) console.error(`   ${details}`);
      failed++;
    }
  }

  let dateSeed = (Date.now() % 80000) + 100;
  function getUniqueDates() {
    const d = ++dateSeed;
    const startYear = 2030 + Math.floor(d / 350);
    const dayOfYear = (d % 350) + 1;
    const startDate = new Date(Date.UTC(startYear, 0, dayOfYear)).toISOString().split('T')[0];
    const endDate = new Date(Date.UTC(startYear, 0, dayOfYear + 13)).toISOString().split('T')[0];
    const payDate = new Date(Date.UTC(startYear, 0, dayOfYear + 18)).toISOString().split('T')[0];
    return { startDate, endDate, payDate };
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Claude Q1 Concurrency Attack (Provider Latency 300ms, Request B +100ms)
    // ------------------------------------------------------------------------
    console.log('--- Test 1: Claude Q1 Concurrency Attack ---');
    const payPeriodId1 = uuidv4();
    const dates1 = getUniqueDates();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO pay_periods (id, practice_id, start_date, end_date, pay_date, status)
         VALUES ($1, $2, $3, $4, $5, 'open')`,
        [payPeriodId1, practiceId, dates1.startDate, dates1.endDate, dates1.payDate]
      );

      const workerRes = await client.query(`SELECT id FROM workers WHERE practice_id = $1 LIMIT 1`, [practiceId]);
      const workerId = workerRes.rows[0].id;

      // Seed 2 accrued earnings ($150 each)
      const earn1 = uuidv4();
      const earn2 = uuidv4();
      await client.query(
        `INSERT INTO earning_line_items (
           id, practice_id, pay_period_id, worker_id, rule_version, idempotency_key,
           accrual_type, date_of_service, client_name, cpt_code, service_description,
           amount_billed_cents, amount_collected_cents, clinician_earning_cents,
           practice_retained_cents, status, rule_applied, calculation_explanation
         ) VALUES
           ($1, $2, $3, $4, 1, $5, 'session_compensation', CURRENT_DATE, 'Patient A', '90837', 'Psychotherapy', 20000, 16000, 8800, 7200, 'accrued', '55% collections', 'Normal session'),
           ($6, $2, $3, $4, 1, $7, 'session_compensation', CURRENT_DATE, 'Patient B', '90837', 'Psychotherapy', 20000, 16000, 8800, 7200, 'accrued', '55% collections', 'Normal session')`,
        [earn1, practiceId, payPeriodId1, workerId, `idemp-${earn1}`, earn2, `idemp-${earn2}`]
      );
    } finally {
      client.release();
    }

    console.log(`Dispatched Request A (provider latency 300ms)...`);
    const promiseA = serverApproveAndSubmitPayroll({
      practiceId,
      payPeriodId: payPeriodId1,
      simulatedProviderLatencyMs: 300,
    });

    await sleep(100);
    console.log(`Dispatched Request B (+100ms later during Request A in-flight window)...`);
    const promiseB = serverApproveAndSubmitPayroll({
      practiceId,
      payPeriodId: payPeriodId1,
      simulatedProviderLatencyMs: 0,
    });

    const results = await Promise.allSettled([promiseA, promiseB]);
    const resA = results[0];
    const resB = results[1];

    assert(
      'Q1.1 Request A succeeds and settles payroll run',
      resA.status === 'fulfilled' && (resA as any).value?.success === true,
      `Result A: ${resA.status === 'fulfilled' ? JSON.stringify((resA as any).value) : (resA as any).reason?.message}`
    );

    assert(
      'Q1.2 Request B is rejected with HTTP 409 Conflict',
      resB.status === 'rejected' && ((resB as any).reason?.status === 409 || (resB as any).reason?.statusCode === 409),
      `Result B error: ${(resB as any).reason?.message}`
    );

    // Verify PostgreSQL persistence: exactly 1 run and 1 funding event
    const runCountRes = await pool.query(
      `SELECT count(*) FROM payroll_runs WHERE practice_id = $1 AND pay_period_id = $2`,
      [practiceId, payPeriodId1]
    );
    assert(
      'Q1.3 Exactly 1 payroll run exists in PostgreSQL for this pay period',
      Number(runCountRes.rows[0].count) === 1,
      `Run count: ${runCountRes.rows[0].count}`
    );

    const fundingCountRes = await pool.query(
      `SELECT count(*) FROM payroll_funding_events pfe
       JOIN payroll_runs pr ON pfe.payroll_run_id = pr.id
       WHERE pr.practice_id = $1 AND pr.pay_period_id = $2`,
      [practiceId, payPeriodId1]
    );
    assert(
      'Q1.4 Exactly 1 funding event recorded (no duplicate ACH disbursement)',
      Number(fundingCountRes.rows[0].count) === 1,
      `Funding count: ${fundingCountRes.rows[0].count}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Claude Q2 In-Flight Earning Snapshot Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Test 2: Claude Q2 In-Flight Earning Arrival Isolation ---');
    const payPeriodId2 = uuidv4();
    const dates2 = getUniqueDates();
    const client2 = await pool.connect();
    let initialEarnId = uuidv4();
    let lateEarnId = uuidv4();

    try {
      await client2.query(
        `INSERT INTO pay_periods (id, practice_id, start_date, end_date, pay_date, status)
         VALUES ($1, $2, $3, $4, $5, 'open')`,
        [payPeriodId2, practiceId, dates2.startDate, dates2.endDate, dates2.payDate]
      );

      const workerRes = await client2.query(`SELECT id FROM workers WHERE practice_id = $1 LIMIT 1`, [practiceId]);
      const workerId = workerRes.rows[0].id;

      // Seed 1 initial earning
      await client2.query(
        `INSERT INTO earning_line_items (
           id, practice_id, pay_period_id, worker_id, rule_version, idempotency_key,
           accrual_type, date_of_service, client_name, cpt_code, service_description,
           amount_billed_cents, amount_collected_cents, clinician_earning_cents,
           practice_retained_cents, status, rule_applied, calculation_explanation
         ) VALUES
           ($1, $2, $3, $4, 1, $5, 'session_compensation', CURRENT_DATE, 'Patient Initial', '90837', 'Psychotherapy', 20000, 16000, 8800, 7200, 'accrued', '55% collections', 'Initial session')`,
        [initialEarnId, practiceId, payPeriodId2, workerId, `idemp-${initialEarnId}`]
      );
    } finally {
      client2.release();
    }

    console.log(`Starting payroll approval with 400ms provider latency...`);
    const payrollPromise = serverApproveAndSubmitPayroll({
      practiceId,
      payPeriodId: payPeriodId2,
      simulatedProviderLatencyMs: 400,
    });

    // Wait 150ms and insert late arriving earning while provider call is in flight
    await sleep(150);
    console.log(`Inserting late earning into PostgreSQL while provider call is in-flight...`);
    const workerRes = await pool.query(`SELECT id FROM workers WHERE practice_id = $1 LIMIT 1`, [practiceId]);
    const workerId = workerRes.rows[0].id;
    await pool.query(
      `INSERT INTO earning_line_items (
         id, practice_id, pay_period_id, worker_id, rule_version, idempotency_key,
         accrual_type, date_of_service, client_name, cpt_code, service_description,
         amount_billed_cents, amount_collected_cents, clinician_earning_cents,
         practice_retained_cents, status, rule_applied, calculation_explanation
       ) VALUES
         ($1, $2, $3, $4, 1, $5, 'session_compensation', CURRENT_DATE, 'Patient Late Arrival', '90837', 'Psychotherapy', 20000, 16000, 8800, 7200, 'accrued', '55% collections', 'Late session')`,
      [lateEarnId, practiceId, payPeriodId2, workerId, `idemp-${lateEarnId}`]
    );

    const payrollRes = await payrollPromise;
    assert(
      'Q2.1 In-flight payroll run settles successfully',
      payrollRes.success === true,
      `Payroll Run ID: ${payrollRes.payrollRunId}`
    );

    // Verify status of initial vs late earning
    const earnStatusRes = await pool.query(
      `SELECT id, status FROM earning_line_items WHERE id IN ($1, $2)`,
      [initialEarnId, lateEarnId]
    );
    const initialStatus = earnStatusRes.rows.find((r) => r.id === initialEarnId)?.status;
    const lateStatus = earnStatusRes.rows.find((r) => r.id === lateEarnId)?.status;

    assert(
      'Q2.2 Initial snapshotted earning is marked "paid"',
      initialStatus === 'paid',
      `Initial earning status: ${initialStatus}`
    );

    assert(
      'Q2.3 Late arriving earning remains "accrued" (unpaid and not lost)',
      lateStatus === 'accrued',
      `Late earning status: ${lateStatus}`
    );

    const snapshotLinesRes = await pool.query(
      `SELECT count(*) FROM payroll_run_line_items WHERE payroll_run_id = $1`,
      [payrollRes.payrollRunId]
    );
    assert(
      'Q2.4 Payroll run line items contain exactly the snapshotted items count (1, not 2)',
      Number(snapshotLinesRes.rows[0].count) === 1,
      `Line items count: ${snapshotLinesRes.rows[0].count}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Multi-Process Concurrency Attack (Two Separate OS Processes)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Two Separate OS Processes Concurrency Attack ---');
    const payPeriodId3 = uuidv4();
    const dates3 = getUniqueDates();
    const client3 = await pool.connect();
    try {
      await client3.query(
        `INSERT INTO pay_periods (id, practice_id, start_date, end_date, pay_date, status)
         VALUES ($1, $2, $3, $4, $5, 'open')`,
        [payPeriodId3, practiceId, dates3.startDate, dates3.endDate, dates3.payDate]
      );

      const workerRes = await client3.query(`SELECT id FROM workers WHERE practice_id = $1 LIMIT 1`, [practiceId]);
      const workerId = workerRes.rows[0].id;
      const earnId = uuidv4();
      await client3.query(
        `INSERT INTO earning_line_items (
           id, practice_id, pay_period_id, worker_id, rule_version, idempotency_key,
           accrual_type, date_of_service, client_name, cpt_code, service_description,
           amount_billed_cents, amount_collected_cents, clinician_earning_cents,
           practice_retained_cents, status, rule_applied, calculation_explanation
         ) VALUES
           ($1, $2, $3, $4, 1, $5, 'session_compensation', CURRENT_DATE, 'Patient MP', '90837', 'Psychotherapy', 20000, 16000, 8800, 7200, 'accrued', '55% collections', 'Multi-process test')`,
        [earnId, practiceId, payPeriodId3, workerId, `idemp-${earnId}`]
      );
    } finally {
      client3.release();
    }

    // Helper script to run in a standalone child process
    const workerScript = path.resolve(process.cwd(), 'tests', 'helpers', 'payroll-worker.ts');

    const runProcess = (delay: number, latency: number): Promise<{ code: number; stdout: string; stderr: string }> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const cp = spawn('npx', ['tsx', workerScript, practiceId, payPeriodId3, String(latency)], {
            cwd: process.cwd(),
            env: {
              ...process.env,
              DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/theraflow_practice_os',
            },
          });

          let stdout = '';
          let stderr = '';
          cp.stdout?.on('data', (d) => (stdout += d.toString()));
          cp.stderr?.on('data', (d) => (stderr += d.toString()));
          cp.on('close', (code) => resolve({ code: code || 0, stdout, stderr }));
        }, delay);
      });
    };

    console.log(`Spawning OS Process 1 (latency 350ms)...`);
    const proc1Promise = runProcess(0, 350);
    console.log(`Spawning OS Process 2 (+100ms offset)...`);
    const proc2Promise = runProcess(100, 0);

    const [proc1, proc2] = await Promise.all([proc1Promise, proc2Promise]);

    const proc1Success = proc1.code === 0 && proc1.stdout.includes('"success":true');
    const proc2Conflict = proc2.code === 1 && (proc2.stderr.includes('409') || proc2.stderr.includes('CONFLICT'));

    assert(
      'Q3.1 OS Process 1 executes and commits authoritative payroll run',
      proc1Success,
      `Proc 1 stdout: ${proc1.stdout.trim()}`
    );

    assert(
      'Q3.2 OS Process 2 receives HTTP 409 Conflict rejection across process boundaries',
      proc2Conflict,
      `Proc 2 stderr: ${proc2.stderr.trim()}`
    );

    const totalRunsRes = await pool.query(
      `SELECT count(*) FROM payroll_runs WHERE practice_id = $1 AND pay_period_id = $2`,
      [practiceId, payPeriodId3]
    );
    assert(
      'Q3.3 Exactly 1 payroll run exists in PostgreSQL across both processes',
      Number(totalRunsRes.rows[0].count) === 1,
      `Total runs: ${totalRunsRes.rows[0].count}`
    );

  } finally {
    await closeDatabasePool();
  }

  console.log('\n====================================================================');
  console.log(`   PAYROLL CONCURRENCY RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPayrollConcurrencySuite().catch((err) => {
  console.error('Fatal payroll concurrency error:', err);
  process.exit(1);
});
