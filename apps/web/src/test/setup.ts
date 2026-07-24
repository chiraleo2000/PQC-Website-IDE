import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import "./mocks/pqcClient.mock";
import "./mocks/configure-pqc-mocks";
import { MockPqcWorker } from "./mocks/pqc.worker.mock";

/** Replace real Worker so Vitest never loads `pqc.worker.ts` / WASM in RTL runs. */
vi.stubGlobal("Worker", MockPqcWorker as unknown as typeof Worker);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

afterEach(() => {
  cleanup();
});

/** jsdom returns zero-size rects; @dnd-kit collision detection needs layout boxes. */
beforeAll(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element
  ) {
    const label = this.getAttribute("aria-label") ?? "";
    const testId = this.getAttribute("data-testid") ?? "";
    if (label.startsWith("Drag ")) {
      return domRect(0, 0, 160, 32);
    }
    if (testId.startsWith("drop-zone-")) {
      return domRect(200, 120, 400, 12);
    }
    if (testId === "page-canvas") {
      return domRect(180, 80, 420, 300);
    }
    return domRect(0, 0, 100, 24);
  });
});

function domRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect;
}
