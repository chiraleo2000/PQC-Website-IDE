import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Fastify API gateway unit tests — native TypeScript via Vitest (no Babel).
 * Go crypto-service is mocked in src/test/setup.ts so tests run fully offline.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@pqc/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    testTimeout: 15_000,
    pool: "forks",
    isolate: true,
    sequence: { concurrent: false },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/index.ts",
        "src/demo-app.ts",
        "src/config.ts", // env wiring; branches are process.env defaults
        "src/db/schema.ts",
        "src/db/memory-store.ts",
        "src/services/crypto-client.ts",
        "src/services/crypto-local.ts",
        "src/compiler/package-export.ts",
        // GitOps path remains mostly 503; ZIP covered via export.test.ts injects.
        "src/routes/export.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      // GitOps push path stays 503 in this pass; keep ZIP export covered.
      // Branch threshold focuses on exercised sync/publish/auth/compiler paths.
    },
  },
});
