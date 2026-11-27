import { defineConfig, devices } from '@playwright/test'
import {
  resolveProductionStorageState,
  resolveVercelProtectionHeaders,
} from './e2e/production-v2-config'

const isCI = Boolean(process.env.CI)
const baseURL = process.env.PROD_PLAYWRIGHT_BASE_URL || 'https://app.chessticize.com'
const storageState = resolveProductionStorageState()
const extraHTTPHeaders = resolveVercelProtectionHeaders()

export default defineConfig({
  testDir: './e2e',
  testMatch: /production-v2-validation\.spec\.ts/,
  timeout: 90_000,
  expect: {
    timeout: 30_000,
  },
  workers: 1,
  fullyParallel: false,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    storageState,
    extraHTTPHeaders,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
