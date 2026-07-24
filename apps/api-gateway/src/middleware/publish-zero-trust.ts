import type { FastifyReply, FastifyRequest } from "fastify";
import { stateMutatingIntentSchema, type StateMutatingIntent } from "@pqc/shared";
import { config } from "../config.js";
import { memoryStore, type SigningKeyRecord } from "../db/memory-store.js";
import { verifyMlDsaOverIntent } from "../lib/mldsa-verify.js";
import {
  checkNonce,
  checkPayloadSize,
  checkSignerKey,
  checkTimestampIso,
} from "../lib/sync-guard.js";
import { extractBearerToken, failZeroTrustAuth } from "./zero-trust.js";

export type PublishValidatedContext = {
  projectId: string;
  intent: StateMutatingIntent;
  signingKey: SigningKeyRecord;
  token: string;
  userId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    publishContext?: PublishValidatedContext;
  }
}

function intentIsPqcOnly(intent: StateMutatingIntent): boolean {
  return intent.signature.algorithm === "ML-DSA-65";
}

/**
 * Validate publish body: nonce, timestamp, signer binding, ML-DSA over intent fields.
 * No project DB write until handler runs after this middleware succeeds.
 */
export async function validatePublishIntent(
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
  const sizeErr = checkPayloadSize(raw, 16_384);
  if (sizeErr) {
    await reply.code(sizeErr.status).send({ message: sizeErr.message });
    return;
  }

  const parsed = stateMutatingIntentSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.projectId !== projectId) {
    await reply.code(400).send({ message: "Invalid signed intent" });
    return;
  }

  const intent = parsed.data;

  if (config.enforcePqcOnly && !intentIsPqcOnly(intent)) {
    await memoryStore.logSecurity(userId, "CLASSICAL_ALGORITHM_REJECTED", {
      sign: intent.signature.algorithm,
    }, "HIGH");
    await failZeroTrustAuth(reply, {
      token,
      userId,
      event: "CLASSICAL_ALGORITHM_REJECTED",
    });
    return;
  }

  const tsErr = checkTimestampIso(intent.timestamp, Date.now(), config.nonceTtlMs);
  if (tsErr) {
    await reply.code(tsErr.status).send({ message: tsErr.message });
    return;
  }

  const nonceErr = checkNonce(userId, intent.nonce, memoryStore.nonces, memoryStore.nonceKey);
  if (nonceErr) {
    await reply.code(nonceErr.status).send({ message: nonceErr.message });
    return;
  }

  const { result: signerErr, signingKey } = checkSignerKey(
    userId,
    intent.signerPublicKeyId,
    memoryStore.signingKeys
  );
  if (signerErr || !signingKey) {
    if (signerErr?.securityEvent) {
      await memoryStore.logSecurity(userId, signerErr.securityEvent, {
        signerPublicKeyId: intent.signerPublicKeyId,
      }, "HIGH");
    }
    if (signerErr?.revokeToken) {
      await failZeroTrustAuth(reply, {
        token,
        userId,
        event: signerErr.securityEvent ?? "UNKNOWN_SIGNER_KEY",
      });
      return;
    }
    await reply.code(403).send({ message: "Forbidden" });
    return;
  }

  if (!signingKey.publicKeyB64) {
    signingKey.publicKeyB64 = (request.headers["x-sign-public-key"] as string) ?? "";
  }

  try {
    verifyMlDsaOverIntent(intent, signingKey.publicKeyB64);
  } catch {
    await failZeroTrustAuth(reply, {
      token,
      userId,
      event: "SIGNATURE_VERIFICATION_FAILED",
      detail: { projectId, action: intent.action },
    });
    return;
  }

  request.publishContext = { projectId, intent, signingKey, token, userId };
}
