import { vi } from "vitest";
import { fromBase64, generateX25519Keypair, isHybridPqcPayload, toBase64 } from "@pqc/shared";
import {
  encryptAndSignAst,
  generateKemKeypair,
  generateSignKeypair,
  getSignSecretKey,
  signPublishIntent,
} from "../../crypto/pqcClient";
import {
  encryptAndSignAstPayload,
  generateMlDsaKeypair,
  generateMlKemKeypair,
  signPublishIntentPayload,
} from "../../workers/pqcCrypto";

const signKeys = generateMlDsaKeypair();
const kemKeys = generateMlKemKeypair();
const x25519Keys = generateX25519Keypair();

/** Valid ML-KEM-768 public key for encapsulation in save tests. */
export const mockServerKemPublicKeyB64 = kemKeys.publicKeyB64;

/** Valid X25519 public key for hybrid encapsulation in save tests. */
export const mockServerX25519PublicKeyB64 = toBase64(x25519Keys.publicKey);

export const mockEncryptAndSignAst = vi.mocked(encryptAndSignAst);
export const mockGenerateSignKeypair = vi.mocked(generateSignKeypair);
export const mockGenerateKemKeypair = vi.mocked(generateKemKeypair);

mockGenerateKemKeypair.mockResolvedValue({
  publicKeyB64: kemKeys.publicKeyB64,
  secretKey: kemKeys.secretKey,
});

mockGenerateSignKeypair.mockResolvedValue({
  publicKeyB64: signKeys.publicKeyB64,
  secretKey: signKeys.secretKey,
});

vi.mocked(getSignSecretKey).mockReturnValue(signKeys.secretKey);

mockEncryptAndSignAst.mockImplementation(async (params) => {
  const payload = await encryptAndSignAstPayload({
    astJson: params.astJson,
    projectId: params.projectId,
    signerSecretKey: params.signerSecretKey,
    signerPublicKeyId: params.signerPublicKeyId,
    serverKemPublicKey: fromBase64(params.serverKemPublicKeyB64),
    serverX25519PublicKey: fromBase64(params.serverX25519PublicKeyB64),
  });
  if (!isHybridPqcPayload(payload)) {
    throw new Error("Mock payload must be ML-KEM-768 + X25519 + ML-DSA-65");
  }
  return payload;
});

vi.mocked(signPublishIntent).mockImplementation(async (params) =>
  signPublishIntentPayload({
    projectId: params.projectId,
    signerSecretKey: params.signerSecretKey,
    signerPublicKeyId: params.signerPublicKeyId,
  })
);
