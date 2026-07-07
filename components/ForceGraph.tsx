'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { forceSimulation, type Simulation } from 'd3-force'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import type { Category } from '@/lib/categories'
import { ROOT_ID, type EdgeKind, type Graph, type GraphNode } from '@/lib/graph'
import { applyLayout, nodeRadius, type LayoutKind, type SimNode } from '@/lib/layouts'
import { useGraphBridge, type Transform } from './GraphBridge'

export const POSITIONS_KEY = 'portfolio:graph:positions:v1'

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

/**
 * Obsidian-style force graph. Layout comes from `lib/layouts` (swappable force
 * configs; the sim reheats without rebuilding, so drags survive). Node opacity is
 * layered: depth-ring × folder, then dimmed further by hover/soft-focus emphasis.
 * State-driven render (cheap at ~12 nodes) so all that styling composes.
 */
export function ForceGraph({
  graph,
  layout,
  projectOpacity,
  folderOpacity,
  center,
  query,
  onActivateNode,
}: {
  graph: Graph
  layout: LayoutKind
  projectOpacity: number // root/hubs are always on; only projects are dimmable
  folderOpacity: Record<Category, number>
  center: string | null // the re-rooted node (null = root/overview): pinned + emphasized
  query: string // search — emphasize matching nodes, dim the rest
  onActivateNode: (node: GraphNode) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const sceneRef = useRef<SVGGElement>(null)
  const simNodesRef = useRef<SimNode[]>([])
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)
  const sizeRef = useRef({ w: 800, h: 600 })
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const centerRef = useRef(center)
  centerRef.current = center
  const rafPending = useRef(false)
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 })
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const publishVersion = useRef(0)
  const bridge = useGraphBridge()

  const [, setTick] = useState(0)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 })
  const k = transform.k // zoom scale → drives label fade
  const [hovered, setHovered] = useState<string | null>(null)

  // Publish a live snapshot to the bridge (for the minimap). Cheap: writes a ref.
  const publish = () => {
    if (!bridge) return
    const positions: Record<string, { x: number; y: number }> = {}
    for (const n of simNodesRef.current) positions[n.id] = { x: n.x ?? 0, y: n.y ?? 0 }
    bridge.snapshotRef.current = {
      positions,
      bounds: sizeRef.current,
      transform: transformRef.current,
      center: centerRef.current,
      version: ++publishVersion.current, // monotonic — the minimap's change signal
    }
  }

  // Glide the camera so the (re-rooted) center node is framed at the viewport middle.
  // The center is force-pinned to the pane center, so this mostly re-neutralizes any
  // pan/zoom the user had. A short rAF tween drives d3-zoom's own transform (so its
  // internal state stays in sync and the next gesture continues cleanly); zoom is held
  // constant so an eased lerp of the translate is perfectly smooth. Reduced-motion jumps.
  const flyToCenter = () => {
    const svg = svgRef.current
    const behavior = zoomBehaviorRef.current
    if (!svg || !behavior) return
    const cid = centerRef.current ?? ROOT_ID
    const node = simNodesRef.current.find((n) => n.id === cid)
    const { w, h } = sizeRef.current
    const gx = node?.fx ?? node?.x ?? w / 2
    const gy = node?.fy ?? node?.y ?? h / 2
    const k = transformRef.current.k // keep the current zoom, just recenter
    const from = transformRef.current
    const to = { x: w / 2 - k * gx, y: h / 2 - k * gy }
    const sel = select(svg)
    const apply = (x: number, y: number) =>
      sel.call(behavior.transform, zoomIdentity.translate(x, y).scale(k))

    if (prefersReducedMotion()) {
      apply(to.x, to.y)
      return
    }
    const start = performance.now()
    const dur = 500
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      const e = p * (2 - p) // easeOutQuad
      apply(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // Live position lookup — rebuilt each render from the sim-owned node objects.
  const byId = new Map<string, SimNode>(simNodesRef.current.map((n) => [n.id, n]))

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const n of graph.nodes) m.set(n.id, new Set())
    for (const e of graph.edges) {
      m.get(e.source)?.add(e.target)
      m.get(e.target)?.add(e.source)
    }
    return m
  }, [graph])

  const reapplySavedPins = (nodes: SimNode[]) => {
    const saved = loadPositions()
    for (const n of nodes) {
      const p = saved[n.id]
      if (p) {
        n.fx = p.x
        n.fy = p.y
      }
    }
  }

  // Build the simulation once per graph identity (the node set is stable per session).
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const w = wrap.clientWidth || 800
    const h = wrap.clientHeight || 600
    sizeRef.current = { w, h }

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
    const edges = graph.edges.map((e) => ({ ...e })) // cloned — forceLink mutates these

    const sim = forceSimulation(nodes)
    simRef.current = sim
    applyLayout(sim, layoutRef.current, { w, h, edges, centerId: centerRef.current })
    reapplySavedPins(nodes) // hand-drags win over the layout's center pin

    const requestPaint = () => {
      if (rafPending.current) return
      rafPending.current = true
      requestAnimationFrame(() => {
        rafPending.current = false
        setTick((t) => t + 1)
        publish()
      })
    }

    if (prefersReducedMotion()) {
      sim.stop()
      sim.tick(300)
      setTick((t) => t + 1)
      publish()
    } else {
      sim.on('tick', requestPaint)
    }

    const ro = new ResizeObserver(() => {
      if (!wrap.clientWidth) return
      const nw = wrap.clientWidth
      const nh = wrap.clientHeight
      sizeRef.current = { w: nw, h: nh }
      applyLayout(sim, layoutRef.current, {
        w: nw,
        h: nh,
        edges,
        centerId: centerRef.current,
      })
      reapplySavedPins(nodes)
      if (prefersReducedMotion()) {
        sim.tick(120)
        setTick((t) => t + 1)
      } else {
        sim.alpha(0.3).restart()
      }
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      sim.stop()
      sim.on('tick', null)
      if (bridge) bridge.snapshotRef.current = null // stale once the main graph unmounts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Re-run the layout when the user switches it — reheat, keep nodes + pins.
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    const { w, h } = sizeRef.current
    const edges = graph.edges.map((e) => ({ ...e }))
    applyLayout(sim, layout, { w, h, edges, centerId: centerRef.current })
    reapplySavedPins(sim.nodes())
    if (prefersReducedMotion()) {
      sim.tick(300)
      setTick((t) => t + 1)
    } else {
      sim.alpha(0.6).restart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // Re-root on the selected node: same forces, new center. Reheat so the layout reforms
  // around it, then glide the camera to frame it. The full web stays on screen — nothing
  // is filtered (CLAUDE.md "one living web"); only the anchor + emphasis change.
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    const { w, h } = sizeRef.current
    const edges = graph.edges.map((e) => ({ ...e }))
    applyLayout(sim, layoutRef.current, { w, h, edges, centerId: center })
    reapplySavedPins(sim.nodes())
    if (prefersReducedMotion()) {
      sim.tick(300)
      setTick((t) => t + 1)
    } else {
      sim.alpha(0.7).restart()
    }
    flyToCenter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center])

  // Pan/zoom on the svg; ignore events that start on a node so drag still works. The
  // full transform (translate + scale) is applied to the scene and published so the
  // minimap can draw the viewport box; the minimap drives pans back through `panHandler`.
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
        return !t.closest('[data-node]')
      })
      .on('zoom', (event) => {
        const t = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        }
        transformRef.current = t
        setTransform(t)
        publish()
      })
    zoomBehaviorRef.current = behavior
    const sel = select(svg)
    sel.call(behavior)

    bridge?.setPanHandler((t) => {
      select(svg).call(
        behavior.transform,
        zoomIdentity.translate(t.x, t.y).scale(t.k),
      )
    })

    return () => {
      sel.on('.zoom', null)
      bridge?.setPanHandler(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge])

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

  // --- emphasis: hover (transient) overrides the re-rooted center's ego network ---
  // When centered on a node, emphasize it + its direct neighbors (its cluster) and fade
  // the rest. For a category hub this is {hub, root, its projects} — the old soft-focus
  // set — so hub behavior is unchanged; a project center emphasizes its own neighborhood.
  const centerSet = useMemo(() => {
    if (!center || center === ROOT_ID) return null
    return new Set<string>([center, ...(adjacency.get(center) ?? [])])
  }, [center, adjacency])

  // Search set — nodes whose title or tags match the query. Emphasized like a persistent
  // multi-node hover.
  const searchSet = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const s = new Set<string>()
    for (const n of graph.nodes) {
      const inLabel = n.label.toLowerCase().includes(q)
      const inTags = n.tags?.some((t) => t.toLowerCase().includes(q)) ?? false
      if (inLabel || inTags) s.add(n.id)
    }
    return s
  }, [graph, query])

  // Precedence: hover (transient) > search > re-rooted center.
  const activeSet = hovered
    ? new Set<string>([hovered, ...(adjacency.get(hovered) ?? [])])
    : (searchSet ?? centerSet)
  const focal = hovered ?? (center && center !== ROOT_ID ? center : null)
  const isMatch = (id: string) => searchSet?.has(id) ?? false

  const isOn = (id: string) => !activeSet || activeSet.has(id)
  const pos = (id: string) => byId.get(id)

  // Base opacity: root/hubs/about are always on (1); only projects are dimmable, by the
  // projects slider × their folder slider. Folder opacity thus dims a category's
  // projects, never its hub.
  const baseOpacity = (n: GraphNode) => {
    if (n.type !== 'project') return 1
    const folder = n.category ? (folderOpacity[n.category] ?? 1) : 1
    return projectOpacity * folder
  }
  const baseOf = (id: string) => {
    const n = byId.get(id)
    return n ? baseOpacity(n) : 1
  }

  const labelOpacity = (n: GraphNode) => {
    // Structural nodes are always labelled (emphasis dimming still applies via the
    // group's opacity); project labels fade with zoom unless pinned/hovered.
    if (n.type !== 'project') return 1
    if (!isOn(n.id)) return 0
    const base = baseOpacity(n)
    if (n.pinned || hovered === n.id || isMatch(n.id)) return base
    return base * clamp((k - 0.7) / 0.8, 0, 1)
  }

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label="Graph of projects. Use the sidebar to navigate."
        className="h-full w-full touch-none"
      >
        <g
          ref={sceneRef}
          transform={zoomIdentity
            .translate(transform.x, transform.y)
            .scale(transform.k)
            .toString()}
        >
          <g>
            {graph.edges.map((e) => {
              const s = pos(e.source)
              const t = pos(e.target)
              if (!s) return null
              const on = !activeSet || (activeSet.has(e.source) && activeSet.has(e.target))
              const touchesFocal =
                focal != null && (e.source === focal || e.target === focal)
              const eBase = Math.min(baseOf(e.source), baseOf(e.target))
              const emphasis = activeSet ? (on ? 0.9 : 0.06) : e.kind === 'tag' ? 0.5 : 0.8
              return (
                <path
                  key={`${e.source}::${e.target}:${e.kind}`}
                  d={curve(s.x ?? 0, s.y ?? 0, t?.x ?? 0, t?.y ?? 0)}
                  fill="none"
                  className={touchesFocal && on ? 'stroke-clay' : 'stroke-line'}
                  style={{ strokeWidth: STROKE_WIDTH[e.kind], opacity: emphasis * eBase }}
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
              const base = baseOpacity(n)
              const fill = isFocal
                ? 'fill-clay'
                : n.type === 'project'
                  ? 'fill-muted'
                  : 'fill-ink'
              const sizeClass =
                n.type === 'root'
                  ? 'text-[12px] font-bold'
                  : n.type === 'project'
                    ? 'text-[10px]'
                    : 'text-[11px]'
              return (
                <g
                  key={n.id}
                  data-node
                  transform={`translate(${p?.x ?? 0},${p?.y ?? 0})`}
                  className="cursor-pointer"
                  style={{ opacity: activeSet ? (on ? base : base * 0.12) : base }}
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
                      sizeClass,
                      isFocal ? 'fill-clay' : n.type === 'project' ? 'fill-muted' : 'fill-ink',
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
