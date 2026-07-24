import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { CenterCanvas } from "../components/organisms/CenterCanvas";
import { EditorDndProvider } from "../components/organisms/EditorDndProvider";
import { LeftAssetSidebar } from "../components/organisms/LeftAssetSidebar";
import { ProjectsPanel } from "../components/organisms/ProjectsPanel";
import { PqcSecurityPanel } from "../components/organisms/PqcSecurityPanel";
import { RightPropertiesPanel } from "../components/organisms/RightPropertiesPanel";
import { TemplatesPanel } from "../components/organisms/TemplatesPanel";
import { TopBar } from "../components/organisms/TopBar";
import { registerDevSession, registerSignPublicKey } from "../api/auth";
import { generateSignKeypair } from "../crypto/pqcClient";
import { useEditorStore, type ToastTone } from "../stores/editorStore";

const MAX_AUTH_ATTEMPTS = 3;

type ToastInput = { tone: ToastTone; message: string };
type SetAuthFn = (
  token: string,
  signerPublicKeyId: string,
  kemPublicKeyB64: string,
  x25519PublicKeyB64: string
) => void;
type PushToastFn = (t: ToastInput) => void;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootstrapPqcSession(
  cancelled: () => boolean,
  setAuth: SetAuthFn,
  pushToast: PushToastFn
): Promise<void> {
  for (let attempts = 1; attempts <= MAX_AUTH_ATTEMPTS; attempts++) {
    if (cancelled()) return;
    try {
      await tryAuthOnce(cancelled, setAuth, pushToast);
      return;
    } catch (e) {
      console.error(`[PQC] Auth attempt ${attempts}/${MAX_AUTH_ATTEMPTS} failed:`, e);
      if (attempts >= MAX_AUTH_ATTEMPTS) {
        failAuth(cancelled, pushToast);
        return;
      }
      await delay(Math.pow(2, attempts - 1) * 1000);
    }
  }
}

async function tryAuthOnce(
  cancelled: () => boolean,
  setAuth: SetAuthFn,
  pushToast: PushToastFn
): Promise<void> {
  const session = await registerDevSession();
  if (cancelled()) return;
  const { publicKeyB64 } = await generateSignKeypair();
  if (cancelled()) return;
  await registerSignPublicKey(session.token, session.signerPublicKeyId, publicKeyB64);
  if (cancelled()) return;
  setAuth(session.token, session.signerPublicKeyId, session.kemPublicKeyB64, session.x25519PublicKeyB64);
  pushToast({
    tone: "success",
    message: "Hybrid PQC session ready — ML-KEM + X25519 + ML-DSA",
  });
}

function failAuth(cancelled: () => boolean, pushToast: PushToastFn): void {
  console.error("[PQC] All auth attempts failed");
  if (cancelled()) return;
  useEditorStore.getState().setCryptoStatus("error", "API unavailable — start api-gateway");
  pushToast({
    tone: "error",
    message: "API unavailable — start api-gateway / Docker stack",
  });
}

export function WorkspaceLayout() {
  const setAuth = useEditorStore((s) => s.setAuth);
  const pushToast = useEditorStore((s) => s.pushToast);
  const uiMode = useEditorStore((s) => s.uiMode);
  const retryAuthRequested = useEditorStore((s) => s.retryAuthRequested);

  useEffect(() => {
    let cancelled = false;
    void bootstrapPqcSession(
      () => cancelled,
      setAuth,
      pushToast
    );
    return () => {
      cancelled = true;
    };
  }, [setAuth, pushToast, retryAuthRequested]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }
      if (key === "z") {
        e.preventDefault();
        useEditorStore.getState().undo();
        return;
      }
      if (key === "y") {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <AppShell>
      <TopBar />
      {uiMode === "templates" && <TemplatesPanel />}
      {uiMode === "projects" && <ProjectsPanel />}
      {uiMode === "pqc" && <PqcSecurityPanel />}
      {uiMode === "builder" && (
        <EditorDndProvider>
          <div className="flex min-h-0 flex-1">
            <LeftAssetSidebar />
            <CenterCanvas />
            <RightPropertiesPanel />
          </div>
        </EditorDndProvider>
      )}
    </AppShell>
  );
}
