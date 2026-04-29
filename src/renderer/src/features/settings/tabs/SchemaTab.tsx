import { useState } from 'react'
import { Plus, Trash2, Loader } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/ipc'
import { confirmDialog } from '@/store/dialogs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SettingSection } from '@/components/ui/setting-section'
import type { ColumnType } from '@shared/types'

const COLUMN_TYPES: ColumnType[] = ['text', 'number', 'date', 'bool', 'select', 'multiselect', 'tags', 'url']

const CORE_COLS = new Set([
  'title', 'authors', 'year', 'venue', 'doi', 'url', 'pdf',
  'tags', 'status', 'rating', 'added_at', 'updated_at',
])

export function SchemaTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: schema, isLoading } = useQuery({
    queryKey: ['schema'],
    queryFn: () => api.schema.get(),
  })

  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<ColumnType>('text')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const handleAddColumn = async () => {
    if (!newColName.trim()) return
    setAdding(true)
    try {
      await api.schema.addColumn({ name: newColName.trim(), type: newColType, inCsv: true })
      setNewColName('')
      setNewColType('text')
      queryClient.invalidateQueries({ queryKey: ['schema'] })
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveColumn = async (name: string) => {
    const ok = await confirmDialog({
      title: t('settings.schema.customColumns.removeConfirmTitle', { name }),
      message: t('settings.schema.customColumns.removeConfirmMessage'),
      confirmLabel: t('common.remove'),
      danger: true,
    })
    if (!ok) return
    setRemoving(name)
    try {
      await api.schema.removeColumn(name)
      queryClient.invalidateQueries({ queryKey: ['schema'] })
    } finally {
      setRemoving(null)
    }
  }

  if (isLoading) {
    return <div className="text-[12px] text-[var(--text-muted)]">{t('common.loading')}</div>
  }

  const userColumns = schema?.columns.filter((c) => !CORE_COLS.has(c.name)) ?? []

  return (
    <div className="space-y-6">
      <SettingSection
        title={t('settings.schema.customColumns.title')}
        description={t('settings.schema.customColumns.description')}
      >
        {userColumns.length > 0 ? (
          <div className="space-y-1.5 pt-2">
            {userColumns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-[10px]"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[12.5px] font-medium text-[var(--text-primary)]">{col.name}</span>
                  <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                    {t(`settings.schema.types.${col.type}`)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveColumn(col.name)}
                  disabled={removing === col.name}
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                >
                  {removing === col.name ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--text-muted)] italic px-1 pt-2">
            {t('settings.schema.customColumns.empty')}
          </p>
        )}
      </SettingSection>

      <SettingSection
        title={t('settings.schema.addColumn.title')}
        description={t('settings.schema.addColumn.description')}
      >
        <div className="flex gap-2 pt-2">
          <Input
            placeholder={t('settings.schema.addColumn.namePlaceholder')}
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            className="flex-1"
          />
          <Select value={newColType} onValueChange={(v) => setNewColType(v as ColumnType)}>
            <SelectTrigger className="w-32 h-10 rounded-[10px] border-[var(--border-color)] bg-[var(--bg-elevated)] text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLUMN_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`settings.schema.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="accent"
            size="xl"
            onClick={handleAddColumn}
            disabled={adding || !newColName.trim()}
          >
            {adding ? <Loader size={12} className="animate-spin" /> : <Plus size={13} />}
          </Button>
        </div>
      </SettingSection>
    </div>
  )
}
