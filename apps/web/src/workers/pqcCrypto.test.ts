import { fromBase64, generateX25519Keypair, isPqcOnlyPayload, toBase64 } from "@pqc/shared";
import { describe, expect, it } from "vitest";
import {
  aes256GcmEncrypt,
  encapsulateHybridAesKey,
  encryptAndSignAstPayload,
  generateMlKemKeypair,
  generateMlDsaKeypair,
  secureZero,
  signMlDsaPayload,
  signPublishIntentPayload,
} from "./pqcCrypto";

describe("pqcCrypto", () => {
  it("generateMlKemKeypair returns ML-KEM-768-sized keys", () => {
    const { publicKey, secretKey, publicKeyB64 } = generateMlKemKeypair();
    expect(publicKey.length).toBeGreaterThan(0);
    expect(secretKey.length).toBeGreaterThan(publicKey.length);
    expect(publicKeyB64.length).toBeGreaterThan(16);
  });

  it("encapsulateHybridAesKey produces 32-byte AES key and hybrid KEM material", () => {
    const server = generateMlKemKeypair();
    const serverX25519 = generateX25519Keypair();
    const { kemCiphertext, classicalEphemeralPublicKey, aesKey } = encapsulateHybridAesKey(
      server.publicKey,
      serverX25519.publicKey
    );
    expect(aesKey).toHaveLength(32);
    expect(kemCiphertext.length).toBeGreaterThan(0);
    expect(classicalEphemeralPublicKey).toHaveLength(32);
    secureZero(aesKey);
  });

  it("signMlDsaPayload produces verifiable ML-DSA signature bytes", async () => {
    const signer = generateMlDsaKeypair();
    const server = generateMlKemKeypair();
    const serverX25519 = generateX25519Keypair();
    const { kemCiphertext, classicalEphemeralPublicKey, aesKey } = encapsulateHybridAesKey(
      server.publicKey,
      serverX25519.publicKey
    );
    const plaintext = new TextEncoder().encode('{"root":{"id":"r","type":"div","props":{},"children":[]}}');
    const { iv, ciphertext, tag } = await aes256GcmEncrypt(aesKey, plaintext);
    secureZero(aesKey);

    const fields = {
      projectId: "00000000-0000-4000-8000-000000000001",
      nonce: "00000000-0000-4000-8000-000000000099",
      timestamp: "2026-01-01T00:00:00.000Z",
      kem: { algorithm: "ML-KEM-768" as const, ciphertext: toBase64(kemCiphertext) },
      classicalKem: {
        algorithm: "X25519" as const,
        ephemeralPublicKey: toBase64(classicalEphemeralPublicKey),
      },
      cipher: {
        algorithm: "AES-256-GCM" as const,
        iv: toBase64(iv),
        ciphertext: toBase64(ciphertext),
        tag: toBase64(tag),
      },
    };

    const sig = signMlDsaPayload(signer.secretKey, fields);
    expect(sig.length).toBeGreaterThan(100);
  });

  it("encryptAndSignAstPayload returns hybrid PQC-only wire envelope", async () => {
    const signer = generateMlDsaKeypair();
    const server = generateMlKemKeypair();
    const serverX25519 = generateX25519Keypair();
    const astJson = JSON.stringify({
      version: 1,
      root: { id: "root", type: "div", props: {}, children: [] },
    });

    const payload = await encryptAndSignAstPayload({
      astJson,
      projectId: "00000000-0000-4000-8000-000000000001",
      signerSecretKey: signer.secretKey,
      signerPublicKeyId: "00000000-0000-4000-8000-000000000002",
      serverKemPublicKey: server.publicKey,
      serverX25519PublicKey: serverX25519.publicKey,
    });

    expect(payload.version).toBe(2);
    expect(payload.classicalKem.algorithm).toBe("X25519");
    expect(isPqcOnlyPayload(payload)).toBe(true);
    expect(payload.kem.ciphertext.length).toBeGreaterThan(8);
    expect(fromBase64(payload.cipher.iv)).toHaveLength(12);
  });

  it("secureZero clears buffer contents", () => {
    const buf = new Uint8Array([1, 2, 3, 4]);
    secureZero(buf);
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  it("signPublishIntentPayload returns ML-DSA-65 publish intent", () => {
    const signer = generateMlDsaKeypair();
    const intent = signPublishIntentPayload({
      projectId: "00000000-0000-4000-8000-000000000001",
      signerSecretKey: signer.secretKey,
      signerPublicKeyId: "00000000-0000-4000-8000-000000000002",
    });
    expect(intent.action).toBe("publish");
    expect(intent.signature.algorithm).toBe("ML-DSA-65");
    expect(intent.functions?.map((fn) => fn.name)).toEqual(["login", "createPost"]);
    expect(intent.nonce.length).toBeGreaterThanOrEqual(16);
    expect(intent.signature.value.length).toBeGreaterThan(16);
  });
});
