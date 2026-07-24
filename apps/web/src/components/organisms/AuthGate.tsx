import { useEffect, useState, type SubmitEvent } from "react";
import {
  fetchAuthConfig,
  isOidcUiEnabled,
  loginAccount,
  oidcLoginUrl,
  registerAccount,
  type AuthSession,
} from "../../api/auth";
import { Button } from "../atoms/Button";

type Props = Readonly<{
  onAuthenticated: (session: AuthSession) => void;
}>;

function submitButtonLabel(busy: boolean, mode: "login" | "register"): string {
  if (busy) return "Working…";
  if (mode === "login") return "Sign in";
  return "Create account";
}

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oidcReady, setOidcReady] = useState(false);

  useEffect(() => {
    void fetchAuthConfig().then((c) => setOidcReady(c.oidcConfigured && isOidcUiEnabled()));
  }, []);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session =
        mode === "login"
          ? await loginAccount(email, password)
          : await registerAccount(email, password);
      onAuthenticated(session);
    } catch {
      setError(mode === "login" ? "Invalid credentials" : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-cyan-50 px-4"
      data-testid="auth-gate"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-raised p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold tracking-tight text-ink">PQC Website IDE</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Sign in to start a hybrid ML-KEM + X25519 + ML-DSA session.
        </p>

        <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink-muted">
          <span>Email</span>
          <input
            data-testid="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink-muted">
          <span>Password</span>
          <input
            data-testid="auth-password"
            type="password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink"
          />
        </label>

        {error && (
          <p className="mt-3 text-sm text-amber-800" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button data-testid="auth-submit" type="submit" disabled={busy}>
            {submitButtonLabel(busy, mode)}
          </Button>
          <Button
            type="button"
            variant="ghost"
            data-testid="auth-toggle-mode"
            onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          >
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </Button>
        </div>

        <div className="mt-6 border-t border-surface-border pt-4">
          <Button
            type="button"
            variant="ghost"
            data-testid="auth-oidc"
            disabled={!oidcReady}
            title={
              oidcReady
                ? "Continue with OIDC"
                : "OIDC not configured (set OIDC_* env + VITE_OIDC_ENABLED=true)"
            }
            onClick={() => {
              window.location.href = oidcLoginUrl();
            }}
          >
            Continue with OIDC
          </Button>
          {!oidcReady && (
            <p className="mt-2 text-xs text-ink-muted">
              OIDC hook available — configure issuer/client to enable.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
