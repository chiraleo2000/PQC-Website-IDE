import { countNodes } from "@pqc/shared";
import { AstRenderer } from "../../canvas/AstRenderer";
import { VirtualizedCanvas } from "../../canvas/VirtualizedCanvas";
import { useAstRoot, useEditorStore } from "../../stores/editorStore";

const VIRTUALIZE_THRESHOLD = 1000;

export function CenterCanvas() {
  const root = useAstRoot();
  const selectedId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);

  const nodeCount = countNodes(root);
  const useVirtual = nodeCount > VIRTUALIZE_THRESHOLD;

  return (
    <main
      id="main-content"
      className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface p-4"
      role="main"
      aria-label="Page editor canvas"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">Canvas</p>
        <output className="text-xs text-ink-muted">
          {nodeCount} node{nodeCount === 1 ? "" : "s"}
          {useVirtual ? " · virtualized" : ""}
        </output>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-surface-soft p-4">
        {useVirtual ? (
          <VirtualizedCanvas root={root} selectedId={selectedId} onSelect={selectNode} />
        ) : (
          <AstRenderer root={root} selectedId={selectedId} onSelect={selectNode} />
        )}
      </div>
    </main>
  );
}
