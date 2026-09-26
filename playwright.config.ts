import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: [
    "**/pages-base.spec.ts",
    "**/mixed-browsers.spec.ts",
    "**/one-link.spec.ts",
  ],
  workers: 1,
  reporter: process.env.CI ? [["github"], ["line"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    env: {
      VITE_STUN_URL: process.env.TEST_STUN_URL ?? "",
      VITE_SIGNAL_MODE: "manual",
    },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
