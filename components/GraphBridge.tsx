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
}

type Bridge = {
  snapshotRef: React.MutableRefObject<GraphSnapshot | null>
  setPanHandler: (fn: ((t: Transform) => void) | null) => void
  pan: (t: Transform) => void
}

const BridgeContext = createContext<Bridge | null>(null)

export function GraphBridgeProvider({ children }: { children: ReactNode }) {
  const snapshotRef = useRef<GraphSnapshot | null>(null)
  const panHandlerRef = useRef<((t: Transform) => void) | null>(null)

  const bridge = useRef<Bridge>({
    snapshotRef,
    setPanHandler: (fn) => {
      panHandlerRef.current = fn
    },
    pan: (t) => panHandlerRef.current?.(t),
  }).current

  return <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
}

export function useGraphBridge(): Bridge | null {
  return useContext(BridgeContext)
}
