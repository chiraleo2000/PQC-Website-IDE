import { blake3 } from "@noble/hashes/blake3.js";
import { config } from "../config.js";

export class CloudflarePagesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudflarePagesError";
  }
}

export function isCloudflareConfigured(): boolean {
  return Boolean(config.cloudflareApiToken && config.cloudflareAccountId);
}

/** Cloudflare Pages project names: lowercase, digits, single dashes, max 58. */
export function pagesProjectName(siteName: string, projectId: string): string {
  const slug = siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = projectId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 6) || "site";
  const name = `${slug || "site"}-${suffix}`.replace(/-+/g, "-");
  return name.slice(0, 58);
}

/** First 32 hex chars of BLAKE3 — the hash Cloudflare Pages direct upload expects. */
export function pagesFileHash(content: Uint8Array): string {
  return Buffer.from(blake3(content)).toString("hex").slice(0, 32);
}

export interface PagesFile {
  name: string;
  content: string;
}

type FetchImpl = typeof fetch;

interface CfResult {
  url?: string;
  aliases?: string[];
}

function productionUrl(projectName: string, result: CfResult | undefined): string {
  const preferred = result?.aliases?.find((alias) => alias.includes(`${projectName}.pages.dev`));
  if (preferred) return preferred;
  if (result?.url) return result.url;
  return `https://${projectName}.pages.dev`;
}

async function readBody(res: Response): Promise<{ success?: boolean; errors?: Array<{ message?: string }>; result?: CfResult }> {
  return (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: CfResult;
  };
}

function alreadyExists(body: { errors?: Array<{ message?: string }> }): boolean {
  return (body.errors ?? []).some((err) => /already/i.test(err.message ?? ""));
}

/**
 * Create the Pages project if needed, then direct-upload compiled files.
 * Throws before returning a URL when Cloudflare rejects the upload.
 */
export async function deployCompiledSite(opts: {
  projectName: string;
  files: PagesFile[];
  fetchImpl?: FetchImpl;
  accountId?: string;
  apiToken?: string;
}): Promise<{ url: string; pagesProjectName: string }> {
  const accountId = opts.accountId ?? config.cloudflareAccountId;
  const apiToken = opts.apiToken ?? config.cloudflareApiToken;
  const fetchImpl = opts.fetchImpl ?? fetch;
  if (!accountId || !apiToken) {
    throw new CloudflarePagesError("Cloudflare is not configured");
  }

  const headers = { Authorization: `Bearer ${apiToken}` };
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;

  const created = await fetchImpl(base, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: opts.projectName, production_branch: "main" }),
  });
  const createdBody = await readBody(created);
  if (!created.ok && !alreadyExists(createdBody)) {
    throw new CloudflarePagesError("Cloudflare project create failed");
  }

  const manifest: Record<string, string> = {};
  const form = new FormData();
  const encoder = new TextEncoder();
  for (const file of opts.files) {
    const path = file.name.startsWith("/") ? file.name : `/${file.name}`;
    const bytes = encoder.encode(file.content);
    const hash = pagesFileHash(bytes);
    manifest[path] = hash;
    form.append(hash, new Blob([bytes]), hash);
  }
  form.append("manifest", JSON.stringify(manifest));

  const uploaded = await fetchImpl(`${base}/${opts.projectName}/deployments`, {
    method: "POST",
    headers,
    body: form,
  });
  const uploadedBody = await readBody(uploaded);
  if (!uploaded.ok || uploadedBody.success === false) {
    throw new CloudflarePagesError("Cloudflare deployment failed");
  }

  return {
    pagesProjectName: opts.projectName,
    url: productionUrl(opts.projectName, uploadedBody.result),
  };
}
