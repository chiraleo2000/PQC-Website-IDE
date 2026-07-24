import userEvent from "@testing-library/user-event";

/**
 * Simulate @dnd-kit PointerSensor drag in jsdom (activation distance 8px).
 * Requires getBoundingClientRect mock in src/test/setup.ts.
 */
export async function simulatePointerDrag(source: Element, target: Element): Promise<void> {
  const user = userEvent.setup();
  const tgt = target.getBoundingClientRect();
  const endX = tgt.left + tgt.width / 2;
  const endY = tgt.top + tgt.height / 2;

  await user.pointer([
    { keys: "[MouseLeft>]", target: source },
    { coords: { clientX: endX, clientY: endY } },
    { keys: "[/MouseLeft]", target },
  ]);
}
