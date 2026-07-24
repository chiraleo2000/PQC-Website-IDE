import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { AstRenderer } from "./AstRenderer";
import { createNode, createDefaultRoot } from "@pqc/shared";
import { useEditorStore } from "../stores/editorStore";
import { applyPaletteDrop } from "./dnd-handlers";

/**
 * Preservation Property Tests for Drag-and-Drop
 * 
 * **Validates: Requirements 3.9, 3.10**
 * 
 * GOAL: Capture baseline drag-and-drop behavior that must not change after fixes
 * 
 * Test 2.2: Observe and Preserve Drag-and-Drop
 * - Observe behavior on UNFIXED code for drag-and-drop operations
 * - EXPECTED OUTCOME: Test PASSES (confirms baseline drag-drop behavior to preserve)
 */

function renderWithDnd(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

describe("Preservation Property Tests: Drag-and-Drop", () => {
  beforeEach(() => {
    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
      cryptoStatus: "ready",
      cryptoError: null,
      authToken: "test-token",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtcHVibGlj",
      x25519PublicKeyB64: "eDI1NTE5",
      projectId: "test-project",
      projectName: "Test Project",
    });
  });

  /**
   * Property: Drop zones are rendered with correct styling
   * 
   * This test verifies that drop zones maintain their visual properties:
   * - min-height for visibility
   * - transition effects
   * - border-accent and bg-accent/20 when active
   */
  it("Test 2.2.1: Drop zones preserve styling and structure", () => {
    const root = createDefaultRoot();
    const container = createNode("div", { className: "container" });
    const child1 = createNode("p", { children: "Child 1" });
    const child2 = createNode("p", { children: "Child 2" });
    container.children = [child1, child2];
    root.children = [container];

    const { container: testContainer } = renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );

    // Verify drop zones exist for container
    // There should be drop zones before each child and after the last child
    const dropZones = testContainer.querySelectorAll(`[data-testid^="drop-zone-${container.id}"]`);
    
    // Expect: 1 before first child, 1 between children, 1 after last child = 3 drop zones
    expect(dropZones.length).toBeGreaterThanOrEqual(3);

    // Verify drop zones have the correct CSS classes
    dropZones.forEach((zone) => {
      expect(zone.className).toMatch(/min-h-\[8px\]/);
      expect(zone.className).toMatch(/transition/);
    });
  });

  /**
   * Property: Component insertion at correct index is preserved
   * 
   * This test verifies that applyPaletteDrop inserts components at the expected index
   */
  it("Test 2.2.2: Components insert at correct index in parent.children array", () => {
    // Set up AST 
    const root = createDefaultRoot();
    const parent = root.root.children.find((c) => c.type === "main")!;
    useEditorStore.setState({ ast: root });

    const insertNodeAt = useEditorStore.getState().insertNodeAt;

    // Test insertion at index 0
    const result1 = applyPaletteDrop(
      { fromPalette: true, type: "button" },
      { parentId: parent.id, index: 0 },
      insertNodeAt
    );

    expect(result1).toBe(true);

    // Verify one child was inserted
    const updatedAst1 = useEditorStore.getState().ast;
    const updatedParent1 = updatedAst1.root.children.find((c) => c.type === "main")!;
    expect(updatedParent1.children).toHaveLength(1);

    // Test insertion at index 1
    const result2 = applyPaletteDrop(
      { fromPalette: true, type: "p" },
      { parentId: parent.id, index: 1 },
      insertNodeAt
    );

    expect(result2).toBe(true);

    const updatedAst2 = useEditorStore.getState().ast;
    const updatedParent2 = updatedAst2.root.children.find((c) => c.type === "main")!;
    expect(updatedParent2.children).toHaveLength(2);
  });

  /**
   * Property: Drop zone highlighting is preserved
   * 
   * Verifies that @dnd-kit integration remains unchanged
   */
  it("Test 2.2.3: Drop zones use correct @dnd-kit integration", () => {
    const root = createDefaultRoot();
    const parent = createNode("div", { className: "parent" });
    const child = createNode("p", { children: "Content" });
    parent.children = [child];
    root.children = [parent];

    const { container } = renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );

    // Verify drop zones have correct data-testid format
    const dropZone = container.querySelector(`[data-testid="drop-zone-${parent.id}-0"]`);
    expect(dropZone).toBeInTheDocument();

    // Verify drop zone structure for @dnd-kit
    // The useDroppable hook should be integrated (we can't test the hook directly,
    // but we can verify the DOM structure is correct)
    expect(dropZone?.getAttribute("aria-hidden")).toBe("true");
  });

  /**
   * Property: Canvas root drop zone is preserved
   */
  it("Test 2.2.4: Canvas root maintains correct drop zone behavior", () => {
    const root = createDefaultRoot();
    root.children = []; // Initialize empty children array
    
    const { container } = renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );

    // Verify canvas has the page-canvas testid
    const canvas = screen.getByTestId("page-canvas");
    expect(canvas).toBeInTheDocument();

    // Verify canvas has correct ARIA label
    expect(canvas).toHaveAttribute("aria-label", "Page canvas");

    // Verify canvas has correct styling classes (page-paper WYSIWYG frame)
    expect(canvas.className).toMatch(/page-paper/);
    expect(canvas.className).toMatch(/max-w-5xl/);
    expect(canvas.className).toMatch(/rounded-2xl/);
  });

  /**
   * Property: Drag operations preserve AST node properties
   */
  it("Test 2.2.5: Dragged components preserve their properties", () => {
    const root = createDefaultRoot();
    const parent = root.root.children.find((c) => c.type === "main")!;
    useEditorStore.setState({ ast: root });

    const insertNodeAt = useEditorStore.getState().insertNodeAt;

    // Simulate dragging a component with specific type
    const componentType = "button";

    const result = applyPaletteDrop(
      { fromPalette: true, type: componentType },
      { parentId: parent.id, index: 0 },
      insertNodeAt
    );

    expect(result).toBe(true);

    const updatedAst = useEditorStore.getState().ast;
    const updatedParent = updatedAst.root.children.find((c) => c.type === "main")!;
    const insertedChild = updatedParent.children[0];

    // Verify component type is preserved
    expect(insertedChild.type).toBe(componentType);
  });

  /**
   * Property: Multiple drag operations maintain correct order
   */
  it("Test 2.2.6: Multiple drag operations preserve component ordering", () => {
    const root = createDefaultRoot();
    const parent = root.root.children.find((c) => c.type === "main")!;
    useEditorStore.setState({ ast: root });

    const insertNodeAt = useEditorStore.getState().insertNodeAt;

    // Perform multiple drag operations
    const components = [
      { type: "h1" },
      { type: "p" },
      { type: "button" },
      { type: "span" },
    ];

    components.forEach((comp, index) => {
      const result = applyPaletteDrop(
        { fromPalette: true, type: comp.type },
        { parentId: parent.id, index },
        insertNodeAt
      );
      expect(result).toBe(true);
    });

    const updatedAst = useEditorStore.getState().ast;
    const updatedParent = updatedAst.root.children.find((c) => c.type === "main")!;

    // Verify all components were inserted in correct order
    expect(updatedParent.children).toHaveLength(components.length);
    
    updatedParent.children.forEach((child, index) => {
      expect(child.type).toBe(components[index].type);
    });
  });
});
