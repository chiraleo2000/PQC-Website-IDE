# Demo API (`/demo-api/*`)

Mock backend for the compiled **Login & Blog** static site. Runs on the same Fastify listener as the sovereign API — port **4000** (`PORTS.apiGateway`).

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/demo-api/health` | Liveness check |
| `POST` | `/demo-api/login` | Demo login → JWT |
| `GET` | `/demo-api/posts` | List blog posts |
| `POST` | `/demo-api/posts` | Create a blog post |

Static assets: `/demo-api/static/*` (from `packages/demo-runtime/dist` when built).

## Credentials (demo only)

| Field | Value |
|-------|-------|
| Email | `demo@local` |
| Password | `demo-password` |

## CORS

Compiled site is served on **4010**; the gateway allows:

- `http://localhost:4010` / `127.0.0.1:4010` (via `DEMO_CORS_ORIGINS`)
- `http://localhost:4001` (IDE dev server)

Override origins:

```env
DEMO_CORS_ORIGINS=http://localhost:4010,http://127.0.0.1:4010
```

## Storage

Posts are kept in **memory** (`memoryStore.demoPosts`) with two seed posts on first access. Suitable for local demo and E2E; use Postgres project tables for production IDE sync.

## Run

```bash
# Full gateway (sovereign + demo-api)
pnpm --filter @pqc/api-gateway dev

# Demo API only (E2E compiled flow)
DEMO_ONLY=1 pnpm --filter @pqc/api-gateway dev
```

## Tests

```bash
pnpm --filter @pqc/api-gateway test
```

See [`demo-api.test.ts`](../apps/api-gateway/src/routes/demo-api.test.ts).
