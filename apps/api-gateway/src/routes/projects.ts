import type { FastifyInstance } from "fastify";
import type { AstRoot, FunctionManifestEntry } from "@pqc/shared";
import { compileAstToSite, CompilerSecurityError } from "../compiler/ast-to-code.js";
import { compiledSiteFiles } from "../compiler/package-export.js";
import { memoryStore } from "../db/memory-store.js";
import { authenticate } from "../middleware/auth.js";
import { validatePublishIntent } from "../middleware/publish-zero-trust.js";
import {
  validateSyncEnvelope,
  verifySyncCryptography,
} from "../middleware/sync-crypto.js";
import { config } from "../config.js";
import {
  CloudflarePagesError,
  deployCompiledSite,
  isCloudflareConfigured,
  pagesProjectName,
} from "../services/cloudflare-pages.js";

function readProjectName(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  try {
    const name = decodeURIComponent(raw).trim().slice(0, 80);
    return name || null;
  } catch {
    return null;
  }
}

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

      const headerName = readProjectName(request.headers["x-project-name"]);
      if (!memoryStore.projects.has(ctx.projectId)) {
        await memoryStore.upsertProject({
          id: ctx.projectId,
          userId: ctx.userId,
          name: headerName ?? "Untitled Site",
          latestAst: ast,
        });
      } else {
        const existing = memoryStore.projects.get(ctx.projectId)!;
        existing.latestAst = ast;
        if (headerName) existing.name = headerName;
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

      const headerName = readProjectName(request.headers["x-project-name"]);
      if (headerName) project.name = headerName;
      await memoryStore.upsertProject(project);

      const manifest = (ctx.intent.functions ?? []) as FunctionManifestEntry[];
      const slug = pagesProjectName(project.name, project.id);
      const httpsConfigured = isCloudflareConfigured();
      const publishedAt = new Date().toISOString();
      let httpsUrl: string | null = null;

      await memoryStore.saveDeployment({
        projectId: project.id,
        pagesProjectName: slug,
        httpsUrl: null,
        manifest,
        createdAt: publishedAt,
      });

      if (httpsConfigured) {
        if (!project.latestAst) {
          return reply.code(409).send({ message: "Save the site before HTTPS publish" });
        }
        try {
          const compiled = compileAstToSite(project.latestAst as AstRoot, project.name, {
            siteOrigin: `https://${slug}.pages.dev`,
          });
          const uploaded = await deployCompiledSite({
            projectName: slug,
            files: compiledSiteFiles(compiled),
          });
          httpsUrl = uploaded.url;
          await memoryStore.saveDeployment({
            projectId: project.id,
            pagesProjectName: slug,
            httpsUrl,
            manifest,
            createdAt: publishedAt,
          });
        } catch (error) {
          if (error instanceof CompilerSecurityError) {
            return reply.code(400).send({ message: "Unsafe AST content" });
          }
          console.error(
            "[PQC] Cloudflare publish failed",
            error instanceof CloudflarePagesError ? error.name : "error"
          );
          return reply.code(502).send({ message: "Cloudflare publish failed" });
        }
      }

      return reply.send({
        ok: true,
        publishedAt,
        url: httpsUrl,
        httpsConfigured,
        notice: httpsConfigured
          ? undefined
          : "HTTPS publish needs a Cloudflare API token on the server",
      });
    }
  );

}
