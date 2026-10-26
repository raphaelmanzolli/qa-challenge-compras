import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function checkDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await checkDirectory(path);
    else if (entry.name.endsWith('.mjs')) checkFile(path);
  }
}

function checkFile(path) {
  const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

checkFile('playwright.config.mjs');
for (const directory of ['tests', 'performance', 'scripts']) await checkDirectory(directory);
console.log('Sintaxe JavaScript válida.');
