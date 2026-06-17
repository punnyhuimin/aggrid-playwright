import { Tooltip } from '@mui/material'
import type { ICellRendererParams } from 'ag-grid-community'
import { useAppSelector } from '../store/index'

/** Custom AG Grid cell renderer that shows a yellow border for dirty fields
 *  and a red border + tooltip for conflicting fields. */
export function DirtyCell(params: ICellRendererParams) {
  const field = params.colDef?.field
  const rowId: string | undefined = (params.data as Record<string, unknown>)?._id as string
  const path = rowId && field ? `${rowId}.${field}` : undefined

  const editEntry = useAppSelector((state) =>
    path ? state.edits.patches[path] : undefined,
  )

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
