import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerSignPublicKey } from "./auth";

describe("registerSignPublicKey", () => {
  const mockFetch = vi.fn();
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    mockFetch.mockReset();
    consoleErrorSpy.mockClear();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("succeeds on 200", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(
      registerSignPublicKey("tok", "550e8400-e29b-41d4-a716-446655440011", "c2ln")
    ).resolves.toBeUndefined();
  });

  it("logs and throws on HTTP error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    });
    await expect(
      registerSignPublicKey("tok", "550e8400-e29b-41d4-a716-446655440011", "c2ln")
    ).rejects.toThrow(/Key registration failed/);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("logs network errors", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));
    await expect(
      registerSignPublicKey("tok", "550e8400-e29b-41d4-a716-446655440011", "c2ln")
    ).rejects.toThrow("offline");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
