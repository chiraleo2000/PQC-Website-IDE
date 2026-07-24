import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const e2eRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_PORT = process.env.PORT ?? "4000";

const result = spawnSync(
  "npx",
  ["playwright", "test", "--project=compiled"],
  {
    stdio: "inherit",
    shell: true,
    cwd: e2eRoot,
    env: {
      ...process.env,
      COMPILED_ONLY: "1",
      PORT: API_PORT,
      COMPILED_API_URL: `http://localhost:${API_PORT}`,
      API_URL: `http://localhost:${API_PORT}`,
      JWT_SECRET:
        process.env.JWT_SECRET ?? "e2e-jwt-secret-min-32-characters-long",
    },
  },
);
process.exit(result.status ?? 1);
