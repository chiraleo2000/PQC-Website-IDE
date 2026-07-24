import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "demo-shots");

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

console.log("Opening IDE at http://127.0.0.1:4001/ ...");
await page.goto("http://127.0.0.1:4001/", { waitUntil: "networkidle", timeout: 60_000 });

const badge = page.getByTestId("pqc-status-badge");
await badge.waitFor({ state: "visible", timeout: 45_000 });
const badgeText = await badge.innerText();
expectText(/ML-KEM|ready|Saved/i, badgeText);
await page.screenshot({ path: path.join(out, "01-shell.png"), fullPage: true });

console.log("Nav: Templates");
await page.getByTestId("nav-templates").click();
await page.getByTestId("templates-panel").waitFor({ state: "visible" });
await page.screenshot({ path: path.join(out, "02-templates.png"), fullPage: true });
await page.getByTestId("template-blog").click();
        await page.getByTestId("page-canvas").waitFor({ state: "visible", timeout: 15_000 });
await page.screenshot({ path: path.join(out, "03-builder-blog.png"), fullPage: true });

console.log("Preset Hero + Undo");
await page.getByTestId("preset-hero").click();
await page.waitForTimeout(400);
await page.getByTestId("undo-action").click();
await page.waitForTimeout(300);

console.log("Nav: PQC Security");
await page.getByTestId("nav-pqc").click();
await page.getByTestId("pqc-panel").waitFor({ state: "visible" });
await page.screenshot({ path: path.join(out, "04-pqc-panel.png"), fullPage: true });
await page.getByTestId("nav-builder").click();

console.log("Save / Publish / Preview / Export");
const syncWait = page.waitForResponse(
  (res) =>
    res.request().method() === "POST" &&
    res.url().includes("/sync") &&
    res.status() === 200,
  { timeout: 60_000 }
);
await page.getByTestId("save-project").click();
console.log("Sync:", (await syncWait).url());

const pubWait = page.waitForResponse(
  (res) =>
    res.request().method() === "POST" &&
    res.url().includes("/publish") &&
    res.status() === 200,
  { timeout: 60_000 }
);
await page.getByTestId("publish-project").click();
console.log("Publish:", (await pubWait).url());
await page.getByTestId("preview-modal").waitFor({ state: "visible", timeout: 15_000 });
await page.screenshot({ path: path.join(out, "05-preview.png"), fullPage: true });
await page.getByTestId("preview-close").click();

const exportWait = page.waitForResponse(
  (res) => res.url().includes("/export") && res.status() === 200,
  { timeout: 60_000 }
);
await page.getByTestId("export-project").click();
const exportRes = await exportWait;
console.log("Export:", exportRes.status(), exportRes.headers()["content-type"]);
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, "06-after-export.png"), fullPage: true });

console.log("Final badge:", await badge.innerText());
console.log("DEMO_OK", out);
await page.waitForTimeout(2500);
await browser.close();

function expectText(re, actual) {
  if (!re.test(actual)) throw new Error(`Expected ${re} got ${actual}`);
}
