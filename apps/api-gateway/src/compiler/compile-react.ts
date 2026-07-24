import type { AstNode } from "@pqc/shared";
import {
  assertAllowedNode,
  resolveTag,
  sanitizeClassName,
  sanitizeJsxText,
  sanitizeUrl,
  SEMANTIC_TYPES,
  VOID_HTML_TAGS,
} from "./sanitize.js";

function textContent(node: AstNode): string {
  if (typeof node.props.children === "string") return String(node.props.children);
  if (typeof node.props.text === "string") return String(node.props.text);
  return "";
}

function jsxAttr(name: string, value: string): string {
  if (name === "class") return `className="${sanitizeClassName(value)}"`;
  if (name === "for") return `htmlFor="${sanitizeJsxText(value)}"`;
  if (name === "href" || name === "src") {
    return `${name}="${sanitizeJsxText(sanitizeUrl(value, name))}"`;
  }
  return `${name}="${sanitizeJsxText(value)}"`;
}

function compileProps(node: AstNode, indent: string): string {
  const lines: string[] = [`${indent}  data-node-id="${node.id}"`];
  const sem = SEMANTIC_TYPES[node.type];
  if (sem?.dataDemo) lines.push(`${indent}  data-demo="${sem.dataDemo}"`);
  if (node.props.dataDemo) {
    lines.push(`${indent}  data-demo="${sanitizeJsxText(String(node.props.dataDemo))}"`);
  }
  if (node.props.className) {
    lines.push(`${indent}  ${jsxAttr("class", String(node.props.className))}`);
  }
  for (const [key, value] of Object.entries(node.props)) {
    if (["children", "text", "customCss", "dataDemo", "page", "className"].includes(key)) continue;
    if (!["href", "src", "alt", "type", "id", "name", "placeholder", "for"].includes(key)) continue;
    lines.push(`${indent}  ${jsxAttr(key, String(value))}`);
  }
  return lines.join("\n");
}

export function compileNodeReact(node: AstNode, indent = "      "): string {
  assertAllowedNode(node);
  const tag = resolveTag(node);
  const text = sanitizeJsxText(textContent(node));
  const childBlocks = node.children.map((c) => compileNodeReact(c, `${indent}  `)).join("\n");

  if (node.type === "img") {
    const src = sanitizeUrl(String(node.props.src ?? "https://placehold.co/400x200"), "src");
    return `<img\n${compileProps(node, indent)}\n${indent}  src="${sanitizeJsxText(src)}"\n${indent}  alt="${sanitizeJsxText(String(node.props.alt ?? "Image"))}"\n${indent}/>`;
  }

  if (node.type === "input") {
    return `<input\n${compileProps(node, indent)}\n${indent}  type="${sanitizeJsxText(String(node.props.type ?? "text"))}"\n${indent}/>`;
  }

  if (VOID_HTML_TAGS.has(tag) && tag !== "img" && tag !== "input") {
    return `<${tag}\n${compileProps(node, indent)}\n${indent}/>`;
  }

  const inner =
    childBlocks.length > 0
      ? `\n${childBlocks}\n${indent}`
      : text
        ? sanitizeJsxText(text)
        : "";

  return `<${tag}\n${compileProps(node, indent)}\n${indent}>${inner}</${tag}>`;
}

export function compileReactPage(ast: AstNode, scope: string): string {
  const tree = compileNodeReact(ast, "      ");
  return `/** Auto-generated from verified AST — do not edit by hand */\nexport default function Page() {\n  return (\n    <div data-scope="${scope}">\n${tree}\n    </div>\n  );\n}\n`;
}
