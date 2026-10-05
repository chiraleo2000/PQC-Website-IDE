import type { EncryptedAstPayload } from "@pqc/shared";
import { config } from "../config.js";
import {
  hashSessionToken,
  persistAudit,
  persistDeployment,
  persistLockout,
  clearLockout,
  persistNonce,
  persistProject,
  persistRevokedToken,
  persistSigningKey,
  persistVersion,
} from "./persistence.js";
import type {
  AuditEntry,
  AuditPriority,
  DemoPost,
  DeploymentRecord,
  LoginLockoutRecord,
  ProjectRecord,
  SigningKeyRecord,
  UserRecord,
} from "./types.js";

export type {
  AuditEntry,
  AuditPriority,
  DemoPost,
  ProjectRecord,
  SigningKeyRecord,
  UserRecord,
} from "./types.js";

const users = new Map<string, UserRecord>();
const signingKeys = new Map<string, SigningKeyRecord>();
const projects = new Map<string, ProjectRecord>();
const nonces = new Set<string>();
const revokedTokens = new Set<string>();
const auditLogs: AuditEntry[] = [];
const demoPosts: DemoPost[] = [];
const loginLockouts = new Map<string, LoginLockoutRecord>();
const deployments = new Map<string, DeploymentRecord>();

export const memoryStore = {
  users,
  signingKeys,
  projects,
  nonces,
  revokedTokens,
  auditLogs,
  demoPosts,
  loginLockouts,
  deployments,

  resetForTests() {
    users.clear();
    signingKeys.clear();
    projects.clear();
    nonces.clear();
    revokedTokens.clear();
    auditLogs.length = 0;
    demoPosts.length = 0;
    loginLockouts.clear();
    deployments.clear();
  },

  isTokenRevoked(token: string) {
    return revokedTokens.has(token) || revokedTokens.has(hashSessionToken(token));
  },

  revokeToken(token: string, expiresAt: Date) {
    revokedTokens.add(token);
    const tokenHash = hashSessionToken(token);
    revokedTokens.add(tokenHash);
    void persistRevokedToken(tokenHash, expiresAt);
  },

  isLoginLocked(email: string) {
    const row = loginLockouts.get(email);
    if (!row?.lockedUntil) return false;
    if (Date.parse(row.lockedUntil) <= Date.now()) {
      loginLockouts.set(email, { failures: 0, lockedUntil: null });
      return false;
    }
    return true;
  },

  async noteLoginFailure(email: string): Promise<{ locked: boolean }> {
    if (this.isLoginLocked(email)) return { locked: true };
    const current = loginLockouts.get(email) ?? { failures: 0, lockedUntil: null };
    const failures = current.failures + 1;
    const locked = failures >= config.loginMaxFailures;
    const lockedUntil = locked ? new Date(Date.now() + config.loginLockoutMs).toISOString() : null;
    loginLockouts.set(email, { failures, lockedUntil });
    await persistLockout(email, failures, lockedUntil);
    return { locked };
  },

  async clearLoginFailures(email: string) {
    loginLockouts.delete(email);
    await clearLockout(email);
  },

  latestDeployment(projectId: string) {
    return deployments.get(projectId);
  },

  async saveDeployment(record: DeploymentRecord) {
    deployments.set(record.projectId, record);
    await persistDeployment(record);
  },

  applyHydration(snapshot: {
    users: UserRecord[];
    signingKeys: SigningKeyRecord[];
    projects: ProjectRecord[];
    nonceKeys: string[];
    revokedHashes: string[];
    audits: AuditEntry[];
    lockouts: Array<{ email: string } & LoginLockoutRecord>;
    deployments: DeploymentRecord[];
  }) {
    for (const user of snapshot.users) users.set(user.id, user);
    for (const key of snapshot.signingKeys) signingKeys.set(key.id, key);
    for (const project of snapshot.projects) projects.set(project.id, project);
    for (const nonceKey of snapshot.nonceKeys) nonces.add(nonceKey);
    for (const hash of snapshot.revokedHashes) revokedTokens.add(hash);
    auditLogs.push(...snapshot.audits);
    for (const lock of snapshot.lockouts) {
      loginLockouts.set(lock.email, { failures: lock.failures, lockedUntil: lock.lockedUntil });
    }
    for (const deployment of snapshot.deployments) {
      deployments.set(deployment.projectId, deployment);
    }
  },

  nonceKey(userId: string, nonce: string) {
    return `${userId}:${nonce}`;
  },

  async addNonce(userId: string, nonce: string) {
    nonces.add(this.nonceKey(userId, nonce));
    await persistNonce(userId, nonce);
  },

  async upsertSigningKey(record: SigningKeyRecord) {
    signingKeys.set(record.id, record);
    await persistSigningKey(record);
  },

  async logSecurity(
    userId: string | undefined,
    event: string,
    detail?: unknown,
    priority: AuditPriority = "NORMAL"
  ) {
    const entry: AuditEntry = {
      userId,
      event,
      detail,
      priority,
      at: new Date().toISOString(),
    };
    auditLogs.push(entry);
    const prefix = priority === "HIGH" ? "[SECURITY:HIGH]" : "[SECURITY]";
    console.error(prefix, event, userId ?? "anonymous", detail);
    await persistAudit(entry);
  },

  listAuditLogs(userId: string, limit = 20): AuditEntry[] {
    return auditLogs
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .reverse();
  },

  async saveVersion(projectId: string, payload: EncryptedAstPayload, ast: unknown) {
    const p = projects.get(projectId);
    if (p) {
      p.latestAst = ast;
      await persistProject(projectId, p.userId, p.name, ast);
      await persistVersion(projectId, payload, ast);
    }
  },

  async upsertProject(record: ProjectRecord) {
    projects.set(record.id, record);
    await persistProject(record.id, record.userId, record.name, record.latestAst);
  },
};
