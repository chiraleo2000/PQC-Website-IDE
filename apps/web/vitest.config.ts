import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Web IDE unit tests — RTL + jsdom. PQC Worker is stubbed in src/test/setup.ts;
 * pqcClient is mocked in src/test/mocks/pqcClient.mock.ts for Zustand/crypto flows.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@pqc/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
    testTimeout: 15_000,
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/App.tsx",
        "src/workers/pqc.worker.ts",
        "src/crypto/pqcClient.ts",
        "src/canvas/VirtualizedCanvas.tsx",
        "src/canvas/ComponentRegistry.tsx",
        "src/canvas/AstRenderer.tsx", // WYSIWYG chrome covered by Selenium/Playwright
        "src/components/organisms/EditorDndProvider.tsx",
        "src/components/organisms/CenterCanvas.tsx",
        "src/components/organisms/LeftAssetSidebar.tsx",
        // Shell chrome exercised by Selenium headed demo + Playwright e2e
        "src/components/organisms/PqcSecurityPanel.tsx",
        "src/components/organisms/ProjectsPanel.tsx",
        "src/components/organisms/TemplatesPanel.tsx",
        "src/components/organisms/PreviewModal.tsx",
        "src/components/organisms/RightPropertiesPanel.tsx",
        "src/components/organisms/LeftNav.tsx",
        "src/components/organisms/TopBar.tsx",
        "src/components/molecules/ToastHost.tsx",
        "src/desktop/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        // Shell/UI branches covered by Selenium + Playwright; keep lines/funcs ≥80
        branches: 79,
        statements: 80,
      },
    },
  },
});
