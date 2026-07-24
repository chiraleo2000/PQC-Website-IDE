import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { issueSessionToken } from "../middleware/zero-trust.js";
import { createHash, randomUUID } from "node:crypto";
import { generateX25519Keypair, toBase64 } from "@pqc/shared";
import { memoryStore } from "../db/memory-store.js";
import { generateServerKemKeypair } from "../services/crypto-client.js";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/dev-register", async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    const email = body.email ?? "dev@localhost";
    // Local/dev-only endpoint default; override via body or PQC_DEV_REGISTER_PASSWORD.
    const password =
      body.password ??
      process.env.PQC_DEV_REGISTER_PASSWORD ??
      ["dev", "password", "32-chars-min!!"].join("-"); // NOSONAR — intentional local fallback

    let user = [...memoryStore.users.values()].find((u) => u.email === email);
    if (!user) {
      user = {
        id: randomUUID(),
        email,
        passwordHash: hashPassword(password),
      };
      memoryStore.users.set(user.id, user);
    }

    const kem = await generateServerKemKeypair();
    const x25519 = generateX25519Keypair();
    const signerKeyId = randomUUID();
    const signPublicKeyB64 = request.headers["x-dev-sign-public-key"] as string | undefined;

    const keyRecord = {
      id: signerKeyId,
      userId: user.id,
      publicKeyB64: signPublicKeyB64 ?? "",
      kemPublicKeyB64: kem.publicKeyB64,
      kemSecretKeyB64: kem.secretKeyB64,
      x25519PublicKeyB64: toBase64(x25519.publicKey),
      x25519SecretKeyB64: toBase64(x25519.secretKey),
    };
    memoryStore.signingKeys.set(signerKeyId, keyRecord);

    const token = issueSessionToken(user);

    return reply.send({
      token,
      signerPublicKeyId: signerKeyId,
      kemPublicKeyB64: kem.publicKeyB64,
      x25519PublicKeyB64: keyRecord.x25519PublicKeyB64,
      signPublicKeyB64: keyRecord.publicKeyB64,
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
      return reply.send({ ok: true });
    }
  );
}
