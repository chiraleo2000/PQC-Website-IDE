import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "./Header";
import { useEditorStore } from "../../stores/editorStore";
import { createDefaultRoot, loadTemplate } from "@pqc/shared";

/**
 * Preservation Property Tests for Template Loading
 * 
 * **Validates: Requirements 3.4, 3.5**
 * 
 * GOAL: Capture baseline template loading behavior that must not change after fixes
 * 
 * Test 2.3: Observe and Preserve Template Loading
 * - Observe behavior on UNFIXED code for template loading
 * - EXPECTED OUTCOME: Test PASSES (confirms baseline template behavior to preserve)
 */

vi.mock("../../api/projects", () => ({
  syncProject: vi.fn().mockResolvedValue(undefined),
  exportProjectZip: vi.fn().mockResolvedValue(undefined),
  publishProject: vi.fn().mockResolvedValue({ ok: true, publishedAt: new Date().toISOString() }),
}));

describe("Preservation Property Tests: Template Loading", () => {
  beforeEach(() => {
    useEditorStore.setState({
      ast: createDefaultRoot(),
      projectId: "test-project-id",
      authToken: "valid-token",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: "a2VtcHVibGlj",
      x25519PublicKeyB64: "eDI1NTE5",
      cryptoStatus: "ready",
      cryptoError: null,
      selectedNodeId: null,
      projectName: "Test Project",
    });
  });

  /**
   * Property: Login template loads with correct AST structure
   */
  it("Test 2.3.1: Login template preserves correct AST structure", () => {
    render(<Header />);

    // Load Login template
    const templateSelect = screen.getByLabelText("Load demo template");
    fireEvent.change(templateSelect, { target: { value: "login" } });

    // Verify AST structure matches Login template
    const ast = useEditorStore.getState().ast;
    
    // Login template should have a specific structure - verify key characteristics
    expect(ast.root.children).toBeDefined();
    expect(ast.root.children.length).toBeGreaterThan(0);
    
    // Verify the AST is properly formed
    expect(ast).toHaveProperty("version");
    expect(ast).toHaveProperty("root");
    expect(ast.root).toHaveProperty("id");
    expect(ast.root).toHaveProperty("type");
    expect(ast.root).toHaveProperty("props");
    expect(ast.root).toHaveProperty("children");

    // Verify project name was updated
    expect(useEditorStore.getState().projectName).toBe("Login Demo");

    // Get reference template for comparison
    const referenceTemplate = loadTemplate("login");
    
    // Verify structure matches reference
    expect(ast.root.children).toHaveLength(referenceTemplate.root.children.length);
    
    // Verify each child node has correct type and structure
    ast.root.children.forEach((child, index) => {
      const referenceChild = referenceTemplate.root.children[index];
      expect(child.type).toBe(referenceChild.type);
      expect(child.children).toHaveLength(referenceChild.children.length);
    });
  });

  /**
   * Property: Blog template loads with correct AST structure
   */
  it("Test 2.3.2: Blog template preserves correct AST structure", () => {
    render(<Header />);

    // Load Blog template
    const templateSelect = screen.getByLabelText("Load demo template");
    fireEvent.change(templateSelect, { target: { value: "blog" } });

    // Verify AST structure matches Blog template
    const ast = useEditorStore.getState().ast;
    
    expect(ast.root.children).toBeDefined();
    expect(ast.root.children.length).toBeGreaterThan(0);
    
    // Verify the AST is properly formed
    expect(ast).toHaveProperty("version");
    expect(ast).toHaveProperty("root");
    expect(ast.root).toHaveProperty("id");
    expect(ast.root).toHaveProperty("type");
    expect(ast.root).toHaveProperty("props");
    expect(ast.root).toHaveProperty("children");

    // Verify project name was updated
    expect(useEditorStore.getState().projectName).toBe("Blog Demo");

    // Get reference template for comparison
    const referenceTemplate = loadTemplate("blog");
    
    // Verify structure matches reference
    expect(ast.root.children).toHaveLength(referenceTemplate.root.children.length);
    
    // Verify each child node has correct type and structure
    ast.root.children.forEach((child, index) => {
      const referenceChild = referenceTemplate.root.children[index];
      expect(child.type).toBe(referenceChild.type);
      expect(child.children).toHaveLength(referenceChild.children.length);
    });
  });

  /**
   * Property: Template loading for all available templates produces valid AST
   */
  it("Test 2.3.3: All templates preserve valid AST structure", () => {
    const templates: Array<"login" | "blog"> = ["login", "blog"];

    for (const templateName of templates) {
      // Reset state and re-render for each template
      useEditorStore.setState({
        ast: createDefaultRoot(),
        projectName: "Test Project",
      });

      const { unmount } = render(<Header />);

      // Load template
      const templateSelect = screen.getByLabelText("Load demo template");
      fireEvent.change(templateSelect, { target: { value: templateName } });

      // Verify AST is valid
      const ast = useEditorStore.getState().ast;
      
      // All templates should produce non-empty AST
      expect(ast.root.children).toBeDefined();
      expect(ast.root.children.length).toBeGreaterThan(0);
      
      // Verify AST has correct root structure
      expect(ast.root.type).toBeDefined();
      expect(Array.isArray(ast.root.children)).toBe(true);
      
      // Verify all children are valid nodes
      ast.root.children.forEach((child) => {
        expect(child).toHaveProperty("id");
        expect(child).toHaveProperty("type");
        expect(child).toHaveProperty("props");
        expect(child).toHaveProperty("children");
        expect(typeof child.id).toBe("string");
        expect(typeof child.type).toBe("string");
      });

      // Verify project name was updated correctly
      const expectedName = templateName === "login" ? "Login Demo" : "Blog Demo";
      expect(useEditorStore.getState().projectName).toBe(expectedName);

      // Clean up before next iteration
      unmount();
    }
  });

  /**
   * Property: Template select resets after loading
   */
  it("Test 2.3.4: Template select preserves reset behavior after loading", () => {
    render(<Header />);

    const templateSelect = screen.getByLabelText("Load demo template") as HTMLSelectElement;
    
    // Initial value should be empty
    expect(templateSelect.value).toBe("");

    // Load a template
    fireEvent.change(templateSelect, { target: { value: "login" } });

    // After the onChange handler runs, the select should reset to empty
    // This is done via e.target.value = "" in the handler
    expect(templateSelect.value).toBe("");
  });

  /**
   * Property: Template components have correct hierarchy
   */
  it("Test 2.3.5: Templates preserve correct component hierarchy", () => {
    const templates: Array<"login" | "blog"> = ["login", "blog"];

    for (const templateName of templates) {
      useEditorStore.setState({ ast: createDefaultRoot() });
      
      const referenceTemplate = loadTemplate(templateName);
      
      const { unmount } = render(<Header />);
      const templateSelect = screen.getByLabelText("Load demo template");
      fireEvent.change(templateSelect, { target: { value: templateName } });

      const loadedAst = useEditorStore.getState().ast;

      // Helper function to verify node hierarchy
      function verifyHierarchy(
        node: typeof loadedAst.root.children[0],
        reference: typeof referenceTemplate.root.children[0]
      ): void {
        expect(node.type).toBe(reference.type);
        expect(node.children).toHaveLength(reference.children.length);

        // Recursively verify children
        node.children.forEach((child, index) => {
          verifyHierarchy(child, reference.children[index]);
        });
      }

      // Verify each top-level child maintains hierarchy
      expect(loadedAst.root.children).toBeDefined();
      loadedAst.root.children.forEach((child, index) => {
        verifyHierarchy(child, referenceTemplate.root.children[index]);
      });

      // Clean up
      unmount();
    }
  });

  /**
   * Property: Template node properties are preserved
   */
  it("Test 2.3.6: Templates preserve node properties correctly", () => {
    render(<Header />);

    // Load Login template
    const templateSelect = screen.getByLabelText("Load demo template");
    fireEvent.change(templateSelect, { target: { value: "login" } });

    const ast = useEditorStore.getState().ast;
    const referenceTemplate = loadTemplate("login");

    // Helper to compare props (ignoring id which is regenerated)
    function compareProps(
      node: typeof ast.root.children[0],
      reference: typeof referenceTemplate.root.children[0]
    ): void {
      // Compare props structure
      const nodePropsKeys = Object.keys(node.props || {}).sort();
      const refPropsKeys = Object.keys(reference.props || {}).sort();
      
      expect(nodePropsKeys).toEqual(refPropsKeys);

      // Compare prop values (except for objects/arrays which may have different references)
      for (const key of nodePropsKeys) {
        const nodeValue = node.props[key];
        const refValue = reference.props[key];

        if (typeof nodeValue === "string" || typeof nodeValue === "number" || typeof nodeValue === "boolean") {
          expect(nodeValue).toBe(refValue);
        }
      }

      // Recursively compare children
      node.children.forEach((child, index) => {
        if (reference.children[index]) {
          compareProps(child, reference.children[index]);
        }
      });
    }

    // Compare all nodes
    expect(ast.root.children).toBeDefined();
    ast.root.children.forEach((child, index) => {
      if (referenceTemplate.root.children[index]) {
        compareProps(child, referenceTemplate.root.children[index]);
      }
    });
  });

  /**
   * Property: Empty template option does nothing
   */
  it("Test 2.3.7: Empty template option preserves no-op behavior", () => {
    render(<Header />);

    const initialAst = useEditorStore.getState().ast;
    const initialProjectName = useEditorStore.getState().projectName;

    const templateSelect = screen.getByLabelText("Load demo template");
    
    // Select the empty option (default)
    fireEvent.change(templateSelect, { target: { value: "" } });

    // Verify nothing changed
    const finalAst = useEditorStore.getState().ast;
    const finalProjectName = useEditorStore.getState().projectName;

    expect(finalAst).toBe(initialAst);
    expect(finalProjectName).toBe(initialProjectName);
  });
});
