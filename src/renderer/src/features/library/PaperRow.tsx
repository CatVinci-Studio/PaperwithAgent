import { useState } from 'react'
import { ArrowUpRight, MoreHorizontal } from 'lucide-react'
import { flexRender, type Row } from '@tanstack/react-table'
import type { PaperRef, CollectionInfo } from '@shared/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface PaperRowProps {
  row: Row<PaperRef>
  paper: PaperRef
  collections: CollectionInfo[]
  activeCollection?: string | null
  selected: boolean
  onClick: () => void
  onDelete: () => void
  onCopyDoi?: () => void
  onAddToCollection?: (name: string) => void
  onRemoveFromCollection?: (name: string) => void
}

export function PaperRow({
  row,
  paper,
  collections,
  activeCollection,
  selected,
  onClick,
  onDelete,
  onCopyDoi,
  onAddToCollection,
  onRemoveFromCollection,
}: PaperRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      data-selected={selected || undefined}
      className={cn(
        'group relative flex items-stretch border-b border-[var(--border-color)]/50 cursor-default h-9 transition-colors',
        selected
          ? 'bg-[var(--bg-accent-subtle)]'
          : 'hover:bg-[var(--bg-sidebar-hover)]'
      )}
      onClick={onClick}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent-color)] z-10" />
      )}

      {row.getVisibleCells().map((cell) => {
        const isFlex = cell.column.id === 'title'
        return (
          <div
            key={cell.id}
            style={isFlex ? { flex: '1 1 0', minWidth: 200 } : { width: cell.column.getSize() }}
            className="flex items-center px-3 overflow-hidden border-r border-[var(--border-color)]/50"
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        )
      })}

      <div
        className="w-9 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <ArrowUpRight size={12} className="mr-2" />
              Open
            </DropdownMenuItem>
            {paper.doi && onCopyDoi && (
              <DropdownMenuItem onClick={onCopyDoi}>Copy DOI</DropdownMenuItem>
            )}
            {collections.length > 0 && onAddToCollection && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Add to Collection</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {collections.map((c) => (
                    <DropdownMenuItem key={c.name} onClick={() => onAddToCollection(c.name)}>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {activeCollection && onRemoveFromCollection && (
              <DropdownMenuItem onClick={() => onRemoveFromCollection(activeCollection)}>
                Remove from &ldquo;{activeCollection}&rdquo;
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger)]/10"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
