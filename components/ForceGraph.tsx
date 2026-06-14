'use client'

import { useEffect, useRef } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Category } from '@/lib/categories'
import type { EdgeKind, Graph, GraphEdge, GraphNode } from '@/lib/graph'

type SimNode = GraphNode & SimulationNodeDatum
type SimEdge = Omit<GraphEdge, 'source' | 'target'> & {
  source: string | SimNode
  target: string | SimNode
}

// Per-edge-kind tuning. membership pulls a project tight to its hub; related is a
// medium bond; tag is a long, faint thread (the "dense network" filaments).
const LINK_DISTANCE: Record<EdgeKind, number> = {
  membership: 70,
  related: 120,
  tag: 200,
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * d3-force simulation rendered as SVG. The simulation owns cloned node/edge objects
 * (never the props); per tick we write positions straight to the DOM refs rather
 * than re-rendering React. The sim re-runs whenever the subgraph changes (a state
 * transition). With reduced motion we settle synchronously and render statically.
 */
export function ForceGraph({
  graph,
  activeFocus,
  onFocusCategory,
  onOpenProject,
}: {
  graph: Graph
  activeFocus: Category | null
  onFocusCategory: (category: Category) => void
  onOpenProject: (slug: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeRefs = useRef(new Map<string, SVGGElement>())
  const edgeRefs = useRef(new Map<string, SVGLineElement>())
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)

  // A stable key for "the subgraph changed" so the simulation rebuilds on transition.
  const graphKey = graph.nodes.map((n) => n.id).join(',')

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    let width = wrap.clientWidth || 800
    let height = wrap.clientHeight || 600

    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }))
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const edges: SimEdge[] = graph.edges.map((e) => ({ ...e }))

    const sim = forceSimulation(nodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(edges)
          .id((d) => d.id)
          .distance((e) => LINK_DISTANCE[e.kind])
          .strength((e) => e.weight),
      )
      .force('charge', forceManyBody<SimNode>().strength(-380))
      .force('collide', forceCollide<SimNode>(46))
      .force('center', forceCenter(width / 2, height / 2))
      .force('x', forceX(width / 2).strength(0.04))
      .force('y', forceY(height / 2).strength(0.04))

    simRef.current = sim

    const paint = () => {
      for (const n of nodes) {
        const g = nodeRefs.current.get(n.id)
        if (g) g.setAttribute('transform', `translate(${n.x ?? 0},${n.y ?? 0})`)
      }
      for (const e of edges) {
        const line = edgeRefs.current.get(edgeKey(e))
        const s = e.source as SimNode
        const t = e.target as SimNode
        if (line) {
          line.setAttribute('x1', String(s.x ?? 0))
          line.setAttribute('y1', String(s.y ?? 0))
          line.setAttribute('x2', String(t.x ?? 0))
          line.setAttribute('y2', String(t.y ?? 0))
        }
      }
    }

    if (prefersReducedMotion()) {
      sim.stop()
      sim.tick(300)
      paint()
    } else {
      sim.on('tick', paint)
    }

    // Keep the layout centered when the container resizes.
    const ro = new ResizeObserver(() => {
      if (!wrap.clientWidth) return
      width = wrap.clientWidth
      height = wrap.clientHeight
      sim.force('center', forceCenter(width / 2, height / 2))
      sim.force('x', forceX(width / 2).strength(0.04))
      sim.force('y', forceY(height / 2).strength(0.04))
      if (prefersReducedMotion()) {
        sim.tick(1)
        paint()
      } else {
        sim.alpha(0.3).restart()
      }
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      sim.stop()
      sim.on('tick', null)
    }
    // graphKey captures node-set changes; refs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey])

  // --- minimal pointer drag: pin a node under the cursor, release on pointer up ---
  const startDrag = (id: string) => (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation()
    const sim = simRef.current
    const svg = svgRef.current
    if (!sim || !svg) return
    const node = sim.nodes().find((n) => n.id === id)
    if (!node) return

    const toLocal = (clientX: number, clientY: number) => {
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svg.getScreenCTM()
      return ctm ? pt.matrixTransform(ctm.inverse()) : { x: clientX, y: clientY }
    }

    if (!prefersReducedMotion()) sim.alphaTarget(0.3).restart()

    const move = (ev: PointerEvent) => {
      const p = toLocal(ev.clientX, ev.clientY)
      node.fx = p.x
      node.fy = p.y
      if (prefersReducedMotion()) sim.tick(1)
    }
    const up = () => {
      node.fx = null
      node.fy = null
      sim.alphaTarget(0)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label="Force-directed graph of projects. Use the sidebar to navigate."
        className="h-full w-full touch-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          {graph.edges.map((e) => (
            <line
              key={edgeKey(e)}
              ref={setMapRef(edgeRefs.current, edgeKey(e))}
              className={EDGE_CLASS[e.kind]}
              strokeDasharray={e.kind === 'membership' ? undefined : '3 4'}
            />
          ))}
        </g>
        <g>
          {graph.nodes.map((n) => {
            const isHub = n.type === 'category'
            const isActive = isHub && n.category === activeFocus
            const label = isHub ? `[ ${n.label} ]` : `[ ${n.label} ]`
            return (
              <g
                key={n.id}
                ref={setMapRef(nodeRefs.current, n.id)}
                className="cursor-pointer"
                onPointerDown={startDrag(n.id)}
                onClick={() =>
                  isHub ? onFocusCategory(n.category) : onOpenProject(n.id)
                }
              >
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={[
                    'select-none font-mono',
                    isHub ? 'text-[13px] font-bold uppercase' : 'text-[11px]',
                    isActive ? 'fill-clay' : isHub ? 'fill-ink' : 'fill-muted',
                  ].join(' ')}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

const EDGE_CLASS: Record<EdgeKind, string> = {
  membership: 'stroke-line [stroke-width:1.25]',
  related: 'stroke-line/70 [stroke-width:1]',
  tag: 'stroke-faint/50 [stroke-width:0.75]',
}

const edgeKey = (e: { source: unknown; target: unknown; kind: EdgeKind }) => {
  const s = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id
  const t = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id
  return `${[s, t].sort().join('::')}:${e.kind}`
}

// Ref callback that stores/removes a DOM node in a Map keyed by id.
function setMapRef<T extends Element>(map: Map<string, T>, key: string) {
  return (el: T | null) => {
    if (el) map.set(key, el)
    else map.delete(key)
  }
}
