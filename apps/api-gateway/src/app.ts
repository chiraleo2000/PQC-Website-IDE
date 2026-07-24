import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { authenticate } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { exportRoutes } from "./routes/export.js";
import { projectRoutes } from "./routes/projects.js";
import { securityAuditRoutes } from "./routes/security-audit.js";
import { gatewayCorsOptions } from "./lib/demo-cors.js";
import { demoApiRoutes } from "./routes/demo-api/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: false,
    bodyLimit: config.maxPayloadBytes,
  });

  app.decorate("authenticate", authenticate);

  await app.register(cors, gatewayCorsOptions());
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });

  const demoStatic = path.join(__dirname, "../../../packages/demo-runtime/dist");
  if (existsSync(demoStatic)) {
    await app.register(fastifyStatic, {
      root: demoStatic,
      prefix: "/demo-api/static/",
      decorateReply: false,
    });
  }

  app.get("/api/health", async () => ({
    status: "ok",
    enforcePqcOnly: config.enforcePqcOnly,
    port: config.port,
    allowDevRegister: config.allowDevRegister,
    postgres: Boolean(config.databaseUrl),
  }));

  await app.register(authRoutes);
  await app.register(securityAuditRoutes);
  await app.register(projectRoutes);
  await app.register(exportRoutes);
  await app.register(demoApiRoutes);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ message: "Internal error" });
  });

  return app;
}
