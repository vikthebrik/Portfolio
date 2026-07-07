'use client'

import { createContext, useContext, useRef, type ReactNode } from 'react'

/**
 * Decoupled bridge between the main ForceGraph and the persistent Minimap. The main
 * graph publishes a live snapshot to a *ref* (positions + pane size + zoom transform) —
 * no React state, so no re-render storms — and registers a pan handler. The Minimap
 * polls the ref (rAF) to draw the viewport box and calls `pan()` to move the big graph.
 * On detail pages there is no main graph, so the snapshot is null and the Minimap falls
 * back to its own headless layout.
 */

export type Transform = { x: number; y: number; k: number }

export type GraphSnapshot = {
  positions: Record<string, { x: number; y: number }>
  bounds: { w: number; h: number }
  transform: Transform
  center: string | null // the re-rooted node (null = root/overview) → minimap rings it
  version: number // bumped on every publish — the minimap's change signal (see Minimap)
}

type Bridge = {
  snapshotRef: React.MutableRefObject<GraphSnapshot | null>
  setPanHandler: (fn: ((t: Transform) => void) | null) => void
  pan: (t: Transform) => void
  // Re-root channel: GraphExplorer registers its setCenter; the Minimap calls setCenter
  // to re-root the main graph on a clicked node (null = overview).
  setCenterHandler: (fn: ((id: string | null) => void) | null) => void
  setCenter: (id: string | null) => void
}

const BridgeContext = createContext<Bridge | null>(null)

export function GraphBridgeProvider({ children }: { children: ReactNode }) {
  const snapshotRef = useRef<GraphSnapshot | null>(null)
  const panHandlerRef = useRef<((t: Transform) => void) | null>(null)
  const centerHandlerRef = useRef<((id: string | null) => void) | null>(null)

  const bridge = useRef<Bridge>({
    snapshotRef,
    setPanHandler: (fn) => {
      panHandlerRef.current = fn
    },
    pan: (t) => panHandlerRef.current?.(t),
    setCenterHandler: (fn) => {
      centerHandlerRef.current = fn
    },
    setCenter: (id) => centerHandlerRef.current?.(id),
  }).current

  return <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
}

export function useGraphBridge(): Bridge | null {
  return useContext(BridgeContext)
}
