#!/usr/bin/env node
/**
 * Unified E2E Test Suite Runner
 * Orchestrates and executes all 4 tiers of end-to-end tests:
 * - Tier 1: Feature Coverage (7 core platform features)
 * - Tier 2: Boundary & Corner Cases (negative, malformed, security)
 * - Tier 3: Cross-Feature Combinations & State Flow (interactions & pipelines)
 * - Tier 4: Real-World Clinical Workload Scenarios (complete journeys)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestServer, stopTestServer, DEFAULT_TEST_PORT } from './test-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUITES = [
  {
    tier: 'Tier 1',
    name: 'Feature Coverage',
    file: 'tier1-features.test.mjs',
    description: 'Comprehensive isolated validation across all 7 core platform features',
  },
  {
    tier: 'Tier 2',
    name: 'Boundary & Corner Cases',
    file: 'tier2-boundaries.test.mjs',
    description: 'Negative probing, empty inputs, prototype safety, security boundaries',
  },
  {
    tier: 'Tier 3',
    name: 'Cross-Feature Combinations',
    file: 'tier3-interactions.test.mjs',
    description: 'Interactions between Auth, Subscription, Scribe, Aura, Scrubber & EHR',
  },
  {
    tier: 'Tier 4',
    name: 'Real-World Clinical Scenarios',
    file: 'tier4-scenarios.test.mjs',
    description: 'End-to-end clinical encounter journeys from intake to de-identification',
  },
];

function runSuite(suiteFile) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, suiteFile);
    const start = Date.now();

    const proc = spawn('node', [fullPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        TEST_PORT: String(DEFAULT_TEST_PORT),
        FORCE_COLOR: '1',
      },
    });

    proc.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      resolve({ code: code ?? 0, duration });
    });
  });
}

async function main() {
  const overallStart = Date.now();

  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   Clinical Telehealth & AI Scribe SaaS — Comprehensive E2E Test Suite    ║');
  console.log('║   Tiers 1–4 Opaque-Box End-to-End Verification Harness                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  console.log('Initializing shared Express test server runtime...');
  const server = await startTestServer(DEFAULT_TEST_PORT);
  console.log(`✓ Test server operational on ${server.url}\n`);

  const results = [];
  let allPassed = true;

  for (const suite of SUITES) {
    console.log(`\n▶ Executing ${suite.tier}: ${suite.name}...`);
    console.log(`  Description: ${suite.description}`);
    console.log('  ──────────────────────────────────────────────────────────────────');

    const result = await runSuite(suite.file);
    const passed = result.code === 0;
    if (!passed) allPassed = false;

    results.push({
      ...suite,
      passed,
      duration: result.duration,
    });
  }

  console.log('\nTerminating test server...');
  await stopTestServer();
  console.log('✓ Test server shutdown cleanly.\n');

  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);

  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         E2E TEST HARNESS SUMMARY                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    const icon = r.passed ? '✓ PASS' : '❌ FAIL';
    const line = `║  [${icon}] ${r.tier.padEnd(8)}: ${r.name.padEnd(32)} (${r.duration}s)`.padEnd(74) + '║';
    console.log(line);
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  const verdictText = allPassed ? 'ALL TIERS PASSED (100% SUCCESS)' : 'SUITE FAILED';
  console.log(`║  Total Suites: 4 | Verdict: ${verdictText.padEnd(35)} (${overallDuration}s) ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unified runner error:', err);
  stopTestServer().finally(() => process.exit(1));
});
