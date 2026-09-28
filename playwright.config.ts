import { defineConfig } from "@playwright/test";

// Use a dedicated port and process so a developer's server cannot change the
// signaling mode or ICE configuration of a test run.
export const manualWebServer = {
  command: "npm run dev -- --port 5174 --strictPort",
  env: { VITE_STUN_URL: "", VITE_SIGNAL_MODE: "manual", VITE_BASE: "/" },
  url: "http://127.0.0.1:5174",
  reuseExistingServer: false,
};

export default defineConfig({
  testDir: "./e2e",
  testIgnore: [
    "**/pages-base.spec.ts",
    "**/mixed-browsers.spec.ts",
    "**/one-link.spec.ts",
  ],
  grepInvert: /@extended|@gameplay|@transport|@stun-failure/,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reportSlowTests: { max: 5, threshold: 15_000 },
  reporter: process.env.CI ? [["github"], ["line"]] : "list",
  use: {
    baseURL: manualWebServer.url,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    },
  },
  webServer: manualWebServer,
});
