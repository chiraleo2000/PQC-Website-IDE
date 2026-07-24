import { useDraggable } from "@dnd-kit/core";
import {
  PALETTE_COMPONENTS,
  SECTION_PRESETS,
  findNode,
  type SectionPresetId,
} from "@pqc/shared";
import { useEditorStore } from "../../stores/editorStore";

function PaletteItem({ type, label }: Readonly<{ type: string; label: string }>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, fromPalette: true },
  });
  const insertNodeAt = useEditorStore((s) => s.insertNodeAt);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const root = useEditorStore((s) => s.ast.root);
  const pushToast = useEditorStore((s) => s.pushToast);

  function clickToAdd() {
    const parentId = selectedNodeId && findNode(root, selectedNodeId) ? selectedNodeId : root.id;
    const parent = findNode(root, parentId) ?? root;
    insertNodeAt(parent.id, parent.children.length, type);
    pushToast({ tone: "info", message: `Added ${label}` });
  }

  return (
    <div className="flex gap-1">
      <button
        ref={setNodeRef}
        type="button"
        className={`min-w-0 flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-left text-sm text-ink transition hover:border-accent/50 hover:bg-surface-soft ${
          isDragging ? "opacity-50" : ""
        }`}
        {...listeners}
        {...attributes}
        aria-label={`Drag ${label} to canvas`}
        data-dragging={isDragging ? "true" : undefined}
      >
        {label}
      </button>
      <button
        type="button"
        className="shrink-0 rounded-xl border border-surface-border px-2 text-xs text-accent-muted hover:bg-cyan-50"
        aria-label={`Add ${label}`}
        data-testid={`add-${type}`}
        onClick={clickToAdd}
        title="Click to add"
      >
        +
      </button>
    </div>
  );
}

function PresetItem({ id, label, description }: Readonly<{ id: SectionPresetId; label: string; description: string }>) {
  const insertPresetAt = useEditorStore((s) => s.insertPresetAt);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const root = useEditorStore((s) => s.ast.root);
  const pushToast = useEditorStore((s) => s.pushToast);

  function clickToAdd() {
    const parentId = selectedNodeId && findNode(root, selectedNodeId) ? selectedNodeId : root.id;
    const parent = findNode(root, parentId) ?? root;
    insertPresetAt(parent.id, parent.children.length, id);
    pushToast({ tone: "success", message: `Inserted ${label} preset` });
  }

  return (
    <button
      type="button"
      data-testid={`preset-${id}`}
      className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-left transition hover:border-accent/40 hover:bg-surface-soft"
      onClick={clickToAdd}
    >
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span className="block text-[11px] text-ink-muted">{description}</span>
    </button>
  );
}

export function LeftAssetSidebar() {
  const categories = [...new Set(PALETTE_COMPONENTS.map((c) => c.category))];

  return (
    <aside
      className="panel flex w-60 shrink-0 flex-col border-r"
      aria-label="Component library"
      data-testid="component-library"
    >
      <div className="border-b border-surface-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Components</h2>
        <p className="mt-1 text-[11px] text-ink-muted">Presets, drag, or click +</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <h3 className="mb-2 text-xs font-medium capitalize text-ink-muted">Presets</h3>
          <ul className="space-y-1">
            {SECTION_PRESETS.map((p) => (
              <li key={p.id}>
                <PresetItem id={p.id} label={p.label} description={p.description} />
              </li>
            ))}
          </ul>
        </div>
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-medium capitalize text-ink-muted">{cat}</h3>
            <ul className="space-y-1">
              {PALETTE_COMPONENTS.filter((c) => c.category === cat).map((c) => (
                <li key={c.type}>
                  <PaletteItem type={c.type} label={c.label} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
