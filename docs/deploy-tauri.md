# Deploy — Tauri Desktop

See the full security deliverable: [`tauri-desktop.md`](tauri-desktop.md).

## Quick build

```bash
pnpm --filter @pqc/web build
cd apps/desktop
pnpm tauri dev    # development
pnpm tauri build  # release bundle
```

## Environment

| Variable | Purpose |
|----------|---------|
| `PQC_HSM_ENABLED=1` | Enable hardware key mode |
| `PQC_HSM_KEY_B64` | 32-byte AES key material (base64) for HSM stub |

## Ports

- Webview dev: **4001** (Vite)
- API sync: **4000** (gateway) — allowed in CSP `connect-src`
