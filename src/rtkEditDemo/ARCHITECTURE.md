# RTKEditDemo Architecture

## Component Tree

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                            RTKEditDemo                                       ║
║  [Simulate: remote (non-conflict)]  [Simulate: remote (conflict)]            ║
║  [N pending changes chip]  [Clear log]                                       ║
╠═══════════════════════════════════════════╦══════════════╦════════════════════╣
║              GridPanel                    ║ StatusPanel  ║  Operation Log     ║
║  ┌───────────────────────────────────┐    ║  [Undo n]    ║  [merge] ...       ║
║  │  Toolbar: [+ Add Task]  [Delete]  │    ║  [Redo n]    ║  [edit] ...        ║
║  └───────────────────────────────────┘    ║  [Save (n)]  ║  [add] ...         ║
║  ┌───────────────────────────────────┐    ║              ║  [delete] ...      ║
║  │  AgGridReact (L4 Tasks)           │    ║  new rows    ║  [server] ...      ║
║  │  cols: Division, Project, Task    │    ║  deleted ids ║                    ║
║  │        Status, Assignee, Due,     │    ║  dirty cells ║                    ║
║  │        Priority                   │    ║  (w/ conflict║                    ║
║  │  renderer: DirtyCell ─────────────╫────╫──patches     ║                    ║
║  │  new rows highlighted green       │    ║  badges)     ║                    ║
║  └───────────────────────────────────┘    ║              ║                    ║
║  (row selected)                           ║              ║                    ║
║  ┌───────────────────────────────────┐    ║              ║                    ║
║  │  SubtaskGrid (L5 Subtasks)        │    ║              ║                    ║
║  │  renderer: DirtyCell ─────────────╫────╫──patches     ║                    ║
║  └───────────────────────────────────┘    ║              ║                    ║
╚═══════════════════════════════════════════╩══════════════╩════════════════════╝
  ▲ rowData via makeTaskRowSelector          ▲ selectAllDirtyPaths / raw state
  │ applyPatchesToSubtaskRows (useMemo)      │ dispatch(action) ──────────────────►
  │                                          │                                    │
╔═╧══════════════════════════════════════════╧══════════════════════════════════╗ │
║                            selectors.ts                                        ║ │
║  makeTaskRowSelector(docId)  ← createSelector (memoized)                       ║ │
║    inputs: serverDoc, patches, createdRows, deletedRowIds                      ║ │
║    1. flattenToTaskRows(serverDoc)                                              ║ │
║    2. filter out deletedRowIds                                                  ║ │
║    3. overlay patches (localValue) on each server row                          ║ │
║    4. overlay patches on each createdRow                                       ║ │
║    5. return [...serverRows, ...patchedCreatedRows]                             ║ │
║                                                                                ║ │
║  applyPatchesToSubtaskRows(taskId, rawSubtasks, patches)  ← used in component  ║ │
║  selectEditEntry / selectAllDirtyPaths / selectIsDirtyUnder                    ║ │
╚═╤══════════════════════════════════════════════════════════════════════════════╝ │
  │ reads from                                                                     │
  ▼                                                                                ▼
╔══════════════════════════════════════════════════════════════════════════════════╗
║                              Redux Store                                         ║
║  ┌────────────────────────────────────────────────────────────────────────┐     ║
║  │  editsSlice                                                            │     ║
║  │                                                                        │     ║
║  │  patches:       Record<DotPath, EditEntry>                             │     ║
║  │  createdRows:   TaskRow[]        ← local-only rows                     │     ║
║  │  deletedRowIds: string[]         ← server rows marked for delete       │     ║
║  │  undoStack:     InversePatch[][] ← max 100 groups                      │     ║
║  │  redoStack:     InversePatch[][]                                       │     ║
║  │  log:           string[]                                               │     ║
║  │                                                                        │     ║
║  │  InversePatch = CellPatch | RowAddPatch | RowDeletePatch               │     ║
║  │    CellPatch      { kind:'cell',      path, oldValue, newValue }       │     ║
║  │    RowAddPatch    { kind:'addRow',    row: TaskRow }                   │     ║
║  │    RowDeletePatch { kind:'deleteRow', row: TaskRow, wasLocal }         │     ║
║  │                                                                        │     ║
║  │  Actions: cellEdited  batchEdited  rowAdded  rowDeleted                │     ║
║  │           mergeRemote  undo  redo  saveSuccess  clearLog               │     ║
║  └────────────────────────────────────────────────────────────────────────┘     ║
║  ┌────────────────────────────────────────────────────────────────────────┐     ║
║  │  documentApi (RTK Query)  keepUnusedDataFor: Infinity                  │     ║
║  │  getDocument(docId) → mockCompanyDoc (fake fetch)                      │     ║
║  │  saveDocument(doc)  → 700ms simulated delay                            │     ║
║  └────────────────────────────────────────────────────────────────────────┘     ║
╚══════════════════════════════════════════════════════════════════════════════════╝
         ▲ doc shape + row types
         │
╔════════╧══════════════════════════════════════════════════════════════════╗
║                       mockServerDoc.ts                                     ║
║  CompanyDoc → Division[] → Project[] → Task[] → Subtask[] → Metric        ║
║  L1            L2           L3          L4 (main)  L5 (detail)  L6        ║
║                                                                            ║
║  flattenToTaskRows(doc) → TaskRow[] with dot-path _id                      ║
║  flattenSubtaskRows(taskId, subtasks) → SubtaskRow[]                       ║
║              pathUtils.ts: getIn / setIn / walkLeafPaths / flattenUpdate   ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## Data Flows

| Flow | Path |
|---|---|
| **Edit cell** | AG Grid `onCellValueChanged` → `cellEdited({path, old, new})` / `batchEdited([...])` for cascaded dueDate → `patches` updated → selector re-overlays → `DirtyCell` shows yellow border |
| **Add row** | `+ Add Task` button → `rowAdded(newRow)` → `createdRows.push(row)` → selector appends row → grid shows it with green background |
| **Delete row** | `Delete` button → `rowDeleted({row})` → if local: removes from `createdRows`; if server: pushes to `deletedRowIds` → selector filters it out |
| **Remote merge** | Button → `mergeRemote(flattenUpdate(remoteData))` → dirty paths set `conflict`; clean paths accept remote + rebase undo stack → `DirtyCell` shows red border + tooltip |
| **Undo** | Button → `undo()` → pops undoStack group → cell: restores `localValue` (removes patch if back to server value); addRow: removes from `createdRows`; deleteRow: restores row → pushes to redoStack |
| **Redo** | Button → `redo()` → pops redoStack group → reverses undo logic → pushes to undoStack |
| **Save** | Button → `saveDocument` mutation (700ms) → `saveSuccess()` → clears `patches`, `createdRows`, `deletedRowIds`, both stacks |

## EditsState Shape

```typescript
EditsState {
  patches:       Record<DotPath, EditEntry>   // cell-level dirty tracking
  createdRows:   TaskRow[]                    // rows added locally (not yet on server)
  deletedRowIds: string[]                     // server row IDs pending deletion
  undoStack:     InversePatch[][]             // grouped; max 100 entries
  redoStack:     InversePatch[][]
  log:           string[]
}

EditEntry {
  localValue:  unknown        // current value shown in UI
  serverValue: unknown        // last known server baseline
  conflict:    unknown | null // remote value that arrived while field was dirty
}
```

## "Pending changes" count

`RtkEditDemo` and `StatusPanel` both compute total pending changes as:

```
patches.length + createdRows.length + deletedRowIds.length
```

The Save button is disabled only when this total is 0 (or save is in-flight). Conflicts turn the button red but do not block saving — saving commits local values.

## File Responsibilities

| File | Role |
|---|---|
| `RtkEditDemo.tsx` | Root container; dirty-count chip; simulate remote buttons; log panel |
| `GridPanel.tsx` | Toolbar (Add/Delete); L4 task grid; dueDate cascade via `batchEdited`; delegates to `SubtaskGrid` |
| `SubtaskGrid.tsx` | L5 subtask grid; applies patches via `applyPatchesToSubtaskRows` |
| `StatusPanel.tsx` | Undo/redo/save controls; lists new rows, deleted rows, and dirty cells with conflict badges |
| `DirtyCell.tsx` | Custom AG Grid renderer; yellow border = dirty, red border + tooltip = conflict |
| `../../store/editsSlice.ts` | All Redux logic: cell patches, row add/delete, undo/redo stacks, merge conflict |
| `../../store/selectors.ts` | Memoized row flattening, delete filtering, created-row appending, patch overlay |
| `../../store/documentApi.ts` | RTK Query with `keepUnusedDataFor: Infinity` |
| `../../store/mockServerDoc.ts` | 6-level document shape + `flattenToTaskRows` / `flattenSubtaskRows` |
| `../../store/pathUtils.ts` | Dot-path helpers: `getIn`, `setIn`, `walkLeafPaths`, `flattenUpdate` |

## InversePatch State Machines

### Cell edit
```
              cellEdited
(absent) ──────────────────► dirty { localValue, serverValue }
                                 │
              mergeRemote (local ≠ remote)
                                 ▼
                           conflicted  ◄─── stays until undo/redo/save
                                 │
                    undo (oldValue == serverValue)
                                 ▼
                            (absent / clean)
```

### Row add
```
              rowAdded
(absent) ──────────────────► createdRows[] (green bg in grid)
                                 │
              undo (addRow)       │   redo (addRow)
                 ◄───────────────┤───────────────►
             (removed)       createdRows[]
                                 │
              saveSuccess
                                 ▼
                          (committed to server)
```

### Row delete
```
              rowDeleted (server row)            rowDeleted (local row)
grid row ──────────────────────────────────► deletedRowIds[]  /  removed from createdRows[]
                                                    │
              undo (deleteRow)                       │   redo (deleteRow)
                 ◄──────────────────────────────────┤────────────────────►
           restored in grid                  deletedRowIds[]
                                                    │
              saveSuccess
                                                    ▼
                                           (deletion committed)
```

## Key Design Decisions

**Dot-path flat map (`patches`)** — cell edits are stored as `"div.0.proj.1.task.2.name" → EditEntry` rather than nested objects. Conflict detection and undo work at any nesting depth without tree traversal.

**Separate `createdRows` / `deletedRowIds`** — row-level operations are tracked orthogonally to cell patches. This means undo/redo for row add/delete never touches `patches`, keeping the two concerns independent.

**Polymorphic `InversePatch`** — the undo/redo stack stores a discriminated union (`CellPatch | RowAddPatch | RowDeletePatch`) so a single undo can atomically reverse a mixed group (e.g., a batch cell edit).

**Patches overlay / selector** — the RTK Query server doc is never mutated. `makeTaskRowSelector` merges `patches` over the cached doc, filters `deletedRowIds`, and appends `createdRows` on every read. Memoised with `createSelector` so the 6-level flattening only re-runs when the server doc changes.

**Undo stack rebasing** — when a clean field receives a remote update via `mergeRemote`, prior undo entries for that path have their `oldValue` rebased to the new remote value. This prevents an undo from silently reverting a concurrent remote change.
