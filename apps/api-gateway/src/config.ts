import { PORTS } from "@pqc/shared";

export const config = {
  port: Number(process.env.PORT ?? PORTS.apiGateway),
  demoCorsOrigins: (
    process.env.DEMO_CORS_ORIGINS ??
    `http://localhost:${PORTS.compiledStatic},http://127.0.0.1:${PORTS.compiledStatic}`
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production-32b",
  cryptoServiceUrl:
    process.env.CRYPTO_SERVICE_URL ?? `http://localhost:${PORTS.cryptoService}`,
  cryptoServiceSecret: process.env.CRYPTO_SERVICE_SECRET ?? "internal-crypto-shared-secret",
  enforcePqcOnly: process.env.ENFORCE_PQC_ONLY !== "false",
  maxPayloadBytes: Number(process.env.MAX_PAYLOAD_BYTES ?? 2_097_152),
  nonceTtlMs: Number(process.env.NONCE_TTL_MS ?? 300_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  /** Stricter cap on POST /sync (expensive ML-KEM / ML-DSA per request). */
  syncRateLimitMax: Number(process.env.SYNC_RATE_LIMIT_MAX ?? 30),
  syncRateLimitWindowMs: Number(process.env.SYNC_RATE_LIMIT_WINDOW_MS ?? 60_000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  gitOpsEnabled: process.env.GIT_OPS_ENABLED === "true",
  gitOpsDefaultToken: process.env.GIT_OPS_TOKEN ?? "",
};
