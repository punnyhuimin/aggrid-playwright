import { useMemo, useState, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, RowSelectedEvent, RowClassParams } from 'ag-grid-community'
import { Box, Button, CircularProgress, Tooltip, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import {
  subtaskCellEdited,
  subtaskRowAdded,
  subtaskRowDeleted,
} from '../store/subtaskEditsSlice'
import { useGetSubtasksByTaskQuery } from '../store/subtaskApi'
import { flattenSubtaskRow } from './mockServerDoc'
import { DirtyCell } from './DirtyCell'
import type { TaskRow, SubtaskRow } from './mockServerDoc'
import type { EditEntry } from '../store/editsSlice'

interface SubtaskGridProps {
  taskRow: TaskRow
}

const STATUS_VALUES = ['todo', 'in-progress', 'done']

const colDefs: ColDef<SubtaskRow>[] = [
  { field: 'name', headerName: 'Subtask', editable: true, flex: 2, cellRenderer: DirtyCell },
  {
    field: 'status',
    editable: true,
    flex: 1,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: STATUS_VALUES },
    cellRenderer: DirtyCell,
  },
  { field: 'dueDate', headerName: 'Due Date', editable: true, flex: 1, cellRenderer: DirtyCell },
  { field: 'metricCount', headerName: 'Metrics', flex: 1 },
]

export default function SubtaskGrid({ taskRow }: SubtaskGridProps) {
  const dispatch = useAppDispatch()
  const [selectedSubtask, setSelectedSubtask] = useState<SubtaskRow | null>(null)

  // Fetch from the subtask microservice (separate RTK Query API)
  const { data: serverSubtasks, isLoading } = useGetSubtasksByTaskQuery(taskRow.id)

  // Subtask-specific edits state — independent from the task edits slice
  const patches = useAppSelector((s) => s.editsSubtasks.patches)
  const createdRows = useAppSelector((s) => s.editsSubtasks.createdRows)
  const deletedRowIds = useAppSelector((s) => s.editsSubtasks.deletedRowIds)

  // Flatten server subtasks → rows, filter deleted, apply patches, append created
  const rowData = useMemo((): SubtaskRow[] => {
    const serverRows = (serverSubtasks ?? [])
      .filter((s) => !deletedRowIds.includes(s.id))
      .map((entity) => {
        const row = flattenSubtaskRow(entity) as Record<string, unknown> & SubtaskRow
        const prefix = row._id + '.'
        for (const [path, entry] of Object.entries(patches)) {
          if (!path.startsWith(prefix)) continue
          const field = path.slice(prefix.length)
          if (!field.includes('.')) row[field] = entry.localValue
        }
        return row as SubtaskRow
      })

    // Locally created subtasks for this task (patched the same way)
    const created = (createdRows as SubtaskRow[])
      .filter((r) => r.taskId === taskRow.id)
      .map((row) => {
        const result = { ...row } as Record<string, unknown> & SubtaskRow
        const prefix = row._id + '.'
        for (const [path, entry] of Object.entries(patches)) {
          if (!path.startsWith(prefix)) continue
          const field = path.slice(prefix.length)
          if (!field.includes('.')) result[field] = entry.localValue
        }
        return result as SubtaskRow
      })

    return [...serverRows, ...created]
  }, [serverSubtasks, patches, createdRows, deletedRowIds, taskRow.id])

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<SubtaskRow>) => {
      if (!event.colDef.field) return
      dispatch(
        subtaskCellEdited({
          path: `${(event.data as SubtaskRow)._id}.${event.colDef.field}`,
          newValue: event.newValue,
          oldValue: event.oldValue,
        }),
      )
    },
    [dispatch],
  )

  const handleRowSelected = useCallback((event: RowSelectedEvent<SubtaskRow>) => {
    if (event.node.isSelected()) setSelectedSubtask(event.data ?? null)
  }, [])

  const handleAddSubtask = useCallback(() => {
    const newId = `new-${crypto.randomUUID().slice(0, 8)}`
    const newRow: SubtaskRow = {
      _id: newId,
      taskId: taskRow.id,
      id: newId,
      name: 'New Subtask',
      status: 'todo',
      dueDate: '',
      metricCount: 0,
    }
    dispatch(subtaskRowAdded(newRow))
  }, [dispatch, taskRow.id])

  const handleDeleteSubtask = useCallback(() => {
    if (!selectedSubtask) return
    const liveRow = rowData.find((r) => r._id === selectedSubtask._id)
    if (!liveRow) return
    dispatch(subtaskRowDeleted({ row: liveRow }))
    setSelectedSubtask(null)
  }, [dispatch, selectedSubtask, rowData])

  // Pass patches via AG Grid context so DirtyCell reads from the subtask slice,
  // not from the task-edits store.
  const gridContext = useMemo(
    (): { patches: Record<string, EditEntry> } => ({ patches }),
    [patches],
  )

  const getRowStyle = useCallback(
    (params: RowClassParams<SubtaskRow>) => {
      if (params.data?._id && (createdRows as SubtaskRow[]).some((r) => r._id === params.data!._id)) {
        return { backgroundColor: '#e8f5e9' }
      }
      return undefined
    },
    [createdRows],
  )

  if (isLoading) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption">Loading subtasks…</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, pt: 1 }}>
        Subtasks of &quot;{taskRow.name}&quot; (L5) — {taskRow._projectName} / {taskRow._divisionName}
      </Typography>

      {/* Subtask toolbar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
        <Button size="small" variant="outlined" color="success" onClick={handleAddSubtask}>
          + Add Subtask
        </Button>
        <Tooltip title={selectedSubtask ? `Delete "${selectedSubtask.name}"` : 'Select a subtask to delete'}>
          <span>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDeleteSubtask}
              disabled={!selectedSubtask}
            >
              Delete
            </Button>
          </span>
        </Tooltip>
        {selectedSubtask && (
          <Typography variant="caption" color="text.secondary">
            Selected: {selectedSubtask.name}
          </Typography>
        )}
      </Box>

      <div style={{ height: rowData.length * 42 + 52, minHeight: 100 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          getRowId={(p) => (p.data as SubtaskRow)._id}
          onCellValueChanged={handleCellValueChanged}
          rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
          onRowSelected={handleRowSelected}
          context={gridContext}
          getRowStyle={getRowStyle}
          domLayout="autoHeight"
        />
      </div>
    </Box>
  )
}
