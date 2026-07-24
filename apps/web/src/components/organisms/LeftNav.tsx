import { useEditorStore } from "../../stores/editorStore";

const NAV: Array<{ mode: "new" | "templates" | "projects" | "builder" | "pqc"; label: string; icon: string; testId: string }> = [
  { mode: "new", label: "New", icon: "+", testId: "nav-new" },
  { mode: "templates", label: "Templates", icon: "◫", testId: "nav-templates" },
  { mode: "projects", label: "Projects", icon: "☰", testId: "nav-projects" },
  { mode: "builder", label: "Builder", icon: "▦", testId: "nav-builder" },
  { mode: "pqc", label: "PQC Security", icon: "⬡", testId: "nav-pqc" },
];

export function LeftNav() {
  const collapsed = useEditorStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useEditorStore((s) => s.setSidebarCollapsed);
  const uiMode = useEditorStore((s) => s.uiMode);
  const setUiMode = useEditorStore((s) => s.setUiMode);
  const newProject = useEditorStore((s) => s.newProject);
  const cryptoStatus = useEditorStore((s) => s.cryptoStatus);
  const projectName = useEditorStore((s) => s.projectName);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);

  function onNav(mode: (typeof NAV)[number]["mode"]) {
    if (mode === "new") {
      newProject();
      return;
    }
    setUiMode(mode);
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-surface-border bg-surface-raised transition-[width] duration-200 ${
        collapsed ? "w-[4.5rem]" : "w-[260px]"
      }`}
      aria-label="Primary navigation"
      data-testid="left-nav"
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-ink">PQC Builder</p>
            <p className="truncate text-[11px] text-ink-muted">Zero-trust site IDE</p>
          </div>
        )}
        <button
          type="button"
          className="nav-item justify-center px-2"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-testid="nav-collapse"
          onClick={() => setSidebarCollapsed(!collapsed)}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {NAV.map((item) => {
          const active = item.mode !== "new" && uiMode === item.mode;
          return (
            <button
              key={item.testId}
              type="button"
              data-testid={item.testId}
              className={`nav-item ${active ? "nav-item-active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
              aria-current={active ? "page" : undefined}
              title={item.label}
              onClick={() => onNav(item.mode)}
            >
              <span className="text-base leading-none" aria-hidden>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-surface-border p-3">
        <button
          type="button"
          className={`nav-item ${collapsed ? "justify-center px-2" : ""}`}
          data-testid="theme-toggle"
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          onClick={() => toggleTheme()}
        >
          <span aria-hidden>{theme === "light" ? "☾" : "☀"}</span>
          {!collapsed && <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>}
        </button>
        <div
          className={`rounded-2xl bg-surface-soft px-3 py-2.5 ${collapsed ? "text-center" : ""}`}
          data-testid="nav-pqc-strip"
        >
          {!collapsed && (
            <p className="mb-1 truncate text-xs text-ink-muted" title={projectName}>
              {projectName}
            </p>
          )}
          <p className={`text-[11px] font-medium ${statusToneClass(cryptoStatus)}`}>
            {collapsed ? "PQC" : statusLine(cryptoStatus)}
          </p>
        </div>
      </div>
    </aside>
  );
}

function statusToneClass(status: string): string {
  if (status === "ready" || status === "saved" || status === "exported") return "text-emerald-600";
  if (status === "error") return "text-amber-600";
  return "text-ink-muted";
}

function statusLine(status: string): string {
  switch (status) {
    case "ready":
      return "ML-KEM + X25519 ready";
    case "saving":
    case "encrypting":
      return "Encrypting…";
    case "publishing":
      return "Publishing…";
    case "saved":
      return "Saved (verified)";
    case "exported":
      return "Exported ZIP";
    case "error":
      return "Crypto error";
    default:
      return "PQC idle";
  }
}

export type { ThemeMode } from "../../stores/editorStore";
