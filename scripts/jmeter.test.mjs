// Verificação do runner contra uma API simulada local; não mede a aplicação.
// Requer Java, JMeter e PowerShell. Executar separadamente da campanha real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'powershell.exe' : 'pwsh',
      [
        '-NoProfile',
        ...(process.platform === 'win32' ? ['-ExecutionPolicy', 'Bypass'] : []),
        '-File',
        'performance/run.ps1',
        ...args,
      ],
      { windowsHide: true },
    );
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
  });
}

async function fixture(mode, action) {
  const acceptedBids = [];
  const startedAt = Date.now();
  const server = createServer(async (request, response) => {
    let input = '';
    for await (const chunk of request) input += chunk;
    response.setHeader('Content-Type', 'application/json');
    if (mode === 'unavailable') {
      response.writeHead(503).end('{}');
      return;
    }
    let body;
    if (request.url === '/actuator/health') body = { status: 'UP' };
    else if (request.url === '/api/auth/login') body = { token: 'token-ficticio' };
    else if (request.method === 'POST' && request.url === '/api/compras') {
      response.statusCode = 201;
      body = { id: 'compra-ficticia' };
    } else if (request.url.endsWith('/publicar')) {
      body = { status: 'AGENDADA' };
    } else if (request.url.endsWith('/lances') && request.method === 'POST') {
      const sequence = acceptedBids.length + 1;
      body = {
        id: `lance-${sequence}`,
        compraId: 'compra-ficticia',
        fornecedorId: `fornecedor-${sequence % 2}`,
        valorUnitario: JSON.parse(input).valorUnitario,
        sequencia: sequence,
        createdAt: new Date(
          mode === 'bids-reversed-time' ? startedAt - sequence * 1000 : startedAt,
        ).toISOString(),
      };
      acceptedBids.push(body);
      response.statusCode = 201;
    } else if (request.url.endsWith('/lances')) {
      body = acceptedBids.map((bid) => ({ ...bid }));
      if (mode === 'bids-wrong-values')
        body = body.map((bid) => ({ ...bid, valorUnitario: bid.valorUnitario + 100 }));
      if (mode === 'bids-wrong-ids') body = body.map((bid) => ({ ...bid, id: `outro-${bid.id}` }));
      if (mode === 'bids-correct')
        body = body.map((bid) => ({ ...bid, valorUnitario: bid.valorUnitario.toFixed(2) }));
      body.reverse(); // O contrato retorna os registros mais recentes primeiro.
    } else if (request.url.startsWith('/api/compras?')) {
      body = mode === 'invalid-json-contract' ? {} : { content: [] };
    } else if (request.url.endsWith('/historico')) {
      body = { compraId: 'compra-ficticia', eventos: [] };
    } else
      body = {
        id: 'compra-ficticia',
        status: 'ABERTA',
        serverNow: new Date().toISOString(),
        closesAt: new Date(Date.now() + 600000).toISOString(),
      };
    const finish = () => response.end(JSON.stringify(body));
    if (mode === 'slow' && request.method === 'GET' && request.url.startsWith('/api/compras')) {
      setTimeout(finish, 30);
    } else finish();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const root = await mkdtemp(path.join(tmpdir(), 'qa-jmeter-'));
  const destination = path.join(root, 'run');
  try {
    const result = await run([
      '-Scenario',
      mode.startsWith('bids-') ? 'bids' : 'read',
      '-BaseUrl',
      `http://127.0.0.1:${server.address().port}`,
      '-Users',
      '1',
      '-Warmup',
      '2',
      '-Duration',
      '3',
      '-MaxErrorRate',
      '1',
      '-P95LimitMs',
      mode === 'slow' ? '1' : '1000',
      '-OutputDir',
      destination,
    ]);
    const manifest = JSON.parse(
      (await readFile(path.join(destination, 'execucao.json'), 'utf8')).replace(/^\uFEFF/, ''),
    );
    await action(result, manifest);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('JMeter: rejeita destino externo antes de preparar dados', async () => {
  const result = await run(['-BaseUrl', 'http://example.com']);
  assert.notEqual(result.code, 0);
  assert.match(result.output, /origem HTTP local/);
});

test('JMeter: setup indisponível não produz aprovação ou estatísticas fictícias', async () => {
  await fixture('unavailable', async (result, manifest) => {
    assert.notEqual(result.code, 0, result.output);
    assert.equal(manifest.status, 'INCOMPLETO');
    assert.equal(manifest.statistics, undefined);
  });
});

test('JMeter: HTTP 200 com contrato inválido conta erro e reprova aquecimento', async () => {
  await fixture('invalid-json-contract', async (result, manifest) => {
    assert.notEqual(result.code, 0, result.output);
    assert.equal(manifest.status, 'CONCLUIDO');
    assert.ok(manifest.statistics.errorCount > 0);
    assert.ok(manifest.consistency.warmupErrors > 0);
    assert.equal(manifest.passed, false);
  });
});

test('JMeter: P95 acima do limite reprova mesmo com zero erros HTTP/JSON', async () => {
  await fixture('slow', async (result, manifest) => {
    assert.notEqual(result.code, 0, result.output);
    assert.equal(manifest.status, 'CONCLUIDO');
    assert.equal(manifest.statistics.errorCount, 0);
    assert.equal(manifest.consistency.ok, true);
    assert.ok(manifest.statistics.pct2ResTime > manifest.p95LimitMs);
    assert.equal(manifest.passed, false);
  });
});

test('JMeter: compara IDs e valores exatos; não aprova histórico apenas pela contagem', async () => {
  for (const mode of ['bids-wrong-values', 'bids-wrong-ids']) {
    await fixture(mode, async (result, manifest) => {
      assert.notEqual(result.code, 0, result.output);
      assert.equal(manifest.statistics.errorCount, 0);
      assert.equal(manifest.consistency.purchases[0].matchesAcceptedBids, false);
      assert.equal(manifest.passed, false);
    });
  }
});

test('JMeter: recusa sequência temporal invertida mesmo com IDs e valores correspondentes', async () => {
  await fixture('bids-reversed-time', async (result, manifest) => {
    assert.notEqual(result.code, 0, result.output);
    const check = manifest.consistency.purchases[0];
    assert.equal(check.matchesAcceptedBids, true);
    assert.equal(check.temporalOrderMatchesAccepted, false);
    assert.equal(check.decreasingInTime, false);
  });
});

test('JMeter: aceita persistência correta, escalas decimais equivalentes e desempate por sequência', async () => {
  await fixture('bids-correct', async (result, manifest) => {
    assert.equal(result.code, 0, result.output);
    const check = manifest.consistency.purchases[0];
    assert.equal(check.matchesAcceptedBids, true);
    assert.equal(check.temporalOrderMatchesAccepted, true);
    assert.equal(check.decreasingInTime, true);
    assert.equal(manifest.passed, true);
  });
});
