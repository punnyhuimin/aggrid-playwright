import {
  Box, Button, ButtonGroup, Chip, Divider,
  List, ListItem, ListItemText, Paper, Tooltip, Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { undo, redo, saveSuccess, type CellPatch } from '../store/editsSlice'
import { subtaskBatchEdited } from '../store/subtaskEditsSlice'
import { subtaskApi } from '../store/subtaskApi'
import { documentApi } from '../store/documentApi'
import { useSaveDocumentMutation } from '../store/documentApi'
import { selectAllDirtyPaths } from '../store/selectors'
import { mockCompanyDoc, MOCK_DOC_ID } from './mockServerDoc'
import { getIn } from './pathUtils'
import type { Task } from './mockServerDoc'

export default function StatusPanel() {
  const dispatch = useAppDispatch()
  const undoStackRaw = useAppSelector((s) => s.edits.undoStack)
  const redoStackRaw = useAppSelector((s) => s.edits.redoStack)
  const undoDepth = undoStackRaw.length
  const redoDepth = redoStackRaw.length
  const dirtyPaths = useAppSelector(selectAllDirtyPaths)
  const createdRows = useAppSelector((s) => s.edits.createdRows)
  const deletedRowIds = useAppSelector((s) => s.edits.deletedRowIds)
  const [saveDocument, { isLoading: isSaving }] = useSaveDocumentMutation()

  const hasDirty = dirtyPaths.length > 0 || createdRows.length > 0 || deletedRowIds.length > 0
  const hasConflicts = dirtyPaths.some(([, e]) => e.conflict != null)
  const totalChanges = dirtyPaths.length + createdRows.length + deletedRowIds.length

  // Given a set of task-level patches that are about to be applied (via undo/redo),
  // cascade any dueDate changes down to the corresponding subtasks.
  const cascadeSubtaskDueDates = (
    patches: readonly CellPatch[],
    // 'oldValue' for undo (restoring to pre-edit), 'newValue' for redo (re-applying)
    direction: 'undo' | 'redo',
  ) => {
    dispatch((_, getState) => {
      const state = getState()
      const serverDoc = documentApi.endpoints.getDocument.select(MOCK_DOC_ID)(state).data
      if (!serverDoc) return

      const dueDatePatches = patches.filter((p) => p.path.endsWith('.dueDate'))
      for (const patch of dueDatePatches) {
        const taskDotPath = patch.path.slice(0, -'.dueDate'.length)
        const task = getIn(serverDoc, taskDotPath) as Task | undefined
        if (!task?.id) continue

        const subtasks = subtaskApi.endpoints.getSubtasksByTask.select(task.id)(state).data ?? []
        if (!subtasks.length) continue

        const subPatches = state.editsSubtasks.patches
        const restoredValue = direction === 'undo' ? patch.oldValue : patch.newValue
        dispatch(
          subtaskBatchEdited(
            subtasks.map((sub) => ({
              path: `${sub.id}.dueDate`,
              newValue: restoredValue,
              oldValue: subPatches[`${sub.id}.dueDate`]?.localValue ?? sub.dueDate,
            })),
          ),
        )
      }
    })
  }

  const handleUndo = () => {
    const undoStack = undoStackRaw
    if (!undoStack.length) return
    const topEntry = undoStack[undoStack.length - 1]
    dispatch(undo())
    const cellPatches = topEntry.filter((p): p is CellPatch => p.kind === 'cell')
    cascadeSubtaskDueDates(cellPatches, 'undo')
  }

  const handleRedo = () => {
    const redoStack = redoStackRaw
    if (!redoStack.length) return
    const topEntry = redoStack[redoStack.length - 1]
    dispatch(redo())
    const cellPatches = topEntry.filter((p): p is CellPatch => p.kind === 'cell')
    cascadeSubtaskDueDates(cellPatches, 'redo')
  }

  const handleSave = async () => {
    await saveDocument(mockCompanyDoc)
    dispatch(saveSuccess())
  }

  return (
    <Paper
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* Undo / Redo */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <ButtonGroup size="small" fullWidth>
          <Button onClick={handleUndo} disabled={!undoDepth}>
            ↩ Undo ({undoDepth})
          </Button>
          <Button onClick={handleRedo} disabled={!redoDepth}>
            Redo ({redoDepth}) ↪
          </Button>
        </ButtonGroup>
      </Box>

      {/* Save */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          variant="contained"
          fullWidth
          size="small"
          onClick={handleSave}
          disabled={isSaving || !hasDirty}
          color={hasConflicts ? 'error' : 'primary'}
        >
          {isSaving ? 'Saving…' : hasConflicts ? 'Save (resolve conflicts first)' : `Save ${totalChanges ? `(${totalChanges} changes)` : ''}`}
        </Button>
        {hasConflicts && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, px: 0.5 }}>
            {dirtyPaths.filter(([, e]) => e.conflict != null).length} conflict(s) — saving will commit local values
          </Typography>
        )}
      </Box>

      {/* Dirty paths list */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
          Pending changes ({totalChanges})
        </Typography>
        {!hasDirty && (
          <Typography variant="caption" color="text.secondary">All synced with server.</Typography>
        )}
        {/* New rows */}
        {createdRows.map((row) => (
          <ListItem key={row._id} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {row.name || '(unnamed)'}
                  </Typography>
                  <Chip label="new row" size="small" color="success" sx={{ height: 16, fontSize: 10 }} />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', fontSize: 9 }}>
                  {row._divisionName} / {row._projectName}
                </Typography>
              }
            />
          </ListItem>
        ))}
        {/* Deleted rows */}
        {deletedRowIds.map((id) => (
          <ListItem key={id} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label="deleted row" size="small" color="error" sx={{ height: 16, fontSize: 10 }} />
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', display: 'block', fontSize: 9 }}>
                  {id}
                </Typography>
              }
            />
          </ListItem>
        ))}
        <List dense disablePadding>
          {dirtyPaths.map(([path, entry]) => (
            <ListItem key={path} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {path.split('.').pop()}
                    </Typography>
                    {entry.conflict != null ? (
                      <Chip label="conflict" size="small" color="error" sx={{ height: 16, fontSize: 10 }} />
                    ) : (
                      <Chip label="dirty" size="small" color="warning" sx={{ height: 16, fontSize: 10 }} />
                    )}
                  </Box>
                }
                secondary={
                  <Box component="span" sx={{ display: 'block' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                      local: &quot;{String(entry.localValue)}&quot;
                    </Typography>
                    {entry.conflict != null && (
                      <Typography variant="caption" color="error" sx={{ fontFamily: 'monospace', display: 'block' }}>
                        remote: &quot;{String(entry.conflict)}&quot;
                      </Typography>
                    )}
                    <Tooltip title={path} placement="right">
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ fontFamily: 'monospace', display: 'block', fontSize: 9, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 180 }}
                      >
                        {path}
                      </Typography>
                    </Tooltip>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* Doc ID note */}
      <Box sx={{ p: 1, bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.disabled">
          doc: {MOCK_DOC_ID} · RTKQuery keepUnusedDataFor=∞
        </Typography>
      </Box>
    </Paper>
  )
}
