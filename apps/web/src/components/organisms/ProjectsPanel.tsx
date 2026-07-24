import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../atoms/Button";

export function ProjectsPanel() {
  const projectIndex = useEditorStore((s) => s.projectIndex);
  const projectId = useEditorStore((s) => s.projectId);
  const switchProject = useEditorStore((s) => s.switchProject);
  const newProject = useEditorStore((s) => s.newProject);
  const setUiMode = useEditorStore((s) => s.setUiMode);

  return (
    <section className="flex-1 overflow-y-auto p-8" aria-label="Projects" data-testid="projects-panel">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Recent projects</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Stored locally in this browser. Server sync still uses PQC envelopes on Save.
            </p>
          </div>
          <Button data-testid="projects-new" onClick={() => newProject()}>
            New project
          </Button>
        </div>
        {projectIndex.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-surface-border p-8 text-center">
            <p className="text-sm text-zinc-400">No saved projects yet. Load a template or Save once.</p>
            <Button className="mt-4" variant="ghost" onClick={() => setUiMode("templates")}>
              Browse templates
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-2">
            {projectIndex.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-testid={`project-${p.id}`}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:border-accent/40 ${
                    p.id === projectId
                      ? "border-accent/50 bg-accent/5"
                      : "border-surface-border bg-surface-raised"
                  }`}
                  onClick={() => switchProject(p.id)}
                >
                  <span>
                    <span className="block font-medium text-ink">{p.name}</span>
                    <span className="block font-mono text-[11px] text-zinc-500">{p.id.slice(0, 8)}…</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(p.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
