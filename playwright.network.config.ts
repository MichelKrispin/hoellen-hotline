import { defineConfig } from "@playwright/test";
import config, { manualWebServer } from "./playwright.config";

export default defineConfig({
  ...config,
  grep: /@transport|@stun-failure/,
  grepInvert: undefined,
  webServer: {
    ...manualWebServer,
    env: { ...manualWebServer.env, VITE_STUN_URL: "stun:127.0.0.1:9" },
  },
});
