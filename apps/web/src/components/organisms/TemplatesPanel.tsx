import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../atoms/Button";

const TEMPLATES = [
  {
    id: "login" as const,
    title: "Login page",
    blurb: "Auth form layout ready for demo-api wiring.",
    testId: "template-login",
  },
  {
    id: "blog" as const,
    title: "Blog feed",
    blurb: "Feed + cards + new post form components.",
    testId: "template-blog",
  },
  {
    id: "landing" as const,
    title: "Landing (multi-page)",
    blurb: "Home + About pages with cross-links for export.",
    testId: "template-landing",
  },
  {
    id: "portfolio" as const,
    title: "Portfolio",
    blurb: "Case-study grid for studio-style sites.",
    testId: "template-portfolio",
  },
  {
    id: "docs" as const,
    title: "Docs",
    blurb: "Sidebar + article layout for documentation.",
    testId: "template-docs",
  },
];

export function TemplatesPanel() {
  const loadDemoTemplate = useEditorStore((s) => s.loadDemoTemplate);
  const newProject = useEditorStore((s) => s.newProject);

  return (
    <section className="flex-1 overflow-y-auto p-8" aria-label="Templates" data-testid="templates-panel">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Start from a template</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Templates load into the builder. Save encrypts the full multi-page AST with hybrid PQC before sync.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <article key={t.id} className="rounded-2xl border border-surface-border bg-surface-raised p-5">
              <h2 className="text-lg font-semibold">{t.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{t.blurb}</p>
              <Button className="mt-4" data-testid={t.testId} onClick={() => loadDemoTemplate(t.id)}>
                Use {t.title.split(" ")[0]} template
              </Button>
            </article>
          ))}
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
