import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { CenterCanvas } from "../components/organisms/CenterCanvas";
import { EditorDndProvider } from "../components/organisms/EditorDndProvider";
import { LeftAssetSidebar } from "../components/organisms/LeftAssetSidebar";
import { ProjectsPanel } from "../components/organisms/ProjectsPanel";
import { PqcSecurityPanel } from "../components/organisms/PqcSecurityPanel";
import { RightPropertiesPanel } from "../components/organisms/RightPropertiesPanel";
import { TemplatesPanel } from "../components/organisms/TemplatesPanel";
import { PagesPanel } from "../components/organisms/PagesPanel";
import { TopBar } from "../components/organisms/TopBar";
import { AuthGate } from "../components/organisms/AuthGate";
import {
  getAuthMode,
  registerDevSession,
  registerSignPublicKey,
  type AuthSession,
} from "../api/auth";
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

async function completeSession(
  session: AuthSession,
  cancelled: () => boolean,
  setAuth: SetAuthFn,
  pushToast: PushToastFn
): Promise<void> {
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

async function bootstrapPqcSession(
  cancelled: () => boolean,
  setAuth: SetAuthFn,
  pushToast: PushToastFn
): Promise<void> {
  for (let attempts = 1; attempts <= MAX_AUTH_ATTEMPTS; attempts++) {
    if (cancelled()) return;
    try {
      const session = await registerDevSession();
      if (cancelled()) return;
      await completeSession(session, cancelled, setAuth, pushToast);
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

function failAuth(cancelled: () => boolean, pushToast: PushToastFn): void {
  console.error("[PQC] All auth attempts failed");
  if (cancelled()) return;
  useEditorStore.getState().setCryptoStatus("error", "API unavailable — start api-gateway");
  pushToast({
    tone: "error",
    message: "Session revoked or API unavailable — sign in again / start api-gateway",
  });
}

export function WorkspaceLayout() {
  const setAuth = useEditorStore((s) => s.setAuth);
  const pushToast = useEditorStore((s) => s.pushToast);
  const uiMode = useEditorStore((s) => s.uiMode);
  const authToken = useEditorStore((s) => s.authToken);
  const retryAuthRequested = useEditorStore((s) => s.retryAuthRequested);
  const authMode = getAuthMode();
  const [loginPending, setLoginPending] = useState(authMode === "login" && !authToken);

  useEffect(() => {
    if (authMode === "login") return;
    let cancelled = false;
    void bootstrapPqcSession(
      () => cancelled,
      setAuth,
      pushToast
    );
    return () => {
      cancelled = true;
    };
  }, [setAuth, pushToast, retryAuthRequested, authMode]);

  useEffect(() => {
    if (authMode === "login") {
      setLoginPending(!authToken);
    }
  }, [authMode, authToken]);

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

  if (loginPending) {
    return (
      <AuthGate
        onAuthenticated={(session) => {
          void completeSession(session, () => false, setAuth, pushToast).then(() => {
            setLoginPending(false);
          });
        }}
      />
    );
  }

  return (
    <AppShell>
      <TopBar />
      {uiMode === "templates" && <TemplatesPanel />}
      {uiMode === "projects" && <ProjectsPanel />}
      {uiMode === "pqc" && <PqcSecurityPanel />}
      {uiMode === "builder" && (
        <EditorDndProvider>
          <div className="flex min-h-0 flex-1 flex-col">
            <PagesPanel />
            <div className="flex min-h-0 flex-1">
              <LeftAssetSidebar />
              <CenterCanvas />
              <RightPropertiesPanel />
            </div>
          </div>
        </EditorDndProvider>
      )}
    </AppShell>
  );
}
