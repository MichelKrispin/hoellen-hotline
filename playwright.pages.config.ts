import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/pages-base.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4173",
    env: { VITE_BASE: "/hoellen_hotline/", VITE_STUN_URL: "" },
    url: "http://127.0.0.1:4173/hoellen_hotline/",
    reuseExistingServer: !process.env.CI,
  },
});
