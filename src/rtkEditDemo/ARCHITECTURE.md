# RTKEditDemo Architecture

## Layer Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                              RTKEditDemo                                          ║
║  [Simulate: remote (non-conflict)]  [Simulate: remote (conflict)]  [Clear log]   ║
║  [N pending changes chip]                                                         ║
╠═══════════════════════════════════════╦═══════════════╦═══════════════════════════╣
║            GridPanel                  ║  StatusPanel  ║      Operation Log        ║
║  Toolbar: [+ Add Task]  [Delete]      ║  [Undo n]     ║  [merge/edit/add/...] ... ║
║                                       ║  [Redo n]     ║                           ║
║  AgGridReact (L4 Tasks)               ║  [Save (n)]   ║                           ║
║  cols: Division, Project, Task Name   ║               ║                           ║
║        Status, Assignee, Due, Priority║  new rows     ║                           ║
║  renderer: DirtyCell                  ║  deleted ids  ║                           ║
║    ← reads state.edits.patches        ║  dirty cells  ║                           ║
║      (via store, no context prop)     ║  (conflicts)  ║                           ║
║  new rows: green background           ║               ║                           ║
║                                       ║               ║                           ║
║  (row selected) ──► SubtaskGrid       ║               ║                           ║
║  ┌─────────────────────────────────┐  ║               ║                           ║
║  │ Toolbar: [+ Add Subtask][Delete]│  ║               ║                           ║
║  │          [↩ Undo n][Redo n ↪]  │  ║               ║                           ║
║  │                                 │  ║               ║                           ║
║  │ AgGridReact (L5 Subtasks)       │  ║               ║                           ║
║  │ fetched via subtaskApi          │  ║               ║                           ║
║  │ renderer: DirtyCell             │  ║               ║                           ║
║  │   ← reads context.patches       │  ║               ║                           ║
║  │     (editsSubtasks, not store)  │  ║               ║                           ║
║  │ new subtasks: green background  │  ║               ║                           ║
║  └─────────────────────────────────┘  ║               ║                           ║
╚═══════════════════════════════════════╩═══════════════╩═══════════════════════════╝
  ▲ rowData via makeTaskRowSelector         ▲ selectAllDirtyPaths / raw edits state
  │                                         │
  │   dispatch(cellEdited/rowAdded/…) ──────┼──────────────────────────────────────►
  │                                         │                                        │
  │   SubtaskGrid: rowData via useMemo      │   dispatch(subtaskCellEdited/…) ───►  │
  │   (inline, not via selectors.ts)        │                                        │
  │                                         │                                        ▼
╔═╧═══════════════════════════════════════╗ │         ╔══════════════════════════════╗
║             selectors.ts                ║ │         ║  (subtask actions go direct) ║
║  makeTaskRowSelector(docId)             ║ │         ╚══════════════════════════════╝
║    inputs: serverDoc, patches,          ║ │
║            createdRows, deletedRowIds   ║ │
║    1. flattenToTaskRows(serverDoc)      ║ │
║    2. filter deletedRowIds              ║ │
║    3. overlay patches per row           ║ │
║    4. append patched createdRows        ║ │
║  selectEditEntry / selectAllDirtyPaths  ║ │
╚═╤═══════════════════════════════════════╝ │
  │ reads                                   │ dispatches
  ▼                                         ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                               Redux Store                                         ║
║                                                                                   ║
║  ┌─────────────────────────────────────┐  ┌──────────────────────────────────┐   ║
║  │  edits  (task-level)                │  │  editsSubtasks  (subtask-level)  │   ║
║  │  ← createEditsSlice('edits')        │  │  ← createEditsSlice('editsSubtasks') ║
║  │                                     │  │                                  │   ║
║  │  patches, createdRows,              │  │  patches, createdRows,           │   ║
║  │  deletedRowIds, undoStack,          │  │  deletedRowIds, undoStack,       │   ║
║  │  redoStack, log                     │  │  redoStack, log                  │   ║
║  │                                     │  │                                  │   ║
║  │  Actions: cellEdited  batchEdited   │  │  Actions: subtaskCellEdited      │   ║
║  │    rowAdded  rowDeleted             │  │    subtaskBatchEdited            │   ║
║  │    mergeRemote  undo  redo          │  │    subtaskRowAdded/Deleted       │   ║
║  │    saveSuccess  clearLog            │  │    subtaskUndo/Redo              │   ║
║  └─────────────────────────────────────┘  └──────────────────────────────────┘   ║
║       shared factory: createEditsSlice(name) in editsSlice.ts                    ║
║       same reducer logic, two independent state trees                             ║
║                                                                                   ║
║  ┌─────────────────────────────────────┐  ┌──────────────────────────────────┐   ║
║  │  documentApi  (RTK Query)           │  │  subtaskApi  (RTK Query)         │   ║
║  │  keepUnusedDataFor: Infinity        │  │  keepUnusedDataFor: Infinity     │   ║
║  │  getDocument(docId)                 │  │  getSubtasksByTask(taskId)       │   ║
║  │  saveDocument(doc) — 700ms delay    │  │  saveSubtasks(entities) — 700ms  │   ║
║  └─────────────────────────────────────┘  └──────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
         ▲ doc shape / SubtaskEntity types
         │
╔════════╧══════════════════════════════════════════════════════════════════════════╗
║                          mockServerDoc.ts                                          ║
║  CompanyDoc → Division[] → Project[] → Task[] → Subtask[] → Metric               ║
║  L1            L2           L3          L4 (main)  L5 (detail)  L6               ║
║                                                                                   ║
║  flattenToTaskRows(doc) → TaskRow[] with dot-path _id                             ║
║  flattenSubtaskRow(entity) → SubtaskRow     (singular, used in SubtaskGrid)       ║
║  extractSubtaskEntities(doc) → SubtaskEntity[]  (seeds subtaskApi cache)          ║
║              pathUtils.ts: getIn / setIn / walkLeafPaths / flattenUpdate          ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

## Data Flows

| Flow | Path |
|---|---|
| **Edit task cell** | AG Grid `onCellValueChanged` → `cellEdited({path, old, new})` → `edits.patches` → `makeTaskRowSelector` re-overlays → `DirtyCell` (reads store) shows yellow border |
| **Edit task dueDate** | Same as above for task, then thunk reads `subtaskApi` cache + `editsSubtasks.patches` → `subtaskBatchEdited([...])` → cascade to all sibling subtasks in one undo group |
| **Edit subtask cell** | AG Grid `onCellValueChanged` → `subtaskCellEdited({path, old, new})` → `editsSubtasks.patches` → SubtaskGrid `useMemo` re-overlays → `DirtyCell` (reads `context.patches`) shows yellow border |
| **Edit subtask dueDate** | Thunk reads siblings + `editsSubtasks.patches` → `subtaskBatchEdited` for all siblings (one undo group) + `cellEdited` to parent task (separate undo group in `edits`) |
| **Undo subtask dueDate** | `subtaskUndo()` reverses subtask stack → peek detects `.dueDate` patch → `cascadeTaskDueDate` writes matching value into `edits` via `cellEdited` |
| **Add / Delete task** | Toolbar buttons → `rowAdded` / `rowDeleted` → `edits.createdRows` / `edits.deletedRowIds` → selector filters/appends |
| **Add / Delete subtask** | SubtaskGrid toolbar → `subtaskRowAdded` / `subtaskRowDeleted` → `editsSubtasks.createdRows` / `deletedRowIds` → inline `useMemo` filters/appends |
| **Task undo / redo** | StatusPanel buttons → `undo()` / `redo()` → operates on `edits` stack only |
| **Subtask undo / redo** | SubtaskGrid toolbar → `subtaskUndo()` / `subtaskRedo()` → operates on `editsSubtasks` stack only; dueDate change cascades to parent task |
| **Remote merge** | Button → `mergeRemote(flattenUpdate(data))` → dirty paths get `conflict` set; clean paths rebase undo stack → `DirtyCell` shows red border + tooltip |
| **Save** | StatusPanel → `saveDocument` (700ms) + `saveSubtasks` (700ms) → `saveSuccess()` + `subtaskSaveSuccess()` → both slices cleared |

## DirtyCell patch source

`DirtyCell` is used in both grids but must read from different state:

```
GridPanel (task grid)
  AgGridReact — no context prop set
  DirtyCell → params.context.patches is undefined
            → falls back to useAppSelector(state.edits.patches[path])

SubtaskGrid
  AgGridReact — context={{ patches }}  ← editsSubtasks.patches passed explicitly
  DirtyCell → params.context.patches is defined
            → uses context patches directly, skips store selector
```

This keeps `DirtyCell` slice-agnostic without needing separate components.

## dueDate Cross-Slice Cascade

Editing dueDate always writes to **both** slices. Because each slice has an independent undo stack, the two entries undo independently:

```
Task dueDate edited in GridPanel:
  edits.undoStack       ← [cellPatch: task.dueDate]    (one entry)
  editsSubtasks.undoStack ← [batchPatch: all sub.dueDate] (one entry)

Subtask dueDate edited in SubtaskGrid:
  editsSubtasks.undoStack ← [batchPatch: all sub.dueDate] (one entry)
  edits.undoStack         ← [cellPatch: task.dueDate]    (one entry, via cellEdited)

Undo subtask dueDate:
  subtaskUndo() pops editsSubtasks stack
  → detects .dueDate in popped group → cascadeTaskDueDate()
  → dispatches cellEdited to edits (adds new entry to edits.undoStack)
```

## editsSlice Factory

`editsSlice.ts` no longer exports a single slice — it exports `createEditsSlice(name)`, a factory that produces independent slice instances with identical reducer logic:

```
createEditsSlice('edits')         → taskEditsSlice   (default export as editsReducer)
createEditsSlice('editsSubtasks') → subtaskEditsSlice (in subtaskEditsSlice.ts)
```

Both instances share `CellPatch | RowAddPatch | RowDeletePatch` with `BaseRow` (generic `{ _id, ...}`), so neither is tied to `TaskRow` or `SubtaskRow` specifically.

## File Responsibilities

| File | Role |
|---|---|
| `RtkEditDemo.tsx` | Root container; dirty-count chip; simulate remote buttons; log panel |
| `GridPanel.tsx` | Toolbar (Add/Delete); L4 task grid; dueDate cascade via thunk into `subtaskBatchEdited`; delegates to `SubtaskGrid` |
| `SubtaskGrid.tsx` | Fetches L5 rows from `subtaskApi`; own Undo/Redo/Add/Delete toolbar; patches via `editsSubtasks`; passes `context.patches` to grid |
| `StatusPanel.tsx` | Task-level Undo/Redo/Save; lists new/deleted rows and dirty cell patches with conflict badges |
| `DirtyCell.tsx` | Context-aware renderer: uses `context.patches` if provided, else `state.edits.patches`; yellow = dirty, red = conflict |
| `../../store/editsSlice.ts` | `createEditsSlice(name)` factory + default task slice export; all reducer logic lives here |
| `../../store/subtaskEditsSlice.ts` | Second instance: `createEditsSlice('editsSubtasks')` with `subtask`-prefixed action exports |
| `../../store/selectors.ts` | Memoized task row flattening, delete filtering, created-row appending, patch overlay |
| `../../store/documentApi.ts` | RTK Query for task document; `keepUnusedDataFor: Infinity` |
| `../../store/subtaskApi.ts` | RTK Query for subtask microservice; `getSubtasksByTask(taskId)` / `saveSubtasks`; `keepUnusedDataFor: Infinity` |
| `../../store/mockServerDoc.ts` | 6-level doc shape; `flattenToTaskRows`, `flattenSubtaskRow`, `extractSubtaskEntities` |
| `../../store/pathUtils.ts` | Dot-path helpers: `getIn`, `setIn`, `walkLeafPaths`, `flattenUpdate` |

## InversePatch State Machines

### Cell edit (both slices)
```
              cellEdited / subtaskCellEdited
(absent) ──────────────────────────────────► dirty { localValue, serverValue }
                                                 │
              mergeRemote (local ≠ remote)        │
                                                 ▼
                                           conflicted  ◄─── stays until undo/redo/save
                                                 │
                              undo (oldValue == serverValue)
                                                 ▼
                                            (absent / clean)
```

### Row add (both slices)
```
              rowAdded / subtaskRowAdded
(absent) ──────────────────────────────► createdRows[] (green bg in grid)
                                              │
              undo            │   redo
                 ◄────────────┤────────────►
             (removed)   createdRows[]
                              │
              saveSuccess
                              ▼
                       (committed to server)
```

### Row delete (both slices)
```
              rowDeleted (server row)
grid row ─────────────────────────────► deletedRowIds[] (hidden in grid)
                                              │
              undo            │   redo
                 ◄────────────┤────────────►
           restored      deletedRowIds[]
                              │
              saveSuccess
                              ▼
                       (deletion committed)

              rowDeleted (local/created row)
              → removed from createdRows[] immediately (no deletedRowIds entry)
```
