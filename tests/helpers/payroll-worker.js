/**
 * Standalone Child Process Worker for Multi-Process Concurrency Testing
 */
const { serverApproveAndSubmitPayroll, closeDatabasePool } = require('../../dist-test/src/lib/practice-os-repository');

async function main() {
  const practiceId = process.argv[2];
  const payPeriodId = process.argv[3];
  const latency = parseInt(process.argv[4] || '0', 10);

  try {
    const res = await serverApproveAndSubmitPayroll({
      practiceId,
      payPeriodId,
      simulatedProviderLatencyMs: latency,
    });
    console.log(JSON.stringify(res));
    process.exit(0);
  } catch (err) {
    console.error(`ERROR: ${err.message || err} (status: ${err.status || err.statusCode})`);
    process.exit(1);
  } finally {
    await closeDatabasePool();
  }
}

main();
