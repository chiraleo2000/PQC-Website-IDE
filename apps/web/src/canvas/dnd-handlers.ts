import { asRequiredId } from "./propString";

/** Pure palette → canvas drop handler (shared by EditorDndProvider and unit tests). */
export function applyPaletteDrop(
  activeData: Record<string, unknown> | undefined,
  overData: Record<string, unknown> | undefined,
  insertNodeAt: (parentId: string, index: number, type: string) => void
): boolean {
  const parentId = asRequiredId(overData?.parentId);
  const type = asRequiredId(activeData?.type);
  if (!activeData?.fromPalette || parentId == null || overData?.index == null || type == null) {
    return false;
  }
  insertNodeAt(parentId, Number(overData.index), type);
  return true;
}

/** Canvas node reorder / reparent via moveNode. */
export function applyCanvasMove(
  activeData: Record<string, unknown> | undefined,
  overData: Record<string, unknown> | undefined,
  moveNode: (nodeId: string, newParentId: string, newIndex: number) => void
): boolean {
  if (!activeData?.fromCanvas) return false;
  const nodeId = asRequiredId(activeData.nodeId);
  const parentId = asRequiredId(overData?.parentId);
  if (nodeId == null || parentId == null || overData?.index == null) return false;
  if (nodeId === parentId) return false;
  moveNode(nodeId, parentId, Number(overData.index));
  return true;
}
