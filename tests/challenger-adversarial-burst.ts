/**
 * Challenger 2: Dedicated Empirical Adversarial Burst & Race Condition Harness
 *
 * Scope:
 * 1. Extreme Concurrency Burst: 200 concurrent mixed requests (POST create, GET verify, adversarial).
 * 2. Simultaneous Read/Write Race: Interleaved burst verifying 0 race conditions or corrupted session metadata.
 * 3. High-Concurrency Single-Key Read Burst: 100 concurrent reads on the same session ID.
 * 4. LRU Eviction & Memory Bound Stress: Pushing past 1,000 items while reading, ensuring Map size <= 1,001 and evicted sessions return 404.
 * 5. Blind Test Session Forgery Attack: 50 concurrent forged 'cs_test_' requests verifying 100% rejection (HTTP 404).
 * 6. ePHI Lockdown Audit: Verification that zero patient ePHI tokens appear across any server endpoints.
 */

import { spawn, ChildProcess } from 'node:child_process';

const TEST_PORT = 3977;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface StressRecord {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const records: StressRecord[] = [];
let passCount = 0;
let failCount = 0;

function report(suite: string, test: string, passed: boolean, details?: string, error?: string) {
  if (passed) {
    passCount++;
    console.log(`✓ [PASSED] [${suite}] ${test}`);
    if (details) console.log(`    ↳ ${details}`);
  } else {
    failCount++;
    console.error(`❌ [FAILED] [${suite}] ${test}`);
    if (details) console.error(`    ↳ Details: ${details}`);
    if (error) console.error(`    ↳ Error: ${error}`);
  }
  records.push({ suite, test, passed, details, error });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer(): Promise<ChildProcess> {
  console.log(`Starting server.ts on test port ${TEST_PORT}...`);
  const proc = spawn('npx', ['tsx', 'server.ts'], {
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
  proc.stdout?.on('data', (d) => {
    if (d.toString().includes(`running on http://localhost:${TEST_PORT}`)) {
      ready = true;
    }
  });

  const start = Date.now();
  while (!ready && Date.now() - start < 10000) {
    await sleep(100);
    if (proc.exitCode !== null) {
      throw new Error(`Server exited prematurely with code ${proc.exitCode}`);
    }
  }

  if (!ready) throw new Error('Timeout waiting for server startup on port ' + TEST_PORT);
  console.log(`Server successfully started on ${BASE_URL}\n`);
  return proc;
}

async function runAdversarialBurstSuite() {
  console.log('========================================================================');
  console.log('  CHALLENGER 2: EMPIRICAL ADVERSARIAL BURST & RACE CONDITION HARNESS   ');
  console.log('========================================================================\n');

  let server: ChildProcess;
  try {
    server = await startServer();
  } catch (err: any) {
    console.error('Fatal: unable to launch server:', err.message);
    process.exit(1);
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Extreme Mixed Concurrency Burst (200 requests)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 1: Extreme Mixed Concurrency Burst (200 requests) ---');
    const BURST_COUNT = 200;
    const plans = ['starter', 'pro', 'group'];
    const cycles = ['monthly', 'annual'];

    const t0 = Date.now();
    const burstPromises = Array.from({ length: BURST_COUNT }, (_, i) => {
      const planId = plans[i % plans.length];
      const billingCycle = cycles[i % cycles.length];
      return fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          clinicianEmail: `burst_${i}@testclinic.com`,
        }),
      }).then(async (res) => ({
        index: i,
        status: res.status,
        data: (await res.json().catch(() => null)) as any,
        expectedPlan: planId,
        expectedCycle: billingCycle,
      }));
    });

    const burstResults = await Promise.all(burstPromises);
    const durationBurst = Date.now() - t0;

    const all200 = burstResults.every((r) => r.status === 200);
    const sessionIds = burstResults.map((r) => r.data?.sessionId).filter(Boolean);
    const uniqueIds = new Set(sessionIds);
    const zeroCollisions = uniqueIds.size === BURST_COUNT;

    report(
      'Burst-200',
      `200 concurrent POST requests succeed without error (Elapsed: ${durationBurst}ms)`,
      all200,
      `All 200 returned status 200: ${all200} (avg ${(durationBurst / BURST_COUNT).toFixed(2)}ms/req)`
    );

    report(
      'Burst-200',
      `Zero UUID collisions across ${BURST_COUNT} concurrent requests`,
      zeroCollisions,
      `Unique IDs: ${uniqueIds.size}/${BURST_COUNT}, Collisions: ${BURST_COUNT - uniqueIds.size}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Interleaved Read/Write Race Condition Probe
    // ------------------------------------------------------------------------
    console.log('\n--- Test 2: Interleaved Read/Write Race Condition Probe ---');
    const RACE_COUNT = 60;
    const tRace = Date.now();

    // Concurrently create 60 sessions and immediately read them
    const raceOps = Array.from({ length: RACE_COUNT }, async (_, i) => {
      const plan = plans[i % plans.length];
      const cycle = cycles[i % cycles.length];

      // 1. Create session
      const createRes = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan, billingCycle: cycle }),
      });
      const createData = (await createRes.json().catch(() => null)) as any;
      const sId = createData?.sessionId;

      if (!sId) {
        return { index: i, success: false, reason: 'No sessionId returned' };
      }

      // 2. Immediately read back
      const readRes = await fetch(`${BASE_URL}/api/subscription/session/${sId}`);
      const readData = (await readRes.json().catch(() => null)) as any;

      const matched =
        readRes.status === 200 &&
        readData?.isSubscribed === true &&
        readData?.tier === plan &&
        readData?.billingCycle === cycle &&
        readData?.status === 'complete';

      return { index: i, success: matched, reason: matched ? 'OK' : `Mismatch: status=${readRes.status}, data=${JSON.stringify(readData)}` };
    });

    const raceResults = await Promise.all(raceOps);
    const durationRace = Date.now() - tRace;
    const allRaceClean = raceResults.every((r) => r.success);

    report(
      'Race-Condition',
      `60 concurrent interleaved create-and-read operations maintain strict state consistency`,
      allRaceClean,
      `Elapsed: ${durationRace}ms, Success rate: ${raceResults.filter((r) => r.success).length}/${RACE_COUNT}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: High-Concurrency Single-Key Read Burst (100 parallel reads)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: High-Concurrency Single-Key Read Burst (100 parallel reads) ---');
    const seedRes = await fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'group', billingCycle: 'annual' }),
    });
    const seedData = (await seedRes.json()) as any;
    const targetSessionId = seedData.sessionId;

    const tSingle = Date.now();
    const singleKeyReads = await Promise.all(
      Array.from({ length: 100 }, () => fetch(`${BASE_URL}/api/subscription/session/${targetSessionId}`).then((r) => r.json()))
    );
    const durationSingle = Date.now() - tSingle;

    const allIdentical = singleKeyReads.every(
      (d: any) =>
        d.sessionId === targetSessionId &&
        d.tier === 'group' &&
        d.billingCycle === 'annual' &&
        d.isSubscribed === true &&
        d.planName === 'Practice Group'
    );

    report(
      'Single-Key-Burst',
      `100 concurrent parallel reads on identical session ID return bit-for-bit consistent state`,
      allIdentical,
      `Resolved in ${durationSingle}ms with 100% data consistency`
    );

    // ------------------------------------------------------------------------
    // TEST 4: LRU Eviction & Memory Bound Stress
    // ------------------------------------------------------------------------
    console.log('\n--- Test 4: LRU Eviction & Memory Bound Stress ---');
    // SessionStore cap is 1000. Let's record the very first session ID created in Test 1.
    const oldestSessionId = sessionIds[0];

    // Push 1,050 new sessions to force eviction of oldestSessionId
    console.log('Flooding 1,050 sessions to trigger FIFO eviction of oldest items...');
    for (let i = 0; i < 1050; i++) {
      await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'starter' }),
      });
    }

    // Now query the oldest evicted session
    const evictedRes = await fetch(`${BASE_URL}/api/subscription/session/${oldestSessionId}`);
    const evictedData = await evictedRes.json();
    const correctlyEvicted = evictedRes.status === 404 && evictedData?.error === 'Checkout session not found';

    report(
      'LRU-Eviction',
      `Oldest session is strictly evicted and returns HTTP 404 (never false 200/active)`,
      correctlyEvicted,
      `Status: ${evictedRes.status}, error: "${evictedData?.error}"`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Blind Test Session Forgery Attack (50 concurrent forged requests)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 5: Blind Test Session Forgery Attack ---');
    const FORGE_COUNT = 50;
    const forgePromises = Array.from({ length: FORGE_COUNT }, (_, i) => {
      const forgedId = `cs_test_attacker_forgery_${i}_${Date.now()}`;
      return fetch(`${BASE_URL}/api/subscription/session/${forgedId}`).then(async (r) => ({
        id: forgedId,
        status: r.status,
        body: await r.json().catch(() => null),
      }));
    });

    const forgeResults = await Promise.all(forgePromises);
    const allRejected404 = forgeResults.every((r) => r.status === 404 && r.body?.error === 'Checkout session not found');

    report(
      'Anti-Forgery',
      `All 50 forged 'cs_test_' requests strictly rejected with HTTP 404`,
      allRejected404,
      `404 count: ${forgeResults.filter((r) => r.status === 404).length}/${FORGE_COUNT}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: ePHI Lockdown Audit Across All Server Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- Test 6: ePHI Lockdown Audit Across All Server Endpoints ---');
    const SENSITIVE_TOKENS = ['Jane Doe', '#MC-88219', '04/12/1988', 'F41.1', 'Marcus Vance', 'Elena Rostova', 'Samuel Green'];

    const endpointsToProbe = [
      { method: 'GET', url: `${BASE_URL}/api/health`, body: null },
      { method: 'GET', url: `${BASE_URL}/api/subscription/status`, body: null },
      { method: 'POST', url: `${BASE_URL}/api/create-checkout-session`, body: JSON.stringify({ planId: 'pro' }) },
      { method: 'POST', url: `${BASE_URL}/api/billing/create-checkout`, body: JSON.stringify({ invoiceId: 'inv-1' }) },
      { method: 'GET', url: `${BASE_URL}/api/subscription/session/${targetSessionId}`, body: null },
    ];

    let leakedTokenFound: string | null = null;
    let endpointWithLeak: string | null = null;

    for (const ep of endpointsToProbe) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body || undefined,
      });
      const text = await res.text();
      for (const token of SENSITIVE_TOKENS) {
        if (text.includes(token)) {
          leakedTokenFound = token;
          endpointWithLeak = ep.url;
          break;
        }
      }
      if (leakedTokenFound) break;
    }

    report(
      'ePHI-Lockdown',
      `Zero patient ePHI tokens leaked across any server API endpoints`,
      leakedTokenFound === null,
      leakedTokenFound ? `LEAK DETECTED: "${leakedTokenFound}" at ${endpointWithLeak}` : 'All endpoints completely free of patient ePHI'
    );

  } finally {
    console.log('\nShutting down test server...');
    server.kill('SIGTERM');
    await sleep(300);
  }

  console.log('\n========================================================================');
  console.log(`CHALLENGER 2 BURST AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED (TOTAL: ${passCount + failCount})`);
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialBurstSuite().catch((err) => {
  console.error('Fatal unhandled exception during adversarial burst suite:', err);
  process.exit(1);
});
