import { ArrowUpRight, Trash2 } from 'lucide-react'
import { flexRender, type Row } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import type { PaperRef, CollectionInfo } from '@shared/types'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'
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
  const { t } = useTranslation()

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-selected={selected || undefined}
          onDoubleClick={(e) => {
            if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
            window.getSelection()?.removeAllRanges()
            onClick()
          }}
          className={cn(
            'group relative flex items-stretch border-b border-[var(--border-color)]/50 cursor-default h-9 transition-colors w-fit min-w-full',
            selected
              ? 'bg-[var(--bg-accent-subtle)]'
              : 'hover:bg-[var(--bg-sidebar-hover)]',
          )}
        >
          {selected && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent-color)] z-10" />
          )}

          {row.getVisibleCells().map((cell, i, all) => (
            <div
              key={cell.id}
              style={{ width: cell.column.getSize() }}
              className={cn(
                'shrink-0 flex items-center px-3 overflow-hidden',
                i < all.length - 1 && 'border-r border-[var(--border-color)]/50',
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-[180px]">
        <ContextMenuItem onClick={onClick}>
          <ArrowUpRight size={12} />
          {t('common.open')}
        </ContextMenuItem>
        {paper.doi && onCopyDoi && (
          <ContextMenuItem onClick={onCopyDoi}>Copy DOI</ContextMenuItem>
        )}
        {collections.length > 0 && onAddToCollection && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Add to Collection</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {collections.map((c) => (
                <ContextMenuItem key={c.name} onClick={() => onAddToCollection(c.name)}>
                  {c.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {activeCollection && onRemoveFromCollection && (
          <ContextMenuItem onClick={() => onRemoveFromCollection(activeCollection)}>
            Remove from &ldquo;{activeCollection}&rdquo;
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          className="text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger)]/10"
        >
          <Trash2 size={12} />
          {t('common.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
