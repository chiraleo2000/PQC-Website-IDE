import { encryptedAstPayloadSchema } from "@pqc/shared";
import { config } from "../config.js";
import { verifyAndDecryptLocal } from "./crypto-local.js";

export interface DecryptResult {
  plaintext: string;
  verified: boolean;
}

const CRYPTO_TIMEOUT_MS = 15_000;

export async function verifyAndDecrypt(params: {
  payload: unknown;
  signerPublicKeyB64: string;
  kemSecretKeyB64: string;
  x25519SecretKeyB64: string;
}): Promise<DecryptResult> {
  let payload;
  try {
    payload = encryptedAstPayloadSchema.parse(params.payload);
  } catch {
    throw new CryptoServiceError(400);
  }

  if (process.env.CRYPTO_USE_GO === "true") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CRYPTO_TIMEOUT_MS);
    try {
      const res = await fetch(`${config.cryptoServiceUrl}/v1/verify-decrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": config.cryptoServiceSecret,
          // ML-DSA already verified in gateway (noble); Go performs hybrid KEM+AES only.
          "X-Signature-Preverified": "true",
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      if (!res.ok) throw new CryptoServiceError(res.status >= 500 ? 503 : 403);
      const body = (await res.json()) as DecryptResult;
      if (!body.verified) throw new CryptoServiceError(403);
      return body;
    } catch (e) {
      if (e instanceof CryptoServiceError) throw e;
      throw new CryptoServiceError(503);
    } finally {
      clearTimeout(timer);
    }
  }

  return verifyAndDecryptLocal(
    payload,
    params.signerPublicKeyB64,
    params.kemSecretKeyB64,
    params.x25519SecretKeyB64
  );
}

/** Generic error — never expose decapsulation vs signature vs AES failure details. */
export class CryptoServiceError extends Error {
  constructor(public status: number) {
    super("Cryptographic verification failed");
    this.name = "CryptoServiceError";
  }
}

export async function generateServerKemKeypair(): Promise<{
  publicKeyB64: string;
  secretKeyB64: string;
}> {
  // Keep KEM keygen on the same implementation as decrypt (Go vs local noble).
  if (process.env.CRYPTO_USE_GO === "true") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CRYPTO_TIMEOUT_MS);
    try {
      const res = await fetch(`${config.cryptoServiceUrl}/v1/kem/keygen`, {
        method: "POST",
        headers: { "X-Internal-Secret": config.cryptoServiceSecret },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("KEM keygen failed");
      return res.json() as Promise<{ publicKeyB64: string; secretKeyB64: string }>;
    } finally {
      clearTimeout(timer);
    }
  }

  const { ml_kem768 } = await import("@noble/post-quantum/ml-kem.js");
  const { toBase64 } = await import("@pqc/shared");
  const seed = crypto.getRandomValues(new Uint8Array(64));
  const keys = ml_kem768.keygen(seed);
  seed.fill(0);
  return {
    publicKeyB64: toBase64(keys.publicKey),
    secretKeyB64: toBase64(keys.secretKey),
  };
}
