import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAuthConfig,
  fetchSecurityAudit,
  getAuthMode,
  isOidcUiEnabled,
  loginAccount,
  oidcLoginUrl,
  registerAccount,
  registerDevSession,
} from "./auth";

describe("auth session helpers", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("reports dev mode and a disabled OIDC flag by default", () => {
    expect(getAuthMode()).toBe("dev");
    expect(isOidcUiEnabled()).toBe(false);
    expect(oidcLoginUrl()).toContain("/api/auth/oidc/login");
  });

  it("loads auth config and falls back when the gateway is down", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ allowDevRegister: true, oidcConfigured: false }),
    });
    await expect(fetchAuthConfig()).resolves.toEqual({
      allowDevRegister: true,
      oidcConfigured: false,
    });

    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchAuthConfig()).resolves.toEqual({
      allowDevRegister: true,
      oidcConfigured: false,
    });
  });

  it("registers, logs in, and lists audit events", async () => {
    const session = {
      token: "tok",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "kem",
      x25519PublicKeyB64: "x",
      signPublicKeyB64: "sig",
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => session });
    await expect(registerDevSession()).resolves.toEqual(session);
    await expect(registerAccount("a@b.c", "password-12chars")).resolves.toEqual(session);
    await expect(loginAccount("a@b.c", "password-12chars")).resolves.toEqual(session);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [{ event: "LOGIN_FAILED", priority: "HIGH", at: "t" }] }),
    });
    await expect(fetchSecurityAudit("tok")).resolves.toHaveLength(1);
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchSecurityAudit("tok")).resolves.toEqual([]);
  });
});
