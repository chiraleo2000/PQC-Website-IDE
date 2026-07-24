import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { createDemoPost, listDemoPosts } from "../../services/demo-posts.js";
import { demoLoginBodySchema, demoPostBodySchema } from "./schemas.js";

const DEMO_EMAIL = "demo@local";
const DEMO_PASSWORD = "demo-password";
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000099";

/**
 * Mock API for the compiled Login & Blog static demo (`demo-app.js`).
 * Mounted at `/demo-api/*` on port 4000 (same listener as sovereign `/api/*`).
 */
export async function demoApiRoutes(app: FastifyInstance) {
  await app.register(
    async (demo) => {
      demo.get("/health", async () => ({
        status: "ok",
        service: "demo-api",
        port: config.port,
      }));

      demo.post("/login", async (request, reply) => {
        const parsed = demoLoginBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({
            message: "Invalid request body",
            issues: parsed.error.flatten().fieldErrors,
          });
        }

        const { email, password } = parsed.data;
        if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          return reply.code(401).send({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
          { sub: DEMO_USER_ID, email: DEMO_EMAIL, demo: true },
          config.jwtSecret,
          { expiresIn: "1h" }
        );

        return reply.send({
          token,
          tokenType: "Bearer",
          expiresIn: 3600,
          user: { id: DEMO_USER_ID, email: DEMO_EMAIL },
        });
      });

      demo.get("/posts", async (_request, reply) => {
        return reply.send({ posts: listDemoPosts() });
      });

      demo.post("/posts", async (request, reply) => {
        const parsed = demoPostBodySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({
            message: "Invalid request body",
            issues: parsed.error.flatten().fieldErrors,
          });
        }

        const post = createDemoPost({
          title: parsed.data.title,
          body: parsed.data.body ?? "",
        });
        return reply.code(201).send(post);
      });
    },
    { prefix: "/demo-api" }
  );
}
