import { useMemo, useState, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, RowSelectedEvent, RowClassParams } from 'ag-grid-community'
import { Box, Button, Tooltip, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { cellEdited, rowAdded, rowDeleted } from '../store/editsSlice'
import { subtaskBatchEdited } from '../store/subtaskEditsSlice'
import { subtaskApi } from '../store/subtaskApi'
import { makeTaskRowSelector } from '../store/selectors'
import { DirtyCell } from './DirtyCell'
import SubtaskGrid from './SubtaskGrid'
import { MOCK_DOC_ID, type TaskRow } from './mockServerDoc'

const STATUS_VALUES = ['todo', 'in-progress', 'done']
const PRIORITY_VALUES = ['low', 'medium', 'high']

const colDefs: ColDef<TaskRow>[] = [
  { field: '_divisionName', headerName: 'Region', flex: 1, editable: false },
  { field: '_projectName', headerName: 'Batch', flex: 1, editable: false },
  { field: 'name', headerName: 'Delivery Order', flex: 2, editable: true, cellRenderer: DirtyCell },
  { field: 'assignee', headerName: 'Driver', flex: 1, editable: true, cellRenderer: DirtyCell },
  {
    field: 'status',
    flex: 1,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: STATUS_VALUES },
    cellRenderer: DirtyCell,
  },
  { field: 'dueDate', headerName: 'Date', flex: 1, editable: true, cellRenderer: DirtyCell },
  { field: 'deliveryTime', headerName: 'Time', flex: 1, editable: true, cellRenderer: DirtyCell },
  {
    field: 'priority',
    flex: 1,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: PRIORITY_VALUES },
    cellRenderer: DirtyCell,
  },
]

const defaultColDef: ColDef = { minWidth: 80 }

export default function GridPanel() {
  const dispatch = useAppDispatch()
  const [selectedRow, setSelectedRow] = useState<TaskRow | null>(null)

  const rowSelector = useMemo(() => makeTaskRowSelector(MOCK_DOC_ID), [])
  const rowData = useAppSelector(rowSelector)
  const createdRows = useAppSelector((s) => s.edits.createdRows)

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<TaskRow>) => {
      if (!event.colDef.field) return
      const { _id: taskDotPath, id: taskId } = event.data

      // Always record the task-level edit
      dispatch(
        cellEdited({
          path: `${taskDotPath}.${event.colDef.field}`,
          newValue: event.newValue,
          oldValue: event.oldValue,
        }),
      )

      // dueDate cascade: propagate to all subtasks as a single grouped undo entry
      // in the subtask slice. Uses a thunk to read the subtask cache + patches.
      if (event.colDef.field === 'dueDate') {
        dispatch((_, getState) => {
          const state = getState()
          const subtasks =
            subtaskApi.endpoints.getSubtasksByTask.select(taskId)(state).data ?? []
          if (subtasks.length === 0) return
          const subPatches = state.editsSubtasks.patches
          dispatch(
            subtaskBatchEdited(
              subtasks.map((sub) => ({
                path: `${sub.id}.dueDate`,
                newValue: event.newValue,
                oldValue: subPatches[`${sub.id}.dueDate`]?.localValue ?? sub.dueDate,
              })),
            ),
          )
        })
      }
    },
    [dispatch],
  )

  const handleRowSelected = useCallback((event: RowSelectedEvent<TaskRow>) => {
    if (event.node.isSelected()) {
      setSelectedRow(event.data ?? null)
    }
  }, [])

  const handleAddRow = useCallback(() => {
    const contextRow = selectedRow ?? rowData[0]
    const newId = `new-${crypto.randomUUID().slice(0, 8)}`
    const newRow: TaskRow = {
      _id: newId,
      _divisionName: contextRow?._divisionName ?? 'North Region',
      _projectName: contextRow?._projectName ?? 'Morning Batch',
      id: newId,
      name: 'New Delivery Order',
      status: 'todo',
      assignee: '',
      dueDate: '',
      deliveryTime: '',
      priority: 'medium',
      fromLon: 103.82, fromLat: 1.35,
      toLon:   103.82, toLat:   1.35,
    }
    dispatch(rowAdded(newRow))
  }, [dispatch, selectedRow, rowData])

  const handleDeleteRow = useCallback(() => {
    if (!selectedRow) return
    const liveRow = rowData.find((r) => r._id === selectedRow._id)
    if (!liveRow) return
    dispatch(rowDeleted({ row: liveRow }))
    setSelectedRow(null)
  }, [dispatch, selectedRow, rowData])

  // Find the live (patched) version of the selected row from rowData
  const liveSelectedRow = selectedRow
    ? (rowData.find((r) => r._id === selectedRow._id) ?? null)
    : null

  const getRowStyle = useCallback(
    (params: RowClassParams<TaskRow>) => {
      if (params.data?._id && createdRows.some((r) => r._id === params.data!._id)) {
        return { backgroundColor: '#e8f5e9' }
      }
      return undefined
    },
    [createdRows],
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ display: 'flex', gap: 1, px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider', alignItems: 'center', bgcolor: 'background.paper' }}>
        <Tooltip title={selectedRow ? `Add task to ${selectedRow._divisionName} / ${selectedRow._projectName}` : "Add task (inherits first row's project)"}>
          <Button size="small" variant="outlined" color="success" onClick={handleAddRow}>
            + Add Task
          </Button>
        </Tooltip>
        <Tooltip title={selectedRow ? `Delete "${selectedRow.name}"` : 'Select a row to delete'}>
          <span>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDeleteRow}
              disabled={!selectedRow}
            >
              Delete
            </Button>
          </span>
        </Tooltip>
        {selectedRow && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Selected: {selectedRow.name}
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: '0 0 55%', minHeight: 0 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => (p.data as TaskRow)._id}
          onCellValueChanged={handleCellValueChanged}
          rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
          onRowSelected={handleRowSelected}
          getRowStyle={getRowStyle}
        />
      </Box>

      <Box
        sx={{
          flex: '0 0 45%',
          overflow: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        {liveSelectedRow ? (
          <SubtaskGrid taskRow={liveSelectedRow} />
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Select a task row above to see its subtasks (L5). Subtask cells also support dirty/conflict tracking.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
