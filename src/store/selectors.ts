import { createSelector } from '@reduxjs/toolkit'
import { documentApi } from './documentApi'
import { flattenToTaskRows, flattenSubtaskRows } from '../rtkEditDemo/mockServerDoc'
import type { RootState } from './index'
import type { DotPath, EditEntry } from './editsSlice'
import type { TaskRow, SubtaskRow, Subtask } from '../rtkEditDemo/mockServerDoc'

// ── Task row selector ────────────────────────────────────────────────────────

/**
 * Factory — call once per component with useMemo(() => makeTaskRowSelector(id), []).
 * Merges RTKQuery server doc with local patches, filters deleted rows, and appends
 * locally created rows. flattenToTaskRows only runs when serverDoc changes.
 */
export function makeTaskRowSelector(docId: string) {
  return createSelector(
    (state: RootState) => documentApi.endpoints.getDocument.select(docId)(state).data,
    (state: RootState) => state.edits.patches,
    (state: RootState) => state.edits.createdRows,
    (state: RootState) => state.edits.deletedRowIds,
    (serverDoc, patches, createdRows, deletedRowIds): TaskRow[] => {
      const serverRows = serverDoc
        ? flattenToTaskRows(serverDoc)
            .filter((row) => !deletedRowIds.includes(row._id))
            .map((row) => applyPatchesToRow(row, patches))
        : []
      const patchedCreatedRows = createdRows.map((row) => applyPatchesToRow(row, patches))
      return [...serverRows, ...patchedCreatedRows]
    },
  )
}

function applyPatchesToRow(row: TaskRow, patches: Record<DotPath, EditEntry>): TaskRow {
  const result = { ...row } as Record<string, unknown> & TaskRow
  const prefix = row._id + '.'
  for (const [path, entry] of Object.entries(patches)) {
    if (!path.startsWith(prefix)) continue
    const field = path.slice(prefix.length)
    if (!field.includes('.')) result[field] = entry.localValue
  }
  return result as TaskRow
}

// ── Subtask row helper (called inside component, not a memoized selector) ────

/**
 * Applies patches to subtask rows. Used inside SubtaskGrid with useMemo.
 */
export function applyPatchesToSubtaskRows(
  taskId: string,
  rawSubtasks: Subtask[],
  patches: Record<DotPath, EditEntry>,
): SubtaskRow[] {
  return flattenSubtaskRows(taskId, rawSubtasks).map((row) => {
    const result = { ...row } as Record<string, unknown> & SubtaskRow
    const prefix = row._id + '.'
    for (const [path, entry] of Object.entries(patches)) {
      if (!path.startsWith(prefix)) continue
      const field = path.slice(prefix.length)
      if (!field.includes('.')) result[field] = entry.localValue
    }
    return result as SubtaskRow
  })
}

// ── Per-field helpers ────────────────────────────────────────────────────────

export function selectEditEntry(state: RootState, path: DotPath): EditEntry | undefined {
  return state.edits.patches[path]
}

export function selectIsDirtyUnder(state: RootState, idPrefix: string): boolean {
  const prefix = idPrefix + '.'
  return Object.keys(state.edits.patches).some(
    (p) => p === idPrefix || p.startsWith(prefix),
  )
}

export function selectAllDirtyPaths(state: RootState): [DotPath, EditEntry][] {
  return Object.entries(state.edits.patches)
}
