import { describe, expect, it, vi } from "vitest";
import { deployCompiledSite, pagesFileHash, pagesProjectName } from "./cloudflare-pages.js";

describe("cloudflare pages client", () => {
  it("builds a pages project name from the site name and id", () => {
    expect(pagesProjectName("Blog Demo", "550e8400-e29b-41d4-a716-446655440031")).toBe(
      "blog-demo-550e84"
    );
  });

  it("hashes file bytes to 32 hex characters", () => {
    expect(pagesFileHash(new TextEncoder().encode("hi"))).toMatch(/^[a-f0-9]{32}$/);
  });

  it("uploads after an existing project and returns the pages url", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, errors: [{ message: "Project already exists" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: { aliases: ["https://blog-demo-550e84.pages.dev"] },
        }),
      });

    const result = await deployCompiledSite({
      projectName: "blog-demo-550e84",
      files: [{ name: "index.html", content: "<p>hi</p>" }],
      fetchImpl,
      accountId: "acc",
      apiToken: "tok",
    });

    expect(result.url).toBe("https://blog-demo-550e84.pages.dev");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const upload = fetchImpl.mock.calls[1]?.[0] as string;
    expect(upload).toContain("/pages/projects/blog-demo-550e84/deployments");
  });

  it("rejects a deploy when the token is missing", async () => {
    await expect(
      deployCompiledSite({
        projectName: "site",
        files: [{ name: "index.html", content: "x" }],
        accountId: "",
        apiToken: "",
      })
    ).rejects.toThrow(/not configured/i);
  });

  it("rejects project creation that is not an already-exists response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, errors: [{ message: "denied" }] }),
    });
    await expect(
      deployCompiledSite({
        projectName: "site-abc",
        files: [{ name: "/index.html", content: "x" }],
        fetchImpl,
        accountId: "acc",
        apiToken: "tok",
      })
    ).rejects.toThrow(/create failed/i);
  });

  it("falls back to the pages.dev hostname when the upload has no alias", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("empty");
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: {} }),
      });
    const result = await deployCompiledSite({
      projectName: "site-abc",
      files: [{ name: "index.html", content: "x" }],
      fetchImpl,
      accountId: "acc",
      apiToken: "tok",
    });
    expect(result.url).toBe("https://site-abc.pages.dev");
  });

  it("throws when the upload is rejected and does not invent a url", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, errors: [{ message: "nope" }] }),
      });

    await expect(
      deployCompiledSite({
        projectName: "site-abc",
        files: [{ name: "index.html", content: "x" }],
        fetchImpl,
        accountId: "acc",
        apiToken: "tok",
      })
    ).rejects.toThrow(/deployment failed/i);
  });
});
