import type { ReactNode } from "react";
import { LeftNav } from "../components/organisms/LeftNav";
import { ToastHost } from "../components/molecules/ToastHost";
import { PreviewModal } from "../components/organisms/PreviewModal";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface font-sans text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2 focus:text-zinc-950"
      >
        Skip to canvas
      </a>
      <LeftNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      <ToastHost />
      <PreviewModal />
    </div>
  );
}
