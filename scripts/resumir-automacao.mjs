import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { summarizeExecution } from './automation-summary.mjs';
import { stripVTControlCharacters } from 'node:util';
import { relative, resolve } from 'node:path';

const report = JSON.parse(await readFile(process.argv[2] || 'resultados/playwright.json', 'utf8'));
const root = process.argv[3] || 'resultados/automacao-final';
const reportPath = relative(resolve(root), resolve('playwright-report/index.html')).replaceAll(
  '\\',
  '/',
);
const artifactsPath = relative(resolve(root), resolve('test-results')).replaceAll('\\', '/');
await mkdir(`${root}/evidencias`, { recursive: true });
await writeFile(`${root}/playwright.json`, JSON.stringify(report, null, 2));
const tests = [];
async function visit(suites) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const item of spec.tests || []) {
        const result = item.results.at(-1) ?? { status: 'notRun', duration: 0 };
        const bug = spec.title.startsWith('API-07')
          ? 'BUG-002'
          : spec.title.startsWith('API-08')
            ? 'BUG-003'
            : spec.title.startsWith('REG-001')
              ? 'BUG-001'
              : spec.title.startsWith('API-10')
                ? 'BUG-005'
                : null;
        const attachments = [];
        for (const [index, attachment] of (result.attachments || []).entries()) {
          if (attachment.contentType !== 'application/json') continue;
          const body = attachment.body
            ? Buffer.from(attachment.body, 'base64').toString('utf8')
            : await readFile(attachment.path, 'utf8');
          const safeName = `${tests.length + 1}-${index}-${attachment.name}`.replace(
            /[^\p{L}\p{N}_.-]/gu,
            '-',
          );
          const destination = `${root}/evidencias/${safeName}.json`;
          await writeFile(destination, body);
          attachments.push(destination);
        }
        tests.push({
          title: spec.title,
          project: item.projectName,
          status: result.status,
          durationMs: result.duration,
          bug: result.status === 'failed' ? bug : null,
          errors: (result.errors || []).map((e) => e.message),
          attachments,
        });
      }
    }
    await visit(suite.suites);
  }
}
await visit(report.suites);
const summary = {
  generatedAt: new Date().toISOString(),
  stats: report.stats,
  ...summarizeExecution(tests, report.errors || []),
  tests,
};
await writeFile(`${root}/resumo.json`, JSON.stringify(summary, null, 2));
const rows = tests.map(
  (t) =>
    `| ${t.project} | ${t.title} | ${t.status} | ${(t.durationMs / 1000).toFixed(2)} | ${t.bug || '—'} |`,
);
await writeFile(
  `${root}/resumo.md`,
  `# Resumo da execução automatizada\n\n` +
    `**Situação: ${summary.status}.** Erros globais: ${summary.globalErrorCount}.\n\n` +
    (summary.globalErrorCount
      ? `## Erros globais / impedimentos\n\n${summary.globalErrors
          .map((error) =>
            stripVTControlCharacters(error.message || error.stack || JSON.stringify(error)),
          )
          .map((message) => `    ${message.replaceAll('\n', '\n    ')}`)
          .join('\n\n')}\n\n`
      : '') +
    `${summary.passed} aprovados; ${summary.failed} resultados negativos de testes (${summary.statuses.failed} falhas, ${summary.statuses.timedOut} timeouts, ${summary.statuses.interrupted} interrompidos); ${summary.statuses.skipped} ignorados; ${summary.statuses.notRun} sem execução registrada. ${summary.executed} executados de ${summary.total} testes. Considerado o último resultado de cada teste.\n\n` +
    `| Projeto | Teste | Resultado | Duração s | Bug relacionado |\n|---|---|---|---|---|\n${rows.join('\n')}\n\n` +
    `Relatório navegável: ${reportPath}. Evidências JSON nesta pasta; traces e capturas em ${artifactsPath}/.\n`,
);
console.log(
  JSON.stringify(
    {
      status: summary.status,
      globalErrorCount: summary.globalErrorCount,
      passed: summary.passed,
      failed: summary.failed,
      total: tests.length,
      root,
    },
    null,
    2,
  ),
);
if (!summary.executionComplete) process.exitCode = 1;
