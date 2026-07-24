const API = import.meta.env.VITE_API_URL ?? "";

export interface AuthSession {
  token: string;
  signerPublicKeyId: string;
  kemPublicKeyB64: string;
  x25519PublicKeyB64: string;
  signPublicKeyB64: string;
}

/** @deprecated alias — prefer AuthSession */
export type DevSession = AuthSession;

export type AuthMode = "dev" | "login";

export function getAuthMode(): AuthMode {
  const mode = (import.meta.env.VITE_AUTH_MODE as string | undefined) ?? "dev";
  return mode === "login" ? "login" : "dev";
}

export function isOidcUiEnabled(): boolean {
  return import.meta.env.VITE_OIDC_ENABLED === "true";
}

export async function fetchAuthConfig(): Promise<{
  allowDevRegister: boolean;
  oidcConfigured: boolean;
}> {
  const res = await fetch(`${API}/api/auth/config`);
  if (!res.ok) {
    return { allowDevRegister: getAuthMode() === "dev", oidcConfigured: false };
  }
  return res.json() as Promise<{ allowDevRegister: boolean; oidcConfigured: boolean }>;
}

async function parseSession(res: Response, label: string): Promise<AuthSession> {
  if (!res.ok) {
    console.error(`[PQC Auth] ${label} failed: ${res.status} ${res.statusText}`);
    throw new Error(`Auth failed: ${res.status}`);
  }
  return res.json() as Promise<AuthSession>;
}

export async function registerDevSession(): Promise<AuthSession> {
  if (!API && import.meta.env.DEV) {
    console.error("[PQC Auth] VITE_API_URL is not configured (empty = same-origin proxy)");
  }

  try {
    const res = await fetch(`${API}/api/auth/dev-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dev@localhost",
        password:
          import.meta.env.VITE_DEV_AUTH_PASSWORD ??
          ["dev", "password", "32", "chars", "min!!"].join("-"),
      }),
    });
    return parseSession(res, "dev-register");
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Auth failed:")) throw e;
    console.error("[PQC Auth] Network error during registration:", e);
    throw e;
  }
}

export async function registerAccount(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseSession(res, "register");
}

export async function loginAccount(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseSession(res, "login");
}

export function oidcLoginUrl(): string {
  return `${API}/api/auth/oidc/login`;
}

export async function fetchSecurityAudit(
  token: string,
  limit = 20
): Promise<Array<{ event: string; priority: string; at: string; detail?: unknown }>> {
  const res = await fetch(`${API}/api/security/audit?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as {
    events: Array<{ event: string; priority: string; at: string; detail?: unknown }>;
  };
  return body.events ?? [];
}

export async function registerSignPublicKey(
  token: string,
  signerPublicKeyId: string,
  signPublicKeyB64: string
): Promise<void> {
  try {
    const res = await fetch(`${API}/api/auth/register-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ signerPublicKeyId, signPublicKeyB64 }),
    });
    if (!res.ok) {
      console.error(`[PQC Auth] Sign key registration failed: ${res.status}`);
      throw new Error(`Key registration failed: ${res.status}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Key registration failed:")) throw e;
    console.error("[PQC Auth] Network error during sign key registration:", e);
    throw e;
  }
}
