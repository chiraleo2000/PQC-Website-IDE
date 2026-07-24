import { defineConfig, devices } from "@playwright/test";
import { PORTS } from "@pqc/shared";

/**
 * Local development ports (see packages/shared/src/ports.ts):
 *   Web IDE        → 4001  (Vite, proxies /api → gateway)
 *   API gateway    → 4000  (Fastify)
 *   Go crypto      → 4081  (ML-KEM / ML-DSA verify-decrypt)
 *   PostgreSQL     → 5432  (optional; CI service / docker compose)
 *   Compiled static→ 4010  (compiled-blog project only)
 */
const API_URL = process.env.API_URL ?? `http://localhost:${PORTS.apiGateway}`;
const WEB_URL = process.env.WEB_URL ?? `http://localhost:${PORTS.web}`;
const CRYPTO_URL = process.env.CRYPTO_SERVICE_URL ?? `http://localhost:${PORTS.cryptoService}`;

const gatewayEnv = {
  PORT: String(PORTS.apiGateway),
  CRYPTO_SERVICE_URL: CRYPTO_URL,
  CRYPTO_SERVICE_SECRET:
    process.env.CRYPTO_SERVICE_SECRET ?? "internal-crypto-shared-secret",
  CRYPTO_USE_GO: process.env.CRYPTO_USE_GO ?? "true",
  ENFORCE_PQC_ONLY: "true",
  JWT_SECRET: process.env.JWT_SECRET ?? "e2e-jwt-secret-min-32-characters-long",
  ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
};

/** CI provides Postgres via GitHub Actions `services.postgres` on :5432. */
const ideStackServers = [
  {
    command: "go run .",
    cwd: "../crypto-service",
    url: `${CRYPTO_URL}/health`,
    reuseExistingServer: !process.env.CI,
    env: { CRYPTO_PORT: String(PORTS.cryptoService) },
    timeout: 180_000,
  },
  {
    command: "npx tsx src/index.ts",
    cwd: "../api-gateway",
    url: `${API_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: gatewayEnv,
    timeout: 180_000,
  },
  {
    command: "npx pnpm@9.15.0 dev",
    cwd: "../web",
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      WEB_PORT: String(PORTS.web),
      VITE_API_URL: "",
    },
    timeout: 180_000,
  },
];

export default defineConfig({
  globalSetup: "./src/global-setup.ts",
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: WEB_URL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /compiled-blog-app|pqc-demo-visual/,
    },
    {
      name: "demo",
      timeout: 300_000,
      use: {
        ...devices["Desktop Chrome"],
        headless: Boolean(process.env.CI),
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          slowMo: Number(process.env.PQC_DEMO_SLOW_MO ?? 650),
        },
      },
      testMatch: /pqc-demo-visual/,
    },
    {
      name: "compiled",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${PORTS.compiledStatic}`,
      },
      testMatch: /compiled-blog-app/,
    },
  ],
  webServer:
    process.env.COMPILED_ONLY === "1" || process.env.COMPILED_ONLY === "true"
      ? [
          {
            command: "npx tsx src/index.ts",
            cwd: "../api-gateway",
            url: `${API_URL}/demo-api/health`,
            reuseExistingServer: !process.env.CI,
            env: {
              ...gatewayEnv,
              PORT: String(PORTS.apiGateway),
            },
            timeout: 120_000,
          },
          {
            command: `npx serve fixtures/compiled-blog -p ${PORTS.compiledStatic}`,
            cwd: ".",
            url: `http://127.0.0.1:${PORTS.compiledStatic}/login.html`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        ]
      : ideStackServers,
});
