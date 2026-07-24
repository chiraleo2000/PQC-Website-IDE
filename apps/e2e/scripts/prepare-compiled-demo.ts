import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiGatewayUrl } from "@pqc/shared";
import { compileAstToSite } from "../../api-gateway/src/compiler/ast-to-code.js";
import type { AstNode } from "@pqc/shared";

const root = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/compiled-blog");
const templatesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/shared/src/templates"
);
const apiBase = process.env.API_URL ?? process.env.COMPILED_API_URL ?? apiGatewayUrl();

function loadTemplate(name: "login" | "blog") {
  const raw = JSON.parse(
    readFileSync(join(templatesDir, `${name}-template.json`), "utf-8")
  ) as { root: AstNode };
  return raw.root;
}

mkdirSync(root, { recursive: true });

for (const [name, file] of [
  ["login", "login.html"],
  ["blog", "blog.html"],
] as const) {
  const astRoot = loadTemplate(name);
  const compiled = compileAstToSite(astRoot, name === "login" ? "Login" : "Blog", {
    demoMode: true,
    apiBase,
  });
  writeFileSync(join(root, file), compiled.html, "utf-8");
  if (name === "login") {
    writeFileSync(join(root, "styles.css"), compiled.css, "utf-8");
  }
  if (compiled.demoScript) {
    writeFileSync(join(root, "demo-app.js"), compiled.demoScript, "utf-8");
  }
}

try {
  copyFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../packages/demo-runtime/dist/demo-app.js"
    ),
    join(root, "demo-app.js")
  );
} catch {
  /* inline demo-app.js from compiler output */
}

console.log(`Compiled demo written to ${root} (API ${apiBase})`);
