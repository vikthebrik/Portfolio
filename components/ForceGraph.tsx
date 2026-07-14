'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { forceSimulation, forceCollide, type Simulation, type ForceLink } from 'd3-force'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { CATEGORIES } from '@/lib/categories'
import { ROOT_ID, ABOUT_ID, type EdgeKind, type Graph, type GraphNode, type GraphEdge } from '@/lib/graph'
import { INTRO_BUTTON_ID } from '@/lib/intro'
import { applyLayout, nodeRadius, layoutAnchor, type LayoutKind, type SimNode } from '@/lib/layouts'
import { useGraphBridge, type Transform } from './GraphBridge'

type SimLink = Omit<GraphEdge, 'source' | 'target'> & {
  source: SimNode
  target: SimNode
}

export const POSITIONS_KEY = 'portfolio:graph:positions:v1'

const STROKE_WIDTH: Record<EdgeKind, number> = {
  spoke: 1.5,
  membership: 1.2,
  related: 1,
  tag: 0.75,
}

// Fixed view tuning (the old sliders, now baked in): projects rest at a calm
// mid-opacity, and focus fades non-cluster nodes hard per ring of distance.
const PROJECT_OPACITY = 1
const FOCUS_DIM = 0.85

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// One shared duration + easing for the re-root motion: the center pin's travel and the
// camera glide run in lockstep so the node never outruns the frame.
const GLIDE_MS = 900
const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

// Growth pacing. The intro is the slowest, dreamiest version; in-session reveals
// (a hub's projects budding on demand) use the same shapes at a more responsive
// tempo. Node scale + opacity fades + edge draw-on all share these beats.
const INTRO_SCALE_MS = 2800
const INTRO_FADE_MS = 1100
const INTRO_EDGE_MS = 3000
const INTRO_STAGGER_MS = 280
const REVEAL_SCALE_MS = 1600
const REVEAL_FADE_MS = 900
const REVEAL_EDGE_MS = 1800
const REVEAL_STAGGER_MS = 110
// The launch button *is* the root node: hold the root at the button's spot for a
// beat after launch, then glide out slower than a normal re-root.
const INTRO_ROOT_HOLD_MS = 400
const INTRO_GLIDE_MS = 1400

// Spoke geometry shared by every seeding pass (intro gather, replay, reveals):
// hubs + about fan around the root in a fixed order.
const SPOKES: readonly string[] = [...CATEGORIES, ABOUT_ID]
const spokeAngle = (id: string) => {
  const idx = SPOKES.indexOf(id)
  return idx === -1 ? 0 : (idx / SPOKES.length) * 2 * Math.PI - Math.PI / 2
}

// The bloom origin, in graph coordinates: the launch button's root circle, measured
// live (the overlay is viewport-centered while the pane is not — the hidden sidebar
// still reserves its column), falling back to the viewport center.
const measureSeed = (wrap: HTMLElement, w: number, h: number) => {
  const btn = document.getElementById(INTRO_BUTTON_ID)?.getBoundingClientRect()
  const rect = wrap.getBoundingClientRect()
  const cx = btn ? btn.left + btn.width / 2 : window.innerWidth / 2
  const cy = btn ? btn.top + btn.height / 2 : window.innerHeight / 2
  return { x: clamp(cx - rect.left, 0, w), y: clamp(cy - rect.top, 0, h) }
}

// Gather the (invisible) web at the seed, each node nudged a hair along its spoke
// direction so the release pushes outward instead of exploding randomly.
const gatherAtSeed = (nodes: SimNode[], seed: { x: number; y: number }) => {
  for (const n of nodes) {
    if (n.fx != null && n.id !== ROOT_ID) continue // hand pins stay put
    if (n.type === 'category' || n.type === 'about') {
      const angle = spokeAngle(n.id)
      n.x = seed.x + Math.cos(angle) * 8
      n.y = seed.y + Math.sin(angle) * 8
    } else if (n.type === 'project' && n.category) {
      const angle = spokeAngle(n.category)
      n.x = seed.x + Math.cos(angle) * 10
      n.y = seed.y + Math.sin(angle) * 10
    } else {
      n.x = seed.x
      n.y = seed.y
    }
  }
}

/**
 * Obsidian-style force graph. Layout comes from `lib/layouts` (swappable force
 * configs; the sim reheats without rebuilding, so drags survive). Node opacity is
 * layered: a fixed resting base by node type, then dimmed further by hover/soft-focus
 * emphasis (per ring of graph-distance).
 *
 * The `revealed` prop (owned by GraphExplorer) is the bloom engine: projects render
 * only while in it — empty during the intro's skeleton stage, then all of them, so
 * they fan out of their hubs (the reveal-sync effect seeds newcomers at the hub,
 * restores their forces, reheats). Every node is in the sim from the start —
 * visibility is opacity + force gating, never membership.
 * State-driven render (cheap at ~17 nodes) so all that styling composes.
 */
export function ForceGraph({
  graph,
  layout,
  quietLabels,
  muteEdges,
  center,
  query,
  intro,
  revealed,
  onActivateNode,
}: {
  graph: Graph
  layout: LayoutKind
  quietLabels: boolean // project labels hidden at overview zoom; appear on zoom-in/hover/focus
  muteEdges: boolean // resting edges read as a faint constellation until a cluster is emphasized
  center: string | null // the re-rooted node (null = root/overview): pinned + emphasized
  query: string // search — emphasize matching nodes, dim the rest
  intro: number // launch stage (see lib/intro): -1 pending, 0 name, 1 hubs grow, 2 chrome, 3 done
  revealed: ReadonlySet<string> // projects grown in (empty pre-launch, all once the bloom fires)
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
  const introRef = useRef(intro)
  introRef.current = intro
  // While true the sim is built but frozen: the launch intro seeds every node at
  // the launch button's spot and holds until stage 1, so the web grows out of it.
  const introHeld = useRef(false)
  // The bloom origin — the viewport center (where the launch button sits), in
  // graph coordinates. The overlay is viewport-centered while the pane is not
  // (the hidden sidebar still reserves its column), so this is what makes the
  // web grow from the button instead of 144px to its right.
  const introSeed = useRef<{ x: number; y: number } | null>(null)
  const rafPending = useRef(false)
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 })
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const publishVersion = useRef(0)
  const bridge = useGraphBridge()

  const [, setTick] = useState(0)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 })
  const k = transform.k // zoom scale → drives label fade
  const [hovered, setHovered] = useState<string | null>(null)
  const [kbFocus, setKbFocus] = useState<string | null>(null) // keyboard cursor → focus ring

  // `shown` = the projects currently in the web. It follows `revealed` ∪ the live
  // search matches via the reveal-sync effect below — the one-commit lag is
  // deliberate, so the commit that makes a node visible already carries its entrance
  // styles. `growing` marks nodes mid-entrance/exit (slow transitions + stagger
  // apply only to them).
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set(revealed))
  const shownRef = useRef(shown)
  const [growing, setGrowing] = useState<ReadonlySet<string>>(new Set())

  // Publish a live snapshot to the bridge (for the minimap). Cheap: writes a ref.
  const publish = () => {
    if (!bridge) return
    const positions: Record<string, { x: number; y: number }> = {}
    const hidden: string[] = []
    for (const n of simNodesRef.current) {
      positions[n.id] = { x: n.x ?? 0, y: n.y ?? 0 }
      if (n.type === 'project' && !shownRef.current.has(n.id)) hidden.push(n.id)
    }
    bridge.snapshotRef.current = {
      positions,
      bounds: sizeRef.current,
      transform: transformRef.current,
      center: centerRef.current,
      hidden, // unrevealed projects — the minimap skips them (they mirror the big graph)
      version: ++publishVersion.current, // monotonic — the minimap's change signal
    }
  }

  // Every re-root motion (pin travel + camera) shares this token; bumping it cancels
  // any in-flight tween (a new re-root, a hand drag, unmount).
  const glideToken = useRef(0)

  // Glide the camera so the given graph point ends up framed at the viewport middle.
  // A rAF tween drives d3-zoom's own transform (so its internal state stays in sync and
  // the next gesture continues cleanly); zoom is held constant so an eased lerp of the
  // translate is perfectly smooth. Reduced-motion jumps.
  const flyTo = (gp: { x: number; y: number }) => {
    const svg = svgRef.current
    const behavior = zoomBehaviorRef.current
    if (!svg || !behavior) return
    const { w, h } = sizeRef.current
    const k = transformRef.current.k // keep the current zoom, just recenter
    const from = transformRef.current
    const to = { x: w / 2 - k * gp.x, y: h / 2 - k * gp.y }
    const sel = select(svg)
    const apply = (x: number, y: number) =>
      sel.call(behavior.transform, zoomIdentity.translate(x, y).scale(k))

    if (prefersReducedMotion()) {
      apply(to.x, to.y)
      return
    }
    const token = glideToken.current
    const start = performance.now()
    const step = (now: number) => {
      // Superseded, or the svg left the DOM mid-flight (navigation) — d3-zoom can't
      // resolve its extent against a detached element.
      if (glideToken.current !== token || !svg.isConnected) return
      const p = Math.min((now - start) / GLIDE_MS, 1)
      const e = easeInOutCubic(p)
      apply(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // Glide the center node's *pin* from where it sits to the layout anchor. Without this
  // the fx/fy pin teleports the node to pane center on the next tick — the "snap".
  const glidePin = (node: SimNode, to: { x: number; y: number }, ms = GLIDE_MS) => {
    const from = { x: node.x ?? to.x, y: node.y ?? to.y }
    if (Math.hypot(to.x - from.x, to.y - from.y) < 1) return
    const token = glideToken.current
    const start = performance.now()
    const step = (now: number) => {
      if (glideToken.current !== token) return // superseded
      const p = Math.min((now - start) / ms, 1)
      const e = easeInOutCubic(p)
      node.fx = from.x + (to.x - from.x) * e
      node.fy = from.y + (to.y - from.y) * e
      if (p < 1) requestAnimationFrame(step)
    }
    node.fx = from.x
    node.fy = from.y
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

  const projectIds = useMemo(
    () => new Set(graph.nodes.filter((n) => n.type === 'project').map((n) => n.id)),
    [graph],
  )

  // Search set — nodes whose title or tags match the query. Emphasized like a persistent
  // multi-node hover (and matched projects are temporarily shown even if unrevealed).
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

  // Unrevealed projects must not shape the layout: zero collision radius and zero
  // strength on any link that touches one. `applyLayout` reinstalls the default
  // link/collide forces, so this must be re-applied after every applyLayout call
  // (build, resize, layout switch, re-root) and whenever `shown` changes.
  const applyVisibilityForces = () => {
    const sim = simRef.current
    if (!sim) return
    const hiddenProject = (n: SimNode) =>
      n.type === 'project' && !shownRef.current.has(n.id)
    sim.force(
      'collide',
      forceCollide<SimNode>((n) => (hiddenProject(n) ? 0 : nodeRadius(n) + 52)),
    )
    const linkForce = sim.force('link') as ForceLink<SimNode, SimLink> | undefined
    if (linkForce) {
      const linkStrengthScale =
        layoutRef.current === 'radial' ? 0.3 : layoutRef.current === 'tree' ? 0.4 : 1
      linkForce.strength((e) => {
        if (hiddenProject(e.source) || hiddenProject(e.target)) return 0
        return (e.weight ?? 1) * linkStrengthScale
      })
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
    const anchor = layoutAnchor(layoutRef.current, w, h)
    const nodes: SimNode[] = graph.nodes.map((n) => {
      const s: SimNode = { ...n }
      const p = saved[n.id]
      if (p) {
        s.x = p.x
        s.y = p.y
        s.fx = p.x // hand-placed nodes stay pinned
        s.fy = p.y
      } else {
        // Initialize close to the layout anchor with a small jitter to break symmetry
        // and allow the physics engine to fan them out cleanly in all directions.
        const angle = Math.random() * 2 * Math.PI
        const radius = 10 + Math.random() * 20
        s.x = anchor.x + Math.cos(angle) * radius
        s.y = anchor.y + Math.sin(angle) * radius
      }
      return s
    })
    simNodesRef.current = nodes
    const edges = graph.edges.map((e) => ({ ...e })) // cloned — forceLink mutates these

    const sim = forceSimulation(nodes)
    simRef.current = sim
    applyLayout(sim, layoutRef.current, { w, h, edges, centerId: centerRef.current })
    reapplySavedPins(nodes) // hand-drags win over the layout's center pin
    applyVisibilityForces() // unrevealed projects stay forceless

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
      if (introRef.current < 3) {
        // Launch intro: gather the (invisible) web at the launch button and
        // freeze until stage 1 — the growth is the sim settling from this seed.
        const seed = measureSeed(wrap, w, h)
        introSeed.current = seed
        gatherAtSeed(nodes, seed)
        introHeld.current = true
        sim.stop()
        setTick((t) => t + 1)
        publish()
      }
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
      applyVisibilityForces()
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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- counter ref, not a DOM ref; bumping the live value is the point
      glideToken.current++ // cancel in-flight glides — their targets just unmounted
      if (bridge) bridge.snapshotRef.current = null // stale once the main graph unmounts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Release the held sim once the intro reaches stage 1 — the button *becomes* the
  // root: the root holds at the button's spot for a beat (the hubs already budding
  // around it) before its pin glides — slower than a re-root — to the layout anchor,
  // dragging the young web into place as the chrome arrives. Layout effect: the
  // re-gather must land before the first stage-1 paint (the root appears instantly,
  // and it must appear *at the button*, not wherever the pre-launch settle left it).
  useLayoutEffect(() => {
    if (intro < 1 || !introHeld.current) return
    introHeld.current = false
    const sim = simRef.current
    if (!sim) return
    // Re-measure at release: the button is where the user just clicked *now*
    // (typing-stage resizes would have stranded a mount-time measurement).
    const wrap = wrapRef.current
    if (wrap) {
      const { w, h } = sizeRef.current
      const seed = measureSeed(wrap, w, h)
      introSeed.current = seed
      gatherAtSeed(simNodesRef.current, seed)
    }
    const root = simNodesRef.current.find((n) => n.id === ROOT_ID)
    const seed = introSeed.current
    if (root && seed) {
      const anchor = {
        x: root.fx ?? sizeRef.current.w / 2,
        y: root.fy ?? sizeRef.current.h / 2,
      }
      root.x = seed.x
      root.y = seed.y
      root.fx = seed.x
      root.fy = seed.y
      // No cleanup: a fast-forward mid-hold must still deliver the root to its
      // anchor (glidePin's token check handles genuine supersession).
      window.setTimeout(
        () => glidePin(root, anchor, INTRO_GLIDE_MS),
        INTRO_ROOT_HOLD_MS,
      )
    }
    sim.alpha(0.5).restart()
  }, [intro])

  // Reveal sync: `shown` follows `revealed` ∪ current search matches. Newly shown
  // projects bud out of their hub — seeded at its position in a small fan, forces
  // restored, gentle reheat. The first sync after an intro-less mount (repeat visit,
  // deep link, fast-forward) is NOT animated — those paths promise the settled web.
  const firstSyncDone = useRef(false)
  useEffect(() => {
    const target = new Set(revealed)
    if (searchSet) for (const id of searchSet) if (projectIds.has(id)) target.add(id)

    const prev = shownRef.current
    const additions: string[] = []
    const removals: string[] = []
    for (const id of target) if (!prev.has(id)) additions.push(id)
    for (const id of prev) if (!target.has(id)) removals.push(id)
    if (!additions.length && !removals.length) return

    const animate =
      !prefersReducedMotion() &&
      !(!firstSyncDone.current && introRef.current >= 3)
    firstSyncDone.current = true

    shownRef.current = target
    setShown(target)

    const sim = simRef.current
    if (sim && !introHeld.current) {
      if (additions.length && animate) {
        // Seed each newcomer at its hub, fanned outward along the hub's spoke
        // direction. Hand-pinned nodes keep their saved spot.
        const byCat = new Map<string, SimNode[]>()
        for (const n of simNodesRef.current) {
          if (n.category && additions.includes(n.id) && n.fx == null) {
            const list = byCat.get(n.category) ?? []
            list.push(n)
            byCat.set(n.category, list)
          }
        }
        for (const [cat, list] of byCat) {
          const hub = simNodesRef.current.find((n) => n.id === cat)
          if (!hub) continue
          const hubAngle = spokeAngle(cat)
          const fanSpread = Math.PI / 1.5
          list.forEach((p, idx) => {
            const angle =
              list.length > 1
                ? hubAngle - fanSpread / 2 + (idx / (list.length - 1)) * fanSpread
                : hubAngle
            p.x = (hub.x ?? 0) + Math.cos(angle) * 12
            p.y = (hub.y ?? 0) + Math.sin(angle) * 12
          })
        }
      }
      applyVisibilityForces()
      if (prefersReducedMotion()) {
        sim.tick(200)
        setTick((t) => t + 1)
        publish()
      } else {
        sim.alpha(additions.length ? 0.45 : 0.2).restart()
      }
    }

    // Entrance/exit styling window (sized to the pacing in play — the intro's
    // stage-2 bloom runs on the slower intro beats); expired ids drop back to
    // instant styling.
    if (animate) {
      const batch = [...additions, ...removals]
      const windowMs =
        introRef.current < 3
          ? INTRO_SCALE_MS + 5 * INTRO_STAGGER_MS + 200
          : REVEAL_SCALE_MS + 5 * REVEAL_STAGGER_MS + 200
      setGrowing((g) => new Set([...g, ...batch]))
      window.setTimeout(() => {
        setGrowing((g) => {
          const next = new Set(g)
          for (const id of batch) next.delete(id)
          return next
        })
      }, windowMs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, searchSet, projectIds])

  // Friction by intro stage: extremely high (0.94) to absorb the release shock,
  // ramping to a slow organic drift (0.80) so the growth reads as budding, then
  // the normal 0.4 once the intro is done. (Collide/link gating for unrevealed
  // projects lives in applyVisibilityForces — during the intro nothing is revealed,
  // so the hubs branch out of root on the spoke edges alone, exactly as before.)
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    applyVisibilityForces()
    if (intro >= 1 && intro < 3) {
      sim.velocityDecay(0.94)
      const t = window.setTimeout(() => {
        if (introRef.current < 3) sim.velocityDecay(0.8)
      }, 700)
      return () => window.clearTimeout(t)
    }
    if (intro >= 3) sim.velocityDecay(0.4)
  }, [intro])

  // Re-run the layout when the user switches it — reheat, keep nodes + pins.
  useEffect(() => {
    const sim = simRef.current
    if (!sim || introHeld.current) return // mount-time run during the intro hold
    const { w, h } = sizeRef.current
    const edges = graph.edges.map((e) => ({ ...e }))
    applyLayout(sim, layout, { w, h, edges, centerId: centerRef.current })
    reapplySavedPins(sim.nodes())
    applyVisibilityForces()
    if (prefersReducedMotion()) {
      sim.tick(300)
      setTick((t) => t + 1)
    } else {
      sim.alpha(0.6).restart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  // Re-root on the selected node: same forces, new center. Reheat so the layout reforms
  // around it, and glide (never snap) — the pin travels to the anchor and the camera
  // tracks the same target over the same eased duration. The full web stays on screen —
  // nothing is filtered (CLAUDE.md "one living web"); only the anchor + emphasis change.
  useEffect(() => {
    const sim = simRef.current
    if (!sim || introHeld.current) return // mount-time run during the intro hold
    const { w, h } = sizeRef.current
    const edges = graph.edges.map((e) => ({ ...e }))
    applyLayout(sim, layoutRef.current, { w, h, edges, centerId: center })
    reapplySavedPins(sim.nodes())
    applyVisibilityForces()
    glideToken.current++ // cancel any in-flight glide before starting this one
    const cnode = simNodesRef.current.find((n) => n.id === (center ?? ROOT_ID))
    // Where the pin actually ended up: the layout anchor, or a hand-drag pin that won.
    const to = {
      x: cnode?.fx ?? w / 2,
      y: cnode?.fy ?? h / 2,
    }
    if (prefersReducedMotion()) {
      sim.tick(300)
      setTick((t) => t + 1)
      flyTo(to)
      return
    }
    if (cnode) glidePin(cnode, to)
    sim.alpha(0.5).restart()
    flyTo(to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center])

  // Replay: when the intro restarts after being done (GraphExplorer's "replay
  // intro"), re-gather the web at the launch spot and freeze again. Declared
  // after the center effect so a replay from a re-rooted state re-anchors on
  // root first. No-op on first load (the build effect already holds).
  useEffect(() => {
    const sim = simRef.current
    const wrap = wrapRef.current
    if (intro !== 0 || introHeld.current || !sim || !wrap) return
    if (prefersReducedMotion()) return
    const { w, h } = sizeRef.current
    const seed = measureSeed(wrap, w, h)
    introSeed.current = seed
    gatherAtSeed(simNodesRef.current, seed)
    introHeld.current = true
    sim.stop()
    setTick((t) => t + 1)
    publish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro])

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
      glideToken.current++ // a hand on a node cancels any in-flight glide
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

  // --- keyboard traversal: arrows walk edges, Enter activates (same as click) ------
  // Roving tabindex — the centered node is the graph's single tabstop; arrows move real
  // DOM focus to the neighbor whose direction best matches the pressed key (cosine
  // against the edge vector). Focus doubles as hover, so the emphasis machinery and
  // label force-show come for free.
  const ARROW_DIRS: Record<string, { x: number; y: number }> = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  }

  const focusNode = (id: string) => {
    svgRef.current
      ?.querySelector<SVGGElement>(`[data-node-id="${CSS.escape(id)}"]`)
      ?.focus()
  }

  const onNodeKeyDown = (node: SimNode) => (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivateNode(node)
      return
    }
    const dir = ARROW_DIRS[e.key]
    if (!dir) return
    e.preventDefault()
    const from = pos(node.id)
    if (!from) return
    let best: string | null = null
    let bestScore = 0.05 // must be at least roughly in the pressed direction
    for (const nb of adjacency.get(node.id) ?? []) {
      if (projectIds.has(nb) && !shown.has(nb)) continue // unrevealed: not walkable
      const to = pos(nb)
      if (!to) continue
      const dx = (to.x ?? 0) - (from.x ?? 0)
      const dy = (to.y ?? 0) - (from.y ?? 0)
      const len = Math.hypot(dx, dy)
      if (len === 0) continue
      const score = (dx * dir.x + dy * dir.y) / len
      if (score > bestScore) {
        bestScore = score
        best = nb
      }
    }
    if (best) focusNode(best)
  }

  // --- emphasis: hover (transient) overrides the re-rooted center's ego network ---
  // When centered on a node, emphasize it + its direct neighbors (its cluster) and fade
  // the rest. For a category hub this is {hub, root, its projects} — the old soft-focus
  // set — so hub behavior is unchanged; a project center emphasizes its own neighborhood.
  const centerSet = useMemo(() => {
    if (!center || center === ROOT_ID) return null
    return new Set<string>([center, ...(adjacency.get(center) ?? [])])
  }, [center, adjacency])

  // Precedence: hover (transient) > search > re-rooted center.
  const activeSet = hovered
    ? new Set<string>([hovered, ...(adjacency.get(hovered) ?? [])])
    : (searchSet ?? centerSet)
  const focal = hovered ?? (center && center !== ROOT_ID ? center : null)
  const isMatch = (id: string) => searchSet?.has(id) ?? false

  const pos = (id: string) => byId.get(id)

  // De-emphasis falls off with graph-distance from the focal node, so same-ring nodes
  // (e.g. the other hubs when a hub is centered) stay readable while far nodes recede.
  // `FOCUS_DIM` sets how hard: 0 = no fade at all, 1 = hard old-style dimming.
  const distFromFocal = useMemo(() => {
    const src = hovered ?? (searchSet ? null : focal)
    if (!src) return null // search: matches are scattered — no meaningful distance
    const dist = new Map<string, number>([[src, 0]])
    const queue = [src]
    while (queue.length) {
      const id = queue.shift()!
      const d = dist.get(id)!
      for (const nb of adjacency.get(id) ?? []) {
        if (dist.has(nb)) continue
        dist.set(nb, d + 1)
        queue.push(nb)
      }
    }
    return dist
  }, [hovered, focal, searchSet, adjacency])

  const dimFactor = (id: string) => {
    if (!activeSet || activeSet.has(id)) return 1
    const rings = distFromFocal ? Math.max((distFromFocal.get(id) ?? 3) - 1, 1) : 2
    return Math.max(0.05, Math.pow(1 - FOCUS_DIM, rings))
  }

  // Emphasis is a *boost*, not just an exemption from dimming: the focused cluster's
  // nodes lift to near-full opacity so a centered category's projects are readable
  // despite the muted resting base.
  const emphasized = (id: string) => (activeSet?.has(id) ?? false)
  const nodeOpacity = (n: GraphNode) => {
    const base = baseOpacity(n)
    if (!activeSet) return base
    return emphasized(n.id) ? Math.max(base, 0.95) : base * dimFactor(n.id)
  }

  // Base opacity: root/hubs/about are always on (1); projects rest at a calmer
  // fixed mid-opacity so the structural skeleton leads.
  const baseOpacity = (n: GraphNode) => (n.type !== 'project' ? 1 : PROJECT_OPACITY)
  const baseOf = (id: string) => {
    const n = byId.get(id)
    return n ? baseOpacity(n) : 1
  }

  // Visibility multiplier on the whole opacity stack. Structural nodes ride the
  // intro (hidden on the launch screen, on from stage 1); projects render only
  // while in `shown` — empty during the skeleton stage, everything once the
  // stage-2 bloom fires.
  const visibleFactor = (n: GraphNode) => {
    if (n.type !== 'project') return intro >= 1 ? 1 : 0
    if (intro >= 0 && intro < 1) return 0 // launch screen: blank paper
    return shown.has(n.id) ? 1 : 0
  }
  const visibleOf = (id: string) => {
    const n = byId.get(id)
    return n ? visibleFactor(n) : 1
  }

  const reduceMotion = prefersReducedMotion()
  // Per-node emergence delay (deterministic hash of the id) — with the budding
  // scale below, each node divides into view on its own beat instead of the
  // whole wave popping at once. Synthetic biology, not a slideshow. The intro
  // staggers wider than in-session reveals.
  const entranceDelay = (id: string) => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997
    return (h % 6) * (intro < 3 ? INTRO_STAGGER_MS : REVEAL_STAGGER_MS)
  }

  const labelOpacity = (n: GraphNode) => {
    // Structural nodes are always labelled; project labels fade with zoom unless
    // pinned/hovered/emphasized. Emphasis dimming applies via the group's opacity
    // (dimFactor), so off-cluster labels fade with their node instead of vanishing.
    if (n.type !== 'project') return 1
    // The focused cluster reads like a table of contents: labels fully on.
    if (n.pinned || hovered === n.id || isMatch(n.id) || emphasized(n.id)) return 1
    // quiet labels: fully hidden at the resting zoom (k=1) — only the structural
    // skeleton is named until you zoom in or emphasize a cluster.
    return quietLabels
      ? baseOpacity(n) * clamp((k - 1.15) / 0.6, 0, 1)
      : baseOpacity(n) * clamp((k - 0.5) / 0.6, 0.35, 1)
  }

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label="Graph of projects. Use the sidebar to navigate."
        className={`h-full w-full touch-none${intro < 2 ? ' pointer-events-none' : ''}`}
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
              // On-cluster edges lift with their nodes (the emphasis boost ignores the
              // muted base); off-cluster edges dim by the endpoints' ring distance.
              // muted edges: the resting web is a faint constellation — links only
              // assert themselves when a cluster is emphasized.
              const restBase = muteEdges
                ? e.kind === 'tag'
                  ? 0.18
                  : e.kind === 'related'
                    ? 0.3
                    : 0.4
                : e.kind === 'tag'
                  ? 0.5
                  : 0.8
              const opacity = activeSet
                ? on
                  ? 0.9
                  : 0.75 * Math.min(dimFactor(e.source), dimFactor(e.target)) * eBase
                : restBase * eBase

              const bothVisible = visibleOf(e.source) > 0 && visibleOf(e.target) > 0
              // Edges grow (stroke-dash draw-on) whenever an endpoint is entering:
              // the whole web during the intro, the budding cluster on a reveal.
              const entering =
                !reduceMotion &&
                (intro < 3 || growing.has(e.source) || growing.has(e.target))
              const edgeLength = e.kind === 'tag' ? 380 : e.kind === 'related' ? 280 : 180
              const drawMs = intro < 3 ? INTRO_EDGE_MS : REVEAL_EDGE_MS
              const fadeMs = intro < 3 ? INTRO_FADE_MS : REVEAL_FADE_MS

              return (
                <path
                  key={`${e.source}::${e.target}:${e.kind}`}
                  d={curve(s.x ?? 0, s.y ?? 0, t?.x ?? 0, t?.y ?? 0)}
                  fill="none"
                  className={touchesFocal && on ? 'stroke-clay' : 'stroke-line'}
                  style={{
                    strokeWidth: STROKE_WIDTH[e.kind],
                    opacity: opacity * Math.min(visibleOf(e.source), visibleOf(e.target)),
                    strokeDasharray: entering ? edgeLength : undefined,
                    strokeDashoffset: entering ? (bothVisible ? 0 : edgeLength) : undefined,
                    transition: entering
                      ? `stroke-dashoffset ${drawMs}ms cubic-bezier(0.25, 1, 0.25, 1), opacity ${fadeMs}ms ease-in-out`
                      : undefined,
                    // Edges surface after their endpoints have budded.
                    transitionDelay: entering
                      ? `${150 + Math.max(entranceDelay(e.source), entranceDelay(e.target))}ms`
                      : undefined,
                  }}
                />
              )
            })}
          </g>

          <g>
            {graph.nodes.map((n) => {
              const p = pos(n.id)
              const isFocal = n.id === focal
              const r = nodeRadius(n)
              const hiddenNode = n.type === 'project' && !shown.has(n.id)
              // The launch button *is* the root — it appears instantly at the
              // button's exact spot at stage 1, no fade, no budding.
              const isRootIntro = intro < 3 && n.id === ROOT_ID
              const entering =
                !reduceMotion && !isRootIntro && (intro < 3 || growing.has(n.id))
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
                  data-node-id={n.id}
                  aria-hidden={hiddenNode || undefined}
                  transform={`translate(${p?.x ?? 0},${p?.y ?? 0})`}
                  className="cursor-pointer outline-none"
                  style={{
                    opacity: nodeOpacity(n) * visibleFactor(n),
                    transition: entering
                      ? `opacity ${intro < 3 ? INTRO_FADE_MS : REVEAL_FADE_MS}ms ease`
                      : undefined,
                    transitionDelay: entering ? `${entranceDelay(n.id)}ms` : undefined,
                    pointerEvents: hiddenNode ? 'none' : undefined,
                  }}
                  onPointerDown={onNodePointerDown(n as SimNode)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  role="button"
                  aria-label={n.label}
                  tabIndex={n.id === (center ?? ROOT_ID) ? 0 : -1}
                  onKeyDown={onNodeKeyDown(n as SimNode)}
                  onFocus={() => {
                    setKbFocus(n.id)
                    setHovered(n.id) // focus = hover: light up the connections
                  }}
                  onBlur={() => {
                    setKbFocus((f) => (f === n.id ? null : f))
                    setHovered((h) => (h === n.id ? null : h))
                  }}
                >
                  {kbFocus === n.id && (
                    <circle r={r + 4} fill="none" strokeWidth={1.5} className="stroke-clay" />
                  )}
                  <circle
                    r={r}
                    className={fill}
                    // Budding: each cell swells into place with a slight
                    // overshoot, on the same per-node beat as its fade. Hidden
                    // projects rest at scale ~0 so a later reveal grows from it.
                    style={
                      !reduceMotion && !isRootIntro && (entering || hiddenNode)
                        ? {
                            transform: visibleFactor(n) ? 'scale(1)' : 'scale(0.01)',
                            transformBox: 'fill-box',
                            transformOrigin: 'center',
                            transition: `transform ${
                              intro < 3 ? INTRO_SCALE_MS : REVEAL_SCALE_MS
                            }ms cubic-bezier(0.16, 1, 0.3, 1)`,
                            transitionDelay: `${entranceDelay(n.id)}ms`,
                          }
                        : undefined
                    }
                  />
                  <text
                    y={r + 11}
                    textAnchor="middle"
                    className={[
                      'select-none font-mono',
                      sizeClass,
                      isFocal ? 'fill-clay' : 'fill-ink',
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
