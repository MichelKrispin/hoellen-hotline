import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: process.env.CI ? [["github"], ["line"]] : "list",
  use: { baseURL: "http://127.0.0.1:5173", browserName: "firefox" },
  webServer: {
    command: "npm run dev",
    env: { VITE_STUN_URL: "" },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
