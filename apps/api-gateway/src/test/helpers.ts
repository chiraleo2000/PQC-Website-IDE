import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import jwt from "jsonwebtoken";
import {
  canonicalIntentSignBytes,
  canonicalSignBytes,
  createDefaultRoot,
  generateX25519Keypair,
  toBase64,
  type EncryptedAstPayload,
  type StateMutatingIntent,
} from "@pqc/shared";
import { config } from "../config.js";
import { memoryStore } from "../db/memory-store.js";

export type TestSigningKeys = {
  userId: string;
  signerKeyId: string;
  token: string;
  signSecretKey: Uint8Array;
  signPublicKeyB64: string;
};

export function seedUserWithKey(): TestSigningKeys {
  const userId = "550e8400-e29b-41d4-a716-446655440010";
  const signerKeyId = "550e8400-e29b-41d4-a716-446655440011";
  const signSeed = new Uint8Array(32).fill(7);
  const signKeys = ml_dsa65.keygen(signSeed);
  const signPublicKeyB64 = toBase64(signKeys.publicKey);
  const x25519 = generateX25519Keypair();

  memoryStore.users.set(userId, {
    id: userId,
    email: "test@test.local",
    passwordHash: "hash",
  });
  memoryStore.signingKeys.set(signerKeyId, {
    id: signerKeyId,
    userId,
    publicKeyB64: signPublicKeyB64,
    kemPublicKeyB64: "a2VtcHVibGlj",
    kemSecretKeyB64: "a2Vtc2VjcmV0",
    x25519PublicKeyB64: toBase64(x25519.publicKey),
    x25519SecretKeyB64: toBase64(x25519.secretKey),
  });
  const token = jwt.sign({ sub: userId, email: "test@test.local" }, config.jwtSecret);
  return {
    userId,
    signerKeyId,
    token,
    signSecretKey: signKeys.secretKey,
    signPublicKeyB64,
  };
}

export function signedPublishIntent(
  projectId: string,
  signerKeyId: string,
  signSecretKey: Uint8Array
): StateMutatingIntent {
  const fields = {
    projectId,
    action: "publish" as const,
    nonce: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const sig = ml_dsa65.sign(signSecretKey, canonicalIntentSignBytes(fields));
  return {
    ...fields,
    signature: { algorithm: "ML-DSA-65", value: toBase64(sig) },
    signerPublicKeyId: signerKeyId,
  };
}

/** Unsigned/minimal envelope — fails ML-DSA unless crypto path is mocked. */
export function minimalPayload(projectId: string, signerKeyId: string): EncryptedAstPayload {
  return {
    version: 2,
    projectId,
    nonce: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    kem: { algorithm: "ML-KEM-768", ciphertext: "YWVz" },
    classicalKem: { algorithm: "X25519", ephemeralPublicKey: "eDI1NTE5" },
    cipher: {
      algorithm: "AES-256-GCM",
      iv: "aXY=",
      ciphertext: "Y3Q=",
      tag: "dGFn",
    },
    plaintextMeta: { astNodeCount: 1, schemaVersion: 1 },
    signature: { algorithm: "ML-DSA-65", value: "c2ln" },
    signerPublicKeyId: signerKeyId,
  };
}

/** Valid ML-DSA signature over envelope fields (passes validateSyncEnvelope + verifyMlDsa). */
export function signedSyncPayload(
  projectId: string,
  signerKeyId: string,
  signSecretKey: Uint8Array,
  overrides: Partial<EncryptedAstPayload> = {}
): EncryptedAstPayload {
  const base = minimalPayload(projectId, signerKeyId);
  const merged = {
    ...base,
    ...overrides,
    projectId,
    signerPublicKeyId: signerKeyId,
  };
  const signFields = {
    projectId: merged.projectId,
    nonce: merged.nonce,
    timestamp: merged.timestamp,
    kem: merged.kem,
    classicalKem: merged.classicalKem,
    cipher: merged.cipher,
  };
  const sig = ml_dsa65.sign(signSecretKey, canonicalSignBytes(signFields));
  return {
    ...merged,
    signature: { algorithm: "ML-DSA-65", value: toBase64(sig) },
  };
}

export const validDecryptedAst = () => JSON.stringify(createDefaultRoot());
