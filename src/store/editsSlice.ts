import { createSlice, current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { TaskRow } from '../rtkEditDemo/mockServerDoc'

export type DotPath = string

export type EditEntry = {
  localValue: unknown
  serverValue: unknown    // last known server value at this path
  conflict: unknown | null // remote value that arrived while field was dirty
}

export type CellPatch = {
  kind: 'cell'
  path: DotPath
  oldValue: unknown   // value before the edit (restoring this = undo)
  newValue: unknown   // value after  the edit (restoring this = redo)
}

export type RowAddPatch = {
  kind: 'addRow'
  row: TaskRow        // snapshot of the added row (undo = remove, redo = re-add)
}

export type RowDeletePatch = {
  kind: 'deleteRow'
  row: TaskRow        // snapshot of the deleted row (undo = restore)
  wasLocal: boolean   // true if row was in createdRows (not from server)
}

export type InversePatch = CellPatch | RowAddPatch | RowDeletePatch

export type EditsState = {
  patches: Record<DotPath, EditEntry>
  undoStack: InversePatch[][]
  redoStack: InversePatch[][]
  log: string[]
  createdRows: TaskRow[]
  deletedRowIds: string[]
}

const MAX_UNDO = 100

const initialState: EditsState = {
  patches: {},
  undoStack: [],
  redoStack: [],
  log: [],
  createdRows: [],
  deletedRowIds: [],
}

const editsSlice = createSlice({
  name: 'edits',
  initialState,
  reducers: {
    cellEdited(
      state,
      action: PayloadAction<{ path: DotPath; newValue: unknown; oldValue: unknown }>,
    ) {
      const { path, newValue, oldValue } = action.payload
      const existing = state.patches[path]
      state.patches[path] = {
        localValue: newValue,
        serverValue: existing?.serverValue ?? oldValue,
        conflict: existing?.conflict ?? null,
      }
      const patch: CellPatch = { kind: 'cell', path, oldValue, newValue }
      if (state.undoStack.length >= MAX_UNDO) state.undoStack.shift()
      state.undoStack.push([patch])
      state.redoStack = []
      state.log.push(`[edit] ${path}: "${String(oldValue)}" → "${String(newValue)}"`)
    },

    batchEdited(
      state,
      action: PayloadAction<{ path: DotPath; newValue: unknown; oldValue: unknown }[]>,
    ) {
      const group: InversePatch[] = []
      for (const { path, newValue, oldValue } of action.payload) {
        const existing = state.patches[path]
        state.patches[path] = {
          localValue: newValue,
          serverValue: existing?.serverValue ?? oldValue,
          conflict: existing?.conflict ?? null,
        }
        group.push({ kind: 'cell', path, oldValue, newValue })
        state.log.push(`[edit] ${path}: "${String(oldValue)}" → "${String(newValue)}"`)
      }
      if (state.undoStack.length >= MAX_UNDO) state.undoStack.shift()
      state.undoStack.push(group)
      state.redoStack = []
    },

    rowAdded(state, action: PayloadAction<TaskRow>) {
      const row = action.payload
      state.createdRows.push(row)
      const patch: RowAddPatch = { kind: 'addRow', row }
      if (state.undoStack.length >= MAX_UNDO) state.undoStack.shift()
      state.undoStack.push([patch])
      state.redoStack = []
      state.log.push(`[add] new row "${row.name}" (${row._divisionName} / ${row._projectName})`)
    },

    rowDeleted(state, action: PayloadAction<{ row: TaskRow }>) {
      const { row } = action.payload
      const wasLocal = row._id.startsWith('new-')
      if (wasLocal) {
        state.createdRows = state.createdRows.filter((r) => r._id !== row._id)
        // Clean up any cell patches for this local row
        for (const key of Object.keys(state.patches)) {
          if (key.startsWith(row._id + '.')) delete state.patches[key]
        }
      } else {
        state.deletedRowIds.push(row._id)
      }
      const patch: RowDeletePatch = { kind: 'deleteRow', row, wasLocal }
      if (state.undoStack.length >= MAX_UNDO) state.undoStack.shift()
      state.undoStack.push([patch])
      state.redoStack = []
      state.log.push(`[delete] row "${row.name}"`)
    },

    /**
     * Merge incoming server update (flat dotPath → value map).
     * Dirty fields keep their local value; clean fields accept the remote value.
     * Undo stack is rebased so undoing a local edit never silently reverts a
     * concurrent remote change on a different field.
     */
    mergeRemote(state, action: PayloadAction<Record<DotPath, unknown>>) {
      for (const [path, remoteValue] of Object.entries(action.payload)) {
        const existing = state.patches[path]
        if (existing) {
          existing.serverValue = remoteValue
          if (String(remoteValue) !== String(existing.localValue)) {
            existing.conflict = remoteValue
            state.log.push(
              `[merge] CONFLICT "${path}": kept local "${String(existing.localValue)}", remote="${String(remoteValue)}"`,
            )
          } else {
            existing.conflict = null
            state.log.push(`[merge] "${path}": local and remote agree on "${String(existing.localValue)}"`)
          }
        } else {
          // Field is clean — accept remote (RTKQuery cache holds the new value).
          // Rebase undo stack: any undo step that would restore this path to an
          // old server baseline should now restore to the new remote value instead.
          for (const entry of state.undoStack) {
            for (const op of entry) {
              if (op.kind === 'cell' && op.path === path) op.oldValue = remoteValue
            }
          }
          state.log.push(`[merge] "${path}": accepted remote "${String(remoteValue)}"`)
        }
      }
    },

    undo(state) {
      if (!state.undoStack.length) return
      const ops = current(state.undoStack[state.undoStack.length - 1])
      state.undoStack.pop()
      for (const op of ops) {
        if (op.kind === 'cell') {
          const existing = state.patches[op.path]
          if (existing) {
            if (String(op.oldValue) === String(existing.serverValue)) {
              delete state.patches[op.path]
            } else {
              existing.localValue = op.oldValue
              existing.conflict = null
            }
          }
          state.log.push(`[undo] ${op.path}: "${String(op.newValue)}" → "${String(op.oldValue)}"`)
        } else if (op.kind === 'addRow') {
          // Undo add = remove the locally created row
          state.createdRows = state.createdRows.filter((r) => r._id !== op.row._id)
          state.log.push(`[undo] added row "${op.row.name}" → removed`)
        } else if (op.kind === 'deleteRow') {
          // Undo delete = restore the row
          if (op.wasLocal) {
            state.createdRows.push(op.row)
          } else {
            state.deletedRowIds = state.deletedRowIds.filter((id) => id !== op.row._id)
          }
          state.log.push(`[undo] deleted row "${op.row.name}" → restored`)
        }
      }
      state.redoStack.push(ops as InversePatch[])
    },

    redo(state) {
      if (!state.redoStack.length) return
      const ops = current(state.redoStack[state.redoStack.length - 1])
      state.redoStack.pop()
      for (const op of ops) {
        if (op.kind === 'cell') {
          const existing = state.patches[op.path]
          if (existing) {
            existing.localValue = op.newValue
            existing.conflict = null
          } else {
            state.patches[op.path] = {
              localValue: op.newValue,
              serverValue: op.oldValue,
              conflict: null,
            }
          }
          state.log.push(`[redo] ${op.path}: "${String(op.oldValue)}" → "${String(op.newValue)}"`)
        } else if (op.kind === 'addRow') {
          // Redo add = re-add the row
          if (!state.createdRows.find((r) => r._id === op.row._id)) {
            state.createdRows.push(op.row)
          }
          state.log.push(`[redo] added row "${op.row.name}"`)
        } else if (op.kind === 'deleteRow') {
          // Redo delete = re-delete
          if (op.wasLocal) {
            state.createdRows = state.createdRows.filter((r) => r._id !== op.row._id)
          } else {
            if (!state.deletedRowIds.includes(op.row._id)) {
              state.deletedRowIds.push(op.row._id)
            }
          }
          state.log.push(`[redo] deleted row "${op.row.name}"`)
        }
      }
      state.undoStack.push(ops as InversePatch[])
    },

    saveSuccess(state) {
      state.patches = {}
      state.undoStack = []
      state.redoStack = []
      state.createdRows = []
      state.deletedRowIds = []
      state.log.push('[server] Save confirmed — all local edits committed')
    },

    clearLog(state) {
      state.log = []
    },
  },
})

export const { cellEdited, batchEdited, rowAdded, rowDeleted, mergeRemote, undo, redo, saveSuccess, clearLog } =
  editsSlice.actions
export const editsReducer = editsSlice.reducer
