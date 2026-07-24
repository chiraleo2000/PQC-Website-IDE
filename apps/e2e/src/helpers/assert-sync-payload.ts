import { encryptedAstPayloadSchema, PQC_ALGORITHMS } from "@pqc/shared";
import { expect } from "@playwright/test";

function isValidBase64(value: string): boolean {
  if (!value || value.length > 16_777_216) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

/**
 * Assert sync POST body matches the hybrid encrypted AST envelope
 * (ML-KEM + X25519 + AES-GCM + ML-DSA).
 * Call before awaiting the HTTP response so invalid payloads fail fast.
 */
export function assertValidPqcSyncPayload(body: unknown): void {
  const parsed = encryptedAstPayloadSchema.safeParse(body);
  if (!parsed.success) {
    expect(parsed.error.flatten()).toEqual({});
  }
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;

  const payload = parsed.data;
  expect(payload.version).toBe(2);
  expect(payload.kem.algorithm).toBe(PQC_ALGORITHMS.KEM);
  expect(payload.classicalKem.algorithm).toBe(PQC_ALGORITHMS.CLASSICAL_KEM);
  expect(payload.signature.algorithm).toBe(PQC_ALGORITHMS.SIGN);
  expect(payload.cipher.algorithm).toBe(PQC_ALGORITHMS.CIPHER);

  expect(isValidBase64(payload.kem.ciphertext)).toBe(true);
  expect(isValidBase64(payload.classicalKem.ephemeralPublicKey)).toBe(true);
  expect(isValidBase64(payload.cipher.iv)).toBe(true);
  expect(isValidBase64(payload.cipher.ciphertext)).toBe(true);
  expect(isValidBase64(payload.cipher.tag)).toBe(true);
  expect(isValidBase64(payload.signature.value)).toBe(true);

  expect(payload.kem.ciphertext.length).toBeGreaterThan(8);
  expect(payload.classicalKem.ephemeralPublicKey.length).toBeGreaterThanOrEqual(8);
  expect(payload.signature.value.length).toBeGreaterThan(8);
  expect(payload.plaintextMeta.astNodeCount).toBeGreaterThan(0);
  expect(payload.nonce.length).toBeGreaterThanOrEqual(16);
}
