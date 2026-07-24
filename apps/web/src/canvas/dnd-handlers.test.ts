import { describe, expect, it, vi } from "vitest";
import { applyCanvasMove, applyPaletteDrop } from "./dnd-handlers";

describe("dnd-handlers", () => {
  it("applies palette drop", () => {
    const insert = vi.fn();
    expect(
      applyPaletteDrop(
        { fromPalette: true, type: "h1" },
        { parentId: "p1", index: 2 },
        insert
      )
    ).toBe(true);
    expect(insert).toHaveBeenCalledWith("p1", 2, "h1");
  });

  it("applies canvas move", () => {
    const move = vi.fn();
    expect(
      applyCanvasMove(
        { fromCanvas: true, nodeId: "n1" },
        { parentId: "p2", index: 0 },
        move
      )
    ).toBe(true);
    expect(move).toHaveBeenCalledWith("n1", "p2", 0);
  });

  it("rejects moving node onto itself", () => {
    const move = vi.fn();
    expect(
      applyCanvasMove(
        { fromCanvas: true, nodeId: "same" },
        { parentId: "same", index: 0 },
        move
      )
    ).toBe(false);
    expect(move).not.toHaveBeenCalled();
  });

  it("rejects incomplete palette and canvas drops", () => {
    expect(applyPaletteDrop({ fromPalette: true }, { parentId: "p1", index: 0 }, vi.fn())).toBe(
      false
    );
    expect(applyPaletteDrop(undefined, { parentId: "p1", index: 0 }, vi.fn())).toBe(false);
    expect(applyCanvasMove({ fromCanvas: false }, { parentId: "p1", index: 0 }, vi.fn())).toBe(
      false
    );
    expect(
      applyCanvasMove({ fromCanvas: true, nodeId: "n1" }, { parentId: "p1" }, vi.fn())
    ).toBe(false);
  });
});
