export function countResults(tests) {
  const statuses = { passed: 0, failed: 0, timedOut: 0, interrupted: 0, skipped: 0, notRun: 0 };
  for (const { status } of tests) {
    if (!Object.hasOwn(statuses, status)) throw new Error(`Status desconhecido: ${status}`);
    statuses[status]++;
  }
  return {
    statuses,
    passed: statuses.passed,
    failed: statuses.failed + statuses.timedOut + statuses.interrupted,
    executed: tests.length - statuses.skipped - statuses.notRun,
    total: tests.length,
  };
}

export function summarizeExecution(tests, globalErrors = []) {
  const counts = countResults(tests);
  const executionComplete =
    globalErrors.length === 0 &&
    counts.total > 0 &&
    counts.executed === counts.total &&
    counts.statuses.interrupted === 0;
  return {
    ...counts,
    globalErrors,
    globalErrorCount: globalErrors.length,
    executionComplete,
    status: !executionComplete ? 'INCOMPLETA' : counts.failed ? 'REPROVADA' : 'APROVADA',
  };
}
