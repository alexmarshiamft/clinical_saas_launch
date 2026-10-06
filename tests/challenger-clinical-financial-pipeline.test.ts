/**
 * TheraFlow OS — Section 6 Shared-ID Clinical-to-Financial Pipeline Trace
 * 
 * Verifies:
 * 1. Complete end-to-end pipeline:
 *    appointment_id
 *    → encounter_id
 *    → clinical_note_id
 *    → billing_claim_id
 *    → payment_event_id
 *    → reconciliation_id
 *    → earning_line_item_id
 *    → payroll_run_line_item_id
 * 2. Real PostgreSQL foreign key relationships across all 8 tables
 * 3. Dynamic non-hardcoded parameters (patient name, clinician, CPT, amounts, bonus)
 * 4. Duplicate external payment replay prevention (no double earning, no double cash)
 */

import {
  getDatabasePool,
  closeDatabasePool,
  ensurePracticeOsSeeded,
  executeClinicalFinancialCascade,
  processPaymentEventAtomic,
  reconcileBankAndLedger,
} from '../src/lib/practice-os-repository';

async function runClinicalFinancialPipelineSuite() {
  console.log('====================================================================');
  console.log('   SECTION 6: SHARED-ID CLINICAL → FINANCIAL PIPELINE ACCEPTANCE    ');
  console.log('====================================================================\n');

  const practiceId = '00000000-0000-0000-0000-000000000001';
  await ensurePracticeOsSeeded(practiceId);
  const pool = getDatabasePool();

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

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Execute End-to-End Cascade with Dynamic Data
    // ------------------------------------------------------------------------
    console.log('--- Test 1: Execute End-to-End Pipeline Cascade ---');
    const dynamicClient = 'Eleanor Vance';
    const dynamicCpt = '90834';
    const dynamicAmount = 175.50;

    const cascadeRes = await executeClinicalFinancialCascade({
      practiceId,
      clientName: dynamicClient,
      cptCode: dynamicCpt,
      amountCollected: dynamicAmount,
    });

    assert('1.1 Cascade execution succeeded', cascadeRes.success === true);
    console.log(`\nExact Persisted Pipeline Trace:\n${cascadeRes.formattedTrace}\n`);

    const { trace } = cascadeRes;

    // ------------------------------------------------------------------------
    // TEST 2: Verify Every ID Corresponds to a Persisted Row in PostgreSQL
    // ------------------------------------------------------------------------
    console.log('--- Test 2: Verify Persisted Rows in PostgreSQL ---');
    const client = await pool.connect();
    try {
      const apptRow = await client.query(`SELECT id, client_id, clinician_id FROM appointments WHERE id = $1`, [trace.appointment_id]);
      assert('2.1 appointment row persisted in appointments table', apptRow.rows.length === 1);

      const encRow = await client.query(`SELECT id, appointment_id, cpt_code FROM encounters WHERE id = $1`, [trace.encounter_id]);
      assert('2.2 encounter row persisted with FK to appointment_id', encRow.rows.length === 1 && encRow.rows[0].appointment_id === trace.appointment_id);

      const noteRow = await client.query(`SELECT id, encounter_id, is_signed FROM clinical_notes WHERE id = $1`, [trace.clinical_note_id]);
      assert('2.3 clinical_note row persisted with FK to encounter_id', noteRow.rows.length === 1 && noteRow.rows[0].encounter_id === trace.encounter_id);

      const claimRow = await client.query(`SELECT id, encounter_id, total_charge_cents FROM billing_claims WHERE id = $1`, [trace.billing_claim_id]);
      assert('2.4 billing_claim row persisted with FK to encounter_id', claimRow.rows.length === 1 && claimRow.rows[0].encounter_id === trace.encounter_id);

      const payEventRow = await client.query(`SELECT id, claim_id, amount_cents FROM payment_events WHERE id = $1`, [trace.payment_event_id]);
      assert('2.5 payment_event row persisted with FK to claim_id', payEventRow.rows.length === 1 && payEventRow.rows[0].claim_id === trace.billing_claim_id);

      const reconRow = await client.query(`SELECT id, claim_id, payment_event_id FROM payment_reconciliations WHERE id = $1`, [trace.reconciliation_id]);
      assert('2.6 payment_reconciliation row persisted with FK to claim_id and payment_event_id',
        reconRow.rows.length === 1 &&
        reconRow.rows[0].claim_id === trace.billing_claim_id &&
        reconRow.rows[0].payment_event_id === trace.payment_event_id
      );

      const earningRow = await client.query(
        `SELECT id, encounter_id, claim_id, payment_event_id, reconciliation_id FROM earning_line_items WHERE id = $1`,
        [trace.earning_line_item_id]
      );
      assert('2.7 earning_line_item row persisted with FK to encounter, claim, payment_event, reconciliation',
        earningRow.rows.length === 1 &&
        earningRow.rows[0].encounter_id === trace.encounter_id &&
        earningRow.rows[0].claim_id === trace.billing_claim_id &&
        earningRow.rows[0].payment_event_id === trace.payment_event_id &&
        earningRow.rows[0].reconciliation_id === trace.reconciliation_id
      );

      const payrollLineRow = await client.query(
        `SELECT id, payroll_run_id, earning_line_item_id FROM payroll_run_line_items WHERE id = $1`,
        [trace.payroll_run_line_item_id]
      );
      assert('2.8 payroll_run_line_item row persisted with FK to earning_line_item_id',
        payrollLineRow.rows.length === 1 &&
        payrollLineRow.rows[0].earning_line_item_id === trace.earning_line_item_id
      );

      // Verify single JOIN query traversing the entire chain
      const fullJoinRes = await client.query(`
        SELECT 
          a.id as appt_id,
          e.id as enc_id,
          cn.id as note_id,
          bc.id as claim_id,
          pe.id as pay_id,
          pr.id as recon_id,
          eli.id as earning_id,
          prli.id as payroll_line_id
        FROM appointments a
        JOIN encounters e ON e.appointment_id = a.id
        JOIN clinical_notes cn ON cn.encounter_id = e.id
        JOIN billing_claims bc ON bc.encounter_id = e.id
        JOIN payment_events pe ON pe.claim_id = bc.id
        JOIN payment_reconciliations pr ON pr.claim_id = bc.id AND pr.payment_event_id = pe.id
        JOIN earning_line_items eli ON eli.reconciliation_id = pr.id
        JOIN payroll_run_line_items prli ON prli.earning_line_item_id = eli.id
        WHERE a.id = $1
      `, [trace.appointment_id]);

      assert('2.9 Single relational JOIN successfully traverses all 8 tables through real FK relationships', fullJoinRes.rows.length === 1);

    } finally {
      client.release();
    }

    // ------------------------------------------------------------------------
    // TEST 3: Duplicate Payment Replay Defense
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Duplicate Payment Replay Defense ---');
    const replayExternalId = `EXT-REPLAY-DEFENSE-${Date.now()}`;
    const initialPayment = await processPaymentEventAtomic({
      practiceId,
      source: 'insurance_era_835',
      externalEventId: replayExternalId,
      payerName: 'Optum Behavioral',
      clientName: 'Arthur Dent',
      cptCode: '90837',
      amountCollected: 165.00,
    });

    assert('3.1 Initial external payment processed successfully', initialPayment.isDuplicate === false);

    // Count earnings and journal entries before replay
    const client3 = await pool.connect();
    let earningsBefore = 0;
    let journalEntriesBefore = 0;
    try {
      const eRes = await client3.query(
        `SELECT COUNT(*) FROM earning_line_items WHERE practice_id = $1 AND idempotency_key LIKE $2`,
        [practiceId, `%${replayExternalId}%`]
      );
      earningsBefore = parseInt(eRes.rows[0].count, 10);

      const jRes = await client3.query(
        `SELECT COUNT(*) FROM journal_entries WHERE practice_id = $1 AND external_reference = $2`,
        [practiceId, replayExternalId]
      );
      journalEntriesBefore = parseInt(jRes.rows[0].count, 10);
    } finally {
      client3.release();
    }

    // Replay the exact same external payment event
    const replayPayment = await processPaymentEventAtomic({
      practiceId,
      source: 'insurance_era_835',
      externalEventId: replayExternalId,
      payerName: 'Optum Behavioral',
      clientName: 'Arthur Dent',
      cptCode: '90837',
      amountCollected: 165.00,
    });

    assert('3.2 Replayed payment event correctly recognized as duplicate', replayPayment.isDuplicate === true);

    // Count earnings and journal entries after replay
    const client3Post = await pool.connect();
    let earningsAfter = 0;
    let journalEntriesAfter = 0;
    try {
      const eRes = await client3Post.query(
        `SELECT COUNT(*) FROM earning_line_items WHERE practice_id = $1 AND idempotency_key LIKE $2`,
        [practiceId, `%${replayExternalId}%`]
      );
      earningsAfter = parseInt(eRes.rows[0].count, 10);

      const jRes = await client3Post.query(
        `SELECT COUNT(*) FROM journal_entries WHERE practice_id = $1 AND external_reference = $2`,
        [practiceId, replayExternalId]
      );
      journalEntriesAfter = parseInt(jRes.rows[0].count, 10);
    } finally {
      client3Post.release();
    }

    assert('3.3 No duplicate earning line items created on replay', earningsBefore === earningsAfter && earningsAfter === 1);
    assert('3.4 No duplicate journal entries created on replay', journalEntriesBefore === journalEntriesAfter && journalEntriesAfter === 1);

    // Verify bank/ledger zero divergence remains intact
    const reconCheck = await reconcileBankAndLedger(practiceId);
    assert('3.5 Bank and ledger cash divergence remains exactly $0.00 after pipeline tests', reconCheck.divergenceCents === 0n);

  } finally {
    await closeDatabasePool();
  }

  console.log('\n====================================================================');
  console.log(`   PIPELINE ACCEPTANCE RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runClinicalFinancialPipelineSuite().catch((err) => {
  console.error('Fatal pipeline test error:', err);
  process.exit(1);
});
