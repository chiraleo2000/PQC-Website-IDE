import type { Locator, Page } from "@playwright/test";
import { PQC_ALGORITHMS } from "@pqc/shared";

/** Pause durations tuned for live audiences (override with PQC_DEMO_PAUSE_MS). */
export function demoPauseMs(kind: "short" | "medium" | "long"): number {
  const scale = Number(process.env.PQC_DEMO_PAUSE_MS ?? 1);
  const base = { short: 1_200, medium: 2_500, long: 4_000 }[kind];
  return Math.round(base * scale);
}

export async function pause(page: Page, kind: "short" | "medium" | "long"): Promise<void> {
  await page.waitForTimeout(demoPauseMs(kind));
}

export async function showDemoToast(
  page: Page,
  message: string,
  variant: "info" | "success" | "warn" = "info"
): Promise<void> {
  const colors = {
    info: { bg: "#0891b2", fg: "#042f2e" },
    success: { bg: "#34d399", fg: "#052e16" },
    warn: { bg: "#fbbf24", fg: "#422006" },
  }[variant];

  await page.evaluate(
    ({ text, bg, fg }) => {
      const existing = document.getElementById("pqc-demo-toast");
      if (existing) existing.remove();
      const el = document.createElement("div");
      el.id = "pqc-demo-toast";
      el.setAttribute("role", "status");
      el.style.cssText = [
        "position:fixed",
        "bottom:24px",
        "right:24px",
        "max-width:420px",
        "padding:14px 18px",
        "border-radius:10px",
        "z-index:10001",
        "font:600 15px/1.4 system-ui,sans-serif",
        `background:${bg}`,
        `color:${fg}`,
        "box-shadow:0 12px 40px rgba(0,0,0,.45)",
        "transition:opacity .3s",
      ].join(";");
      el.textContent = text;
      document.body.appendChild(el);
    },
    { text: message, bg: colors.bg, fg: colors.fg }
  );
}

export async function showHndlBanner(page: Page): Promise<void> {
  await page.evaluate(() => {
    const id = "pqc-hndl-banner";
    if (document.getElementById(id)) return;
    const el = document.createElement("div");
    el.id = id;
    el.setAttribute("role", "note");
    el.style.cssText = [
      "position:fixed",
      "top:72px",
      "left:50%",
      "transform:translateX(-50%)",
      "max-width:720px",
      "padding:12px 20px",
      "border-radius:10px",
      "z-index:10000",
      "background:rgba(24,24,27,.92)",
      "border:1px solid #fbbf24",
      "color:#fde68a",
      "font:500 14px/1.45 system-ui,sans-serif",
      "text-align:center",
      "box-shadow:0 8px 32px rgba(0,0,0,.4)",
    ].join(";");
    el.innerHTML =
      "<strong>Harvest Now, Decrypt Later</strong> — Classical RSA/ECC ciphertext can be archived today and decrypted later. " +
      "This IDE enforces <strong>ML-KEM-768</strong> + <strong>ML-DSA-65</strong> only at the gateway.";
    document.body.appendChild(el);
  });
}

export type SyncPayloadPreview = {
  kem: { algorithm: string; ciphertext: string };
  cipher: { algorithm: string; iv: string; ciphertext: string; tag: string };
  signature: { algorithm: string; value: string };
  projectId?: string;
};

/** On-screen “network inspector” panel (DevTools is not automatable reliably in headed runs). */
export async function showNetworkInspector(
  page: Page,
  payload: SyncPayloadPreview,
  status: number
): Promise<void> {
  await page.evaluate(
    ({ body, httpStatus }) => {
      const id = "pqc-demo-network";
      let root = document.getElementById(id);
      if (!root) {
        root = document.createElement("div");
        root.id = id;
        root.style.cssText = [
          "position:fixed",
          "top:80px",
          "right:20px",
          "width:380px",
          "max-height:70vh",
          "overflow:auto",
          "z-index:10000",
          "border-radius:10px",
          "background:#0c0c0e",
          "border:1px solid #3f3f46",
          "box-shadow:0 16px 48px rgba(0,0,0,.55)",
          "font:12px/1.5 ui-monospace,monospace",
          "color:#e4e4e7",
        ].join(";");
        document.body.appendChild(root);
      }
      root.innerHTML = `
        <div style="padding:10px 12px;border-bottom:1px solid #27272a;background:#18181b;font-weight:600;font-family:system-ui,sans-serif">
          Network (demo) — POST /api/projects/…/sync
        </div>
        <div style="padding:8px 12px;border-bottom:1px solid #27272a;color:#34d399">
          HTTP ${httpStatus} OK · PQC envelope verified
        </div>
        <pre style="margin:0;padding:12px;white-space:pre-wrap;word-break:break-all">${body}</pre>
      `;
    },
    {
      httpStatus: status,
      body: JSON.stringify(payload, null, 2),
    }
  );
}

export async function hideDemoChrome(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const id of ["pqc-demo-toast", "pqc-demo-network", "pqc-hndl-banner", "pqc-demo-callout"]) {
      document.getElementById(id)?.remove();
    }
  });
}

export async function pulseHighlight(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(
    (rect) => {
      const id = "pqc-demo-pulse";
      document.getElementById(id)?.remove();
      const ring = document.createElement("div");
      ring.id = id;
      ring.style.cssText = [
        "position:fixed",
        `left:${rect.x - 6}px`,
        `top:${rect.y - 6}px`,
        `width:${rect.width + 12}px`,
        `height:${rect.height + 12}px`,
        "border:2px solid #22d3ee",
        "border-radius:8px",
        "pointer-events:none",
        "z-index:9999",
        "box-shadow:0 0 24px rgba(34,211,238,.5)",
        "animation:pqc-pulse 1.2s ease-in-out infinite",
      ].join(";");
      const style = document.createElement("style");
      style.textContent =
        "@keyframes pqc-pulse{0%,100%{opacity:1}50%{opacity:.35}}";
      document.head.appendChild(style);
      document.body.appendChild(ring);
    },
    { x: box.x, y: box.y, width: box.width, height: box.height }
  );
}

export async function showCalloutNear(
  page: Page,
  locator: Locator,
  text: string
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(
    ({ rect, label }) => {
      document.getElementById("pqc-demo-callout")?.remove();
      const el = document.createElement("div");
      el.id = "pqc-demo-callout";
      el.style.cssText = [
        "position:fixed",
        `left:${rect.x}px`,
        `top:${rect.y + rect.height + 8}px`,
        "max-width:280px",
        "padding:8px 12px",
        "border-radius:8px",
        "background:#164e63",
        "color:#ecfeff",
        "font:500 13px/1.35 system-ui,sans-serif",
        "z-index:10002",
        "box-shadow:0 6px 20px rgba(0,0,0,.35)",
      ].join(";");
      el.textContent = label;
      document.body.appendChild(el);
    },
    { rect: { x: box.x, y: box.y, width: box.width, height: box.height }, label: text }
  );
}

export function formatPayloadPreview(body: unknown): SyncPayloadPreview {
  const p = body as SyncPayloadPreview;
  return {
    projectId: p.projectId,
    kem: {
      algorithm: p.kem?.algorithm ?? PQC_ALGORITHMS.KEM,
      ciphertext: `${(p.kem?.ciphertext ?? "").slice(0, 48)}…`,
    },
    cipher: {
      algorithm: p.cipher?.algorithm ?? PQC_ALGORITHMS.CIPHER,
      iv: `${(p.cipher?.iv ?? "").slice(0, 16)}…`,
      ciphertext: `${(p.cipher?.ciphertext ?? "").slice(0, 48)}…`,
      tag: `${(p.cipher?.tag ?? "").slice(0, 16)}…`,
    },
    signature: {
      algorithm: p.signature?.algorithm ?? PQC_ALGORITHMS.SIGN,
      value: `${(p.signature?.value ?? "").slice(0, 48)}…`,
    },
  };
}
