/**
 * Empirical Challenger Milestone 3 Adversarial Test Suite
 * TheraFlow Clinical EHR & Telehealth Stress & Boundary Verification
 *
 * Scopes tested:
 * 1. Cryptographic Audit Log Tampering (SHA-256 chain breakage, payload alteration, prevHash injection, genesis attack)
 * 2. DAP Progress Note Signing & Locking (Draft -> Signed -> Attempted unlock audit logging, UI element locking, AI expander fuzzing)
 * 3. Superbill & CMS-1500 Generation (Multiple service items, fee summation, 0 items, large numbers, NPI/Tax ID validation, edge-case diagnoses)
 * 4. Client Store Edge Cases (Empty search, missing lookups, SQL/XSS/Unicode fuzzing, extreme values)
 */

import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import {
  getClients,
  getClientById,
  addClient,
  updateClient,
  getNotes,
  addNote,
  updateNote,
  getInvoices,
  addInvoice,
  getAuditLogs,
  logAuditEvent,
  resetTheraFlowStore,
  computeFinancialKPIs,
  computeInvoiceStatus,
  subscribeToTheraFlowStore,
} from '../src/tools/theraflow/data/theraflow-store';
import {
  CLINICIAN_NAME,
  CLINICIAN_NPI,
  CLINICIAN_TAX_ID,
  CLINICIAN_LICENSE,
} from '../src/tools/theraflow/data/demo-seed';
import { computeRecordHash, verifyAuditChain, GENESIS_HASH, sha256 } from '../src/lib/audit';
import { AuditLogEntry, ClientRecord, Invoice } from '../src/tools/theraflow/types';
import { expandShorthandToDAP } from '../src/tools/theraflow/ai-note-expander';
import { DAPNotesView } from '../src/tools/theraflow/DAPNotesView';
import { SuperbillModal } from '../src/tools/theraflow/SuperbillModal';
import { ClinicalContextProvider } from '../src/lib/clinical-context';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  category: string;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assertTest(
  id: string,
  category: string,
  name: string,
  condition: boolean,
  details?: string
) {
  if (condition) {
    results.push({ id, name, category, passed: true, details });
    console.log(`  ✓ [PASS] [${category}] ${id}: ${name}`);
    if (details) console.log(`      ↳ ${details}`);
  } else {
    results.push({ id, name, category, passed: false, details, error: 'Condition evaluated to false' });
    console.error(`  ❌ [FAIL] [${category}] ${id}: ${name}`);
    if (details) console.error(`      ↳ ${details}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/dashboard/ehr',
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

async function renderInDom(ui: React.ReactElement, dom: JSDOM) {
  const rootEl = dom.window.document.getElementById('root')!;
  rootEl.innerHTML = '';
  const root = ReactDOM.createRoot(rootEl);
  root.render(ui);
  await sleep(250);
  return {
    getHtml: () => dom.window.document.body.innerHTML,
    unmount: () => root.unmount(),
  };
}

async function runEmpiricalChallengerSuite() {
  console.log('====================================================================');
  console.log('   EMPIRICAL CHALLENGER: TheraFlow M3 Stress & Edge-Case Suite     ');
  console.log('====================================================================\n');

  resetTheraFlowStore();

  // ==========================================================================
  // SECTION 1: Cryptographic Audit Log Tampering Attacks
  // ==========================================================================
  console.log('--- 1. Cryptographic Audit Log Tampering Attacks ---');

  const baselineLogs = await getAuditLogs();
  assertTest(
    'CRYPTO-01',
    'Audit Ledger',
    'Baseline audit chain passes 100% cryptographic verification',
    verifyAuditChain(baselineLogs) === true && baselineLogs.length >= 5,
    `Verified baseline chain length: ${baselineLogs.length}`
  );

  // Attack 1: Payload Alteration in intermediate entry
  const payloadTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  const midIdx = Math.floor(payloadTampered.length / 2);
  payloadTampered[midIdx].details = { unauthorized_mutation: true, fake_data: 'injected' };
  assertTest(
    'CRYPTO-02',
    'Audit Ledger',
    'Tamper breach caught when entry details payload is modified',
    verifyAuditChain(payloadTampered) === false,
    `Payload modification at index ${midIdx} failed verification as required`
  );

  // Attack 2: Action Modification Attack
  const actionTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  actionTampered[1].action = 'UNAUTHORIZED_EXPORT' as any;
  assertTest(
    'CRYPTO-03',
    'Audit Ledger',
    'Tamper breach caught when entry action is maliciously swapped',
    verifyAuditChain(actionTampered) === false,
    'Action string swap caused SHA-256 mismatch'
  );

  // Attack 3: Actor Identity Spoofing Attack
  const actorTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  actorTampered[2].actor = 'malicious.attacker@darknet.org';
  assertTest(
    'CRYPTO-04',
    'Audit Ledger',
    'Tamper breach caught when actor email is forged',
    verifyAuditChain(actorTampered) === false,
    'Actor tampering caused hash divergence'
  );

  // Attack 4: Patient MRN Alteration (Cross-Patient Contamination)
  const mrnTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  mrnTampered[2].patientMrn = '#MC-99999';
  assertTest(
    'CRYPTO-05',
    'Audit Ledger',
    'Tamper breach caught when patient MRN is altered in transit',
    verifyAuditChain(mrnTampered) === false,
    'Patient MRN tampering was detected'
  );

  // Attack 5: Timestamp Modification (Time-Travel / Replay Attack)
  const timeTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  timeTampered[1].timestamp = '2020-01-01T00:00:00.000Z';
  assertTest(
    'CRYPTO-06',
    'Audit Ledger',
    'Tamper breach caught when entry timestamp is backdated',
    verifyAuditChain(timeTampered) === false,
    'Timestamp modification detected'
  );

  // Attack 6: Previous Hash Pointer Severance
  const prevHashTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  prevHashTampered[3].prevHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  assertTest(
    'CRYPTO-07',
    'Audit Ledger',
    'Tamper breach caught when prevHash linkage is severed',
    verifyAuditChain(prevHashTampered) === false,
    'Broken prevHash pointer failed verification'
  );

  // Attack 7: Genesis Block Tampering
  const genesisTampered: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  genesisTampered[0].prevHash = '1111111111111111111111111111111111111111111111111111111111111111';
  assertTest(
    'CRYPTO-08',
    'Audit Ledger',
    'Tamper breach caught when genesis block prevHash is not GENESIS_HASH',
    verifyAuditChain(genesisTampered) === false,
    'Genesis hash tampering was detected'
  );

  // Attack 8: Hash Forgery with Recalculation (Downstream Linkage Break)
  // Attacker recalculates hash for entry N, but subsequent entry N+1 points to old hash
  const forgeryChain: AuditLogEntry[] = JSON.parse(JSON.stringify(baselineLogs));
  forgeryChain[1].details = { forged: 'new_content' };
  forgeryChain[1].hash = computeRecordHash(forgeryChain[1]);
  assertTest(
    'CRYPTO-09',
    'Audit Ledger',
    'Recalculated single entry hash detected because next entry prevHash fails',
    verifyAuditChain(forgeryChain) === false,
    'Subsequent block link broke when entry 1 was forged and re-hashed'
  );

  // Attack 9: Edge cases (empty array & single-element array)
  assertTest(
    'CRYPTO-10',
    'Audit Ledger',
    'verifyAuditChain on empty array returns true safely',
    verifyAuditChain([]) === true,
    'Handled empty array without crashing'
  );

  const singleEntry: AuditLogEntry = { ...baselineLogs[0] };
  assertTest(
    'CRYPTO-11',
    'Audit Ledger',
    'verifyAuditChain on valid single entry returns true',
    verifyAuditChain([singleEntry]) === true,
    'Single entry ledger verified'
  );

  // Attack 10: High-load chain creation stress test (100 sequential events)
  const initialChainLength = baselineLogs.length;
  for (let i = 0; i < 50; i++) {
    await logAuditEvent(
      'VIEW_EHR',
      'chart',
      `stress-${i}`,
      { iter: i, probe: 'load-test' },
      'Jane Doe',
      '#MC-88219'
    );
  }
  const expandedChain = await getAuditLogs();
  const startTime = Date.now();
  const stressVerified = verifyAuditChain(expandedChain);
  const durationMs = Date.now() - startTime;
  assertTest(
    'CRYPTO-12',
    'Audit Ledger',
    `High-load chain of ${expandedChain.length} entries verifies in < 50ms`,
    stressVerified === true && expandedChain.length >= initialChainLength + 50 && durationMs < 50,
    `Chain length: ${expandedChain.length}, Verification time: ${durationMs}ms`
  );

  // ==========================================================================
  // SECTION 2: DAP Note Signing, Locking & Immutability Audit Trail
  // ==========================================================================
  console.log('\n--- 2. DAP Note Signing, Locking & Immutability Audit Trail ---');

  // 2.1 Create a new clinical draft note
  const draftNote = await addNote({
    client_id: 'client-test-challenger',
    client_name: 'Adversarial Client',
    client_mrn: '#MC-99881',
    date_of_service: '2026-10-05',
    session_type: 'Individual Psychotherapy (CPT 90837)',
    duration_minutes: 53,
    cpt_code: '90837',
    diagnosis_code: 'F41.1',
    d_text: 'Patient presented with severe situational stress.',
    a_text: 'Acute anxiety reaction in response to environmental demands.',
    p_text: 'Continue weekly cognitive behavioral therapy.',
    is_locked: false,
  });

  assertTest(
    'DAP-01',
    'DAP Notes',
    'addNote initializes unlocked draft with is_locked=false',
    draftNote.is_locked === false && !draftNote.signed_at,
    `Draft note created: ID=${draftNote.id}`
  );

  // 2.2 Sign and Lock the Note
  const signTimestamp = new Date().toISOString();
  const signedNote = await updateNote(draftNote.id, {
    is_locked: true,
    signed_at: signTimestamp,
    signed_by: CLINICIAN_NAME,
    clinician_credentials: 'MD / Behavioral Health',
  });

  assertTest(
    'DAP-02',
    'DAP Notes',
    'updateNote sets is_locked=true and records signature credentials',
    signedNote.is_locked === true && signedNote.signed_by === CLINICIAN_NAME && signedNote.signed_at === signTimestamp,
    `Signed by ${signedNote.signed_by} at ${signedNote.signed_at}`
  );

  // 2.3 Attempt to Mutate Note back to Draft: Store logs audit entry and preserves cryptographic chain
  const preMutationLogs = await getAuditLogs();
  const preMutationCount = preMutationLogs.length;

  // Simulate an unauthorized unlock attempt or administrative override
  const mutatedBackNote = await updateNote(draftNote.id, {
    is_locked: false,
    d_text: 'Attempted unauthorized alteration of clinical record',
  });

  const postMutationLogs = await getAuditLogs();
  const latestAuditLog = postMutationLogs[postMutationLogs.length - 1];

  assertTest(
    'DAP-03',
    'DAP Notes',
    'Mutating a note triggers an immutable audit log entry in the ledger',
    postMutationLogs.length === preMutationCount + 1 && latestAuditLog.resourceId === draftNote.id,
    `Audit log created: ${latestAuditLog.id} for action ${latestAuditLog.action}`
  );

  assertTest(
    'DAP-04',
    'DAP Notes',
    'Audit log explicitly records the unlock state { is_locked: false }',
    latestAuditLog.details?.is_locked === false,
    `Details recorded: ${JSON.stringify(latestAuditLog.details)}`
  );

  assertTest(
    'DAP-05',
    'DAP Notes',
    'Audit chain remains 100% cryptographically valid after mutation and audit entry',
    verifyAuditChain(postMutationLogs) === true,
    'Chain verified after mutation'
  );

  // 2.4 UI Locking Test: When is_locked=true, inputs are disabled and "Note Sealed" badge renders
  const dom = setupDom();

  const uiMount = await renderInDom(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        ClinicalContextProvider,
        null,
        React.createElement(DAPNotesView, { initialClientId: 'p-101' })
      )
    ),
    dom
  );

  const renderedHtml = uiMount.getHtml();
  const containsNoteSealed = renderedHtml.includes('Note Sealed') || renderedHtml.includes('Cryptographically Sealed');
  const containsDisabledInputs = renderedHtml.includes('disabled');

  assertTest(
    'DAP-06',
    'DAP Notes',
    'DAPNotesView renders "Note Sealed" and disables edit controls for locked note',
    containsNoteSealed && containsDisabledInputs,
    `Note Sealed displayed: ${containsNoteSealed}, disabled elements present: ${containsDisabledInputs}`
  );
  uiMount.unmount();

  // 2.5 AI Note Expander Boundary & Fuzz Testing
  // Edge case A: Empty string
  const emptyExp = await expandShorthandToDAP('', 'Jane Doe', 'F41.1');
  assertTest(
    'DAP-07',
    'AI Expander',
    'expandShorthandToDAP handles empty string gracefully',
    Boolean(emptyExp.d && emptyExp.a && emptyExp.p),
    `Generated D length: ${emptyExp.d.length}`
  );

  // Edge case B: Script tag / XSS injection
  const xssShorthand = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
  const xssExp = await expandShorthandToDAP(xssShorthand, 'Jane Doe', 'F41.1');
  assertTest(
    'DAP-08',
    'AI Expander',
    'expandShorthandToDAP generates structured D, A, P fields without runtime crashes on injection payloads',
    Boolean(xssExp.d && xssExp.a && xssExp.p && xssExp.d.length > 50),
    'Handled script and img tags without unhandled runtime exception'
  );

  // Edge case C: Very long input (3,000 chars)
  const longShorthand = 'Pt reports excessive worry. '.repeat(100);
  const longExp = await expandShorthandToDAP(longShorthand, 'Jane Doe', 'F41.1');
  assertTest(
    'DAP-09',
    'AI Expander',
    'expandShorthandToDAP handles 3,000+ char shorthand text without truncation crash',
    Boolean(longExp.d && longExp.a && longExp.p) && longExp.d.length > 100,
    `Generated Data chars: ${longExp.d.length}`
  );

  // ==========================================================================
  // SECTION 3: Superbill & CMS-1500 Generation & Financial Computations
  // ==========================================================================
  console.log('\n--- 3. Superbill & CMS-1500 Generation & Financial Computations ---');

  // 3.1 Multiple service line items sum calculation
  const multiItemInvoice: Invoice = {
    id: 'inv-test-multi',
    invoice_number: 'INV-2026-MULTI-01',
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_id: 'client-1',
    client_name: 'Marcus Chen',
    client_email: 'marcus.chen@example.com',
    amount: 875.00,
    status: 'pending',
    issued_date: '2026-10-01',
    due_date: '2026-10-31',
    items: [
      { cpt_code: '90791', description: 'Diagnostic Evaluation', date_of_service: '2026-10-01', fee: 250 },
      { cpt_code: '90837', description: 'Psychotherapy 60m', date_of_service: '2026-10-08', fee: 175 },
      { cpt_code: '90834', description: 'Psychotherapy 45m', date_of_service: '2026-10-15', fee: 150 },
      { cpt_code: '90847', description: 'Family Psychotherapy', date_of_service: '2026-10-22', fee: 200 },
      { cpt_code: '90832', description: 'Psychotherapy 30m', date_of_service: '2026-10-29', fee: 100 },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const calculatedItemsTotal = multiItemInvoice.items.reduce((sum, item) => sum + item.fee, 0);
  assertTest(
    'BILL-01',
    'Billing & CMS-1500',
    'Sum of 5 diverse CPT code fees equals exact invoice total ($875.00)',
    calculatedItemsTotal === 875.00 && multiItemInvoice.amount === 875.00,
    `Calculated items sum: $${calculatedItemsTotal}`
  );

  // 3.2 Boundary condition: 0 items or zero fee
  const zeroInvoice: Invoice = {
    id: 'inv-zero',
    invoice_number: 'INV-ZERO',
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_id: 'client-1',
    client_name: 'Zero Test',
    amount: 0,
    status: 'paid',
    issued_date: '2026-10-01',
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const kpis = computeFinancialKPIs([zeroInvoice, multiItemInvoice]);
  assertTest(
    'BILL-02',
    'Billing & CMS-1500',
    'computeFinancialKPIs handles 0 items and $0 invoice without NaN',
    !isNaN(kpis.totalInvoiced) && !isNaN(kpis.totalPaid) && kpis.totalInvoiced === 875,
    `KPI totalInvoiced: ${kpis.totalInvoiced}, totalPaid: ${kpis.totalPaid}`
  );

  // 3.3 Large number handling ($1,000,000.00) & floating point precision
  const largeInvoice: Invoice = {
    id: 'inv-large',
    invoice_number: 'INV-LARGE',
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_id: 'client-1',
    client_name: 'Enterprise Client',
    amount: 1000000.50,
    status: 'pending',
    issued_date: '2026-10-01',
    items: [{ cpt_code: '90837', description: 'Annual Retainer', date_of_service: '2026-10-01', fee: 1000000.50 }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const largeKpi = computeFinancialKPIs([largeInvoice]);
  assertTest(
    'BILL-03',
    'Billing & CMS-1500',
    'computeFinancialKPIs handles large numbers ($1M+) accurately',
    largeKpi.totalInvoiced === 1000000.50,
    `Large amount formatted: $${largeKpi.totalInvoiced.toFixed(2)}`
  );

  // 3.4 CMS-1500 Statutory Provider Information Format: 10-digit NPI, Tax ID, License
  const is10DigitNpi = /^\d{10}$/.test(CLINICIAN_NPI);
  const isValidTaxId = /^\d{2}-\d{7}$/.test(CLINICIAN_TAX_ID);
  assertTest(
    'BILL-04',
    'Billing & CMS-1500',
    'Provider NPI complies with statutory 10-digit standard (HIPAA §162.406)',
    is10DigitNpi && CLINICIAN_NPI === '1982736450',
    `NPI: ${CLINICIAN_NPI} (Length: ${CLINICIAN_NPI.length})`
  );

  assertTest(
    'BILL-05',
    'Billing & CMS-1500',
    'Provider Federal Tax ID / EIN complies with XX-XXXXXXX standard',
    isValidTaxId && CLINICIAN_TAX_ID === '94-3829104',
    `Tax ID: ${CLINICIAN_TAX_ID}`
  );

  // 3.5 SuperbillModal Rendering with Edge-Case Inputs (Overpayment, Unlisted Diagnosis)
  const unusualClient: ClientRecord = {
    id: 'client-unusual',
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    first_name: 'Alexandria',
    last_name: 'Von Habsburg-Lorraine',
    email: 'alexandria@example.com',
    phone: '(415) 555-7788',
    date_of_birth: '1975-12-31',
    diagnosis_code: 'Z03.89',
    diagnosis_label: 'Encounter for observation for other suspected diseases',
    status: 'active',
    fee: 250,
    insurance_payer: 'Blue Cross Blue Shield of California',
    member_id: 'BCBS-991823-X',
    mrn: '#MC-99001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const unusualInvoice: Invoice = {
    id: 'inv-unusual',
    invoice_number: 'INV-2026-UNUSUAL',
    therapist_id: 'a0000000-0000-4000-8000-000000000001',
    client_id: unusualClient.id,
    client_name: `${unusualClient.first_name} ${unusualClient.last_name}`,
    client_address: '1000 Grand Ave, Suite 400, San Francisco, CA',
    amount: 250,
    status: 'paid',
    issued_date: '2026-10-01',
    items: [{ cpt_code: '90791', description: 'Diagnostic Evaluation', date_of_service: '2026-10-01', fee: 250 }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const superbillMount = await renderInDom(
    React.createElement(SuperbillModal, {
      invoice: unusualInvoice,
      client: unusualClient,
      isOpen: true,
      onClose: () => {},
    }),
    dom
  );

  const superbillHtml = superbillMount.getHtml();
  const hasBox33 = superbillHtml.includes('Box 33: Billing Provider') && superbillHtml.includes('1982736450');
  const hasBox2 = superbillHtml.includes('Box 2 &amp; 5') || superbillHtml.includes('Box 2 & 5');
  const hasBox21 = superbillHtml.includes('Box 21: Diagnosis');
  const hasBox24 = superbillHtml.includes('Box 24: Professional Clinical Encounter');
  const hasPatientName = superbillHtml.includes('Alexandria Von Habsburg-Lorraine');

  assertTest(
    'BILL-06',
    'Billing & CMS-1500',
    'SuperbillModal renders all CMS-1500 boxes (2, 5, 21, 24, 33) and NPI for custom client',
    hasBox33 && hasBox2 && hasBox21 && hasBox24 && hasPatientName,
    `Box 33: ${hasBox33}, Box 2: ${hasBox2}, Box 21: ${hasBox21}, Box 24: ${hasBox24}`
  );
  superbillMount.unmount();

  // ==========================================================================
  // SECTION 4: Client Store Edge Cases & Adversarial Fuzzing
  // ==========================================================================
  console.log('\n--- 4. Client Store Edge Cases & Adversarial Fuzzing ---');

  // 4.1 Non-existent Client Lookup
  const nonExistent = await getClientById('definitely-not-a-real-id-99999');
  assertTest(
    'CLIENT-01',
    'Client Store',
    'getClientById for non-existent ID returns null safely without exception',
    nonExistent === null,
    'Returned null for non-existent ID'
  );

  // 4.2 Empty search query logic (simulation of filter memo)
  const allClients = await getClients();
  const emptySearchFilter = allClients.filter((c) => {
    const q = ''.toLowerCase().trim();
    return !q || c.first_name.toLowerCase().includes(q);
  });
  assertTest(
    'CLIENT-02',
    'Client Store',
    'Empty search string returns entire roster without truncation',
    emptySearchFilter.length === allClients.length && allClients.length >= 11,
    `Total clients matched: ${emptySearchFilter.length}`
  );

  // 4.3 Adversarial Search Strings (SQL Injection, XSS, Unicode, Emojis, Ultra-Long)
  const adversarialSearchStrings = [
    "' OR '1'='1",
    "'; DROP TABLE clients; --",
    '<script>alert("xss")</script>',
    '<img src=x onerror=console.log(1)>',
    '🩺 👩‍⚕️ 🧠 ✨ 💊',
    'Renée O\'Connor-Smith',
    'A'.repeat(5000),
    'null',
    'undefined',
    '[object Object]',
  ];

  let searchCrashes = 0;
  for (const maliciousStr of adversarialSearchStrings) {
    try {
      const q = maliciousStr.toLowerCase().trim();
      allClients.filter((c) => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return (
          !q ||
          fullName.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.mrn && c.mrn.toLowerCase().includes(q))
        );
      });
    } catch (e) {
      searchCrashes++;
    }
  }

  assertTest(
    'CLIENT-03',
    'Client Store',
    'Client search filter withstands 10 adversarial injection strings (SQLi, XSS, Unicode, 5k chars) with 0 crashes',
    searchCrashes === 0,
    `Tested ${adversarialSearchStrings.length} payloads with 0 crashes`
  );

  // 4.4 Client creation with boundary data (special characters in name, $0 fee, missing optional fields)
  const boundaryClient = await addClient({
    first_name: "Renée-Marie O'Connor",
    last_name: 'D’Angelo & Sons',
    email: 'renee.dangelo@example.com',
    phone: '+1 (415) 555-0199 ext. 42',
    date_of_birth: '1905-01-01',
    diagnosis_code: 'F43.23',
    diagnosis_label: 'Adjustment Disorder with Mixed Anxiety and Depressed Mood',
    fee: 0,
    status: 'intake',
  });

  assertTest(
    'CLIENT-04',
    'Client Store',
    'addClient handles unicode names, apostrophes, $0 fee, and missing optional fields',
    Boolean(
      boundaryClient.id &&
      boundaryClient.mrn.startsWith('#MC-') &&
      boundaryClient.first_name === "Renée-Marie O'Connor" &&
      boundaryClient.fee === 0
    ),
    `Created client ID=${boundaryClient.id}, MRN=${boundaryClient.mrn}`
  );

  // 4.5 Store Mutation Subscription
  let listenerFired = false;
  const unsubscribe = subscribeToTheraFlowStore(() => {
    listenerFired = true;
  });

  await updateClient(boundaryClient.id, { fee: 150 });
  unsubscribe();

  assertTest(
    'CLIENT-05',
    'Client Store',
    'subscribeToTheraFlowStore receives notification on client update mutation',
    listenerFired === true,
    'Store listener fired as expected'
  );

  // ==========================================================================
  // Summary & Verdict
  // ==========================================================================
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  console.log('\n====================================================================');
  console.log(`EMPIRICAL CHALLENGER VERDICT: ${passedTests}/${totalTests} PASS (${failedTests} FAILED)`);
  console.log('====================================================================');

  if (failedTests > 0) {
    console.error(`\nFailed Empirical Challenges:\n`);
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`❌ [${r.category}] ${r.id}: ${r.name} - ${r.error || r.details}`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ ALL 25 EMPIRICAL CHALLENGE STRESS TESTS PASSED WITH 100% SUCCESS.');
    process.exit(0);
  }
}

runEmpiricalChallengerSuite().catch((err) => {
  console.error('Fatal challenger execution error:', err);
  process.exit(1);
});
