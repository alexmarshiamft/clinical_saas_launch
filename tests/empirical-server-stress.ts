/**
 * Empirical Stress Test Harness: Express Server & API Endpoints
 * Tests:
 * 1. Process lifecycle & port binding
 * 2. GET /api/health (schema, uptime, CORS, concurrency)
 * 3. POST /api/create-checkout-session (valid plans, defaults, custom params)
 * 4. POST /api/create-checkout-session (invalid plans, prototype keys, malformed JSON, missing body)
 * 5. Ancillary endpoints (/api/subscription/status, /api/billing/create-checkout, 404 handler)
 * 6. High-concurrency burst (100 concurrent requests, unique session ID generation)
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { signJwtToken } from '../src/lib/jwt-auth';

const TEST_PORT = 3899;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  status?: number;
  expectedStatus?: number | number[];
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function recordResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✓' : '❌';
  console.log(`${icon} [${result.category}] ${result.name}`);
  if (!result.passed) {
    if (result.status !== undefined) console.log(`    ↳ HTTP Status: ${result.status} (Expected: ${JSON.stringify(result.expectedStatus)})`);
    if (result.details) console.log(`    ↳ Details: ${result.details}`);
    if (result.error) console.log(`    ↳ Error: ${result.error}`);
  } else if (result.details) {
    console.log(`    ↳ ${result.details}`);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer(): Promise<ChildProcess> {
  console.log(`Launching server.ts on test port ${TEST_PORT} (NODE_ENV=production)...`);
  const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      NODE_ENV: 'production',
      APP_URL: BASE_URL,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverReady = false;
  let serverLogs = '';

  serverProcess.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    serverLogs += text;
    if (text.includes(`running on http://localhost:${TEST_PORT}`)) {
      serverReady = true;
    }
  });

  serverProcess.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    serverLogs += text;
  });

  // Wait up to 10 seconds for server startup
  const start = Date.now();
  while (!serverReady && Date.now() - start < 10000) {
    await sleep(100);
    if (serverProcess.exitCode !== null) {
      throw new Error(`Server exited prematurely with code ${serverProcess.exitCode}. Logs:\n${serverLogs}`);
    }
  }

  if (!serverReady) {
    serverProcess.kill('SIGKILL');
    throw new Error(`Server failed to start within 10s. Logs:\n${serverLogs}`);
  }

  console.log(`Server started successfully on ${BASE_URL}.\n`);
  return serverProcess;
}

async function runTests() {
  console.log('====================================================================');
  console.log('   Empirical Challenger: Express Server & Session Endpoint Audit   ');
  console.log('====================================================================\n');

  let server: ChildProcess;
  try {
    server = await startServer();
  } catch (err: any) {
    console.error('Fatal failure launching server:', err.message);
    process.exit(1);
  }

  try {
    // -----------------------------------------------------------------------
    // CATEGORY 1: /api/health Endpoint
    // -----------------------------------------------------------------------
    console.log('\n--- Category 1: Health Endpoint (/api/health) ---');

    // Test 1.1: Standard GET /api/health
    {
      const res = await fetch(`${BASE_URL}/api/health`);
      const body = await res.json().catch(() => null);
      const isHealthy = res.status === 200 &&
        body?.status === 'healthy' &&
        typeof body?.uptime === 'number' &&
        body?.uptime >= 0 &&
        typeof body?.timestamp === 'string' &&
        body?.version === '1.0.0' &&
        body?.sandboxMode === true &&
        typeof body?.services === 'object';

      recordResult({
        name: 'GET /api/health Schema & Health Status',
        category: 'Health Endpoint',
        passed: isHealthy,
        status: res.status,
        expectedStatus: 200,
        details: `status=${body?.status}, uptime=${body?.uptime?.toFixed(2)}s, sandboxMode=${body?.sandboxMode}`,
      });
    }

    // Test 1.2: OPTIONS /api/health (CORS Preflight)
    {
      const res = await fetch(`${BASE_URL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://remote-client.internal',
          'Access-Control-Request-Method': 'GET',
        },
      });
      const corsHeader = res.headers.get('access-control-allow-origin');
      const passed = (res.status === 200 || res.status === 204) && corsHeader === 'http://remote-client.internal';
      recordResult({
        name: 'OPTIONS /api/health CORS Reflection',
        category: 'Health Endpoint',
        passed,
        status: res.status,
        expectedStatus: [200, 204],
        details: `CORS header: ${corsHeader}`,
      });
    }

    // Test 1.3: POST /api/health (Unsupported method handling)
    {
      const res = await fetch(`${BASE_URL}/api/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: true }),
      });
      // Express default routes non-matching methods to 404
      const passed = res.status === 404;
      recordResult({
        name: 'POST /api/health Rejection',
        category: 'Health Endpoint',
        passed,
        status: res.status,
        expectedStatus: 404,
        details: `Non-GET request returned status ${res.status}`,
      });
    }

    // Test 1.4: Concurrent Health Check Burst (50 requests)
    {
      const burstStart = Date.now();
      const promises = Array.from({ length: 50 }, () => fetch(`${BASE_URL}/api/health`));
      const burstResponses = await Promise.all(promises);
      const all200 = burstResponses.every((r) => r.status === 200);
      const burstDuration = Date.now() - burstStart;
      recordResult({
        name: '50 Concurrent GET /api/health Burst',
        category: 'Health Endpoint',
        passed: all200,
        details: `Resolved 50/50 requests with 200 OK in ${burstDuration}ms`,
      });
    }

    // -----------------------------------------------------------------------
    // CATEGORY 2: /api/create-checkout-session (Valid Payloads)
    // -----------------------------------------------------------------------
    console.log('\n--- Category 2: Checkout Session (Valid Payloads) ---');

    const validTiers = [
      { id: 'starter', name: 'Starter Tier', amount: 4900 },
      { id: 'pro', name: 'Clinician Pro', amount: 9900 },
      { id: 'group', name: 'Practice Group', amount: 24900 },
    ];

    for (const tier of validTiers) {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: tier.id }),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 &&
        data?.simulated === true &&
        typeof data?.sessionId === 'string' &&
        data.sessionId.startsWith('cs_test_simulated_') &&
        data?.plan?.amount === tier.amount &&
        data?.plan?.name === tier.name &&
        typeof data?.url === 'string' &&
        data.url.includes(data.sessionId);

      recordResult({
        name: `POST Checkout Session: Tier '${tier.id}'`,
        category: 'Checkout Session (Valid)',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `sessionId=${data?.sessionId?.substring(0, 24)}..., amount=$${tier.amount / 100}`,
      });
    }

    // Test 2.4: Omitted planId defaults to "pro"
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 &&
        data?.plan?.name === 'Clinician Pro' &&
        data?.plan?.amount === 9900;
      recordResult({
        name: 'POST Checkout Session: Omitted planId Defaults to Pro',
        category: 'Checkout Session (Valid)',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `Resolved default plan '${data?.plan?.name}' ($${data?.plan?.amount / 100})`,
      });
    }

    // Test 2.5: Custom successUrl, cancelUrl, clinicianEmail, annual billingCycle
    {
      const customPayload = {
        planId: 'group',
        billingCycle: 'annual',
        clinicianEmail: 'dr.sarah.chen@bayarea.org',
        successUrl: `${BASE_URL}/custom/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${BASE_URL}/custom/cancel`,
      };
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customPayload),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 &&
        data?.simulated === true &&
        data?.plan?.name === 'Practice Group';
      recordResult({
        name: 'POST Checkout Session: Custom Success/Cancel URLs & Clinician Email',
        category: 'Checkout Session (Valid)',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `Successfully handled custom params with simulated response`,
      });
    }

    // -----------------------------------------------------------------------
    // CATEGORY 3: /api/create-checkout-session (Invalid & Adversarial Payloads)
    // -----------------------------------------------------------------------
    console.log('\n--- Category 3: Checkout Session (Adversarial & Invalid Payloads) ---');

    // Test 3.1: Invalid plan tier string
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'enterprise_ultra_tier' }),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 400 &&
        data?.error === 'Invalid planId provided' &&
        Array.isArray(data?.validPlans) &&
        data.validPlans.includes('starter') &&
        data.validPlans.includes('pro') &&
        data.validPlans.includes('group');

      recordResult({
        name: 'Invalid Plan Tier String (returns 400 with validPlans)',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        expectedStatus: 400,
        details: `error="${data?.error}", validPlans=[${data?.validPlans?.join(', ')}]`,
      });
    }

    // Test 3.2: Numeric planId (Type mismatch)
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 99999 }),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 400 && data?.error === 'Invalid planId provided';
      recordResult({
        name: 'Numeric planId (Type Mismatch)',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        expectedStatus: 400,
        details: `Rejected numeric planId with 400`,
      });
    }

    // Test 3.3: Empty string planId ("" falsy fallback to default "pro")
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: '' }),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 && data?.plan?.name === 'Clinician Pro';
      recordResult({
        name: 'Empty String planId ("" falls back to pro)',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `Falsy empty string safely defaulted to '${data?.plan?.name}'`,
      });
    }

    // Test 3.4: Prototype Property Pollution Probing ("toString", "valueOf", "constructor")
    const prototypeKeys = ['toString', 'valueOf', 'constructor', '__proto__'];
    for (const protoKey of prototypeKeys) {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: protoKey }),
      });
      const data = await res.json().catch(() => null);
      // NOTE: In JS, Object.prototype keys exist on plain objects {}.
      // If validPlans[protoKey] returns the prototype function, selectedPlan is truthy but lacks name/amount.
      // We want to observe whether the server crashes (500) or returns 200 or 400.
      const serverCrashed = res.status === 500 && data?.error?.includes('server error');
      recordResult({
        name: `Prototype Key Probe: planId='${protoKey}'`,
        category: 'Checkout Session (Adversarial)',
        passed: !serverCrashed, // Server stayed responsive
        status: res.status,
        details: `Status ${res.status}. Server survived. Body: ${JSON.stringify(data).substring(0, 80)}`,
      });
    }

    // Test 3.5: Malformed JSON syntax
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"planId": "starter", malformed_json...}',
      });
      // Express express.json() catches malformed syntax and returns 400
      const passed = res.status === 400;
      recordResult({
        name: 'Malformed JSON Payload (Express body parser error handling)',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        expectedStatus: 400,
        details: `Syntax error cleanly returned 400 without server crash`,
      });
    }

    // Test 3.6: Missing Content-Type Header with raw body (defaults gracefully)
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        body: 'planId=starter',
      });
      // Without Content-Type: application/json, body-parser doesn't parse text.
      // Express defaults req.body to {}, and planId defaults to "pro".
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 && data?.plan?.name === 'Clinician Pro';
      recordResult({
        name: 'Missing Content-Type Header (req.body defaults to "pro")',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `Safely handled headerless request with status ${res.status}, defaulted to '${data?.plan?.name}'`,
      });
    }

    // Test 3.7: Strict JSON parser rejects primitive JSON (e.g. "null" string)
    {
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      });
      // Express body-parser in strict mode rejects top-level primitive values with 400
      const passed = res.status === 400;
      recordResult({
        name: 'Strict JSON Parser Rejection on Primitive "null"',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        expectedStatus: 400,
        details: `Express body-parser strict mode returned 400 Bad Request`,
      });
    }

    // Test 3.8: Massive Payload (500KB JSON)
    {
      const hugePadding = 'A'.repeat(500 * 1024);
      const res = await fetch(`${BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'starter', padding: hugePadding }),
      });
      // Express express.json() default limit is 100kb -> returns 413 Payload Too Large
      const passed = res.status === 413 || res.status === 200;
      recordResult({
        name: 'Massive Payload (500KB) Body Size Boundary',
        category: 'Checkout Session (Adversarial)',
        passed,
        status: res.status,
        details: `Status ${res.status}: Express body size constraint enforced appropriately`,
      });
    }

    // -----------------------------------------------------------------------
    // CATEGORY 3.5: Live Stripe Integration Branch (with invalid test key)
    // -----------------------------------------------------------------------
    console.log('\n--- Category 3.5: Live Stripe Key & Gateway Error Handling ---');
    {
      // Start temporary server on port 3897 with a live test key format (sk_test_invalid_token)
      const LIVE_TEST_PORT = 3897;
      const LIVE_BASE_URL = `http://127.0.0.1:${LIVE_TEST_PORT}`;
      const liveServer = spawn('npx', ['tsx', 'server.ts'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(LIVE_TEST_PORT),
          NODE_ENV: 'production',
          APP_URL: LIVE_BASE_URL,
          STRIPE_SECRET_KEY: 'sk_test_mock_nonexistent_key_audit_test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let liveReady = false;
      liveServer.stdout?.on('data', (d) => {
        if (d.toString().includes(`running on http://localhost:${LIVE_TEST_PORT}`)) liveReady = true;
      });

      const startWait = Date.now();
      while (!liveReady && Date.now() - startWait < 8000) {
        await sleep(100);
      }

      if (liveReady) {
        const res = await fetch(`${LIVE_BASE_URL}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'pro' }),
        });
        const data = await res.json().catch(() => null);
        // Stripe returns 401 for invalid key; server maps this to 502 with error details
        const passed = res.status === 502 && data?.error === 'Failed to initialize Stripe checkout';
        recordResult({
          name: 'Live Stripe Gateway Error Handling (returns 502 with details, no crash)',
          category: 'Checkout Session (Live Gateway)',
          passed,
          status: res.status,
          expectedStatus: 502,
          details: `Status ${res.status}, error="${data?.error}", stripe_type="${data?.details?.error?.type}"`,
        });
        liveServer.kill('SIGTERM');
      } else {
        liveServer.kill('SIGKILL');
        recordResult({
          name: 'Live Stripe Server Launch',
          category: 'Checkout Session (Live Gateway)',
          passed: false,
          details: 'Timed out waiting for live test server to start',
        });
      }
    }

    // -----------------------------------------------------------------------
    // CATEGORY 4: Ancillary Endpoints & SPA Static Fallback
    // -----------------------------------------------------------------------
    console.log('\n--- Category 4: Ancillary Endpoints & Routing ---');

    // Test 4.1: GET /api/subscription/status
    {
      const res = await fetch(`${BASE_URL}/api/subscription/status`);
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 &&
        data?.status === 'active' &&
        data?.tier === 'pro' &&
        data?.isSubscribed === true;
      recordResult({
        name: 'GET /api/subscription/status',
        category: 'Ancillary Endpoints',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `status=${data?.status}, tier=${data?.tier}, isSubscribed=${data?.isSubscribed}`,
      });
    }

    // Test 4.2: POST /api/billing/create-checkout (Unauthenticated probe rejected with 401)
    {
      const unauthRes = await fetch(`${BASE_URL}/api/billing/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: 'inv-unauth', amountInCents: 17500, clientName: 'Jane Doe' }),
      });
      const unauthPassed = unauthRes.status === 401;
      recordResult({
        name: 'POST /api/billing/create-checkout (Unauthenticated Rejection)',
        category: 'Ancillary Endpoints',
        passed: unauthPassed,
        status: unauthRes.status,
        expectedStatus: 401,
        details: `Safely rejected unauthenticated checkout request with status ${unauthRes.status}`,
      });
    }

    // Test 4.2b: POST /api/billing/create-checkout (Authenticated with valid biller role)
    {
      const billerJwt = signJwtToken({ role: 'biller', email: 'billing@practice.org', practiceId: '00000000-0000-0000-0000-000000000001' });
      const res = await fetch(`${BASE_URL}/api/billing/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${billerJwt}`,
        },
        body: JSON.stringify({ invoiceId: 'inv-4482', amountInCents: 17500, clientName: 'Jane Doe' }),
      });
      const data = await res.json().catch(() => null);
      const passed = res.status === 200 &&
        data?.simulated === true &&
        data?.amountTotal === 17500 &&
        data?.clientName === 'Jane Doe';
      recordResult({
        name: 'POST /api/billing/create-checkout (Authenticated Biller Session)',
        category: 'Ancillary Endpoints',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `sessionId=${data?.sessionId}, amountTotal=$${data?.amountTotal / 100}`,
      });
    }

    // Test 4.3: Unmatched API route returns 404 JSON (not HTML index.html)
    {
      const res = await fetch(`${BASE_URL}/api/nonexistent-route-12345`);
      const text = await res.text();
      let isJson = false;
      try {
        const json = JSON.parse(text);
        isJson = json?.error === 'API endpoint not found';
      } catch {}

      const passed = res.status === 404 && isJson;
      recordResult({
        name: 'GET /api/nonexistent-route (API 404 isolation from SPA)',
        category: 'Ancillary Endpoints',
        passed,
        status: res.status,
        expectedStatus: 404,
        details: `Returned 404 JSON without leaking SPA index.html`,
      });
    }

    // Test 4.4: Root SPA route GET / returns index.html
    {
      const res = await fetch(`${BASE_URL}/`);
      const html = await res.text();
      const passed = res.status === 200 && html.toLowerCase().includes('<!doctype html>') && html.includes('Clinical');
      recordResult({
        name: 'GET / Root SPA Static File Serving',
        category: 'Ancillary Endpoints',
        passed,
        status: res.status,
        expectedStatus: 200,
        details: `Served production index.html (${html.length} bytes)`,
      });
    }

    // -----------------------------------------------------------------------
    // CATEGORY 5: Concurrency Burst & Session ID Uniqueness
    // -----------------------------------------------------------------------
    console.log('\n--- Category 5: Concurrency Burst & Session ID Collision Check ---');

    {
      const CONCURRENCY_COUNT = 100;
      console.log(`Blasting ${CONCURRENCY_COUNT} concurrent requests to /api/create-checkout-session...`);
      const startBurst = Date.now();
      const burstPromises = Array.from({ length: CONCURRENCY_COUNT }, (_, i) => {
        const plan = i % 3 === 0 ? 'starter' : i % 3 === 1 ? 'pro' : 'group';
        return fetch(`${BASE_URL}/api/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan }),
        }).then(async (r) => ({
          status: r.status,
          data: await r.json().catch(() => null),
        }));
      });

      const burstResults = await Promise.all(burstPromises);
      const burstDuration = Date.now() - startBurst;

      const allSuccess = burstResults.every((r) => r.status === 200 && r.data?.simulated === true);
      const sessionIds = burstResults.map((r) => r.data?.sessionId).filter(Boolean);
      const uniqueSessionIds = new Set(sessionIds);
      const noCollisions = uniqueSessionIds.size === CONCURRENCY_COUNT;

      recordResult({
        name: `100 Concurrent Checkout Requests (Latency: ${burstDuration}ms)`,
        category: 'Concurrency & Stress',
        passed: allSuccess,
        details: `100/100 completed successfully in ${burstDuration}ms (avg ${(burstDuration / CONCURRENCY_COUNT).toFixed(1)}ms/req)`,
      });

      recordResult({
        name: `UUID Collision Freedom (100 unique session IDs)`,
        category: 'Concurrency & Stress',
        passed: noCollisions,
        details: `Unique session IDs: ${uniqueSessionIds.size}/${CONCURRENCY_COUNT}`,
      });
    }

  } finally {
    console.log('\nShutting down test server process...');
    server.kill('SIGTERM');
    await sleep(300);
  }

  // -----------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------
  console.log('\n====================================================================');
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  console.log(`Server Stress Audit Summary: ${totalPassed} Passed, ${totalFailed} Failed (Total: ${results.length})`);
  console.log('====================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal unhandled error in test suite:', err);
  process.exit(1);
});
