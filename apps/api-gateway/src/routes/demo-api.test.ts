import { describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { buildDemoApp } from "../demo-app.js";
import { config } from "../config.js";
import { resetDemoPostsForTests } from "../services/demo-posts.js";

const DEMO_ORIGIN = "http://localhost:4010";

describe("demo-api routes", () => {
  beforeEach(() => {
    resetDemoPostsForTests();
  });

  describe("on full gateway (:4000)", () => {
    it("GET /demo-api/health", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/demo-api/health" });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { status: string; service: string };
      expect(body.status).toBe("ok");
      expect(body.service).toBe("demo-api");
    });

    it("POST /demo-api/login returns JWT for demo credentials", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/demo-api/login",
        headers: { origin: DEMO_ORIGIN },
        payload: { email: "demo@local", password: "demo-password" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { token: string; tokenType: string };
      expect(body.tokenType).toBe("Bearer");
      expect(body.token).toBeTruthy();

      const decoded = jwt.verify(body.token, config.jwtSecret) as { demo?: boolean };
      expect(decoded.demo).toBe(true);
    });

    it("POST /demo-api/login rejects bad credentials", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/demo-api/login",
        payload: { email: "demo@local", password: "wrong" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("GET /demo-api/posts returns seeded posts", async () => {
      const app = await buildApp();
      const res = await app.inject({ method: "GET", url: "/demo-api/posts" });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { posts: Array<{ title: string }> };
      expect(body.posts.length).toBeGreaterThanOrEqual(2);
    });

    it("POST /demo-api/posts creates a post", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "POST",
        url: "/demo-api/posts",
        headers: {
          origin: DEMO_ORIGIN,
          "content-type": "application/json",
        },
        payload: { title: "Test post", body: "Hello" },
      });
      expect(res.statusCode).toBe(201);
      const created = res.json() as { id: string; title: string };
      expect(created.title).toBe("Test post");

      const list = await app.inject({ method: "GET", url: "/demo-api/posts" });
      const posts = (list.json() as { posts: Array<{ title: string }> }).posts;
      expect(posts.some((p) => p.title === "Test post")).toBe(true);
    });

    it("sends CORS headers for compiled static origin", async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: "OPTIONS",
        url: "/demo-api/posts",
        headers: {
          origin: DEMO_ORIGIN,
          "access-control-request-method": "POST",
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe(DEMO_ORIGIN);
    });
  });

  describe("demo-only server (DEMO_ONLY)", () => {
    it("exposes the same routes", async () => {
      const app = await buildDemoApp();
      const login = await app.inject({
        method: "POST",
        url: "/demo-api/login",
        payload: { email: "demo@local", password: "demo-password" },
      });
      expect(login.statusCode).toBe(200);
    });
  });
});
