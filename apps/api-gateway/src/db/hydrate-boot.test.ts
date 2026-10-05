import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = {
  users: [
    {
      id: "550e8400-e29b-41d4-a716-446655440010",
      email: "boot@test.local",
      passwordHash: "hash",
      authProvider: "dev",
      oidcSubject: null,
    },
  ],
  signingKeys: [],
  projects: [],
  nonces: [],
  revoked: [],
  audits: [],
  lockouts: [],
  deployments: [],
};

function query(result: unknown[]) {
  const done = Promise.resolve(result);
  return Object.assign(done, {
    where: () => Promise.resolve(result),
    orderBy: () => Object.assign(Promise.resolve(result), { limit: () => Promise.resolve(result) }),
  });
}

vi.mock("./client.js", async () => {
  const { getTableName } = await import("drizzle-orm");
  return {
    getDb: () => ({
      select: () => ({
        from: (table: Parameters<typeof getTableName>[0]) => {
          const name = getTableName(table);
          if (name === "users") return query(rows.users);
          if (name === "signing_keys") return query(rows.signingKeys);
          if (name === "projects") return query(rows.projects);
          if (name === "nonces") return query(rows.nonces);
          if (name === "revoked_tokens") return query(rows.revoked);
          if (name === "security_audit_logs") return query(rows.audits);
          if (name === "login_lockouts") return query(rows.lockouts);
          return query(rows.deployments);
        },
      }),
    }),
  };
});

import { hydrateMemoryFromPostgres } from "./hydrate.js";
import { memoryStore } from "./memory-store.js";

describe("hydrateMemoryFromPostgres", () => {
  beforeEach(() => {
    memoryStore.resetForTests();
  });

  it("loads rows from the database client into memory", async () => {
    await hydrateMemoryFromPostgres();
    expect(memoryStore.users.get("550e8400-e29b-41d4-a716-446655440010")?.email).toBe(
      "boot@test.local"
    );
    expect(memoryStore.users.get("550e8400-e29b-41d4-a716-446655440010")?.authProvider).toBe("dev");
  });
});
