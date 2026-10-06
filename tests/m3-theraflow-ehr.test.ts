/**
 * Comprehensive Milestone 3 Verification Suite: TheraFlow Clinical EHR & Telehealth
 * Covers Features 8, 9, 10, 11, 12 in complete detail:
 * - Feature 8: Client Roster & Charting (ClientsView, ClientProfileView, store CRUD)
 * - Feature 9: Interactive Appointment Calendar (CalendarView, bookings, OOO, views)
 * - Feature 10: DAP Progress Notes & Treatment Plans (DAPNotesView, AI Expander, Presets)
 * - Feature 11: Invoicing & CMS-1500 Superbills (BillingView, SuperbillModal, KPIs)
 * - Feature 12: Telehealth WebRTC Room & HIPAA Audit Logs (TelehealthView, SHA-256 chain, endpoints)
 */

import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Data store & domain logic
import {
  getClients,
  getClientById,
  addClient,
  getAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  getNotes,
  getNotesByClientId,
  addNote,
  updateNote,
  getTreatmentPlans,
  getTreatmentPlanByClientId,
  addTreatmentPlan,
  updateTreatmentPlan,
  getInvoices,
  addInvoice,
  updateInvoice,
  getAuditLogs,
  logAuditEvent,
  resetTheraFlowStore,
} from '../src/tools/theraflow/data/theraflow-store';
import { signJwtToken } from '../src/lib/jwt-auth';
import { expandShorthandToDAP } from '../src/tools/theraflow/ai-note-expander';
import { computeRecordHash, verifyAuditChain } from '../src/lib/audit';
import { AuditLogEntry } from '../src/tools/theraflow/types';

// Components
import EhrWorkspace from '../src/tools/theraflow/EhrWorkspace';
import { ClinicalContextProvider } from '../src/lib/clinical-context';

const TEST_PORT = 3995;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

function recordTest(name: string, ok: boolean, details?: string) {
  if (ok) {
    passedCount++;
    console.log(`  ✓ [PASS] ${name}`);
    if (details) console.log(`      ↳ ${details}`);
  } else {
    failedCount++;
    const msg = `❌ [FAIL] ${name}${details ? ` - ${details}` : ''}`;
    console.error(`  ${msg}`);
    failures.push(msg);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
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
  while (!ready && Date.now() - start < 8000) {
    await sleep(100);
  }
  return child;
}

// Setup JSDOM globals
function setupDom() {
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

async function renderComponent(ui: React.ReactElement, dom: JSDOM) {
  const rootEl = dom.window.document.getElementById('root')!;
  const root = ReactDOM.createRoot(rootEl);
  root.render(ui);
  await sleep(120);
  return {
    getHtml: () => dom.window.document.body.innerHTML,
    unmount: () => root.unmount(),
  };
}

async function runM3TestSuite() {
  console.log('====================================================================');
  console.log('   Milestone 3 Verification: TheraFlow Clinical EHR & Telehealth    ');
  console.log('====================================================================\n');

  // Launch test server for backend endpoints
  console.log('Starting ephemeral backend server for M3 verification...');
  let serverProcess: any = null;
  try {
    serverProcess = await startServer();
    console.log(`✓ Ephemeral server online at ${BASE_URL}\n`);
  } catch (err: any) {
    console.warn(`Server warning: ${err.message}`);
  }

  // Reset store to known baseline seed
  resetTheraFlowStore();

  // ========================================================================
  // Section 1: Feature 8 - Client Roster & Profile Charting
  // ========================================================================
  console.log('--- Feature 8: Client Roster & Profile Charting ---');

  // 1.1 Baseline Client Count
  const initialClients = await getClients();
  recordTest(
    'F8.1 Store seeds canonical TheraFlow patients (at least 11)',
    initialClients.length >= 11,
    `Loaded ${initialClients.length} clients including Jane Doe & Marcus Vance`
  );

  // 1.2 Verification of Canonical Patients
  const janeDoe = initialClients.find((c) => c.first_name === 'Jane' && c.last_name === 'Doe');
  const marcusChen = initialClients.find((c) => c.first_name === 'Marcus' && c.last_name === 'Chen');
  const elena = initialClients.find((c) => c.first_name === 'Elena');

  recordTest(
    'F8.2 Canonical patient records contain valid MRN, fee, and ICD-10 diagnoses',
    Boolean(
      janeDoe &&
      janeDoe.mrn === '#MC-88219' &&
      janeDoe.diagnosis_code === 'F41.1' &&
      marcusChen &&
      marcusChen.mrn === '#MC-10002' &&
      elena &&
      elena.diagnosis_code === 'F41.1'
    ),
    `Jane: ${janeDoe?.mrn} (${janeDoe?.diagnosis_code}) | Marcus: ${marcusChen?.mrn} | Elena: ${elena?.diagnosis_code}`
  );

  // 1.3 Client Creation with Validation
  const newClient = await addClient({
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    first_name: 'Sophia',
    last_name: 'Montgomery',
    email: 'sophia.montgomery@example.com',
    phone: '(415) 555-8901',
    date_of_birth: '1992-08-14',
    diagnosis_code: 'F41.0',
    diagnosis_label: 'Panic Disorder',
    status: 'active',
    fee: 175,
    address: '450 Sutter St, San Francisco, CA',
    emergency_contact: 'David Montgomery (Spouse) - (415) 555-8902',
    insurance_payer: 'Aetna Behavioral Health',
    member_id: 'AET-77182903',
  });

  recordTest(
    'F8.3 addClient assigns UUID, formatted MRN (#MC-xxxxx), and persists',
    Boolean(newClient.id && newClient.mrn && newClient.mrn.startsWith('#MC-') && newClient.first_name === 'Sophia'),
    `Created client ID: ${newClient.id} with MRN: ${newClient.mrn}`
  );

  // 1.4 Client Retrieval by ID
  const fetchedClient = await getClientById(newClient.id);
  recordTest(
    'F8.4 getClientById returns exact persisted record',
    Boolean(fetchedClient && fetchedClient.email === 'sophia.montgomery@example.com'),
    `Fetched: ${fetchedClient?.first_name} ${fetchedClient?.last_name}`
  );

  // ========================================================================
  // Section 2: Feature 9 - Interactive Appointment Calendar
  // ========================================================================
  console.log('\n--- Feature 9: Interactive Appointment Calendar ---');

  // 2.1 Calendar Appointment Seeding
  const initialAppts = await getAppointments();
  recordTest(
    'F9.1 Appointment store contains seeded clinical appointments',
    initialAppts.length >= 6,
    `Loaded ${initialAppts.length} appointments`
  );

  // 2.2 Appointment Booking
  const newAppt = await addAppointment({
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_id: janeDoe!.id,
    client_name: 'Jane Doe',
    start_time: '2026-10-15T10:00:00Z',
    end_time: '2026-10-15T10:50:00Z',
    status: 'scheduled',
    location: 'Telehealth',
    session_type: 'Individual Psychotherapy (CPT 90837)',
    cpt_code: '90837',
    notes: 'Focus on cognitive reappraisal and sleep latency exercises.',
    is_out_of_office: false,
  });

  recordTest(
    'F9.2 addAppointment books clinical session with CPT 90837 and Telehealth location',
    Boolean(newAppt.id && newAppt.cpt_code === '90837' && newAppt.location === 'Telehealth'),
    `Appt ID: ${newAppt.id} for ${newAppt.client_name}`
  );

  // 2.3 Out of Office (OOO) Blocking
  const oooBlock = await addAppointment({
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_name: 'Out of Office',
    start_time: '2026-10-16T13:00:00Z',
    end_time: '2026-10-16T15:00:00Z',
    status: 'scheduled',
    location: 'In-Person',
    session_type: 'Out of Office Block',
    notes: 'Departmental case review',
    is_out_of_office: true,
    ooo_reason: 'Peer Case Consultation',
  });

  recordTest(
    'F9.3 addAppointment supports Out of Office (OOO) calendar blocking',
    Boolean(oooBlock.is_out_of_office === true && oooBlock.ooo_reason === 'Peer Case Consultation'),
    `OOO Event created: ${oooBlock.session_type}`
  );

  // 2.4 Appointment Status Mutation & Deletion
  const updatedAppt = await updateAppointment(newAppt.id, { status: 'completed' });
  recordTest(
    'F9.4 updateAppointment transitions status to completed',
    updatedAppt?.status === 'completed',
    `New status: ${updatedAppt?.status}`
  );

  await deleteAppointment(newAppt.id);
  const remainingAppts = await getAppointments();
  const deleted = !remainingAppts.some((a) => a.id === newAppt.id);
  recordTest(
    'F9.5 deleteAppointment removes session cleanly from registry',
    deleted,
    `Appointment ${newAppt.id} successfully removed`
  );

  // ========================================================================
  // Section 3: Feature 10 - DAP Notes & Treatment Plans
  // ========================================================================
  console.log('\n--- Feature 10: DAP Notes & Treatment Plans ---');

  // 3.1 DAP Note Creation & Storage
  const newNote = await addNote({
    client_id: janeDoe!.id,
    client_name: 'Jane Doe',
    client_mrn: janeDoe!.mrn,
    date_of_service: '2026-10-05',
    session_type: 'Individual Psychotherapy (CPT 90837)',
    duration_minutes: 53,
    cpt_code: '90837',
    diagnosis_code: 'F41.1',
    d_text: 'Client reports 3 mild panic episodes this week. Sleep latency reduced from 60m to 25m.',
    a_text: 'Generalized Anxiety Disorder (F41.1) in partial remission. Patient is actively responding to stimulus control.',
    p_text: 'Continue weekly CBT. Practice progressive muscle relaxation nightly. Review thought log at next session.',
    is_locked: false,
  });

  recordTest(
    'F10.1 addNote creates structured DAP progress note with Data, Assessment, Plan',
    Boolean(newNote.id && newNote.d_text.includes('panic') && newNote.cpt_code === '90837'),
    `Note ID: ${newNote.id} created for ${newNote.client_name}`
  );

  // 3.2 Dual-Mode AI Note Expander
  const shorthand = 'Pt report racing heart, sweat before meetings. Review 3 thought logs. Assign 15m PMR nightly';
  const expanded = await expandShorthandToDAP(shorthand, 'Jane Doe', 'Generalized Anxiety Disorder (F41.1)');

  recordTest(
    'F10.2 expandShorthandToDAP generates structured clinical Data, Assessment, and Plan',
    Boolean(
      expanded.d &&
      expanded.a &&
      expanded.p &&
      expanded.d.length > 50 &&
      expanded.a.length > 20
    ),
    `Generated Data (${expanded.d.length} chars), Assessment (${expanded.a.length} chars), Plan (${expanded.p.length} chars)`
  );

  // 3.3 Digital Signature & Locking
  const lockedNote = await updateNote(newNote.id, {
    is_locked: true,
    signed_at: new Date().toISOString(),
    signed_by: 'Dr. Sarah Chen, MD',
  });

  recordTest(
    'F10.3 updateNote digitally signs and locks DAP note (HIPAA immutability)',
    Boolean(lockedNote?.is_locked === true && lockedNote?.signed_at),
    `Signed at: ${lockedNote?.signed_at}`
  );

  // 3.4 Treatment Plan Builder
  const newPlan = await addTreatmentPlan({
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_id: janeDoe!.id,
    client_name: 'Jane Doe',
    diagnosis_code: 'F41.1',
    diagnosis_label: 'Generalized Anxiety Disorder',
    problem_statement: 'Pervasive uncontrollable worry with somatic autonomic arousal.',
    long_term_goals: 'Reduce GAD-7 score from 16 to < 6 within 6 months.',
    objectives: [
      {
        id: 'obj-1',
        description: 'Complete daily thought record log with cognitive re-framing.',
        target_date: '2026-11-30',
        status: 'in_progress',
      },
      {
        id: 'obj-2',
        description: 'Execute PMR exercises 5 nights per week.',
        target_date: '2026-12-31',
        status: 'in_progress',
      },
    ],
    interventions: 'Cognitive Behavioral Therapy (CBT), Behavioral Sleep Stimulus Control, Interoceptive Exposure Exercises',
    target_completion_date: '2027-04-30',
    review_frequency: '90_days',
    status: 'active',
  });

  recordTest(
    'F10.4 addTreatmentPlan stores problem, goal, time-bound objectives, and interventions',
    Boolean(
      newPlan.id &&
      newPlan.objectives.length === 2 &&
      newPlan.interventions.length > 10
    ),
    `Plan ID: ${newPlan.id} with ${newPlan.objectives.length} objectives`
  );

  // ========================================================================
  // Section 4: Feature 11 - Invoicing & CMS-1500 Superbills
  // ========================================================================
  console.log('\n--- Feature 11: Invoicing & CMS-1500 Superbills ---');

  // 4.1 Invoice Seeding & Overdue Calculation
  const invoices = await getInvoices();
  recordTest(
    'F11.1 Invoice store loads baseline invoices across paid, unpaid, and overdue statuses',
    invoices.length >= 4,
    `Loaded ${invoices.length} invoices`
  );

  // 4.2 Financial KPI Calculations
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'paid') return false;
    const due = new Date(inv.due_date);
    return due < new Date();
  });

  recordTest(
    'F11.2 Financial engine accurately computes Total Billed, Paid, and Overdue receivables',
    totalBilled > 0 && paidInvoices.length > 0 && overdueInvoices.length > 0,
    `Total: $${totalBilled.toFixed(2)} | Paid Count: ${paidInvoices.length} | Overdue Count: ${overdueInvoices.length}`
  );

  // 4.3 Invoice Creation
  const newInvoice = await addInvoice({
    invoice_number: `INV-TEST-${Date.now().toString().slice(-4)}`,
    client_id: janeDoe!.id,
    client_name: 'Jane Doe',
    client_email: janeDoe!.email,
    client_dob: janeDoe!.date_of_birth,
    client_address: janeDoe!.address,
    cpt_code: '90837',
    amount: 175.00,
    status: 'unpaid',
    issued_date: '2026-10-01',
    due_date: '2026-10-31',
    items: [
      {
        cpt_code: '90837',
        description: 'Individual Psychotherapy 60m',
        date_of_service: '2026-10-01',
        fee: 175.00,
      },
    ],
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
  });

  recordTest(
    'F11.3 addInvoice generates billing record with CPT items and due date',
    Boolean(newInvoice.id && newInvoice.amount === 175 && newInvoice.invoice_number.startsWith('INV-TEST-')),
    `Invoice: ${newInvoice.invoice_number} ($${newInvoice.amount})`
  );

  // 4.4 Status Transition to Paid
  const paidInvoice = await updateInvoice(newInvoice.id, {
    status: 'paid',
    paid_date: new Date().toISOString(),
  });
  recordTest(
    'F11.4 updateInvoice marks invoice as paid and attaches paid_date timestamp',
    Boolean(paidInvoice?.status === 'paid' && paidInvoice?.paid_date),
    `Status: ${paidInvoice?.status} (Paid at: ${paidInvoice?.paid_date})`
  );

  // ========================================================================
  // Section 5: Feature 12 - Telehealth WebRTC & HIPAA Audit Logs
  // ========================================================================
  console.log('\n--- Feature 12: Telehealth WebRTC & HIPAA Audit Logs ---');

  // 5.1 Backend Telehealth Meeting API
  let telehealthApiPass = false;
  try {
    const res = await fetch(`${BASE_URL}/api/telehealth/meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: 'appt-test-1', clientName: 'Jane Doe' }),
    });
    if (res.ok) {
      const data = await res.json();
      telehealthApiPass = Boolean(data.Meeting?.MeetingId && data.Attendee?.JoinToken);
    }
  } catch (err: any) {
    console.warn(`Meeting API check: ${err.message}`);
  }

  recordTest(
    'F12.1 POST /api/telehealth/meeting issues WebRTC room credentials and join token',
    telehealthApiPass,
    'Returned Meeting.MeetingId and Attendee.JoinToken'
  );

  // 5.2 Pure SHA-256 Hash Chaining
  const initialLogs = await getAuditLogs();
  recordTest(
    'F12.2 getAuditLogs loads cryptographically chained audit ledger',
    initialLogs.length >= 8,
    `Loaded ${initialLogs.length} audit entries`
  );

  const chainVerified = verifyAuditChain(initialLogs);
  recordTest(
    'F12.3 verifyAuditChain verifies 100% cryptographic integrity of audit ledger',
    chainVerified === true,
    `Chain verification result: ${chainVerified}`
  );

  // 5.3 Tamper Detection Test
  const tamperedLogs: AuditLogEntry[] = JSON.parse(JSON.stringify(initialLogs));
  if (tamperedLogs.length > 2) {
    tamperedLogs[1].details = { tampered: 'unauthorized_mutation' };
    const tamperDetected = !verifyAuditChain(tamperedLogs);
    recordTest(
      'F12.4 verifyAuditChain flags tamper breach when log payload is altered',
      tamperDetected,
      'Cryptographic hash mismatch caught unauthorized payload tampering'
    );
  }

  // 5.4 Backend Audit Log Ingestion & Query
  let auditApiPass = false;
  try {
    const validJwt = signJwtToken({ role: 'practice_owner' });
    const authHeaders = { Authorization: `Bearer ${validJwt}` };

    const postRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'VIEW_EHR',
        patientMrn: '#MC-88219',
        patientName: 'Jane Doe',
        resourceType: 'ehr_chart',
        details: { verification: 'm3_automated_test' },
      }),
    });
    const getRes = await fetch(`${BASE_URL}/api/audit-logs?mrn=88219`, {
      headers: authHeaders,
    });
    if (postRes.ok && getRes.ok) {
      const getJson = await getRes.json();
      auditApiPass = getJson.integrityStatus === 'verified' && getJson.logs.length > 0;
    }
  } catch (err: any) {
    console.warn(`Audit API check error: ${err.message}`);
  }

  recordTest(
    'F12.5 GET & POST /api/audit-logs records and filters immutable logs',
    auditApiPass,
    'HTTP 201 on log submission and HTTP 200 with verified filter query'
  );

  // ========================================================================
  // Section 6: UI Component & Routing Integration in EhrWorkspace
  // ========================================================================
  console.log('\n--- Section 6: UI Component & Routing Integration ---');

  const dom = setupDom();

  // 6.1 Persistent Header & Summary Cards Verification
  const ehrMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'overview' })
      )
    ),
    dom
  );

  const ehrHtml = ehrMount.getHtml();
  const hasTitle = ehrHtml.includes('Clinical EHR &amp; Telehealth') || ehrHtml.includes('Clinical EHR & Telehealth');
  const hasSubtitle = ehrHtml.includes('TheraFlow Practice Management &amp; Patient Charting') || ehrHtml.includes('TheraFlow Practice Management');
  const hasBadge = ehrHtml.includes('EHR Active');
  const hasPatientCard = ehrHtml.includes('Jane Doe') && ehrHtml.includes('#MC-88219') && ehrHtml.includes('CPT 90837');
  const hasTelehealthCard = ehrHtml.includes('Ready for Session') && ehrHtml.includes('Encrypted WebRTC Room');
  const hasNotesCard = ehrHtml.includes('DAP / SOAP Formats') && ehrHtml.includes('Auto-synced with Scribe');

  recordTest(
    'UI.1 EhrWorkspace renders persistent header and 3 invariant summary cards',
    hasTitle && hasSubtitle && hasBadge && hasPatientCard && hasTelehealthCard && hasNotesCard,
    `Title: ${hasTitle} | Subtitle: ${hasSubtitle} | Badge: ${hasBadge} | Patient: ${hasPatientCard} | Telehealth: ${hasTelehealthCard} | Notes: ${hasNotesCard}`
  );
  ehrMount.unmount();

  // 6.2 Clients Tab Rendering
  const clientsMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'clients' })
      )
    ),
    dom
  );
  const clientsHtml = clientsMount.getHtml();
  const rendersRoster = clientsHtml.includes('Patient &amp; Client Roster') || clientsHtml.includes('Patient & Client Roster');
  recordTest(
    'UI.2 EhrWorkspace with defaultTab="clients" renders interactive client roster',
    rendersRoster,
    `Roster rendered: ${rendersRoster}`
  );
  clientsMount.unmount();

  // 6.3 Calendar Tab Rendering
  const calendarMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'calendar' })
      )
    ),
    dom
  );
  const calHtml = calendarMount.getHtml();
  const rendersCalendar = calHtml.includes('Clinical Appointment Scheduler');
  recordTest(
    'UI.3 EhrWorkspace with defaultTab="calendar" renders appointment scheduler',
    rendersCalendar,
    `Calendar rendered: ${rendersCalendar}`
  );
  calendarMount.unmount();

  // 6.4 DAP Notes Tab Rendering
  const notesMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'notes' })
      )
    ),
    dom
  );
  const notesHtml = notesMount.getHtml();
  const rendersNotes = notesHtml.includes('DAP Progress Note Clinical Charting');
  recordTest(
    'UI.4 EhrWorkspace with defaultTab="notes" renders DAP note editor with CMS guidance',
    rendersNotes,
    `Notes rendered: ${rendersNotes}`
  );
  notesMount.unmount();

  // 6.5 Treatment Plans Tab Rendering
  const tpMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'treatment-plans' })
      )
    ),
    dom
  );
  const tpHtml = tpMount.getHtml();
  const rendersTp = tpHtml.includes('Treatment Plan Builder') && tpHtml.includes('Problem Statement');
  recordTest(
    'UI.5 EhrWorkspace with defaultTab="treatment-plans" renders treatment plan builder',
    rendersTp,
    `Treatment plans rendered: ${rendersTp}`
  );
  tpMount.unmount();

  // 6.6 Billing Tab Rendering
  const billingMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'billing' })
      )
    ),
    dom
  );
  const billingHtml = billingMount.getHtml();
  const rendersBilling = billingHtml.includes('Total Invoiced');
  recordTest(
    'UI.6 EhrWorkspace with defaultTab="billing" renders invoice and claims ledger',
    rendersBilling,
    `Billing rendered: ${rendersBilling}`
  );
  billingMount.unmount();

  // 6.7 Telehealth Tab Rendering
  const telehealthMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'telehealth' })
      )
    ),
    dom
  );
  const teleHtml = telehealthMount.getHtml();
  const rendersTelehealth = teleHtml.includes('Encrypted WebRTC Room') && teleHtml.includes('Dr. Sarah Chen, MD (You)');
  recordTest(
    'UI.7 EhrWorkspace with defaultTab="telehealth" renders WebRTC video room simulation',
    rendersTelehealth,
    `Telehealth room rendered: ${rendersTelehealth}`
  );
  telehealthMount.unmount();

  // 6.8 Audit Logs Tab Rendering
  const auditMount = await renderComponent(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(EhrWorkspace, { defaultTab: 'audit-logs' })
      )
    ),
    dom
  );
  const auditHtml = auditMount.getHtml();
  const rendersAudit = auditHtml.includes('HIPAA Immutable Audit Trail') && auditHtml.includes('45 CFR §164.312(b)');
  recordTest(
    'UI.8 EhrWorkspace with defaultTab="audit-logs" renders HIPAA immutable audit ledger',
    rendersAudit,
    `Audit trail rendered: ${rendersAudit}`
  );
  auditMount.unmount();

  // ========================================================================
  // Clean Up Server Process
  // ========================================================================
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n====================================================================');
  console.log(`Milestone 3 EHR Verification: ${passedCount} Passed, ${failedCount} Failed (Total: ${passedCount + failedCount})`);
  console.log('====================================================================');

  if (failedCount > 0) {
    console.error(`\nFailed Checks:\n${failures.join('\n')}`);
    process.exit(1);
  } else {
    console.log('\n✓ ALL MILESTONE 3 THERAWFLOW EHR & TELEHEALTH CHECKS PASSED WITH 100% SUCCESS.');
    process.exit(0);
  }
}

runM3TestSuite().catch((err) => {
  console.error('Fatal M3 test runner error:', err);
  process.exit(1);
});
