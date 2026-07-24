# Testing Guide

## Unit tests (Vitest)

```bash
pnpm install
pnpm --filter @pqc/shared build
pnpm test:unit
```

| Package | Command |
|---------|---------|
| Shared AST + crypto schemas | `pnpm --filter @pqc/shared test` |
| API gateway (mocked Go crypto) | `pnpm --filter @pqc/api-gateway test` |
| Gateway sync-guard only | `pnpm --filter @pqc/api-gateway test:guard` |
| Gateway sync middleware only | `pnpm --filter @pqc/api-gateway test:middleware` |
| Web RTL + Zustand + PQC mocks | `pnpm --filter @pqc/web test` |
| Web canvas subset | `pnpm --filter @pqc/web test:canvas` |

Web tests mock the PQC Worker (`src/test/mocks/pqc.worker.mock.ts`) and `pqcClient` (`configure-pqc-mocks.ts` uses real `pqcCrypto` on the main thread). `@dnd-kit` drop logic is covered in `dnd-handlers.test.ts` and `CenterCanvas.test.tsx`; full pointer drags are E2E (`pnpm test:e2e`).

Gateway tests use Vitest with `apps/api-gateway/vitest.config.ts`. The Go crypto-service is mocked in `src/test/setup.ts`; ML-DSA unit tests use real `@noble/post-quantum`. Key files:

- `src/lib/sync-guard.test.ts` — Zod parse, nonce/timestamp replay, PQC-only, field limits
- `src/middleware/sync-crypto.test.ts` — `validateSyncEnvelope` HTTP status codes
- `src/lib/mldsa-verify.test.ts` — signature forgery / tamper
- `src/routes/projects.sync.test.ts` — full Fastify inject with mocked `verifyAndDecrypt`

## Security regression (live API)

```bash
# Start crypto-service + api-gateway first
pnpm security-tests   # see docs/security-audit.md
```

## Playwright E2E (full stack)

Starts Go crypto-service, Fastify gateway, and Vite web dev server automatically.

**Browsers:** Chromium (full suite), Firefox + WebKit (`ide-save-flow`), Edge on Windows (`channel: msedge`). CI installs chromium/firefox/webkit.

Known notes:
- WebCrypto + Worker paths are covered by Chromium first; Firefox/WebKit run the core save flow.
- Edge project is skipped on Linux CI (no `msedge` channel).

```bash
pnpm --filter @pqc/e2e exec playwright install --with-deps chromium firefox webkit
pnpm test:e2e
```

### IDE save flow (full PQC stack)

`apps/e2e/tests/ide-save-flow.spec.ts` — dev login → drag **Header** → edit properties → **Save**; asserts `kem`, `cipher`, and `signature` on the sync POST (Zod + base64) before `200 OK`. Text-node editing is covered in web RTL (`CenterCanvas.test.tsx`); Playwright `dragTo` reliably adds one palette item per run.

Ports are defined in [`packages/shared/src/ports.ts`](../packages/shared/src/ports.ts) and wired in [`apps/e2e/playwright.config.ts`](../apps/e2e/playwright.config.ts).

```bash
pnpm --filter @pqc/e2e exec playwright test ide-save-flow
```

### Visual demo (presentations — headed, slowed)

Script: `apps/e2e/tests/pqc-demo-visual.spec.ts` — intentional pauses, badge hover, HNDL banner, and a **demo network panel** that displays the live `kem` / `cipher` / `signature` fields during save (DevTools is not opened automatically; the overlay is audience-friendly).

```bash
pnpm --filter @pqc/e2e exec playwright install chromium
pnpm --filter @pqc/e2e test:demo
```

Equivalent explicit command:

```bash
pnpm --filter @pqc/e2e exec playwright test pqc-demo-visual --project=demo --headed --workers=1
```

Optional tuning:

```bash
# Slower pointer moves (default 650 ms via playwright.config demo project)
PQC_DEMO_SLOW_MO=900 pnpm --filter @pqc/e2e test:demo

# Longer narrative pauses (multiplier on short/medium/long steps)
PQC_DEMO_PAUSE_MS=1.5 pnpm --filter @pqc/e2e test:demo
```

### Compiled blog app (exported static site — not the IDE)

Script: [`apps/e2e/tests/compiled-blog-app.spec.ts`](../apps/e2e/tests/compiled-blog-app.spec.ts)

Tests the **compiler output** (Login + Blog HTML/JS), not the React editor:

| Port | Role |
|------|------|
| **4010** | Compiled static site (`login.html`, `blog.html`, `demo-app.js`) |
| **4000** | Demo API (`POST /demo-api/login`, `GET|POST /demo-api/posts`) |

The login **form** is at `http://localhost:4010/login.html`. Submitting it calls **`http://localhost:4000/demo-api/login`** (via `window.__PQC_API__` in `demo-app.js`), then redirects to `blog.html`.

Credentials: `demo@local` / `demo-password`.

#### One-shot (CI / local)

Compiles AST templates into fixtures, starts API + static server, runs Playwright:

```bash
pnpm --filter @pqc/e2e exec playwright install chromium
pnpm test:compiled-demo
```

(`test:compiled-demo` = `demo-runtime` build → `prepare:demo` → `test:compiled`)

#### Sequential run *after* IDE export

Use this when you have already exported a site from the IDE (or gateway compile) and want to verify that artifact:

1. **Export / compile** the Login & Blog project (gateway `POST /api/projects/:id/export` with `demoMode: true`, or load templates in the IDE and export).

2. **Stage the static files** into the E2E fixture folder (must include `login.html`, `blog.html`, `demo-app.js`, and `styles.css` if present):

   ```bash
   # Option A — regenerate from shared templates (same as CI)
   pnpm --filter @pqc/demo-runtime build
   pnpm --filter @pqc/e2e run prepare:demo

   # Option B — copy your IDE export output
   # cp -r path/to/your/export/* apps/e2e/fixtures/compiled-blog/
   ```

   Ensure `login.html` contains:

   ```html
   <script>window.__PQC_API__='http://localhost:4000'</script>
   ```

3. **Start the demo API** (terminal 1):

   ```bash
   cd apps/api-gateway && pnpm dev
   ```

   Confirm: `curl http://localhost:4000/demo-api/health`

4. **Serve the compiled site** (terminal 2):

   ```bash
   cd apps/e2e
   npx serve fixtures/compiled-blog -p 4010
   ```

5. **Run the Playwright spec** (terminal 3):

   ```bash
   cd apps/e2e
   COMPILED_ONLY=1 API_URL=http://localhost:4000 npx playwright test compiled-blog-app --project=compiled
   ```

   Or use the wrapper (steps 3–5 automated):

   ```bash
   pnpm test:compiled-demo
   ```

## CI

GitHub Actions runs `unit`, `security-tests`, `e2e`, and `docker build` jobs — see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
