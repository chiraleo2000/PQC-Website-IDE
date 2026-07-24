import { apiGatewayUrl, PORTS } from "@pqc/shared";

/**
 * Pre-flight before Playwright workers. Primary stack boot is via playwright.config webServer.
 */
export default async function globalSetup() {
  const apiUrl = process.env.API_URL ?? apiGatewayUrl("127.0.0.1");

  try {
    const res = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`[e2e] API health check failed: ${res.status}`);
    } else {
      const body = (await res.json()) as { enforcePqcOnly?: boolean };
      console.info(`[e2e] API ready enforcePqcOnly=${body.enforcePqcOnly}`);
    }
  } catch {
    console.warn("[e2e] API not reachable during global setup (webServer will start it)");
  }

  if (process.env.E2E_POSTGRES === "1" || process.env.CI) {
    const pgPort = PORTS.postgres;
    try {
      const net = await import("node:net");
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host: "127.0.0.1", port: pgPort }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
        socket.setTimeout(3_000, () => {
          socket.destroy();
          reject(new Error("timeout"));
        });
      });
      console.info(`[e2e] PostgreSQL port ${pgPort} reachable`);
    } catch {
      console.warn(
        `[e2e] PostgreSQL :${pgPort} not reachable (optional; gateway may use in-memory store)`
      );
    }
  }
}
