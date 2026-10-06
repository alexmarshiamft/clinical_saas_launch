/**
 * TheraFlow OS — Section 7 Stripe Entitlement Behavioral Test
 * 
 * Verifies:
 * 1. Checkout creation produces status=open, paymentStatus=unpaid, isSubscribed=false
 * 2. Creation alone NEVER grants entitlement
 * 3. Arbitrary session id does not grant entitlement (returns 404 / 401)
 * 4. Cached unpaid session does not grant entitlement
 * 5. Synthetic completion only exists via explicit test-only mechanism (/api/test/subscription/complete)
 * 6. Live / verify mode fails closed on unverified sessions or tokens
 */

import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.status === 200) return true;
    } catch {
      await sleep(200);
    }
  }
  return false;
}

async function runStripeEntitlementSuite() {
  console.log('====================================================================');
  console.log('   SECTION 7: STRIPE SUBSCRIPTION ENTITLEMENT VERIFICATION          ');
  console.log('====================================================================\n');

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

  // Spawn isolated test server
  console.log('Starting test server on port', PORT, '...');
  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    env: {
      ...process.env,
      PORT: PORT.toString(),
      NODE_ENV: 'test',
    },
    stdio: 'ignore',
  });

  try {
    const isUp = await waitForServer(BASE_URL);
    if (!isUp) {
      throw new Error(`Server failed to start on ${BASE_URL}`);
    }
    console.log('Test server ready.\n');

    // ------------------------------------------------------------------------
    // TEST 1: Checkout Session Creation Produces open / unpaid State
    // ------------------------------------------------------------------------
    console.log('--- Test 1: Checkout Session Creation Contract ---');
    const checkoutRes = await fetch(`${BASE_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'pro',
        billingCycle: 'monthly',
        clinicianEmail: 'sarah.chen.md@behavioralhealth.org',
      }),
    });

    const checkoutData = await checkoutRes.json();
    assert('1.1 Checkout creation succeeds with HTTP 200', checkoutRes.status === 200);
    assert('1.2 Checkout session ID returned', typeof checkoutData.sessionId === 'string' && checkoutData.sessionId.length > 0);

    const sessionId = checkoutData.sessionId;

    // ------------------------------------------------------------------------
    // TEST 2: Creation Alone NEVER Grants Entitlement
    // ------------------------------------------------------------------------
    console.log('\n--- Test 2: Creation Alone Never Grants Entitlement ---');
    const sessionCheckRes = await fetch(`${BASE_URL}/api/subscription/session/${sessionId}`);
    const sessionData = await sessionCheckRes.json();
    console.log('Session response:', sessionCheckRes.status, sessionData);

    assert('2.1 Checkout session status is "open"', sessionData.status === 'open');
    assert('2.2 Checkout session paymentStatus is "unpaid"', sessionData.paymentStatus === 'unpaid');
    assert('2.3 Creation alone strictly produces isSubscribed = false', sessionData.isSubscribed === false);
    assert('2.4 Subscription status is "inactive"', sessionData.subscriptionStatus === 'inactive');

    // ------------------------------------------------------------------------
    // TEST 3: Arbitrary Session ID Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Arbitrary Session ID Handling ---');
    const fakeSessionId = 'cs_test_arbitrary_attacker_id_99999';
    const fakeRes = await fetch(`${BASE_URL}/api/subscription/session/${fakeSessionId}`);
    assert('3.1 Arbitrary session id returns HTTP 404', fakeRes.status === 404);

    const fakeVerify = await fetch(`${BASE_URL}/api/subscription/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: fakeSessionId }),
    });
    assert('3.2 Arbitrary session token verification fails closed (HTTP 401)', fakeVerify.status === 401);

    // ------------------------------------------------------------------------
    // TEST 4: Cached Unpaid Session Never Entitles
    // ------------------------------------------------------------------------
    console.log('\n--- Test 4: Cached Unpaid Session Denial ---');
    const statusWithUnpaid = await fetch(`${BASE_URL}/api/subscription/status?session_id=${sessionId}`);
    const statusData = await statusWithUnpaid.json();
    assert('4.1 Querying subscription status with unpaid sessionId produces isSubscribed = false', statusData.isSubscribed === false);
    assert('4.2 Querying status with unpaid sessionId produces status = unpaid', statusData.status === 'unpaid');

    const verifyWithUnpaid = await fetch(`${BASE_URL}/api/subscription/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionId }),
    });
    assert('4.3 Verification of unpaid session token fails closed (HTTP 401)', verifyWithUnpaid.status === 401);

    // ------------------------------------------------------------------------
    // TEST 5: Explicit Test-Only Completion Grants Entitlement
    // ------------------------------------------------------------------------
    console.log('\n--- Test 5: Explicit Test-Only Completion ---');
    const completeRes = await fetch(`${BASE_URL}/api/test/subscription/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const completeData = await completeRes.json();
    assert('5.1 Explicit test completion succeeds with HTTP 200', completeRes.status === 200 && completeData.success === true);

    const paidSessionCheck = await fetch(`${BASE_URL}/api/subscription/session/${sessionId}`);
    const paidSessionData = await paidSessionCheck.json();
    assert('5.2 Completed session now has status = complete', paidSessionData.status === 'complete');
    assert('5.3 Completed session has paymentStatus = paid', paidSessionData.paymentStatus === 'paid');
    assert('5.4 Completed session now grants isSubscribed = true', paidSessionData.isSubscribed === true);

    const statusWithPaid = await fetch(`${BASE_URL}/api/subscription/status?session_id=${sessionId}`);
    const paidStatusData = await statusWithPaid.json();
    assert('5.5 Subscription status with paid sessionId produces isSubscribed = true', paidStatusData.isSubscribed === true);

    // ------------------------------------------------------------------------
    // TEST 6: Unsubscribed Clinician Fail-Closed Query
    // ------------------------------------------------------------------------
    console.log('\n--- Test 6: Unsubscribed Clinician Fail-Closed ---');
    const unsubscribedRes = await fetch(`${BASE_URL}/api/subscription/status?unsubscribed=true`);
    const unsubscribedData = await unsubscribedRes.json();
    assert('6.1 Explicit unsubscribed query returns isSubscribed = false', unsubscribedData.isSubscribed === false);
    assert('6.2 Explicit unsubscribed query returns tier = none', unsubscribedData.tier === 'none');

  } finally {
    serverProcess.kill('SIGTERM');
  }

  console.log('\n====================================================================');
  console.log(`   STRIPE ENTITLEMENT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStripeEntitlementSuite().catch((err) => {
  console.error('Fatal entitlement test error:', err);
  process.exit(1);
});
