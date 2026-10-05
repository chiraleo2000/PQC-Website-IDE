import { useEditorStore, useAstRoot } from "../../stores/editorStore";
import { renderAstNode } from "../../canvas/ComponentRegistry";
import { Button } from "../atoms/Button";
import { exportProjectZip, syncProject } from "../../api/projects";

export function PreviewModal() {
  const open = useEditorStore((s) => s.previewOpen);
  const setPreviewOpen = useEditorStore((s) => s.setPreviewOpen);
  const previewWidth = useEditorStore((s) => s.previewWidth);
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth);
  const root = useAstRoot();
  const projectId = useEditorStore((s) => s.projectId);
  const projectName = useEditorStore((s) => s.projectName);
  const authToken = useEditorStore((s) => s.authToken);
  const signerPublicKeyId = useEditorStore((s) => s.signerPublicKeyId);
  const kemPublicKeyB64 = useEditorStore((s) => s.kemPublicKeyB64);
  const x25519PublicKeyB64 = useEditorStore((s) => s.x25519PublicKeyB64);
  const ast = useEditorStore((s) => s.ast);
  const setCryptoStatus = useEditorStore((s) => s.setCryptoStatus);
  const markSynced = useEditorStore((s) => s.markSynced);
  const pushToast = useEditorStore((s) => s.pushToast);
  const publishedUrl = useEditorStore((s) => s.publishedUrl);

  if (!open) return null;

  async function handleExport() {
    if (!authToken || !signerPublicKeyId || !kemPublicKeyB64 || !x25519PublicKeyB64) {
      pushToast({ tone: "error", message: "PQC session required to export" });
      return;
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
        projectName,
      });
      markSynced();
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
    <dialog
      open
      className="fixed inset-0 z-[70] m-0 flex h-full max-h-none w-full max-w-none flex-col bg-black/70 p-0 backdrop-blur-sm"
      aria-label="Site preview"
      data-testid="preview-modal"
    >
      <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-raised px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Preview — {projectName}</p>
          <p className="text-xs text-ink-muted">Live canvas render · Export uses server compiler + PQC sync</p>
          {publishedUrl && (
            <a
              className="text-xs text-accent underline"
              href={publishedUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="published-url"
            >
              {publishedUrl}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn-soft ${previewWidth === "desktop" ? "ring-1 ring-accent" : ""}`}
            onClick={() => setPreviewWidth("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={`btn-soft ${previewWidth === "mobile" ? "ring-1 ring-accent" : ""}`}
            onClick={() => setPreviewWidth("mobile")}
          >
            Mobile
          </button>
          <Button variant="ghost" data-testid="preview-export" onClick={() => void handleExport()}>
            Export ZIP
          </Button>
          <Button variant="ghost" data-testid="preview-close" onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-6">
        <div
          className={`page-paper min-h-[70vh] overflow-auto rounded-2xl shadow-2xl ${
            previewWidth === "mobile" ? "w-[390px]" : "w-full max-w-5xl"
          }`}
        >
          <div className="p-4">
            {renderAstNode(root, {
              selectedId: null,
              onSelect: () => undefined,
              depth: 0,
              interactive: false,
            })}
          </div>
        </div>
      </div>
    </dialog>
  );
}
