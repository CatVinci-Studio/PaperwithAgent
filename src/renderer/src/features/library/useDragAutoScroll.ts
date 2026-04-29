import { useEffect, useRef, type RefObject } from 'react'

const EDGE_PX = 40
const MAX_SPEED = 14
const MIN_SPEED = 3

/**
 * Auto-scroll a container horizontally during HTML5 drag operations.
 *
 * Listens at the document level for `dragover` (so it works regardless
 * of which child element is the drag-over target) and triggers a RAF
 * loop that scrolls the container when the cursor enters the edge zone.
 *
 * Speed scales linearly with how deep the cursor is into the edge zone.
 */
export function useDragAutoScroll(containerRef: RefObject<HTMLElement | null>): void {
  const speedRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const el = containerRef.current
      if (el && speedRef.current !== 0) {
        el.scrollLeft += speedRef.current
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const onDragOver = (e: DragEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const fromLeft  = e.clientX - rect.left
      const fromRight = rect.right - e.clientX

      if (fromLeft < EDGE_PX) {
        const depth = Math.min(1, (EDGE_PX - fromLeft) / EDGE_PX)
        speedRef.current = -Math.max(MIN_SPEED, Math.round(MAX_SPEED * depth))
      } else if (fromRight < EDGE_PX) {
        const depth = Math.min(1, (EDGE_PX - fromRight) / EDGE_PX)
        speedRef.current = Math.max(MIN_SPEED, Math.round(MAX_SPEED * depth))
      } else {
        speedRef.current = 0
      }
    }

    const stop = () => { speedRef.current = 0 }

    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragend', stop)
    document.addEventListener('drop', stop)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragend', stop)
      document.removeEventListener('drop', stop)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [containerRef])
}
