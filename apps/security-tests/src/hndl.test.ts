/**
 * Harvest Now, Decrypt Later (HNDL) defense — classical layers must be rejected;
 * only hybrid ML-KEM-768 + X25519 + ML-DSA-65 sync path is accepted when ENFORCE_PQC_ONLY=true.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  API,
  buildValidPayload,
  devSession,
  resignPayload,
  syncPayload,
  waitForApi,
} from "./helpers.js";

describe("HNDL — classical algorithm rejection", () => {
  let session: Awaited<ReturnType<typeof devSession>>;

  beforeAll(async () => {
    await waitForApi();
  });

  beforeEach(async () => {
    session = await devSession();
  });

  it("accepts post-quantum ML-KEM-768 + X25519 + ML-DSA-65 (control)", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    expect(payload.version).toBe(2);
    expect(payload.kem.algorithm).toBe("ML-KEM-768");
    expect(payload.classicalKem.algorithm).toBe("X25519");
    expect(payload.signature.algorithm).toBe("ML-DSA-65");

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(200);
  });

  it("rejects RSA-2048 KEM (harvested classical envelope)", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.kem.algorithm = "RSA-2048";

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { message?: string; sessionRevoked?: boolean };
    expect(body.message).toBeDefined();
  });

  it("rejects ECC-P256 KEM", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.kem.algorithm = "ECC-P256";

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
  });

  it("rejects RSA-2048 signature algorithm", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.signature.algorithm = "RSA-2048";

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
  });

  it("enforces hybrid after stripping classical KEM: tampered ciphertext fails verify", async () => {
    const projectId = crypto.randomUUID();
    let payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.kem.ciphertext = btoa(String.fromCharCode(...new Uint8Array(64).fill(0xab)));
    payload = resignPayload(payload, session.signSecretKey);

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
  });

  it("health endpoint reports PQC enforcement when configured", async () => {
    const res = await fetch(`${API}/api/health`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { enforcePqcOnly?: boolean };
    if (process.env.ENFORCE_PQC_ONLY === "false") {
      expect(body.enforcePqcOnly).toBe(false);
    } else {
      expect(body.enforcePqcOnly).toBe(true);
    }
  });
});
