import { createSlice, current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type DotPath = string

export type EditEntry = {
  localValue: unknown
  serverValue: unknown
  conflict: unknown | null
}

// Generic row type — concrete row types (TaskRow, SubtaskRow) are cast at usage sites.
export type BaseRow = { _id: string; [key: string]: unknown }

export type CellPatch = {
  kind: 'cell'
  path: DotPath
  oldValue: unknown
  newValue: unknown
}

export type RowAddPatch = {
  kind: 'addRow'
  row: BaseRow
}

export type RowDeletePatch = {
  kind: 'deleteRow'
  row: BaseRow
  wasLocal: boolean
}

export type InversePatch = CellPatch | RowAddPatch | RowDeletePatch

export type EditsState = {
  patches: Record<DotPath, EditEntry>
  undoStack: InversePatch[][]
  redoStack: InversePatch[][]
  log: string[]
  createdRows: BaseRow[]
  deletedRowIds: string[]
}

const MAX_UNDO = 100

export const initialEditsState: EditsState = {
  patches: {},
  undoStack: [],
  redoStack: [],
  log: [],
  createdRows: [],
  deletedRowIds: [],
}

// ── Pure reducer implementations (shared across all slice instances) ─────────

function implCellEdited(
  state: EditsState,
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
}

function implBatchEdited(
  state: EditsState,
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
}

function implRowAdded(state: EditsState, action: PayloadAction<BaseRow>) {
  const row = action.payload
  state.createdRows.push(row)
  const patch: RowAddPatch = { kind: 'addRow', row }
  if (state.undoStack.length >= MAX_UNDO) state.undoStack.shift()
  state.undoStack.push([patch])
  state.redoStack = []
  state.log.push(`[add] new row "${String(row.name ?? row._id)}"`)
}

function implRowDeleted(state: EditsState, action: PayloadAction<{ row: BaseRow }>) {
  const { row } = action.payload
  const wasLocal = row._id.startsWith('new-')
  if (wasLocal) {
    state.createdRows = state.createdRows.filter((r) => r._id !== row._id)
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
  state.log.push(`[delete] row "${String(row.name ?? row._id)}"`)
}

function implMergeRemote(state: EditsState, action: PayloadAction<Record<DotPath, unknown>>) {
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
      for (const entry of state.undoStack) {
        for (const op of entry) {
          if (op.kind === 'cell' && op.path === path) op.oldValue = remoteValue
        }
      }
      state.log.push(`[merge] "${path}": accepted remote "${String(remoteValue)}"`)
    }
  }
}

function implUndo(state: EditsState) {
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
      state.createdRows = state.createdRows.filter((r) => r._id !== op.row._id)
      state.log.push(`[undo] added row "${String(op.row.name ?? op.row._id)}" → removed`)
    } else if (op.kind === 'deleteRow') {
      if (op.wasLocal) {
        state.createdRows.push(op.row)
      } else {
        state.deletedRowIds = state.deletedRowIds.filter((id) => id !== op.row._id)
      }
      state.log.push(`[undo] deleted row "${String(op.row.name ?? op.row._id)}" → restored`)
    }
  }
  state.redoStack.push(ops as InversePatch[])
}

function implRedo(state: EditsState) {
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
        state.patches[op.path] = { localValue: op.newValue, serverValue: op.oldValue, conflict: null }
      }
      state.log.push(`[redo] ${op.path}: "${String(op.oldValue)}" → "${String(op.newValue)}"`)
    } else if (op.kind === 'addRow') {
      if (!state.createdRows.find((r) => r._id === op.row._id)) {
        state.createdRows.push(op.row)
      }
      state.log.push(`[redo] added row "${String(op.row.name ?? op.row._id)}"`)
    } else if (op.kind === 'deleteRow') {
      if (op.wasLocal) {
        state.createdRows = state.createdRows.filter((r) => r._id !== op.row._id)
      } else if (!state.deletedRowIds.includes(op.row._id)) {
        state.deletedRowIds.push(op.row._id)
      }
      state.log.push(`[redo] deleted row "${String(op.row.name ?? op.row._id)}"`)
    }
  }
  state.undoStack.push(ops as InversePatch[])
}

function implSaveSuccess(state: EditsState) {
  state.patches = {}
  state.undoStack = []
  state.redoStack = []
  state.createdRows = []
  state.deletedRowIds = []
  state.log.push('[server] Save confirmed — all local edits committed')
}

function implClearLog(state: EditsState) {
  state.log = []
}

// ── Slice factory ─────────────────────────────────────────────────────────────

/**
 * Creates an edits slice with a given Redux slice name. Calling this twice with
 * different names gives two independent slices (separate undo stacks, separate
 * patches maps) that share the same reducer logic.
 */
export function createEditsSlice(name: string) {
  return createSlice({
    name,
    initialState: initialEditsState as EditsState,
    reducers: {
      cellEdited: implCellEdited,
      batchEdited: implBatchEdited,
      rowAdded: implRowAdded,
      rowDeleted: implRowDeleted,
      mergeRemote: implMergeRemote,
      undo: implUndo,
      redo: implRedo,
      saveSuccess: implSaveSuccess,
      clearLog: implClearLog,
    },
  })
}

// ── Default task-service instance ─────────────────────────────────────────────

const taskEditsSlice = createEditsSlice('edits')

export const { cellEdited, batchEdited, rowAdded, rowDeleted, mergeRemote, undo, redo, saveSuccess, clearLog } =
  taskEditsSlice.actions
export const editsReducer = taskEditsSlice.reducer
