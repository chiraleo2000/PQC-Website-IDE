import { describe, it, expect } from "vitest";
import {
  astNodeSchema,
  astRootSchema,
  cloneAst,
  countNodes,
  createDefaultRoot,
  insertChild,
  createNode,
  findNode,
  findParent,
  removeNode,
  updateNodeProps,
} from "./ast.js";
import { loadTemplate } from "./templates.js";

describe("astRootSchema", () => {
  it("validates default root", () => {
    const root = createDefaultRoot();
    expect(astRootSchema.safeParse(root).success).toBe(true);
  });

  it("rejects missing version", () => {
    const { version: _, ...noVersion } = createDefaultRoot();
    expect(astRootSchema.safeParse(noVersion).success).toBe(false);
  });

  it("rejects root node without uuid id", () => {
    const root = createDefaultRoot();
    root.root.id = "not-a-uuid";
    root.pages[0]!.root.id = "not-a-uuid";
    expect(astRootSchema.safeParse(root).success).toBe(false);
  });

  it("rejects empty node type", () => {
    const root = createDefaultRoot();
    root.root.type = "";
    root.pages[0]!.root.type = "";
    expect(astRootSchema.safeParse(root).success).toBe(false);
  });

  it("rejects deeply nested invalid child", () => {
    const root = createDefaultRoot();
    root.root.children[0].children = [
      { id: "bad-id", type: "p", props: {}, children: [] },
    ];
    root.pages[0]!.root = root.root;
    expect(astRootSchema.safeParse(root).success).toBe(false);
  });

  it("accepts multi-page v2 roots", () => {
    const root = createDefaultRoot();
    expect(root.version).toBe(2);
    expect(root.pages.length).toBeGreaterThan(0);
    expect(astRootSchema.safeParse(root).success).toBe(true);
  });

  it("strips unknown top-level keys (Zod default)", () => {
    const result = astRootSchema.safeParse({ ...createDefaultRoot(), extra: true });
    expect(result.success).toBe(true);
    if (result.success) expect("extra" in result.data).toBe(false);
  });
});

describe("astNodeSchema", () => {
  it("accepts palette component types", () => {
    const node = createNode("blogFeed", { apiPath: "/posts" });
    expect(astNodeSchema.safeParse(node).success).toBe(true);
  });

  it("defaults children to empty array", () => {
    const parsed = astNodeSchema.parse({
      id: crypto.randomUUID(),
      type: "div",
      props: {},
    });
    expect(parsed.children).toEqual([]);
  });
});

describe("ast tree helpers", () => {
  it("counts nodes", () => {
    const root = createDefaultRoot();
    expect(countNodes(root.root)).toBeGreaterThan(3);
  });

  it("inserts child at index", () => {
    const parent = createNode("div");
    const child = createNode("p");
    const updated = insertChild(parent, 0, child);
    expect(updated.children).toHaveLength(1);
    expect(updated.children[0].type).toBe("p");
  });

  it("finds node by id", () => {
    const root = createDefaultRoot();
    const found = findNode(root.root, root.root.children[0].id);
    expect(found?.type).toBe("header");
  });

  it("removes nested node", () => {
    const root = createDefaultRoot();
    const childId = root.root.children[0].id;
    const next = removeNode(root.root, childId);
    expect(findNode(next, childId)).toBeNull();
  });

  it("updates props immutably", () => {
    const root = createDefaultRoot();
    const id = root.root.id;
    const next = updateNodeProps(root.root, id, { className: "updated" });
    expect(findNode(next, id)?.props.className).toBe("updated");
    expect(root.root.props.className).not.toBe("updated");
  });

  it("findParent locates nested child index", () => {
    const root = createDefaultRoot();
    const child = root.root.children[0];
    const found = findParent(root.root, child.id);
    expect(found?.parent.id).toBe(root.root.id);
    expect(found?.index).toBe(0);
  });

  it("findParent returns null for unknown id", () => {
    const root = createDefaultRoot();
    expect(findParent(root.root, "missing-id")).toBeNull();
  });

  it("updateNodeProps updates nested children", () => {
    const root = createDefaultRoot();
    const childId = root.root.children[0].id;
    const next = updateNodeProps(root.root, childId, { className: "nested" });
    expect(findNode(next, childId)?.props.className).toBe("nested");
  });

  it("cloneAst deep-copies the tree", () => {
    const root = createDefaultRoot();
    const cloned = cloneAst(root.root);
    expect(cloned).toEqual(root.root);
    expect(cloned).not.toBe(root.root);
    cloned.children[0].props.className = "mutated";
    expect(root.root.children[0].props.className).not.toBe("mutated");
  });
});

describe("templates", () => {
  it("loads login template with valid AST", () => {
    const t = loadTemplate("login");
    expect(astRootSchema.safeParse(t).success).toBe(true);
    expect(t.root.props.page).toBe("login");
  });

  it("loads blog template with valid AST", () => {
    const t = loadTemplate("blog");
    expect(astRootSchema.safeParse(t).success).toBe(true);
    expect(t.root.props.page).toBe("blog");
  });
});
