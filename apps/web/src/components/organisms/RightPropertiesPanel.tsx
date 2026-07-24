import type { AstNode } from "@pqc/shared";
import { asPropString } from "../../canvas/propString";
import { useEditorStore, useSelectedNode } from "../../stores/editorStore";

const COLOR_PRESETS = [
  { label: "White", classes: "bg-white text-zinc-900" },
  { label: "Soft", classes: "bg-zinc-50 text-zinc-900" },
  { label: "Ink", classes: "bg-zinc-900 text-white" },
  { label: "Teal", classes: "bg-cyan-600 text-white" },
  { label: "Sky", classes: "bg-sky-50 text-sky-950" },
];

const SPACING_PRESETS = [
  { label: "Compact", classes: "p-2 gap-2" },
  { label: "Comfort", classes: "p-4 gap-3" },
  { label: "Spacious", classes: "p-8 gap-6" },
];

function mergeClassPreset(current: string, next: string, keys: string[]): string {
  const tokens = current.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((t) => !keys.some((k) => t.startsWith(k)));
  return [...filtered, ...next.split(/\s+/).filter(Boolean)].join(" ");
}

export function RightPropertiesPanel() {
  const selected = useSelectedNode();
  const updateSelectedProps = useEditorStore((s) => s.updateSelectedProps);
  const removeSelected = useEditorStore((s) => s.removeSelected);

  if (!selected) {
    return (
      <aside
        className="panel flex w-72 shrink-0 flex-col border-l p-4"
        aria-label="Properties panel"
        data-testid="properties-panel"
      >
        <h2 className="text-sm font-semibold text-ink">Inspector</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Select an element to edit text, colors, spacing, links, and forms — or set site SEO below for
          crawlable exports.
        </p>
        <SeoFields />
      </aside>
    );
  }

  return (
    <aside
      className="panel flex w-72 shrink-0 flex-col border-l"
      aria-label="Properties panel"
      data-testid="properties-panel"
    >
      <div className="border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Inspector</h2>
        <p className="font-mono text-xs text-ink-subtle">{selected.type}</p>
      </div>
      <form className="flex flex-col gap-4 overflow-y-auto p-4" onSubmit={(e) => e.preventDefault()}>
        <StylePresets selected={selected} updateSelectedProps={updateSelectedProps} />
        <PropFields selected={selected} updateSelectedProps={updateSelectedProps} />
        <button
          type="button"
          onClick={removeSelected}
          className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          aria-label="Delete selected element"
          data-testid="delete-element"
        >
          Delete element
        </button>
      </form>
    </aside>
  );
}

function StylePresets({
  selected,
  updateSelectedProps,
}: Readonly<{
  selected: AstNode;
  updateSelectedProps: (props: Record<string, unknown>) => void;
}>) {
  const className = asPropString(selected.props.className);

  return (
    <div className="space-y-3" data-testid="style-presets">
      <div>
        <p className="mb-2 text-xs font-medium text-ink-muted">Color presets</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-lg border border-surface-border px-2 py-1 text-[11px] text-ink hover:bg-surface-soft"
              onClick={() =>
                updateSelectedProps({
                  className: mergeClassPreset(className, preset.classes, ["bg-", "text-"]),
                })
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-ink-muted">Spacing</p>
        <div className="flex flex-wrap gap-1.5">
          {SPACING_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-lg border border-surface-border px-2 py-1 text-[11px] text-ink hover:bg-surface-soft"
              onClick={() =>
                updateSelectedProps({
                  className: mergeClassPreset(className, preset.classes, ["p-", "px-", "py-", "gap-"]),
                })
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PropFields({
  selected,
  updateSelectedProps,
}: Readonly<{
  selected: AstNode;
  updateSelectedProps: (props: Record<string, unknown>) => void;
}>) {
  const className = asPropString(selected.props.className);
  const text = asPropString(selected.props.children ?? selected.props.text);
  const textTypes = new Set(["p", "h1", "h2", "button", "a", "label", "textarea"]);

  return (
    <>
      <div>
        <label htmlFor="prop-class" className="mb-1 block text-xs text-ink-muted">
          CSS classes
        </label>
        <input
          id="prop-class"
          type="text"
          value={className}
          onChange={(e) => updateSelectedProps({ className: e.target.value })}
          className="field-input"
        />
      </div>

      {textTypes.has(selected.type) && (
        <div>
          <label htmlFor="prop-text" className="mb-1 block text-xs text-ink-muted">
            Text
          </label>
          <textarea
            id="prop-text"
            value={text}
            onChange={(e) => updateSelectedProps({ children: e.target.value })}
            rows={3}
            className="field-input"
          />
        </div>
      )}

      {selected.type === "a" && (
        <div>
          <label htmlFor="prop-href" className="mb-1 block text-xs text-ink-muted">
            Link href
          </label>
          <input
            id="prop-href"
            type="text"
            value={asPropString(selected.props.href)}
            onChange={(e) => updateSelectedProps({ href: e.target.value })}
            className="field-input"
            placeholder="https://"
          />
        </div>
      )}

      {selected.type === "img" && (
        <>
          <div>
            <label htmlFor="prop-src" className="mb-1 block text-xs text-ink-muted">
              Image URL
            </label>
            <input
              id="prop-src"
              type="url"
              value={asPropString(selected.props.src)}
              onChange={(e) => updateSelectedProps({ src: e.target.value })}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="prop-alt" className="mb-1 block text-xs text-ink-muted">
              Alt text
            </label>
            <input
              id="prop-alt"
              type="text"
              value={asPropString(selected.props.alt)}
              onChange={(e) => updateSelectedProps({ alt: e.target.value })}
              className="field-input"
            />
          </div>
        </>
      )}

      {(selected.type === "input" || selected.type === "textarea") && (
        <>
          <div>
            <label htmlFor="prop-name" className="mb-1 block text-xs text-ink-muted">
              Name
            </label>
            <input
              id="prop-name"
              type="text"
              value={asPropString(selected.props.name)}
              onChange={(e) => updateSelectedProps({ name: e.target.value })}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="prop-placeholder" className="mb-1 block text-xs text-ink-muted">
              Placeholder
            </label>
            <input
              id="prop-placeholder"
              type="text"
              value={asPropString(selected.props.placeholder)}
              onChange={(e) => updateSelectedProps({ placeholder: e.target.value })}
              className="field-input"
            />
          </div>
        </>
      )}

      {selected.type === "input" && (
        <div>
          <label htmlFor="prop-type" className="mb-1 block text-xs text-ink-muted">
            Input type
          </label>
          <select
            id="prop-type"
            value={asPropString(selected.props.type, "text")}
            onChange={(e) => updateSelectedProps({ type: e.target.value })}
            className="field-input"
          >
            {["text", "email", "password", "number", "search", "url", "tel"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected.type === "label" && (
        <div>
          <label htmlFor="prop-for" className="mb-1 block text-xs text-ink-muted">
            For (input id)
          </label>
          <input
            id="prop-for"
            type="text"
            value={asPropString(selected.props.for)}
            onChange={(e) => updateSelectedProps({ for: e.target.value })}
            className="field-input"
          />
        </div>
      )}
    </>
  );
}

function SeoFields() {
  const root = useEditorStore((s) => s.ast.root);
  const setAstRoot = useEditorStore((s) => s.setAstRoot);

  function patch(props: Record<string, unknown>) {
    setAstRoot({ ...root, props: { ...root.props, ...props } });
  }

  return (
    <div className="mt-6 space-y-3 border-t border-surface-border pt-4" data-testid="seo-fields">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Site SEO</h3>
      <p className="text-xs text-ink-muted">
        Exported HTML includes title, description, Open Graph tags, robots.txt, and sitemap.xml for search
        engines.
      </p>
      <div>
        <label htmlFor="seo-title" className="mb-1 block text-xs text-ink-muted">
          SEO title
        </label>
        <input
          id="seo-title"
          type="text"
          value={asPropString(root.props.seoTitle)}
          onChange={(e) => patch({ seoTitle: e.target.value })}
          className="field-input"
          placeholder="Page title for Google"
        />
      </div>
      <div>
        <label htmlFor="seo-description" className="mb-1 block text-xs text-ink-muted">
          Meta description
        </label>
        <textarea
          id="seo-description"
          value={asPropString(root.props.seoDescription)}
          onChange={(e) => patch({ seoDescription: e.target.value })}
          className="field-input min-h-[4rem]"
          placeholder="Short crawlable summary"
        />
      </div>
      <div>
        <label htmlFor="seo-canonical" className="mb-1 block text-xs text-ink-muted">
          Canonical URL
        </label>
        <input
          id="seo-canonical"
          type="url"
          value={asPropString(root.props.canonicalUrl)}
          onChange={(e) => patch({ canonicalUrl: e.target.value })}
          className="field-input"
          placeholder="https://example.com/"
        />
      </div>
    </div>
  );
}
