import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { MUNKAMENET_A } from "./tests/e2e/bejelentkezve/munkamenet";

const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * A bejelentkezett tesztek a `scripts/teszt-belepes.mjs`-szel mentett
 * munkamenetet használják (jelszó nélkül). Azon a címen futnak, ahol a
 * munkamenet készült — alapból az éles oldalon.
 */
const AUTH_A = MUNKAMENET_A;
const AUTH_B = "tests/e2e/.auth/b.json";
const authBaseURL = process.env.AUTH_BASE_URL ?? "https://gymcrew.hu";
const vanMunkamenet = existsSync(AUTH_A);
const telefon = { ...devices["iPhone 13"], baseURL: authBaseURL, storageState: AUTH_A };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "asztali", testIgnore: /bejelentkezve\//, use: { ...devices["Desktop Chrome"] } },
    { name: "mobil", testIgnore: /bejelentkezve\//, use: { ...devices["iPhone 13"] } },
    ...(vanMunkamenet
      ? [
          // Előbb megújítja és visszamenti a munkamenetet, utána jönnek a tesztek.
          { name: "munkamenet", testMatch: /bejelentkezve\/munkamenet\.setup\.ts/, use: telefon },
          {
            name: "bejelentkezve",
            testMatch: /bejelentkezve\/.*\.spec\.ts/,
            dependencies: ["munkamenet"],
            // Éles adatbázison dolgozik: egymás után (--workers=1), hogy ne akadjanak össze.
            fullyParallel: false,
            use: telefon,
          },
        ]
      : []),
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev --port ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

export { AUTH_A, AUTH_B };
