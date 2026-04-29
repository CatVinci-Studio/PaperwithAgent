import { useEffect, useRef, useState } from 'react'
import type {
  ColumnSizingState,
  VisibilityState,
  ColumnOrderState,
  ColumnPinningState,
} from '@tanstack/react-table'

const KEY_PREFIX = 'verko:column-state:'

interface ColumnState {
  sizing: ColumnSizingState
  visibility: VisibilityState
  order: ColumnOrderState
  pinning: ColumnPinningState
}

function readState(libraryName: string | null): ColumnState {
  if (!libraryName) return empty()
  try {
    const raw = localStorage.getItem(KEY_PREFIX + libraryName)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<ColumnState>
    return {
      sizing:     parsed.sizing     ?? {},
      visibility: parsed.visibility ?? {},
      order:      parsed.order      ?? [],
      pinning:    parsed.pinning    ?? { left: [], right: [] },
    }
  } catch {
    return empty()
  }
}

function empty(): ColumnState {
  return { sizing: {}, visibility: {}, order: [], pinning: { left: [], right: [] } }
}

function writeState(libraryName: string | null, state: ColumnState): void {
  if (!libraryName) return
  try {
    localStorage.setItem(KEY_PREFIX + libraryName, JSON.stringify(state))
  } catch {
    // localStorage full or blocked — ignore
  }
}

/**
 * Per-library, localStorage-backed column sizing/visibility/order/pinning state.
 * Scoped to the active library; the library schema itself stays untouched
 * (CSV + Markdown remain a clean data layer for the agent).
 */
export function useColumnPersistence(libraryName: string | null) {
  const initial = readState(libraryName)
  const [sizing, setSizing] = useState<ColumnSizingState>(initial.sizing)
  const [visibility, setVisibility] = useState<VisibilityState>(initial.visibility)
  const [order, setOrder] = useState<ColumnOrderState>(initial.order)
  const [pinning, setPinning] = useState<ColumnPinningState>(initial.pinning)

  // Reload when active library changes
  const lastLibrary = useRef(libraryName)
  useEffect(() => {
    if (lastLibrary.current === libraryName) return
    lastLibrary.current = libraryName
    const next = readState(libraryName)
    setSizing(next.sizing)
    setVisibility(next.visibility)
    setOrder(next.order)
    setPinning(next.pinning)
  }, [libraryName])

  // Persist on change
  useEffect(() => {
    writeState(libraryName, { sizing, visibility, order, pinning })
  }, [libraryName, sizing, visibility, order, pinning])

  return {
    sizing, setSizing,
    visibility, setVisibility,
    order, setOrder,
    pinning, setPinning,
  }
}
