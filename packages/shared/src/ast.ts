import { z } from "zod";

export const astNodeSchema = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    type: z.string().min(1),
    props: z.record(z.unknown()).default({}),
    children: z.array(astNodeSchema).default([]),
  })
) as z.ZodType<AstNode>;

export type AstNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: AstNode[];
};

export const astRootSchema = z.object({
  version: z.literal(1),
  root: astNodeSchema as z.ZodType<AstNode>,
});

export type AstRoot = z.infer<typeof astRootSchema>;

export const PALETTE_COMPONENTS = [
  { type: "section", label: "Section", category: "layout" },
  { type: "div", label: "Container", category: "layout" },
  { type: "nav", label: "Navigation Bar", category: "layout" },
  { type: "header", label: "Header", category: "layout" },
  { type: "main", label: "Main", category: "layout" },
  { type: "footer", label: "Footer", category: "layout" },
  { type: "h1", label: "Heading 1", category: "content" },
  { type: "h2", label: "Heading 2", category: "content" },
  { type: "p", label: "Paragraph", category: "content" },
  { type: "button", label: "Button", category: "content" },
  { type: "img", label: "Image", category: "media" },
  { type: "a", label: "Link", category: "content" },
  { type: "form", label: "Form", category: "forms" },
  { type: "input", label: "Input", category: "forms" },
  { type: "label", label: "Label", category: "forms" },
  { type: "textarea", label: "Textarea", category: "forms" },
  { type: "blogFeed", label: "Blog Feed", category: "demo" },
  { type: "blogCard", label: "Blog Card", category: "demo" },
  { type: "newPostForm", label: "New Post Form", category: "demo" },
] as const;

export function createNode(
  type: string,
  props: Record<string, unknown> = {},
  children: AstNode[] = []
): AstNode {
  return {
    id: crypto.randomUUID(),
    type,
    props,
    children,
  };
}

export function createDefaultRoot(): AstRoot {
  return {
    version: 1,
    root: {
      id: crypto.randomUUID(),
      type: "section",
      props: { className: "min-h-screen bg-white text-zinc-900" },
      children: [
        createNode("header", { className: "p-6 border-b border-zinc-200" }),
        createNode("main", { className: "p-8 flex-1" }),
        createNode("footer", { className: "p-4 border-t border-zinc-200 text-zinc-500" }),
      ],
    },
  };
}

export function countNodes(node: AstNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

export function findNode(root: AstNode, id: string): AstNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(
  root: AstNode,
  childId: string
): { parent: AstNode; index: number } | null {
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === childId) {
      return { parent: root, index: i };
    }
    const found = findParent(root.children[i], childId);
    if (found) return found;
  }
  return null;
}

export function insertChild(parent: AstNode, index: number, node: AstNode): AstNode {
  const children = [...parent.children];
  const at = Math.min(Math.max(0, index), children.length);
  children.splice(at, 0, node);
  return { ...parent, children };
}

export function removeNode(root: AstNode, id: string): AstNode {
  if (root.id === id) return root;
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => removeNode(c, id)),
  };
}

export function updateNodeProps(root: AstNode, id: string, props: Record<string, unknown>): AstNode {
  if (root.id === id) {
    return { ...root, props: { ...root.props, ...props } };
  }
  return {
    ...root,
    children: root.children.map((c) => updateNodeProps(c, id, props)),
  };
}

export function cloneAst(root: AstNode): AstNode {
  return structuredClone(root);
}
