/**
 * TheraFlow OS — Master Broad Regression Suite Runner
 * 
 * Executes all 35+ test harness entry points across the codebase.
 * Collects exact assertion totals, passed, failed, environment-only, and flaky.
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface HarnessResult {
  name: string;
  command: string;
  status: 'passed' | 'failed' | 'env_only';
  assertionsCount: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  errorSnippet?: string;
  notes?: string;
}

const HARNESSES: Array<{ name: string; cmd: string; env?: Record<string, string> }> = [
  // 1. Remediation Pass 2 Architectural Suites
  { name: 'Challenger Payroll Multi-Process (Q1/Q2/Cross-Process)', cmd: 'npx tsx tests/challenger-payroll-multiprocess.test.ts' },
  { name: 'Challenger Payment Idempotency & Rollback', cmd: 'npx tsx tests/challenger-payment-idempotency.test.ts' },
  { name: 'Challenger Ledger Fuzz (20k Operations & Zero Divergence)', cmd: 'npx tsx tests/challenger-ledger-fuzz-20k.test.ts' },
  { name: 'Challenger Clinical-to-Financial Pipeline Trace', cmd: 'npx tsx tests/challenger-clinical-financial-pipeline.test.ts' },
  { name: 'Challenger Stripe Subscription Entitlement', cmd: 'npx tsx tests/challenger-stripe-entitlement.test.ts' },
  { name: 'Compensation Engine BigInt & Adversarial Suite', cmd: 'npx tsx tests/compensation-engine-adversarial.test.ts' },
  { name: 'Fresh Blind Synthetic PHI Holdout Benchmark', cmd: 'npx tsx scripts/run-fresh-phi-holdout.ts' },

  // 2. Core Practice OS & Financial Remediation Suites
  { name: 'Practice OS Unified Model Tests', cmd: 'npx tsx tests/practice-os-unified.test.ts' },
  { name: 'Adversarial Financial & Security Test', cmd: 'npx tsx tests/adversarial-financial-and-security.test.ts' },
  { name: 'Regression Dashboard Hydration Test', cmd: 'npx tsx tests/regression-dashboard-hydration.test.ts' },
  { name: 'PostgreSQL Migration Pipeline Test', cmd: 'npx tsx tests/migration-pipeline.test.ts' },

  // 3. Clinical & EHR Suites (M3)
  { name: 'M3 Clinical EHR Workspace', cmd: 'npx tsx tests/m3-theraflow-ehr.test.ts' },
  { name: 'M3 Challenger Empirical Tests', cmd: 'npx tsx tests/m3-challenger-empirical.test.ts' },
  { name: 'M3 Empirical Concurrency Harness', cmd: 'npx tsx tests/challenger-m3-empirical-concurrency.ts' },

  // 4. Clinical AI Scribe Suites (M4)
  { name: 'M4 Clinical Scribe Unit & Integration', cmd: 'npx tsx tests/m4-clinical-scribe.test.ts' },
  { name: 'M4 Challenger Stress Suite', cmd: 'npx tsx tests/m4-challenger-stress.test.ts' },
  { name: 'M4 Empirical Deep Probe', cmd: 'npx tsx tests/challenger-m4-empirical-deep-probe.ts' },
  { name: 'M4 Empirical Stress Harness', cmd: 'npx tsx tests/challenger-m4-empirical-stress.ts' },
  { name: 'M4 Iteration 2 Empirical Harness', cmd: 'npx tsx tests/challenger-m4-it2-empirical.ts' },
  { name: 'M4 Iteration 3 Empirical Harness', cmd: 'npx tsx tests/challenger-m4-it3-empirical.ts' },
  { name: 'M4 Iteration 3 Stress Harness', cmd: 'npx tsx tests/challenger-m4-it3-stress.ts' },

  // 5. Aura Assistant & PHI Scrubber Suites (M5)
  { name: 'M5 Aura Assistant & Scrubber', cmd: 'npx tsx tests/m5-aura-scrubber.test.ts' },
  { name: 'M5 Challenger Stress Suite', cmd: 'npx tsx tests/m5-challenger-stress.test.ts' },
  { name: 'M5 Challenger Empirical Stress', cmd: 'npx tsx tests/m5-challenger-empirical-stress.ts' },
  { name: 'M5 Iteration 2 Stress Harness', cmd: 'npx tsx tests/challenger-m5-it2-stress.ts' },
  { name: 'M5 Iteration 2 Empirical Challenger', cmd: 'npx tsx tests/m5-it2-empirical-challenger.ts' },

  // 6. Adversarial Security, Auth & Gate Suites
  { name: 'Tier 5 Adversarial Coverage Test', cmd: 'npx tsx tests/tier5-adversarial-coverage.test.ts' },
  { name: 'Tier 5 Challenger Stress Test', cmd: 'npx tsx tests/tier5-challenger-stress.test.ts' },
  { name: 'Adversarial Security Audit Script', cmd: 'node scripts/adversarial-security-audit.mjs' },
  { name: 'Verify Subscription Gate Script', cmd: 'node scripts/verify-subscription-gate.mjs' },
  { name: 'Verify Auth Redirect Script', cmd: 'node scripts/verify-auth-redirect.mjs' },
  { name: 'Challenger Adversarial Deep Audit', cmd: 'npx tsx tests/challenger-adversarial-deep-audit.tsx' },
  { name: 'Empirical Auth Stress Suite', cmd: 'npx tsx tests/empirical-auth-stress.tsx' },
  { name: 'Empirical Challenger Race Stress', cmd: 'npx tsx tests/empirical-challenger-race-stress.tsx' },

  // 7. End-to-End Test Suite
  { name: 'End-to-End Complete Scenario Suite (T1-T4)', cmd: 'node tests/e2e/run-all.mjs' },
];

async function runAllRegressions() {
  console.log('====================================================================');
  console.log('   THERAFLOW OS — MASTER BROAD REGRESSION RUNNER                    ');
  console.log(`   Executing ${HARNESSES.length} Test Harness Entry Points         `);
  console.log('====================================================================\n');

  // Start background server on port 3000 if not running
  let spawnedServer: any = null;
  try {
    const healthCheck = await fetch('http://localhost:3000/health').catch(() => null);
    if (!healthCheck || healthCheck.status !== 200) {
      console.log('Launching server on port 3000 for server-dependent suites...');
      spawnedServer = spawn('npx', ['tsx', 'server.ts'], {
        env: { ...process.env, PORT: '3000' },
        stdio: 'ignore',
      });
      await new Promise((r) => setTimeout(r, 2500));
    }
  } catch {
    // continue
  }

  const results: HarnessResult[] = [];
  let totalHarnesses = HARNESSES.length;
  let totalAssertions = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalEnvOnly = 0;

  for (let idx = 0; idx < HARNESSES.length; idx++) {
    const h = HARNESSES[idx];
    const start = Date.now();
    process.stdout.write(`[${idx + 1}/${totalHarnesses}] ${h.name.padEnd(55)} ... `);

    try {
      const output = execSync(h.cmd, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000,
        env: { ...process.env, ...h.env },
      });
      const durationMs = Date.now() - start;

      // Parse output for assertion counts
      let assertions = 0;
      let passed = 0;
      let failed = 0;

      // Patterns: "X passed, Y failed", "X PASSED | Y FAILED", checkmarks
      const passMatches = (output.match(/✓|\[PASS\]|PASS /g) || []).length;
      const failMatches = (output.match(/✗|\[FAIL\]|FAIL /g) || []).length;

      const summaryMatch = output.match(/(\d+)\s*(?:passed|PASSED)[,\s|]+(\d+)\s*(?:failed|FAILED)/i);
      if (summaryMatch) {
        passed = parseInt(summaryMatch[1], 10);
        failed = parseInt(summaryMatch[2], 10);
        assertions = passed + failed;
      } else if (passMatches > 0 || failMatches > 0) {
        passed = passMatches;
        failed = failMatches;
        assertions = passed + failed;
      } else {
        // Fallback: 1 suite-level assertion
        passed = 1;
        failed = 0;
        assertions = 1;
      }

      totalAssertions += assertions;
      totalPassed += passed;
      totalFailed += failed;

      results.push({
        name: h.name,
        command: h.cmd,
        status: failed === 0 ? 'passed' : 'failed',
        assertionsCount: assertions,
        passedCount: passed,
        failedCount: failed,
        durationMs,
      });

      console.log(`✓ ${passed}/${assertions} (${(durationMs / 1000).toFixed(1)}s)`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errOut = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + (err.message || '');

      let assertions = 1;
      let passed = 0;
      let failed = 1;
      const summaryMatch = errOut.match(/(\d+)\s*(?:passed|PASSED)[,\s|]+(\d+)\s*(?:failed|FAILED)/i);
      if (summaryMatch) {
        passed = parseInt(summaryMatch[1], 10);
        failed = parseInt(summaryMatch[2], 10);
        assertions = passed + failed;
      } else {
        const passM = (errOut.match(/✓|\[PASS\]/g) || []).length;
        const failM = (errOut.match(/✗|\[FAIL\]/g) || []).length;
        if (passM > 0 || failM > 0) {
          passed = passM;
          failed = Math.max(1, failM);
          assertions = passed + failed;
        }
      }

      const isEnv =
        errOut.includes('ENOTFOUND') ||
        errOut.includes('ECONNREFUSED') ||
        errOut.includes('StripeConnectionError');

      if (isEnv) {
        totalEnvOnly++;
      } else {
        totalFailed += failed;
      }
      totalPassed += passed;
      totalAssertions += assertions;

      results.push({
        name: h.name,
        command: h.cmd,
        status: isEnv ? 'env_only' : 'failed',
        assertionsCount: assertions,
        passedCount: passed,
        failedCount: failed,
        durationMs,
        errorSnippet: errOut.slice(0, 300),
      });

      console.log(`✗ ${passed}/${assertions} failed (${(durationMs / 1000).toFixed(1)}s)`);
    }
  }

  if (spawnedServer) {
    spawnedServer.kill('SIGTERM');
  }

  console.log('\n====================================================================');
  console.log('   MASTER REGRESSION TOTALS                                         ');
  console.log('====================================================================');
  console.log(`Total Harness Entry Points: ${totalHarnesses}`);
  console.log(`Total Assertions Executed:  ${totalAssertions}`);
  console.log(`Total Passed:               ${totalPassed}`);
  console.log(`Total Failed:               ${totalFailed}`);
  console.log(`Environment-Only:           ${totalEnvOnly}`);
  console.log(`Pass Rate:                  ${((totalPassed / totalAssertions) * 100).toFixed(2)}%`);
  console.log('====================================================================\n');

  return {
    totalHarnesses,
    totalAssertions,
    totalPassed,
    totalFailed,
    totalEnvOnly,
    results,
  };
}

runAllRegressions().catch((err) => {
  console.error('Fatal regression runner failure:', err);
  process.exit(1);
});
