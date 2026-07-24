import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import {
  combineHybridAesKey,
  fromBase64,
  x25519SharedSecret,
  type EncryptedAstPayload,
} from "@pqc/shared";
import { createDecipheriv, timingSafeEqual } from "node:crypto";
import { CRYPTO_LIMITS, decodedBase64Length } from "../lib/crypto-limits.js";
import { verifyMlDsaOverSyncPayload } from "../lib/mldsa-verify.js";
import { CryptoServiceError } from "./crypto-client.js";

function secureZero(buf: Uint8Array): void {
  buf.fill(0);
}

function assertFieldSizes(payload: EncryptedAstPayload): void {
  const kemLen = decodedBase64Length(payload.kem.ciphertext);
  const sigLen = decodedBase64Length(payload.signature.value);
  const ephLen = decodedBase64Length(payload.classicalKem.ephemeralPublicKey);
  if (
    kemLen === null ||
    sigLen === null ||
    ephLen === null ||
    kemLen > CRYPTO_LIMITS.maxKemCiphertextDecoded ||
    sigLen > CRYPTO_LIMITS.maxSignatureDecoded
  ) {
    throw new CryptoServiceError(400);
  }
}

function decryptAesGcmPayload(
  payload: EncryptedAstPayload,
  kemSecretKeyB64: string,
  x25519SecretKeyB64: string
): string {
  let sk: Uint8Array;
  let ct: Uint8Array;
  let x25519Sk: Uint8Array;
  let ephPk: Uint8Array;
  try {
    sk = fromBase64(kemSecretKeyB64);
    ct = fromBase64(payload.kem.ciphertext);
    x25519Sk = fromBase64(x25519SecretKeyB64);
    ephPk = fromBase64(payload.classicalKem.ephemeralPublicKey);
  } catch {
    throw new CryptoServiceError(400);
  }

  if (sk.length > CRYPTO_LIMITS.maxKemSecretKeyDecoded) {
    throw new CryptoServiceError(400);
  }

  let sharedSecret: Uint8Array | null = null;
  let classicalSs: Uint8Array | null = null;
  let aesKey: Uint8Array | null = null;

  try {
    sharedSecret = ml_kem768.decapsulate(ct, sk);
    classicalSs = x25519SharedSecret(x25519Sk, ephPk);
    aesKey = combineHybridAesKey(sharedSecret.slice(0, 32), classicalSs);

    const iv = fromBase64(payload.cipher.iv);
    const ciphertext = fromBase64(payload.cipher.ciphertext);
    const tag = fromBase64(payload.cipher.tag);

    if (iv.length !== 12 || tag.length !== 16) {
      throw new CryptoServiceError(403);
    }

    const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
    decipher.setAuthTag(tag);
    const plainBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return plainBuf.toString("utf8");
  } catch (e) {
    if (e instanceof CryptoServiceError) throw e;
    throw new CryptoServiceError(403);
  } finally {
    if (aesKey) secureZero(aesKey);
    if (sharedSecret) secureZero(sharedSecret);
    if (classicalSs) secureZero(classicalSs);
    secureZero(x25519Sk);
  }
}

/**
 * Zero-trust decrypt pipeline:
 * 1. ML-DSA-65 verify over signed hybrid fields.
 * 2. ML-KEM + X25519 dual decapsulate → HKDF → AES-256-GCM.
 */
export function verifyAndDecryptLocal(
  payload: EncryptedAstPayload,
  signerPublicKeyB64: string,
  kemSecretKeyB64: string,
  x25519SecretKeyB64: string
): { verified: boolean; plaintext: string } {
  assertFieldSizes(payload);
  verifyMlDsaOverSyncPayload(payload, signerPublicKeyB64);
  const plaintext = decryptAesGcmPayload(payload, kemSecretKeyB64, x25519SecretKeyB64);
  return { verified: true, plaintext };
}

export function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
