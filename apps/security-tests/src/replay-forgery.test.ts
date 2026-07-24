import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  API,
  buildValidPayload,
  devSession,
  resignPayload,
  syncPayload,
  waitForApi,
} from "./helpers.js";

describe("Replay attack prevention", () => {
  let session: Awaited<ReturnType<typeof devSession>>;

  beforeAll(async () => {
    await waitForApi();
  });

  beforeEach(async () => {
    session = await devSession();
  });

  it("rejects duplicate nonce (409)", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );

    const first = await syncPayload(projectId, session.token, payload);
    expect(first.status).toBe(200);

    const second = await syncPayload(projectId, session.token, payload);
    expect(second.status).toBe(409);
  });

  it("rejects expired timestamp", async () => {
    const projectId = crypto.randomUUID();
    let payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.timestamp = new Date(Date.now() - 600_000).toISOString();
    payload = resignPayload(payload, session.signSecretKey);

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(400);
  });

  it("rejects projectId mismatch between URL and payload", async () => {
    const projectId = crypto.randomUUID();
    const otherId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );

    const res = await syncPayload(otherId, session.token, payload);
    expect(res.status).toBe(400);
  });
});

describe("Signature forgery and malformed crypto", () => {
  let session: Awaited<ReturnType<typeof devSession>>;

  beforeAll(async () => {
    await waitForApi();
  });

  beforeEach(async () => {
    session = await devSession();
  });

  it("rejects random ML-DSA signature bytes", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.signature.value = toBase64(crypto.getRandomValues(new Uint8Array(128)));

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
  });

  it("rejects ciphertext tampering without valid re-sign", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.cipher.ciphertext = toBase64(new Uint8Array(32).fill(0xff));

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
  });

  it("rejects tampered cipher with invalid re-sign (wrong kem in sign bytes)", async () => {
    const projectId = crypto.randomUUID();
    let payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    const originalKem = payload.kem.ciphertext;
    payload.kem.ciphertext = toBase64(new Uint8Array(1088).fill(1));
    payload = resignPayload(payload, session.signSecretKey);
    payload.kem.ciphertext = originalKem;

    const res = await syncPayload(projectId, session.token, payload);
    expect(res.status).toBe(403);
  });

  it("rejects invalid base64 in KEM field", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );
    payload.kem.ciphertext = "!!!not-base64!!!";

    const res = await syncPayload(projectId, session.token, payload);
    expect([400, 403]).toContain(res.status);
  });

  it("rejects sync without Authorization header", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey
    );

    const res = await fetch(`${API}/api/projects/${projectId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(401);
  });
});

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
