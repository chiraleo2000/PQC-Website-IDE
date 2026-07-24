import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { AstNode } from "@pqc/shared";
import { renderAstNode } from "./ComponentRegistry";

function flattenTree(node: AstNode, list: AstNode[] = []): AstNode[] {
  list.push(node);
  for (const c of node.children) flattenTree(c, list);
  return list;
}

interface VirtualizedCanvasProps {
  root: AstNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VirtualizedCanvas({ root, selectedId, onSelect }: VirtualizedCanvasProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const flat = flattenTree(root);

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto rounded-xl border border-zinc-700 p-2"
      role="region"
      aria-label="Virtualized page canvas"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const node = flat[item.index];
          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start}px)`,
                paddingLeft: `${Math.min(item.index, 12) * 8}px`,
              }}
            >
              {renderAstNode(node, { selectedId, onSelect, depth: item.index })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
