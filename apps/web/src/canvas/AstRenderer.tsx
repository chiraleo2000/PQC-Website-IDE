import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { AstNode } from "@pqc/shared";
import { renderAstNode } from "./ComponentRegistry";
import { useEditorStore } from "../stores/editorStore";
import { Button } from "../components/atoms/Button";

interface AstRendererProps {
  root: AstNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function DropZone({ parentId, index }: Readonly<{ parentId: string; index: number }>) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${parentId}-${index}`,
    data: { parentId, index },
  });

  return (
    <span
      ref={setNodeRef}
      data-testid={`drop-zone-${parentId}-${index}`}
      className={`pointer-events-none block min-h-[8px] rounded transition ${
        isOver ? "bg-accent/20 border border-dashed border-accent" : ""
      }`}
      aria-hidden
    />
  );
}

function CanvasNode({
  node,
  selectedId,
  onSelect,
}: Readonly<{
  node: AstNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `node-${node.id}`,
    data: { nodeId: node.id, fromCanvas: true },
  });

  const childSlot = (
    <>
      {node.children.map((child, i) => (
        <span key={child.id} className="contents">
          <DropZone parentId={node.id} index={i} />
          <CanvasNode node={child} selectedId={selectedId} onSelect={onSelect} />
        </span>
      ))}
      <DropZone parentId={node.id} index={node.children.length} />
    </>
  );

  return (
    <span
      ref={setNodeRef}
      className={`relative block ${isDragging ? "opacity-40" : ""}`}
      {...listeners}
      {...attributes}
    >
      {renderAstNode(node, {
        selectedId,
        onSelect,
        depth: 0,
        renderChildren: false,
        childSlot,
      })}
    </span>
  );
}

function EmptyCanvasCtas({ rootId }: Readonly<{ rootId: string }>) {
  const loadDemoTemplate = useEditorStore((s) => s.loadDemoTemplate);
  const insertNodeAt = useEditorStore((s) => s.insertNodeAt);
  const insertPresetAt = useEditorStore((s) => s.insertPresetAt);
  const setUiMode = useEditorStore((s) => s.setUiMode);

  return (
    <div
      className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      data-testid="canvas-empty-state"
    >
      <div>
        <h2 className="text-xl font-semibold text-ink">Design a simple page</h2>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          Start from a template or drop in a Hero / Nav / Form preset. Saves use hybrid ML-KEM + X25519 +
          ML-DSA encryption.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button data-testid="empty-cta-login" onClick={() => loadDemoTemplate("login")}>
          Login template
        </Button>
        <Button data-testid="empty-cta-blog" variant="ghost" onClick={() => loadDemoTemplate("blog")}>
          Blog template
        </Button>
        <Button
          data-testid="empty-cta-hero"
          variant="ghost"
          onClick={() => insertPresetAt(rootId, 0, "hero")}
        >
          Add Hero
        </Button>
        <Button
          data-testid="empty-cta-section"
          variant="ghost"
          onClick={() => insertNodeAt(rootId, 0, "section")}
        >
          Add Section
        </Button>
        <Button variant="ghost" onClick={() => setUiMode("templates")}>
          Browse templates
        </Button>
      </div>
    </div>
  );
}

export function AstRenderer({ root, selectedId, onSelect }: Readonly<AstRendererProps>) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-root",
    data: { parentId: root.id, index: root.children.length },
  });

  return (
    <section
      ref={setNodeRef}
      className={`page-paper mx-auto min-h-[520px] w-full max-w-5xl rounded-2xl p-6 ${
        isOver ? "ring-2 ring-accent" : ""
      }`}
      aria-label="Page canvas"
      data-testid="page-canvas"
    >
      {root.children.length === 0 ? (
        <EmptyCanvasCtas rootId={root.id} />
      ) : (
        root.children.map((child, i) => (
          <div key={child.id}>
            <DropZone parentId={root.id} index={i} />
            <CanvasNode node={child} selectedId={selectedId} onSelect={onSelect} />
          </div>
        ))
      )}
      <DropZone parentId={root.id} index={root.children.length} />
    </section>
  );
}
