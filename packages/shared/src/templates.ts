import { astRootSchema, type AstRoot } from "./ast.js";
import loginJson from "./templates/login-template.json" with { type: "json" };
import blogJson from "./templates/blog-template.json" with { type: "json" };

export function loadTemplate(name: "login" | "blog"): AstRoot {
  const raw = name === "login" ? loginJson : blogJson;
  return astRootSchema.parse(raw);
}
