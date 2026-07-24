import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { memoryStore } from "../db/memory-store.js";

export interface JwtPayload {
  sub: string;
  email: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  if (memoryStore.revokedTokens.has(token)) {
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    request.user = payload;
  } catch {
    reply.code(401).send({ message: "Unauthorized" });
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
    rawBody?: string;
  }
}

export function revokeToken(token: string) {
  memoryStore.revokedTokens.add(token);
}
