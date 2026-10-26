// Apenas seleciona o PowerShell do sistema; carga e métricas continuam no JMeter.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [scenario, ...parameters] = process.argv.slice(2);
if (!['read', 'bids', 'campaign'].includes(scenario)) {
  throw new Error('Use read, bids ou campaign.');
}
const windows = process.platform === 'win32';
const executable = windows ? 'powershell.exe' : 'pwsh';
const script = fileURLToPath(
  new URL(scenario === 'campaign' ? './campaign.ps1' : './run.ps1', import.meta.url),
);
const child = spawn(
  executable,
  [
    '-NoProfile',
    '-NonInteractive',
    ...(windows ? ['-ExecutionPolicy', 'Bypass'] : []),
    '-File',
    script,
    ...(scenario === 'campaign' ? [] : ['-Scenario', scenario]),
    ...parameters,
  ],
  { stdio: 'inherit', windowsHide: true },
);
child.on('error', (error) => {
  console.error(
    error.code === 'ENOENT'
      ? `Executável ${executable} ausente. No Linux, instale PowerShell 7; veja README.md#preparar-o-ambiente.`
      : error.message,
  );
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
