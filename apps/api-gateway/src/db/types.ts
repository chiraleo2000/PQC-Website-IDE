export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  authProvider?: "password" | "oidc" | "dev";
  oidcSubject?: string | null;
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

export type AuditPriority = "HIGH" | "NORMAL";

export interface AuditEntry {
  userId?: string;
  event: string;
  detail?: unknown;
  priority: AuditPriority;
  at: string;
}

export interface DemoPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
