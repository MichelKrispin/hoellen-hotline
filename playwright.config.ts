import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/pages-base.spec.ts", "**/mixed-browsers.spec.ts"],
  workers: 1,
  reporter: process.env.CI ? [["github"], ["line"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "npm run dev",
    env: { VITE_STUN_URL: process.env.TEST_STUN_URL ?? "" },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
