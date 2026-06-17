import { useMemo, useState, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, RowSelectedEvent } from 'ag-grid-community'
import { Box, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { cellEdited, batchEdited } from '../store/editsSlice'
import { makeTaskRowSelector } from '../store/selectors'
import { DirtyCell } from './DirtyCell'
import SubtaskGrid from './SubtaskGrid'
import { MOCK_DOC_ID, type TaskRow } from './mockServerDoc'

const STATUS_VALUES = ['todo', 'in-progress', 'done']
const PRIORITY_VALUES = ['low', 'medium', 'high']

const colDefs: ColDef<TaskRow>[] = [
  { field: '_divisionName', headerName: 'Division', flex: 1, editable: false },
  { field: '_projectName', headerName: 'Project', flex: 1, editable: false },
  { field: 'name', headerName: 'Task Name', flex: 2, editable: true, cellRenderer: DirtyCell },
  {
    field: 'status',
    flex: 1,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: STATUS_VALUES },
    cellRenderer: DirtyCell,
  },
  { field: 'assignee', flex: 1, editable: true, cellRenderer: DirtyCell },
  { field: 'dueDate', headerName: 'Due Date', flex: 1, editable: true, cellRenderer: DirtyCell },
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
  const patches = useAppSelector((s) => s.edits.patches)

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<TaskRow>) => {
      if (!event.colDef.field) return
      const field = event.colDef.field
      const taskId = event.data._id

      if (field === 'dueDate') {
        const subtasks = event.data._rawSubtasks
        dispatch(
          batchEdited([
            { path: `${taskId}.dueDate`, newValue: event.newValue, oldValue: event.oldValue },
            ...subtasks.map((sub, i) => {
              const subPath = `${taskId}.subtasks.${i}.dueDate`
              const oldValue = patches[subPath]?.localValue ?? sub.dueDate
              return { path: subPath, newValue: event.newValue, oldValue }
            }),
          ]),
        )
      } else {
        dispatch(
          cellEdited({
            path: `${taskId}.${field}`,
            newValue: event.newValue,
            oldValue: event.oldValue,
          }),
        )
      }
    },
    [dispatch, patches],
  )

  const handleRowSelected = useCallback((event: RowSelectedEvent<TaskRow>) => {
    if (event.node.isSelected()) {
      setSelectedRow(event.data ?? null)
    }
  }, [])

  // Find the live (patched) version of the selected row from rowData
  const liveSelectedRow = selectedRow
    ? (rowData.find((r) => r._id === selectedRow._id) ?? null)
    : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Main task grid — L4 rows */}
      <Box sx={{ flex: '0 0 55%', minHeight: 0 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          getRowId={(p) => (p.data as TaskRow)._id}
          onCellValueChanged={handleCellValueChanged}
          rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
          onRowSelected={handleRowSelected}
        />
      </Box>

      {/* Subtask detail panel — L5 rows for selected task */}
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
