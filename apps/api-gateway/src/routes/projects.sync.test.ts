import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import { memoryStore } from "../db/memory-store.js";
import {
  seedUserWithKey,
  signedSyncPayload,
  minimalPayload,
  validDecryptedAst,
} from "../test/helpers.js";
import * as cryptoClient from "../services/crypto-client.js";

describe("POST /api/projects/:id/sync", () => {
  beforeEach(() => {
    vi.mocked(cryptoClient.verifyAndDecrypt).mockResolvedValue({
      verified: true,
      plaintext: validDecryptedAst(),
    });
  });

  it("returns 200 for valid signed payload (mocked Go decrypt)", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440020";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(cryptoClient.verifyAndDecrypt).toHaveBeenCalled();
  });

  it("returns 400 for invalid encrypted payload schema", async () => {
    const app = await buildApp();
    const { token } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440025";

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload: { version: 99 },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for projectId mismatch", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440026";
    const otherId = "550e8400-e29b-41d4-a716-446655440027";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${otherId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for expired timestamp", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440028";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey, {
      timestamp: new Date(Date.now() - 600_000).toISOString(),
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 403 when signature verification fails (mocked Go + bad sig)", async () => {
    vi.mocked(cryptoClient.verifyAndDecrypt).mockRejectedValue(
      new cryptoClient.CryptoServiceError(403)
    );
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440021";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(403);
    const body = res.json() as { sessionRevoked?: boolean };
    expect(body.sessionRevoked).toBe(true);
    expect(res.headers["x-session-revoked"]).toBe("true");
  });

  it("returns 403 when ML-DSA signature is forged", async () => {
    const app = await buildApp();
    const { token, signerKeyId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440029";
    const payload = minimalPayload(projectId, signerKeyId);
    payload.signature.value = "Zm9yZ2Vk";

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(403);
    expect(res.headers["x-session-revoked"]).toBe("true");
  });

  it("returns 409 for reused nonce", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey, userId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440022";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    memoryStore.nonces.add(memoryStore.nonceKey(userId, payload.nonce));

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(409);
  });

  it("returns 413 when body exceeds max payload bytes", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440024";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    payload.cipher.ciphertext = "A".repeat(3_000_000);

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(413);
  });

  it("returns 403 for RSA KEM when PQC enforced", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440023";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    payload.kem.algorithm = "RSA-2048";

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(403);
  });

  it("returns 400 when crypto field sizes are invalid", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440036";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    payload.kem.ciphertext = "";

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/sync`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(res.statusCode).toBe(400);
  });
});
