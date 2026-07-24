import { apiGatewayUrl } from "@pqc/shared";

const API = process.env.API_URL ?? apiGatewayUrl();

export async function registerDevUser() {
  const reg = await fetch(`${API}/api/auth/dev-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `e2e-${Date.now()}@test.local`, password: "test-password" }),
  });
  if (!reg.ok) throw new Error(`dev-register failed: ${reg.status}`);
  const { token, userId } = (await reg.json()) as { token: string; userId: string };

  const keys = await fetch(`${API}/api/auth/register-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  if (!keys.ok) throw new Error(`register-keys failed: ${keys.status}`);
  const keyBody = (await keys.json()) as { signerPublicKeyId: string };

  return { token, userId, signerKeyId: keyBody.signerPublicKeyId };
}
