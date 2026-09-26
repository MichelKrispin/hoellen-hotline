import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/one-link.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: [
    {
      command: "node tools/test-peer-server.mjs",
      url: "http://127.0.0.1:9000/peerjs",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      env: {
        VITE_STUN_URL: "",
        VITE_SIGNAL_HOST: "127.0.0.1",
        VITE_SIGNAL_PORT: "9000",
        VITE_SIGNAL_PATH: "/peerjs",
      },
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
