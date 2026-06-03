import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/feature-verification.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  fullyParallel: true,
  workers: 5,
  reporter: [
    ["html", { outputFolder: "tests/e2e/report", open: "never" }],
    ["json", { outputFile: "tests/e2e/report/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
