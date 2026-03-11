import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const FRONTEND_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8001/api';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'authenticated-chromium',
      testMatch: /.*\.auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'public-chromium',
      testMatch: /.*\.public\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: `VITE_APP_API_URL=${API_URL} VITE_APP_URL=${FRONTEND_URL} pnpm dev --host 127.0.0.1 --port ${PORT}`,
    timeout: 30 * 1000,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
