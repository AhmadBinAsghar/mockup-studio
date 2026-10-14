import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

const DEVICE_SPEC = /devices\.spec\.ts/;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, acceptDownloads: true },
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"] }, testIgnore: DEVICE_SPEC },
    { name: "safari", use: { ...devices["Desktop Safari"] }, testIgnore: DEVICE_SPEC },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: DEVICE_SPEC },
    { name: "android-phone", use: { ...devices["Pixel 7"] }, testMatch: DEVICE_SPEC },
    { name: "iphone", use: { ...devices["iPhone 15"] }, testMatch: DEVICE_SPEC },
    { name: "ipad", use: { ...devices["iPad Pro 11"] }, testMatch: DEVICE_SPEC },
    { name: "android-tablet", use: { ...devices["Galaxy Tab S9"] }, testMatch: DEVICE_SPEC },
    {
      name: "mac-safari-laptop",
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
      testMatch: DEVICE_SPEC,
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    env: { NEXT_DIST_DIR: ".next-e2e" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
