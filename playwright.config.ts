import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 2,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-1440-en',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-390-en',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
    {
      name: 'desktop-1440-ne',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-390-ne',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
});
