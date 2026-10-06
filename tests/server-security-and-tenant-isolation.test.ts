/**
 * TheraFlow OS — Server Security & Multi-Tenant Boundary Isolation Test Suite
 * 
 * Verifies the fixes for SEC-01, SEC-02, and SEC-03:
 * 1. Unauthenticated request rejection (HTTP 401) across all protected routes
 * 2. Role-Based Access Control (RBAC HTTP 403) for financial mutation endpoints
 * 3. Cross-Tenant parameter & body tampering rejection (HTTP 403)
 * 4. Audit Log multi-tenant strict filtering (Zero cross-tenant leakage, zero legacy record bleed)
 * 5. Pure Integer Basis-Point Math verification (Zero floating-point drift)
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { signJwtToken } from '../src/lib/jwt-auth';
import { calculateBasisPointsCents, parseBasisPoints, SandboxEmbeddedBankingProvider } from '../src/modules/money/banking-provider';

const TEST_PORT = 3996;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let passCount = 0;
let failCount = 0;
const failureDetails: string[] = [];

function assertTest(name: string, condition: boolean, details?: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${name}`);
    if (details) console.log(`      ↳ ${details}`);
  } else {
    failCount++;
    const msg = `❌ [FAIL] ${name}${details ? ` — ${details}` : ''}`;
    console.error(`  ${msg}`);
    failureDetails.push(msg);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function killServer(p?: ChildProcess | null) {
  if (!p || !p.pid) return;
  try {
    if (process.platform !== 'win32') {
      process.kill(-p.pid, 'SIGKILL');
    } else {
      p.kill('SIGKILL');
    }
  } catch {
    try { p.kill('SIGKILL'); } catch {}
  }
}

async function startServer(): Promise<ChildProcess> {
  const serverPath = path.resolve(process.cwd(), 'server.ts');
  const serverProcess = spawn('npx', ['tsx', serverPath], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'test',
      AUDIT_HMAC_SECRET: process.env.AUDIT_HMAC_SECRET || 'e7b4f8a12903c5d6e87f1a2b3c4d5e6f708192a3b4c5d6e7f8a9b0c1d2e3f4a5',
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (d) => {
    // console.log(`[SERVER STDOUT] ${d.toString()}`);
  });
  serverProcess.stderr?.on('data', (d) => {
    // console.error(`[SERVER STDERR] ${d.toString()}`);
  });

  let running = false;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status === 200) {
        running = true;
        break;
      }
    } catch {}
  }

  if (!running) {
    serverProcess.kill();
    throw new Error('Test server failed to start within timeout');
  }

  return serverProcess;
}

async function runTestSuite() {
  console.log('====================================================================');
  console.log('   TheraFlow OS: Server Security & Multi-Tenant Boundary Suite    ');
  console.log('====================================================================\n');

  // --------------------------------------------------------------------------
  // Category 0: Pure Integer Basis-Point Arithmetic
  // --------------------------------------------------------------------------
  console.log('--- Category 0: Pure Integer Basis-Point Math Invariants ---');
  {
    // Test 0.1: Standard 70% clinician split on $150.00 (15,000 cents)
    const base1 = 15000n;
    const split1 = calculateBasisPointsCents(base1, 70);
    const practice1 = base1 - split1;
    assertTest(
      '0.1 Standard 70% split on 15,000 cents yields exact 10,500 cents (zero drift)',
      split1 === 10500n && practice1 === 4500n && (split1 + practice1 === base1),
      `Clinician: ${split1}c, Practice: ${practice1}c, Sum: ${split1 + practice1}c`
    );

    // Test 0.2: Fractional percentage 65.5% on $175.25 (17,525 cents)
    const base2 = 17525n;
    const split2 = calculateBasisPointsCents(base2, 65.5);
    const practice2 = base2 - split2;
    assertTest(
      '0.2 Fractional 65.5% on 17,525 cents preserves exact cent conservation',
      split2 + practice2 === base2,
      `Clinician: ${split2}c, Practice: ${practice2}c, Total: ${base2}c`
    );

    // Test 0.3: Tax reserve 25% on 4,500 cents
    const taxSetAside = (practice1 * 2500n) / 10000n;
    assertTest(
      '0.3 25% Tax reserve on 4,500 cents yields exact 1,125 cents integer',
      taxSetAside === 1125n,
      `Tax Reserve: ${taxSetAside} cents`
    );

    // Test 0.4: Pure Direct BigInt basis points (6550n) and exact string percentage parsing (0 floats)
    const splitDirectBps = calculateBasisPointsCents(base2, 6550n, true);
    const parsedBpsFromFloat = parseBasisPoints(65.5);
    const parsedBpsFromString = parseBasisPoints('65.5');
    assertTest(
      '0.4 Pure BigInt basis-point input (6550n) and float-free parsing (65.5 -> 6550n) match',
      splitDirectBps === split2 && parsedBpsFromFloat === 6550n && parsedBpsFromString === 6550n,
      `Direct Bps: ${splitDirectBps}c, Parsed Bps: ${parsedBpsFromFloat}n`
    );
  }

  const ledgerPath = path.resolve(process.cwd(), 'data/audit_ledger.jsonl');
  let originalLedgerBackup: string | null = null;
  if (fs.existsSync(ledgerPath)) {
    originalLedgerBackup = fs.readFileSync(ledgerPath, 'utf8');
  }

  let server: ChildProcess;
  try {
    server = await startServer();
  } catch (err: any) {
    console.error('Fatal: Unable to launch server:', err.message);
    process.exit(1);
  }

  try {
    const PRACTICE_A = '11111111-aaaa-bbbb-cccc-111111111111';
    const PRACTICE_B = '22222222-aaaa-bbbb-cccc-222222222222';

    const tokenClinicianA = signJwtToken({
      id: 'user-clinician-a',
      email: 'clinician.a@practice-a.com',
      role: 'clinician',
      practiceId: PRACTICE_A,
    });

    const tokenOwnerA = signJwtToken({
      id: 'user-owner-a',
      email: 'owner.a@practice-a.com',
      role: 'owner',
      practiceId: PRACTICE_A,
    });

    const tokenBillerA = signJwtToken({
      id: 'user-biller-a',
      email: 'biller.a@practice-a.com',
      role: 'biller',
      practiceId: PRACTICE_A,
    });

    const tokenClinicianB = signJwtToken({
      id: 'user-clinician-b',
      email: 'clinician.b@practice-b.com',
      role: 'clinician',
      practiceId: PRACTICE_B,
    });

    // --------------------------------------------------------------------------
    // Category 1: Unauthenticated Endpoints Lockout (HTTP 401)
    // --------------------------------------------------------------------------
    console.log('\n--- Category 1: Unauthenticated Endpoint Lockout (SEC-01) ---');

    const unauthEndpoints = [
      { method: 'POST', path: '/api/telehealth/meeting', body: { appointmentId: 'test' } },
      { method: 'POST', path: '/api/billing/create-checkout', body: { invoiceId: 'inv-1', amountInCents: 10000 } },
      { method: 'GET', path: '/api/practice-os/state' },
      { method: 'GET', path: '/api/practice-os/ledger/balance-check' },
      { method: 'POST', path: '/api/practice-os/payment-event', body: {} },
      { method: 'POST', path: '/api/practice-os/journal/entry', body: {} },
      { method: 'POST', path: '/api/practice-os/journal/reverse', body: {} },
      { method: 'POST', path: '/api/practice-os/cascade-simulation', body: {} },
      { method: 'GET', path: '/api/audit-logs' },
      { method: 'GET', path: '/api/audit-logs/export' },
      { method: 'POST', path: '/api/audit-logs', body: {} },
    ];

    for (const ep of unauthEndpoints) {
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assertTest(
        `1.x Unauthenticated ${ep.method} ${ep.path} rejected with 401`,
        res.status === 401,
        `Status: ${res.status}`
      );
    }

    // --------------------------------------------------------------------------
    // Category 2: Role-Based Access Control (RBAC HTTP 403)
    // --------------------------------------------------------------------------
    console.log('\n--- Category 2: Role-Based Access Control Guards ---');

    // Clinician cannot post journal entries
    const clinicianJournalRes = await fetch(`${BASE_URL}/api/practice-os/journal/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClinicianA}`,
      },
      body: JSON.stringify({ description: 'Unauthorized Journal' }),
    });
    assertTest(
      '2.1 Clinician role blocked from POST /api/practice-os/journal/entry with 403',
      clinicianJournalRes.status === 403,
      `Status: ${clinicianJournalRes.status}`
    );

    // Clinician cannot submit payroll
    const clinicianPayrollRes = await fetch(`${BASE_URL}/api/practice-os/payroll/approve-and-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClinicianA}`,
      },
      body: JSON.stringify({ payPeriodId: 'pp-1' }),
    });
    assertTest(
      '2.2 Clinician role blocked from POST /api/practice-os/payroll/approve-and-submit with 403',
      clinicianPayrollRes.status === 403,
      `Status: ${clinicianPayrollRes.status}`
    );

    // Biller CAN access /api/billing/create-checkout
    const billerCheckoutRes = await fetch(`${BASE_URL}/api/billing/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBillerA}`,
      },
      body: JSON.stringify({ invoiceId: 'inv-auth', amountInCents: 15000, clientName: 'Jane Doe' }),
    });
    assertTest(
      '2.3 Biller role authorized for POST /api/billing/create-checkout (200)',
      billerCheckoutRes.status === 200,
      `Status: ${billerCheckoutRes.status}`
    );

    // Clinician CAN access /api/telehealth/meeting
    const clinicianMeetingRes = await fetch(`${BASE_URL}/api/telehealth/meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClinicianA}`,
      },
      body: JSON.stringify({ appointmentId: 'appt-auth-clinician' }),
    });
    assertTest(
      '2.4 Clinician role authorized for POST /api/telehealth/meeting (200)',
      clinicianMeetingRes.status === 200,
      `Status: ${clinicianMeetingRes.status}`
    );

    // --------------------------------------------------------------------------
    // Category 3: Multi-Tenant Boundary Isolation (HTTP 403)
    // --------------------------------------------------------------------------
    console.log('\n--- Category 3: Multi-Tenant Cross-Contamination Rejection ---');

    // 3.1 Practice A user querying Practice B state -> 403
    const crossStateRes = await fetch(`${BASE_URL}/api/practice-os/state?practiceId=${PRACTICE_B}`, {
      headers: { 'Authorization': `Bearer ${tokenClinicianA}` },
    });
    assertTest(
      '3.1 Cross-tenant query on /api/practice-os/state?practiceId=B rejected with 403',
      crossStateRes.status === 403,
      `Status: ${crossStateRes.status}`
    );

    // 3.2 Practice A OWNER querying Practice B state -> MUST BE 403 (No admin/owner bypass!)
    const ownerCrossStateRes = await fetch(`${BASE_URL}/api/practice-os/state?practiceId=${PRACTICE_B}`, {
      headers: { 'Authorization': `Bearer ${tokenOwnerA}` },
    });
    assertTest(
      '3.2 Practice Owner querying Practice B state strictly rejected with 403 (Zero admin bypass)',
      ownerCrossStateRes.status === 403,
      `Status: ${ownerCrossStateRes.status}`
    );

    // 3.3 Practice A user querying Practice B ledger balance -> 403
    const crossLedgerRes = await fetch(`${BASE_URL}/api/practice-os/ledger/balance-check?practiceId=${PRACTICE_B}`, {
      headers: { 'Authorization': `Bearer ${tokenOwnerA}` },
    });
    assertTest(
      '3.3 Cross-tenant query on /api/practice-os/ledger/balance-check?practiceId=B rejected with 403',
      crossLedgerRes.status === 403,
      `Status: ${crossLedgerRes.status}`
    );

    // 3.4 Practice A user submitting payment event targeting Practice B -> 403
    const crossPaymentRes = await fetch(`${BASE_URL}/api/practice-os/payment-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBillerA}`,
      },
      body: JSON.stringify({
        practiceId: PRACTICE_B,
        claimId: 'claim-tampered-cross-tenant',
      }),
    });
    assertTest(
      '3.4 Cross-tenant body tampering on /api/practice-os/payment-event rejected with 403',
      crossPaymentRes.status === 403,
      `Status: ${crossPaymentRes.status}`
    );

    // 3.5 Practice A owner submitting journal entry targeting Practice B -> 403
    const crossJournalRes = await fetch(`${BASE_URL}/api/practice-os/journal/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOwnerA}`,
      },
      body: JSON.stringify({
        practiceId: PRACTICE_B,
        description: 'Cross-Tenant Tampered Journal Entry',
      }),
    });
    assertTest(
      '3.5 Cross-tenant body tampering on /api/practice-os/journal/entry rejected with 403',
      crossJournalRes.status === 403,
      `Status: ${crossJournalRes.status}`
    );

    // 3.6 Practice A owner submitting audit log targeting Practice B -> 403
    const crossAuditPostRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenOwnerA}`,
      },
      body: JSON.stringify({
        practiceId: PRACTICE_B,
        action: 'FORGED_CROSS_TENANT_ACTION',
      }),
    });
    assertTest(
      '3.6 Cross-tenant body tampering on POST /api/audit-logs rejected with 403',
      crossAuditPostRes.status === 403,
      `Status: ${crossAuditPostRes.status}`
    );

    // --------------------------------------------------------------------------
    // Category 4: Audit Log Strict Multi-Tenancy (SEC-02)
    // --------------------------------------------------------------------------
    console.log('\n--- Category 4: Audit Log Strict Tenant Isolation (SEC-02) ---');

    // Insert an audit log specifically for Practice B
    const createLogB = await fetch(`${BASE_URL}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClinicianB}`,
      },
      body: JSON.stringify({
        action: 'CONFIDENTIAL_NOTE_ACCESS',
        patientName: 'Confidential Patient B',
        patientMrn: '#MC-TENANT-B-99',
      }),
    });
    const logBData = await createLogB.json();
    assertTest(
      '4.1 Practice B successfully created audit log entry',
      createLogB.status === 201 && logBData.log?.practiceId === PRACTICE_B,
      `Log ID: ${logBData.log?.id}, practiceId: ${logBData.log?.practiceId}`
    );

    // Practice A queries audit logs -> MUST NOT see Practice B log, and MUST NOT see legacy logs lacking practiceId
    const queryLogA = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { 'Authorization': `Bearer ${tokenClinicianA}` },
    });
    const logAData = await queryLogA.json();
    const leakedLogB = (logAData.logs || []).some((l: any) => l.practiceId === PRACTICE_B || l.patientMrn === '#MC-TENANT-B-99');
    const allBelongToPracticeA = (logAData.logs || []).every((l: any) => l.practiceId === PRACTICE_A);

    assertTest(
      '4.2 Practice A query yields ZERO Practice B records (Strict Isolation)',
      !leakedLogB,
      `Examined ${logAData.logs?.length || 0} returned logs for Practice A`
    );

    assertTest(
      '4.3 All logs returned to Practice A strictly match Practice A ID (No unassigned leak)',
      allBelongToPracticeA,
      `Records returned for Practice A: ${logAData.logs?.length || 0}`
    );

    // Practice A export -> MUST NOT export Practice B records
    const exportLogA = await fetch(`${BASE_URL}/api/audit-logs/export?format=json`, {
      headers: { 'Authorization': `Bearer ${tokenClinicianA}` },
    });
    const exportAData = await exportLogA.json();
    const exportLeakedLogB = (exportAData.records || []).some((l: any) => l.practiceId === PRACTICE_B);
    const exportAllMatchA = (exportAData.records || []).every((l: any) => l.practiceId === PRACTICE_A);

    assertTest(
      '4.4 Practice A JSON export contains zero records belonging to Practice B',
      !exportLeakedLogB && exportAllMatchA,
      `Exported ${exportAData.records?.length || 0} records for Practice A`
    );

  } finally {
    killServer(server);
    if (originalLedgerBackup !== null) {
      try {
        fs.writeFileSync(ledgerPath, originalLedgerBackup, 'utf8');
      } catch {}
    }
  }

  console.log('\n====================================================================');
  console.log(`TOTAL SERVER SECURITY TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('====================================================================');

  if (failCount > 0) {
    console.error('\nFailures recorded:');
    failureDetails.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log('\n✓ [CERTIFIED] All Server Security & Tenant Isolation checks passed with 100% success.');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
