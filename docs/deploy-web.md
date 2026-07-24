# Deploy — Web (Sovereign Stack)

## Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20+ and pnpm 9+ (local development)
- Go 1.22+ (crypto-service local dev)

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

## Environment variables

See root [`.env.example`](../.env.example) and [`packages/shared/src/ports.ts`](../packages/shared/src/ports.ts).
