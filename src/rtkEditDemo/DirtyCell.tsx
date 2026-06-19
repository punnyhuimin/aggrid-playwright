import { Tooltip } from '@mui/material'
import type { ICellRendererParams } from 'ag-grid-community'
import { useAppSelector } from '../store/index'
import type { EditEntry } from '../store/editsSlice'

type GridContext = { patches?: Record<string, EditEntry> } | undefined

/** Custom AG Grid cell renderer that shows a yellow border for dirty fields
 *  and a red border + tooltip for conflicting fields.
 *
 *  When the host grid provides `context={{ patches }}` (e.g. SubtaskGrid using
 *  its own editsSubtasks slice), those patches are used instead of the global
 *  task-edits store. This avoids hard-wiring the renderer to a single slice. */
export function DirtyCell(params: ICellRendererParams) {
  const field = params.colDef?.field
  const rowId: string | undefined = (params.data as Record<string, unknown>)?._id as string
  const path = rowId && field ? `${rowId}.${field}` : undefined

  // Context patches take priority (set by SubtaskGrid for the subtask slice).
  const contextPatches = (params.context as GridContext)?.patches

  // Only subscribe to the task-edits store when no context patches are provided.
  const storePatch = useAppSelector((state) =>
    !contextPatches && path ? state.edits.patches[path] : undefined,
  )

  const editEntry: EditEntry | undefined = path
    ? (contextPatches?.[path] ?? storePatch)
    : undefined

  const value = String(params.value ?? '')

  if (!editEntry) {
    return <span style={{ display: 'flex', alignItems: 'center', height: '100%' }}>{value}</span>
  }

  const isConflict = editEntry.conflict != null
  const borderColor = isConflict ? '#f44336' : '#ff9800'

  const cell = (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        borderLeft: `3px solid ${borderColor}`,
        paddingLeft: 6,
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {value}
    </span>
  )

  if (isConflict) {
    return (
      <Tooltip title={`Remote offered: "${String(editEntry.conflict)}"`} placement="right" arrow>
        {cell}
      </Tooltip>
    )
  }

  return cell
}
