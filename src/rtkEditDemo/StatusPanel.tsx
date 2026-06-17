import {
  Box, Button, ButtonGroup, Chip, Divider,
  List, ListItem, ListItemText, Paper, Tooltip, Typography,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { undo, redo, saveSuccess } from '../store/editsSlice'
import { selectAllDirtyPaths } from '../store/selectors'
import { useSaveDocumentMutation } from '../store/documentApi'
import { mockCompanyDoc, MOCK_DOC_ID } from './mockServerDoc'

export default function StatusPanel() {
  const dispatch = useAppDispatch()
  const undoDepth = useAppSelector((s) => s.edits.undoStack.length)
  const redoDepth = useAppSelector((s) => s.edits.redoStack.length)
  const dirtyPaths = useAppSelector(selectAllDirtyPaths)
  const [saveDocument, { isLoading: isSaving }] = useSaveDocumentMutation()

  const hasDirty = dirtyPaths.length > 0
  const hasConflicts = dirtyPaths.some(([, e]) => e.conflict != null)

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
          <Button onClick={() => dispatch(undo())} disabled={!undoDepth}>
            ↩ Undo ({undoDepth})
          </Button>
          <Button onClick={() => dispatch(redo())} disabled={!redoDepth}>
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
          {isSaving ? 'Saving…' : hasConflicts ? 'Save (resolve conflicts first)' : `Save ${dirtyPaths.length ? `(${dirtyPaths.length} changes)` : ''}`}
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
          Dirty fields ({dirtyPaths.length})
        </Typography>
        {!hasDirty && (
          <Typography variant="caption" color="text.secondary">All synced with server.</Typography>
        )}
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
