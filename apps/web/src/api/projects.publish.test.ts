import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishProject } from "./projects";
import { getSignSecretKey, signPublishIntent } from "../crypto/pqcClient";

vi.mock("../crypto/pqcClient", () => ({
  encryptAndSignAst: vi.fn(),
  getSignSecretKey: vi.fn().mockReturnValue(new Uint8Array(32)),
  signPublishIntent: vi.fn().mockResolvedValue({
    projectId: "550e8400-e29b-41d4-a716-446655440011",
    action: "publish",
    nonce: "nonce-value-at-least-16",
    timestamp: new Date().toISOString(),
    signature: { algorithm: "ML-DSA-65", value: "c2ln" },
    signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440012",
  }),
}));

describe("publishProject", () => {
  const mockFetch = vi.fn();
  const mockSign = vi.mocked(signPublishIntent);

  beforeEach(() => {
    mockFetch.mockReset();
    mockSign.mockClear();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("POSTs signed publish intent", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, publishedAt: "2026-01-01T00:00:00.000Z" }),
    });

    const result = await publishProject({
      projectId: "550e8400-e29b-41d4-a716-446655440011",
      authToken: "tok",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440012",
    });

    expect(mockSign).toHaveBeenCalled();
    expect(getSignSecretKey).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/550e8400-e29b-41d4-a716-446655440011/publish"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      })
    );
    expect(result.ok).toBe(true);
  });

  it("retries once when the connection drops and returns the live URL", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          publishedAt: "2026-01-01T00:00:00.000Z",
          url: "https://demo.pages.dev",
          httpsConfigured: true,
        }),
      });

    const result = await publishProject({
      projectId: "550e8400-e29b-41d4-a716-446655440011",
      authToken: "tok",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440012",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.url).toBe("https://demo.pages.dev");
  });

  it("logs and throws on HTTP failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ message: "bad sig" }),
    });

    await expect(
      publishProject({
        projectId: "550e8400-e29b-41d4-a716-446655440011",
        authToken: "tok",
        signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440012",
      })
    ).rejects.toThrow(/bad sig|Publish failed/);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
