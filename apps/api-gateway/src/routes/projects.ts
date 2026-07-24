import type { FastifyInstance } from "fastify";
import { memoryStore } from "../db/memory-store.js";
import { authenticate } from "../middleware/auth.js";
import { validatePublishIntent } from "../middleware/publish-zero-trust.js";
import {
  validateSyncEnvelope,
  verifySyncCryptography,
} from "../middleware/sync-crypto.js";
import { config } from "../config.js";

export async function projectRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    "/api/projects/:id/sync",
    {
      preHandler: [authenticate, validateSyncEnvelope],
      config: {
        rateLimit: {
          max: config.syncRateLimitMax,
          timeWindow: config.syncRateLimitWindowMs,
        },
      },
    },
    async (request, reply) => {
      if (reply.sent) return;

      const ctx = request.syncContext!;
      const cryptoResult = await verifySyncCryptography(request, reply);
      if (!cryptoResult || reply.sent) return;

      let ast: unknown;
      try {
        ast = JSON.parse(cryptoResult.plaintext);
      } catch {
        await reply.code(403).send({ message: "Forbidden", sessionRevoked: true });
        return;
      }

      await memoryStore.addNonce(ctx.userId, ctx.payload.nonce);

      if (!memoryStore.projects.has(ctx.projectId)) {
        await memoryStore.upsertProject({
          id: ctx.projectId,
          userId: ctx.userId,
          name: "Untitled Site",
          latestAst: ast,
        });
      } else {
        memoryStore.projects.get(ctx.projectId)!.latestAst = ast;
      }
      await memoryStore.saveVersion(ctx.projectId, ctx.payload, ast);

      return reply.send({
        ok: true,
        token: request.headers.authorization,
      });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/projects/:id/publish",
    {
      preHandler: [authenticate, validatePublishIntent],
      config: {
        rateLimit: {
          max: config.syncRateLimitMax,
          timeWindow: config.syncRateLimitWindowMs,
        },
      },
    },
    async (request, reply) => {
      if (reply.sent || !request.publishContext) return;

      const ctx = request.publishContext;
      const project = memoryStore.projects.get(ctx.projectId);
      if (!project || project.userId !== ctx.userId) {
        return reply.code(404).send({ message: "Not found" });
      }

      await memoryStore.addNonce(ctx.userId, ctx.intent.nonce);

      return reply.send({ ok: true, publishedAt: new Date().toISOString() });
    }
  );

}
