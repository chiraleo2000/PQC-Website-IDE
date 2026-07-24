import { astRootSchema, ensureAstV2, type AstRoot, type AstRootV2 } from "./ast.js";
import loginJson from "./templates/login-template.json" with { type: "json" };
import blogJson from "./templates/blog-template.json" with { type: "json" };
import landingJson from "./templates/landing-template.json" with { type: "json" };
import portfolioJson from "./templates/portfolio-template.json" with { type: "json" };
import docsJson from "./templates/docs-template.json" with { type: "json" };

export type TemplateName = "login" | "blog" | "landing" | "portfolio" | "docs";

const TEMPLATES: Record<TemplateName, unknown> = {
  login: loginJson,
  blog: blogJson,
  landing: landingJson,
  portfolio: portfolioJson,
  docs: docsJson,
};

export function loadTemplate(name: TemplateName): AstRootV2 {
  const parsed = astRootSchema.parse(TEMPLATES[name]) as AstRoot;
  return ensureAstV2(parsed);
}
