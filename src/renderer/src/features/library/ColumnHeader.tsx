import { ChevronUp, ChevronDown, MoreHorizontal, EyeOff, Plus } from 'lucide-react'
import type { Header } from '@tanstack/react-table'
import type { PaperRef } from '@shared/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ColumnHeaderProps {
  header: Header<PaperRef, unknown>
  onAddColumn: () => void
}

export function ColumnHeader({ header, onAddColumn }: ColumnHeaderProps) {
  const column = header.column
  const sorted = column.getIsSorted()
  const canSort = column.getCanSort()
  const canHide = column.getCanHide()
  const canResize = column.getCanResize()
  const isFlex = column.id === 'title'

  const label = String(column.columnDef.header ?? column.id)

  return (
    <div
      data-resizing={header.column.getIsResizing() ? '' : undefined}
      style={isFlex ? { flex: '1 1 0', minWidth: 200 } : { width: header.getSize() }}
      className={cn(
        'group/header relative flex items-center h-8 px-3 text-[11px] font-medium select-none',
        'border-r border-[var(--border-color)]',
        'data-[resizing]:bg-[var(--bg-elevated)]'
      )}
    >
      <button
        type="button"
        disabled={!canSort}
        onClick={canSort ? column.getToggleSortingHandler() : undefined}
        className={cn(
          'flex items-center gap-1 min-w-0 text-left',
          canSort
            ? 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer'
            : 'text-[var(--text-muted)] cursor-default',
          sorted && 'text-[var(--text-secondary)]'
        )}
      >
        <span className="truncate">{label}</span>
        {sorted === 'asc' && <ChevronUp size={10} className="shrink-0" />}
        {sorted === 'desc' && <ChevronDown size={10} className="shrink-0" />}
      </button>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="opacity-0 group-hover/header:opacity-100 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {canHide && (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff size={12} className="mr-2" />
              Hide column
            </DropdownMenuItem>
          )}
          {canHide && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={onAddColumn}>
            <Plus size={12} className="mr-2" />
            New column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canResize && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none',
            'after:absolute after:right-0 after:top-1/4 after:bottom-1/4 after:w-px',
            'after:bg-[var(--accent-color)] after:opacity-0 hover:after:opacity-60',
            'data-[resizing]:after:opacity-100'
          )}
          data-resizing={header.column.getIsResizing() ? '' : undefined}
        />
      )}
    </div>
  )
}
