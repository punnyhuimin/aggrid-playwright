import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../store/index'
import { cellEdited } from '../store/editsSlice'
import { applyPatchesToSubtaskRows } from '../store/selectors'
import { DirtyCell } from './DirtyCell'
import type { TaskRow, SubtaskRow } from './mockServerDoc'

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
  const patches = useAppSelector((s) => s.edits.patches)

  const rowData = useMemo(
    () => applyPatchesToSubtaskRows(taskRow._id, taskRow._rawSubtasks, patches),
    [taskRow._id, taskRow._rawSubtasks, patches],
  )

  return (
    <div style={{ padding: '8px 16px 16px' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
        Subtasks of "{taskRow.name}" (L5) — {taskRow._projectName} / {taskRow._divisionName}
      </Typography>
      <div style={{ height: rowData.length * 42 + 52, minHeight: 100 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          getRowId={(p) => (p.data as SubtaskRow)._id}
          onCellValueChanged={(e) => {
            if (!e.colDef.field) return
            dispatch(
              cellEdited({
                path: `${(e.data as SubtaskRow)._id}.${e.colDef.field}`,
                newValue: e.newValue,
                oldValue: e.oldValue,
              }),
            )
          }}
          domLayout="autoHeight"
        />
      </div>
    </div>
  )
}
