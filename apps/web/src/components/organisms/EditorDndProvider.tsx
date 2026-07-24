import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { applyCanvasMove, applyPaletteDrop } from "../../canvas/dnd-handlers";
import { useEditorStore } from "../../stores/editorStore";

/** Shared DndContext for palette (sidebar) + canvas drop targets. */
export function EditorDndProvider({ children }: Readonly<{ children: ReactNode }>) {
  const insertNodeAt = useEditorStore((s) => s.insertNodeAt);
  const moveNode = useEditorStore((s) => s.moveNode);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.fromPalette) setActiveLabel(String(data.type));
    else if (data?.fromCanvas) setActiveLabel("Move");
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as Record<string, unknown> | undefined;
    const overData = over.data.current as Record<string, unknown> | undefined;

    if (applyPaletteDrop(activeData, overData, insertNodeAt)) return;
    applyCanvasMove(activeData, overData, moveNode);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {activeLabel ? (
          <div className="rounded-xl border border-accent bg-surface-raised px-4 py-2 text-sm text-ink shadow-lg">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
