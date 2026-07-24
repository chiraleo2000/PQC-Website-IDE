import { z } from "zod";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { x25519 } from "@noble/curves/ed25519.js";

export const PQC_ALGORITHMS = {
  KEM: "ML-KEM-768",
  SIGN: "ML-DSA-65",
  CIPHER: "AES-256-GCM",
  CLASSICAL_KEM: "X25519",
} as const;

export const HYBRID_HKDF_INFO = new TextEncoder().encode("pqc-ide-hybrid-v1");

export const kemBlockSchema = z.object({
  algorithm: z.enum(["ML-KEM-768", "RSA-2048", "ECC-P256"]),
  ciphertext: z.string(),
});

export const classicalKemBlockSchema = z.object({
  algorithm: z.literal("X25519"),
  ephemeralPublicKey: z.string().min(8),
});

export const cipherBlockSchema = z.object({
  algorithm: z.literal("AES-256-GCM"),
  iv: z.string(),
  ciphertext: z.string(),
  tag: z.string(),
});

export const signatureBlockSchema = z.object({
  algorithm: z.enum(["ML-DSA-65", "RSA-2048"]),
  value: z.string(),
});

export const encryptedAstPayloadSchema = z.object({
  version: z.literal(2),
  projectId: z.string().uuid(),
  nonce: z.string().min(16),
  timestamp: z.string().datetime(),
  kem: kemBlockSchema,
  classicalKem: classicalKemBlockSchema,
  cipher: cipherBlockSchema,
  plaintextMeta: z.object({
    astNodeCount: z.number().int().nonnegative(),
    schemaVersion: z.literal(1),
  }),
  signature: signatureBlockSchema,
  signerPublicKeyId: z.string().uuid(),
});

export type EncryptedAstPayload = z.infer<typeof encryptedAstPayloadSchema>;
export type ClassicalKemBlock = z.infer<typeof classicalKemBlockSchema>;

export type SignablePayloadFields = Pick<
  EncryptedAstPayload,
  "projectId" | "nonce" | "timestamp" | "kem" | "classicalKem" | "cipher"
>;

export function canonicalSignBytes(fields: SignablePayloadFields): Uint8Array {
  const ordered = {
    cipher: fields.cipher,
    classicalKem: fields.classicalKem,
    kem: fields.kem,
    nonce: fields.nonce,
    projectId: fields.projectId,
    timestamp: fields.timestamp,
  };
  return new TextEncoder().encode(JSON.stringify(ordered));
}

/** Signed intent for state-mutating actions that do not carry a full encrypted AST (e.g. Publish). */
export const stateMutatingIntentSchema = z.object({
  projectId: z.string().uuid(),
  action: z.enum(["publish"]),
  nonce: z.string().min(16),
  timestamp: z.string().datetime(),
  signature: signatureBlockSchema,
  signerPublicKeyId: z.string().uuid(),
});

export type StateMutatingIntent = z.infer<typeof stateMutatingIntentSchema>;

export type SignableIntentFields = Pick<
  StateMutatingIntent,
  "projectId" | "action" | "nonce" | "timestamp"
>;

export function canonicalIntentSignBytes(fields: SignableIntentFields): Uint8Array {
  const ordered = {
    action: fields.action,
    nonce: fields.nonce,
    projectId: fields.projectId,
    timestamp: fields.timestamp,
  };
  return new TextEncoder().encode(JSON.stringify(ordered));
}

/**
 * True hybrid: ML-KEM-768 + X25519 + ML-DSA-65 + AES-256-GCM.
 * Classical-only or PQC-without-classical fails.
 */
export function isHybridPqcPayload(payload: EncryptedAstPayload): boolean {
  return (
    payload.kem.algorithm === PQC_ALGORITHMS.KEM &&
    payload.classicalKem.algorithm === PQC_ALGORITHMS.CLASSICAL_KEM &&
    payload.signature.algorithm === PQC_ALGORITHMS.SIGN &&
    payload.cipher.algorithm === PQC_ALGORITHMS.CIPHER
  );
}

/** @deprecated Prefer isHybridPqcPayload — alias kept for callers. */
export function isPqcOnlyPayload(payload: EncryptedAstPayload): boolean {
  return isHybridPqcPayload(payload);
}

/** HKDF-SHA256(ikm = ML-KEM-SS || X25519-SS, info = pqc-ide-hybrid-v1) → 32-byte AES key. */
export function combineHybridAesKey(mlKemSharedSecret: Uint8Array, x25519SharedSecret: Uint8Array): Uint8Array {
  const ikm = new Uint8Array(mlKemSharedSecret.length + x25519SharedSecret.length);
  ikm.set(mlKemSharedSecret);
  ikm.set(x25519SharedSecret, mlKemSharedSecret.length);
  return hkdf(sha256, ikm, undefined, HYBRID_HKDF_INFO, 32);
}

export function generateX25519Keypair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const secretKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(secretKey);
  return { publicKey, secretKey };
}

export function x25519SharedSecret(secretKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(secretKey, theirPublicKey);
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCodePoint(b);
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.codePointAt(i)!;
  return out;
}
