import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  type AstNode,
  type AstRoot,
  createDefaultRoot,
  createNode,
  createSectionPreset,
  findNode,
  findParent as findParentInTree,
  insertChild,
  loadTemplate,
  removeNode,
  type SectionPresetId,
  updateNodeProps,
} from "@pqc/shared";

export type CryptoStatus =
  | "idle"
  | "ready"
  | "encrypting"
  | "saving"
  | "publishing"
  | "saved"
  | "exported"
  | "error";

export type UiMode = "builder" | "templates" | "projects" | "pqc";
export type ThemeMode = "light" | "dark";
export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  action?: () => void;
}

export interface ProjectIndexEntry {
  id: string;
  name: string;
  updatedAt: string;
}

type HistorySnapshot = { ast: AstRoot; projectName: string; selectedNodeId: string | null };

const PROJECTS_KEY = "pqc-ide-project-index";
const AST_PREFIX = "pqc-ide-ast:";
const THEME_KEY = "pqc-ide-theme";
const HISTORY_CAP = 50;

function readProjectIndex(): ProjectIndexEntry[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProjectIndex(index: ProjectIndexEntry[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(index));
}

function readLocalAst(id: string): AstRoot | null {
  try {
    const raw = localStorage.getItem(AST_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as AstRoot;
  } catch {
    return null;
  }
}

function writeLocalAst(id: string, ast: AstRoot) {
  localStorage.setItem(AST_PREFIX + id, JSON.stringify(ast));
}

function readTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

function emptyRoot(): AstRoot {
  return {
    version: 1,
    root: {
      id: crypto.randomUUID(),
      type: "section",
      props: { className: "min-h-screen bg-white text-zinc-900" },
      children: [],
    },
  };
}

function cloneAst(ast: AstRoot): AstRoot {
  return structuredClone(ast);
}

interface EditorState {
  projectId: string;
  projectName: string;
  ast: AstRoot;
  selectedNodeId: string | null;
  cryptoStatus: CryptoStatus;
  cryptoError: string | null;
  authToken: string | null;
  signerPublicKeyId: string | null;
  kemPublicKeyB64: string | null;
  x25519PublicKeyB64: string | null;
  uiMode: UiMode;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  previewOpen: boolean;
  previewWidth: "desktop" | "mobile";
  dirty: boolean;
  lastSyncedAt: string | null;
  lastPublishedAt: string | null;
  projectIndex: ProjectIndexEntry[];
  toasts: ToastItem[];
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  setProjectName: (name: string) => void;
  selectNode: (id: string | null) => void;
  insertNodeAt: (parentId: string, index: number, type: string) => void;
  insertPresetAt: (parentId: string, index: number, presetId: SectionPresetId) => void;
  moveNode: (nodeId: string, newParentId: string, newIndex: number) => void;
  updateSelectedProps: (props: Record<string, unknown>) => void;
  removeSelected: () => void;
  setAstRoot: (root: AstNode) => void;
  setCryptoStatus: (status: CryptoStatus, error?: string | null) => void;
  setAuth: (
    token: string,
    signerPublicKeyId: string,
    kemPublicKeyB64: string,
    x25519PublicKeyB64: string
  ) => void;
  setUiMode: (mode: UiMode) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setPreviewWidth: (width: "desktop" | "mobile") => void;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  newProject: () => void;
  loadDemoTemplate: (name: "login" | "blog") => void;
  switchProject: (id: string) => void;
  persistCurrentProject: () => void;
  markSynced: () => void;
  markPublished: (publishedAt: string) => void;
  undo: () => void;
  redo: () => void;
  retryAuthRequested: number;
  requestAuthRetry: () => void;
}

const defaultAst = createDefaultRoot();
const initialTheme = typeof localStorage !== "undefined" ? readTheme() : "light";
if (typeof document !== "undefined") {
  applyThemeToDocument(initialTheme);
}

function pushHistory(get: () => EditorState, set: (partial: Partial<EditorState>) => void) {
  const { ast, projectName, selectedNodeId, past } = get();
  const snapshot: HistorySnapshot = {
    ast: cloneAst(ast),
    projectName,
    selectedNodeId,
  };
  set({
    past: [...past, snapshot].slice(-HISTORY_CAP),
    future: [],
  });
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: crypto.randomUUID(),
  projectName: "Untitled Site",
  ast: defaultAst,
  selectedNodeId: null,
  cryptoStatus: "idle",
  cryptoError: null,
  authToken: null,
  signerPublicKeyId: null,
  kemPublicKeyB64: null,
  x25519PublicKeyB64: null,
  uiMode: "builder",
  theme: initialTheme,
  sidebarCollapsed: false,
  previewOpen: false,
  previewWidth: "desktop",
  dirty: false,
  lastSyncedAt: null,
  lastPublishedAt: null,
  projectIndex: typeof localStorage !== "undefined" ? readProjectIndex() : [],
  toasts: [],
  past: [],
  future: [],
  retryAuthRequested: 0,

  setProjectName: (name) => {
    pushHistory(get, set);
    set({ projectName: name, dirty: true });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  insertNodeAt: (parentId, index, type) => {
    const { ast } = get();
    const parent = findNode(ast.root, parentId);
    if (!parent) return;
    pushHistory(get, set);
    const updatedParent = insertChild(parent, index, createNode(type));
    set({
      dirty: true,
      ast: { ...ast, root: replaceNodeInTree(ast.root, parentId, updatedParent) },
    });
  },

  insertPresetAt: (parentId, index, presetId) => {
    const { ast } = get();
    const parent = findNode(ast.root, parentId);
    if (!parent) return;
    pushHistory(get, set);
    const preset = createSectionPreset(presetId);
    const updatedParent = insertChild(parent, index, preset);
    set({
      dirty: true,
      selectedNodeId: preset.id,
      ast: { ...ast, root: replaceNodeInTree(ast.root, parentId, updatedParent) },
    });
  },

  moveNode: (nodeId, newParentId, newIndex) => {
    const { ast } = get();
    const located = findParentInTree(ast.root, nodeId);
    if (!located) return;
    const node = located.parent.children[located.index];
    const rootWithout = removeNode(ast.root, nodeId);
    const newParent = findNode(rootWithout, newParentId);
    if (!newParent || node.id === newParentId) return;
    pushHistory(get, set);
    const updatedParent = insertChild(newParent, newIndex, node);
    set({
      dirty: true,
      ast: { ...ast, root: replaceNodeInTree(rootWithout, newParentId, updatedParent) },
    });
  },

  updateSelectedProps: (props) => {
    const { ast, selectedNodeId } = get();
    if (!selectedNodeId) return;
    pushHistory(get, set);
    set({
      dirty: true,
      ast: { ...ast, root: updateNodeProps(ast.root, selectedNodeId, props) },
    });
  },

  removeSelected: () => {
    const { ast, selectedNodeId } = get();
    if (!selectedNodeId || ast.root.id === selectedNodeId) return;
    pushHistory(get, set);
    set({
      dirty: true,
      ast: { ...ast, root: removeNode(ast.root, selectedNodeId) },
      selectedNodeId: null,
    });
  },

  setAstRoot: (root) => {
    pushHistory(get, set);
    set({ ast: { version: 1, root }, dirty: true, selectedNodeId: null });
  },

  setCryptoStatus: (cryptoStatus, cryptoError = null) => set({ cryptoStatus, cryptoError }),

  setAuth: (authToken, signerPublicKeyId, kemPublicKeyB64, x25519PublicKeyB64) =>
    set({
      authToken,
      signerPublicKeyId,
      kemPublicKeyB64,
      x25519PublicKeyB64,
      cryptoStatus: "ready",
      cryptoError: null,
    }),

  setUiMode: (uiMode) => set({ uiMode }),

  setTheme: (theme) => {
    applyThemeToDocument(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setPreviewWidth: (previewWidth) => set({ previewWidth }),

  pushToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }].slice(-5),
    })),

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  newProject: () => {
    pushHistory(get, set);
    const projectId = crypto.randomUUID();
    const ast = emptyRoot();
    set({
      projectId,
      projectName: "Untitled Site",
      ast,
      selectedNodeId: null,
      dirty: true,
      lastSyncedAt: null,
      lastPublishedAt: null,
      uiMode: "builder",
      cryptoStatus: get().authToken ? "ready" : get().cryptoStatus,
      future: [],
    });
    get().pushToast({ tone: "info", message: "New blank project created" });
  },

  loadDemoTemplate: (name) => {
    pushHistory(get, set);
    const template = loadTemplate(name);
    const projectName = name === "login" ? "Login Demo" : "Blog Demo";
    set({
      ast: { version: 1, root: template.root },
      projectName,
      selectedNodeId: null,
      dirty: true,
      uiMode: "builder",
    });
    get().persistCurrentProject();
    get().pushToast({ tone: "success", message: `Loaded ${projectName} template` });
  },

  switchProject: (id) => {
    const entry = get().projectIndex.find((p) => p.id === id);
    const ast = readLocalAst(id);
    if (!entry || !ast) {
      get().pushToast({ tone: "error", message: "Project snapshot not found locally" });
      return;
    }
    pushHistory(get, set);
    set({
      projectId: id,
      projectName: entry.name,
      ast,
      selectedNodeId: null,
      dirty: false,
      uiMode: "builder",
      lastSyncedAt: entry.updatedAt,
    });
    get().pushToast({ tone: "info", message: `Opened “${entry.name}”` });
  },

  persistCurrentProject: () => {
    const { projectId, projectName, ast, projectIndex } = get();
    const updatedAt = new Date().toISOString();
    writeLocalAst(projectId, ast);
    const next: ProjectIndexEntry[] = [
      { id: projectId, name: projectName, updatedAt },
      ...projectIndex.filter((p) => p.id !== projectId),
    ].slice(0, 20);
    writeProjectIndex(next);
    set({ projectIndex: next });
  },

  markSynced: () => {
    const at = new Date().toISOString();
    set({ dirty: false, lastSyncedAt: at, cryptoStatus: "saved" });
    get().persistCurrentProject();
  },

  markPublished: (publishedAt) => {
    set({ lastPublishedAt: publishedAt, cryptoStatus: "saved" });
    get().persistCurrentProject();
  },

  undo: () => {
    const { past, future, ast, projectName, selectedNodeId } = get();
    if (past.length === 0) return;
    const previous = past.at(-1)!;
    set({
      past: past.slice(0, -1),
      future: [{ ast: cloneAst(ast), projectName, selectedNodeId }, ...future].slice(0, HISTORY_CAP),
      ast: previous.ast,
      projectName: previous.projectName,
      selectedNodeId: previous.selectedNodeId,
      dirty: true,
    });
  },

  redo: () => {
    const { past, future, ast, projectName, selectedNodeId } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      past: [...past, { ast: cloneAst(ast), projectName, selectedNodeId }].slice(-HISTORY_CAP),
      ast: next.ast,
      projectName: next.projectName,
      selectedNodeId: next.selectedNodeId,
      dirty: true,
    });
  },

  requestAuthRetry: () => set((s) => ({ retryAuthRequested: s.retryAuthRequested + 1 })),
}));

function replaceNodeInTree(root: AstNode, id: string, replacement: AstNode): AstNode {
  if (root.id === id) return replacement;
  return {
    ...root,
    children: root.children.map((c) => replaceNodeInTree(c, id, replacement)),
  };
}

export function useSelectedNode() {
  return useEditorStore(
    useShallow((s) => {
      if (!s.selectedNodeId) return null;
      return findNode(s.ast.root, s.selectedNodeId);
    })
  );
}

export function useAstRoot() {
  return useEditorStore((s) => s.ast.root);
}

export function useProjectMeta() {
  return useEditorStore(
    useShallow((s) => ({
      projectId: s.projectId,
      projectName: s.projectName,
      cryptoStatus: s.cryptoStatus,
      cryptoError: s.cryptoError,
      authToken: s.authToken,
      signerPublicKeyId: s.signerPublicKeyId,
      kemPublicKeyB64: s.kemPublicKeyB64,
      x25519PublicKeyB64: s.x25519PublicKeyB64,
      dirty: s.dirty,
      lastSyncedAt: s.lastSyncedAt,
      lastPublishedAt: s.lastPublishedAt,
    }))
  );
}
