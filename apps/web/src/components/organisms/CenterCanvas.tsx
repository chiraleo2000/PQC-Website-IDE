import { countNodes } from "@pqc/shared";
import { AstRenderer } from "../../canvas/AstRenderer";
import { VirtualizedCanvas } from "../../canvas/VirtualizedCanvas";
import { useAstRoot, useEditorStore } from "../../stores/editorStore";

const VIRTUALIZE_THRESHOLD = 1000;

const STARTER_TEMPLATES = [
  { id: "login", label: "Login" },
  { id: "blog", label: "Blog" },
  { id: "landing", label: "Landing" },
  { id: "portfolio", label: "Portfolio" },
  { id: "docs", label: "Docs" },
] as const;

export function CenterCanvas() {
  const root = useAstRoot();
  const selectedId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const projectName = useEditorStore((s) => s.projectName);
  const loadDemoTemplate = useEditorStore((s) => s.loadDemoTemplate);

  const nodeCount = countNodes(root);
  const useVirtual = nodeCount > VIRTUALIZE_THRESHOLD;
  const showStarter = projectName === "Untitled Site" && nodeCount <= 4;

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
      {showStarter && (
        <div
          className="mb-3 rounded-2xl border border-surface-border bg-surface-raised p-4"
          data-testid="start-path"
        >
          <p className="text-sm font-semibold text-ink">Start a site</p>
          <p className="mt-1 text-xs text-ink-muted">
            Pick a template, name it in the top bar, then Save and Publish.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STARTER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="btn-soft"
                data-testid={`start-template-${template.id}`}
                onClick={() => loadDemoTemplate(template.id)}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
