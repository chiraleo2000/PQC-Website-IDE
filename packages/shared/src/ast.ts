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

export const sitePageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  root: astNodeSchema as z.ZodType<AstNode>,
});

export type SitePage = z.infer<typeof sitePageSchema>;

const astRootV1Schema = z.object({
  version: z.literal(1),
  root: astNodeSchema as z.ZodType<AstNode>,
});

const astRootV2Schema = z.object({
  version: z.literal(2),
  pages: z.array(sitePageSchema).min(1),
  activePageId: z.string().uuid(),
  /** Mirrored active-page root for editor / sync helpers. */
  root: astNodeSchema as z.ZodType<AstNode>,
});

export const astRootSchema = z.union([astRootV1Schema, astRootV2Schema]);

export type AstRootV1 = z.infer<typeof astRootV1Schema>;
export type AstRootV2 = z.infer<typeof astRootV2Schema>;
export type AstRoot = AstRootV1 | AstRootV2;

function syncRootMirror(pages: SitePage[], activePageId: string): AstRootV2 {
  const active = pages.find((p) => p.id === activePageId) ?? pages[0]!;
  return {
    version: 2,
    pages: pages.map((p) => (p.id === active.id ? { ...p, root: active.root } : p)),
    activePageId: active.id,
    root: active.root,
  };
}

/** Normalize any stored project blob to multi-page v2 (with mirrored `root`). */
export function ensureAstV2(ast: AstRoot): AstRootV2 {
  if (ast.version === 2) {
    return syncRootMirror(ast.pages, ast.activePageId);
  }
  const pageId = crypto.randomUUID();
  return syncRootMirror(
    [{ id: pageId, slug: "index", title: "Home", root: ast.root }],
    pageId
  );
}

export function getActivePage(ast: AstRoot): SitePage {
  const v2 = ensureAstV2(ast);
  return v2.pages.find((p) => p.id === v2.activePageId) ?? v2.pages[0]!;
}

export function getActiveRoot(ast: AstRoot): AstNode {
  return ensureAstV2(ast).root;
}

export function withActiveRoot(ast: AstRoot, root: AstNode): AstRootV2 {
  const v2 = ensureAstV2(ast);
  const pages = v2.pages.map((p) => (p.id === v2.activePageId ? { ...p, root } : p));
  return syncRootMirror(pages, v2.activePageId);
}

export function setActivePage(ast: AstRoot, pageId: string): AstRootV2 {
  const v2 = ensureAstV2(ast);
  if (!v2.pages.some((p) => p.id === pageId)) return v2;
  return syncRootMirror(v2.pages, pageId);
}

export function addSitePage(
  ast: AstRoot,
  page: Omit<SitePage, "id"> & { id?: string }
): AstRootV2 {
  const v2 = ensureAstV2(ast);
  const id = page.id ?? crypto.randomUUID();
  const next: SitePage = {
    id,
    slug: page.slug,
    title: page.title,
    root: page.root,
  };
  return syncRootMirror([...v2.pages, next], id);
}

export function removeSitePage(ast: AstRoot, pageId: string): AstRootV2 {
  const v2 = ensureAstV2(ast);
  if (v2.pages.length <= 1) return v2;
  const pages = v2.pages.filter((p) => p.id !== pageId);
  const activePageId = v2.activePageId === pageId ? pages[0]!.id : v2.activePageId;
  return syncRootMirror(pages, activePageId);
}

export function renameSitePage(
  ast: AstRoot,
  pageId: string,
  patch: Partial<Pick<SitePage, "slug" | "title">>
): AstRootV2 {
  const v2 = ensureAstV2(ast);
  const pages = v2.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
  return syncRootMirror(pages, v2.activePageId);
}

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

export function createDefaultRoot(): AstRootV2 {
  const pageId = crypto.randomUUID();
  const root: AstNode = {
    id: crypto.randomUUID(),
    type: "section",
    props: { className: "min-h-screen bg-white text-zinc-900" },
    children: [
      createNode("header", { className: "p-6 border-b border-zinc-200" }),
      createNode("main", { className: "p-8 flex-1" }),
      createNode("footer", { className: "p-4 border-t border-zinc-200 text-zinc-500" }),
    ],
  };
  return syncRootMirror(
    [{ id: pageId, slug: "index", title: "Home", root }],
    pageId
  );
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
