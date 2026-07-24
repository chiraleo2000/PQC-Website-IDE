import type { EncryptedAstPayload } from "@pqc/shared";
import {
  persistAudit,
  persistNonce,
  persistProject,
  persistSigningKey,
  persistVersion,
} from "./persistence.js";
import type {
  AuditEntry,
  AuditPriority,
  DemoPost,
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

export const memoryStore = {
  users,
  signingKeys,
  projects,
  nonces,
  revokedTokens,
  auditLogs,
  demoPosts,

  resetForTests() {
    users.clear();
    signingKeys.clear();
    projects.clear();
    nonces.clear();
    revokedTokens.clear();
    auditLogs.length = 0;
    demoPosts.length = 0;
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
      await persistProject(projectId, p.userId, p.name);
      await persistVersion(projectId, payload, ast);
    }
  },

  async upsertProject(record: ProjectRecord) {
    projects.set(record.id, record);
    await persistProject(record.id, record.userId, record.name);
  },
};
