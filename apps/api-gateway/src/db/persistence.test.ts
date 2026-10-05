import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "./client.js";
import {
  clearLockout,
  hashSessionToken,
  initPersistence,
  loadUserPasswordHash,
  persistAudit,
  persistDeployment,
  persistLockout,
  persistNonce,
  persistProject,
  persistRevokedToken,
  persistSigningKey,
  persistUser,
  persistVersion,
} from "./persistence.js";

function queryResult() {
  const done = Promise.resolve();
  return Object.assign(done, {
    onConflictDoUpdate: () => Promise.resolve(),
    onConflictDoNothing: () => Promise.resolve(),
  });
}

function fakeDb(rows: Array<{ passwordHash?: string }> = [{ passwordHash: "argon" }]) {
  return {
    insert: () => ({ values: () => queryResult() }),
    delete: () => ({ where: () => Promise.resolve() }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(rows),
        }),
      }),
    }),
  };
}

const user = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  email: "a@b.c",
  passwordHash: "hash",
  authProvider: "password" as const,
  oidcSubject: null,
};

describe("persistence writes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips migrations when Postgres is off", async () => {
    const init = vi.spyOn(client, "initDatabase").mockResolvedValue(null);
    await initPersistence();
    expect(init).not.toHaveBeenCalled();
  });

  it("runs migrations when Postgres is on", async () => {
    vi.spyOn(client, "isPostgresEnabled").mockReturnValue(true);
    const init = vi.spyOn(client, "initDatabase").mockResolvedValue(null);
    await initPersistence();
    expect(init).toHaveBeenCalled();
  });

  it("writes users, keys, projects, nonces, lockouts, and versions", async () => {
    vi.spyOn(client, "getDb").mockReturnValue(fakeDb() as never);
    await persistUser(user);
    await persistUser({ ...user, authProvider: undefined, oidcSubject: undefined });
    await persistSigningKey({
      id: "550e8400-e29b-41d4-a716-446655440002",
      userId: user.id,
      publicKeyB64: "pk",
      kemPublicKeyB64: "kem",
      kemSecretKeyB64: "sec",
      x25519PublicKeyB64: "x",
      x25519SecretKeyB64: "xs",
    });
    await persistNonce(user.id, "nonce-value-16chars");
    await persistProject(user.id, user.id, "Site", { version: 2 });
    await persistProject(user.id, user.id, "Site");
    await persistRevokedToken(hashSessionToken("token"), new Date());
    await persistLockout("a@b.c", 5, new Date(Date.now() + 1000).toISOString());
    await persistLockout("a@b.c", 1, null);
    await clearLockout("a@b.c");
    await persistDeployment({
      projectId: user.id,
      pagesProjectName: "site",
      httpsUrl: null,
      manifest: [],
      createdAt: new Date().toISOString(),
    });
    await persistVersion(
      user.id,
      {
        version: 2,
        projectId: user.id,
        nonce: "0123456789abcdef",
        timestamp: new Date().toISOString(),
        kem: { algorithm: "ML-KEM-768", ciphertext: "eQ==" },
        classicalKem: { algorithm: "X25519", ephemeralPublicKey: "eDI1NTE5" },
        cipher: { algorithm: "AES-256-GCM", iv: "aXY=", ciphertext: "YQ==", tag: "dGFn" },
        plaintextMeta: { astNodeCount: 1, schemaVersion: 1 },
        signature: { algorithm: "ML-DSA-65", value: "c2ln" },
        signerPublicKeyId: user.id,
      },
      { version: 2 }
    );
    await persistAudit({ event: "LOGIN_FAILED", priority: "HIGH", at: new Date().toISOString() });
    await persistAudit({
      userId: user.id,
      event: "LOGIN_FAILED",
      detail: { email: "a@b.c" },
      priority: "NORMAL",
      at: new Date().toISOString(),
    });
    expect(await loadUserPasswordHash("a@b.c")).toBe("argon");
    vi.spyOn(client, "getDb").mockReturnValue(fakeDb([]) as never);
    expect(await loadUserPasswordHash("missing@b.c")).toBeNull();
  });

  it("no-ops when the database client is absent", async () => {
    vi.spyOn(client, "getDb").mockReturnValue(null);
    await persistUser(user);
    expect(await loadUserPasswordHash("a@b.c")).toBeNull();
  });
});
