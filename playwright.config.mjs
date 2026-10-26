import { defineConfig, devices } from '@playwright/test';
import { localBaseURL } from './tests/support/settings.mjs';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/support/global-setup.mjs',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0, // Não ocultar falhas de regra ou de temporização com repetição automática.
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'resultados/playwright.json' }],
  ],
  use: {
    baseURL: localBaseURL(),
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testMatch: '**/api/*.spec.mjs' },
    {
      name: 'chromium',
      testMatch: '**/e2e/*.spec.mjs',
      use: { ...devices['Desktop Chrome'], locale: 'pt-BR' },
    },
  ],
});
