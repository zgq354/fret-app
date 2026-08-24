import { defineConfig, devices } from '@playwright/test'

const remoteBaseUrl = process.env.E2E_BASE_URL

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [['list']],
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  use: {
    baseURL: remoteBaseUrl ?? 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  workers: process.env.CI ? 4 : 4,
  webServer: remoteBaseUrl
    ? undefined
    : {
        command:
          'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173',
        reuseExistingServer: !process.env.CI,
        url: 'http://127.0.0.1:4173',
      },
})
