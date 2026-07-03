import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    // ponytail: `next dev`'s HMR runtime uses eval(), which the app's CSP
    // (script-src without 'unsafe-eval', next.config.ts) blocks — every
    // client component silently fails to hydrate under `next dev`. Building
    // and serving production output sidesteps that without touching the CSP.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
