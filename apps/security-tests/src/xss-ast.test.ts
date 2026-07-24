/**
 * XSS in decrypted AST must not reach compiled site output.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  astWithXssPayload,
  buildValidPayload,
  devSession,
  exportProject,
  syncPayload,
  waitForApi,
} from "./helpers.js";
import { compileAstToSite, CompilerSecurityError } from "../../api-gateway/src/compiler/ast-to-code.js";

describe("XSS — compiler unit (offline)", () => {
  it("rejects script tags in AST text nodes", () => {
    const ast = astWithXssPayload();
    expect(() => compileAstToSite(ast.root, "xss-test", {})).toThrow(CompilerSecurityError);
  });

  it("rejects javascript: href", () => {
    const ast = astWithXssPayload();
    expect(() => compileAstToSite(ast.root, "xss-test", {})).toThrow(CompilerSecurityError);
  });

  it("allows safe plaintext", () => {
    const ast = {
      version: 1 as const,
      root: {
        id: crypto.randomUUID(),
        type: "section",
        props: {},
        children: [
          {
            id: crypto.randomUUID(),
            type: "p",
            props: { children: "Hello world" },
            children: [],
          },
        ],
      },
    };
    const out = compileAstToSite(ast.root, "safe", {});
    expect(out.html).toContain("Hello world");
    expect(out.html).not.toMatch(/<script/i);
  });
});

describe("XSS — API export after malicious sync", () => {
  let session: Awaited<ReturnType<typeof devSession>>;

  beforeAll(async () => {
    await waitForApi();
  });

  beforeEach(async () => {
    session = await devSession();
  });

  it("sync may store encrypted XSS AST but export returns 400 Unsafe AST", async () => {
    const projectId = crypto.randomUUID();
    const payload = await buildValidPayload(
      projectId,
      session.signerPublicKeyId,
      session.kemPublicKeyB64,
      session.x25519PublicKeyB64,
      session.signSecretKey,
      astWithXssPayload()
    );

    const syncRes = await syncPayload(projectId, session.token, payload);
    expect(syncRes.status).toBe(200);

    const exportRes = await exportProject(projectId, session.token);
    expect(exportRes.status).toBe(400);
    const body = (await exportRes.json()) as { message?: string };
    expect(body.message).toMatch(/unsafe/i);
  });
});
