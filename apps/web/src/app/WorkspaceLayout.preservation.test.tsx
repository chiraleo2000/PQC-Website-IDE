import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { useEditorStore } from "../stores/editorStore";
import { createDefaultRoot } from "@pqc/shared";
import * as auth from "../api/auth";
import * as pqcClient from "../crypto/pqcClient";

/**
 * Preservation Property Tests for Authentication Success
 * 
 * **Validates: Requirements 3.6, 3.7, 3.8**
 * 
 * GOAL: Capture baseline authentication success behavior that must not change after fixes
 * 
 * Test 2.4: Observe and Preserve Authentication Success
 * - Observe behavior on UNFIXED code for successful authentication
 * - EXPECTED OUTCOME: Test PASSES (confirms baseline auth success behavior to preserve)
 */

vi.mock("../api/auth", async () => {
  const actual = await vi.importActual("../api/auth");
  return {
    ...actual,
    registerDevSession: vi.fn(),
    registerSignPublicKey: vi.fn(),
  };
});

vi.mock("../crypto/pqcClient", async () => {
  const actual = await vi.importActual("../crypto/pqcClient");
  return {
    ...actual,
    generateSignKeypair: vi.fn(),
  };
});

describe("Preservation Property Tests: Authentication Success", () => {
  const mockRegisterDevSession = vi.mocked(auth.registerDevSession);
  const mockRegisterSignPublicKey = vi.mocked(auth.registerSignPublicKey);
  const mockGenerateSignKeypair = vi.mocked(pqcClient.generateSignKeypair);

  beforeEach(() => {
    mockRegisterDevSession.mockClear();
    mockRegisterSignPublicKey.mockClear();
    mockGenerateSignKeypair.mockClear();

    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
      cryptoStatus: "idle",
      cryptoError: null,
      authToken: null,
      signerPublicKeyId: null,
      kemPublicKeyB64: null,
      x25519PublicKeyB64: null,
      projectId: "test-project",
      projectName: "Test Project",
    });
  });

  /**
   * Property: Successful authentication flow calls functions in correct order
   */
  it("Test 2.4.1: Authentication preserves correct function call sequence", async () => {
    // Mock successful authentication responses
    const sessionData = {
      token: "auth-token-123",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtcHVibGljS2V5",
      x25519PublicKeyB64: "eDI1NTE5",
      signPublicKeyB64: "c2lnblB1YmxpY0tleQ==",
    };

    const keypairData = {
      publicKeyB64: "cHVibGljS2V5QjY0",
      secretKey: new Uint8Array(32),
    };

    mockRegisterDevSession.mockResolvedValue(sessionData);
    mockGenerateSignKeypair.mockResolvedValue(keypairData);
    mockRegisterSignPublicKey.mockResolvedValue(undefined);

    render(<WorkspaceLayout />);

    // Wait for authentication flow to complete
    await waitFor(
      () => {
        expect(mockRegisterDevSession).toHaveBeenCalled();
        expect(mockGenerateSignKeypair).toHaveBeenCalled();
        expect(mockRegisterSignPublicKey).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Verify functions were called in correct order
    const devSessionCallOrder = mockRegisterDevSession.mock.invocationCallOrder[0];
    const keypairCallOrder = mockGenerateSignKeypair.mock.invocationCallOrder[0];
    const registerKeyCallOrder = mockRegisterSignPublicKey.mock.invocationCallOrder[0];

    expect(devSessionCallOrder).toBeLessThan(keypairCallOrder);
    expect(keypairCallOrder).toBeLessThan(registerKeyCallOrder);
  });

  /**
   * Property: generateSignKeypair is called after successful dev session registration
   */
  it("Test 2.4.2: Key generation preserves call after session registration", async () => {
    const sessionData = {
      token: "auth-token",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtcHVibGljS2V5",
      x25519PublicKeyB64: "eDI1NTE5",
      signPublicKeyB64: "c2lnblB1YmxpY0tleQ==",
    };

    mockRegisterDevSession.mockResolvedValue(sessionData);
    mockGenerateSignKeypair.mockResolvedValue({
      publicKeyB64: "cHVibGljS2V5QjY0",
      secretKey: new Uint8Array(32),
    });
    mockRegisterSignPublicKey.mockResolvedValue(undefined);

    render(<WorkspaceLayout />);

    await waitFor(
      () => {
        expect(mockGenerateSignKeypair).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify generateSignKeypair was called exactly once
    expect(mockGenerateSignKeypair).toHaveBeenCalledTimes(1);
  });

  /**
   * Property: setAuth is called with correct parameters from session data
   */
  it("Test 2.4.3: setAuth preserves correct parameter values", async () => {
    const testCases = [
      {
        name: "Standard UUID",
        sessionData: {
          token: "token-abc-123",
          signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
          kemPublicKeyB64: "a2VtUHVibGljS2V5MTIz",
          x25519PublicKeyB64: "eDI1NTE5",
          signPublicKeyB64: "c2lnblB1YmxpY0tleQ==",
        },
      },
      {
        name: "Different token format",
        sessionData: {
          token: "jwt.token.signature",
          signerPublicKeyId: "123e4567-e89b-12d3-a456-426614174000",
          kemPublicKeyB64: "YmFzZTY0S2VtS2V5",
          x25519PublicKeyB64: "eDI1NTE5",
          signPublicKeyB64: "YmFzZTY0U2lnbktleQ==",
        },
      },
      {
        name: "Long base64 keys",
        sessionData: {
          token: "very-long-auth-token-with-many-characters",
          signerPublicKeyId: "abcdef12-3456-7890-abcd-ef1234567890",
          kemPublicKeyB64: "dmVyeUxvbmdCYXNlNjRFbmNvZGVkS2V5V2l0aE1hbnlDaGFyYWN0ZXJz",
          x25519PublicKeyB64: "eDI1NTE5",
          signPublicKeyB64: "YW5vdGhlckxvbmdCYXNlNjRFbmNvZGVkS2V5",
        },
      },
    ];

    for (const testCase of testCases) {
      // Reset state
      useEditorStore.setState({
        authToken: null,
        signerPublicKeyId: null,
        kemPublicKeyB64: null,
        x25519PublicKeyB64: null,
        cryptoStatus: "idle",
      });

      mockRegisterDevSession.mockResolvedValue(testCase.sessionData);
      mockGenerateSignKeypair.mockResolvedValue({
        publicKeyB64: "cHVibGljS2V5QjY0",
        secretKey: new Uint8Array(32),
      });
      mockRegisterSignPublicKey.mockResolvedValue(undefined);

      render(<WorkspaceLayout />);

      // Wait for setAuth to be called
      await waitFor(
        () => {
          const state = useEditorStore.getState();
          expect(state.authToken).not.toBeNull();
        },
        { timeout: 2000 }
      );

      // Verify setAuth was called with correct values
      const finalState = useEditorStore.getState();
      expect(finalState.authToken).toBe(testCase.sessionData.token);
      expect(finalState.signerPublicKeyId).toBe(testCase.sessionData.signerPublicKeyId);
      expect(finalState.kemPublicKeyB64).toBe(testCase.sessionData.kemPublicKeyB64);
      expect(finalState.x25519PublicKeyB64).toBe(testCase.sessionData.x25519PublicKeyB64);

      // Verify cryptoStatus was set to ready
      expect(finalState.cryptoStatus).toBe("ready");
    }
  });

  /**
   * Property: registerSignPublicKey is called with session token and key data
   */
  it("Test 2.4.4: Sign key registration preserves correct parameters", async () => {
    const sessionData = {
      token: "session-token-xyz",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtS2V5",
      x25519PublicKeyB64: "eDI1NTE5",
      signPublicKeyB64: "c2lnbktleQ==",
    };

    const keypairData = {
      publicKeyB64: "Z2VuZXJhdGVkUHVibGljS2V5",
      secretKey: new Uint8Array(32),
    };

    mockRegisterDevSession.mockResolvedValue(sessionData);
    mockGenerateSignKeypair.mockResolvedValue(keypairData);
    mockRegisterSignPublicKey.mockResolvedValue(undefined);

    render(<WorkspaceLayout />);

    await waitFor(
      () => {
        expect(mockRegisterSignPublicKey).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify registerSignPublicKey was called with correct parameters
    expect(mockRegisterSignPublicKey).toHaveBeenCalledWith(
      sessionData.token,
      sessionData.signerPublicKeyId,
      keypairData.publicKeyB64
    );
  });

  /**
   * Property: Crypto status transitions correctly during authentication
   */
  it("Test 2.4.5: Crypto status preserves correct state transitions", async () => {
    const sessionData = {
      token: "token",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtS2V5",
      x25519PublicKeyB64: "eDI1NTE5",
      signPublicKeyB64: "c2lnbktleQ==",
    };

    mockRegisterDevSession.mockResolvedValue(sessionData);
    mockGenerateSignKeypair.mockResolvedValue({
      publicKeyB64: "cHVibGljS2V5",
      secretKey: new Uint8Array(32),
    });
    mockRegisterSignPublicKey.mockResolvedValue(undefined);

    // Initial state should be idle
    expect(useEditorStore.getState().cryptoStatus).toBe("idle");

    render(<WorkspaceLayout />);

    // Wait for authentication to complete
    await waitFor(
      () => {
        expect(useEditorStore.getState().cryptoStatus).toBe("ready");
      },
      { timeout: 3000 }
    );

    // Final state should be ready
    expect(useEditorStore.getState().cryptoStatus).toBe("ready");
    expect(useEditorStore.getState().cryptoError).toBeNull();
  });

  /**
   * Property: Authentication flow runs on component mount
   */
  it("Test 2.4.6: Authentication preserves mount-time execution", async () => {
    const sessionData = {
      token: "token",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtS2V5",
      x25519PublicKeyB64: "eDI1NTE5",
      signPublicKeyB64: "c2lnbktleQ==",
    };

    mockRegisterDevSession.mockResolvedValue(sessionData);
    mockGenerateSignKeypair.mockResolvedValue({
      publicKeyB64: "cHVibGljS2V5",
      secretKey: new Uint8Array(32),
    });
    mockRegisterSignPublicKey.mockResolvedValue(undefined);

    // Before mounting, no calls should be made
    expect(mockRegisterDevSession).not.toHaveBeenCalled();

    render(<WorkspaceLayout />);

    // After mounting, authentication should start immediately
    await waitFor(
      () => {
        expect(mockRegisterDevSession).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    // Verify the useEffect dependency is correct (only setAuth)
    // This is implicitly tested by the fact that the effect runs once on mount
    expect(mockRegisterDevSession).toHaveBeenCalledTimes(1);
  });

  /**
   * Property: ML-KEM and ML-DSA keys are preserved in store
   */
  it("Test 2.4.7: PQC key values preserve correct format", async () => {
    // Test with various key formats
    const testCases = [
      {
        kemKey: "c2hvcnRLZW0=",
        signKeyId: "12345678-1234-1234-1234-123456789012",
      },
      {
        kemKey: "bG9uZ0tlbVdpdGhNb3JlQ2hhcmFjdGVycw==",
        signKeyId: "abcdefgh-abcd-abcd-abcd-abcdefghijkl",
      },
      {
        kemKey: "a2VtS2V5V2l0aFNwZWNpYWxDaGFyYWN0ZXJzKy8=",
        signKeyId: "00000000-0000-0000-0000-000000000000",
      },
    ];

    for (const testCase of testCases) {
      useEditorStore.setState({
        kemPublicKeyB64: null,
        x25519PublicKeyB64: null,
        signerPublicKeyId: null,
        authToken: null,
      });

      const sessionData = {
        token: "token",
        signerPublicKeyId: testCase.signKeyId,
        kemPublicKeyB64: testCase.kemKey,
        x25519PublicKeyB64: "eDI1NTE5",
        signPublicKeyB64: "c2lnbktleQ==",
      };

      mockRegisterDevSession.mockResolvedValue(sessionData);
      mockGenerateSignKeypair.mockResolvedValue({
        publicKeyB64: "cHVibGljS2V5",
        secretKey: new Uint8Array(32),
      });
      mockRegisterSignPublicKey.mockResolvedValue(undefined);

      render(<WorkspaceLayout />);

      await waitFor(
        () => {
          expect(useEditorStore.getState().kemPublicKeyB64).toBe(testCase.kemKey);
        },
        { timeout: 2000 }
      );

      const state = useEditorStore.getState();
      expect(state.signerPublicKeyId).toBe(testCase.signKeyId);
      expect(state.kemPublicKeyB64).toBe(testCase.kemKey);
      expect(state.x25519PublicKeyB64).toBe("eDI1NTE5");
    }
  });
});
