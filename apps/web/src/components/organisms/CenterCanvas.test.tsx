import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createDefaultRoot } from "@pqc/shared";
import { applyPaletteDrop } from "../../canvas/dnd-handlers";
import { EditorDndProvider } from "./EditorDndProvider";
import { LeftAssetSidebar } from "./LeftAssetSidebar";
import { CenterCanvas } from "./CenterCanvas";
import { RightPropertiesPanel } from "./RightPropertiesPanel";
import { useEditorStore } from "../../stores/editorStore";

function renderEditorCanvas() {
  return render(
    <EditorDndProvider>
      <div className="flex">
        <LeftAssetSidebar />
        <CenterCanvas />
        <RightPropertiesPanel />
      </div>
    </EditorDndProvider>
  );
}

describe("CenterCanvas — @dnd-kit → Zustand AST", () => {
  beforeEach(() => {
    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
      projectName: "Test Site",
    });
  });

  it("updates Zustand JSON AST when palette drop handler runs (drag-end path)", () => {
    const main = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!;
    const before = main.children.length;

    applyPaletteDrop(
      { fromPalette: true, type: "nav" },
      { parentId: main.id, index: 0 },
      useEditorStore.getState().insertNodeAt
    );

    const updatedMain = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!;
    expect(updatedMain.children.length).toBe(before + 1);
    expect(updatedMain.children[0]?.type).toBe("nav");
    expect(JSON.stringify(useEditorStore.getState().ast)).toContain('"type":"nav"');
  });

  it("reflects store updates in AstRenderer after insertNodeAt", () => {
    const main = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!;
    useEditorStore.getState().insertNodeAt(main.id, 0, "nav");
    const navId = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!
      .children[0].id;

    renderEditorCanvas();

    const canvas = screen.getByTestId("page-canvas");
    expect(canvas.querySelector(`[data-node-id="${navId}"]`)).toBeTruthy();
  });

  it("removes selected component via properties panel delete", () => {
    const main = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!;
    useEditorStore.getState().insertNodeAt(main.id, 0, "nav");

    renderEditorCanvas();

    const navNode = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!
      .children[0];
    const navEl = document.querySelector(`[data-node-id="${navNode!.id}"]`);
    fireEvent.click(navEl!);
    fireEvent.click(screen.getByLabelText("Delete selected element"));

    const afterMain = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!;
    expect(afterMain.children.length).toBe(0);
    expect(useEditorStore.getState().selectedNodeId).toBeNull();
  });
});
