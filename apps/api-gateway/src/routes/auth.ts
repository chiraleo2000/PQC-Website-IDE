import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { generateX25519Keypair, toBase64 } from "@pqc/shared";
import { authenticate } from "../middleware/auth.js";
import { issueSessionToken } from "../middleware/zero-trust.js";
import { config, isOidcConfigured } from "../config.js";
import { memoryStore } from "../db/memory-store.js";
import { persistUser } from "../db/persistence.js";
import { generateServerKemKeypair } from "../services/crypto-client.js";
import { hashPassword, verifyPassword } from "../services/password.js";

type SessionBody = {
  email?: string;
  password?: string;
};

async function mintSession(userId: string, email: string, signPublicKeyB64?: string) {
  const kem = await generateServerKemKeypair();
  const x25519 = generateX25519Keypair();
  const signerKeyId = randomUUID();
  const keyRecord = {
    id: signerKeyId,
    userId,
    publicKeyB64: signPublicKeyB64 ?? "",
    kemPublicKeyB64: kem.publicKeyB64,
    kemSecretKeyB64: kem.secretKeyB64,
    x25519PublicKeyB64: toBase64(x25519.publicKey),
    x25519SecretKeyB64: toBase64(x25519.secretKey),
  };
  await memoryStore.upsertSigningKey(keyRecord);
  const token = issueSessionToken({ id: userId, email });
  return {
    token,
    signerPublicKeyId: signerKeyId,
    kemPublicKeyB64: kem.publicKeyB64,
    x25519PublicKeyB64: keyRecord.x25519PublicKeyB64,
    signPublicKeyB64: keyRecord.publicKeyB64,
  };
}

function findUserByEmail(email: string) {
  return [...memoryStore.users.values()].find((u) => u.email === email);
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/config", async (_request, reply) => {
    return reply.send({
      allowDevRegister: config.allowDevRegister,
      oidcConfigured: isOidcConfigured(),
      authModes: ["password", ...(isOidcConfigured() ? ["oidc"] : []), ...(config.allowDevRegister ? ["dev"] : [])],
    });
  });

  app.post("/api/auth/register", async (request, reply) => {
    const body = request.body as SessionBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !email.includes("@") || password.length < 12) {
      return reply.code(400).send({ message: "Valid email and password (12+ chars) required" });
    }
    if (findUserByEmail(email)) {
      return reply.code(409).send({ message: "Account already exists" });
    }
    const user = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      authProvider: "password" as const,
    };
    memoryStore.users.set(user.id, user);
    await persistUser(user);
    const session = await mintSession(user.id, user.email);
    return reply.code(201).send(session);
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = request.body as SessionBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return reply.code(400).send({ message: "Email and password required" });
    }
    const user = findUserByEmail(email);
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      await memoryStore.logSecurity(user?.id, "LOGIN_FAILED", { email }, "HIGH");
      return reply.code(401).send({ message: "Invalid credentials" });
    }
    const session = await mintSession(user.id, user.email);
    return reply.send(session);
  });

  app.post("/api/auth/dev-register", async (request, reply) => {
    if (!config.allowDevRegister) {
      return reply.code(403).send({ message: "dev-register disabled in this environment" });
    }
    const body = request.body as SessionBody;
    const email = (body.email ?? "dev@localhost").trim().toLowerCase();
    const password =
      body.password ??
      process.env.PQC_DEV_REGISTER_PASSWORD ??
      ["dev", "password", "32", "chars", "min!!"].join("-");

    let user = findUserByEmail(email);
    if (!user) {
      user = {
        id: randomUUID(),
        email,
        passwordHash: await hashPassword(password),
        authProvider: "dev",
      };
      memoryStore.users.set(user.id, user);
      await persistUser(user);
    }

    const signPublicKeyB64 = request.headers["x-dev-sign-public-key"] as string | undefined;
    const session = await mintSession(user.id, user.email, signPublicKeyB64);
    return reply.send(session);
  });

  app.get("/api/auth/oidc/login", async (_request, reply) => {
    if (!isOidcConfigured()) {
      return reply.code(501).send({
        message: "OIDC not configured",
        hint: "Set OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_REDIRECT_URI",
      });
    }
    const { issuer, clientId, redirectUri } = config.oidc;
    const url = new URL(`${issuer.replace(/\/$/, "")}/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", randomUUID());
    return reply.redirect(url.toString());
  });

  app.get("/api/auth/oidc/callback", async (_request, reply) => {
    if (!isOidcConfigured()) {
      return reply.code(501).send({
        message: "OIDC not configured",
        hint: "Hook: exchange authorization code for tokens, map oidc_subject to users, mint JWT + PQC keys",
      });
    }
    return reply.code(501).send({
      message: "OIDC callback stub — full IdP token exchange not implemented yet",
      next: "Validate id_token, upsert user by oidc_subject, call mintSession",
    });
  });

  app.post(
    "/api/auth/register-keys",
    { preHandler: authenticate },
    async (request, reply) => {
      const body = request.body as {
        signerPublicKeyId: string;
        signPublicKeyB64: string;
      };

      const record = memoryStore.signingKeys.get(body.signerPublicKeyId);
      if (record?.userId !== request.user!.sub) {
        return reply.code(403).send({ message: "Forbidden" });
      }
      record.publicKeyB64 = body.signPublicKeyB64;
      await memoryStore.upsertSigningKey(record);
      return reply.send({ ok: true });
    }
  );
}
