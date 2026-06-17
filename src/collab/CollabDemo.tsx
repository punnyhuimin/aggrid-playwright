import { useReducer, useCallback, useRef, useMemo } from 'react'
import {
  Box, Button, ButtonGroup, Chip, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material'
import { walkLeafPaths, getIn, setIn } from '../rtkEditDemo/pathUtils'

// --- Types ---

type DotPath = string

type PatchEntry = {
  localValue: string
  conflict: string | null  // remote value that arrived while this field was dirty
}

type InversePatch = {
  path: DotPath
  oldValue: string
  newValue: string
}

// --- Demo document — shows duplicate field names at different nesting levels ---
// "name" appears at root AND inside each product; "status" appears at both levels too.
// The dot-path uniquely identifies each one; a flat FIELD_KEYS array could not.

const INITIAL_SERVER_DOC = {
  name: 'Acme Corp',
  status: 'active',
  contact: {
    email: 'info@acme.com',
    phone: '+1-555-0100',
  },
  products: [
    { name: 'Widget A', status: 'available', price: '49.99' },
    { name: 'Widget B', status: 'discontinued', price: '29.99' },
  ],
}

type ServerDoc = typeof INITIAL_SERVER_DOC

// --- State ---

type State = {
  serverDoc: ServerDoc   // last known server values — source of truth for clean fields
  patches: Record<DotPath, PatchEntry>
  undoStack: InversePatch[][]
  redoStack: InversePatch[][]
  log: string[]
  isSaving: boolean
}

const INITIAL_STATE: State = {
  serverDoc: INITIAL_SERVER_DOC,
  patches: {},
  undoStack: [],
  redoStack: [],
  log: ['[server] Document loaded. Note: "name" and "status" exist at multiple nesting levels.'],
  isSaving: false,
}

// --- Actions ---

type Action =
  | { type: 'EDIT'; path: DotPath; newValue: string; oldValue: string }
  | { type: 'MERGE_REMOTE'; updates: Record<DotPath, string> }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_SAVING'; value: boolean }

// --- Reducer ---

function reducer(state: State, action: Action): State {
  switch (action.type) {

    case 'EDIT': {
      const { path, newValue, oldValue } = action
      const existing = state.patches[path]
      return {
        ...state,
        patches: {
          ...state.patches,
          [path]: { localValue: newValue, conflict: existing?.conflict ?? null },
        },
        undoStack: [...state.undoStack, [{ path, oldValue, newValue }]],
        redoStack: [],
        log: [...state.log, `[edit] ${path}: "${oldValue}" → "${newValue}"`],
      }
    }

    case 'MERGE_REMOTE': {
      const nextPatches = { ...state.patches }
      const logLines: string[] = []
      let nextServerDoc = state.serverDoc

      // Rebase undo stack entries where the path was clean (safe approximation):
      // if this path appears in the undo stack but is currently clean, update its
      // oldValue so that undoing won't restore a stale server baseline.
      let nextUndoStack = state.undoStack

      for (const [path, remoteValue] of Object.entries(action.updates)) {
        const existing = nextPatches[path]
        if (existing) {
          // Dirty: keep local, surface conflict if values differ
          if (remoteValue !== existing.localValue) {
            nextPatches[path] = { ...existing, conflict: remoteValue }
            logLines.push(`[merge] CONFLICT "${path}": kept local "${existing.localValue}", remote="${remoteValue}"`)
          } else {
            nextPatches[path] = { ...existing, conflict: null }
            logLines.push(`[merge] "${path}": local and remote now agree`)
          }
        } else {
          // Clean: update serverDoc so the UI reflects the new server value
          nextServerDoc = setIn(nextServerDoc, path, remoteValue)
          // Rebase undo stack: any historical patch for this path that would
          // restore the old server baseline should now restore the new one instead
          nextUndoStack = nextUndoStack.map(entry =>
            entry.map(p => p.path === path ? { ...p, oldValue: remoteValue } : p),
          )
          logLines.push(`[merge] "${path}": accepted remote "${remoteValue}"`)
        }
      }

      return {
        ...state,
        serverDoc: nextServerDoc,
        patches: nextPatches,
        undoStack: nextUndoStack,
        log: [...state.log, ...logLines],
      }
    }

    case 'SAVE_SUCCESS':
      return {
        ...state,
        patches: {},
        undoStack: [],
        redoStack: [],
        isSaving: false,
        log: [...state.log, '[server] Saved successfully.'],
      }

    case 'UNDO': {
      if (!state.undoStack.length) return state
      const patches = state.undoStack[state.undoStack.length - 1]
      const nextPatches = { ...state.patches }
      const logLines: string[] = []

      for (const patch of patches) {
        const serverValue = String(getIn(state.serverDoc, patch.path) ?? '')
        if (patch.oldValue === serverValue) {
          // Restoring to server baseline → field becomes clean
          delete nextPatches[patch.path]
        } else {
          nextPatches[patch.path] = { localValue: patch.oldValue, conflict: null }
        }
        logLines.push(`[undo] ${patch.path}: "${patch.newValue}" → "${patch.oldValue}"`)
      }

      return {
        ...state,
        patches: nextPatches,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, patches],
        log: [...state.log, ...logLines],
      }
    }

    case 'REDO': {
      if (!state.redoStack.length) return state
      const patches = state.redoStack[state.redoStack.length - 1]
      const nextPatches = { ...state.patches }
      const logLines: string[] = []

      for (const patch of patches) {
        const existing = nextPatches[patch.path]
        nextPatches[patch.path] = {
          localValue: patch.newValue,
          conflict: existing?.conflict ?? null,
        }
        logLines.push(`[redo] ${patch.path}: "${patch.oldValue}" → "${patch.newValue}"`)
      }

      return {
        ...state,
        patches: nextPatches,
        undoStack: [...state.undoStack, patches],
        redoStack: state.redoStack.slice(0, -1),
        log: [...state.log, ...logLines],
      }
    }

    case 'SET_SAVING':
      return { ...state, isSaving: action.value }
  }
}

// --- Component ---

export default function CollabDemo() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { serverDoc, patches, undoStack, redoStack, log, isSaving } = state

  // Derive all leaf paths and their current display values from the live serverDoc.
  // Any new field added to serverDoc automatically appears here — no FIELD_KEYS needed.
  const allPaths = useMemo(() => [...walkLeafPaths(serverDoc)], [serverDoc])

  // Detect which short labels are ambiguous (same leaf name at multiple paths)
  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const [path] of allPaths) {
      const short = path.split('.').pop() ?? path
      counts.set(short, (counts.get(short) ?? 0) + 1)
    }
    return counts
  }, [allPaths])

  const isDirty = Object.keys(patches).length > 0

  const handleEdit = useCallback((path: DotPath, newValue: string, oldValue: string) => {
    dispatch({ type: 'EDIT', path, newValue, oldValue })
  }, [])

  const handleSave = useCallback(() => {
    dispatch({ type: 'SET_SAVING', value: true })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => dispatch({ type: 'SAVE_SUCCESS' }), 800)
  }, [])

  const simulateRemote = useCallback((updates: Record<DotPath, string>) => {
    dispatch({ type: 'MERGE_REMOTE', updates })
  }, [])

  return (
    <Box sx={{ p: 3, maxWidth: 860, mx: 'auto', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom>Collab Demo — Extensible Dot-Path Tracking</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Fields are derived dynamically from the document structure — no static field list.
        "name" and "status" both appear at root and inside each product; dot-paths
        disambiguate them. Adding a new field to the document requires no code change.
      </Typography>

      {/* Dynamic field list */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {allPaths.map(([path, serverValue]) => {
          const entry = patches[path]
          const currentValue = entry?.localValue ?? String(serverValue ?? '')
          const shortLabel = path.split('.').pop() ?? path
          const isAmbiguous = (labelCounts.get(shortLabel) ?? 0) > 1

          return (
            <Box key={path}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {shortLabel}
                </Typography>
                {isAmbiguous && (
                  <Tooltip title={`Full path: ${path}`} placement="right">
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', cursor: 'help' }}>
                      ({path})
                    </Typography>
                  </Tooltip>
                )}
                {!entry && (
                  <Chip label="synced" size="small" variant="outlined" color="success" />
                )}
                {entry && !entry.conflict && (
                  <Chip label="locally edited" size="small" color="warning" />
                )}
                {entry?.conflict && (
                  <Tooltip title={`Remote offered: "${entry.conflict}"`} placement="right">
                    <Chip label={`conflict — remote: "${entry.conflict}"`} size="small" color="error" />
                  </Tooltip>
                )}
              </Stack>
              <TextField
                fullWidth
                size="small"
                value={currentValue}
                onChange={e => handleEdit(path, e.target.value, currentValue)}
              />
            </Box>
          )
        })}
      </Stack>

      {/* Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <ButtonGroup variant="outlined" size="small">
          <Button onClick={() => dispatch({ type: 'UNDO' })} disabled={!undoStack.length}>
            ↩ Undo ({undoStack.length})
          </Button>
          <Button onClick={() => dispatch({ type: 'REDO' })} disabled={!redoStack.length}>
            Redo ({redoStack.length}) ↪
          </Button>
        </ButtonGroup>

        <Button variant="contained" size="small" onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? 'Saving…' : 'Save to Server'}
        </Button>

        <Button
          variant="outlined"
          size="small"
          color="secondary"
          onClick={() => simulateRemote({
            'contact.email': 'support@acme.com',
            'products.1.price': '24.99',
          })}
        >
          Simulate: remote (non-conflicting)
        </Button>

        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={() => simulateRemote({
            'name': 'Acme Corp (server update)',
            'products.0.name': 'Widget A Pro',
            'status': 'inactive',
          })}
        >
          Simulate: remote (conflicting)
        </Button>
      </Box>

      {/* Operation log */}
      <Paper variant="outlined" sx={{ p: 2, maxHeight: 180, overflow: 'auto', bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold', display: 'block' }}>
          Operation Log (newest first)
        </Typography>
        <Stack spacing={0.25}>
          {[...log].reverse().map((entry, i) => (
            <Typography key={i} variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
              {entry}
            </Typography>
          ))}
        </Stack>
      </Paper>

      {/* Architecture note */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          <strong>Why dot-paths, not field keys:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
            <li><strong>Extensible</strong> — add any field to the document object and it tracks automatically; no <code>FIELD_KEYS</code> update needed.</li>
            <li><strong>Disambiguates duplicates</strong> — <code>name</code> and <code>products.0.name</code> are different paths even though both end in <code>"name"</code>. Ambiguous short labels show their full path.</li>
            <li><strong>Efficient undo</strong> — stores <code>InversePatch &#123; path, old, new &#125;</code> per edit instead of a full document snapshot; O(changed fields) not O(doc size).</li>
            <li><strong>Same pattern as <code>editsSlice.ts</code></strong> in the RTK Edit Demo, so the mental model transfers directly.</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  )
}
