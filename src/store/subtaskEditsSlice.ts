import { createEditsSlice } from './editsSlice'

const subtaskEditsSlice = createEditsSlice('editsSubtasks')

export const {
  cellEdited: subtaskCellEdited,
  batchEdited: subtaskBatchEdited,
  rowAdded: subtaskRowAdded,
  rowDeleted: subtaskRowDeleted,
  mergeRemote: subtaskMergeRemote,
  undo: subtaskUndo,
  redo: subtaskRedo,
  saveSuccess: subtaskSaveSuccess,
  clearLog: subtaskClearLog,
} = subtaskEditsSlice.actions

export const subtaskEditsReducer = subtaskEditsSlice.reducer
