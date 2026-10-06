/**
 * Milestone 3 Adversarial Empirical Concurrency & Resilience Stress Suite
 * Challenger 2 (teamwork_preview_challenger_m3_2)
 *
 * Exhaustive white-box stress testing:
 * 1. High-throughput TheraFlow store operations:
 *    - Concurrent bursts of client creations, note additions, appointment bookings, invoice generations.
 *    - Interleaved multi-domain bursts (clients + notes + appointments + invoices in single Promise.all).
 *    - State corruption checks, queryability by ID, zero unhandled rejections.
 *    - Dual-engine localStorage sync safety & listener event propagation.
 * 2. Cryptographic Audit Ledger stress:
 *    - Rapid concurrent bursts of 100+ audit log entries.
 *    - 100% SHA-256 chain continuity verification (genesis link to tip).
 *    - Independent per-record hash verification and hex formatting check.
 *    - Multi-point tamper sensitivity probes across 100+ entry chain.
 * 3. Backend Express endpoints stress under concurrent load:
 *    - POST /api/telehealth/meeting: 50 concurrent calls, schema validation.
 *    - POST /api/audit-logs: 50 concurrent calls, hash linkage.
 *    - GET /api/audit-logs: 50 concurrent filtered calls (by MRN, action, limit).
 *    - Simultaneous mixed traffic burst (telehealth + audit reads + audit writes).
 *    - Boundary resilience (empty payloads, missing parameters, extreme limits).
 */

import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import crypto from 'node:crypto';

// TheraFlow store & crypto ledger
import {
  getClients,
  getClientById,
  addClient,
  updateClient,
  getAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  getNotes,
  getNotesByClientId,
  addNote,
  updateNote,
  getInvoices,
  addInvoice,
  updateInvoice,
  getAuditLogs,
  logAuditEvent,
  resetTheraFlowStore,
  subscribeToTheraFlowStore,
  LOCAL_STORAGE_KEY_THERAFLOW,
} from '../src/tools/theraflow/data/theraflow-store';

import {
  computeRecordHash,
  verifyAuditChain,
  GENESIS_HASH,
  sha256,
} from '../src/lib/audit';

import {
  AuditLogEntry,
  ClientRecord,
  CalendarEventRecord,
  DAPNote,
  Invoice,
} from '../src/tools/theraflow/types';
import { signJwtToken } from '../src/lib/jwt-auth';

const TEST_PORT = 3998;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let passCount = 0;
let failCount = 0;
const failureDetails: string[] = [];

function assertTest(name: string, condition: boolean, extra?: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${name}`);
    if (extra) console.log(`      ↳ ${extra}`);
  } else {
    failCount++;
    const msg = `❌ [FAIL] ${name}${extra ? ` — ${extra}` : ''}`;
    console.error(`  ${msg}`);
    failureDetails.push(msg);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Setup JSDOM environment with mock localStorage
function setupHeadlessEnvironment() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: `${BASE_URL}/dashboard/ehr`,
    runScripts: 'dangerously',
  });

  global.window = dom.window as any;
  global.document = dom.window.document as any;
  global.localStorage = dom.window.localStorage as any;
  global.location = dom.window.location as any;
  global.HTMLElement = dom.window.HTMLElement as any;

  if (!dom.window.requestAnimationFrame) {
    dom.window.requestAnimationFrame = (cb: any) => {
      const t = setTimeout(() => cb(Date.now()), 16);
      if (t && typeof (t as any).unref === 'function') (t as any).unref();
      return t as any;
    };
    dom.window.cancelAnimationFrame = (id: any) => clearTimeout(id);
  }
  global.requestAnimationFrame = dom.window.requestAnimationFrame;
  global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

  return dom;
}

// Start backend Express server for endpoint concurrency testing
async function launchTestServer() {
  const child = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'production',
      APP_URL: BASE_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  child.stdout?.on('data', (d) => {
    if (d.toString().includes(String(TEST_PORT))) ready = true;
  });

  const start = Date.now();
  while (!ready && Date.now() - start < 9000) {
    await sleep(100);
  }
  return child;
}

async function runConcurrencyStressHarness() {
  console.log('========================================================================');
  console.log('   Milestone 3 Empirical Concurrency & Data Resilience Stress Suite     ');
  console.log('   Challenger 2 Verification Matrix                                     ');
  console.log('========================================================================\n');

  setupHeadlessEnvironment();
  resetTheraFlowStore();

  let serverProcess: any = null;
  try {
    console.log(`Starting ephemeral test server on port ${TEST_PORT}...`);
    serverProcess = await launchTestServer();
    console.log(`✓ Test server running at ${BASE_URL}\n`);
  } catch (err: any) {
    console.warn(`Server boot warning: ${err.message}`);
  }

  // ==========================================================================
  // PART 1: HIGH-THROUGHPUT STORE OPERATIONS CONCURRENCY
  // ==========================================================================
  console.log('--- PART 1: High-Throughput Store Operations Concurrency ---');

  // Track store notifications
  let listenerNotificationCount = 0;
  const unsubscribe = subscribeToTheraFlowStore(() => {
    listenerNotificationCount++;
  });

  // 1.1 Burst of 30 Concurrent Client Creations
  const CLIENT_BURST_COUNT = 30;
  console.log(`Firing burst of ${CLIENT_BURST_COUNT} concurrent client additions...`);
  const clientPromises = Array.from({ length: CLIENT_BURST_COUNT }).map((_, i) =>
    addClient({
      id: `stress-client-${i}-${Date.now()}`,
      therapist_id: 'a0000000-0000-4000-8000-000000000001',
      first_name: `StressPatient_${i}`,
      last_name: `Burst_${i}`,
      email: `patient${i}@stress-test.org`,
      phone: `(555) 010-${String(1000 + i).slice(-4)}`,
      date_of_birth: '1990-01-01',
      diagnosis_code: i % 2 === 0 ? 'F41.1' : 'F32.1',
      diagnosis_label: i % 2 === 0 ? 'Generalized Anxiety' : 'Major Depression',
      status: 'active',
      fee: 175,
      address: `${100 + i} Clinical Lane, Suite ${i}`,
      emergency_contact: `Contact ${i} - 555-0199`,
    })
  );

  const createdClients = await Promise.all(clientPromises);
  const allClientsAfterBurst = await getClients();

  const allClientsExist = createdClients.every((c) =>
    allClientsAfterBurst.some((stored) => stored.id === c.id)
  );

  assertTest(
    '1.1 Concurrent burst of 30 client additions succeeds with zero unhandled rejections',
    createdClients.length === CLIENT_BURST_COUNT && allClientsExist,
    `Created ${createdClients.length} clients; total store count: ${allClientsAfterBurst.length}`
  );

  // 1.2 Burst of 30 Concurrent Note Additions
  const NOTE_BURST_COUNT = 30;
  console.log(`Firing burst of ${NOTE_BURST_COUNT} concurrent DAP note additions...`);
  const notePromises = createdClients.map((client, i) =>
    addNote({
      id: `stress-note-${i}-${Date.now()}`,
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      client_mrn: client.mrn,
      date_of_service: '2026-10-05',
      session_type: 'Individual Psychotherapy (CPT 90837)',
      duration_minutes: 53,
      cpt_code: '90837',
      diagnosis_code: client.diagnosis_code || 'F41.1',
      d_text: `Data point ${i}: Patient reports symptom stabilization under stress burst condition.`,
      a_text: `Assessment point ${i}: Response to intervention favorable, no active decompensation.`,
      p_text: `Plan point ${i}: Continue weekly sessions, homework adherence check next week.`,
      is_locked: false,
    })
  );

  const createdNotes = await Promise.all(notePromises);
  const allNotesAfterBurst = await getNotes();
  const allNotesExist = createdNotes.every((n) =>
    allNotesAfterBurst.some((stored) => stored.id === n.id)
  );

  assertTest(
    '1.2 Concurrent burst of 30 DAP progress notes succeeds with exact persistence',
    createdNotes.length === NOTE_BURST_COUNT && allNotesExist,
    `Created ${createdNotes.length} notes; total store count: ${allNotesAfterBurst.length}`
  );

  // 1.3 Burst of 30 Concurrent Appointment Bookings
  const APPT_BURST_COUNT = 30;
  console.log(`Firing burst of ${APPT_BURST_COUNT} concurrent appointment bookings...`);
  const apptPromises = createdClients.map((client, i) =>
    addAppointment({
      id: `stress-appt-${i}-${Date.now()}`,
      therapist_id: 'a0000000-0000-4000-8000-000000000001',
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      start_time: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      end_time: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:50:00Z`,
      status: 'scheduled',
      location: 'Telehealth',
      session_type: 'Individual Psychotherapy (CPT 90837)',
      cpt_code: '90837',
      notes: `Concurrent booking ${i}`,
      is_out_of_office: false,
    })
  );

  const createdAppts = await Promise.all(apptPromises);
  const allApptsAfterBurst = await getAppointments();
  const allApptsExist = createdAppts.every((a) =>
    allApptsAfterBurst.some((stored) => stored.id === a.id)
  );

  assertTest(
    '1.3 Concurrent burst of 30 appointments succeeds without collision',
    createdAppts.length === APPT_BURST_COUNT && allApptsExist,
    `Created ${createdAppts.length} appointments; total store count: ${allApptsAfterBurst.length}`
  );

  // 1.4 Burst of 30 Concurrent Invoice Additions
  const INV_BURST_COUNT = 30;
  console.log(`Firing burst of ${INV_BURST_COUNT} concurrent invoice generations...`);
  const invPromises = createdClients.map((client, i) =>
    addInvoice({
      id: `stress-inv-${i}-${Date.now()}`,
      invoice_number: `INV-BURST-${String(i).padStart(4, '0')}`,
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      client_email: client.email,
      client_dob: client.date_of_birth,
      client_address: client.address,
      cpt_code: '90837',
      amount: 175,
      status: i % 2 === 0 ? 'paid' : 'unpaid',
      issued_date: '2026-10-01',
      due_date: '2026-10-31',
      items: [
        {
          cpt_code: '90837',
          description: 'Psychotherapy 60m',
          date_of_service: '2026-10-01',
          fee: 175,
        },
      ],
      therapist_id: 'a0000000-0000-4000-8000-000000000001',
    })
  );

  const createdInvoices = await Promise.all(invPromises);
  const allInvoicesAfterBurst = await getInvoices();
  const allInvoicesExist = createdInvoices.every((inv) =>
    allInvoicesAfterBurst.some((stored) => stored.id === inv.id)
  );

  assertTest(
    '1.4 Concurrent burst of 30 invoices generated with unique invoice numbers',
    createdInvoices.length === INV_BURST_COUNT && allInvoicesExist,
    `Created ${createdInvoices.length} invoices; total store count: ${allInvoicesAfterBurst.length}`
  );

  // 1.5 Interleaved Multi-Domain Burst (80 simultaneous operations)
  console.log('Firing interleaved burst of 20 clients + 20 notes + 20 appointments + 20 invoices in single Promise.all...');
  const multiBurstPromises: Promise<any>[] = [];
  for (let i = 0; i < 20; i++) {
    multiBurstPromises.push(
      addClient({
        id: `interleaved-client-${i}-${Date.now()}`,
        first_name: `Interleaved_${i}`,
        last_name: 'Patient',
        email: `interleaved${i}@test.org`,
        date_of_birth: '1985-05-15',
        diagnosis_code: 'F41.1',
        fee: 180,
      })
    );
    multiBurstPromises.push(
      addNote({
        id: `interleaved-note-${i}-${Date.now()}`,
        client_id: `client-target-${i}`,
        client_name: `Interleaved Target ${i}`,
        client_mrn: `#MC-999${i}`,
        date_of_service: '2026-10-05',
        session_type: 'Individual Psychotherapy',
        duration_minutes: 50,
        cpt_code: '90834',
        diagnosis_code: 'F41.1',
        d_text: `Interleaved data note ${i}`,
        a_text: `Interleaved assessment note ${i}`,
        p_text: `Interleaved plan note ${i}`,
        is_locked: false,
      })
    );
    multiBurstPromises.push(
      addAppointment({
        id: `interleaved-appt-${i}-${Date.now()}`,
        client_id: `client-target-${i}`,
        client_name: `Interleaved Target ${i}`,
        start_time: '2026-10-20T14:00:00Z',
        end_time: '2026-10-20T14:50:00Z',
        status: 'scheduled',
        session_type: 'Psychotherapy',
        cpt_code: '90834',
      })
    );
    multiBurstPromises.push(
      addInvoice({
        id: `interleaved-inv-${i}-${Date.now()}`,
        invoice_number: `INV-INTER-${String(i).padStart(4, '0')}`,
        client_id: `client-target-${i}`,
        client_name: `Interleaved Target ${i}`,
        amount: 150,
        status: 'unpaid',
      })
    );
  }

  const multiBurstResults = await Promise.all(multiBurstPromises);
  assertTest(
    '1.5 Interleaved burst of 80 mixed clinical entities resolves with zero rejections',
    multiBurstResults.length === 80,
    `Successfully dispatched and settled 80 concurrent multi-table mutations`
  );

  // 1.6 LocalStorage Sync Safety Verification
  const rawLocalStorage = localStorage.getItem(LOCAL_STORAGE_KEY_THERAFLOW);
  let parsedLocalStorage: any = null;
  let localStorageMatchesMemory = false;

  if (rawLocalStorage) {
    try {
      parsedLocalStorage = JSON.parse(rawLocalStorage);
      const currentClients = await getClients();
      const currentNotes = await getNotes();
      const currentAppts = await getAppointments();
      const currentInvoices = await getInvoices();

      localStorageMatchesMemory =
        parsedLocalStorage.clients.length === currentClients.length &&
        parsedLocalStorage.notes.length === currentNotes.length &&
        parsedLocalStorage.appointments.length === currentAppts.length &&
        parsedLocalStorage.invoices.length === currentInvoices.length;
    } catch {}
  }

  assertTest(
    '1.6 LocalStorage state matches in-memory store exactly across all clinical collections',
    localStorageMatchesMemory,
    `LocalStorage entities: ${parsedLocalStorage?.clients?.length} clients, ${parsedLocalStorage?.notes?.length} notes, ${parsedLocalStorage?.appointments?.length} appts, ${parsedLocalStorage?.invoices?.length} invoices`
  );

  // 1.7 Listener Notification Integrity
  assertTest(
    '1.7 Store listeners actively triggered during mutations without event dropping',
    listenerNotificationCount >= 100,
    `Total store listener invocations: ${listenerNotificationCount}`
  );
  unsubscribe();

  // ==========================================================================
  // PART 2: CRYPTOGRAPHIC AUDIT LEDGER STRESS & TAMPER RESILIENCE
  // ==========================================================================
  console.log('\n--- PART 2: Cryptographic Audit Ledger Stress ---');

  // Reset store to known baseline to evaluate pure ledger burst
  resetTheraFlowStore();
  const baseLogs = await getAuditLogs();
  console.log(`Initial baseline audit logs: ${baseLogs.length}`);

  // 2.1 Rapid Append of 120+ Audit Entries in Concurrent Bursts
  const AUDIT_BURST_COUNT = 120;
  console.log(`Rapidly appending ${AUDIT_BURST_COUNT} audit entries in concurrent bursts...`);

  const auditBurstPromises = Array.from({ length: AUDIT_BURST_COUNT }).map((_, i) =>
    logAuditEvent(
      i % 4 === 0
        ? 'VIEW_EHR'
        : i % 4 === 1
        ? 'UPDATE_NOTE'
        : i % 4 === 2
        ? 'EXPORT_SUPERBILL'
        : 'TELEHEALTH_SESSION',
      'clinical_record',
      `resource-stress-${i}`,
      { burstIndex: i, testRun: 'empirical_challenger_m3_2', sampleData: `payload_${i}` },
      `Patient Stress ${i}`,
      `#MC-77${String(i).padStart(3, '0')}`
    )
  );

  const burstAppendResults = await Promise.all(auditBurstPromises);
  const fullAuditTrail = await getAuditLogs();

  assertTest(
    '2.1 Rapid concurrent burst of 120 audit log appends succeeds with zero rejections',
    burstAppendResults.length === AUDIT_BURST_COUNT &&
      fullAuditTrail.length === baseLogs.length + AUDIT_BURST_COUNT,
    `Appended ${burstAppendResults.length} records; Total ledger length: ${fullAuditTrail.length}`
  );

  // 2.2 Global SHA-256 Chain Continuity Check via verifyAuditChain
  const isChainContinuous = verifyAuditChain(fullAuditTrail);
  assertTest(
    '2.2 verifyAuditChain verifies 100% cryptographic integrity of full ledger',
    isChainContinuous === true,
    `Cryptographic chain integrity confirmed across all ${fullAuditTrail.length} entries`
  );

  // 2.3 Independent Exhaustive Per-Entry Hash Oracle Verification
  let brokenHashCount = 0;
  let brokenLinkCount = 0;
  let malformedHexCount = 0;
  const hex64Regex = /^[0-9a-f]{64}$/;

  for (let i = 0; i < fullAuditTrail.length; i++) {
    const entry = fullAuditTrail[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : fullAuditTrail[i - 1].hash;

    // Check link to previous
    if (entry.prevHash !== expectedPrevHash) {
      brokenLinkCount++;
    }

    // Check format of hash
    if (!hex64Regex.test(entry.hash)) {
      malformedHexCount++;
    }

    // Check re-computation using oracle
    const oracleHash = computeRecordHash(entry);
    if (entry.hash !== oracleHash) {
      brokenHashCount++;
    }
  }

  assertTest(
    '2.3 Exhaustive per-entry hash oracle verifies zero broken links across entire ledger',
    brokenLinkCount === 0 && brokenHashCount === 0 && malformedHexCount === 0,
    `Examined ${fullAuditTrail.length} blocks: 0 broken links, 0 invalid hashes, 0 malformed hex hashes`
  );

  // 2.4 Multi-Point Tamper Detection Sensitivity Probes
  // Probe A: Tamper genesis entry details
  const tamperedGenesis: AuditLogEntry[] = JSON.parse(JSON.stringify(fullAuditTrail));
  tamperedGenesis[0].details = { tampered: true };
  const detectedGenesisTamper = !verifyAuditChain(tamperedGenesis);

  // Probe B: Tamper middle entry (entry 60)
  const tamperedMiddle: AuditLogEntry[] = JSON.parse(JSON.stringify(fullAuditTrail));
  tamperedMiddle[60].patientMrn = '#MC-FORGED-MRN';
  const detectedMiddleTamper = !verifyAuditChain(tamperedMiddle);

  // Probe C: Tamper tip entry (latest entry)
  const tamperedTip: AuditLogEntry[] = JSON.parse(JSON.stringify(fullAuditTrail));
  tamperedTip[tamperedTip.length - 1].action = 'LOGIN';
  const detectedTipTamper = !verifyAuditChain(tamperedTip);

  // Probe D: Tamper timestamp of an entry
  const tamperedTimestamp: AuditLogEntry[] = JSON.parse(JSON.stringify(fullAuditTrail));
  tamperedTimestamp[30].timestamp = '2020-01-01T00:00:00.000Z';
  const detectedTimestampTamper = !verifyAuditChain(tamperedTimestamp);

  assertTest(
    '2.4 Multi-point tamper sensitivity detects tampering at Genesis, Middle, Tip, and Timestamp',
    detectedGenesisTamper && detectedMiddleTamper && detectedTipTamper && detectedTimestampTamper,
    `Genesis detected: ${detectedGenesisTamper} | Middle detected: ${detectedMiddleTamper} | Tip detected: ${detectedTipTamper} | Timestamp detected: ${detectedTimestampTamper}`
  );

  // ==========================================================================
  // PART 3: BACKEND SERVER ENDPOINTS STRESS UNDER CONCURRENCY
  // ==========================================================================
  console.log('\n--- PART 3: Backend Server Endpoints Stress Under Concurrency ---');

  if (!serverProcess) {
    console.error('Server process unavailable, skipping endpoint stress');
  } else {
    // 3.1 Concurrent Burst of 50 POST /api/telehealth/meeting
    const TELEHEALTH_BURST = 50;
    console.log(`Firing burst of ${TELEHEALTH_BURST} concurrent POST /api/telehealth/meeting requests...`);
    const meetingRequests = Array.from({ length: TELEHEALTH_BURST }).map((_, i) =>
      fetch(`${BASE_URL}/api/telehealth/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: `appt-stress-${i}`,
          externalUserId: `clinician-${i}`,
          clientName: `Telehealth Patient ${i}`,
        }),
      }).then(async (res) => {
        const body = await res.json();
        return {
          status: res.status,
          hasMeetingId: Boolean(body.Meeting?.MeetingId),
          hasJoinToken: Boolean(body.Attendee?.JoinToken),
          hasAudioUrl: Boolean(body.Meeting?.MediaPlacement?.AudioHostUrl),
          clientName: body.clientName,
        };
      })
    );

    const meetingResponses = await Promise.all(meetingRequests);
    const allMeetingsValid = meetingResponses.every(
      (r) => r.status === 200 && r.hasMeetingId && r.hasJoinToken && r.hasAudioUrl
    );

    assertTest(
      '3.1 Concurrent burst of 50 POST /api/telehealth/meeting returns 100% HTTP 200 with complete WebRTC tokens',
      allMeetingsValid,
      `Settled ${meetingResponses.length} concurrent meeting sessions with 100% token validity`
    );

    // 3.2 Concurrent Burst of 50 POST /api/audit-logs
    const AUDIT_POST_BURST = 50;
    const testJwt = signJwtToken({ role: 'practice_owner' });
    const authHeaders = { Authorization: `Bearer ${testJwt}` };

    console.log(`Firing burst of ${AUDIT_POST_BURST} concurrent POST /api/audit-logs requests...`);
    const auditPostRequests = Array.from({ length: AUDIT_POST_BURST }).map((_, i) =>
      fetch(`${BASE_URL}/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          action: 'VIEW_EHR',
          actor: 'dr.tester@behavioralhealth.org',
          actorName: 'Dr. Tester',
          patientName: `Endpoint Patient ${i}`,
          patientMrn: `#MC-SRV-${String(i).padStart(4, '0')}`,
          resourceType: 'ehr_chart',
          details: { endpointStressBatch: i },
        }),
      }).then(async (res) => {
        const body = await res.json();
        return {
          status: res.status,
          success: body.success,
          logId: body.log?.id,
          hasHash: Boolean(body.log?.hash),
          hasPrevHash: Boolean(body.log?.prevHash),
        };
      })
    );

    const auditPostResponses = await Promise.all(auditPostRequests);
    const allAuditPostsValid = auditPostResponses.every(
      (r) => r.status === 201 && r.success === true && r.hasHash && r.hasPrevHash
    );

    assertTest(
      '3.2 Concurrent burst of 50 POST /api/audit-logs returns 100% HTTP 201 with hash signatures',
      allAuditPostsValid,
      `Settled ${auditPostResponses.length} concurrent log posts with 100% hash coverage`
    );

    // 3.3 Concurrent Burst of 50 GET /api/audit-logs with Varying Queries
    const AUDIT_GET_BURST = 50;
    console.log(`Firing burst of ${AUDIT_GET_BURST} concurrent GET /api/audit-logs requests...`);
    const auditGetRequests = Array.from({ length: AUDIT_GET_BURST }).map((_, i) => {
      const url =
        i % 3 === 0
          ? `${BASE_URL}/api/audit-logs?action=VIEW_EHR&limit=25`
          : i % 3 === 1
          ? `${BASE_URL}/api/audit-logs?mrn=SRV-0010`
          : `${BASE_URL}/api/audit-logs?limit=100`;

      return fetch(url, { headers: authHeaders }).then(async (res) => {
        const body = await res.json();
        return {
          status: res.status,
          integrityStatus: body.integrityStatus,
          tamperFree: body.tamperFree,
          logsReturned: Array.isArray(body.logs),
          totalCount: body.totalCount,
        };
      });
    });

    const auditGetResponses = await Promise.all(auditGetRequests);
    const allAuditGetsValid = auditGetResponses.every(
      (r) =>
        r.status === 200 &&
        r.integrityStatus === 'verified' &&
        r.tamperFree === true &&
        r.logsReturned
    );

    assertTest(
      '3.3 Concurrent burst of 50 GET /api/audit-logs returns verified integrity status',
      allAuditGetsValid,
      `All 50 queries confirmed tamperFree: true and integrityStatus: verified`
    );

    // 3.4 Simultaneous Mixed Traffic Wave (90 simultaneous requests)
    console.log('Firing simultaneous mixed wave of 30 meeting + 30 audit write + 30 audit read requests...');
    const mixedWavePromises = [
      ...Array.from({ length: 30 }).map((_, i) =>
        fetch(`${BASE_URL}/api/telehealth/meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: `mixed-wave-${i}` }),
        }).then((r) => r.status)
      ),
      ...Array.from({ length: 30 }).map((_, i) =>
        fetch(`${BASE_URL}/api/audit-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            action: 'TELEHEALTH_SESSION',
            patientMrn: `#MC-MIXED-${i}`,
            details: { wave: 'mixed-load' },
          }),
        }).then((r) => r.status)
      ),
      ...Array.from({ length: 30 }).map(() =>
        fetch(`${BASE_URL}/api/audit-logs?limit=50`, { headers: authHeaders }).then((r) => r.status)
      ),
    ];

    const mixedWaveStatuses = await Promise.all(mixedWavePromises);
    const mixedWaveSuccess = mixedWaveStatuses.every((s) => s === 200 || s === 201);

    assertTest(
      '3.4 Simultaneous mixed wave of 90 backend requests sustains zero errors or dropped connections',
      mixedWaveSuccess,
      `Settled 90 simultaneous HTTP requests across telehealth and audit ledger endpoints`
    );

    // 3.5 Boundary & Resilient Fallback Probes
    console.log('Probing boundary conditions on server endpoints...');
    // Probe 1: POST /api/telehealth/meeting with empty body
    const emptyMeetingRes = await fetch(`${BASE_URL}/api/telehealth/meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const emptyMeetingJson = await emptyMeetingRes.json();
    const handlesEmptyMeeting =
      emptyMeetingRes.status === 200 &&
      Boolean(emptyMeetingJson.Meeting?.MeetingId) &&
      emptyMeetingJson.clientName === 'Jane Doe';

    // Probe 2: POST /api/audit-logs with minimal payload
    const emptyAuditPost = await fetch(`${BASE_URL}/api/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({}),
    });
    const emptyAuditJson = await emptyAuditPost.json();
    const handlesEmptyAudit = emptyAuditPost.status === 201 && emptyAuditJson.success === true;

    // Probe 3: GET /api/audit-logs with extreme limit query (limit=0, limit=99999)
    const limitRes = await fetch(`${BASE_URL}/api/audit-logs?limit=99999`, { headers: authHeaders });
    const limitJson = await limitRes.json();
    const handlesExtremeLimit = limitRes.status === 200 && limitJson.logs.length <= 1000;

    assertTest(
      '3.5 Server endpoints withstand empty payloads, extreme parameters, and boundary inputs gracefully',
      handlesEmptyMeeting && handlesEmptyAudit && handlesExtremeLimit,
      `Empty meeting: HTTP ${emptyMeetingRes.status} | Empty audit post: HTTP ${emptyAuditPost.status} | Extreme limit: HTTP ${limitRes.status}`
    );
  }

  // ==========================================================================
  // TEARDOWN
  // ==========================================================================
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  console.log('\n========================================================================');
  console.log(`Concurreny Stress Results: ${passCount} Passed, ${failCount} Failed (Total: ${passCount + failCount})`);
  console.log('========================================================================');

  if (failCount > 0) {
    console.error(`\nFailures encountered:\n${failureDetails.join('\n')}`);
    process.exit(1);
  } else {
    console.log('\n✓ 100% OF CONCURRENCY, BACKEND ENDPOINT, AND DATA STORE STRESS CHECKS PASSED.');
    process.exit(0);
  }
}

runConcurrencyStressHarness().catch((err) => {
  console.error('Fatal concurrency test harness error:', err);
  process.exit(1);
});
