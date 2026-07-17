import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
const disableVideo = process.env.PLAYWRIGHT_DISABLE_VIDEO === "1"

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "visual/**/*.spec.ts", "a11y/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: disableVideo ? "off" : "retain-on-failure",
    launchOptions: chromiumExecutablePath
      ? {
          executablePath: chromiumExecutablePath,
          args: ["--disable-dev-shm-usage", "--no-sandbox"],
        }
      : undefined,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: [
        "e2e/**/*.mobile.spec.ts",
        "e2e/**/*.tablet.spec.ts",
        "visual/**/*.mobile.spec.ts",
        "visual/**/*.tablet.spec.ts",
        "a11y/**/*.mobile.spec.ts",
        "a11y/**/*.tablet.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet",
      testIgnore: [
        "e2e/**/*.desktop.spec.ts",
        "e2e/**/*.mobile.spec.ts",
        "visual/**/*.desktop.spec.ts",
        "visual/**/*.mobile.spec.ts",
        "a11y/**/*.desktop.spec.ts",
        "a11y/**/*.mobile.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "mobile",
      testIgnore: [
        "e2e/**/*.desktop.spec.ts",
        "e2e/**/*.tablet.spec.ts",
        "visual/**/*.desktop.spec.ts",
        "visual/**/*.tablet.spec.ts",
        "a11y/**/*.desktop.spec.ts",
        "a11y/**/*.tablet.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_ROUTINEOS_TEST_NOW: "2026-07-14T13:00:00.000Z",
    },
  },
})
