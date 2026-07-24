import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { compileAstToSite, CompilerSecurityError } from "../compiler/ast-to-code.js";
import {
  createZipExportStream,
  GitOpsError,
  pushCompiledSiteToGit,
} from "../compiler/package-export.js";
import { config } from "../config.js";
import { memoryStore } from "../db/memory-store.js";
import { authenticate } from "../middleware/auth.js";

const gitExportBodySchema = z.object({
  remoteUrl: z.string().url(),
  branch: z.string().min(1).max(128).default("main"),
  commitMessage: z.string().min(1).max(500).default("chore: export from PQC IDE"),
  /** Optional HTTPS token (GitHub PAT, GitLab deploy token) — never stored. */
  token: z.string().min(1).optional(),
});

export async function exportRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string }; Querystring: { demoMode?: string } }>(
    "/api/projects/:id/export",
    { preHandler: authenticate },
    async (request, reply) => {
      const project = memoryStore.projects.get(request.params.id);
      if (!project || project.userId !== request.user!.sub || !project.latestAst) {
        return reply.code(404).send({ message: "Not found" });
      }

      const astRoot = project.latestAst as import("@pqc/shared").AstRoot;
      const demoMode = request.query.demoMode === "true";

      try {
        const compiled = compileAstToSite(astRoot, project.name, {
          demoMode,
          apiBase: `http://localhost:${config.port}`,
        });
        const { stream, filename } = createZipExportStream(compiled, project.name);

        reply.header("Content-Type", "application/zip");
        reply.header("Content-Disposition", `attachment; filename="${filename}"`);
        return reply.send(stream);
      } catch (e) {
        if (e instanceof CompilerSecurityError) {
          return reply.code(400).send({ message: "Unsafe AST content" });
        }
        throw e;
      }
    }
  );

  app.post<{ Params: { id: string }; Querystring: { demoMode?: string } }>(
    "/api/projects/:id/export/git",
    { preHandler: authenticate },
    async (request, reply) => {
      if (!config.gitOpsEnabled) {
        return reply.code(503).send({ message: "GitOps export is disabled" });
      }

      const project = memoryStore.projects.get(request.params.id);
      if (!project || project.userId !== request.user!.sub || !project.latestAst) {
        return reply.code(404).send({ message: "Not found" });
      }

      const parsed = gitExportBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Invalid GitOps request" });
      }

      const astRoot = project.latestAst as import("@pqc/shared").AstRoot;
      const demoMode = request.query.demoMode === "true";

      try {
        const compiled = compileAstToSite(astRoot, project.name, {
          demoMode,
          apiBase: `http://localhost:${config.port}`,
        });

        const result = await pushCompiledSiteToGit(compiled, {
          remoteUrl: parsed.data.remoteUrl,
          branch: parsed.data.branch,
          commitMessage: parsed.data.commitMessage,
          authorName: "PQC Website IDE",
          authorEmail: "export@pqc-ide.local",
          credentials: parsed.data.token ?? config.gitOpsDefaultToken,
        });

        return reply.send({ ok: true, ...result });
      } catch (e) {
        if (e instanceof CompilerSecurityError) {
          return reply.code(400).send({ message: "Unsafe AST content" });
        }
        if (e instanceof GitOpsError) {
          return reply.code(400).send({ message: e.message });
        }
        return reply.code(502).send({ message: "Git push failed" });
      }
    }
  );
}
