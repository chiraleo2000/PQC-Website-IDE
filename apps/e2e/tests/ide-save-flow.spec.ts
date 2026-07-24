import { test, expect } from "@playwright/test";
import { assertValidPqcSyncPayload } from "../src/helpers/assert-sync-payload.js";
import {
  dragPaletteItemToCanvas,
  selectCanvasNode,
  waitForDevLogin,
  waitForSyncPost,
} from "../src/helpers/ide-actions.js";
import { PORTS } from "@pqc/shared";

/**
 * Full stack E2E: Web IDE (:4001) → Fastify (:4000) → Go crypto (:4081).
 * Persistence: in-memory project store (Postgres :5432 is started in CI for stack parity).
 */
test.describe("IDE cryptographic save flow", () => {
  test("login, edit canvas, save with valid PQC envelope", async ({ page, request }) => {
    const apiBase = process.env.API_URL ?? `http://localhost:${PORTS.apiGateway}`;

    await test.step("health — API gateway (Go crypto wired on sync)", async () => {
      const gw = await request.get(`${apiBase}/api/health`);
      expect(gw.ok()).toBeTruthy();
      const health = (await gw.json()) as { enforcePqcOnly?: boolean };
      expect(health.enforcePqcOnly).toBe(true);
    });

    await test.step("open IDE and complete dev login", async () => {
      const authDone = page.waitForResponse(
        (res) =>
          res.url().includes("/api/auth/dev-register") && res.request().method() === "POST",
        { timeout: 30_000 }
      );
      await page.goto("/");
      const authRes = await authDone;
      expect(authRes.status()).toBe(200);
      await waitForDevLogin(page);
    });

    await test.step("drag Header component onto canvas", async () => {
      await dragPaletteItemToCanvas(page, /Drag Header to canvas/i);
      await expect(
        page.locator('[aria-label="header element"]').first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("modify text — project name and Header CSS class", async () => {
      await page.getByLabel("Project name").fill("E2E PQC Site");
      await selectCanvasNode(page, "header");
      const classInput = page.locator("#prop-class");
      await expect(classInput).toBeVisible();
      await classInput.fill("e2e-pqc-header");
    });

    await test.step("save — intercept sync payload before 200 OK", async () => {
      const syncResponsePromise = waitForSyncPost(page);

      await page.getByTestId("save-project").click();

      const response = await syncResponsePromise;
      const requestBody = response.request().postDataJSON();

      assertValidPqcSyncPayload(requestBody);

      expect(response.status()).toBe(200);
      const responseJson = (await response.json()) as { ok?: boolean };
      expect(responseJson.ok).toBe(true);
    });

    await test.step("UI confirms verified save", async () => {
      await expect(page.getByTestId("pqc-status-badge")).toContainText(/Saved/i, {
        timeout: 15_000,
      });
    });
  });
});
