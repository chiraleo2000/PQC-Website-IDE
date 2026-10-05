import { DEFAULT_SITE_FUNCTIONS, createDefaultRoot } from "@pqc/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { memoryStore } from "../db/memory-store.js";
import { seedUserWithKey, signedPublishIntent } from "../test/helpers.js";

const projectId = "550e8400-e29b-41d4-a716-446655440031";

describe("signed backend functions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  });

  it("rejects a call that is not in a signed manifest", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      payload: {
        projectId,
        name: "createPost",
        fields: { title: "A", body: "B" },
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("accepts login and createPost from the signed manifest and rejects extra fields", async () => {
    const app = await buildApp();
    memoryStore.deployments.set(projectId, {
      projectId,
      pagesProjectName: "blog",
      httpsUrl: null,
      manifest: DEFAULT_SITE_FUNCTIONS,
      createdAt: new Date().toISOString(),
    });

    const extra = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      payload: {
        projectId,
        name: "createPost",
        fields: { title: "A", body: "B", evil: "x" },
      },
    });
    expect(extra.statusCode).toBe(400);

    const login = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      payload: {
        projectId,
        name: "login",
        fields: { email: "demo@local", password: "demo-password" },
      },
    });
    expect(login.statusCode).toBe(200);
    const token = (login.json() as { token: string }).token;

    const post = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        projectId,
        name: "createPost",
        fields: { title: "Hello", body: "World" },
      },
    });
    expect(post.statusCode).toBe(201);

    const unsignedDemo = await app.inject({
      method: "POST",
      url: "/demo-api/posts",
      headers: { "x-project-id": projectId, "content-type": "application/json" },
      payload: { title: "Nope", body: "x", extra: true },
    });
    expect(unsignedDemo.statusCode).toBe(400);
  });

  it("rejects bad login, missing tokens, and empty titles", async () => {
    const app = await buildApp();
    memoryStore.deployments.set(projectId, {
      projectId,
      pagesProjectName: "blog",
      httpsUrl: null,
      manifest: DEFAULT_SITE_FUNCTIONS,
      createdAt: new Date().toISOString(),
    });

    const badLogin = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      payload: { projectId, name: "login", fields: { email: "nope@local", password: "nope" } },
    });
    expect(badLogin.statusCode).toBe(401);

    const missingAuth = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      payload: { projectId, name: "createPost", fields: { title: "Hi", body: "" } },
    });
    expect(missingAuth.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      payload: {
        projectId,
        name: "login",
        fields: { email: "demo@local", password: "demo-password" },
      },
    });
    const token = (login.json() as { token: string }).token;
    const emptyTitle = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId, name: "createPost", fields: { title: "", body: "x" } },
    });
    expect(emptyTitle.statusCode).toBe(400);

    const junkAuth = await app.inject({
      method: "POST",
      url: "/api/functions/invoke",
      headers: { authorization: "Bearer not-a-jwt" },
      payload: { projectId, name: "createPost", fields: { title: "Hi", body: "x" } },
    });
    expect(junkAuth.statusCode).toBe(401);
  });

  it("returns the Cloudflare URL after a signed publish", async () => {
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acc";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: { name: "publish-me" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            result: { url: "https://publish-me.pages.dev" },
          }),
        })
    );

    const app = await buildApp();
    const { token, signerKeyId, userId, signSecretKey } = seedUserWithKey();
    memoryStore.projects.set(projectId, {
      id: projectId,
      userId,
      name: "Publish Me",
      latestAst: createDefaultRoot(),
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}` },
      payload: signedPublishIntent(projectId, signerKeyId, signSecretKey),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { url: string; httpsConfigured: boolean };
    expect(body.httpsConfigured).toBe(true);
    expect(body.url).toBe("https://publish-me.pages.dev");
    expect(memoryStore.latestDeployment(projectId)?.httpsUrl).toBe("https://publish-me.pages.dev");
  });

  it("asks for a save before HTTPS publish when the site has no AST", async () => {
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acc";
    const app = await buildApp();
    const { token, signerKeyId, userId, signSecretKey } = seedUserWithKey();
    memoryStore.projects.set(projectId, { id: projectId, userId, name: "Empty" });
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}`, "x-project-name": "%E0%A4%A" },
      payload: signedPublishIntent(projectId, signerKeyId, signSecretKey),
    });
    expect(res.statusCode).toBe(409);
  });

  it("returns 502 when Cloudflare rejects the upload", async () => {
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    process.env.CLOUDFLARE_ACCOUNT_ID = "acc";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, errors: [{ message: "nope" }] }),
      })
    );
    const app = await buildApp();
    const { token, signerKeyId, userId, signSecretKey } = seedUserWithKey();
    memoryStore.projects.set(projectId, {
      id: projectId,
      userId,
      name: "Publish Me",
      latestAst: createDefaultRoot(),
    });
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/publish`,
      headers: { authorization: `Bearer ${token}`, "x-project-name": "Blog%20Demo" },
      payload: signedPublishIntent(projectId, signerKeyId, signSecretKey),
    });
    expect(res.statusCode).toBe(502);
  });
});
