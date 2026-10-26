import test from 'node:test';
import assert from 'node:assert/strict';
import { localBaseURL } from '../tests/support/settings.mjs';
import { countResults, summarizeExecution } from './automation-summary.mjs';
import { responseEvidence, closeSessions, sessionVideoPolicy } from '../tests/support/evidence.mjs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('resumo inclui timeouts e interrupções sem contar ignorados como executados', () => {
  const result = countResults(
    ['passed', 'failed', 'timedOut', 'interrupted', 'skipped', 'notRun'].map((status) => ({
      status,
    })),
  );
  assert.equal(result.failed, 3);
  assert.equal(result.executed, 4);
  assert.equal(result.total, 6);
  assert.equal(result.statuses.skipped, 1);
});

test('evidências preservam JSON, HTML, corpo vazio e JSON malformado', async () => {
  for (const [text, expected] of [
    ['{"code":"ERROR"}', { code: 'ERROR' }],
    ['<html>erro</html>', '<html>erro</html>'],
    ['', ''],
    ['{', '{'],
  ]) {
    const evidence = await responseEvidence({
      status: () => 500,
      headers: () => ({ 'x-trace-id': 'trace-1' }),
      text: async () => text,
    });
    assert.deepEqual(evidence, { status: 500, traceId: 'trace-1', body: expected });
  }
});

test('falhas de captura, anexo e fechamento não impedem as demais sessões', async (t) => {
  const warnings = t.mock.method(console, 'warn', () => {});
  const closed = [];
  const attached = [];
  const contexts = [0, 1, 2].map((index) => ({
    pages: () => [
      {
        isClosed: () => false,
        screenshot: async () => {
          if (index === 0) throw new Error('captura indisponível');
          return Buffer.from('imagem');
        },
      },
    ],
    close: async () => {
      closed.push(index);
      if (index === 1) throw new Error('fechamento indisponível');
    },
  }));
  await closeSessions(contexts, {
    attach: async (name) => {
      if (name === 'sessao-1') throw new Error('anexo indisponível');
      attached.push(name);
    },
  });
  assert.deepEqual(closed, [0, 1, 2]);
  assert.deepEqual(attached, ['sessao-2']);
  assert.equal(warnings.mock.callCount(), 3);
});

test('execuções restritas à origem HTTP local sem redirecionamento', () => {
  assert.equal(localBaseURL('http://localhost:8080'), 'http://localhost:8080');
  assert.equal(localBaseURL('http://127.0.0.1:8090'), 'http://127.0.0.1:8090');
  assert.equal(localBaseURL('http://[::1]:8080'), 'http://[::1]:8080');
  for (const value of [
    'https://example.com',
    'http://localhost.evil.com',
    'http://localhost:8080/api',
    'http://user:pass@localhost',
    'http://localhost/?q=1',
  ]) {
    assert.throws(() => localBaseURL(value));
  }
});

test('erros globais e testes não executados nunca geram aprovação', () => {
  const global = summarizeExecution([], [{ message: 'preflight indisponível' }]);
  assert.equal(global.status, 'INCOMPLETA');
  assert.equal(global.failed, 0);
  assert.equal(global.globalErrorCount, 1);
  assert.equal(summarizeExecution([]).status, 'INCOMPLETA');
  assert.equal(summarizeExecution([{ status: 'notRun' }]).status, 'INCOMPLETA');
  assert.equal(summarizeExecution([{ status: 'interrupted' }]).status, 'INCOMPLETA');
  assert.equal(summarizeExecution([{ status: 'failed' }]).status, 'REPROVADA');
  assert.equal(summarizeExecution([{ status: 'passed' }]).status, 'APROVADA');
  assert.equal(
    summarizeExecution([{ status: 'passed' }], [{ message: 'erro tardio' }]).status,
    'INCOMPLETA',
  );
});

test('resumidor preserva erro global no JSON e no Markdown e sinaliza execução incompleta', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qa-summary-'));
  const input = path.join(root, 'report.json');
  const destination = path.join(root, 'resumo');
  await writeFile(
    input,
    JSON.stringify({ suites: [], errors: [{ message: 'IMPEDIMENTO: aplicação indisponível' }] }),
  );
  const result = spawnSync(
    process.execPath,
    ['scripts/resumir-automacao.mjs', input, destination],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1, result.stderr);
  const summary = JSON.parse(await readFile(path.join(destination, 'resumo.json'), 'utf8'));
  assert.equal(summary.status, 'INCOMPLETA');
  assert.equal(summary.globalErrors[0].message, 'IMPEDIMENTO: aplicação indisponível');
  const markdown = await readFile(path.join(destination, 'resumo.md'), 'utf8');
  assert.match(markdown, /Situação: INCOMPLETA/);
  assert.match(markdown, /IMPEDIMENTO: aplicação indisponível/);
});

test('vídeos são finalizados e anexados após fechar as sessões; falha de anexo não impede os demais', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const events = [];
  const contexts = [0, 1].map((i) => ({
    pages: () => [],
    close: async () => events.push(`close-${i}`),
  }));
  const recordings = contexts.map((context, i) => ({
    context,
    name: `video-${i}`,
    video: {
      saveAs: async () => {
        assert.ok(events.includes(`close-${i}`));
        events.push(`save-${i}`);
      },
      delete: async () => events.push(`delete-${i}`),
    },
  }));
  await closeSessions(
    contexts,
    {
      outputPath: (name) => name,
      attach: async (name) => {
        events.push(`attach-${name}`);
        if (name === 'video-0') throw new Error('anexo indisponível');
      },
    },
    recordings,
    true,
  );
  assert.ok(events.includes('attach-video-1'));
  assert.ok(events.includes('delete-1'));
  assert.ok(!events.includes('delete-0')); // Preserva o original se o anexo falhar.
});

test('retain-on-failure descarta vídeo aprovado e preserva falha inesperada', async () => {
  assert.deepEqual(
    sessionVideoPolicy('retain-on-failure', { status: 'passed', expectedStatus: 'passed' }),
    { capture: true, preserve: false },
  );
  assert.deepEqual(
    sessionVideoPolicy('retain-on-failure', { status: 'failed', expectedStatus: 'passed' }),
    { capture: true, preserve: true },
  );
  assert.deepEqual(sessionVideoPolicy('off', { status: 'failed', expectedStatus: 'passed' }), {
    capture: false,
    preserve: false,
  });
  let deleted = false;
  const context = { pages: () => [], close: async () => {} };
  await closeSessions(
    [context],
    {
      attach: async () => {
        throw new Error('Vídeo aprovado não deve ser anexado');
      },
    },
    [
      {
        context,
        name: 'video',
        video: {
          delete: async () => {
            deleted = true;
          },
        },
      },
    ],
    false,
  );
  assert.equal(deleted, true);
});
