import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createDefaultRoot, createNode } from "@pqc/shared";
import { useEditorStore } from "../../stores/editorStore";
import { RightPropertiesPanel } from "./RightPropertiesPanel";

describe("RightPropertiesPanel", () => {
  beforeEach(() => {
    const root = createDefaultRoot();
    const child = createNode("p", { children: "Hello", className: "text" });
    root.root.children = [child];
    useEditorStore.setState({
      ast: root,
      selectedNodeId: child.id,
      projectName: "Test",
      cryptoStatus: "ready",
      cryptoError: null,
      authToken: null,
      signerPublicKeyId: null,
      kemPublicKeyB64: null,
      x25519PublicKeyB64: null,
      projectId: "p1",
    });
  });

  it("edits selected node text and className", () => {
    render(<RightPropertiesPanel />);
    const textInput = screen.getByLabelText("Text");
    fireEvent.change(textInput, { target: { value: "Updated" } });
    const selected = useEditorStore.getState().ast.root.children[0];
    expect(String(selected.props.children ?? selected.props.text)).toBe("Updated");
  });
});
