# AST Canvas & Drag-and-Drop Engine

**Task:** Core low-code drag-and-drop canvas driven by JSON AST (not raw HTML strings).  
**Context:** Virtualize above 1000 nodes; `@dnd-kit/core` for accessible DnD.  
**Deliverable:** React mapping AST → components, drop handling at explicit child indices — implemented in `apps/web/src/canvas/` and `editorStore`.

---

## 1. Data model (no HTML strings)

The canvas never parses or injects HTML. State is an **`AstRoot`**:

```json
{
  "version": 1,
  "root": {
    "id": "uuid",
    "type": "section",
    "props": { "className": "min-h-screen bg-zinc-950" },
    "children": [
      {
        "id": "uuid",
        "type": "nav",
        "props": { "className": "flex gap-4 p-4" },
        "children": []
      }
    ]
  }
}
```

| Field | Meaning |
|-------|---------|
| `type` | Palette component id (`nav`, `header`, `p`, …) |
| `props` | Serializable attributes (`className`, `children` text, `src`, …) |
| `children` | Ordered array of child nodes |

Schema and helpers: [`packages/shared/src/ast.ts`](../packages/shared/src/ast.ts) — `createNode`, `insertChild`, `removeNode`, `countNodes`, `cloneAst`.

---

## 2. Architecture overview

```mermaid
flowchart LR
  Palette[LeftAssetSidebar useDraggable]
  Dnd[DndContext CenterCanvas]
  Store[editorStore.insertNodeAt]
  AST[(ast.root JSON)]
  Render[AstRenderer / VirtualizedCanvas]
  Reg[ComponentRegistry]

  Palette -->|drag| Dnd
  Dnd -->|drop index| Store
  Store --> AST
  AST --> Render
  Render --> Reg
```

| Layer | File | Role |
|-------|------|------|
| DnD orchestration | [`CenterCanvas.tsx`](../apps/web/src/components/organisms/CenterCanvas.tsx) | Sensors, drag start/end, virtual threshold |
| AST → React | [`AstRenderer.tsx`](../apps/web/src/canvas/AstRenderer.tsx) | Drop zones + recursive preview |
| Tag mapping | [`ComponentRegistry.tsx`](../apps/web/src/canvas/ComponentRegistry.tsx) | `type` → `<nav>`, `<p>`, etc. |
| Virtualized path | [`VirtualizedCanvas.tsx`](../apps/web/src/canvas/VirtualizedCanvas.tsx) | Flat list + `@tanstack/react-virtual` |
| State mutations | [`editorStore.ts`](../apps/web/src/stores/editorStore.ts) | `insertNodeAt`, `moveNode` |

---

## 3. Mapping AST → renderable components

[`ComponentRegistry.tsx`](../apps/web/src/canvas/ComponentRegistry.tsx) exports `renderAstNode(node, opts)`:

- Maps `type` to intrinsic elements (`nav`, `header`, `section`, `form`, …).
- Applies selection chrome: `ring-accent`, `aria-selected`, keyboard `Enter`/`Space`.
- Semantic demo types (`blogFeed`, `blogCard`) map to `div` + `data-demo` attributes.

```tsx
// Simplified pattern
export function renderAstNode(node: AstNode, opts: RenderOpts): ReactElement {
  switch (node.type) {
    case "nav":
      return <nav key={node.id} {...common}>{children}</nav>;
    // ...
  }
}
```

The live tree is read from Zustand via `useAstRoot()` so only the canvas subtree re-renders when `ast` changes.

---

## 4. Drag-and-drop (`@dnd-kit/core`)

### 4.1 Palette drag source

[`LeftAssetSidebar.tsx`](../apps/web/src/components/organisms/LeftAssetSidebar.tsx):

```tsx
useDraggable({
  id: `palette-${type}`,
  data: { type, fromPalette: true },
});
```

Example: **Navigation Bar** → `type: "nav"`, label from `PALETTE_COMPONENTS`.

### 4.2 Drop targets

[`AstRenderer.tsx`](../apps/web/src/canvas/AstRenderer.tsx) — `DropZone` per sibling index:

```tsx
useDroppable({
  id: `drop-${parentId}-${index}`,
  data: { parentId, index },
});
```

- `parentId` — AST node that will receive the new child  
- `index` — position in `parent.children` (0 = first, `length` = append)

Root canvas is also droppable (`canvas-root` → append to `root.children`).

### 4.3 Drag end → AST insert

[`CenterCanvas.tsx`](../apps/web/src/components/organisms/CenterCanvas.tsx):

```tsx
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;
  const activeData = active.data.current;
  const overData = over.data.current;
  if (!activeData?.fromPalette || !overData?.parentId) return;

  insertNodeAt(
    String(overData.parentId),
    Number(overData.index),
    String(activeData.type)
  );
}
```

`PointerSensor` with **8px** activation distance avoids accidental drags (WCAG-friendly click vs drag).

---

## 5. Inserting at a specific index

### 5.1 Store API

[`editorStore.ts`](../apps/web/src/stores/editorStore.ts):

```ts
insertNodeAt(parentId: string, index: number, type: string): void
```

Implementation:

1. `cloneAst(ast.root)` — immutable copy  
2. `findNodeById` → parent  
3. `insertChild(parent, index, createNode(type))` — splice into `children`  
4. `set({ ast: { ...ast, root } })`

Shared helper [`insertChild`](../packages/shared/src/ast.ts):

```ts
export function insertChild(parent: AstNode, index: number, node: AstNode): AstNode {
  const children = [...parent.children];
  children.splice(index, 0, node);
  return { ...parent, children };
}
```

### 5.2 Example: drop Navigation Bar as first child

```ts
// After dropping on drop zone with parentId = section.id, index = 0
insertNodeAt(sectionId, 0, "nav");
// ast.root.children[0].type === "nav"
```

Unit test: [`editorStore.test.ts`](../apps/web/src/stores/editorStore.test.ts) — `"inserts Navigation Bar at index 1 in main"`.

### 5.3 Reordering (move)

`moveNode(nodeId, newParentId, newIndex)` — removes node from old parent, inserts at new index (same immutable pattern).

---

## 6. Virtualization (> 1000 nodes)

[`CenterCanvas.tsx`](../apps/web/src/components/organisms/CenterCanvas.tsx):

```ts
const VIRTUALIZE_THRESHOLD = 1000;
const useVirtual = countNodes(root) > VIRTUALIZE_THRESHOLD;
```

| Mode | Component | Behavior |
|------|-----------|----------|
| ≤ 1000 nodes | `AstRenderer` | Full tree + **dnd-kit drop zones** |
| > 1000 nodes | `VirtualizedCanvas` | Flatten AST, `useVirtualizer`, ~48px row estimate, overscan 10 |

Virtual mode renders visible rows with `renderAstNode` for preview and selection. **DnD drop zones are disabled** in virtual mode (documented limitation); shrink tree or use non-virtual path for structural edits.

---

## 7. Accessibility

| Feature | Implementation |
|---------|----------------|
| Draggable palette | `<button>` + `aria-label="Drag {label} to canvas"` + `aria-grabbed` |
| Drop feedback | Highlight on `isOver` (visual only; zones `aria-hidden`) |
| Canvas region | `role="region"`, `aria-label="Page canvas"` |
| Node selection | `role="group"`, `tabIndex={0}`, keyboard activation |

---

## 8. File reference

```
apps/web/src/
  components/organisms/CenterCanvas.tsx   # DndContext, threshold
  canvas/
    AstRenderer.tsx                       # Drop zones + tree render
    VirtualizedCanvas.tsx                 # >1000 nodes
    ComponentRegistry.tsx                 # type → JSX
  stores/editorStore.ts                   # insertNodeAt, moveNode

packages/shared/src/ast.ts                # AST schema & pure functions
```

---

## 9. Tests

```bash
pnpm --filter @pqc/web test
```

- `editorStore.test.ts` — insert at index, props update, remove  
- `AstRenderer.test.tsx` — click selects node  

E2E drag: [`apps/e2e/tests/ide-save-flow.spec.ts`](../apps/e2e/tests/ide-save-flow.spec.ts) — Playwright `dragTo` palette → canvas.
