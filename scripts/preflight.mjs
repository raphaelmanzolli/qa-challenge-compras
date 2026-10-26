import { localBaseURL } from '../tests/support/settings.mjs';
import { pathToFileURL } from 'node:url';

export async function preflight() {
  const baseURL = localBaseURL();
  try {
    const response = await fetch(`${baseURL}/actuator/health`, {
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    if (response.status !== 200) throw new Error(`health HTTP ${response.status}`);
    const body = await response.json();
    if (body.status !== 'UP') throw new Error(`health.status=${body.status}`);
    console.log(`Aplicação disponível: ${baseURL} (UP)`);
  } catch (error) {
    throw new Error(
      `IMPEDIMENTO DE AMBIENTE: ${baseURL} indisponível. Suba o Docker conforme README.md. Causa: ${error.message}`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  preflight().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
