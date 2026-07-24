import { config } from "./config.js";
import { buildApp } from "./app.js";
import { buildDemoApp, demoListenPort } from "./demo-app.js";

const demoOnly =
  process.env.DEMO_ONLY === "1" || process.env.DEMO_ONLY === "true";

if (demoOnly) {
  const demoApp = await buildDemoApp();
  await demoApp.listen({ port: demoListenPort, host: "0.0.0.0" });
  console.log(`Demo API listening on :${demoListenPort}`);
} else {
  const app = await buildApp();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`API gateway (sovereign + demo-api) listening on :${config.port}`);
}
