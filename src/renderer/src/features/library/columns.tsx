import type { ColumnDef } from '@tanstack/react-table'
import { Star, FileText } from 'lucide-react'
import type { PaperRef, Column } from '@shared/types'
import { ChipStatus } from '@/components/common/ChipStatus'
import { ChipTag } from '@/components/common/ChipTag'
import { formatAuthors, formatYear } from '@/lib/utils'

const ITALIC_PLACEHOLDER = (label: string) => (
  <span className="text-[var(--text-muted)] font-normal italic">{label}</span>
)

export function buildColumns(extras: Column[]): ColumnDef<PaperRef>[] {
  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      enableResizing: false,
      enableHiding: false,
      size: 0,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            {p.hasPdf && (
              <FileText size={12} className="shrink-0 text-[var(--text-dim)] group-hover:text-[var(--text-muted)]" />
            )}
            <span className="text-[13px] truncate font-medium text-[var(--text-bright)] group-data-[selected=true]:text-[var(--text-primary)]">
              {p.title || ITALIC_PLACEHOLDER('Untitled')}
            </span>
          </div>
        )
      },
    },
    {
      id: 'authors',
      accessorKey: 'authors',
      header: 'Authors',
      size: 168,
      minSize: 80,
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--text-secondary)] truncate">
          {formatAuthors(row.original.authors)}
        </span>
      ),
    },
    {
      id: 'year',
      accessorKey: 'year',
      header: 'Year',
      size: 64,
      minSize: 48,
      cell: ({ row }) => (
        <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">
          {formatYear(row.original.year)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 104,
      minSize: 80,
      cell: ({ row }) => <ChipStatus status={row.original.status} />,
    },
    {
      id: 'tags',
      accessorKey: 'tags',
      header: 'Tags',
      enableSorting: false,
      size: 144,
      minSize: 80,
      cell: ({ row }) => {
        const tags = row.original.tags
        if (!tags?.length) return null
        return (
          <div className="flex items-center gap-1 overflow-hidden">
            {tags.slice(0, 2).map((t) => (
              <ChipTag key={t} tag={t} />
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )
      },
    },
    ...extras.map((col): ColumnDef<PaperRef> => ({
      id: col.name,
      accessorFn: (paper) => paper[col.name],
      header: col.name,
      size: 96,
      minSize: 60,
      cell: ({ getValue }) => renderExtraValue(col, getValue()),
    })),
  ]
}

function renderExtraValue(col: Column, value: unknown) {
  if (value == null || value === '') return null
  if (col.name === 'rating' && typeof value === 'number' && value > 0) {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: value }).map((_, i) => (
          <Star key={i} size={9} className="fill-[var(--warning)] text-[var(--warning)]" />
        ))}
      </div>
    )
  }
  if (col.type === 'tags' && Array.isArray(value)) {
    return (
      <span className="text-[11px] text-[var(--text-muted)] truncate">
        {(value as string[]).join(', ')}
      </span>
    )
  }
  return (
    <span className="text-[11px] text-[var(--text-secondary)] truncate">
      {String(value)}
    </span>
  )
}
