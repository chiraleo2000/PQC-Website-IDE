import { describe, expect, it } from "vitest";
import { mapHydrationRows } from "./hydrate.js";
import { memoryStore } from "./memory-store.js";

describe("mapHydrationRows", () => {
  it("keeps fresh rows and the latest deployment", () => {
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    const snapshot = mapHydrationRows(
      {
        users: [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            email: "a@b.c",
            passwordHash: "h",
            authProvider: "password",
            oidcSubject: null,
          },
        ],
        signingKeys: [],
        projects: [
          {
            id: "550e8400-e29b-41d4-a716-446655440002",
            userId: "550e8400-e29b-41d4-a716-446655440001",
            name: "Site",
            latestAst: { version: 2 },
          },
        ],
        nonces: [
          {
            userId: "550e8400-e29b-41d4-a716-446655440001",
            nonce: "fresh-nonce-value",
            usedAt: new Date(now - 1000),
          },
          {
            userId: "550e8400-e29b-41d4-a716-446655440001",
            nonce: "stale-nonce-value",
            usedAt: new Date(now - 999_999),
          },
        ],
        revoked: [
          { tokenHash: "live", expiresAt: new Date(now + 1000) },
          { tokenHash: "dead", expiresAt: new Date(now - 1000) },
        ],
        audits: [
          {
            userId: "550e8400-e29b-41d4-a716-446655440001",
            event: "LOGIN_FAILED",
            detail: null,
            priority: "HIGH",
            createdAt: new Date(now),
          },
        ],
        lockouts: [
          {
            email: "a@b.c",
            failures: 5,
            lockedUntil: new Date(Date.now() + 60_000),
          },
        ],
        deployments: [
          {
            projectId: "550e8400-e29b-41d4-a716-446655440002",
            pagesProjectName: "old",
            httpsUrl: null,
            signedManifest: [],
            createdAt: new Date(now - 5000),
          },
          {
            projectId: "550e8400-e29b-41d4-a716-446655440002",
            pagesProjectName: "new",
            httpsUrl: "https://new.pages.dev",
            signedManifest: [{ name: "login", method: "POST", fields: ["email", "password"] }],
            createdAt: new Date(now),
          },
        ],
      },
      now,
      300_000
    );

    expect(snapshot.nonceKeys).toEqual([
      "550e8400-e29b-41d4-a716-446655440001:fresh-nonce-value",
    ]);
    expect(snapshot.revokedHashes).toEqual(["live"]);
    expect(snapshot.projects[0]?.latestAst).toEqual({ version: 2 });
    expect(snapshot.deployments).toHaveLength(1);
    expect(snapshot.deployments[0]?.pagesProjectName).toBe("new");
    expect(snapshot.audits[0]?.priority).toBe("HIGH");

    memoryStore.applyHydration(snapshot);
    expect(memoryStore.projects.get("550e8400-e29b-41d4-a716-446655440002")?.name).toBe("Site");
    expect(memoryStore.isLoginLocked("a@b.c")).toBe(true);
    expect(memoryStore.isTokenRevoked("not-the-hash")).toBe(false);
    memoryStore.revokedTokens.add("live");
    expect(memoryStore.isTokenRevoked("ignored")).toBe(false);
    expect(memoryStore.revokedTokens.has("live")).toBe(true);
  });

  it("normalizes unknown providers and bad timestamps", () => {
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    const snapshot = mapHydrationRows(
      {
        users: [
          {
            id: "u",
            email: "a@b.c",
            passwordHash: "h",
            authProvider: "oidc",
            oidcSubject: "sub",
          },
          {
            id: "u2",
            email: "c@d.e",
            passwordHash: "h",
            authProvider: "mystery",
            oidcSubject: null,
          },
        ],
        signingKeys: [],
        projects: [{ id: "p", userId: "u", name: "Site", latestAst: null }],
        nonces: [{ userId: "u", nonce: "n", usedAt: "not-a-date" }],
        revoked: [],
        audits: [
          {
            userId: null,
            event: "NOTE",
            detail: null,
            priority: "LOW",
            createdAt: "not-a-date",
          },
        ],
        lockouts: [{ email: "a@b.c", failures: 0, lockedUntil: null }],
        deployments: [
          {
            projectId: "p",
            pagesProjectName: "site",
            httpsUrl: null,
            signedManifest: [],
            createdAt: "not-a-date",
          },
        ],
      },
      now,
      300_000
    );
    expect(snapshot.users[0]?.authProvider).toBe("oidc");
    expect(snapshot.users[1]?.authProvider).toBe("password");
    expect(snapshot.projects[0]?.latestAst).toBeUndefined();
    expect(snapshot.nonceKeys).toEqual([]);
    expect(snapshot.audits[0]?.priority).toBe("NORMAL");
    expect(snapshot.lockouts[0]?.lockedUntil).toBeNull();
    expect(snapshot.deployments[0]?.createdAt).toBe(new Date(now).toISOString());
  });
});
