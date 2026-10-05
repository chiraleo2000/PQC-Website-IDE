import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { useEditorStore } from "../stores/editorStore";
import { checkApiHealth } from "../api/health";

vi.mock("../api/health", () => ({
  checkApiHealth: vi.fn(),
}));

vi.mock("../api/auth", () => ({
  getAuthMode: () => "login" as const,
  registerDevSession: vi.fn(),
  registerSignPublicKey: vi.fn(),
}));

describe("WorkspaceLayout health", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.setState({
      authToken: "tok",
      cryptoStatus: "ready",
      cryptoError: null,
      lastPublishedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the API disconnected and restores a published session", async () => {
    vi.mocked(checkApiHealth).mockResolvedValue(false);
    render(<WorkspaceLayout />);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(useEditorStore.getState().cryptoError).toBe("API disconnected");

    vi.mocked(checkApiHealth).mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(useEditorStore.getState().cryptoStatus).toBe("saved");
    expect(useEditorStore.getState().cryptoError).toBeNull();
  });
});
