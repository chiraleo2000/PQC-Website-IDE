import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { memoryStore } from "../db/memory-store.js";

export async function securityAuditRoutes(app: FastifyInstance) {
  app.get(
    "/api/security/audit",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;
      const limit = Math.min(Number((request.query as { limit?: string }).limit ?? 20), 50);
      const events = memoryStore
        .listAuditLogs(userId, limit)
        .filter((e) => e.priority === "HIGH" || e.priority === "NORMAL");
      return reply.send({ events });
    }
  );
}
