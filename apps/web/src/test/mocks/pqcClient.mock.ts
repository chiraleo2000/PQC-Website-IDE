import { vi } from "vitest";

vi.mock("../../crypto/pqcClient", () => ({
  generateKemKeypair: vi.fn(),
  generateSignKeypair: vi.fn(),
  getSignSecretKey: vi.fn(),
  encryptAndSignAst: vi.fn(),
  signPublishIntent: vi.fn(),
  zeroizeBuffer: vi.fn(),
}));
