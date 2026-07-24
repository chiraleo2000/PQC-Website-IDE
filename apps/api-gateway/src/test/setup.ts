import { beforeEach, vi } from "vitest";
import { memoryStore } from "../db/memory-store.js";

/**
 * Mock Go crypto-service client — gateway tests never call :4081.
 * ML-DSA verification uses real @noble/post-quantum in lib/mldsa-verify.test.ts;
 * route tests stub verifyAndDecrypt unless they override per case.
 */
vi.mock("../services/crypto-client.js", () => ({
  verifyAndDecrypt: vi.fn(),
  generateServerKemKeypair: vi.fn().mockResolvedValue({
    publicKeyB64: "a2VtcHVibGlj",
    secretKeyB64: "a2Vtc2VjcmV0",
  }),
  CryptoServiceError: class CryptoServiceError extends Error {
    constructor(public status: number) {
      super("Cryptographic verification failed");
      this.name = "CryptoServiceError";
    }
  },
}));

beforeEach(() => {
  memoryStore.resetForTests();
  vi.clearAllMocks();
});
