import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncProject } from "./projects";
import { encryptAndSignAst } from "../crypto/pqcClient";
import { createNode, createDefaultRoot } from "@pqc/shared";
import type { AstRoot } from "@pqc/shared";

/**
 * Preservation Property Tests for Save Operations
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.7, 3.8**
 * 
 * GOAL: Capture baseline save behavior that must not change after fixes are applied
 * 
 * Test 2.1: Observe and Preserve Save Operation
 * - Observe behavior on UNFIXED code for save operations
 * - EXPECTED OUTCOME: Test PASSES (confirms baseline save behavior to preserve)
 */

vi.mock("../crypto/pqcClient", () => ({
  encryptAndSignAst: vi.fn().mockResolvedValue({
    version: 2,
    projectId: "550e8400-e29b-41d4-a716-446655440001",
    nonce: "nonce-value-16chars",
    timestamp: "2026-01-01T00:00:00.000Z",
    kem: { algorithm: "ML-KEM-768", ciphertext: "a2VtY3Q=" },
    classicalKem: { algorithm: "X25519", ephemeralPublicKey: "eDI1NTE5" },
    cipher: {
      algorithm: "AES-256-GCM",
      iv: "aXY=",
      ciphertext: "Y3Q=",
      tag: "dGFn",
    },
    plaintextMeta: { astNodeCount: 1, schemaVersion: 1 },
    signature: { algorithm: "ML-DSA-65", value: "c2ln" },
    signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
  }),
  getSignSecretKey: vi.fn().mockReturnValue(new Uint8Array(32)),
}));

describe("Preservation Property Tests: Save Operations", () => {
  const mockFetch = vi.fn();
  const mockEncryptAndSignAst = vi.mocked(encryptAndSignAst);

  beforeEach(() => {
    mockFetch.mockClear();
    mockEncryptAndSignAst.mockClear();
    vi.stubGlobal("fetch", mockFetch);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  /**
   * Property: For all AST structures, syncProject produces same encryption payload format
   * 
   * This test generates various AST structures and verifies that:
   * 1. syncProject calls encryptAndSignAst with correct parameters
   * 2. Hybrid ML-KEM-768 + X25519 + ML-DSA-65 encryption is used
   * 3. The API call structure remains unchanged
   */
  it("Test 2.1.1: syncProject preserves encryption flow for various AST structures", async () => {
    // Generate test cases: various AST structures
    const testCases: Array<{ name: string; ast: AstRoot }> = [
      {
        name: "Empty project",
        ast: createDefaultRoot(),
      },
      {
        name: "Simple single node",
        ast: (() => {
          const root = createDefaultRoot();
          root.children = [createNode("div", { children: "Hello World" })];
          return root;
        })(),
      },
      {
        name: "Nested structure",
        ast: (() => {
          const root = createDefaultRoot();
          const container = createNode("div", { className: "container" });
          const text = createNode("p", { children: "Text content" });
          const button = createNode("button", { children: "Click me" });
          container.children = [text, button];
          root.children = [container];
          return root;
        })(),
      },
      {
        name: "Multiple top-level nodes",
        ast: (() => {
          const root = createDefaultRoot();
          root.children = [
            createNode("header", { children: "Header" }),
            createNode("main", { children: "Main content" }),
            createNode("footer", { children: "Footer" }),
          ];
          return root;
        })(),
      },
      {
        name: "Deeply nested structure",
        ast: (() => {
          const root = createDefaultRoot();
          const level1 = createNode("div", { className: "level-1" });
          const level2 = createNode("div", { className: "level-2" });
          const level3 = createNode("div", { className: "level-3" });
          const leaf = createNode("p", { children: "Deep content" });
          level3.children = [leaf];
          level2.children = [level3];
          level1.children = [level2];
          root.children = [level1];
          return root;
        })(),
      },
    ];

    const projectId = "test-project-id";
    const authToken = "valid-token";
    const signerPublicKeyId = "550e8400-e29b-41d4-a716-446655440011";
    const serverKemPublicKeyB64 = "a2VtcHVibGlj";
    const serverX25519PublicKeyB64 = "eDI1NTE5";

    for (const testCase of testCases) {
      mockFetch.mockClear();
      mockEncryptAndSignAst.mockClear();

      // Execute save operation
      await syncProject({
        projectId,
        ast: testCase.ast,
        authToken,
        signerPublicKeyId,
        serverKemPublicKeyB64,
        serverX25519PublicKeyB64,
      });

      // Verify encryption function was called with correct parameters
      expect(mockEncryptAndSignAst).toHaveBeenCalledTimes(1);
      expect(mockEncryptAndSignAst).toHaveBeenCalledWith({
        astJson: JSON.stringify(testCase.ast),
        projectId,
        signerPublicKeyId,
        serverKemPublicKeyB64,
        serverX25519PublicKeyB64,
        signerSecretKey: expect.any(Uint8Array),
      });

      // Verify API endpoint and method
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/projects\/.*\/sync$/);
      expect(options?.method).toBe("POST");
      expect(options?.headers?.["Content-Type"]).toBe("application/json");
      expect(options?.headers?.Authorization).toBe(`Bearer ${authToken}`);

      // Verify encrypted hybrid payload structure
      const body = JSON.parse(options?.body || "{}");
      expect(body).toHaveProperty("version", 2);
      expect(body).toHaveProperty("kem");
      expect(body).toHaveProperty("classicalKem");
      expect(body.classicalKem).toMatchObject({ algorithm: "X25519" });
      expect(body).toHaveProperty("signature");
      expect(body).toHaveProperty("signerPublicKeyId");
      expect(body).toHaveProperty("nonce");
    }
  });

  /**
   * Property: Hybrid ML-KEM-768 + X25519 and ML-DSA-65 usage is preserved
   */
  it("Test 2.1.2: syncProject preserves PQC cryptography parameters", async () => {
    const ast = createDefaultRoot();
    ast.children = [createNode("div", { children: "Test" })];

    const projectId = "test-project";
    const authToken = "token";
    const signerPublicKeyId = "550e8400-e29b-41d4-a716-446655440011";
    const serverKemPublicKeyB64 = "a2VtcHVibGlj";
    const serverX25519PublicKeyB64 = "eDI1NTE5";

    await syncProject({
      projectId,
      ast,
      authToken,
      signerPublicKeyId,
      serverKemPublicKeyB64,
      serverX25519PublicKeyB64,
    });

    // Verify the encryption function receives the hybrid public keys
    const encryptCall = mockEncryptAndSignAst.mock.calls[0][0];
    expect(encryptCall.serverKemPublicKeyB64).toBe(serverKemPublicKeyB64);
    expect(encryptCall.serverX25519PublicKeyB64).toBe(serverX25519PublicKeyB64);
    expect(encryptCall.signerPublicKeyId).toBe(signerPublicKeyId);

    // Verify the signature secret key is provided
    expect(encryptCall.signerSecretKey).toBeInstanceOf(Uint8Array);
  });

  /**
   * Property: API authentication headers are preserved
   */
  it("Test 2.1.3: syncProject preserves authentication headers", async () => {
    const ast = createDefaultRoot();
    const testTokens = [
      "short-token",
      "very-long-token-with-many-characters-including-special-chars-!@#$%",
      "jwt.formatted.token",
    ];

    for (const token of testTokens) {
      mockFetch.mockClear();

      await syncProject({
        projectId: "project-1",
        ast,
        authToken: token,
        signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
        serverKemPublicKeyB64: "a2VtcHVibGlj",
        serverX25519PublicKeyB64: "eDI1NTE5",
      });

      const [_url, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.Authorization).toBe(`Bearer ${token}`);
    }
  });

  /**
   * Property: Error handling behavior is preserved
   */
  it("Test 2.1.4: syncProject preserves error handling", async () => {
    const ast = createDefaultRoot();

    // Test API error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Internal server error" }),
    });

    await expect(
      syncProject({
        projectId: "project-1",
        ast,
        authToken: "token",
        signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
        serverKemPublicKeyB64: "a2VtcHVibGlj",
        serverX25519PublicKeyB64: "eDI1NTE5",
      })
    ).rejects.toThrow("Internal server error");

    // Test network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      syncProject({
        projectId: "project-2",
        ast,
        authToken: "token",
        signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
        serverKemPublicKeyB64: "a2VtcHVibGlj",
        serverX25519PublicKeyB64: "eDI1NTE5",
      })
    ).rejects.toThrow("Network error");
  });

  /**
   * Property: Endpoint URL structure is preserved
   */
  it("Test 2.1.5: syncProject preserves correct endpoint URL for various project IDs", async () => {
    const ast = createDefaultRoot();
    const projectIds = [
      "simple-id",
      "uuid-550e8400-e29b-41d4-a716-446655440011",
      "project-with-dashes",
      "123456789",
    ];

    for (const projectId of projectIds) {
      mockFetch.mockClear();

      await syncProject({
        projectId,
        ast,
        authToken: "token",
        signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
        serverKemPublicKeyB64: "a2VtcHVibGlj",
        serverX25519PublicKeyB64: "eDI1NTE5",
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(new RegExp(`/api/projects/${projectId}/sync$`));
    }
  });
});
