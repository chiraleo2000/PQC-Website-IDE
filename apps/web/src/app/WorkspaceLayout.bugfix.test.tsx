import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { useEditorStore } from "../stores/editorStore";
import { createDefaultRoot } from "@pqc/shared";
import * as auth from "../api/auth";

/**
 * Bug Condition Exploration Tests for Authentication Retry Logic
 * 
 * **Validates: Requirements 1.7, 1.8**
 * 
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Test failures confirm that authentication has no retry mechanism.
 * 
 * Test 1.4: Authentication Has No Retry Logic
 * - Tests that authentication failures are retried
 * - EXPECTED OUTCOME: Test FAILS (confirms no retry mechanism exists)
 * - Counterexample: "Single auth failure causes permanent error state, no retry attempts"
 */

vi.mock("../api/auth", async () => {
  const actual = await vi.importActual("../api/auth");
  return {
    ...actual,
    registerDevSession: vi.fn(),
    registerSignPublicKey: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Bug Condition Exploration: Authentication Retry Logic", () => {
  const mockRegisterDevSession = vi.mocked(auth.registerDevSession);
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockRegisterDevSession.mockClear();
    mockFetch.mockClear();
    vi.stubGlobal("fetch", mockFetch);

    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
      cryptoStatus: "idle",
      cryptoError: null,
      authToken: null,
      signerPublicKeyId: null,
      kemPublicKeyB64: null,
      x25519PublicKeyB64: null,
    });
  });

  it("Test 1.4: Authentication retries on transient failure (EXPECTED TO FAIL)", async () => {
    // Mock to fail once, then succeed
    let callCount = 0;
    mockRegisterDevSession.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network timeout");
      }
      return {
        token: "tok",
        signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
        kemPublicKeyB64: "a2VtcHVibGlj",
        x25519PublicKeyB64: "eDI1NTE5",
        signPublicKeyB64: "c2lnbnB1Ymxpaw==",
      };
    });

    render(<WorkspaceLayout />);

    // Wait for initial render and auth attempt
    await waitFor(
      () => {
        expect(mockRegisterDevSession).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for retry to happen (should retry after 1s delay)
    await waitFor(
      () => {
        // ASSERTION: registerDevSession should be called at least TWICE
        // First call fails, second call succeeds
        // This will FAIL on unfixed code because no retry mechanism exists
        expect(mockRegisterDevSession).toHaveBeenCalledTimes(2);
      },
      { timeout: 5000 }
    );

    // Verify authentication eventually succeeds
    await waitFor(
      () => {
        expect(useEditorStore.getState().cryptoStatus).toBe("ready");
        expect(useEditorStore.getState().authToken).toBe("tok");
      },
      { timeout: 3000 }
    );
  });

  it("Test 1.4: Authentication makes only ONE attempt on failure (EXPECTED TO FAIL)", async () => {
    // Mock to always fail
    mockRegisterDevSession.mockRejectedValue(new Error("Connection refused"));

    render(<WorkspaceLayout />);

    // Wait for first auth attempt
    await waitFor(
      () => {
        expect(mockRegisterDevSession).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Wait to see if retry happens (it shouldn't on unfixed code)
    await new Promise(resolve => setTimeout(resolve, 2500));

    // ASSERTION: Should have been called MORE than once (retry attempts)
    // This will FAIL on unfixed code because no retry happens
    const callCount = mockRegisterDevSession.mock.calls.length;
    
    // Expected: At least 2-3 retry attempts before giving up
    // Unfixed code: Only 1 call (no retry)
    expect(callCount).toBeGreaterThan(1);
  });

  it("Test 1.4 (Counterexample Documentation): No retry on auth failure", async () => {
    // Mock network failure
    mockRegisterDevSession.mockRejectedValue(new Error("ECONNREFUSED"));

    render(<WorkspaceLayout />);

    // Wait for initial attempt
    await waitFor(
      () => {
        expect(mockRegisterDevSession).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Record call count after initial attempt
    const initialCallCount = mockRegisterDevSession.mock.calls.length;

    // Wait for all retry attempts (1s + 2s delays between 3 attempts)
    await waitFor(
      () => {
        expect(mockRegisterDevSession.mock.calls.length).toBeGreaterThanOrEqual(3);
        expect(useEditorStore.getState().cryptoStatus).toBe("error");
      },
      { timeout: 10_000 }
    );

    const finalCallCount = mockRegisterDevSession.mock.calls.length;

    // Document the counterexample:
    // "Single auth failure causes permanent error state, no retry attempts"
    if (finalCallCount === initialCallCount) {
      console.log(
        `BUG CONFIRMED: Authentication was attempted ${finalCallCount} time(s) with no retry. ` +
        "Expected exponential backoff retry (1s, 2s, 4s delays)."
      );
    }

    // ASSERTION: Should have attempted multiple times
    // On unfixed code: finalCallCount === 1 (BUG CONFIRMED)
    // On fixed code: finalCallCount >= 3 (BUG FIXED - with 3 max attempts)
    expect(finalCallCount).toBeGreaterThanOrEqual(3);
  });

  it("Test 1.4: Exponential backoff timing is implemented (EXPECTED TO FAIL)", async () => {
    // Mock to always fail to test retry timing
    mockRegisterDevSession.mockRejectedValue(new Error("Timeout"));

    const callTimestamps: number[] = [];
    mockRegisterDevSession.mockImplementation(async () => {
      callTimestamps.push(Date.now());
      throw new Error("Timeout");
    });

    render(<WorkspaceLayout />);

    // Wait for all retry attempts (up to 8 seconds: 1s + 2s + 4s + buffer)
    await new Promise(resolve => setTimeout(resolve, 9000));

    // ASSERTION: Should have exponential backoff delays
    // Expected pattern: immediate, +1s, +2s, +4s (total 3 retries)
    // This will FAIL on unfixed code
    expect(callTimestamps.length).toBeGreaterThanOrEqual(3);

    if (callTimestamps.length >= 3) {
      // Check delay between attempts (with tolerance for timing variance)
      const delay1 = callTimestamps[1] - callTimestamps[0];
      const delay2 = callTimestamps[2] - callTimestamps[1];

      // First retry should be ~1000ms, second ~2000ms
      // Allow 500ms tolerance for test timing
      expect(delay1).toBeGreaterThanOrEqual(800);
      expect(delay1).toBeLessThanOrEqual(1500);
      
      expect(delay2).toBeGreaterThanOrEqual(1800);
      expect(delay2).toBeLessThanOrEqual(2500);
    }
  }, 15000); // Extend test timeout to 15s
});
