import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../atoms/Button";

export function TemplatesPanel() {
  const loadDemoTemplate = useEditorStore((s) => s.loadDemoTemplate);
  const newProject = useEditorStore((s) => s.newProject);

  return (
    <section className="flex-1 overflow-y-auto p-8" aria-label="Templates" data-testid="templates-panel">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Start from a template</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Templates load instantly into the builder. Save encrypts the AST with ML-KEM + ML-DSA before it hits the API.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold">Login page</h2>
            <p className="mt-1 text-sm text-zinc-400">Auth form layout ready for demo-api wiring.</p>
            <Button className="mt-4" data-testid="template-login" onClick={() => loadDemoTemplate("login")}>
              Use Login template
            </Button>
          </article>
          <article className="rounded-2xl border border-surface-border bg-surface-raised p-5">
            <h2 className="text-lg font-semibold">Blog feed</h2>
            <p className="mt-1 text-sm text-zinc-400">Feed + cards + new post form components.</p>
            <Button className="mt-4" data-testid="template-blog" onClick={() => loadDemoTemplate("blog")}>
              Use Blog template
            </Button>
          </article>
          <article className="rounded-2xl border border-dashed border-surface-border bg-surface/40 p-5 sm:col-span-2">
            <h2 className="text-lg font-semibold">Blank canvas</h2>
            <p className="mt-1 text-sm text-zinc-400">Empty root with guided empty-state CTAs.</p>
            <Button variant="ghost" className="mt-4" data-testid="template-blank" onClick={() => newProject()}>
              Start blank
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}
