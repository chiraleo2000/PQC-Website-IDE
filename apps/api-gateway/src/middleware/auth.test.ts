import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { memoryStore } from "../db/memory-store.js";
import { seedUserWithKey } from "../test/helpers.js";

describe("authenticate middleware", () => {
  beforeEach(() => {
    memoryStore.resetForTests();
  });

  it("rejects missing bearer header", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/550e8400-e29b-41d4-a716-446655440099/export",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects revoked tokens", async () => {
    const app = await buildApp();
    const { token } = seedUserWithKey();
    memoryStore.revokedTokens.add(token);
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/550e8400-e29b-41d4-a716-446655440099/export",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects invalid JWT", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/550e8400-e29b-41d4-a716-446655440099/export",
      headers: { authorization: "Bearer not-a-real-jwt" },
    });
    expect(res.statusCode).toBe(401);
  });
});
