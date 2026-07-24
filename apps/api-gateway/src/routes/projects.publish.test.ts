import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { toBase64 } from "@pqc/shared";
import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import { memoryStore } from "../db/memory-store.js";
import { seedUserWithKey, signedPublishIntent } from "../test/helpers.js";

describe("POST /api/projects/:id/publish", () => {
  beforeEach(() => {
    memoryStore.resetForTests();
  });

  it("returns 403 and revokes session on invalid ML-DSA intent", async () => {
    const app = await buildApp();
    const { token, signerKeyId, userId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440030";
    memoryStore.projects.set(projectId, {
      id: projectId,
      userId,
      name: "Test",
    });

    const seed = crypto.getRandomValues(new Uint8Array(32));
    const keys = ml_dsa65.keygen(seed);
    memoryStore.signingKeys.get(signerKeyId)!.publicKeyB64 = toBase64(keys.publicKey);

    const intent = signedPublishIntent(projectId, signerKeyId, keys.secretKey);
    intent.signature.value = toBase64(new Uint8Array(100).fill(9));

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: intent,
    });

    expect(res.statusCode).toBe(403);
    expect((res.json() as { sessionRevoked: boolean }).sessionRevoked).toBe(true);
    expect(memoryStore.revokedTokens.has(token)).toBe(true);
    expect(memoryStore.auditLogs.some((l) => l.event === "SIGNATURE_VERIFICATION_FAILED")).toBe(
      true
    );
  });

  it("returns 200 for valid signed publish intent", async () => {
    const app = await buildApp();
    const { token, signerKeyId, userId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440031";
    memoryStore.projects.set(projectId, {
      id: projectId,
      userId,
      name: "Publish Me",
    });

    const intent = signedPublishIntent(projectId, signerKeyId, signSecretKey);
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: intent,
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as { ok: boolean }).ok).toBe(true);
    expect((res.json() as { publishedAt: string }).publishedAt).toBeTruthy();
  });

  it("returns 404 when project is missing", async () => {
    const app = await buildApp();
    const { token, signerKeyId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440032";
    const intent = signedPublishIntent(projectId, signerKeyId, signSecretKey);

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: intent,
    });

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for invalid signed intent body", async () => {
    const app = await buildApp();
    const { token, userId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440033";
    memoryStore.projects.set(projectId, { id: projectId, userId, name: "Bad" });

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: "publish" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for expired publish timestamp", async () => {
    const app = await buildApp();
    const { token, signerKeyId, userId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440034";
    memoryStore.projects.set(projectId, { id: projectId, userId, name: "Expired" });

    const intent = signedPublishIntent(projectId, signerKeyId, signSecretKey);
    intent.timestamp = new Date(Date.now() - 600_000).toISOString();
    // Re-sign with expired timestamp so schema/path is timestamp failure after verify bytes mismatch;
    // use helper fields then overwrite signature via re-sign below.
    const { ml_dsa65 } = await import("@noble/post-quantum/ml-dsa.js");
    const { canonicalIntentSignBytes, toBase64 } = await import("@pqc/shared");
    const fields = {
      projectId: intent.projectId,
      action: intent.action,
      nonce: intent.nonce,
      timestamp: intent.timestamp,
    };
    intent.signature.value = toBase64(
      ml_dsa65.sign(signSecretKey, canonicalIntentSignBytes(fields))
    );

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: intent,
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects replayed publish nonce", async () => {
    const app = await buildApp();
    const { token, signerKeyId, userId, signSecretKey } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440035";
    memoryStore.projects.set(projectId, { id: projectId, userId, name: "Replay" });

    const intent = signedPublishIntent(projectId, signerKeyId, signSecretKey);
    const first = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: intent,
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: intent,
    });
    expect([400, 409]).toContain(second.statusCode);
  });
});
