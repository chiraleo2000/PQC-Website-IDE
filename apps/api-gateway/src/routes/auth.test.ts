import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import * as cryptoClient from "../services/crypto-client.js";

vi.mock("../services/crypto-client.js", () => ({
  verifyAndDecrypt: vi.fn(),
  generateServerKemKeypair: vi.fn().mockResolvedValue({
    publicKeyB64: "a2VtcHVibGlj",
    secretKeyB64: "a2Vtc2VjcmV0",
  }),
  CryptoServiceError: class CryptoServiceError extends Error {
    constructor(public status: number) {
      super("fail");
    }
  },
}));

describe("auth routes", () => {
  const prevAllow = process.env.ALLOW_DEV_REGISTER;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.ALLOW_DEV_REGISTER = "true";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.ALLOW_DEV_REGISTER = prevAllow;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("dev-register returns token and kem keys", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/dev-register",
      payload: { email: "new@test.local", password: "dev-password-32-chars-min!!" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string; kemPublicKeyB64: string; x25519PublicKeyB64: string };
    expect(body.token).toBeTruthy();
    expect(body.kemPublicKeyB64).toBe("a2VtcHVibGlj");
    expect(body.x25519PublicKeyB64).toBeTruthy();
    expect(cryptoClient.generateServerKemKeypair).toHaveBeenCalled();
  });

  it("register + login with argon2 password", async () => {
    const app = await buildApp();
    const email = `user-${Date.now()}@test.local`;
    const password = "secure-password-12";
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email, password },
    });
    expect(reg.statusCode).toBe(201);
    expect(reg.json()).toHaveProperty("token");

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toHaveProperty("token");

    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password: "wrong-password!!" },
    });
    expect(bad.statusCode).toBe(401);
  });

  it("oidc login returns 501 when not configured", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/auth/oidc/login" });
    expect(res.statusCode).toBe(501);
  });

  it("register-keys updates public key", async () => {
    const app = await buildApp();
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/dev-register",
      payload: {},
    });
    const { token, signerPublicKeyId } = reg.json() as {
      token: string;
      signerPublicKeyId: string;
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register-keys",
      headers: { authorization: `Bearer ${token}` },
      payload: { signerPublicKeyId, signPublicKeyB64: "bmV3cHVibGlj" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("security audit list returns events for user", async () => {
    const app = await buildApp();
    const reg = await app.inject({
      method: "POST",
      url: "/api/auth/dev-register",
      payload: { email: "audit@test.local", password: "dev-password-32-chars-min!!" },
    });
    const { token } = reg.json() as { token: string };
    const audit = await app.inject({
      method: "GET",
      url: "/api/security/audit",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(audit.statusCode).toBe(200);
    expect(audit.json()).toHaveProperty("events");
  });

  it("locks an account after five bad passwords", async () => {
    process.env.AUTH_RATE_LIMIT_MAX = "30";
    try {
      const app = await buildApp();
      const email = `lock-${Date.now()}@test.local`;
      const password = "secure-password-12";
      const reg = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password },
      });
      expect(reg.statusCode).toBe(201);

      for (let i = 0; i < 4; i++) {
        const bad = await app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { email, password: "wrong-password!!" },
        });
        expect(bad.statusCode).toBe(401);
      }
      const locked = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password: "wrong-password!!" },
      });
      expect(locked.statusCode).toBe(429);
      expect((locked.json() as { message: string }).message).toMatch(/locked/i);
    } finally {
      delete process.env.AUTH_RATE_LIMIT_MAX;
    }
  });

  it("clears the lockout counter after a successful login", async () => {
    process.env.AUTH_RATE_LIMIT_MAX = "30";
    try {
      const app = await buildApp();
      const email = `clear-${Date.now()}@test.local`;
      const password = "secure-password-12";
      await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { email, password },
      });
      await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password: "wrong-password!!" },
      });
      const ok = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password },
      });
      expect(ok.statusCode).toBe(200);
      const bad = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password: "wrong-password!!" },
      });
      expect(bad.statusCode).toBe(401);
    } finally {
      delete process.env.AUTH_RATE_LIMIT_MAX;
    }
  });
});
