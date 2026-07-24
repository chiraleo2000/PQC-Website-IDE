import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultRoot } from "@pqc/shared";
import { applyThemeToDocument, useEditorStore } from "./editorStore";

describe("editorStore history and theme", () => {
  beforeEach(() => {
    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
      past: [],
      future: [],
      projectName: "Untitled Site",
      dirty: false,
      theme: "light",
    });
    applyThemeToDocument("light");
  });

  it("undo restores previous AST after insert", () => {
    const rootId = useEditorStore.getState().ast.root.id;
    const before = useEditorStore.getState().ast.root.children.length;
    useEditorStore.getState().insertNodeAt(rootId, 0, "p");
    expect(useEditorStore.getState().ast.root.children).toHaveLength(before + 1);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().ast.root.children).toHaveLength(before);
  });

  it("redo reapplies undone change", () => {
    const rootId = useEditorStore.getState().ast.root.id;
    useEditorStore.getState().insertPresetAt(rootId, 0, "hero");
    const afterInsert = useEditorStore.getState().ast.root.children.length;
    useEditorStore.getState().undo();
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().ast.root.children).toHaveLength(afterInsert);
    expect(useEditorStore.getState().ast.root.children[0]?.type).toBe("section");
  });

  it("toggleTheme flips light/dark and sets data-theme", () => {
    useEditorStore.getState().setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    useEditorStore.getState().toggleTheme();
    expect(useEditorStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("newProject resets AST and marks dirty", () => {
    const prevId = useEditorStore.getState().projectId;
    useEditorStore.getState().newProject();
    const s = useEditorStore.getState();
    expect(s.projectId).not.toBe(prevId);
    expect(s.projectName).toBe("Untitled Site");
    expect(s.dirty).toBe(true);
    expect(s.uiMode).toBe("builder");
    expect(s.toasts.at(-1)?.message).toMatch(/New blank project/i);
  });

  it("loadDemoTemplate loads blog and persists index", () => {
    useEditorStore.getState().loadDemoTemplate("blog");
    const s = useEditorStore.getState();
    expect(s.projectName).toBe("Blog Demo");
    expect(s.dirty).toBe(true);
    expect(s.ast.root.children.length).toBeGreaterThan(0);
    expect(s.projectIndex.some((p) => p.id === s.projectId)).toBe(true);
  });

  it("pushToast and dismissToast manage toast list", () => {
    useEditorStore.setState({ toasts: [] });
    useEditorStore.getState().pushToast({ tone: "success", message: "wire-ok" });
    const id = useEditorStore.getState().toasts[0]?.id;
    expect(id).toBeTruthy();
    useEditorStore.getState().dismissToast(id!);
    expect(useEditorStore.getState().toasts).toHaveLength(0);
  });

  it("setUiMode and preview flags update shell state", () => {
    useEditorStore.getState().setUiMode("pqc");
    useEditorStore.getState().setPreviewOpen(true);
    useEditorStore.getState().setPreviewWidth("mobile");
    useEditorStore.getState().setSidebarCollapsed(true);
    const s = useEditorStore.getState();
    expect(s.uiMode).toBe("pqc");
    expect(s.previewOpen).toBe(true);
    expect(s.previewWidth).toBe("mobile");
    expect(s.sidebarCollapsed).toBe(true);
  });

  it("switchProject loads persisted snapshot or errors", () => {
    useEditorStore.getState().loadDemoTemplate("blog");
    const id = useEditorStore.getState().projectId;
    useEditorStore.getState().newProject();
    useEditorStore.getState().switchProject(id);
    expect(useEditorStore.getState().projectId).toBe(id);
    expect(useEditorStore.getState().projectName).toBe("Blog Demo");

    useEditorStore.setState({ toasts: [] });
    useEditorStore.getState().switchProject("missing-id");
    expect(useEditorStore.getState().toasts.at(-1)?.tone).toBe("error");
  });
});
