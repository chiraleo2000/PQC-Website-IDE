import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { EncryptedAstPayload } from "@pqc/shared";
import { getDb, initDatabase, isPostgresEnabled } from "./client.js";
import {
  deployments,
  loginLockouts,
  nonces,
  projectVersions,
  projects,
  revokedTokens,
  securityAuditLogs,
  signingKeys,
  users,
} from "./schema.js";
import type { AuditEntry, DeploymentRecord, SigningKeyRecord, UserRecord } from "./types.js";

function astHash(ast: unknown): string {
  return createHash("sha256").update(JSON.stringify(ast)).digest("hex");
}

/** Run migrations (if DATABASE_URL set). Memory is a cache hydrated from Postgres on boot. */
export async function initPersistence(): Promise<void> {
  if (!isPostgresEnabled()) return;
  await initDatabase();
}

export async function persistUser(user: UserRecord): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      authProvider: user.authProvider ?? "password",
      oidcSubject: user.oidcSubject ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: user.email,
        passwordHash: user.passwordHash,
        authProvider: user.authProvider ?? "password",
        oidcSubject: user.oidcSubject ?? null,
      },
    });
}

export async function persistSigningKey(key: SigningKeyRecord): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(signingKeys)
    .values({
      id: key.id,
      userId: key.userId,
      publicKeyB64: key.publicKeyB64,
      kemPublicKeyB64: key.kemPublicKeyB64,
      kemSecretKeyB64: key.kemSecretKeyB64,
      x25519PublicKeyB64: key.x25519PublicKeyB64,
      x25519SecretKeyB64: key.x25519SecretKeyB64,
    })
    .onConflictDoUpdate({
      target: signingKeys.id,
      set: {
        publicKeyB64: key.publicKeyB64,
        kemPublicKeyB64: key.kemPublicKeyB64,
        kemSecretKeyB64: key.kemSecretKeyB64,
        x25519PublicKeyB64: key.x25519PublicKeyB64,
        x25519SecretKeyB64: key.x25519SecretKeyB64,
      },
    });
}

export async function persistNonce(userId: string, nonce: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.insert(nonces).values({ userId, nonce }).onConflictDoNothing();
}

export async function persistProject(
  projectId: string,
  userId: string,
  name: string,
  latestAst?: unknown
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(projects)
    .values({
      id: projectId,
      userId,
      name,
      latestAst: (latestAst ?? null) as Record<string, unknown> | null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: {
        name,
        updatedAt: new Date(),
        userId,
        ...(latestAst !== undefined
          ? { latestAst: latestAst as Record<string, unknown> }
          : {}),
      },
    });
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function persistRevokedToken(tokenHash: string, expiresAt: Date): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(revokedTokens)
    .values({ tokenHash, expiresAt })
    .onConflictDoNothing();
}

export async function persistLockout(
  email: string,
  failures: number,
  lockedUntil: string | null
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(loginLockouts)
    .values({
      email,
      failures,
      lockedUntil: lockedUntil ? new Date(lockedUntil) : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: loginLockouts.email,
      set: {
        failures,
        lockedUntil: lockedUntil ? new Date(lockedUntil) : null,
        updatedAt: new Date(),
      },
    });
}

export async function clearLockout(email: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.delete(loginLockouts).where(eq(loginLockouts.email, email));
}

export async function persistDeployment(record: DeploymentRecord): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.insert(deployments).values({
    projectId: record.projectId,
    pagesProjectName: record.pagesProjectName,
    httpsUrl: record.httpsUrl,
    signedManifest: record.manifest as Record<string, unknown>[],
    createdAt: new Date(record.createdAt),
  });
}

export async function persistVersion(
  projectId: string,
  payload: EncryptedAstPayload,
  ast: unknown
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.insert(projectVersions).values({
    projectId,
    encryptedBlob: payload as unknown as Record<string, unknown>,
    astHash: astHash(ast),
  });
}

export async function persistAudit(entry: AuditEntry): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.insert(securityAuditLogs).values({
    userId: entry.userId ?? null,
    event: entry.event,
    detail: (entry.detail as Record<string, unknown>) ?? null,
    priority: entry.priority,
    createdAt: new Date(entry.at),
  });
}

export async function loadUserPasswordHash(email: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0]?.passwordHash ?? null;
}
