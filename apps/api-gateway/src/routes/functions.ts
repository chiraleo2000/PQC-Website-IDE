import type { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { memoryStore } from "../db/memory-store.js";
import { checkFunctionCall, manifestFromDeployment } from "../lib/function-access.js";
import { createDemoPost } from "../services/demo-posts.js";

const DEMO_EMAIL = "demo@local";
const DEMO_PASSWORD = "demo-password";
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000099";

const invokeSchema = z
  .object({
    projectId: z.string().uuid(),
    name: z.enum(["login", "createPost"]),
    fields: z.record(z.string()),
  })
  .strict();

function hasDemoJwt(request: FastifyRequest): boolean {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { demo?: boolean };
    return payload.demo === true;
  } catch {
    return false;
  }
}

/** Visitor calls into functions the site owner signed at publish time. */
export async function functionRoutes(app: FastifyInstance) {
  app.post("/api/functions/invoke", async (request, reply) => {
    const parsed = invokeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid function call" });
    }

    const { projectId, name, fields } = parsed.data;
    const deployment = memoryStore.latestDeployment(projectId);
    const check = checkFunctionCall(manifestFromDeployment(deployment?.manifest), name, fields);
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message });
    }

    if (name === "login") {
      if (fields.email !== DEMO_EMAIL || fields.password !== DEMO_PASSWORD) {
        return reply.code(401).send({ message: "Invalid credentials" });
      }
      const token = jwt.sign(
        { sub: DEMO_USER_ID, email: DEMO_EMAIL, demo: true },
        config.jwtSecret,
        { expiresIn: "1h" }
      );
      return reply.send({ token, tokenType: "Bearer", expiresIn: 3600 });
    }

    if (!hasDemoJwt(request)) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    if (!fields.title) {
      return reply.code(400).send({ message: "Missing field" });
    }
    const post = createDemoPost({ title: fields.title, body: fields.body ?? "" });
    return reply.code(201).send(post);
  });
}
