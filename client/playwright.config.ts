import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testsDir = path.join(__dirname, 'tests');

export default defineConfig({
  testDir: path.join(testsDir, 'e2e'),
  timeout: 30_000,
  outputDir: path.join(testsDir, 'test-results'),
  reporter: [
    ['line'],
    [
      'allure-playwright',
      {
        resultsDir: path.join(testsDir, 'allure-results'),
        detail: true,
        suiteTitle: false,
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'off',
  },
  webServer: {
    command:
      'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
