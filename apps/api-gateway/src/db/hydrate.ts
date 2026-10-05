import { desc, gt } from "drizzle-orm";
import type { FunctionManifestEntry } from "@pqc/shared";
import { config } from "../config.js";
import { getDb } from "./client.js";
import { memoryStore } from "./memory-store.js";
import {
  deployments,
  loginLockouts,
  nonces,
  projects,
  revokedTokens,
  securityAuditLogs,
  signingKeys,
  users,
} from "./schema.js";
import type {
  AuditEntry,
  AuditPriority,
  DeploymentRecord,
  LoginLockoutRecord,
  ProjectRecord,
  SigningKeyRecord,
  UserRecord,
} from "./types.js";

export interface HydrationRows {
  users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    authProvider: string | null;
    oidcSubject: string | null;
  }>;
  signingKeys: Array<{
    id: string;
    userId: string;
    publicKeyB64: string;
    kemPublicKeyB64: string;
    kemSecretKeyB64: string;
    x25519PublicKeyB64: string;
    x25519SecretKeyB64: string;
  }>;
  projects: Array<{
    id: string;
    userId: string;
    name: string;
    latestAst: unknown;
  }>;
  nonces: Array<{ userId: string; nonce: string; usedAt: Date | string }>;
  revoked: Array<{ tokenHash: string; expiresAt: Date | string }>;
  audits: Array<{
    userId: string | null;
    event: string;
    detail: unknown;
    priority: string;
    createdAt: Date | string;
  }>;
  lockouts: Array<{
    email: string;
    failures: number;
    lockedUntil: Date | string | null;
  }>;
  deployments: Array<{
    projectId: string;
    pagesProjectName: string;
    httpsUrl: string | null;
    signedManifest: unknown;
    createdAt: Date | string;
  }>;
}

export interface HydrationSnapshot {
  users: UserRecord[];
  signingKeys: SigningKeyRecord[];
  projects: ProjectRecord[];
  nonceKeys: string[];
  revokedHashes: string[];
  audits: AuditEntry[];
  lockouts: Array<{ email: string } & LoginLockoutRecord>;
  deployments: DeploymentRecord[];
}

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function asPriority(value: string): AuditPriority {
  return value === "HIGH" ? "HIGH" : "NORMAL";
}

function asProvider(value: string | null): UserRecord["authProvider"] {
  if (value === "oidc" || value === "dev" || value === "password") return value;
  return "password";
}

/**
 * Pure mapping from database rows into the in-memory cache.
 * Drops nonces older than the replay window and revocations that already expired.
 * Deployments are newest-first; only the latest row per project is kept.
 */
export function mapHydrationRows(
  rows: HydrationRows,
  nowMs: number,
  nonceTtlMs: number
): HydrationSnapshot {
  const nonceCutoff = nowMs - nonceTtlMs;
  const nonceKeys = rows.nonces
    .filter((row) => asTime(row.usedAt) > nonceCutoff)
    .map((row) => `${row.userId}:${row.nonce}`);

  const revokedHashes = rows.revoked
    .filter((row) => asTime(row.expiresAt) > nowMs)
    .map((row) => row.tokenHash);

  const audits = rows.audits
    .map((row) => ({
      userId: row.userId ?? undefined,
      event: row.event,
      detail: row.detail,
      priority: asPriority(row.priority),
      at: asIso(row.createdAt) ?? new Date(nowMs).toISOString(),
    }))
    .sort((a, b) => a.at.localeCompare(b.at));

  const latestDeployment = new Map<string, DeploymentRecord>();
  const deploymentRows = [...rows.deployments].sort((a, b) => asTime(b.createdAt) - asTime(a.createdAt));
  for (const row of deploymentRows) {
    if (latestDeployment.has(row.projectId)) continue;
    latestDeployment.set(row.projectId, {
      projectId: row.projectId,
      pagesProjectName: row.pagesProjectName,
      httpsUrl: row.httpsUrl,
      manifest: row.signedManifest as FunctionManifestEntry[],
      createdAt: asIso(row.createdAt) ?? new Date(nowMs).toISOString(),
    });
  }

  return {
    users: rows.users.map((row) => ({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      authProvider: asProvider(row.authProvider),
      oidcSubject: row.oidcSubject,
    })),
    signingKeys: rows.signingKeys.map((row) => ({
      id: row.id,
      userId: row.userId,
      publicKeyB64: row.publicKeyB64,
      kemPublicKeyB64: row.kemPublicKeyB64,
      kemSecretKeyB64: row.kemSecretKeyB64,
      x25519PublicKeyB64: row.x25519PublicKeyB64,
      x25519SecretKeyB64: row.x25519SecretKeyB64,
    })),
    projects: rows.projects.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      latestAst: row.latestAst ?? undefined,
    })),
    nonceKeys,
    revokedHashes,
    audits,
    lockouts: rows.lockouts.map((row) => ({
      email: row.email,
      failures: row.failures,
      lockedUntil: asIso(row.lockedUntil),
    })),
    deployments: [...latestDeployment.values()],
  };
}

/** Load Postgres into the memory cache. No-op when DATABASE_URL is unset. */
export async function hydrateMemoryFromPostgres(): Promise<void> {
  const db = getDb();
  if (!db) return;

  const now = new Date();
  const nonceCutoff = new Date(now.getTime() - config.nonceTtlMs);
  const [userRows, keyRows, projectRows, nonceRows, revokedRows, auditRows, lockRows, deployRows] =
    await Promise.all([
      db.select().from(users),
      db.select().from(signingKeys),
      db.select().from(projects),
      db.select().from(nonces).where(gt(nonces.usedAt, nonceCutoff)),
      db.select().from(revokedTokens).where(gt(revokedTokens.expiresAt, now)),
      db.select().from(securityAuditLogs).orderBy(desc(securityAuditLogs.createdAt)).limit(200),
      db.select().from(loginLockouts),
      db.select().from(deployments).orderBy(desc(deployments.createdAt)),
    ]);

  const snapshot = mapHydrationRows(
    {
      users: userRows,
      signingKeys: keyRows,
      projects: projectRows,
      nonces: nonceRows,
      revoked: revokedRows,
      audits: auditRows,
      lockouts: lockRows,
      deployments: deployRows,
    },
    now.getTime(),
    config.nonceTtlMs
  );
  memoryStore.applyHydration(snapshot);
}
