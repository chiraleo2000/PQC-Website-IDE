# Multi-stage: compile TypeScript → minimal Node Alpine runtime (non-root)
FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api-gateway ./apps/api-gateway

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
RUN pnpm --filter @pqc/shared build \
  && pnpm --filter @pqc/api-gateway build

# Production deploy bundle (prod deps only)
RUN pnpm --filter @pqc/api-gateway deploy --prod /out

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app \
  && chown -R app:app /app

COPY --from=build --chown=app:app /out/ ./

USER app
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health >/dev/null || exit 1

CMD ["node", "dist/index.js"]
