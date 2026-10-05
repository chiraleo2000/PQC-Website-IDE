import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";
import { createDefaultRoot } from "@pqc/shared";

describe("editorStore", () => {
  beforeEach(() => {
    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
    });
  });

  it("inserts node at index", () => {
    const root = useEditorStore.getState().ast.root;
    const parentId = root.id;
    useEditorStore.getState().insertNodeAt(parentId, 0, "header");
    const child = useEditorStore.getState().ast.root.children[0];
    expect(child?.type).toBe("header");
  });

  it("inserts Navigation Bar at index 0 inside main", () => {
    const root = useEditorStore.getState().ast.root;
    const main = root.children.find((c) => c.type === "main");
    expect(main).toBeDefined();
    useEditorStore.getState().insertNodeAt(main!.id, 0, "nav");
    const updatedMain = useEditorStore
      .getState()
      .ast.root.children.find((c) => c.type === "main");
    expect(updatedMain!.children[0]?.type).toBe("nav");
    expect(updatedMain!.children.length).toBe(1);
  });

  it("updates selected props", () => {
    const root = useEditorStore.getState().ast.root;
    const target = root.children[0];
    useEditorStore.getState().selectNode(target.id);
    useEditorStore.getState().updateSelectedProps({ className: "test-class" });
    const updated = useEditorStore.getState().ast.root.children[0];
    expect(updated.props.className).toBe("test-class");
  });

  it("moves node to another parent", () => {
    const root = useEditorStore.getState().ast.root;
    const main = root.children.find((c) => c.type === "main")!;
    const header = root.children.find((c) => c.type === "header")!;
    useEditorStore.getState().insertNodeAt(main.id, 0, "nav");
    const nav = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!
      .children[0];
    useEditorStore.getState().moveNode(nav.id, header.id, 0);
    const updatedHeader = useEditorStore
      .getState()
      .ast.root.children.find((c) => c.type === "header")!;
    expect(updatedHeader.children[0]?.type).toBe("nav");
    expect(
      useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!.children
    ).toHaveLength(0);
  });

  it("records the live URL and clears it for a new project", () => {
    useEditorStore.getState().markPublished("2026-01-01T00:00:00.000Z", "https://blog.pages.dev");
    expect(useEditorStore.getState().publishedUrl).toBe("https://blog.pages.dev");
    expect(useEditorStore.getState().cryptoStatus).toBe("saved");
    useEditorStore.getState().newProject();
    expect(useEditorStore.getState().publishedUrl).toBeNull();
    expect(useEditorStore.getState().projectName).toBe("Untitled Site");
  });

  it("removes selected node", () => {
    const root = useEditorStore.getState().ast.root;
    const target = root.children[0];
    useEditorStore.getState().selectNode(target.id);
    useEditorStore.getState().removeSelected();
    expect(useEditorStore.getState().ast.root.children.length).toBe(
      root.children.length - 1
    );
  });
});
