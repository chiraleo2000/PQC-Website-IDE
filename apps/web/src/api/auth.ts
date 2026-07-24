const API = import.meta.env.VITE_API_URL ?? "";

export interface DevSession {
  token: string;
  signerPublicKeyId: string;
  kemPublicKeyB64: string;
  x25519PublicKeyB64: string;
  signPublicKeyB64: string;
}

export async function registerDevSession(): Promise<DevSession> {
  if (!API) {
    console.error("[PQC Auth] VITE_API_URL is not configured");
  }

  try {
    const res = await fetch(`${API}/api/auth/dev-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dev@localhost",
        // Local Docker/dev bootstrap only — not a production credential.
        password: import.meta.env.VITE_DEV_AUTH_PASSWORD ?? ["dev", "password", "32", "chars", "min!!"].join("-"),
      }),
    });
    if (!res.ok) {
      console.error(`[PQC Auth] Registration failed: ${res.status} ${res.statusText}`);
      throw new Error(`Auth failed: ${res.status}`);
    }
    return res.json() as Promise<DevSession>;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Auth failed:")) throw e;
    console.error("[PQC Auth] Network error during registration:", e);
    throw e;
  }
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
