import type { EncryptedAstPayload, StateMutatingIntent } from "@pqc/shared";
import type { WorkerRequest, WorkerResponse } from "../workers/pqc.worker";

let worker: Worker | null = null;
let signSecretKey: Uint8Array | null = null;

function getWorker(): Worker {
  worker ??= new Worker(new URL("../workers/pqc.worker.ts", import.meta.url), {
    type: "module",
  });
  return worker;
}

function callWorker<T extends WorkerResponse>(req: WorkerRequest): Promise<T> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const handler = (ev: MessageEvent<WorkerResponse>) => {
      if (ev.data.id !== req.id) return;
      w.removeEventListener("message", handler);
      if (ev.data.ok) resolve(ev.data as T);
      else reject(new Error(ev.data.error));
    };
    w.addEventListener("message", handler);
    w.postMessage(req);
  });
}

/** Offload ML-KEM-768 key generation to the PQC worker (never blocks the UI thread). */
export async function generateKemKeypair(): Promise<{
  publicKeyB64: string;
  secretKey: Uint8Array;
}> {
  const id = crypto.randomUUID();
  const res = await callWorker<Extract<WorkerResponse, { ok: true }>>({
    id,
    type: "GENERATE_KEM_KEYPAIR",
  });
  if (!res.kemPublicKey || !res.kemSecretKey) throw new Error("ML-KEM keygen failed");
  return { publicKeyB64: res.kemPublicKey, secretKey: res.kemSecretKey };
}

/** Offload ML-DSA-65 signing key generation to the worker; caches secret key for the session. */
export async function generateSignKeypair(): Promise<{
  publicKeyB64: string;
  secretKey: Uint8Array;
}> {
  const id = crypto.randomUUID();
  const res = await callWorker<Extract<WorkerResponse, { ok: true }>>({
    id,
    type: "GENERATE_SIGN_KEYPAIR",
  });
  if (!res.signPublicKey || !res.signSecretKey) throw new Error("ML-DSA keygen failed");
  signSecretKey = res.signSecretKey;
  return { publicKeyB64: res.signPublicKey, secretKey: res.signSecretKey };
}

export function getSignSecretKey(): Uint8Array {
  if (!signSecretKey) throw new Error("Signing key not initialized");
  return signSecretKey;
}

/**
 * Encrypt AST JSON and ML-DSA-sign the sync envelope in the worker.
 * ML-KEM encapsulates a one-time AES-256-GCM key; AES key material is zeroed before the payload returns.
 */
export async function encryptAndSignAst(params: {
  astJson: string;
  projectId: string;
  signerPublicKeyId: string;
  serverKemPublicKeyB64: string;
  serverX25519PublicKeyB64: string;
  signerSecretKey: Uint8Array;
}): Promise<EncryptedAstPayload> {
  const { fromBase64 } = await import("@pqc/shared");
  const id = crypto.randomUUID();
  const res = await callWorker<Extract<WorkerResponse, { ok: true }>>({
    id,
    type: "ENCRYPT_AND_SIGN_AST",
    astJson: params.astJson,
    projectId: params.projectId,
    signerSecretKey: params.signerSecretKey,
    signerPublicKeyId: params.signerPublicKeyId,
    serverKemPublicKey: fromBase64(params.serverKemPublicKeyB64),
    serverX25519PublicKey: fromBase64(params.serverX25519PublicKeyB64),
  });
  if (!res.payload) throw new Error("Encrypt and sign failed");
  return res.payload;
}

/** ML-DSA-sign a publish intent in the worker (no encrypted AST body). */
export async function signPublishIntent(params: {
  projectId: string;
  signerPublicKeyId: string;
  signerSecretKey: Uint8Array;
}): Promise<StateMutatingIntent> {
  const id = crypto.randomUUID();
  const res = await callWorker<Extract<WorkerResponse, { ok: true }>>({
    id,
    type: "SIGN_PUBLISH_INTENT",
    projectId: params.projectId,
    signerSecretKey: params.signerSecretKey,
    signerPublicKeyId: params.signerPublicKeyId,
  });
  if (!res.intent) throw new Error("Sign publish intent failed");
  return res.intent;
}

/** Zero a buffer on the main thread and ask the worker to overwrite the transferred copy. */
export function zeroizeBuffer(buf: Uint8Array): void {
  const id = crypto.randomUUID();
  const copy = new Uint8Array(buf);
  void callWorker({ id, type: "ZERO_BUFFER", buffer: copy.buffer });
  secureZeroMain(copy);
  secureZeroMain(buf);
}

function secureZeroMain(buf: Uint8Array): void {
  buf.fill(0);
  crypto.getRandomValues(buf);
  buf.fill(0);
}
