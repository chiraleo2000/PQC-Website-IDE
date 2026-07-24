/**
 * Vitest Worker stub — routes PQC work on the mock instance (no WASM worker thread).
 * Mirrors `pqc.worker.ts` message types for tests that construct Worker directly.
 */
import type { WorkerRequest, WorkerResponse } from "../../workers/pqc.worker";
import {
  encryptAndSignAstPayload,
  generateMlDsaKeypair,
  generateMlKemKeypair,
  secureZero,
  signPublishIntentPayload,
} from "../../workers/pqcCrypto";

export class MockPqcWorker {
  private messageHandler: ((ev: MessageEvent<WorkerResponse>) => void) | null = null;

  addEventListener(
    type: string,
    handler: (ev: MessageEvent<WorkerResponse>) => void
  ): void {
    if (type === "message") this.messageHandler = handler;
  }

  removeEventListener(type: string): void {
    if (type === "message") this.messageHandler = null;
  }

  postMessage(req: WorkerRequest): void {
    void this.handle(req);
  }

  terminate(): void {
    this.messageHandler = null;
  }

  private async handle(req: WorkerRequest): Promise<void> {
    const reply = this.messageHandler;
    if (!reply) return;

    try {
      let res: WorkerResponse;

      if (req.type === "ZERO_BUFFER") {
        secureZero(new Uint8Array(req.buffer));
        res = { id: req.id, ok: true };
      } else if (req.type === "GENERATE_KEM_KEYPAIR") {
        const keys = generateMlKemKeypair();
        res = {
          id: req.id,
          ok: true,
          kemPublicKey: keys.publicKeyB64,
          kemSecretKey: keys.secretKey,
        };
      } else if (req.type === "GENERATE_SIGN_KEYPAIR") {
        const keys = generateMlDsaKeypair();
        res = {
          id: req.id,
          ok: true,
          signPublicKey: keys.publicKeyB64,
          signSecretKey: keys.secretKey,
        };
      } else if (req.type === "ENCRYPT_AND_SIGN_AST") {
        const payload = await encryptAndSignAstPayload({
          astJson: req.astJson,
          projectId: req.projectId,
          signerSecretKey: req.signerSecretKey,
          signerPublicKeyId: req.signerPublicKeyId,
          serverKemPublicKey: req.serverKemPublicKey,
          serverX25519PublicKey: req.serverX25519PublicKey,
        });
        res = { id: req.id, ok: true, payload };
      } else if (req.type === "SIGN_PUBLISH_INTENT") {
        const intent = signPublishIntentPayload({
          projectId: req.projectId,
          signerSecretKey: req.signerSecretKey,
          signerPublicKeyId: req.signerPublicKeyId,
        });
        res = { id: req.id, ok: true, intent };
      } else {
        res = { id: (req as { id: string }).id, ok: false, error: "Unknown request" };
      }

      reply({ data: res } as MessageEvent<WorkerResponse>);
    } catch (e) {
      reply({
        data: {
          id: req.id,
          ok: false,
          error: e instanceof Error ? e.message : "Worker error",
        },
      } as MessageEvent<WorkerResponse>);
    }
  }
}
