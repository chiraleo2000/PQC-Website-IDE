# Multi-stage: build React IDE → minimal nginx (non-root)
FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
RUN pnpm --filter @pqc/shared build

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @pqc/web build

# Runtime: hardened nginx on Alpine
FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf \
  && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
  && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/apps/web/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
