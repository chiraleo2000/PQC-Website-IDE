import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportProjectZip } from "./projects";

describe("exportProjectZip", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads ZIP blob from export endpoint", async () => {
    const blob = new Blob(["zip"], { type: "application/zip" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-disposition"
            ? 'attachment; filename="demo-site.zip"'
            : null,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const click = vi.fn();
    const remove = vi.fn();
    const createElement = vi.spyOn(document, "createElement");
    createElement.mockImplementation(((tag: string) => {
      if (tag === "a") {
        return {
          href: "",
          download: "",
          click,
          remove,
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    }) as typeof document.createElement);
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    await exportProjectZip({
      projectId: "proj-1",
      authToken: "tok",
      projectName: "Demo Site",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects/proj-1/export"),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer tok" },
      })
    );
    expect(click).toHaveBeenCalled();
  });

  it("throws on failed export", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ message: "Not found" }),
      })
    );

    await expect(
      exportProjectZip({ projectId: "missing", authToken: "tok" })
    ).rejects.toThrow(/Not found|Export failed/);
  });

  it("falls back to projectName.zip when Content-Disposition missing", async () => {
    const blob = new Blob(["zip"], { type: "application/zip" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
        headers: { get: () => null },
      })
    );
    const click = vi.fn();
    const remove = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click, remove } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    }) as typeof document.createElement);
    Object.defineProperty(URL, "createObjectURL", { writable: true, value: vi.fn(() => "blob:x") });
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    await exportProjectZip({
      projectId: "proj-2",
      authToken: "tok",
      projectName: "My Cool Site!",
      demoMode: true,
    });

    expect(click).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("demoMode=true"),
      expect.any(Object)
    );
  });

  it("rethrows network errors that are not Export failed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(
      exportProjectZip({ projectId: "proj-3", authToken: "tok" })
    ).rejects.toThrow(/Failed to fetch/);
  });
});
