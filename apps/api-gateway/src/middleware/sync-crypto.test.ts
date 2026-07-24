import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { validateSyncEnvelope } from "./sync-crypto.js";
import { memoryStore } from "../db/memory-store.js";
import { minimalPayload, seedUserWithKey, signedSyncPayload } from "../test/helpers.js";

function mockReply(): FastifyReply & { statusCode: number; body?: unknown; sent: boolean } {
  const reply = {
    sent: false,
    statusCode: 200,
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    async send(payload: unknown) {
      this.body = payload;
      this.sent = true;
      return this;
    },
    header() {
      return this;
    },
  };
  return reply as FastifyReply & { statusCode: number; body?: unknown; sent: boolean };
}

function mockRequest(
  userId: string,
  projectId: string,
  body: unknown,
  auth = "Bearer test-token"
): FastifyRequest<{ Params: { id: string } }> {
  return {
    user: { sub: userId, email: "t@test.local" },
    params: { id: projectId },
    body,
    headers: { authorization: auth },
  } as FastifyRequest<{ Params: { id: string } }>;
}

describe("validateSyncEnvelope — payload validation middleware", () => {
  beforeEach(() => {
    memoryStore.resetForTests();
  });

  it("sets syncContext when envelope is valid", async () => {
    const { userId, signerKeyId, signSecretKey, token } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440030";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    const request = mockRequest(userId, projectId, payload, `Bearer ${token}`);
    const reply = mockReply();

    await validateSyncEnvelope(request, reply);

    expect(reply.sent).toBe(false);
    expect(request.syncContext?.projectId).toBe(projectId);
    expect(request.syncContext?.payload.nonce).toBe(payload.nonce);
  });

  it("returns 400 for invalid Zod payload", async () => {
    const { userId, token } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440031";
    const request = mockRequest(userId, projectId, { foo: "bar" }, `Bearer ${token}`);
    const reply = mockReply();

    await validateSyncEnvelope(request, reply);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(400);
    expect((reply.body as { message: string }).message).toBe("Invalid encrypted payload");
  });

  it("returns 409 when nonce was already used", async () => {
    const { userId, signerKeyId, signSecretKey, token } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440032";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    memoryStore.nonces.add(memoryStore.nonceKey(userId, payload.nonce));

    const request = mockRequest(userId, projectId, payload, `Bearer ${token}`);
    const reply = mockReply();
    await validateSyncEnvelope(request, reply);

    expect(reply.statusCode).toBe(409);
    expect((reply.body as { message: string }).message).toMatch(/nonce/i);
  });

  it("returns 400 for expired timestamp", async () => {
    const { userId, signerKeyId, signSecretKey, token } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440033";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey, {
      timestamp: new Date(Date.now() - 600_000).toISOString(),
    });

    const request = mockRequest(userId, projectId, payload, `Bearer ${token}`);
    const reply = mockReply();
    await validateSyncEnvelope(request, reply);

    expect(reply.statusCode).toBe(400);
    expect((reply.body as { message: string }).message).toMatch(/timestamp/i);
  });

  it("returns 403 for manipulated signature algorithm (classical)", async () => {
    const { userId, signerKeyId, signSecretKey, token } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440034";
    const payload = signedSyncPayload(projectId, signerKeyId, signSecretKey);
    payload.signature.algorithm = "RSA-2048";

    const request = mockRequest(userId, projectId, payload, `Bearer ${token}`);
    const reply = mockReply();
    await validateSyncEnvelope(request, reply);

    expect(reply.statusCode).toBe(403);
  });

  it("returns 401 without bearer token", async () => {
    const { userId, signerKeyId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440035";
    const payload = minimalPayload(projectId, signerKeyId);
    const request = mockRequest(userId, projectId, payload, "");
    const reply = mockReply();

    await validateSyncEnvelope(request, reply);

    expect(reply.statusCode).toBe(401);
  });
});
