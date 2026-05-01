import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Highlighter, RotateCcw, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confirmDialog } from '@/store/dialogs'
import { useAddHighlight, useDeleteHighlight, useHighlights, usePdfPath } from './usePaper'
import type { Highlight, HighlightDraft, HighlightRect } from '@shared/types'

interface PdfViewerProps {
  paperId: string
}

interface PageState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any
  numPages: number
}

interface PendingSelection {
  page: number
  text: string
  rects: HighlightRect[]
  /** Anchor for the floating action — viewport-relative */
  anchor: { left: number; top: number }
}

export function PdfViewer({ paperId }: PdfViewerProps) {
  const { data: pdfPath, isLoading } = usePdfPath(paperId)
  const { data: highlights = [] } = useHighlights(paperId)
  const addHighlight = useAddHighlight(paperId)
  const deleteHighlight = useDeleteHighlight(paperId)

  const containerRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const pageStateRef = useRef<PageState | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [selection, setSelection] = useState<PendingSelection | null>(null)

  const pageHighlights = useMemo(
    () => highlights.filter((h) => h.page === currentPage),
    [highlights, currentPage],
  )

  // ── Render a page (canvas + text layer) ─────────────────────────────────────

  const renderPage = useCallback(async (pageNum: number, sc: number) => {
    if (!pageStateRef.current || !wrapRef.current) return
    renderTaskRef.current?.cancel()
    setIsRendering(true)
    setSelection(null)

    try {
      const pdfjs = await import('pdfjs-dist')
      const page = await pageStateRef.current.pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: sc })

      const wrap = wrapRef.current
      wrap.style.width = `${viewport.width}px`
      wrap.style.height = `${viewport.height}px`

      let canvas = wrap.querySelector<HTMLCanvasElement>('canvas.pdf-page-canvas')
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.className = 'pdf-page-canvas'
        wrap.prepend(canvas)
      }
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const ctx = canvas.getContext('2d')!
      const renderTask = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = renderTask
      await renderTask.promise

      // ── Text layer ──
      let textLayer = wrap.querySelector<HTMLDivElement>('div.pdf-text-layer')
      if (!textLayer) {
        textLayer = document.createElement('div')
        textLayer.className = 'pdf-text-layer'
        wrap.appendChild(textLayer)
      } else {
        textLayer.replaceChildren()
      }
      textLayer.style.width  = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`

      const textContent = await page.getTextContent()
      // pdfjs ≥ 4 exports `TextLayer` as a class.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PdfTextLayer = (pdfjs as any).TextLayer
      if (PdfTextLayer) {
        const layer = new PdfTextLayer({
          textContentSource: textContent,
          container: textLayer,
          viewport,
        })
        await layer.render()
      }

      setIsRendering(false)
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'RenderingCancelledException') {
        setIsRendering(false)
      }
    }
  }, [])

  // ── Load PDF document ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!pdfPath) return
    setError(null)
    setCurrentPage(1)

    const loadPdf = async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url,
          ).href
        }
        const url = `file://${pdfPath}`
        const pdfDoc = await pdfjs.getDocument({ url }).promise
        pageStateRef.current = { pdfDoc, numPages: pdfDoc.numPages }
        setNumPages(pdfDoc.numPages)
        renderPage(1, scale)
      } catch (e) {
        setError(`Failed to load PDF: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    loadPdf()

    return () => { renderTaskRef.current?.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPath])

  useEffect(() => {
    if (pageStateRef.current) renderPage(currentPage, scale)
  }, [currentPage, scale, renderPage])

  // ── Selection capture ───────────────────────────────────────────────────────

  const captureSelection = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) { setSelection(null); return }
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setSelection(null); return }

    const range = sel.getRangeAt(0)
    if (!wrap.contains(range.commonAncestorContainer)) { setSelection(null); return }

    const wrapRect = wrap.getBoundingClientRect()
    const clientRects = Array.from(range.getClientRects())
    if (clientRects.length === 0) { setSelection(null); return }

    // Convert to page-percent coords so highlights survive zoom changes.
    const rects: HighlightRect[] = clientRects
      .filter((r) => r.width > 1 && r.height > 1)
      .map((r) => ({
        x: (r.left   - wrapRect.left) / wrapRect.width,
        y: (r.top    - wrapRect.top)  / wrapRect.height,
        w: r.width  / wrapRect.width,
        h: r.height / wrapRect.height,
      }))
    if (rects.length === 0) { setSelection(null); return }

    const last = clientRects[clientRects.length - 1]
    setSelection({
      page: currentPage,
      text: sel.toString(),
      rects,
      anchor: { left: last.right, top: last.bottom },
    })
  }, [currentPage])

  useEffect(() => {
    const onUp = () => { setTimeout(captureSelection, 0) }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [captureSelection])

  // Close popover on outside click / page change.
  useEffect(() => { setSelection(null) }, [currentPage])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const onHighlight = async () => {
    if (!selection) return
    const draft: HighlightDraft = {
      page: selection.page,
      text: selection.text,
      rects: selection.rects,
    }
    setSelection(null)
    window.getSelection()?.removeAllRanges()
    addHighlight.mutate(draft)
  }

  const onDeleteHighlight = (h: Highlight) => {
    deleteHighlight.mutate(h.id)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[14.5px] text-[var(--text-muted)]">Loading PDF path…</span>
      </div>
    )
  }
  if (!pdfPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
          <span className="text-[19px]">📄</span>
        </div>
        <p className="text-[15.5px] text-[var(--text-muted)]">No PDF attached</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-[14.5px] text-[var(--danger)]">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--bg-active)] shrink-0">
        <Button
          variant="ghost" size="icon-sm"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-[13.5px] text-[var(--text-secondary)] tabular-nums">
          {currentPage} / {numPages}
        </span>
        <Button
          variant="ghost" size="icon-sm"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          disabled={currentPage >= numPages}
        >
          <ChevronRight size={14} />
        </Button>
        <span className="text-[12.5px] text-[var(--text-muted)] ml-1">
          {highlights.length > 0 && `${highlights.length} highlight${highlights.length === 1 ? '' : 's'}`}
        </span>

        <div className="flex-1" />

        <Button
          variant="ghost" size="icon-sm"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} title="Zoom out"
        >
          <ZoomOut size={13} />
        </Button>
        <span className="text-[13.5px] text-[var(--text-muted)] w-10 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost" size="icon-sm"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setScale((s) => Math.min(3, s + 0.2))} title="Zoom in"
        >
          <ZoomIn size={13} />
        </Button>
        <Button
          variant="ghost" size="icon-sm"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setScale(1.2)} title="Reset zoom"
        >
          <RotateCcw size={12} />
        </Button>
        {isRendering && (
          <span className="text-[13.5px] text-[var(--text-muted)] ml-1">Rendering…</span>
        )}
      </div>

      {/* Canvas + layers */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-[var(--bg-base)] flex justify-center pt-4 relative">
        <div ref={wrapRef} className="pdf-page-wrap">
          {/* Highlight overlay — rendered between canvas and text layer */}
          <div className="pdf-highlight-layer">
            {pageHighlights.flatMap((h) =>
              h.rects.map((r, i) => (
                <div
                  key={`${h.id}-${i}`}
                  className="pdf-highlight-rect"
                  title={h.text}
                  style={{
                    left:   `${r.x * 100}%`,
                    top:    `${r.y * 100}%`,
                    width:  `${r.w * 100}%`,
                    height: `${r.h * 100}%`,
                  }}
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = await confirmDialog({
                      title: 'Delete highlight?',
                      message: `"${h.text.slice(0, 200)}${h.text.length > 200 ? '…' : ''}"`,
                      confirmLabel: 'Delete',
                      danger: true,
                    })
                    if (ok) onDeleteHighlight(h)
                  }}
                />
              )),
            )}
          </div>
        </div>

        {selection && (
          <div
            className="fixed z-50 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-lg"
            style={{ left: selection.anchor.left + 4, top: selection.anchor.top + 4 }}
          >
            <Button variant="accent" size="sm" className="rounded-full h-7" onClick={onHighlight}>
              <Highlighter size={11} /> Highlight
            </Button>
            <Button
              variant="ghost" size="icon-sm" className="h-7 w-7 text-[var(--text-muted)]"
              onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges() }}
              title="Cancel"
            >
              <Trash2 size={11} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
