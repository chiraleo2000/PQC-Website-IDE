import type { AstRoot } from "@pqc/shared";
import {
  encryptAndSignAst,
  getSignSecretKey,
  signPublishIntent,
} from "../crypto/pqcClient";

const API = import.meta.env.VITE_API_URL ?? "";

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return error instanceof Error && /failed to fetch|network/i.test(error.message);
}

/** One retry for a dropped connection. HTTP error responses are not retried. */
async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return await fetch(input, init);
  }
}

export async function syncProject(params: {
  projectId: string;
  ast: AstRoot;
  authToken: string;
  signerPublicKeyId: string;
  serverKemPublicKeyB64: string;
  serverX25519PublicKeyB64: string;
  projectName?: string;
}): Promise<void> {
  const payload = await encryptAndSignAst({
    astJson: JSON.stringify(params.ast),
    projectId: params.projectId,
    signerPublicKeyId: params.signerPublicKeyId,
    serverKemPublicKeyB64: params.serverKemPublicKeyB64,
    serverX25519PublicKeyB64: params.serverX25519PublicKeyB64,
    signerSecretKey: getSignSecretKey(),
  });

  try {
    const res = await fetchWithRetry(`${API}/api/projects/${params.projectId}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.authToken}`,
        ...(params.projectName
          ? { "X-Project-Name": encodeURIComponent(params.projectName) }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[PQC Projects] Sync failed: ${res.status} ${res.statusText}`);
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? `Sync failed: ${res.status}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Sync failed:")) throw e;
    console.error("[PQC Projects] Network error during sync:", e);
    throw e;
  }
}

export async function exportProjectZip(params: {
  projectId: string;
  authToken: string;
  projectName?: string;
  demoMode?: boolean;
}): Promise<void> {
  try {
    const qs = params.demoMode ? "?demoMode=true" : "";
    const res = await fetchWithRetry(`${API}/api/projects/${params.projectId}/export${qs}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.authToken}`,
      },
    });

    if (!res.ok) {
      console.error(`[PQC Projects] Export failed: ${res.status} ${res.statusText}`);
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? `Export failed: ${res.status}`);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename =
      match?.[1] ??
      `${(params.projectName ?? "site").replace(/[^\w.-]+/g, "-").toLowerCase() || "site"}.zip`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Export failed:")) throw e;
    console.error("[PQC Projects] Network error during export:", e);
    throw e;
  }
}

export async function publishProject(params: {
  projectId: string;
  authToken: string;
  signerPublicKeyId: string;
  projectName?: string;
}): Promise<{
  ok: boolean;
  publishedAt: string;
  url?: string | null;
  httpsConfigured?: boolean;
  notice?: string;
}> {
  const intent = await signPublishIntent({
    projectId: params.projectId,
    signerPublicKeyId: params.signerPublicKeyId,
    signerSecretKey: getSignSecretKey(),
  });

  try {
    const res = await fetchWithRetry(`${API}/api/projects/${params.projectId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.authToken}`,
        ...(params.projectName
          ? { "X-Project-Name": encodeURIComponent(params.projectName) }
          : {}),
      },
      body: JSON.stringify(intent),
    });

    if (!res.ok) {
      console.error(`[PQC Projects] Publish failed: ${res.status} ${res.statusText}`);
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? `Publish failed: ${res.status}`);
    }

    return res.json() as Promise<{
      ok: boolean;
      publishedAt: string;
      url?: string | null;
      httpsConfigured?: boolean;
      notice?: string;
    }>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Publish failed:")) throw e;
    console.error("[PQC Projects] Network error during publish:", e);
    throw e;
  }
}
