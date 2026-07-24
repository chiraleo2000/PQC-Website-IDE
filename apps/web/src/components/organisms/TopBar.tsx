import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { useEditorStore, useProjectMeta, type CryptoStatus } from "../../stores/editorStore";
import { exportProjectZip, publishProject, syncProject } from "../../api/projects";

const statusLabels: Record<
  CryptoStatus,
  { label: string; tone: "neutral" | "success" | "warning" }
> = {
  idle: { label: "PQC idle", tone: "neutral" },
  ready: { label: "ML-KEM + X25519 hybrid", tone: "success" },
  encrypting: { label: "Encrypting…", tone: "warning" },
  saving: { label: "Hybrid encrypt & sync…", tone: "warning" },
  publishing: { label: "Signing publish…", tone: "warning" },
  saved: { label: "Saved — hybrid PQC verified", tone: "success" },
  exported: { label: "Exported ZIP", tone: "success" },
  error: { label: "Crypto error", tone: "warning" },
};

export function TopBar() {
  const meta = useProjectMeta();
  const {
    projectName,
    cryptoStatus,
    cryptoError,
    projectId,
    authToken,
    signerPublicKeyId,
    kemPublicKeyB64,
    x25519PublicKeyB64,
    dirty,
  } = meta;
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const setCryptoStatus = useEditorStore((s) => s.setCryptoStatus);
  const setPreviewOpen = useEditorStore((s) => s.setPreviewOpen);
  const pushToast = useEditorStore((s) => s.pushToast);
  const markSynced = useEditorStore((s) => s.markSynced);
  const markPublished = useEditorStore((s) => s.markPublished);
  const loadDemoTemplate = useEditorStore((s) => s.loadDemoTemplate);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const ast = useEditorStore((s) => s.ast);
  const status = statusLabels[cryptoStatus];
  const cryptoReady = Boolean(authToken && signerPublicKeyId && kemPublicKeyB64 && x25519PublicKeyB64);
  const busy =
    cryptoStatus === "saving" ||
    cryptoStatus === "publishing" ||
    cryptoStatus === "encrypting";

  async function handleSave(): Promise<boolean> {
    if (!authToken || !signerPublicKeyId || !kemPublicKeyB64 || !x25519PublicKeyB64) {
      setCryptoStatus("error", "Register keys first (dev: auto on load)");
      pushToast({ tone: "error", message: "PQC keys not ready — start api-gateway" });
      return false;
    }
    setCryptoStatus("saving");
    try {
      await syncProject({
        projectId,
        ast,
        authToken,
        signerPublicKeyId,
        serverKemPublicKeyB64: kemPublicKeyB64,
        serverX25519PublicKeyB64: x25519PublicKeyB64,
      });
      markSynced();
      pushToast({
        tone: "success",
        message: "Saved — hybrid PQC verified (ML-KEM-768 + X25519 + ML-DSA-65)",
      });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setCryptoStatus("error", message);
      pushToast({ tone: "error", message });
      return false;
    }
  }

  async function handlePublish() {
    if (!authToken || !signerPublicKeyId) {
      setCryptoStatus("error", "Register keys first (dev: auto on load)");
      pushToast({ tone: "error", message: "PQC keys not ready — cannot publish" });
      return;
    }
    const saved = dirty ? await handleSave() : true;
    if (!saved && dirty) return;

    setCryptoStatus("publishing");
    try {
      const result = await publishProject({
        projectId,
        authToken,
        signerPublicKeyId,
      });
      markPublished(result.publishedAt);
      pushToast({
        tone: "success",
        message: `Published ${new Date(result.publishedAt).toLocaleString()}`,
        actionLabel: "Preview",
        action: () => setPreviewOpen(true),
      });
      setPreviewOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Publish failed";
      console.error("[PQC] Publish failed:", e);
      setCryptoStatus("error", message);
      pushToast({ tone: "error", message });
    }
  }

  async function handleExport() {
    if (!authToken) {
      pushToast({ tone: "error", message: "Sign in / PQC session required to export" });
      return;
    }
    const saved = await handleSave();
    if (!saved) return;
    try {
      await exportProjectZip({ projectId, authToken, projectName });
      setCryptoStatus("exported");
      pushToast({ tone: "success", message: "Compiled HTML ZIP downloaded" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export failed";
      setCryptoStatus("error", message);
      pushToast({ tone: "error", message });
    }
  }

  return (
    <header
      className="panel flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-3">
        <label className="sr-only" htmlFor="project-name">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="field-input max-w-xs truncate"
          aria-label="Project name"
        />
        {dirty && (
          <span className="hidden text-xs text-amber-600 sm:inline" title="Unsaved local changes">
            Unsaved
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          data-testid="undo-action"
          onClick={() => undo()}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          data-testid="redo-action"
          onClick={() => redo()}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          Redo
        </Button>
        <Badge label={status.label} tone={status.tone} data-testid="pqc-status-badge" />
        {cryptoError && (
          <span className="max-w-[12rem] truncate text-xs text-amber-600" role="alert" title={cryptoError}>
            {cryptoError}
          </span>
        )}
        <select
          className="field-input w-auto py-1.5 text-xs"
          aria-label="Load demo template"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "login" || v === "blog") loadDemoTemplate(v);
            e.target.value = "";
          }}
        >
          <option value="">Load template…</option>
          <option value="login">Login page</option>
          <option value="blog">Blog feed</option>
        </select>
        <Button
          variant="ghost"
          data-testid="preview-open"
          onClick={() => setPreviewOpen(true)}
          aria-label="Preview site"
        >
          Preview
        </Button>
        <Button
          variant="ghost"
          data-testid="export-project"
          onClick={() => void handleExport()}
          disabled={!cryptoReady || busy}
          aria-label="Export compiled HTML zip"
          title={cryptoReady ? "Save then download ZIP" : "PQC session required"}
        >
          Export
        </Button>
        <Button
          variant="ghost"
          data-testid="save-project"
          onClick={() => void handleSave()}
          disabled={!cryptoReady || busy}
          aria-label="Save project with PQC encryption"
          title={cryptoReady ? "Encrypt AST with ML-KEM + sign ML-DSA" : "Waiting for PQC keys"}
        >
          Save
        </Button>
        <Button
          data-testid="publish-project"
          onClick={() => void handlePublish()}
          disabled={!cryptoReady || busy}
          aria-label="Publish project"
          title={cryptoReady ? "Sign publish intent (ML-DSA)" : "Waiting for PQC keys"}
        >
          Publish
        </Button>
      </div>
    </header>
  );
}

/** Backward-compatible alias for existing tests. */
export { TopBar as Header };
