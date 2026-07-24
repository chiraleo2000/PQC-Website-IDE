import { ensureAstV2 } from "@pqc/shared";
import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../atoms/Button";

export function PagesPanel() {
  const ast = useEditorStore((s) => s.ast);
  const setActivePageId = useEditorStore((s) => s.setActivePageId);
  const addPage = useEditorStore((s) => s.addPage);
  const removePage = useEditorStore((s) => s.removePage);
  const v2 = ensureAstV2(ast);

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-raised/80 px-3 py-2"
      data-testid="pages-panel"
      aria-label="Site pages"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pages</span>
      {v2.pages.map((page) => (
        <button
          key={page.id}
          type="button"
          data-testid={`page-tab-${page.slug}`}
          className={`rounded-lg px-3 py-1 text-sm ${
            page.id === v2.activePageId
              ? "bg-cyan-600 text-white"
              : "border border-surface-border text-ink hover:bg-surface"
          }`}
          onClick={() => setActivePageId(page.id)}
        >
          {page.title}
          <span className="ml-1 text-xs opacity-70">{page.slug}.html</span>
        </button>
      ))}
      <Button
        variant="ghost"
        data-testid="page-add"
        onClick={() => {
          const n = v2.pages.length + 1;
          addPage(`Page ${n}`, `page-${n}`);
        }}
      >
        Add page
      </Button>
      {v2.pages.length > 1 && (
        <Button
          variant="ghost"
          data-testid="page-remove"
          onClick={() => removePage(v2.activePageId)}
        >
          Remove page
        </Button>
      )}
    </div>
  );
}
