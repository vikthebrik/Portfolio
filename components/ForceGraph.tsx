'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import {
  ABOUT_ID,
  ROOT_ID,
  type EdgeKind,
  type Graph,
  type GraphEdge,
  type GraphNode,
} from '@/lib/graph'

type SimNode = GraphNode & SimulationNodeDatum
type SimEdge = { source: string; target: string }

const POSITIONS_KEY = 'portfolio:graph:positions:v1'

// Per-edge-kind tuning. spoke binds root↔hub tight; membership pulls a project to its
// hub; related is a medium bond; tag is a long faint thread.
const LINK_DISTANCE: Record<EdgeKind, number> = {
  spoke: 90,
  membership: 70,
  related: 120,
  tag: 200,
}
const STROKE_WIDTH: Record<EdgeKind, number> = {
  spoke: 1.5,
  membership: 1.2,
  related: 1,
  tag: 0.75,
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const nodeRadius = (n: GraphNode) =>
  n.type === 'root' ? 15 : n.type === 'project' ? 5 + Math.min(n.degree, 6) : 11

/**
 * Obsidian-style force graph: circular nodes, soft curved links, hover/focus
 * highlight-with-dim, and labels that fade in with zoom. State-driven (cheap at ~12
 * nodes) so styling composes. Drag pins a node and persists its position to
 * localStorage; pan/zoom via d3-zoom (filtered off nodes so drag and pan don't fight).
 */
export function ForceGraph({
  graph,
  activeFocus,
  onActivateNode,
}: {
  graph: Graph
  activeFocus: string | null
  onActivateNode: (node: GraphNode) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const sceneRef = useRef<SVGGElement>(null)
  const simNodesRef = useRef<SimNode[]>([])
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)
  const rafPending = useRef(false)

  const [, setTick] = useState(0)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [k, setK] = useState(1) // zoom scale → drives label fade
  const [hovered, setHovered] = useState<string | null>(null)

  const byId = useMemo(() => {
    const m = new Map<string, SimNode>()
    for (const n of simNodesRef.current) m.set(n.id, n)
    return m
    // rebuilt whenever the sim rebuilds (graph identity changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const n of graph.nodes) m.set(n.id, new Set())
    for (const e of graph.edges) {
      m.get(e.source)?.add(e.target)
      m.get(e.target)?.add(e.source)
    }
    return m
  }, [graph])

  // Build the simulation once per graph identity (the node set is stable per session).
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const w = wrap.clientWidth || 800
    const h = wrap.clientHeight || 600
    setSize({ w, h })

    const saved = loadPositions()
    const nodes: SimNode[] = graph.nodes.map((n) => {
      const s: SimNode = { ...n }
      const p = saved[n.id]
      if (p) {
        s.x = p.x
        s.y = p.y
        s.fx = p.x // hand-placed nodes stay pinned
        s.fy = p.y
      }
      return s
    })
    simNodesRef.current = nodes
    const edges: SimEdge[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }))

    const sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(edges)
          .id((d) => d.id)
          .distance((_l, i) => LINK_DISTANCE[graph.edges[i].kind])
          .strength((_l, i) => graph.edges[i].weight),
      )
      .force('charge', forceManyBody<SimNode>().strength(-420))
      .force('collide', forceCollide<SimNode>((n) => nodeRadius(n) + 26))
      .force('center', forceCenter(w / 2, h / 2))
    simRef.current = sim

    const requestPaint = () => {
      if (rafPending.current) return
      rafPending.current = true
      requestAnimationFrame(() => {
        rafPending.current = false
        setTick((t) => t + 1)
      })
    }

    if (prefersReducedMotion()) {
      sim.stop()
      sim.tick(300)
      setTick((t) => t + 1)
    } else {
      sim.on('tick', requestPaint)
    }

    const ro = new ResizeObserver(() => {
      if (!wrap.clientWidth) return
      const nw = wrap.clientWidth
      const nh = wrap.clientHeight
      setSize({ w: nw, h: nh })
      sim.force('center', forceCenter(nw / 2, nh / 2))
      if (!prefersReducedMotion()) sim.alpha(0.2).restart()
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      sim.stop()
      sim.on('tick', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Pan/zoom on the svg; ignore events that start on a node so drag still works.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const behavior: ZoomBehavior<SVGSVGElement, unknown> = d3zoom<
      SVGSVGElement,
      unknown
    >()
      .scaleExtent([0.4, 4])
      .filter((event: Event) => {
        const t = event.target as Element
        return !t.closest('[data-node]') // nodes handle their own drag
      })
      .on('zoom', (event) => setK(event.transform.k))
    const sel = select(svg)
    sel.call(behavior)
    return () => {
      sel.on('.zoom', null)
    }
  }, [])

  // --- node drag (pins + persists) and click (activate) on pointer events ---
  const onNodePointerDown =
    (node: SimNode) => (e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation()
      const sim = simRef.current
      const scene = sceneRef.current
      if (!sim || !scene) return
      ;(e.target as Element).setPointerCapture?.(e.pointerId)

      const start = { x: e.clientX, y: e.clientY }
      let moved = false

      const toLocal = (cx: number, cy: number) => {
        const ctm = scene.getScreenCTM()
        if (!ctm) return { x: cx, y: cy }
        const pt = new DOMPoint(cx, cy).matrixTransform(ctm.inverse())
        return { x: pt.x, y: pt.y }
      }

      if (!prefersReducedMotion()) sim.alphaTarget(0.2).restart()

      const move = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 3) moved = true
        const p = toLocal(ev.clientX, ev.clientY)
        node.fx = p.x
        node.fy = p.y
        if (prefersReducedMotion()) {
          sim.tick(1)
          setTick((t) => t + 1)
        }
      }
      const up = () => {
        sim.alphaTarget(0)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (moved) {
          savePosition(node.id, node.fx ?? node.x ?? 0, node.fy ?? node.y ?? 0)
        } else {
          onActivateNode(node)
        }
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

  // --- emphasis: hover (transient) overrides soft focus (a category) ---
  const focusSet = useMemo(() => {
    if (!activeFocus) return null
    const s = new Set<string>([activeFocus, ROOT_ID])
    for (const n of graph.nodes)
      if (n.type === 'project' && n.category === activeFocus) s.add(n.id)
    return s
  }, [graph, activeFocus])

  const activeSet = hovered
    ? new Set<string>([hovered, ...(adjacency.get(hovered) ?? [])])
    : focusSet
  const focal = hovered ?? activeFocus

  const isOn = (id: string) => !activeSet || activeSet.has(id)
  const pos = (id: string) => byId.get(id)

  const labelOpacity = (n: GraphNode) => {
    if (!isOn(n.id)) return 0
    if (n.type !== 'project' || n.pinned || hovered === n.id) return 1
    return clamp((k - 0.7) / 0.8, 0, 1) // fade project labels in as you zoom in
  }

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label="Graph of projects. Use the sidebar to navigate."
        className="h-full w-full touch-none"
      >
        <g ref={sceneRef} transform={zoomIdentity.scale(k).toString()}>
          <g>
            {graph.edges.map((e) => {
              const s = pos(e.source)
              const t = pos(e.target)
              if (!s) return null
              const on = !activeSet || (activeSet.has(e.source) && activeSet.has(e.target))
              const touchesFocal = focal != null && (e.source === focal || e.target === focal)
              return (
                <path
                  key={`${e.source}::${e.target}:${e.kind}`}
                  d={curve(s.x ?? 0, s.y ?? 0, t?.x ?? 0, t?.y ?? 0)}
                  fill="none"
                  className={touchesFocal && on ? 'stroke-clay' : 'stroke-line'}
                  style={{
                    strokeWidth: STROKE_WIDTH[e.kind],
                    opacity: activeSet ? (on ? 0.9 : 0.06) : e.kind === 'tag' ? 0.5 : 0.8,
                  }}
                />
              )
            })}
          </g>

          <g>
            {graph.nodes.map((n) => {
              const p = pos(n.id)
              const on = isOn(n.id)
              const isFocal = n.id === focal
              const r = nodeRadius(n)
              const fill = isFocal
                ? 'fill-clay'
                : n.type === 'project'
                  ? 'fill-muted'
                  : 'fill-ink'
              return (
                <g
                  key={n.id}
                  data-node
                  transform={`translate(${p?.x ?? 0},${p?.y ?? 0})`}
                  className="cursor-pointer"
                  style={{ opacity: on ? 1 : 0.15 }}
                  onPointerDown={onNodePointerDown(n as SimNode)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  aria-label={n.label}
                >
                  <circle r={r} className={fill} />
                  <text
                    y={r + 11}
                    textAnchor="middle"
                    className={[
                      'select-none font-mono',
                      n.type === 'project' ? 'text-[10px]' : 'text-[11px]',
                      isFocal ? 'fill-clay' : n.type === 'project' ? 'fill-muted' : 'fill-ink',
                      n.type === 'root' || n.type === 'category' ? 'font-bold' : '',
                    ].join(' ')}
                    style={{ opacity: labelOpacity(n) }}
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>
    </div>
  )
}

// Quadratic bézier with the control point nudged off the midpoint → a soft arc.
function curve(sx: number, sy: number, tx: number, ty: number) {
  const mx = (sx + tx) / 2
  const my = (sy + ty) / 2
  const dx = tx - sx
  const dy = ty - sy
  const cx = mx - dy * 0.12
  const cy = my + dx * 0.12
  return `M${sx},${sy}Q${cx},${cy} ${tx},${ty}`
}

function loadPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(POSITIONS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function savePosition(id: string, x: number, y: number) {
  if (typeof window === 'undefined') return
  const all = loadPositions()
  all[id] = { x, y }
  window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
}
