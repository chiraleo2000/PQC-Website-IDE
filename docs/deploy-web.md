# Deploy — Web (Sovereign Stack)

## Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20+ and pnpm 9+ (local development)
- Go 1.26+ (crypto-service local dev)

## Local development

```bash
pnpm install
pnpm --filter @pqc/shared build

# Terminal 1 — crypto service (:4081)
cd apps/crypto-service
go mod tidy
go run .

# Terminal 2 — API gateway (:4000, includes /demo-api)
cd apps/api-gateway
pnpm dev

# Terminal 3 — web IDE (:4001)
cd apps/web
pnpm dev
```

Open **http://localhost:4001**

### Ports (4000 range)

| Port | Service |
|------|---------|
| 4000 | API gateway + demo-api |
| 4001 | Web IDE (Vite) |
| 4010 | Compiled Login/Blog (manual / E2E) |
| 4081 | Go crypto-service |

## Docker (production-like)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d --build
```

Published: **4000** (API), **4001** (web), **443** (Traefik).

## Cloudflare HTTPS

Two separate Cloudflare features:

| Path | What it does |
|------|----------------|
| Tunnel | Serves the IDE itself at your hostname, without opening router ports |
| Pages | Gives each **Publish** a public `https://<site>.pages.dev` URL |

### Tunnel for the IDE

1. In the Cloudflare dashboard open **Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Name it (for example `pqc-ide`) and copy the tunnel token.
3. Add a public hostname. Set the service URL to `http://web:8080` (the web container already proxies `/api` to the gateway).
4. Put the token in `infra/.env` as `CLOUDFLARE_TUNNEL_TOKEN`.
5. Start the connector:

```bash
docker compose -f infra/docker-compose.yml --profile cloudflare up -d --build
```

Traefik on port 443 stays available for offline TLS. Leave the `cloudflare` profile off when you are not using a tunnel.

### Pages for each published site

1. Create an API token with **Account → Cloudflare Pages → Edit**.
2. Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `infra/.env` (server only; the browser never sees the token).
3. In the IDE, pick a template, **Save**, then **Publish**.

Publish still checks the ML-DSA signature when these variables are empty. The toast then says HTTPS publish needs the token, and no upload is started. When they are set, Publish compiles the saved site and direct-uploads it. The top bar shows **Live at** the Pages URL.

Add the Pages origin to `DEMO_CORS_ORIGINS` if a published site calls back to this gateway (`https://<project>.pages.dev` is already allowed).

## Environment variables

See root [`.env.example`](../.env.example) and [`packages/shared/src/ports.ts`](../packages/shared/src/ports.ts).
