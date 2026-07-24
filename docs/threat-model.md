# Threat Model

## Assets

- User website AST (design IP)
- ML-DSA signing keys (client-held secret)
- Server ML-KEM secret keys (per-user envelope encryption)
- Session JWTs (transport only; insufficient alone)

## Threats and mitigations

| Threat | Mitigation |
|--------|------------|
| Harvest Now, Decrypt Later | `ENFORCE_PQC_ONLY` rejects RSA/ECC in payloads |
| Replay of sync | Nonce ledger + timestamp TTL |
| Signature forgery | ML-DSA verify in Go before DB write |
| Crypto DoS | Body size limits, rate limiting, timeouts |
| XSS in export | AST compiler allowlists |
| Timing leaks | Generic 403/400 responses; constant-time compare in Go |
| Token theft | Mutations require fresh nonce + signature |

## CI regression

Security tests simulate:

- Valid PQC payload → 200
- Classical algorithm fields → 403 + token revoke
- Reused nonce → 409
- Forged signature → 403
- XSS in AST → 400 on export

## Compliance mapping

- **OWASP ASVS:** input validation, crypto at rest in transit, session management
- **NIST PQC:** ML-KEM-768, ML-DSA-65 per FIPS 203/204 migration guidance
