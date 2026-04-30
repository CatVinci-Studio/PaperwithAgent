import { useRef, useEffect, useState } from 'react'
import { Bot, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAgentStore } from '@/store/agent'
import { useLibraryStore } from '@/store/library'
import { MessageBubble, StreamingBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { api } from '@/lib/ipc'
import logoUrl from '@/assets/logo.jpg'
import type { ChatContentPart, PaperRef } from '@shared/types'

export function AgentPage() {
  const { t } = useTranslation()

  const activeId = useAgentStore((s) => s.activeId)
  const byId = useAgentStore((s) => s.byId)
  const conversations = useAgentStore((s) => s.conversations)
  const send = useAgentStore((s) => s.send)
  const abort = useAgentStore((s) => s.abort)
  const refreshConversations = useAgentStore((s) => s.refreshConversations)
  const toggleToolCall = useAgentStore((s) => s.toggleToolCall)
  const currentPaperId = useAgentStore((s) => s.currentPaperId)

  const { papers } = useLibraryStore()

  const stateKey = activeId ?? '__pending__'
  const conv = byId[stateKey]
  const messages = conv?.messages ?? []
  const isStreaming = conv?.isStreaming ?? false
  const streamingText = conv?.streamingText ?? ''

  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<ChatContentPart[]>([])
  const [mentionedPapers, setMentionedPapers] = useState<PaperRef[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshConversations().catch(() => {})
  }, [refreshConversations])

  const messageCount = messages.length
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messageCount, streamingText])

  const handleSend = async () => {
    const msg = input.trim()
    if ((!msg && attachments.length === 0 && mentionedPapers.length === 0) || isStreaming) return
    setInput('')
    const atts = attachments
    const refs = mentionedPapers
    setAttachments([])
    setMentionedPapers([])

    // Inline-expand each @-mentioned paper as a text content part so the
    // model sees the paper's full markdown without needing a tool call.
    const expanded: ChatContentPart[] = []
    for (const p of refs) {
      try {
        const detail = await api.papers.get(p.id)
        const meta = [
          `id: ${detail.id}`,
          `title: ${detail.title}`,
          detail.authors.length ? `authors: ${detail.authors.join('; ')}` : '',
          detail.year ? `year: ${detail.year}` : '',
          detail.venue ? `venue: ${detail.venue}` : '',
          detail.doi ? `doi: ${detail.doi}` : '',
        ].filter(Boolean).join('\n')
        expanded.push({
          type: 'text',
          text: `[Attached paper @${detail.title || detail.id}]\n${meta}\n\n${detail.markdown}`,
        })
      } catch {
        // ignore — fall back to whatever the model can do with the @-token in the message
      }
    }

    const finalAtts: ChatContentPart[] | undefined = (expanded.length || atts.length)
      ? [...expanded, ...atts]
      : undefined
    await send(msg, finalAtts, currentPaperId)
  }

  const contextPaper = currentPaperId ? papers.find((p) => p.id === currentPaperId) : null

  return (
    <div className="flex h-full bg-[var(--bg-base)]">
      {/* Chat area (conversation list lives in the main Sidebar) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-11 border-b border-[var(--border-color)] shrink-0">
          <div className="w-6 h-6 rounded-[8px] bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/25 flex items-center justify-center shrink-0">
            <Bot size={13} className="text-[var(--accent-color)]" />
          </div>
          <span className="text-[14.5px] font-medium text-[var(--text-secondary)] truncate flex-1">
            {activeId ? (conversations.find((c) => c.id === activeId)?.title ?? t('agent.title')) : t('agent.title')}
          </span>
          {contextPaper && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20">
              <FileText size={10} className="text-[var(--accent-color)]" />
              <span className="text-[12.5px] text-[var(--accent-color)] truncate max-w-[180px]">
                {contextPaper.title}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isStreaming ? (
            <EmptyState />
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-6">
              <div className="space-y-5">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} onToggleToolCall={toggleToolCall} />
                ))}
                {isStreaming && <StreamingBubble text={streamingText} />}
              </div>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          mentionedPapers={mentionedPapers}
          onMentionedPapersChange={setMentionedPapers}
          onSend={handleSend}
          onAbort={abort}
          isStreaming={isStreaming}
          autoFocus
        />
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
      <img src={logoUrl} alt="" className="w-16 h-16 rounded-[18px] shadow-sm" />
      <div className="text-center">
        <p className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
          {t('agent.welcomeTitle')}
        </p>
        <p className="text-[14px] text-[var(--text-muted)] mt-1">
          {t('agent.welcomeSubtitle')}
        </p>
      </div>
    </div>
  )
}
