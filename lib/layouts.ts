import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force'
import { CATEGORIES, type Category } from '@/lib/categories'
import { ROOT_ID, type EdgeKind, type Graph, type GraphEdge, type GraphNode } from '@/lib/graph'

/**
 * Graph layouts. Each is expressed as a *reconfiguration of the simulation's forces*
 * (never static positions) so switching layouts just reheats — node objects and any
 * hand-drag pins (fx/fy) survive. Exactly one node is pinned as the layout's anchor:
 * the **center** (`ctx.centerId`, defaulting to `root`). Re-rooting on another node just
 * pins it instead and rings everyone by graph-distance *from it* — same forces, new
 * heart. ForceGraph re-applies saved drags afterwards so a hand-moved node still wins.
 * No new dependency — all d3-force. See CLAUDE.md "Layouts" / "Navigation".
 */

export type LayoutKind = 'web' | 'radial' | 'tree' | 'cluster'
export const LAYOUTS: LayoutKind[] = ['web', 'radial', 'tree', 'cluster']

export type SimNode = GraphNode & SimulationNodeDatum

const LINK_DISTANCE: Record<EdgeKind, number> = {
  spoke: 130,
  membership: 125,
  related: 180,
  tag: 260,
}

const RING = 245 // radius added per layer (web/radial)
const ROW = 155 // vertical gap per layer (tree)
const CLUSTER_R = 285 // distance of each folder anchor from center (cluster)

// Where a layout pins its center node. Exported so ForceGraph can tween the pin (and
// the camera) toward the same point instead of letting the pin teleport it.
export const layoutAnchor = (kind: LayoutKind, w: number, h: number) => ({
  x: w / 2,
  y: kind === 'tree' ? h / 2 - ROW : h / 2,
})

// Node circle radius — layer-first (root biggest → hubs → projects), with a small
// degree bump for projects. Shared by the renderer and the collision force so they agree.
const RADIUS_BY_LAYER = [16, 10, 6]
export const nodeRadius = (n: GraphNode): number => {
  const base = RADIUS_BY_LAYER[Math.min(n.layer, RADIUS_BY_LAYER.length - 1)]
  return n.type === 'project' ? base + Math.min(n.degree, 6) * 0.6 : base
}

/**
 * Calculates a node's collision radius accounting for its physical "volume" (including text label).
 * Since monospace labels are rendered horizontally, longer labels require a larger collision radius
 * to prevent text overlap.
 */
export const nodeCollisionRadius = (n: GraphNode): number => {
  const baseRad = nodeRadius(n)
  // Monospace font character width is roughly 6.5px at text-xs/sm.
  // The label is centered under the node, so its horizontal reach is half its width.
  const labelReach = n.label.length * 3.25
  // Collision padding: base radius + padding to clear the label vertically,
  // or the label's horizontal reach + side margins.
  return Math.max(baseRad + 48, labelReach + 15)
}

/**
 * Content-based default: the "dynamic default" the user layers manual choice on top of.
 *   - no cross-links at all           → tree    (a pure hierarchy)
 *   - densely interlinked projects     → web     (show the web)
 *   - evenly spread across folders      → radial  (clean concentric rings)
 *   - otherwise (lopsided folders)      → cluster (group by folder)
 */
export function chooseDefaultLayout(graph: Graph): LayoutKind {
  const projects = graph.nodes.filter((n) => n.type === 'project')
  const cross = graph.edges.filter(
    (e) => e.kind === 'related' || e.kind === 'tag',
  ).length
  const ratio = cross / Math.max(projects.length, 1)

  const perCategory = CATEGORIES.map(
    (c) => projects.filter((p) => p.category === c).length,
  )
  const balance = Math.max(...perCategory) - Math.min(...perCategory)

  if (cross === 0) return 'tree'
  if (ratio >= 0.9) return 'web'
  if (balance <= 1) return 'radial'
  return 'cluster'
}

type Ctx = { w: number; h: number; edges: GraphEdge[]; centerId?: string | null }

// forceLink rewrites edge.source/target from ids to node objects once initialized, so
// read an endpoint's id defensively whether it's still a string or already a node.
const endpointId = (v: unknown): string =>
  typeof v === 'object' && v ? (v as GraphNode).id : (v as string)

/**
 * BFS graph-distance from `startId`. This replaces the static `layer` (depth from root)
 * whenever the graph is re-rooted on another node, so the rings/rows reform around the
 * new center. When `startId` is the root, this equals `layer` — one code path, no
 * special-case. Cheap at our node count. Falls back to `n.layer` for unreachable nodes.
 */
function bfsDistances(
  nodes: SimNode[],
  edges: GraphEdge[],
  startId: string,
): Map<string, number> {
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const s = endpointId(e.source)
    const t = endpointId(e.target)
    adj.get(s)?.push(t)
    adj.get(t)?.push(s)
  }
  const dist = new Map<string, number>([[startId, 0]])
  const queue = [startId]
  while (queue.length) {
    const id = queue.shift()!
    const d = dist.get(id)!
    for (const nb of adj.get(id) ?? []) {
      if (dist.has(nb)) continue
      dist.set(nb, d + 1)
      queue.push(nb)
    }
  }
  return dist
}

/**
 * Calculates a node's physical weight (inertia) based on its "children" (spokes or projects).
 * This acts as the node's gravity: nodes with many children are heavier, allowing them to
 * resist layout distortion from local repulsion and stay centered on their concentric rings.
 * - Root node weight: base of 1.0 + 0.25 * spokeCount (typically 5 spokes)
 * - Category hub weight: base of 1.0 + 0.25 * projectCount (count of projects in that category)
 * - Projects/About weight: 1.0 (no children)
 */
export function nodeWeight(n: SimNode, nodes: SimNode[]): number {
  if (n.type === 'root') {
    const spokes = nodes.filter((x) => x.type === 'category' || x.type === 'about').length
    return 1.0 + spokes * 0.25
  }
  if (n.type === 'category') {
    const projects = nodes.filter((x) => x.type === 'project' && x.category === n.id).length
    return 1.0 + projects * 0.25
  }
  return 1.0
}

/** (Re)configure `sim`'s forces for the given layout. Call then `sim.alpha(x).restart()`. */
export function applyLayout(
  sim: Simulation<SimNode, undefined>,
  kind: LayoutKind,
  { w, h, edges, centerId }: Ctx,
): void {
  const cx = w / 2
  const cy = h / 2

  // Graph-distance from the center drives the rings/rows (falls back to `layer`). Compute
  // BEFORE the link force is (re)installed, while edge endpoints are still plain ids.
  const center = centerId ?? ROOT_ID
  const dist = bfsDistances(sim.nodes(), edges, center)
  const depthOf = (n: SimNode) => dist.get(n.id) ?? n.layer

  // Pre-calculate weights for all nodes based on their children count
  const nodesList = sim.nodes()
  const weights = new Map<string, number>(
    nodesList.map((n) => [n.id, nodeWeight(n, nodesList)]),
  )
  const weightOf = (n: SimNode) => weights.get(n.id) ?? 1.0

  // Shared forces: links (per-kind distance; strength dialed down where a positional
  // force should dominate) and collision.
  const linkStrengthScale = kind === 'radial' ? 0.3 : kind === 'tree' ? 0.4 : 1
  sim.force(
    'link',
    forceLink<SimNode, GraphEdge>(edges)
      .id((d) => d.id)
      .distance((_l, i) => LINK_DISTANCE[edges[i].kind])
      .strength((_l, i) => edges[i].weight * linkStrengthScale),
  )
  sim.force('collide', forceCollide<SimNode>((n) => nodeCollisionRadius(n)))

  // Clear positional forces; each layout re-adds only what it uses.
  sim.force('charge', null)
  sim.force('radial', null)
  sim.force('x', null)
  sim.force('y', null)

  // Release every node's layout pin, then pin only the center to the anchor (top-center
  // for tree, center otherwise). Hand-drag pins are restored by the caller afterwards, so
  // they still win; this only lets a *previous* center's pin go when the root changes.
  for (const n of sim.nodes()) {
    n.fx = null
    n.fy = null
  }
  const anchor = layoutAnchor(kind, w, h)
  const anchorY = anchor.y
  const centerNode = sim.nodes().find((n) => n.id === center)
  if (centerNode) {
    centerNode.fx = anchor.x
    centerNode.fy = anchor.y
  }

  switch (kind) {
    case 'web':
      // Centralized organic web: radial gravity pulls nodes toward their concentric ring.
      // We scale the radial strength (gravity) and many-body charge (repulsion) by the node weight
      // (based on children count) to keep the hubs on the inner ring and projects on the outer web.
      sim.force(
        'charge',
        forceManyBody<SimNode>().strength((n) => -680 * weightOf(n)),
      )
      sim.force(
        'radial',
        forceRadial<SimNode>((n) => depthOf(n) * RING, cx, cy).strength((n) => 0.18 * weightOf(n)),
      )
      break

    case 'radial':
      // Clean concentric rings by depth-from-center; charge spreads nodes *around* each ring.
      // Radial gravity and charge are scaled by node weight so the category hubs remain stabilized on the
      // inner ring.
      sim.force(
        'charge',
        forceManyBody<SimNode>().strength((n) => -420 * weightOf(n)),
      )
      sim.force(
        'radial',
        forceRadial<SimNode>((n) => depthOf(n) * RING, cx, cy).strength((n) => 0.95 * weightOf(n)),
      )
      break

    case 'cluster': {
      // Group by folder: each category has an anchor around the center.
      // Structural nodes (hubs) are pulled toward an inner anchor radius, while project nodes
      // are pulled toward the outer cluster radius to form category wings.
      const anchor = (n: SimNode) => {
        if (!n.category) return { x: cx, y: cy }
        const i = CATEGORIES.indexOf(n.category as Category)
        const a = (i / CATEGORIES.length) * 2 * Math.PI - Math.PI / 2
        const r = n.type === 'category' ? CLUSTER_R * 0.45 : CLUSTER_R
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
      }
      sim.force(
        'charge',
        forceManyBody<SimNode>().strength((n) => -320 * weightOf(n)),
      )
      sim.force('x', forceX<SimNode>((n) => anchor(n).x).strength((n) => 0.55 * weightOf(n)))
      sim.force('y', forceY<SimNode>((n) => anchor(n).y).strength((n) => 0.55 * weightOf(n)))
      break
    }

    case 'tree':
      // Rough top-down hierarchy rooted at the center: y by distance-from-center.
      // Weight-based charge keeps heavier hubs adequately separated.
      sim.force(
        'charge',
        forceManyBody<SimNode>().strength((n) => -320 * weightOf(n)),
      )
      sim.force('y', forceY<SimNode>((n) => anchorY + depthOf(n) * ROW).strength(0.7))
      sim.force('x', forceX<SimNode>(cx).strength(0.05))
      break
  }
}
