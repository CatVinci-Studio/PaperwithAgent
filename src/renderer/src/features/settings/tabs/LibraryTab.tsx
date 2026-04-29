import { Check, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLibraryStore } from '@/store/library'
import { api } from '@/lib/ipc'
import { promptDialog } from '@/store/dialogs'
import { Button } from '@/components/ui/button'
import { SettingSection } from '@/components/ui/setting-section'
import { cn } from '@/lib/utils'
import type { LibraryInfo } from '@shared/types'

export function LibraryTab() {
  const { t } = useTranslation()
  const { libraries, refreshLibraries, switchLibrary } = useLibraryStore()

  const handleAddLibrary = async () => {
    const result = await promptDialog({
      title: t('settings.libraries.addDialog.title'),
      description: t('settings.libraries.addDialog.description'),
      fields: [
        {
          name: 'name',
          label: t('settings.libraries.addDialog.displayName'),
          placeholder: 'My research',
          required: true,
        },
        {
          name: 'path',
          label: t('settings.libraries.addDialog.absolutePath'),
          placeholder: '/Users/you/Papers',
          required: true,
        },
      ],
      confirmLabel: t('common.add'),
    })
    if (!result) return
    try {
      await api.libraries.add({ kind: 'local', name: result.name, path: result.path, initialize: true })
      await refreshLibraries()
    } catch (e) {
      console.error(e)
    }
  }

  const summarize = (lib: LibraryInfo): string =>
    lib.kind === 'local' ? lib.path : `${lib.bucket}${lib.prefix ? '/' + lib.prefix : ''} (${lib.region})`

  return (
    <SettingSection
      title={t('settings.libraries.title')}
      description={t('settings.libraries.description')}
    >
      <div className="space-y-2 pt-2">
        {libraries.map((lib: LibraryInfo) => (
          <div
            key={lib.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-colors',
              lib.active
                ? 'bg-[var(--bg-accent-subtle)] border-[var(--accent-color)]/25'
                : 'bg-[var(--bg-elevated)] border-[var(--border-color)]'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-[var(--text-primary)]">{lib.name}</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{summarize(lib)}</div>
              <div className="text-[10.5px] text-[var(--text-muted)] mt-0.5">
                {t('settings.libraries.papers', { count: lib.paperCount })}
              </div>
            </div>
            {lib.active ? (
              <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25">
                <Check size={10} className="text-[var(--accent-color)]" />
                <span className="text-[10.5px] text-[var(--accent-color)] font-medium">
                  {t('settings.libraries.active')}
                </span>
              </div>
            ) : (
              <Button
                onClick={() => switchLibrary(lib.id)}
                variant="outline"
                size="sm"
                className="rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)]"
              >
                {t('settings.libraries.switch')}
              </Button>
            )}
          </div>
        ))}

        <button
          onClick={handleAddLibrary}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-[10px] border border-dashed border-[var(--border-color)] text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-focus)] transition-colors"
        >
          <Plus size={13} />
          {t('settings.libraries.addExisting')}
        </button>
      </div>
    </SettingSection>
  )
}
