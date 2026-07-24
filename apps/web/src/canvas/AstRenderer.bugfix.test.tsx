import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { AstRenderer } from "./AstRenderer";
import { createNode } from "@pqc/shared";
import type { AstNode } from "@pqc/shared";

/**
 * Bug Condition Exploration Tests for Inverted Canvas Rendering
 * 
 * **Validates: Requirements 1.3, 1.4, 1.5**
 * 
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Test failures confirm that the canvas renders children before parent.
 * 
 * Test 1.2: Canvas Rendering is Inverted
 * - Tests that NodeWithDrops renders parent before children
 * - EXPECTED OUTCOME: Test FAILS (confirms inverted rendering order)
 * - Counterexample: "DOM shows [child1, child2, dropZone, parent] instead of [parent, child1, child2, dropZone]"
 */

function renderWithDnd(ui: ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

/**
 * Helper to extract DOM element order for a given node
 */
function getDOMElementOrder(container: HTMLElement, parentNode: AstNode): string[] {
  const order: string[] = [];
  
  // Find all elements with data-node-id or data-testid attributes
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    null
  );
  
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    const nodeId = element.getAttribute("data-node-id");
    const testId = element.getAttribute("data-testid");
    
    if (nodeId) {
      order.push(`node:${nodeId}`);
    } else if (testId?.startsWith("drop-zone-")) {
      order.push(`dropzone:${testId}`);
    }
    
    node = walker.nextNode();
  }
  
  return order;
}

describe("Bug Condition Exploration: Inverted Canvas Rendering", () => {
  it("Test 1.2: Parent renders BEFORE children (EXPECTED TO FAIL)", () => {
    // Create test AST: Container with 2 text children
    const parent = createNode("div", { 
      className: "container",
      children: "Parent Container" 
    });
    const child1 = createNode("p", { children: "Child 1" });
    const child2 = createNode("p", { children: "Child 2" });
    parent.children = [child1, child2];
    
    const root = createNode("section");
    root.children = [parent];
    
    const { container } = renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );
    
    // Extract DOM order
    const order = getDOMElementOrder(container, parent);
    
    // Find indices
    const parentIndex = order.findIndex(id => id === `node:${parent.id}`);
    const child1Index = order.findIndex(id => id === `node:${child1.id}`);
    const child2Index = order.findIndex(id => id === `node:${child2.id}`);
    
    // ASSERTION: Parent should appear BEFORE its children in DOM
    // This will FAIL on unfixed code because parent renders last
    expect(parentIndex).toBeGreaterThan(-1);
    expect(child1Index).toBeGreaterThan(-1);
    expect(child2Index).toBeGreaterThan(-1);
    
    // Parent must come before child1
    expect(parentIndex).toBeLessThan(child1Index);
    // Parent must come before child2
    expect(parentIndex).toBeLessThan(child2Index);
    // child1 should come before child2
    expect(child1Index).toBeLessThan(child2Index);
  });

  it("Test 1.2 (Alternative): Parent element contains children elements (EXPECTED TO FAIL)", () => {
    // Create hierarchical AST
    const parent = createNode("div", { className: "parent-container" });
    const child1 = createNode("p", { children: "First child" });
    const child2 = createNode("span", { children: "Second child" });
    parent.children = [child1, child2];
    
    const root = createNode("section");
    root.children = [parent];
    
    const { container } = renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );
    
    // Find parent and children elements by their data-node-id
    const parentElement = container.querySelector(`[data-node-id="${parent.id}"]`);
    const child1Element = container.querySelector(`[data-node-id="${child1.id}"]`);
    const child2Element = container.querySelector(`[data-node-id="${child2.id}"]`);
    
    expect(parentElement).toBeInTheDocument();
    expect(child1Element).toBeInTheDocument();
    expect(child2Element).toBeInTheDocument();
    
    // ASSERTION: Parent should contain its children in the DOM hierarchy
    // This will FAIL on unfixed code due to inverted rendering
    expect(parentElement).toContainElement(child1Element as HTMLElement);
    expect(parentElement).toContainElement(child2Element as HTMLElement);
  });

  it("Test 1.2 (Counterexample Documentation): DOM structure is inverted", () => {
    // Create simple parent-child structure
    const parent = createNode("div", { className: "wrapper" });
    const child = createNode("p", { children: "Content" });
    parent.children = [child];
    
    const root = createNode("section");
    root.children = [parent];
    
    const { container } = renderWithDnd(
      <AstRenderer root={root} selectedId={null} onSelect={vi.fn()} />
    );
    
    const order = getDOMElementOrder(container, parent);
    
    // Document the counterexample:
    // "DOM shows [child1, child2, dropZone, parent] instead of [parent, child1, child2, dropZone]"
    const parentIndex = order.findIndex(id => id === `node:${parent.id}`);
    const childIndex = order.findIndex(id => id === `node:${child.id}`);
    
    // Log the actual order for documentation
    if (parentIndex > childIndex) {
      console.log(
        `BUG CONFIRMED: Parent appears AFTER child in DOM order. ` +
        `Order: ${order.join(", ")}`
      );
    }
    
    // This assertion confirms the expected behavior
    // On unfixed code: parentIndex > childIndex (BUG CONFIRMED)
    // On fixed code: parentIndex < childIndex (BUG FIXED)
    expect(parentIndex).toBeLessThan(childIndex);
  });
});
