import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true, // headless 모드로 실행
  },

  /* 서버 자동 실행 설정 */
  webServer: [
    {
      command: 'node scripts/playwright/backend-dev.mjs',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev --prefix frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      timeout: 120 * 1000,
    }
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});







