import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig(config, {
  testMatch: [
    "**/navigation.spec.ts",
    "**/accessibility.spec.ts",
    "**/asset-budget.spec.ts",
    "**/webrtc-spike.spec.ts",
    "**/mixed-browsers.spec.ts",
  ],
  testIgnore: [],
  grepInvert: undefined,
  use: {
    browserName: "firefox",
    launchOptions: {},
  },
});
