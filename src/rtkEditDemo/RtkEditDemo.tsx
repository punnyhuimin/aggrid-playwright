import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { mergeRemote, clearLog } from '../store/editsSlice'
import { useGetDocumentQuery } from '../store/documentApi'
import { MOCK_DOC_ID } from './mockServerDoc'
import { flattenUpdate } from './pathUtils'
import GridPanel from './GridPanel'
import StatusPanel from './StatusPanel'

// Pre-defined simulated server pushes for the demo
const REMOTE_NON_CONFLICT = {
  divisions: [
    {
      projects: [
        { tasks: [{ dueDate: '2026-06-10' }, { dueDate: '2026-07-20' }, {}] },
        { tasks: [{ assignee: 'Dave Jr.' }, {}, {}] },
      ],
    },
    {
      projects: [
        { tasks: [{}, { assignee: 'Henry II' }, {}] },
        { tasks: [{}, { dueDate: '2026-07-25' }, {}] },
      ],
    },
  ],
}

const REMOTE_CONFLICT = {
  divisions: [
    {
      projects: [
        {
          tasks: [
            { name: 'API Design (server update)', status: 'in-progress' },
            { name: 'Backend Dev (server update)', assignee: 'Bob Smith' },
            { status: 'in-progress', priority: 'high' },
          ],
        },
        { tasks: [{ status: 'done' }, { priority: 'low' }, { assignee: 'Eve Chen' }] },
      ],
    },
    {
      projects: [
        { tasks: [{ status: 'done' }, { assignee: 'Henry 2' }, { priority: 'high' }] },
        { tasks: [{ name: 'Audit Prep (server)' }, { name: 'Policy Docs (server)' }, {}] },
      ],
    },
  ],
}

export default function RtkEditDemo() {
  const dispatch = useAppDispatch()
  const log = useAppSelector((s) => s.edits.log)
  const dirtyCount = useAppSelector((s) => Object.keys(s.edits.patches).length)

  // Keep the RTKQuery subscription alive so keepUnusedDataFor=Infinity is exercised
  useGetDocumentQuery(MOCK_DOC_ID)

  const simulateRemote = (update: object) => {
    dispatch(mergeRemote(flattenUpdate(update)))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header bar */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle2" sx={{ mr: 1 }}>
          RTK Edit Demo
        </Typography>
        <Chip
          label={`${dirtyCount} dirty field${dirtyCount !== 1 ? 's' : ''}`}
          size="small"
          color={dirtyCount ? 'warning' : 'success'}
          variant={dirtyCount ? 'filled' : 'outlined'}
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Button
          size="small"
          variant="outlined"
          color="secondary"
          onClick={() => simulateRemote(REMOTE_NON_CONFLICT)}
        >
          Simulate: remote (non-conflicting)
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => simulateRemote(REMOTE_CONFLICT)}
        >
          Simulate: remote (conflicting)
        </Button>
        <Button size="small" onClick={() => dispatch(clearLog())}>
          Clear log
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          Edit cells → switch tabs → come back: edits persist (Redux store survives SPA navigation)
        </Typography>
      </Box>

      {/* Main content: grid + status panel */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Grid area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <GridPanel />
        </Box>

        {/* Right panel: status + log */}
        <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {/* Status panel (dirty paths + save + undo/redo) */}
          <Box sx={{ flex: '0 0 55%', minHeight: 0, overflow: 'hidden' }}>
            <StatusPanel />
          </Box>

          <Divider />

          {/* Operation log */}
          <Box sx={{ flex: '0 0 45%', overflow: 'auto', p: 1, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold', display: 'block' }}>
              Log (newest first)
            </Typography>
            <Stack spacing={0.25}>
              {[...log].reverse().map((line, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  sx={{ fontFamily: 'monospace', display: 'block' }}
                  color={
                    line.includes('CONFLICT') ? 'error.main'
                    : line.includes('[server]') ? 'success.main'
                    : line.includes('[merge]') ? 'info.main'
                    : 'text.primary'
                  }
                >
                  {line}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Architecture note footer */}
      <Paper
        square
        variant="outlined"
        sx={{ p: 1, px: 2, borderTop: 1, borderLeft: 0, borderRight: 0, borderBottom: 0, borderColor: 'divider', bgcolor: 'grey.50' }}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>Architecture:</strong>{' '}
          RTKQuery (<code>keepUnusedDataFor=∞</code>) fetches L1–L6 JSON → <code>makeTaskRowSelector</code> flattens to L4 rows, overlays patches →
          AG Grid renders via <code>DirtyCell</code> renderer → <code>onCellValueChanged</code> dispatches <code>cellEdited({'{path, old, new}'})</code> →
          <code>editsSlice</code> tracks inverse-patch undo stack.
          Remote merge: dirty paths keep local value (shown in red), clean paths accept remote.
          Save clears all patches.
        </Typography>
      </Paper>
    </Box>
  )
}
