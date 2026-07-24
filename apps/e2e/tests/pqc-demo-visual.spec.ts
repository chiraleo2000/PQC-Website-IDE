/**
 * Presentation / demo script — run headed with the `demo` project (slowMo + pauses).
 *
 * Terminal:
 *   pnpm --filter @pqc/e2e test:demo
 *
 * Or explicitly:
 *   pnpm --filter @pqc/e2e exec playwright test pqc-demo-visual --project=demo --headed --workers=1
 */
import { test, expect } from "@playwright/test";
import {
  dragPaletteItemToCanvas,
  waitForDevLogin,
  waitForSyncPost,
} from "../src/helpers/ide-actions.js";
import {
  formatPayloadPreview,
  hideDemoChrome,
  pause,
  pulseHighlight,
  showCalloutNear,
  showDemoToast,
  showHndlBanner,
  showNetworkInspector,
} from "../src/helpers/demo-visual.js";
import { PQC_ALGORITHMS } from "@pqc/shared";

test.describe.configure({ mode: "serial" });

test.describe("PQC visual demonstration", () => {
  test.beforeEach(async ({ page }) => {
    await hideDemoChrome(page);
  });

  test("Harvest Now, Decrypt Later — live IDE walkthrough", async ({ page }) => {
    await test.step("Open IDE", async () => {
      await page.goto("/");
      await pause(page, "medium");
    });

    await test.step("Login — post-quantum keys ready", async () => {
      await waitForDevLogin(page);
      const badge = page.getByTestId("pqc-status-badge");
      await badge.scrollIntoViewIfNeeded();
      await badge.hover();
      await pause(page, "short");
      await showCalloutNear(
        page,
        badge,
        "PQC secured session — ML-KEM + X25519 ready (not classical RSA)"
      );
      await showDemoToast(
        page,
        `${PQC_ALGORITHMS.KEM} + ${PQC_ALGORITHMS.CLASSICAL_KEM} + ${PQC_ALGORITHMS.SIGN} armed in the browser worker`,
        "success"
      );
      await pause(page, "long");
    });

    await test.step("Explain HNDL defense", async () => {
      await showHndlBanner(page);
      await showDemoToast(
        page,
        "Harvest Now, Decrypt Later: stored RSA/ECC ciphertext may fall to future quantum attacks.",
        "warn"
      );
      await pause(page, "long");
      await showDemoToast(
        page,
        "Gateway rejects classical KEM/signatures — only ML-KEM-768 + ML-DSA-65 sync is accepted.",
        "info"
      );
      await pause(page, "long");
    });

    await test.step("Build a page — drag Header to canvas", async () => {
      await page.getByLabel("Component library").hover();
      await pause(page, "short");
      await dragPaletteItemToCanvas(page, /Drag Header to canvas/i);
      await pause(page, "medium");
      const header = page.locator('[aria-label="header element"]').first();
      await header.hover();
      await pulseHighlight(page, header);
      await pause(page, "medium");
    });

    await test.step("Edit project title (visible text change)", async () => {
      const nameInput = page.getByLabel("Project name");
      await nameInput.hover();
      await nameInput.fill("");
      await nameInput.pressSequentially("Quantum-Safe Demo Site", { delay: 80 });
      await pause(page, "medium");
    });

    await test.step("Save — show PQC network envelope", async () => {
      const saveBtn = page.getByTestId("save-project");
      await saveBtn.hover();
      await showDemoToast(
        page,
        "Saving… encapsulating AES-256-GCM key with ML-KEM-768, signing with ML-DSA-65",
        "info"
      );
      await pause(page, "short");

      const syncPromise = waitForSyncPost(page);
      await saveBtn.click();

      const response = await syncPromise;
      const rawBody = response.request().postDataJSON();
      const preview = formatPayloadPreview(rawBody);

      expect(preview.kem.algorithm).toBe(PQC_ALGORITHMS.KEM);
      expect(preview.cipher.algorithm).toBe(PQC_ALGORITHMS.CIPHER);
      expect(preview.signature.algorithm).toBe(PQC_ALGORITHMS.SIGN);
      expect(response.status()).toBe(200);

      await showNetworkInspector(page, preview, response.status());
      await showDemoToast(
        page,
        `Sync verified — kem: ${preview.kem.algorithm}, signature: ${preview.signature.algorithm}`,
        "success"
      );
      await pause(page, "long");

      await showDemoToast(
        page,
        "Classical RSA/ECC stripped — HNDL harvest of legacy ciphertext would not decrypt this envelope.",
        "warn"
      );
      await pause(page, "long");
    });

    await test.step("Confirm saved state", async () => {
      const badge = page.getByTestId("pqc-status-badge");
      await expect(badge).toContainText(/Saved/i, { timeout: 20_000 });
      await badge.hover();
      await showCalloutNear(page, badge, "Verified save — post-quantum envelope accepted by API");
      await pause(page, "long");
    });
  });
});
