import { createDefaultRoot } from "@pqc/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { memoryStore } from "../db/memory-store.js";
import { seedUserWithKey } from "../test/helpers.js";

describe("export routes", () => {
  beforeEach(() => {
    memoryStore.resetForTests();
  });

  it("GET /api/projects/:id/export returns zip for owned project with AST", async () => {
    const app = await buildApp();
    const { token, userId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440040";
    memoryStore.projects.set(projectId, {
      id: projectId,
      userId,
      name: "Export Me",
      latestAst: createDefaultRoot(),
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/export`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/zip/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    expect(res.rawPayload.length).toBeGreaterThan(20);
  });

  it("GET /api/projects/:id/export returns 404 when project missing", async () => {
    const app = await buildApp();
    const { token } = seedUserWithKey();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/550e8400-e29b-41d4-a716-446655440041/export",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/projects/:id/export/git returns 503 when GitOps disabled", async () => {
    const app = await buildApp();
    const { token, userId } = seedUserWithKey();
    const projectId = "550e8400-e29b-41d4-a716-446655440042";
    memoryStore.projects.set(projectId, {
      id: projectId,
      userId,
      name: "Git Export",
      latestAst: createDefaultRoot(),
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/export/git`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        remoteUrl: "https://example.com/repo.git",
        branch: "main",
      },
    });

    expect(res.statusCode).toBe(503);
  });
});
