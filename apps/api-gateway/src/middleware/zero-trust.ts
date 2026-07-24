import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { memoryStore } from "../db/memory-store.js";
import { revokeToken } from "./auth.js";

export type SecurityPriority = "HIGH" | "NORMAL";

/**
 * JWT transport auth — identifies the caller only.
 * Does NOT authorize sync/publish; ML-DSA + nonce required on state-mutating routes.
 */
export { authenticate, revokeToken } from "./auth.js";
export type { JwtPayload } from "./auth.js";

/**
 * On ML-DSA failure (or other zero-trust crypto breach): revoke session immediately,
 * emit high-priority audit event, instruct client to re-authenticate.
 */
export async function failZeroTrustAuth(
  reply: FastifyReply,
  opts: {
    token: string;
    userId: string;
    event: string;
    detail?: unknown;
  }
): Promise<void> {
  revokeToken(opts.token);
  await memoryStore.logSecurity(opts.userId, opts.event, opts.detail, "HIGH");
  reply.header("X-Session-Revoked", "true");
  await reply.code(403).send({ message: "Forbidden", sessionRevoked: true });
}

/** Issue a fresh JWT after successful registration (optional rotation on success). */
export function issueSessionToken(user: { id: string; email: string }): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: "8h",
  });
}

export function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function isSessionRevoked(token: string): boolean {
  return memoryStore.revokedTokens.has(token);
}
