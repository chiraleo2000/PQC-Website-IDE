import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import {
  PQC_ALGORITHMS,
  canonicalSignBytes,
  combineHybridAesKey,
  createDefaultRoot,
  createNode,
  fromBase64,
  generateX25519Keypair,
  toBase64,
  x25519SharedSecret,
  type AstRoot,
  type EncryptedAstPayload,
} from "@pqc/shared";

export const API = process.env.API_URL ?? "http://localhost:4000";

export async function waitForApi(maxAttempts = 30, delayMs = 1000): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${API}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`API gateway not reachable at ${API}`);
}

export async function devSession() {
  const res = await fetch(`${API}/api/auth/dev-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `audit-${Date.now()}@security.test`,
      password: ["test", "password", "32", "chars", "min!!"].join("-"),
    }),
  });
  if (!res.ok) throw new Error(`dev-register failed: ${res.status}`);
  const session = (await res.json()) as {
    token: string;
    signerPublicKeyId: string;
    kemPublicKeyB64: string;
    x25519PublicKeyB64: string;
  };

  const signSeed = crypto.getRandomValues(new Uint8Array(32));
  const signKeys = ml_dsa65.keygen(signSeed);
  const reg = await fetch(`${API}/api/auth/register-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      signerPublicKeyId: session.signerPublicKeyId,
      signPublicKeyB64: toBase64(signKeys.publicKey),
    }),
  });
  if (!reg.ok) throw new Error(`register-keys failed: ${reg.status}`);

  return { ...session, signSecretKey: signKeys.secretKey };
}

export function astWithXssPayload(): AstRoot {
  return {
    version: 1,
    root: {
      id: crypto.randomUUID(),
      type: "section",
      props: { className: "page" },
      children: [
        createNode("p", { children: '<script>alert("xss")</script>' }),
        createNode("a", { href: "javascript:alert(1)", children: "click" }),
      ],
    },
  };
}

export async function buildValidPayload(
  projectId: string,
  signerPublicKeyId: string,
  serverKemPublicB64: string,
  serverX25519PublicB64: string,
  signSecretKey: Uint8Array,
  ast: AstRoot = createDefaultRoot()
): Promise<EncryptedAstPayload> {
  const plaintext = new TextEncoder().encode(JSON.stringify(ast));
  const serverPk = fromBase64(serverKemPublicB64);
  const serverX25519Pk = fromBase64(serverX25519PublicB64);

  const { cipherText: kemCt, sharedSecret: pqcSs } = ml_kem768.encapsulate(serverPk);
  const eph = generateX25519Keypair();
  const classicalSs = x25519SharedSecret(eph.secretKey, serverX25519Pk);
  const aesKey = combineHybridAesKey(pqcSs.slice(0, 32), classicalSs);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKeyCopy = new Uint8Array(aesKey);
  const cryptoKey = await crypto.subtle.importKey("raw", aesKeyCopy, "AES-GCM", false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    cryptoKey,
    plaintext
  );
  const combined = new Uint8Array(ct);
  const tagLen = 16;

  const nonce = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const kem = { algorithm: PQC_ALGORITHMS.KEM as "ML-KEM-768", ciphertext: toBase64(kemCt) };
  const classicalKem = {
    algorithm: PQC_ALGORITHMS.CLASSICAL_KEM as "X25519",
    ephemeralPublicKey: toBase64(eph.publicKey),
  };
  const cipher = {
    algorithm: "AES-256-GCM" as const,
    iv: toBase64(iv),
    ciphertext: toBase64(combined.subarray(0, combined.length - tagLen)),
    tag: toBase64(combined.subarray(combined.length - tagLen)),
  };

  const signFields = { projectId, nonce, timestamp, kem, classicalKem, cipher };
  const sig = ml_dsa65.sign(signSecretKey, canonicalSignBytes(signFields));

  return {
    version: 2,
    ...signFields,
    plaintextMeta: { astNodeCount: 4, schemaVersion: 1 },
    signature: { algorithm: PQC_ALGORITHMS.SIGN as "ML-DSA-65", value: toBase64(sig) },
    signerPublicKeyId,
  };
}

/** Re-sign after tampering fields (for valid ML-DSA over modified cipher). */
export function resignPayload(
  payload: EncryptedAstPayload,
  signSecretKey: Uint8Array
): EncryptedAstPayload {
  const signFields = {
    projectId: payload.projectId,
    nonce: payload.nonce,
    timestamp: payload.timestamp,
    kem: payload.kem,
    classicalKem: payload.classicalKem,
    cipher: payload.cipher,
  };
  const sig = ml_dsa65.sign(signSecretKey, canonicalSignBytes(signFields));
  return {
    ...payload,
    signature: { algorithm: "ML-DSA-65", value: toBase64(sig) },
  };
}

export async function syncPayload(
  projectId: string,
  token: string,
  payload: EncryptedAstPayload
): Promise<Response> {
  return fetch(`${API}/api/projects/${projectId}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function exportProject(projectId: string, token: string): Promise<Response> {
  return fetch(`${API}/api/projects/${projectId}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
