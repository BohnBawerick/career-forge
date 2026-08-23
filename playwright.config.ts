import { defineConfig, devices } from '@playwright/test'

/**
 * The browser test starts its own `pnpm dev`. It deliberately needs no database: the page has to
 * render with Postgres down, which is also what lets this run in CI without a compose stack.
 *
 * Set E2E_HOST and E2E_PORT if something else on your machine already holds port 3000.
 */
const host = process.env.E2E_HOST ?? '127.0.0.1'
const port = Number(process.env.E2E_PORT ?? 3000)
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
