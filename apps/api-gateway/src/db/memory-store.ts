import type { EncryptedAstPayload } from "@pqc/shared";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export interface SigningKeyRecord {
  id: string;
  userId: string;
  publicKeyB64: string;
  kemPublicKeyB64: string;
  kemSecretKeyB64: string;
  x25519PublicKeyB64: string;
  x25519SecretKeyB64: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  latestAst?: unknown;
}

const users = new Map<string, UserRecord>();
const signingKeys = new Map<string, SigningKeyRecord>();
const projects = new Map<string, ProjectRecord>();
const nonces = new Set<string>();
const revokedTokens = new Set<string>();
const auditLogs: Array<{
  userId?: string;
  event: string;
  detail?: unknown;
  priority: "HIGH" | "NORMAL";
  at: string;
}> = [];

export interface DemoPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

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

  async logSecurity(
    userId: string | undefined,
    event: string,
    detail?: unknown,
    priority: "HIGH" | "NORMAL" = "NORMAL"
  ) {
    const entry = {
      userId,
      event,
      detail,
      priority,
      at: new Date().toISOString(),
    };
    auditLogs.push(entry);
    const prefix = priority === "HIGH" ? "[SECURITY:HIGH]" : "[SECURITY]";
    console.error(prefix, event, userId ?? "anonymous", detail);
  },

  saveVersion(projectId: string, _payload: EncryptedAstPayload, ast: unknown) {
    const p = projects.get(projectId);
    if (p) p.latestAst = ast;
  },
};
