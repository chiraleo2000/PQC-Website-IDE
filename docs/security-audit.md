# Automated security audit suite (Phase 4.3)

CI-ready live API tests plus offline compiler checks for post-quantum sync, replay resistance, forgery rejection, and XSS in the AST.

## Package

`apps/security-tests` — Vitest, `@noble/post-quantum`, `@pqc/shared`.

| Script | Purpose |
|--------|---------|
| `pnpm security-tests` | Full audit (from repo root) |
| `pnpm --filter @pqc/security-tests test` | Same |
| `pnpm --filter @pqc/security-tests test:hndl` | HNDL-only subset |

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `API_URL` | `http://localhost:4000` | Gateway base URL |
| `ENFORCE_PQC_ONLY` | `true` in CI | Gateway must match; health asserts `enforcePqcOnly` |

**Prerequisites:** API gateway on port **4000**, Go crypto-service on **4081** when `CRYPTO_USE_GO=true` (CI starts both).

```bash
# Terminal 1 — crypto
cd apps/crypto-service && CRYPTO_PORT=4081 go run .

# Terminal 2 — gateway
ENFORCE_PQC_ONLY=true CRYPTO_SERVICE_URL=http://127.0.0.1:4081 pnpm --filter @pqc/api-gateway dev

# Terminal 3 — audit
pnpm --filter @pqc/shared build
API_URL=http://localhost:4000 pnpm security-tests
```

## Test matrix

### Harvest Now, Decrypt Later (`src/hndl.test.ts`)

Simulates stripping classical RSA/ECC layers and asserts the gateway **only** accepts **ML-KEM-768** + **ML-DSA-65**:

- Valid PQC control sync → `200`
- `RSA-2048` / `ECC-P256` KEM → `403` + security event
- `RSA-2048` signature algorithm → `403`
- Tampered KEM ciphertext (re-signed) → `403` at verify/decrypt
- `/api/health` → `enforcePqcOnly: true`

### Replay & forgery (`src/replay-forgery.test.ts`)

- Duplicate nonce → `409`
- Expired timestamp (re-signed) → `400`
- URL `projectId` ≠ payload → `400`
- Random signature bytes → `403` (+ session revoke)
- Ciphertext tamper without valid sign → `403`
- KEM/cipher field swap after re-sign → `403`
- Invalid base64 → `400` / `403`
- Missing `Authorization` → `401`

### XSS in JSON AST (`src/xss-ast.test.ts`)

- **Offline:** `compileAstToSite` throws `CompilerSecurityError` on `<script>` and `javascript:` href
- **Live:** Encrypted sync of malicious AST succeeds (`200`); `GET /api/projects/:id/export` → `400` `Unsafe AST content`

## CI (GitHub Actions)

Job `security-tests` in `.github/workflows/ci.yml`:

1. Build `@pqc/shared`
2. Start `crypto-service` (:4081)
3. Start `api-gateway` (:4000, `ENFORCE_PQC_ONLY=true`)
4. Run `pnpm --filter @pqc/security-tests test` with `API_URL=http://localhost:4000`

## GitLab CI (example)

```yaml
security-audit:
  stage: test
  image: node:20
  services:
  script:
    - corepack enable && pnpm install
    - pnpm --filter @pqc/shared build
    - cd apps/crypto-service && go run . &
    - ENFORCE_PQC_ONLY=true CRYPTO_SERVICE_URL=http://127.0.0.1:4081 pnpm --filter @pqc/api-gateway dev &
    - sleep 5
    - API_URL=http://localhost:4000 ENFORCE_PQC_ONLY=true pnpm security-tests
```

## Helpers

`src/helpers.ts` — `devSession()`, `buildValidPayload()`, `resignPayload()`, `astWithXssPayload()`, `waitForApi()` (retries health for slow CI startup).

## Related docs

- [crypto-api.md](./crypto-api.md) — sync envelope and limits
- [zero-trust-auth.md](./zero-trust-auth.md) — ML-DSA before DB writes
- [compiler.md](./compiler.md) — AST sanitization
- [testing.md](./testing.md) — full test pyramid
