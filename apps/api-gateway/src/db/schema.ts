import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  authProvider: text("auth_provider").notNull().default("password"),
  oidcSubject: text("oidc_subject"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signingKeys = pgTable("signing_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  publicKeyB64: text("public_key_b64").notNull(),
  kemPublicKeyB64: text("kem_public_key_b64").notNull(),
  kemSecretKeyB64: text("kem_secret_key_b64").notNull(),
  x25519PublicKeyB64: text("x25519_public_key_b64").notNull().default(""),
  x25519SecretKeyB64: text("x25519_secret_key_b64").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  latestAst: jsonb("latest_ast"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectVersions = pgTable("project_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  encryptedBlob: jsonb("encrypted_blob").notNull(),
  astHash: text("ast_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nonces = pgTable(
  "nonces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    nonce: text("nonce").notNull(),
    usedAt: timestamp("used_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("nonces_user_nonce_idx").on(t.userId, t.nonce)]
);

export const securityAuditLogs = pgTable("security_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  event: text("event").notNull(),
  detail: jsonb("detail"),
  priority: text("priority").notNull().default("NORMAL"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** SHA-256 hex of a revoked session JWT. Raw tokens are not stored. */
export const revokedTokens = pgTable("revoked_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loginLockouts = pgTable("login_lockouts", {
  email: text("email").primaryKey(),
  failures: integer("failures").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  pagesProjectName: text("pages_project_name").notNull(),
  httpsUrl: text("https_url"),
  signedManifest: jsonb("signed_manifest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
