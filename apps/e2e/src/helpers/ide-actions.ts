import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Dev auto-login completes when the header badge shows ML-KEM readiness. */
export async function waitForDevLogin(page: Page): Promise<void> {
  await expect(page.getByTestId("pqc-status-badge")).toContainText(/ML-KEM/i, {
    timeout: 30_000,
  });
}

/** Playwright `dragTo` with mouse steps (works with @dnd-kit PointerSensor in headed runs). */
export async function dragPaletteItemToCanvas(
  page: Page,
  componentLabel: RegExp | string
): Promise<void> {
  const source = page.getByRole("button", { name: componentLabel });
  const canvas = page.getByTestId("page-canvas");
  await source.scrollIntoViewIfNeeded();
  await canvas.scrollIntoViewIfNeeded();

  const src = await source.boundingBox();
  const tgt = await canvas.boundingBox();
  if (!src || !tgt) {
    await source.dragTo(canvas, { force: true });
    return;
  }

  const startX = src.x + src.width / 2;
  const startY = src.y + src.height / 2;
  const endX = tgt.x + tgt.width / 2;
  const endY = tgt.y + tgt.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12);
  await page.mouse.move(endX, endY, { steps: 12 });
  await page.mouse.up();
}

export async function selectCanvasNode(page: Page, nodeType: string): Promise<void> {
  const node = page.locator(`[aria-label="${nodeType} element"]`).first();
  await node.waitFor({ state: "visible", timeout: 15_000 });
  await node.click();
}

export async function setSelectedTextProperty(page: Page, text: string): Promise<void> {
  const textarea = page.locator("#prop-text");
  await expect(textarea).toBeVisible({ timeout: 5_000 });
  await textarea.fill(text);
}

export function waitForSyncPost(page: Page) {
  return page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes("/api/projects/") &&
      res.url().endsWith("/sync"),
    { timeout: 45_000 }
  );
}
