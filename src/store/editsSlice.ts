import { createSlice, current } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type DotPath = string

export type EditEntry = {
  localValue: unknown
  serverValue: unknown    // last known server value at this path
  conflict: unknown | null // remote value that arrived while field was dirty
}

export type InversePatch = {
  path: DotPath
  oldValue: unknown   // value before the edit (restoring this = undo)
  newValue: unknown   // value after  the edit (restoring this = redo)
}

export type EditsState = {
  patches: Record<DotPath, EditEntry>
  undoStack: InversePatch[][]
  redoStack: InversePatch[][]
  log: string[]
}

const MAX_UNDO = 100

const initialState: EditsState = {
  patches: {},
  undoStack: [],
  redoStack: [],
  log: [],
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
      const patch: InversePatch = { path, oldValue, newValue }
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
        group.push({ path, oldValue, newValue })
        state.log.push(`[edit] ${path}: "${String(oldValue)}" → "${String(newValue)}"`)
      }
      if (state.undoStack.length >= MAX_UNDO) state.undoStack.shift()
      state.undoStack.push(group)
      state.redoStack = []
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
            for (const patch of entry) {
              if (patch.path === path) patch.oldValue = remoteValue
            }
          }
          state.log.push(`[merge] "${path}": accepted remote "${String(remoteValue)}"`)
        }
      }
    },

    undo(state) {
      if (!state.undoStack.length) return
      const patches = current(state.undoStack[state.undoStack.length - 1])
      state.undoStack.pop()
      for (const patch of patches) {
        const existing = state.patches[patch.path]
        if (existing) {
          if (String(patch.oldValue) === String(existing.serverValue)) {
            delete state.patches[patch.path]
          } else {
            existing.localValue = patch.oldValue
            existing.conflict = null
          }
        }
        state.log.push(`[undo] ${patch.path}: "${String(patch.newValue)}" → "${String(patch.oldValue)}"`)
      }
      state.redoStack.push(patches as InversePatch[])
    },

    redo(state) {
      if (!state.redoStack.length) return
      const patches = current(state.redoStack[state.redoStack.length - 1])
      state.redoStack.pop()
      for (const patch of patches) {
        const existing = state.patches[patch.path]
        if (existing) {
          existing.localValue = patch.newValue
          existing.conflict = null
        } else {
          state.patches[patch.path] = {
            localValue: patch.newValue,
            serverValue: patch.oldValue,
            conflict: null,
          }
        }
        state.log.push(`[redo] ${patch.path}: "${String(patch.oldValue)}" → "${String(patch.newValue)}"`)
      }
      state.undoStack.push(patches as InversePatch[])
    },

    saveSuccess(state) {
      state.patches = {}
      state.undoStack = []
      state.redoStack = []
      state.log.push('[server] Save confirmed — all local edits committed')
    },

    clearLog(state) {
      state.log = []
    },
  },
})

export const { cellEdited, batchEdited, mergeRemote, undo, redo, saveSuccess, clearLog } = editsSlice.actions
export const editsReducer = editsSlice.reducer
