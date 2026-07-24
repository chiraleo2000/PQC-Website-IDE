import type { AstNode } from "@pqc/shared";
import type { JSX, ReactElement, ReactNode } from "react";
import { asPropString } from "./propString";

const VOID_ELEMENTS = new Set(["img", "br", "hr", "input"]);
const SEMANTIC_AS_DIV: Record<string, string> = {
  blogFeed: "blog-feed",
  blogCard: "blog-card",
  newPostForm: "new-post",
};

function textContent(node: AstNode): string {
  if (typeof node.props.children === "string") return node.props.children;
  if (typeof node.props.text === "string") return node.props.text;
  return "";
}

function selectionClassName(interactive: boolean, isSelected: boolean): string {
  if (!interactive) return "";
  if (isSelected) return "ring-2 ring-accent ring-offset-2 ring-offset-[var(--paper)]";
  return "hover:ring-1 hover:ring-zinc-300";
}

function demoAttrs(node: AstNode): Record<string, string> {
  if (typeof node.props.dataDemo === "string") {
    return { "data-demo": node.props.dataDemo };
  }
  const mapped = SEMANTIC_AS_DIV[node.type];
  if (mapped) return { "data-demo": mapped };
  return {};
}

export type RenderAstOpts = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
  /** When false, omit nested children (builder walks them with drop zones). Default true. */
  renderChildren?: boolean;
  /** When false, disable selection chrome (preview mode). Default true. */
  interactive?: boolean;
  /** Optional replacement for children when renderChildren is false. */
  childSlot?: ReactNode;
};

type CommonProps = Record<string, unknown>;

function interactiveHandlers(
  node: AstNode,
  opts: RenderAstOpts,
  interactive: boolean,
  isSelected: boolean
): CommonProps {
  if (!interactive) {
    return {
      tabIndex: undefined,
      role: undefined,
      "aria-label": undefined,
      "aria-selected": undefined,
      onClick: undefined,
      onKeyDown: undefined,
    };
  }
  return {
    tabIndex: 0,
    role: "group" as const,
    "aria-label": `${node.type} element`,
    "aria-selected": isSelected,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      opts.onSelect(node.id);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        opts.onSelect(node.id);
      }
    },
  };
}

function buildCommonProps(node: AstNode, opts: RenderAstOpts): CommonProps {
  const interactive = opts.interactive !== false;
  const isSelected = interactive && opts.selectedId === node.id;
  const className = [
    asPropString(node.props.className),
    interactive ? "outline-none transition" : "",
    selectionClassName(interactive, isSelected),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    "data-node-id": node.id,
    className,
    ...interactiveHandlers(node, opts, interactive, isSelected),
  };
}

function resolveChildren(node: AstNode, opts: RenderAstOpts): ReactNode {
  if (opts.renderChildren === false) return opts.childSlot;
  return node.children.map((c) => renderAstNode(c, { ...opts, depth: opts.depth + 1 }));
}

function renderHeading(
  Tag: "h1" | "h2",
  fallback: string,
  node: AstNode,
  common: CommonProps,
  childElements: ReactNode,
  text: string
): ReactElement {
  return (
    <Tag key={node.id} {...common}>
      {text || fallback}
      {childElements}
    </Tag>
  );
}

function renderTypedNode(
  node: AstNode,
  common: CommonProps,
  childElements: ReactNode,
  text: string,
  interactive: boolean,
  onSelect: (id: string) => void
): ReactElement | null {
  switch (node.type) {
    case "img":
      return (
        <img
          key={node.id}
          {...common}
          src={asPropString(node.props.src, "https://placehold.co/400x200/18181b/71717a?text=Image")}
          alt={asPropString(node.props.alt, "Image")}
        />
      );
    case "a":
      return (
        <a
          key={node.id}
          {...common}
          href={asPropString(node.props.href, "#")}
          onClick={
            interactive
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(node.id);
                }
              : undefined
          }
        >
          {text || "Link"}
          {childElements}
        </a>
      );
    case "button":
      return (
        <button key={node.id} {...common} type="button">
          {text || "Button"}
          {childElements}
        </button>
      );
    case "input":
      return (
        <input
          key={node.id}
          {...common}
          type={asPropString(node.props.type, "text")}
          name={asPropString(node.props.name)}
          placeholder={asPropString(node.props.placeholder)}
          readOnly
        />
      );
    case "textarea":
      return (
        <textarea
          key={node.id}
          {...common}
          name={asPropString(node.props.name)}
          placeholder={asPropString(node.props.placeholder)}
          readOnly
          defaultValue={text}
        />
      );
    case "label":
      return (
        <label key={node.id} {...common} htmlFor={asPropString(node.props.for)}>
          {text || "Label"}
        </label>
      );
    case "h1":
      return renderHeading("h1", "Heading 1", node, common, childElements, text);
    case "h2":
      return renderHeading("h2", "Heading 2", node, common, childElements, text);
    case "p":
      return (
        <p key={node.id} {...common}>
          {text || "Paragraph text"}
          {childElements}
        </p>
      );
    default:
      return null;
  }
}

export function renderAstNode(node: AstNode, opts: RenderAstOpts): ReactElement {
  const interactive = opts.interactive !== false;
  const common = buildCommonProps(node, opts);
  const childElements = resolveChildren(node, opts);
  const text = textContent(node);
  const typed = renderTypedNode(node, common, childElements, text, interactive, opts.onSelect);
  return typed ?? renderGenericTag(node, common, childElements);
}

function renderGenericTag(
  node: AstNode,
  common: CommonProps,
  childElements: ReactNode
): ReactElement {
  const tag = SEMANTIC_AS_DIV[node.type] ? "div" : node.type;
  const Tag = tag as keyof JSX.IntrinsicElements;
  const merged = { ...common, ...demoAttrs(node) };
  if (VOID_ELEMENTS.has(node.type)) {
    return <Tag key={node.id} {...merged} />;
  }
  return (
    <Tag key={node.id} {...merged}>
      {childElements}
    </Tag>
  );
}
