import type { AstNode } from "@pqc/shared";

export const ALLOWED_TAGS = new Set([
  "section",
  "div",
  "nav",
  "header",
  "main",
  "footer",
  "h1",
  "h2",
  "h3",
  "p",
  "button",
  "img",
  "a",
  "span",
  "ul",
  "ol",
  "li",
  "form",
  "input",
  "label",
  "textarea",
]);

export const SEMANTIC_TYPES: Record<string, { tag: string; dataDemo?: string }> = {
  blogFeed: { tag: "div", dataDemo: "blog-feed" },
  blogCard: { tag: "div", dataDemo: "blog-card" },
  newPostForm: { tag: "div", dataDemo: "new-post" },
};

export const ALLOWED_ATTRS = new Set([
  "class",
  "href",
  "src",
  "alt",
  "type",
  "id",
  "name",
  "placeholder",
  "data-demo",
  "for",
  "page",
]);

export const ALLOWED_CSS_PROPS = new Set([
  "color",
  "background",
  "padding",
  "margin",
  "font-size",
  "font-weight",
  "display",
  "flex",
  "gap",
  "width",
  "height",
  "border",
  "border-radius",
]);

export const VOID_HTML_TAGS = new Set(["img", "input", "br", "hr"]);

const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
  /expression\s*\(/i,
  /url\s*\(\s*['"]?\s*javascript/i,
  /@import/i,
];

export class CompilerSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompilerSecurityError";
  }
}

export function assertSafeContent(text: string, context: string): void {
  for (const p of DANGEROUS_PATTERNS) {
    if (p.test(text)) {
      throw new CompilerSecurityError(`Dangerous content in ${context}`);
    }
  }
}

/** HTML entity escape for text nodes and attribute values. */
export function sanitizeText(text: string): string {
  assertSafeContent(text, "text");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** JSX string literal escape (no HTML entities). */
export function sanitizeJsxText(text: string): string {
  assertSafeContent(text, "jsx text");
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

export function sanitizeClassName(className: string): string {
  assertSafeContent(className, "className");
  const parts = className.split(/\s+/).filter(Boolean);
  for (const part of parts) {
    if (/[{};<>()]/.test(part) || /^expression/i.test(part)) {
      throw new CompilerSecurityError("Invalid CSS class");
    }
  }
  return parts.join(" ");
}

export function sanitizeUrl(url: string, attr: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return "#";
  assertSafeContent(trimmed, attr);
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/") && !trimmed.startsWith("#")) {
    throw new CompilerSecurityError(`URL not allowed for ${attr}`);
  }
  return trimmed;
}

export function resolveTag(node: AstNode): string {
  const sem = SEMANTIC_TYPES[node.type];
  if (sem) return sem.tag;
  return node.type;
}

export function assertAllowedNode(node: AstNode): void {
  const tag = resolveTag(node);
  if (!ALLOWED_TAGS.has(tag) && !SEMANTIC_TYPES[node.type]) {
    throw new CompilerSecurityError(`Tag not allowed: ${node.type}`);
  }
}
