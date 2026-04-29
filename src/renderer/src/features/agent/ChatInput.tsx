import { useRef, useEffect } from 'react'
import { Send, Square, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { ChatContentPart } from '@shared/types'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAbort: () => void
  isStreaming: boolean
  autoFocus?: boolean
  placeholder?: string
  attachments?: ChatContentPart[]
  onAttachmentsChange?: (next: ChatContentPart[]) => void
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsDataURL(file)
  })
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onAbort,
  isStreaming,
  autoFocus,
  placeholder,
  attachments,
  onAttachmentsChange,
}: ChatInputProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('agent.placeholder')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [autoFocus])

  const hasAttachments = !!attachments && attachments.length > 0
  const canSend = !!value.trim() || hasAttachments

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  const appendImageFiles = async (files: File[]) => {
    if (!onAttachmentsChange || files.length === 0) return
    const parts: ChatContentPart[] = []
    for (const f of files) {
      try {
        const data = await readFileAsBase64(f)
        parts.push({ type: 'image', mimeType: f.type, data })
      } catch {
        // ignore individual failures
      }
    }
    if (parts.length > 0) {
      onAttachmentsChange([...(attachments ?? []), ...parts])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    await appendImageFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      await appendImageFiles(files)
    }
  }

  const removeAttachment = (index: number) => {
    if (!onAttachmentsChange || !attachments) return
    onAttachmentsChange(attachments.filter((_, i) => i !== index))
  }

  return (
    <div className="shrink-0 px-4 pb-5 pt-3">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-[16px] px-4 py-3 focus-within:border-[var(--border-focus)] shadow-sm transition-colors">
          {hasAttachments && (
            <div className="flex flex-wrap gap-2 pb-2 mb-2 border-b border-[var(--border-color)]">
              {attachments!.map((a, i) =>
                a.type === 'image' ? (
                  <div
                    key={i}
                    className="relative w-14 h-14 rounded-[8px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-base)] group"
                  >
                    <img
                      src={`data:${a.mimeType};base64,${a.data}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('agent.removeAttachment', { defaultValue: 'Remove' })}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : null,
              )}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={resolvedPlaceholder}
              rows={1}
              className="flex-1 bg-transparent border-none text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none leading-relaxed"
              style={{ height: '24px', minHeight: '24px', userSelect: 'text' }}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              size="icon"
              title={t('agent.attachImage', { defaultValue: 'Attach image' })}
              className="rounded-[10px] w-8 h-8"
              disabled={isStreaming || !onAttachmentsChange}
            >
              <Paperclip size={13} />
            </Button>

            {isStreaming ? (
              <Button
                onClick={onAbort}
                variant="destructive"
                size="icon"
                title={t('agent.stop')}
                className="rounded-[10px] w-8 h-8"
              >
                <Square size={12} />
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={!canSend}
                variant="accent"
                size="icon"
                title={t('agent.send')}
                className="rounded-[10px] w-8 h-8"
              >
                <Send size={13} />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-dim)] text-center mt-2">{t('agent.shortcutHint')}</p>
      </div>
    </div>
  )
}
