'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { forceSimulation } from 'd3-force'
import { ABOUT_ID, buildGraph, type GraphNode } from '@/lib/graph'
import { useIntroActive } from '@/lib/intro'
import {
  applyLayout,
  chooseDefaultLayout,
  type LayoutKind,
  type SimNode,
} from '@/lib/layouts'
import { useGraphBridge, type GraphSnapshot } from './GraphBridge'

// localStorage keys (owned by ForceGraph / GraphExplorer; duplicated here to avoid
// pulling those heavy client modules into the minimap bundle).
const POSITIONS_KEY = 'portfolio:graph:positions:v1'
const VIEW_KEY = 'portfolio:graph:view:v1'

const W = 208 // mini-map width
const H = 156 // mini-map height
const PAD = 12

type Positions = Record<string, { x: number; y: number }>

/** The current graph node for a route: /work/<slug> → slug, /about → how-it-works. */
function currentIdFromPath(pathname: string): string | null {
  if (pathname === '/about') return ABOUT_ID
  const m = pathname.match(/^\/work\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

/**
 * Persistent minimap, bottom-right. On the main graph it mirrors the big graph's live
 * positions (from the bridge) and draws a draggable viewport box that pans it. On detail
 * pages — where the big graph is hidden — it runs its own headless layout so you can
 * still see where you are and jump to any node. Hidden on mobile.
 */
export function Minimap() {
  const pathname = usePathname()
  const router = useRouter()
  const bridge = useGraphBridge()
  const svgRef = useRef<SVGSVGElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  // Hidden while the launch intro runs — the first frames belong to the web.
  const introActive = useIntroActive()
  const introHide = introActive
    ? ' pointer-events-none opacity-0'
    : ' transition-opacity duration-700'

  const graph = useMemo(() => buildGraph(), [])
  const onMainPage = pathname === '/'
  const currentId = currentIdFromPath(pathname)

  const [snapshot, setSnapshot] = useState<GraphSnapshot | null>(null)

  // Main page: poll the bridge ref via rAF; commit to state only when it changes.
  useEffect(() => {
    if (!onMainPage || !bridge) {
      return
    }
    let raf = 0
    let sig = -1
    const loop = () => {
      const s = bridge.snapshotRef.current
      // The publisher bumps `version` on every tick/zoom; comparing it (not a sampled
      // position) is what keeps the minimap live through the whole settle instead of
      // freezing once the root node — which pins early — stops moving.
      if (s && s.version !== sig) {
        sig = s.version
        setSnapshot({ ...s })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [onMainPage, bridge, graph])

  // Detail page: compute a headless layout once (own positions, no viewport box).
  useEffect(() => {
    if (onMainPage) return
    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }))
    const pins = readPins()
    for (const n of nodes) {
      const p = pins[n.id]
      if (p) {
        n.x = p.x
        n.y = p.y
        n.fx = p.x
        n.fy = p.y
      }
    }
    const edges = graph.edges.map((e) => ({ ...e }))
    const sim = forceSimulation(nodes)
    applyLayout(sim, readLayout(chooseDefaultLayout(graph)), {
      w: 600,
      h: 450,
      edges,
    })
    sim.stop()
    sim.tick(220)
    const positions: Positions = {}
    for (const n of nodes) positions[n.id] = { x: n.x ?? 0, y: n.y ?? 0 }
    setSnapshot({
      positions,
      bounds: { w: 600, h: 450 },
      transform: { x: 0, y: 0, k: 1 },
      center: null, // detail pages highlight via `currentId`, not the snapshot center
      version: 0, // static headless layout — no live updates to signal
    })
  }, [onMainPage, pathname, graph])

  const fit = useMemo(() => makeFit(snapshot?.positions), [snapshot])

  // Which node to emphasize: on the main graph, the re-rooted center (from the snapshot);
  // on a detail page, the node whose case study is open.
  const highlightId = onMainPage ? (snapshot?.center ?? null) : currentId

  const navigate = (n: GraphNode) => {
    // On the main graph, clicking a node re-roots it in place (same as the big graph) —
    // no page load. `about` is a real page, so it still routes.
    if (onMainPage && bridge) {
      if (n.type === 'about') router.push('/about')
      else bridge.setCenter(n.type === 'root' ? null : n.id)
      return
    }
    // On detail pages the minimap is the way around: navigate to traverse.
    if (n.type === 'project') router.push(n.url ?? `/work/${n.id}`)
    else if (n.type === 'about') router.push('/about')
    else if (n.type === 'category') router.push(`/?focus=${n.id}`)
    else router.push('/')
  }

  // Drag anywhere on the map (main page) to recenter the big graph there.
  const panFromEvent = (clientX: number, clientY: number) => {
    if (!onMainPage || !bridge || !snapshot || !fit) return
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const g = fit.invert(clientX - r.left, clientY - r.top)
    const { w, h } = snapshot.bounds
    const k = snapshot.transform.k
    bridge.pan({ x: w / 2 - k * g.x, y: h / 2 - k * g.y, k })
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className={
          'fixed bottom-4 right-4 z-20 hidden border border-line bg-surface px-3 py-1 text-xs uppercase tracking-wide text-muted hover:text-clay md:block' +
          introHide
        }
      >
        map ▾
      </button>
    )
  }

  const viewBox =
    onMainPage && snapshot && fit ? viewportRect(snapshot, fit) : null

  return (
    <div
      className={
        'fixed bottom-4 right-4 z-20 hidden border border-line bg-surface md:block' +
        introHide
      }
    >
      <div className="flex items-center justify-between border-b border-line px-2 py-1 text-xs uppercase tracking-wide text-faint">
        <span>map</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-muted hover:text-clay"
          aria-label="Collapse minimap"
        >
          ▴
        </button>
      </div>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        className="block touch-none"
        role="img"
        aria-label="Graph minimap"
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[data-mini-node]')) return
          e.currentTarget.setPointerCapture(e.pointerId)
          panFromEvent(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) panFromEvent(e.clientX, e.clientY)
        }}
      >
        {snapshot && fit && (
          <>
            <g>
              {graph.edges.map((edge) => {
                const s = snapshot.positions[edge.source]
                const t = snapshot.positions[edge.target]
                if (!s || !t) return null
                const a = fit.map(s.x, s.y)
                const b = fit.map(t.x, t.y)
                return (
                  <line
                    key={`${edge.source}:${edge.target}:${edge.kind}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="stroke-line"
                    strokeWidth={0.5}
                    opacity={0.6}
                  />
                )
              })}
            </g>
            <g>
              {graph.nodes.map((n) => {
                const p = snapshot.positions[n.id]
                if (!p) return null
                const c = fit.map(p.x, p.y)
                const isCurrent = n.id === highlightId
                const r = n.type === 'root' ? 3.5 : n.type === 'project' ? 2 : 3
                return (
                  <g key={n.id}>
                    {isCurrent && (
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={r + 2.5}
                        fill="none"
                        className="stroke-clay"
                        strokeWidth={1}
                        pointerEvents="none"
                      />
                    )}
                    <circle
                      data-mini-node
                      cx={c.x}
                      cy={c.y}
                      r={r}
                      className={
                        (isCurrent ? 'fill-clay' : 'fill-muted') + ' cursor-pointer'
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(n)
                      }}
                    >
                      <title>{n.label}</title>
                    </circle>
                  </g>
                )
              })}
            </g>
            {viewBox && (
              <rect
                x={viewBox.x}
                y={viewBox.y}
                width={viewBox.w}
                height={viewBox.h}
                className="fill-clay-soft stroke-clay"
                fillOpacity={0.12}
                strokeWidth={1}
                pointerEvents="none"
              />
            )}
          </>
        )}
      </svg>
    </div>
  )
}

// --- helpers ---

type Fit = {
  map: (gx: number, gy: number) => { x: number; y: number }
  invert: (mx: number, my: number) => { x: number; y: number }
  s: number
}

function makeFit(positions?: Positions): Fit | null {
  if (!positions) return null
  const pts = Object.values(positions)
  if (pts.length === 0) return null
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const s = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY)
  const offX = (W - spanX * s) / 2
  const offY = (H - spanY * s) / 2
  return {
    s,
    map: (gx, gy) => ({ x: offX + (gx - minX) * s, y: offY + (gy - minY) * s }),
    invert: (mx, my) => ({ x: minX + (mx - offX) / s, y: minY + (my - offY) / s }),
  }
}

function viewportRect(snapshot: GraphSnapshot, fit: Fit) {
  const { transform: t, bounds } = snapshot
  // Visible graph-space region under the current zoom/pan.
  const g0 = { x: -t.x / t.k, y: -t.y / t.k }
  const g1 = { x: (bounds.w - t.x) / t.k, y: (bounds.h - t.y) / t.k }
  const a = fit.map(g0.x, g0.y)
  const b = fit.map(g1.x, g1.y)
  // The map is fit to the node cloud, but the visible region can extend past it (empty
  // margins around the graph). Clamp the box to the map frame so it reads as "the part of
  // the graph you're looking at" rather than overflowing the panel.
  const x0 = Math.max(0, Math.min(a.x, W))
  const y0 = Math.max(0, Math.min(a.y, H))
  const x1 = Math.max(0, Math.min(b.x, W))
  const y1 = Math.max(0, Math.min(b.y, H))
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }
}

function readPins(): Positions {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(POSITIONS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function readLayout(fallback: LayoutKind): LayoutKind {
  if (typeof window === 'undefined') return fallback
  try {
    const v = JSON.parse(window.localStorage.getItem(VIEW_KEY) ?? '{}')
    return v.layout && v.layout !== 'auto' ? v.layout : fallback
  } catch {
    return fallback
  }
}
