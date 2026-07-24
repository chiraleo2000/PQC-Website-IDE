/// <reference lib="webworker" />
import type { EncryptedAstPayload, StateMutatingIntent } from "@pqc/shared";
import {
  encryptAndSignAstPayload,
  generateMlDsaKeypair,
  generateMlKemKeypair,
  secureZero,
  signPublishIntentPayload,
} from "./pqcCrypto";

export type WorkerRequest =
  | { id: string; type: "GENERATE_KEM_KEYPAIR" }
  | { id: string; type: "GENERATE_SIGN_KEYPAIR" }
  | {
      id: string;
      type: "ENCRYPT_AND_SIGN_AST";
      astJson: string;
      projectId: string;
      signerSecretKey: Uint8Array;
      signerPublicKeyId: string;
      serverKemPublicKey: Uint8Array;
      serverX25519PublicKey: Uint8Array;
    }
  | {
      id: string;
      type: "SIGN_PUBLISH_INTENT";
      projectId: string;
      signerSecretKey: Uint8Array;
      signerPublicKeyId: string;
    }
  | { id: string; type: "ZERO_BUFFER"; buffer: ArrayBuffer };

export type WorkerResponse =
  | {
      id: string;
      ok: true;
      kemPublicKey?: string;
      kemSecretKey?: Uint8Array;
      signPublicKey?: string;
      signSecretKey?: Uint8Array;
      payload?: EncryptedAstPayload;
      intent?: StateMutatingIntent;
    }
  | { id: string; ok: false; error: string };

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === "ZERO_BUFFER") {
      secureZero(new Uint8Array(msg.buffer));
      postMessage({ id: msg.id, ok: true } satisfies WorkerResponse);
      return;
    }

    if (msg.type === "GENERATE_KEM_KEYPAIR") {
      const keys = generateMlKemKeypair();
      postMessage({
        id: msg.id,
        ok: true,
        kemPublicKey: keys.publicKeyB64,
        kemSecretKey: keys.secretKey,
      } satisfies WorkerResponse);
      return;
    }

    if (msg.type === "GENERATE_SIGN_KEYPAIR") {
      const keys = generateMlDsaKeypair();
      postMessage({
        id: msg.id,
        ok: true,
        signPublicKey: keys.publicKeyB64,
        signSecretKey: keys.secretKey,
      } satisfies WorkerResponse);
      return;
    }

    if (msg.type === "ENCRYPT_AND_SIGN_AST") {
      const payload = await encryptAndSignAstPayload({
        astJson: msg.astJson,
        projectId: msg.projectId,
        signerSecretKey: msg.signerSecretKey,
        signerPublicKeyId: msg.signerPublicKeyId,
        serverKemPublicKey: msg.serverKemPublicKey,
        serverX25519PublicKey: msg.serverX25519PublicKey,
      });
      postMessage({ id: msg.id, ok: true, payload } satisfies WorkerResponse);
      return;
    }

    if (msg.type === "SIGN_PUBLISH_INTENT") {
      const intent = signPublishIntentPayload({
        projectId: msg.projectId,
        signerSecretKey: msg.signerSecretKey,
        signerPublicKeyId: msg.signerPublicKeyId,
      });
      postMessage({ id: msg.id, ok: true, intent } satisfies WorkerResponse);
      return;
    }

    const unknownId = (msg as { id: string }).id;
    postMessage({ id: unknownId, ok: false, error: "Unknown request" });
  } catch (e) {
    const errId = (ev.data as { id?: string })?.id ?? "unknown";
    postMessage({
      id: errId,
      ok: false,
      error: e instanceof Error ? e.message : "Worker error",
    });
  }
};
