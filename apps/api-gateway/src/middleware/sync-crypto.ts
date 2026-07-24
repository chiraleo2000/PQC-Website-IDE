import type { FastifyReply, FastifyRequest } from "fastify";
import type { EncryptedAstPayload } from "@pqc/shared";
import { config } from "../config.js";
import { verifyMlDsaOverSyncPayload } from "../lib/mldsa-verify.js";
import { memoryStore, type SigningKeyRecord } from "../db/memory-store.js";
import {
  checkCryptoFieldSizes,
  checkNonce,
  checkPayloadSize,
  checkPqcOnly,
  checkSignerKey,
  checkTimestamp,
  parseEncryptedPayload,
  type GuardError,
} from "../lib/sync-guard.js";
import {
  CryptoServiceError,
  verifyAndDecrypt,
  type DecryptResult,
} from "../services/crypto-client.js";
import { extractBearerToken, failZeroTrustAuth } from "./zero-trust.js";

export type SyncValidatedContext = {
  projectId: string;
  payload: EncryptedAstPayload;
  signingKey: SigningKeyRecord;
  token: string;
  userId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    syncContext?: SyncValidatedContext;
  }
}

async function sendGuardError(
  reply: FastifyReply,
  err: GuardError,
  userId: string,
  token: string
) {
  if (err.securityEvent) {
    await memoryStore.logSecurity(
      userId,
      err.securityEvent,
      {},
      err.revokeToken ? "HIGH" : "NORMAL"
    );
  }
  if (err.revokeToken) {
    await failZeroTrustAuth(reply, { token, userId, event: err.securityEvent ?? "ZERO_TRUST_VIOLATION" });
    return;
  }
  await reply.code(err.status).send({ message: err.message });
}

/**
 * Pre-handler: schema, replay nonce, signer binding.
 * ML-DSA verification runs in verifySyncCryptography before KEM/decrypt and before DB writes.
 */
export async function validateSyncEnvelope(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.sub;
  const token = extractBearerToken(request);
  if (!token) {
    await reply.code(401).send({ message: "Unauthorized" });
    return;
  }
  const projectId = request.params.id;

  const raw = JSON.stringify(request.body ?? {});
  const sizeErr = checkPayloadSize(raw, config.maxPayloadBytes);
  if (sizeErr) {
    await reply.code(sizeErr.status).send({ message: sizeErr.message });
    return;
  }

  const parsed = parseEncryptedPayload(request.body, projectId);
  if (!parsed.ok) {
    await reply.code(parsed.status).send({ message: parsed.message });
    return;
  }

  const payload = parsed.payload;

  const fieldErr = checkCryptoFieldSizes(payload);
  if (fieldErr) {
    await reply.code(fieldErr.status).send({ message: fieldErr.message });
    return;
  }

  const pqcErr = checkPqcOnly(payload, config.enforcePqcOnly);
  if (pqcErr) {
    await memoryStore.logSecurity(userId, pqcErr.securityEvent!, {
      kem: payload.kem.algorithm,
      classicalKem: payload.classicalKem.algorithm,
      sign: payload.signature.algorithm,
    }, "HIGH");
    await sendGuardError(reply, pqcErr, userId, token);
    return;
  }

  const tsErr = checkTimestamp(payload, Date.now(), config.nonceTtlMs);
  if (tsErr) {
    await reply.code(tsErr.status).send({ message: tsErr.message });
    return;
  }

  const nonceErr = checkNonce(
    userId,
    payload.nonce,
    memoryStore.nonces,
    memoryStore.nonceKey
  );
  if (nonceErr) {
    await reply.code(nonceErr.status).send({ message: nonceErr.message });
    return;
  }

  const { result: signerErr, signingKey } = checkSignerKey(
    userId,
    payload.signerPublicKeyId,
    memoryStore.signingKeys
  );
  if (signerErr || !signingKey) {
    if (signerErr?.securityEvent) {
      await memoryStore.logSecurity(userId, signerErr.securityEvent, {
        signerPublicKeyId: payload.signerPublicKeyId,
      }, "HIGH");
    }
    if (signerErr) {
      await sendGuardError(reply, signerErr, userId, token);
      return;
    }
    await reply.code(403).send({ message: "Forbidden" });
    return;
  }

  if (!signingKey.publicKeyB64) {
    signingKey.publicKeyB64 = (request.headers["x-sign-public-key"] as string) ?? "";
  }

  request.syncContext = { projectId, payload, signingKey, token, userId };
}

/**
 * ML-DSA verify first (explicit), then KEM/AES decrypt. On failure: revoke JWT + HIGH audit.
 */
export async function verifySyncCryptography(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<DecryptResult | undefined> {
  const ctx = request.syncContext;
  if (!ctx) return;

  try {
    verifyMlDsaOverSyncPayload(ctx.payload, ctx.signingKey.publicKeyB64);

    const result = await verifyAndDecrypt({
      payload: ctx.payload,
      signerPublicKeyB64: ctx.signingKey.publicKeyB64,
      kemSecretKeyB64: ctx.signingKey.kemSecretKeyB64,
      x25519SecretKeyB64: ctx.signingKey.x25519SecretKeyB64,
    });

    if (!result.verified) {
      throw new CryptoServiceError(403);
    }

    return result;
  } catch {
    await failZeroTrustAuth(reply, {
      token: ctx.token,
      userId: ctx.userId,
      event: "SIGNATURE_VERIFICATION_FAILED",
      detail: { projectId: ctx.projectId },
    });
    return undefined;
  }
}
