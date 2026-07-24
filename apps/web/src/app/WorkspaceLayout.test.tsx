import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createDefaultRoot } from "@pqc/shared";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { useEditorStore } from "../stores/editorStore";
import {
  mockEncryptAndSignAst,
  mockGenerateSignKeypair,
  mockServerKemPublicKeyB64,
  mockServerX25519PublicKeyB64,
} from "../test/mocks/configure-pqc-mocks";

vi.mock("../api/auth", () => ({
  registerDevSession: vi.fn().mockResolvedValue({
    token: "tok",
    signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
    kemPublicKeyB64: "a2VtcHVibGlj",
    x25519PublicKeyB64: "eDI1NTE5",
    signPublicKeyB64: "",
  }),
  registerSignPublicKey: vi.fn().mockResolvedValue(undefined),
}));

describe("WorkspaceLayout", () => {
  beforeEach(() => {
    mockEncryptAndSignAst.mockClear();
    mockGenerateSignKeypair.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    );
    useEditorStore.setState({
      ast: createDefaultRoot(),
      selectedNodeId: null,
      cryptoStatus: "idle",
      cryptoError: null,
      authToken: null,
      signerPublicKeyId: null,
      kemPublicKeyB64: null,
      x25519PublicKeyB64: null,
    });
  });

  it("renders workspace regions", async () => {
    render(<WorkspaceLayout />);
    await waitFor(() => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Component library")).toBeInTheDocument();
    expect(screen.getByTestId("page-canvas")).toBeInTheDocument();
    expect(screen.getByLabelText("Properties panel")).toBeInTheDocument();
  });

  it("initializes PQC keys via mocked worker client (no WASM)", async () => {
    render(<WorkspaceLayout />);
    await waitFor(() => {
      expect(mockGenerateSignKeypair).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId("pqc-status-badge")).toHaveTextContent(/ML-KEM/i);
    });
    expect(useEditorStore.getState().cryptoStatus).toBe("ready");
    expect(useEditorStore.getState().authToken).toBe("tok");
  });

  it("exposes palette drag handles and canvas drop zones for @dnd-kit", async () => {
    render(<WorkspaceLayout />);
    await waitFor(() => expect(useEditorStore.getState().cryptoStatus).toBe("ready"));

    expect(screen.getByLabelText("Drag Paragraph to canvas")).toBeInTheDocument();
    const main = useEditorStore.getState().ast.root.children.find((c) => c.type === "main")!;
    expect(screen.getByTestId(`drop-zone-${main.id}-0`)).toBeInTheDocument();
  });

  it("save uses mocked ML-KEM + X25519 + ML-DSA encrypt path", async () => {
    useEditorStore.setState({
      authToken: "tok",
      signerPublicKeyId: "550e8400-e29b-41d4-a716-446655440011",
      kemPublicKeyB64: mockServerKemPublicKeyB64,
      x25519PublicKeyB64: mockServerX25519PublicKeyB64,
      cryptoStatus: "ready",
    });

    render(<WorkspaceLayout />);

    fireEvent.click(screen.getByTestId("save-project"));

    await waitFor(() => {
      expect(mockEncryptAndSignAst).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(useEditorStore.getState().cryptoStatus).toBe("saved");
    });

    const payload = mockEncryptAndSignAst.mock.calls[0]?.[0];
    expect(payload?.projectId).toBe(useEditorStore.getState().projectId);
    expect(payload?.astJson).toContain('"version":1');
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("Ctrl/Cmd+Z and Ctrl+Shift+Z / Ctrl+Y trigger undo redo", async () => {
    render(<WorkspaceLayout />);
    await waitFor(() => expect(useEditorStore.getState().cryptoStatus).toBe("ready"));

    const rootId = useEditorStore.getState().ast.root.id;
    useEditorStore.getState().insertNodeAt(rootId, 0, "p");
    const after = useEditorStore.getState().ast.root.children.length;

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(useEditorStore.getState().ast.root.children).toHaveLength(after - 1);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(useEditorStore.getState().ast.root.children).toHaveLength(after);

    useEditorStore.getState().undo();
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(useEditorStore.getState().ast.root.children).toHaveLength(after);
  });
});
