import { describe, it, expect, vi } from "vitest";
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
  it("dev-register returns token and kem keys", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/dev-register",
      payload: { email: "new@test.local", password: "dev-password-32-chars-min!!" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string; kemPublicKeyB64: string };
    expect(body.token).toBeTruthy();
    expect(body.kemPublicKeyB64).toBe("a2VtcHVibGlj");
    expect(cryptoClient.generateServerKemKeypair).toHaveBeenCalled();
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
});
