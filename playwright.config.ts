import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests against the production build (`next start`) — the same thing Vercel
 * serves. Run `npm run build` first; `npm run test:e2e` then boots the server itself.
 * `reducedMotion: 'reduce'` keeps the graph deterministic (no drift animation,
 * instant re-root transitions) so tests never race the simulation.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
