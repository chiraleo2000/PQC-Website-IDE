import { describe, it, expect } from "vitest";
import {
  canonicalIntentSignBytes,
  canonicalSignBytes,
  combineHybridAesKey,
  DEFAULT_SITE_FUNCTIONS,
  encryptedAstPayloadSchema,
  fromBase64,
  generateX25519Keypair,
  isHybridPqcPayload,
  isPqcOnlyPayload,
  stateMutatingIntentSchema,
  toBase64,
  x25519SharedSecret,
} from "./crypto-payload.js";

const classicalKem = { algorithm: "X25519" as const, ephemeralPublicKey: "eDI1NTE5cHVibGljS2V5MTIz" };

const base = {
  version: 2 as const,
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  nonce: "550e8400-e29b-41d4-a716-446655440001",
  timestamp: new Date().toISOString(),
  kem: { algorithm: "ML-KEM-768" as const, ciphertext: "YQ==" },
  classicalKem,
  cipher: {
    algorithm: "AES-256-GCM" as const,
    iv: "YQ==",
    ciphertext: "YQ==",
    tag: "YQ==",
  },
  plaintextMeta: { astNodeCount: 1, schemaVersion: 1 as const },
  signature: { algorithm: "ML-DSA-65" as const, value: "YQ==" },
  signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440002",
};

describe("encryptedAstPayloadSchema", () => {
  it("parses valid hybrid payload", () => {
    expect(encryptedAstPayloadSchema.safeParse(base).success).toBe(true);
  });

  it("rejects missing classicalKem", () => {
    const { classicalKem: _, ...rest } = base;
    expect(encryptedAstPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects version 1", () => {
    expect(encryptedAstPayloadSchema.safeParse({ ...base, version: 1 }).success).toBe(false);
  });

  it("rejects non-uuid projectId", () => {
    expect(encryptedAstPayloadSchema.safeParse({ ...base, projectId: "x" }).success).toBe(false);
  });

  it("rejects short nonce", () => {
    expect(encryptedAstPayloadSchema.safeParse({ ...base, nonce: "short" }).success).toBe(false);
  });

  it("rejects invalid ISO timestamp", () => {
    expect(
      encryptedAstPayloadSchema.safeParse({ ...base, timestamp: "yesterday" }).success
    ).toBe(false);
  });

  it("rejects wrong cipher algorithm", () => {
    expect(
      encryptedAstPayloadSchema.safeParse({
        ...base,
        cipher: { ...base.cipher, algorithm: "AES-128-GCM" },
      }).success
    ).toBe(false);
  });

  it("rejects missing plaintextMeta.schemaVersion", () => {
    const { plaintextMeta: _, ...rest } = base;
    expect(encryptedAstPayloadSchema.safeParse(rest).success).toBe(false);
  });
});

describe("isHybridPqcPayload", () => {
  it("detects ML-KEM + X25519 + ML-DSA", () => {
    expect(isHybridPqcPayload(base)).toBe(true);
    expect(isPqcOnlyPayload(base)).toBe(true);
  });

  it("rejects RSA KEM", () => {
    expect(
      isHybridPqcPayload({
        ...base,
        kem: { algorithm: "RSA-2048", ciphertext: "x" },
      })
    ).toBe(false);
  });

  it("rejects ECC KEM", () => {
    expect(
      isHybridPqcPayload({
        ...base,
        kem: { algorithm: "ECC-P256", ciphertext: "x" },
      })
    ).toBe(false);
  });

  it("rejects RSA signature", () => {
    expect(
      isHybridPqcPayload({
        ...base,
        signature: { algorithm: "RSA-2048", value: "x" },
      })
    ).toBe(false);
  });
});

describe("X25519 + HKDF combiner", () => {
  it("derives identical AES keys for matching ECDH", () => {
    const a = generateX25519Keypair();
    const b = generateX25519Keypair();
    const ssA = x25519SharedSecret(a.secretKey, b.publicKey);
    const ssB = x25519SharedSecret(b.secretKey, a.publicKey);
    expect(ssA).toEqual(ssB);
    const pqc = new Uint8Array(32).fill(7);
    expect(combineHybridAesKey(pqc, ssA)).toEqual(combineHybridAesKey(pqc, ssB));
  });
});

describe("stateMutatingIntentSchema", () => {
  it("parses publish intent", () => {
    expect(
      stateMutatingIntentSchema.safeParse({
        projectId: base.projectId,
        action: "publish",
        nonce: base.nonce,
        timestamp: base.timestamp,
        signature: base.signature,
        signerPublicKeyId: base.signerPublicKeyId,
      }).success
    ).toBe(true);
  });

  it("rejects unknown action", () => {
    expect(
      stateMutatingIntentSchema.safeParse({
        projectId: base.projectId,
        action: "delete",
        nonce: base.nonce,
        timestamp: base.timestamp,
        signature: base.signature,
        signerPublicKeyId: base.signerPublicKeyId,
      }).success
    ).toBe(false);
  });
});

describe("canonical sign bytes", () => {
  it("intent bytes are stable", () => {
    const fields = {
      projectId: base.projectId,
      action: "publish" as const,
      nonce: base.nonce,
      timestamp: base.timestamp,
    };
    const a = canonicalIntentSignBytes(fields);
    const b = canonicalIntentSignBytes(fields);
    expect(Buffer.from(a).equals(b)).toBe(true);
  });

  it("covers the function manifest and ignores field order", () => {
    const fields = {
      projectId: base.projectId,
      action: "publish" as const,
      nonce: base.nonce,
      timestamp: base.timestamp,
    };
    const without = canonicalIntentSignBytes(fields);
    const withFns = canonicalIntentSignBytes({ ...fields, functions: DEFAULT_SITE_FUNCTIONS });
    const reordered = canonicalIntentSignBytes({
      ...fields,
      functions: [...DEFAULT_SITE_FUNCTIONS].reverse().map((fn) => ({
        ...fn,
        fields: [...fn.fields].reverse(),
      })),
    });
    expect(Buffer.from(without).equals(withFns)).toBe(false);
    expect(Buffer.from(withFns).equals(reordered)).toBe(true);
  });

  it("sync envelope bytes are stable and cover classicalKem", () => {
    const fields = {
      projectId: base.projectId,
      nonce: base.nonce,
      timestamp: base.timestamp,
      kem: base.kem,
      classicalKem: base.classicalKem,
      cipher: base.cipher,
    };
    const a = canonicalSignBytes(fields);
    const b = canonicalSignBytes(fields);
    expect(Buffer.from(a).equals(b)).toBe(true);
    const c = canonicalSignBytes({
      ...fields,
      classicalKem: { ...fields.classicalKem, ephemeralPublicKey: "other" },
    });
    expect(Buffer.from(a).equals(c)).toBe(false);
  });

  it("changes when kem ciphertext changes", () => {
    const fields = {
      projectId: base.projectId,
      nonce: base.nonce,
      timestamp: base.timestamp,
      kem: base.kem,
      classicalKem: base.classicalKem,
      cipher: base.cipher,
    };
    const a = canonicalSignBytes(fields);
    const b = canonicalSignBytes({
      ...fields,
      kem: { ...base.kem, ciphertext: "other" },
    });
    expect(Buffer.from(a).equals(b)).toBe(false);
  });
});

describe("toBase64 / fromBase64", () => {
  it("round-trips bytes", () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 255]);
    const encoded = toBase64(bytes);
    expect(fromBase64(encoded)).toEqual(bytes);
  });
});
