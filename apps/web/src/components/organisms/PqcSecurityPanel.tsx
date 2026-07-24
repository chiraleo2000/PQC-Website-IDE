import { useEffect, useState } from "react";
import { fetchSecurityAudit } from "../../api/auth";
import { useEditorStore } from "../../stores/editorStore";
import { Button } from "../atoms/Button";

export function PqcSecurityPanel() {
  const cryptoStatus = useEditorStore((s) => s.cryptoStatus);
  const cryptoError = useEditorStore((s) => s.cryptoError);
  const authToken = useEditorStore((s) => s.authToken);
  const signerPublicKeyId = useEditorStore((s) => s.signerPublicKeyId);
  const kemPublicKeyB64 = useEditorStore((s) => s.kemPublicKeyB64);
  const x25519PublicKeyB64 = useEditorStore((s) => s.x25519PublicKeyB64);
  const lastSyncedAt = useEditorStore((s) => s.lastSyncedAt);
  const lastPublishedAt = useEditorStore((s) => s.lastPublishedAt);
  const requestAuthRetry = useEditorStore((s) => s.requestAuthRetry);
  const setUiMode = useEditorStore((s) => s.setUiMode);
  const [audit, setAudit] = useState<
    Array<{ event: string; priority: string; at: string }>
  >([]);

  useEffect(() => {
    if (!authToken) {
      setAudit([]);
      return;
    }
    void fetchSecurityAudit(authToken, 12).then(setAudit);
  }, [authToken, lastSyncedAt, cryptoStatus]);

  const kemShort = kemPublicKeyB64
    ? `${kemPublicKeyB64.slice(0, 18)}…${kemPublicKeyB64.slice(-8)}`
    : "—";
  const x25519Short = x25519PublicKeyB64
    ? `${x25519PublicKeyB64.slice(0, 18)}…${x25519PublicKeyB64.slice(-8)}`
    : "—";

  return (
    <section className="flex-1 overflow-y-auto p-8" aria-label="PQC Security" data-testid="pqc-panel">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink">PQC Security</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Saves use <strong className="text-ink">true hybrid</strong> envelopes: ML-KEM-768 and X25519 must
          both be broken to recover the AES key, then ML-DSA-65 authenticates every sync. Classical-only
          RSA/ECC payloads are rejected.
        </p>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2">
          <Stat label="Session" value={authToken ? "Authenticated" : "Not ready"} ok={Boolean(authToken)} />
          <Stat label="Status" value={cryptoStatus} ok={cryptoStatus !== "error" && cryptoStatus !== "idle"} />
          <Stat label="ML-DSA key id" value={signerPublicKeyId ?? "—"} mono />
          <Stat label="ML-KEM public key" value={kemShort} mono />
          <Stat label="X25519 public key" value={x25519Short} mono />
          <Stat label="Mode" value="ML-KEM + X25519 hybrid · ML-DSA" ok />
          <Stat label="Last sync" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"} />
          <Stat
            label="Last publish"
            value={lastPublishedAt ? new Date(lastPublishedAt).toLocaleString() : "Never"}
          />
        </dl>

        <div className="mt-8" data-testid="pqc-audit-log">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Recent security events
          </h2>
          {audit.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No audit events for this session yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {audit.map((e) => (
                <li
                  key={`${e.at}-${e.event}`}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm"
                >
                  <span
                    className={
                      e.priority === "HIGH" ? "font-semibold text-amber-800" : "text-ink"
                    }
                  >
                    {e.event}
                  </span>
                  <span className="ml-2 text-xs text-ink-muted">{new Date(e.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cryptoError && (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            {cryptoError.includes("revok") || cryptoError.includes("403")
              ? "Session revoked — retry PQC session or sign in again."
              : cryptoError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button data-testid="pqc-retry-auth" onClick={() => requestAuthRetry()}>
            Retry PQC session
          </Button>
          <Button variant="ghost" onClick={() => setUiMode("builder")}>
            Back to builder
          </Button>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  mono,
  ok,
}: Readonly<{
  label: string;
  value: string;
  mono?: boolean;
  ok?: boolean;
}>) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono text-xs break-all" : ""} ${statValueTone(ok)}`}>
        {value}
      </dd>
    </div>
  );
}

function statValueTone(ok?: boolean): string {
  if (ok === true) return "text-emerald-700 dark:text-emerald-300";
  if (ok === false) return "text-amber-800 dark:text-amber-300";
  return "text-ink";
}
