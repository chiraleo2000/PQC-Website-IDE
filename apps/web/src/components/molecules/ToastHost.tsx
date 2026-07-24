import { useEffect } from "react";
import { useEditorStore, type ToastTone } from "../../stores/editorStore";

const TONE_CLASS: Record<ToastTone, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-amber-300 bg-amber-50 text-amber-950",
  info: "border-surface-border bg-surface-raised text-ink",
};

export function ToastHost() {
  const toasts = useEditorStore((s) => s.toasts);
  const dismissToast = useEditorStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts.at(-1);
    if (!latest) return;
    const timer = window.setTimeout(() => dismissToast(latest.id), 4500);
    return () => window.clearTimeout(timer);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <output
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-toast backdrop-blur ${TONE_CLASS[toast.tone]}`}
        >
          <p className="flex-1 text-sm leading-snug">{toast.message}</p>
          <div className="flex shrink-0 items-center gap-2">
            {toast.actionLabel && toast.action && (
              <button
                type="button"
                className="text-xs font-semibold underline underline-offset-2"
                onClick={() => {
                  toast.action?.();
                  dismissToast(toast.id);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              className="text-xs opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              ✕
            </button>
          </div>
        </output>
      ))}
    </div>
  );
}
