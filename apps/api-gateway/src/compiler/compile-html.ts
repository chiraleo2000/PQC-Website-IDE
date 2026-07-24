import type { AstNode } from "@pqc/shared";
import {
  ALLOWED_ATTRS,
  ALLOWED_CSS_PROPS,
  assertAllowedNode,
  assertSafeContent,
  CompilerSecurityError,
  resolveTag,
  sanitizeClassName,
  sanitizeText,
  sanitizeUrl,
  SEMANTIC_TYPES,
  VOID_HTML_TAGS,
} from "./sanitize.js";

/** Coerce AST prop values for HTML/CSS output without `[object Object]` stringification. */
function asPropString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function compileCssScoped(ast: AstNode, scope: string): string {
  const rules: string[] = [];
  function walk(node: AstNode) {
    const customCss = asPropString(node.props.customCss);
    if (customCss) {
      for (const line of customCss.split(";")) {
        const [prop, val] = line.split(":").map((s) => s.trim());
        if (!prop || !val) continue;
        if (!ALLOWED_CSS_PROPS.has(prop)) {
          throw new CompilerSecurityError(`CSS property not allowed: ${prop}`);
        }
        assertSafeContent(val, "CSS value");
        rules.push(`[data-scope="${scope}"] [data-node-id="${node.id}"] { ${prop}: ${val.replace(/[<>]/g, "")}; }`);
      }
    }
    node.children.forEach(walk);
  }
  walk(ast);
  return rules.join("\n");
}

function compileAttrs(node: AstNode): string[] {
  const attrs: string[] = [`data-node-id="${node.id}"`];
  const sem = SEMANTIC_TYPES[node.type];
  if (sem?.dataDemo) attrs.push(`data-demo="${sem.dataDemo}"`);

  for (const [key, value] of Object.entries(node.props)) {
    if (["children", "text", "customCss", "dataDemo", "page", "seoTitle", "seoDescription", "canonicalUrl"].includes(key)) continue;
    if (/^on/i.test(key)) {
      throw new CompilerSecurityError(`Event attribute not allowed: ${key}`);
    }
    if (!ALLOWED_ATTRS.has(key)) continue;

    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    const str = String(value);
    assertSafeContent(str, key);

    if (key === "class") {
      attrs.push(`class="${sanitizeClassName(str)}"`);
    } else if (key === "href" || key === "src") {
      attrs.push(`${key}="${sanitizeText(sanitizeUrl(str, key))}"`);
    } else {
      attrs.push(`${key}="${sanitizeText(str)}"`);
    }
  }

  const dataDemo = asPropString(node.props.dataDemo);
  if (dataDemo) {
    attrs.push(`data-demo="${sanitizeText(dataDemo)}"`);
  }

  return attrs;
}

export function compileNodeHtml(node: AstNode): string {
  assertAllowedNode(node);
  const tag = resolveTag(node);
  const attrs = compileAttrs(node);
  const text = sanitizeText(asPropString(node.props.children, asPropString(node.props.text)));
  const childrenHtml = node.children.map(compileNodeHtml).join("\n");

  if (VOID_HTML_TAGS.has(tag)) {
    return `<${tag} ${attrs.join(" ")} />`;
  }

  return `<${tag} ${attrs.join(" ")}>${text}${childrenHtml}</${tag}>`;
}

function firstHeadingText(node: AstNode): string {
  if ((node.type === "h1" || node.type === "h2") && typeof node.props.children === "string") {
    return node.props.children;
  }
  for (const child of node.children) {
    const found = firstHeadingText(child);
    if (found) return found;
  }
  return "";
}

export function compileHtmlDocument(
  ast: AstNode,
  projectName: string,
  scope: string,
  options: {
    demoMode?: boolean;
    apiBase?: string;
    siteOrigin?: string;
  }
): { html: string; css: string } {
  const css = compileCssScoped(ast, scope);
  const body = compileNodeHtml(ast);
  const apiBase = (options.apiBase ?? "http://localhost:4000").replace(/['"<>]/g, "");
  const scriptTag = options.demoMode
    ? `\n  <script>window.__PQC_API__='${apiBase}'</script>\n  <script type="module" src="demo-app.js"></script>`
    : "";

  const headingFallback = firstHeadingText(ast);
  const title = sanitizeText(
    asPropString(ast.props.seoTitle, projectName || headingFallback || "Site")
  );
  const description = sanitizeText(
    asPropString(
      ast.props.seoDescription,
      "Built with PQC Website IDE — hybrid post-quantum protected."
    )
  );
  const origin = (options.siteOrigin ?? "https://example.com").replace(/\/$/, "");
  const canonical = sanitizeText(asPropString(ast.props.canonicalUrl, `${origin}/index.html`));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body data-scope="${scope}" data-demo-page="${sanitizeText(asPropString(ast.props.page, "index"))}">
${body}${scriptTag}
</body>
</html>`;

  return { html, css };
}
