import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PORTS } from "@pqc/shared";
import { demoCorsOptions } from "./lib/demo-cors.js";
import { demoApiRoutes } from "./routes/demo-api/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Demo-only server for compiled E2E (`DEMO_ONLY=1`) — same port as full gateway. */
export async function buildDemoApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, demoCorsOptions());

  const demoStatic = path.join(__dirname, "../../../packages/demo-runtime/dist");
  if (existsSync(demoStatic)) {
    await app.register(fastifyStatic, {
      root: demoStatic,
      prefix: "/demo-api/static/",
      decorateReply: false,
    });
  }

  await app.register(demoApiRoutes);

  app.setErrorHandler((_error, _request, reply) => {
    reply.code(500).send({ message: "Internal error" });
  });

  return app;
}

export const demoListenPort = Number(process.env.PORT ?? PORTS.apiGateway);
