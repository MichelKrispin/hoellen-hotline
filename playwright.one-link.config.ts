import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/one-link.spec.ts",
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["line"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5175",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    },
  },
  webServer: [
    {
      command: "node tools/test-peer-server.mjs",
      url: "http://127.0.0.1:9000/peerjs",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 5175 --strictPort",
      env: {
        VITE_BASE: "/",
        VITE_STUN_URL: "",
        VITE_SIGNAL_MODE: "auto",
        VITE_SIGNAL_HOST: "127.0.0.1",
        VITE_SIGNAL_PORT: "9000",
        VITE_SIGNAL_PATH: "/peerjs",
      },
      url: "http://127.0.0.1:5175",
      reuseExistingServer: false,
    },
  ],
});
